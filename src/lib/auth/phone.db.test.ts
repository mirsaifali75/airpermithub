import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sha256 } from "./crypto";
import { noteSignIn } from "./devices";
import {
  answerChallenge, beginTwoStep, CHALLENGE_ATTEMPTS, checkPassword, checkPhonePassword, confirmTwoStep, finishPhoneReset, finishPhoneSignup,
  googleGate, pendingPhoneSignup, PHONE_SIGNUP_MINUTES, phoneCanReset, registerAccount, startPhoneSignup,
} from "./flows";
import { stepAt, totpAt } from "./totp";

/**
 * Phone accounts against a real Postgres, in their own schema of the
 * throwaway TEST_DATABASE_URL database. Twilio is replaced by a stand-in that
 * approves one known code per number.
 */
const base = process.env.TEST_DATABASE_URL;
const throwaway = !!base && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(base);
const url = base ? `${base}${base.includes("?") ? "&" : "?"}schema=phone_test` : "";

const notBreached = async () => false;
const strong = "a quiet harbor at dawn";
const GOOD = "246810";

/** Twilio stand-in: GOOD is the right code for every number, and each check is recorded. */
function fakeTwilio() {
  const checks: [string, string][] = [];
  const check = vi.fn(async (phone: string, code: string) => {
    checks.push([phone, code]);
    return code === GOOD;
  });
  return { check, checks };
}

describe.skipIf(!throwaway)("phone accounts database", () => {
  let db: PrismaClient;
  const secretBefore = process.env.AUTH_SECRET;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "phone-test-secret";
    const wipe = new PrismaClient({ datasourceUrl: base });
    await wipe.$executeRawUnsafe("DROP SCHEMA IF EXISTS phone_test CASCADE");
    await wipe.$disconnect();
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url }, stdio: "pipe" });
    db = new PrismaClient({ datasourceUrl: url });
  }, 300_000);

  afterAll(async () => {
    process.env.AUTH_SECRET = secretBefore;
    await db?.$disconnect();
  });

  let n = 0;
  /** A fresh, valid-looking US number for each test: (202) 555-01xx. */
  const number = () => `(202) 555-${String(100 + ++n).padStart(4, "0")}`;
  const e164 = (formatted: string) => `+1${formatted.replace(/\D/g, "")}`;
  const input = (phone = number()) => ({ name: "Sam Ortiz", phone, password: strong, accountType: "COMPANY", company: "Ortiz Coatings", next: "/permit-finder" });

  /** A finished phone sign-up. */
  async function phoneAccount(phone = number()) {
    const started = await startPhoneSignup(db, input(phone), { breached: notBreached });
    if (!("token" in started)) throw new Error("sign-up refused");
    const done = await finishPhoneSignup(db, started.token, GOOD, fakeTwilio().check);
    if (!("user" in done)) throw new Error("sign-up not finished");
    return done.user;
  }

  describe("sign-up", () => {
    it("checks the form, and keeps nothing but a pending row until the code comes back", async () => {
      const opts = { breached: notBreached };
      expect(await startPhoneSignup(db, { ...input(), name: " " }, opts)).toMatchObject({ field: "name" });
      for (const bad of ["555-1234", "+44 7911 123456", "800-555-1234", "1-900-555-1234", "+1 876 555 1234", "call me", "(202) 555-0100 ext 5"]) {
        expect(await startPhoneSignup(db, { ...input(), phone: bad }, opts)).toMatchObject({ field: "phone" });
      }
      expect(await startPhoneSignup(db, { ...input(), accountType: "ADMIN" }, opts)).toMatchObject({ field: "accountType" });
      expect(await startPhoneSignup(db, { ...input(), password: "short" }, opts)).toMatchObject({ field: "password" });
      const p = number();
      expect(await startPhoneSignup(db, { ...input(p), password: `my number ${p.replace(/\D/g, "")}` }, opts)).toMatchObject({ field: "password", error: expect.stringMatching(/phone number/) });
      expect(await startPhoneSignup(db, input(), { breached: async () => true })).toMatchObject({ field: "password", error: expect.stringMatching(/breach/) });
      expect(await db.phoneSignup.count()).toBe(0);

      const ok = await startPhoneSignup(db, input(p), opts);
      if (!("token" in ok)) throw new Error("expected a pending sign-up");
      expect(ok.phone).toBe(e164(p));
      const row = await db.phoneSignup.findUniqueOrThrow({ where: { id: sha256(ok.token) } });
      expect(row).toMatchObject({ phone: e164(p), name: "Sam Ortiz", company: "Ortiz Coatings", accountType: "COMPANY", next: "/permit-finder", attempts: 0 });
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await db.phoneSignup.count({ where: { id: ok.token } })).toBe(0);
      expect(await db.user.count({ where: { phone: e164(p) } })).toBe(0);
      expect((await pendingPhoneSignup(db, ok.token))?.phone).toBe(e164(p));
    });

    it("creates a confirmed phone account with no email once the code matches, and only once", async () => {
      const p = number();
      const started = await startPhoneSignup(db, input(p), { breached: notBreached });
      if (!("token" in started)) throw new Error("refused");
      const t = fakeTwilio();
      expect(await finishPhoneSignup(db, started.token, "111111", t.check)).toEqual({ error: `That code didn't match. ${CHALLENGE_ATTEMPTS - 1} tries left.`, restart: false });
      const done = await finishPhoneSignup(db, started.token, GOOD, t.check);
      if (!("user" in done)) throw new Error("expected an account");
      expect(done.next).toBe("/permit-finder");
      expect(done.user).toMatchObject({ phone: e164(p), email: null, emailVerified: null, name: "Sam Ortiz", platformRole: "USER", accountType: "COMPANY" });
      expect(done.user.phoneVerified).not.toBeNull();
      expect(t.checks).toEqual([[e164(p), "111111"], [e164(p), GOOD]]);
      expect(await db.phoneSignup.count({ where: { id: sha256(started.token) } })).toBe(0);
      expect(await finishPhoneSignup(db, started.token, GOOD, t.check)).toMatchObject({ restart: true });
      expect(await db.user.count({ where: { phone: e164(p) } })).toBe(1);
    });

    it("ends the sign-up after five wrong codes, even when they arrive all at once", async () => {
      const started = await startPhoneSignup(db, input(), { breached: notBreached });
      if (!("token" in started)) throw new Error("refused");
      const t = fakeTwilio();
      const burst = await Promise.all(Array.from({ length: 20 }, () => finishPhoneSignup(db, started.token, "000000", t.check)));
      expect(t.check).toHaveBeenCalledTimes(CHALLENGE_ATTEMPTS);
      expect(burst.filter((r) => "restart" in r && r.restart).length).toBeGreaterThanOrEqual(20 - CHALLENGE_ATTEMPTS + 1);
      expect(await finishPhoneSignup(db, started.token, GOOD, t.check)).toMatchObject({ restart: true });
      expect(await db.user.count({ where: { phone: started.phone } })).toBe(0);
      expect(await pendingPhoneSignup(db, started.token)).toBeNull();
    });

    it("makes one account when the right code is sent twice at once", async () => {
      const started = await startPhoneSignup(db, input(), { breached: notBreached });
      if (!("token" in started)) throw new Error("refused");
      const both = await Promise.all([1, 2, 3].map(() => finishPhoneSignup(db, started.token, GOOD, fakeTwilio().check)));
      expect(both.filter((r) => "user" in r)).toHaveLength(1);
      expect(await db.user.count({ where: { phone: started.phone } })).toBe(1);
    });

    it("expires a sign-up after 30 minutes", async () => {
      const started = await startPhoneSignup(db, input(), { breached: notBreached });
      if (!("token" in started)) throw new Error("refused");
      const later = new Date(Date.now() + (PHONE_SIGNUP_MINUTES + 1) * 60_000);
      expect(await pendingPhoneSignup(db, started.token, later)).toBeNull();
      const t = fakeTwilio();
      expect(await finishPhoneSignup(db, started.token, GOOD, t.check, later)).toMatchObject({ restart: true });
      expect(t.check).not.toHaveBeenCalled();
    });

    it("never makes a second account for a number, and tells only the person who proved they hold it", async () => {
      const first = await phoneAccount();
      const again = await startPhoneSignup(db, { ...input(first.phone!), name: "Someone Else", password: "a different long password" }, { breached: notBreached });
      if (!("token" in again)) throw new Error("the second sign-up should start like any other");
      const t = fakeTwilio();
      expect(await finishPhoneSignup(db, again.token, "123123", t.check)).toMatchObject({ restart: false });
      expect(await finishPhoneSignup(db, again.token, GOOD, t.check)).toEqual({ exists: true, phone: first.phone });
      expect(await db.user.count({ where: { phone: first.phone } })).toBe(1);
      expect((await checkPhonePassword(db, first.phone!, strong))?.id).toBe(first.id);
      expect(await checkPhonePassword(db, first.phone!, "a different long password")).toBeNull();
    });

    it("keeps every account reachable by an email or a phone number", async () => {
      await expect(db.user.create({ data: { name: "Nobody" } })).rejects.toThrow();
    });
  });

  describe("sign-in and reset", () => {
    it("signs in with the number in any common format and the right password only", async () => {
      const u = await phoneAccount();
      const digits = u.phone!.slice(2);
      for (const typed of [u.phone!, digits, `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`, `1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`, ` +1 ${digits} `]) {
        expect((await checkPhonePassword(db, typed, strong))?.id).toBe(u.id);
      }
      expect(await checkPhonePassword(db, u.phone!, `${strong}!`)).toBeNull();
      expect(await checkPhonePassword(db, "(202) 555-0199", strong)).toBeNull();
      expect(await checkPhonePassword(db, "not a number", strong)).toBeNull();
      expect(await checkPhonePassword(db, u.phone!, "")).toBeNull();
      // A phone account can't be reached by the email sign-in.
      expect(await checkPassword(db, u.phone!, strong)).toBeNull();
    });

    it("texts reset codes only to numbers with an account", async () => {
      const u = await phoneAccount();
      expect(await phoneCanReset(db, u.phone!)).toBe(true);
      expect(await phoneCanReset(db, "+12025550198")).toBe(false);
      const sys = await db.user.create({ data: { phone: e164(number()), phoneVerified: new Date(), isSystem: true } });
      expect(await phoneCanReset(db, sys.phone!)).toBe(false);
    });

    it("sets a new password from the right code, and signs every device out", async () => {
      const u = await phoneAccount();
      await db.session.create({ data: { userId: u.id, sessionToken: sha256(`s${n}`), expires: new Date(Date.now() + 86_400_000) } });
      const t = fakeTwilio();
      const fresh = "a brand new evening phrase";
      expect(await finishPhoneReset(db, u.phone!, "999999", fresh, t.check, { breached: notBreached })).toMatchObject({ field: "code" });
      expect((await checkPhonePassword(db, u.phone!, strong))?.id).toBe(u.id);
      expect(await finishPhoneReset(db, u.phone!, GOOD, fresh, t.check, { breached: notBreached })).toEqual({ userId: u.id, email: null });
      expect(await checkPhonePassword(db, u.phone!, strong)).toBeNull();
      expect((await checkPhonePassword(db, u.phone!, fresh))?.id).toBe(u.id);
      expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    });

    it("refuses a weak password before the code is used, and checks the code even for numbers with no account", async () => {
      const u = await phoneAccount();
      const t = fakeTwilio();
      expect(await finishPhoneReset(db, u.phone!, GOOD, "short", t.check, { breached: notBreached })).toMatchObject({ field: "password" });
      expect(t.check).not.toHaveBeenCalled();
      expect(await finishPhoneReset(db, "+12025550197", GOOD, "a perfectly fine phrase", t.check, { breached: notBreached })).toMatchObject({ field: "code" });
      expect(t.check).toHaveBeenCalledTimes(1);
      expect(await finishPhoneReset(db, "junk", GOOD, "a perfectly fine phrase", t.check, { breached: notBreached })).toMatchObject({ restart: true });
    });
  });

  describe("the rest of the account", () => {
    it("can turn on two-step login, named by its number in the app", async () => {
      const u = await phoneAccount();
      const setup = await beginTwoStep(db, u.id);
      if (!("secret" in setup)) throw new Error(String(setup.error));
      expect(setup.url).toContain(encodeURIComponent(u.phone!));
      const now = new Date();
      expect(await confirmTwoStep(db, u.id, totpAt(setup.secret!, stepAt(now.getTime())), now)).toMatchObject({ email: null });
    });

    it("sends no new-browser email, since there's no address", async () => {
      const u = await phoneAccount();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await noteSignIn(db, u, "device-one-aaaaaaaaaaaaaaa", "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0");
      expect(await noteSignIn(db, u, "device-two-bbbbbbbbbbbbbbb", "Mozilla/5.0 (Macintosh) Safari/605.1")).toEqual({ newDevice: true });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("keeps two-step login on a Google account connected to a phone account", async () => {
      const u = await phoneAccount();
      const setup = await beginTwoStep(db, u.id);
      if (!("secret" in setup)) throw new Error("setup failed");
      const now = new Date("2026-11-06T12:00:00Z");
      const on = await confirmTwoStep(db, u.id, totpAt(setup.secret!, stepAt(now.getTime())), now);
      if (!("codes" in on)) throw new Error("confirm failed");
      const google = { provider: "google", providerAccountId: `phone-google-${n}`, type: "oidc" };
      // Connected from account settings while signed in, under some Gmail address.
      expect(await googleGate(db, { email: `sam${n}@gmail.example`, email_verified: true }, google, "/account", { now, signedInAs: u.id })).toBe(true);
      await db.account.create({ data: { userId: u.id, ...google } });
      // A later Google sign-in, signed out, goes to the code step, and the password stays.
      const to = await googleGate(db, { email: `sam${n}@gmail.example`, email_verified: true }, google, "/dashboard", { now });
      expect(to).toMatch(/^\/sign-in\/two-step\?c=/);
      expect(await answerChallenge(db, decodeURIComponent(String(to).split("c=")[1]), on.codes[0], now)).toMatchObject({ userId: u.id });
      expect((await checkPhonePassword(db, u.phone!, strong))?.id).toBe(u.id);
    });

    it("keeps two-step login when Google was connected under a different address than the account's email", async () => {
      const r = await registerAccount(db, { name: "Lee", email: `lee${++n}@example.com`, password: strong, accountType: "INDIVIDUAL" }, { breached: notBreached });
      if (!("created" in r) || !r.created) throw new Error("no account");
      await db.user.update({ where: { id: r.userId }, data: { emailVerified: new Date() } });
      const setup = await beginTwoStep(db, r.userId);
      if (!("secret" in setup)) throw new Error("setup failed");
      const now = new Date("2026-11-06T12:00:00Z");
      await confirmTwoStep(db, r.userId, totpAt(setup.secret!, stepAt(now.getTime())), now);
      const google = { provider: "google", providerAccountId: `other-address-${n}`, type: "oidc" };
      await db.account.create({ data: { userId: r.userId, ...google } });
      expect(await googleGate(db, { email: `lee.personal${n}@gmail.example`, email_verified: true }, google, "/dashboard", { now })).toMatch(/^\/sign-in\/two-step\?c=/);
    });
  });
});
