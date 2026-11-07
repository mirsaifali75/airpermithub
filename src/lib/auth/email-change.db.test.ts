import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  beginTwoStep, checkPassword, checkPhonePassword, confirmEmail, confirmEmailChange, confirmTwoStep, createAuthToken, finishPhoneSignup,
  pendingEmailChange, registerAccount, startEmailChange, startPhoneSignup,
} from "./flows";
import { stepAt, totpAt } from "./totp";

/** Changing an account's email, or adding one to a phone account, against a real Postgres in its own schema. */
const base = process.env.TEST_DATABASE_URL;
const throwaway = !!base && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(base);
const url = base ? `${base}${base.includes("?") ? "&" : "?"}schema=email_change_test` : "";

const notBreached = async () => false;
const strong = "a quiet harbor at dawn";

describe.skipIf(!throwaway)("email change database", () => {
  let db: PrismaClient;
  const secretBefore = process.env.AUTH_SECRET;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "email-change-test-secret";
    const wipe = new PrismaClient({ datasourceUrl: base });
    await wipe.$executeRawUnsafe("DROP SCHEMA IF EXISTS email_change_test CASCADE");
    await wipe.$disconnect();
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url }, stdio: "pipe" });
    db = new PrismaClient({ datasourceUrl: url });
  }, 300_000);

  afterAll(async () => {
    process.env.AUTH_SECRET = secretBefore;
    await db?.$disconnect();
  });

  let n = 0;
  const addr = (who = "pat") => `${who}.${++n}@example.com`;

  async function emailAccount(email = addr()) {
    const r = await registerAccount(db, { name: "Pat Lee", email, password: strong, accountType: "INDIVIDUAL" }, { breached: notBreached });
    if (!("created" in r) || !r.created) throw new Error("sign-up refused");
    await confirmEmail(db, r.verifyToken);
    return { id: r.userId, email };
  }

  it("needs a valid, different address and the right password", async () => {
    const a = await emailAccount();
    expect(await startEmailChange(db, a.id, { email: "nope", password: strong })).toMatchObject({ field: "email" });
    expect(await startEmailChange(db, a.id, { email: a.email.toUpperCase(), password: strong })).toMatchObject({ field: "email" });
    expect(await startEmailChange(db, a.id, { email: addr(), password: "wrong password here" })).toMatchObject({ field: "password" });
    expect(await db.emailChange.count({ where: { userId: a.id } })).toBe(0);
  });

  it("changes nothing until the new address's link is used, then moves sign-in to it", async () => {
    const a = await emailAccount();
    const next = addr("new");
    const started = await startEmailChange(db, a.id, { email: ` ${next.toUpperCase()} `, password: strong });
    expect(started).toMatchObject({ email: next, oldEmail: a.email });
    const token = (started as { token: string }).token;
    expect(token).toBeTruthy();
    expect((await db.user.findUniqueOrThrow({ where: { id: a.id } })).email).toBe(a.email);
    expect(await pendingEmailChange(db, token)).toBe(next);
    // Only a hash of the token is stored.
    expect(await db.emailChange.findFirst({ where: { id: token } })).toBeNull();

    const reset = await createAuthToken(db, a.id, "RESET_PASSWORD");
    expect(await confirmEmailChange(db, token)).toEqual({ userId: a.id, email: next, oldEmail: a.email });
    const u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(u.email).toBe(next);
    expect(u.emailVerified).not.toBeNull();
    expect(await checkPassword(db, next, strong)).toMatchObject({ id: a.id });
    expect(await checkPassword(db, a.email, strong)).toBeNull();
    // A reset link sent to the old address stops working.
    expect(await db.authToken.count({ where: { tokenHash: { not: "" }, userId: a.id, usedAt: null } })).toBe(0);
    expect(reset).toBeTruthy();
    expect(await db.auditLog.count({ where: { entityId: a.id, action: "user.email-change" } })).toBe(1);
  });

  it("lets a link work once, even when opened twice at the same moment", async () => {
    const a = await emailAccount();
    const started = await startEmailChange(db, a.id, { email: addr("twice"), password: strong });
    const token = (started as { token: string }).token;
    const results = await Promise.all([confirmEmailChange(db, token), confirmEmailChange(db, token), confirmEmailChange(db, token)]);
    expect(results.filter((r) => "userId" in r)).toHaveLength(1);
    expect(await confirmEmailChange(db, token)).toMatchObject({ error: expect.stringMatching(/expired or was already used/) });
  });

  it("keeps only the newest request", async () => {
    const a = await emailAccount();
    const first = (await startEmailChange(db, a.id, { email: addr("one"), password: strong })) as { token: string };
    const second = (await startEmailChange(db, a.id, { email: addr("two"), password: strong })) as { token: string; email: string };
    expect(await confirmEmailChange(db, first.token)).toHaveProperty("error");
    expect(await confirmEmailChange(db, second.token)).toMatchObject({ email: second.email });
  });

  it("expires after a day", async () => {
    const a = await emailAccount();
    const t0 = new Date();
    const s = (await startEmailChange(db, a.id, { email: addr("late"), password: strong }, t0)) as { token: string };
    expect(await confirmEmailChange(db, s.token, new Date(t0.getTime() + 25 * 3_600_000))).toHaveProperty("error");
    expect((await db.user.findUniqueOrThrow({ where: { id: a.id } })).email).toBe(a.email);
  });

  it("never takes another account's address, and doesn't say so to the requester", async () => {
    const a = await emailAccount();
    const b = await emailAccount();
    const asked = await startEmailChange(db, a.id, { email: b.email, password: strong });
    expect(asked).toEqual({ email: b.email, oldEmail: a.email, token: null });

    // The address is free when asked for but taken before the link is opened.
    const c = addr("race");
    const s = (await startEmailChange(db, a.id, { email: c, password: strong })) as { token: string };
    await emailAccount(c);
    expect(await confirmEmailChange(db, s.token)).toMatchObject({ error: expect.stringMatching(/another account/) });
    expect((await db.user.findUniqueOrThrow({ where: { id: a.id } })).email).toBe(a.email);
  });

  it("needs the two-step code when two-step login is on, and each code works once", async () => {
    const a = await emailAccount();
    const now = new Date();
    const setup = await beginTwoStep(db, a.id);
    await confirmTwoStep(db, a.id, totpAt(setup.secret!, stepAt(now.getTime()) - 1), now);
    expect(await startEmailChange(db, a.id, { email: addr(), password: strong }, now)).toMatchObject({ field: "code" });
    expect(await startEmailChange(db, a.id, { email: addr(), password: strong, code: "000000" }, now)).toMatchObject({ field: "code" });
    const code = totpAt(setup.secret!, stepAt(now.getTime()));
    expect(await startEmailChange(db, a.id, { email: addr(), password: strong, code }, now)).toHaveProperty("token");
    expect(await startEmailChange(db, a.id, { email: addr(), password: strong, code }, now)).toMatchObject({ field: "code" });
  });

  it("lets a phone account add an email it can then sign in with", async () => {
    const started = await startPhoneSignup(db, { name: "Sam Ortiz", phone: "(202) 555-0177", password: strong, accountType: "COMPANY", next: "/dashboard" }, { breached: notBreached });
    if (!("token" in started)) throw new Error("phone sign-up refused");
    const done = await finishPhoneSignup(db, started.token, "1", async () => true);
    if (!("user" in done)) throw new Error("phone sign-up not finished");
    const email = addr("sam");
    const s = await startEmailChange(db, done.user.id, { email, password: strong });
    expect(s).toMatchObject({ email, oldEmail: null });
    expect(await confirmEmailChange(db, (s as { token: string }).token)).toEqual({ userId: done.user.id, email, oldEmail: null });
    expect(await checkPassword(db, email, strong)).toMatchObject({ id: done.user.id });
    expect(await checkPhonePassword(db, "(202) 555-0177", strong)).toMatchObject({ id: done.user.id });
    expect(await db.auditLog.count({ where: { entityId: done.user.id, action: "user.email-add" } })).toBe(1);
  });

  it("refuses Google-only accounts until they add a password", async () => {
    const u = await db.user.create({ data: { email: addr("g"), emailVerified: new Date(), name: "Gee" } });
    expect(await startEmailChange(db, u.id, { email: addr(), password: "" })).toMatchObject({ field: "password" });
  });

  it("goes away with the account", async () => {
    const a = await emailAccount();
    await startEmailChange(db, a.id, { email: addr(), password: strong });
    await db.user.delete({ where: { id: a.id } });
    expect(await db.emailChange.count({ where: { userId: a.id } })).toBe(0);
  });
});
