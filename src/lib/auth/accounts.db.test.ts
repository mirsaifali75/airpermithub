import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sha256 } from "./crypto";
import { noteSignIn } from "./devices";
import {
  answerChallenge, backupCodesLeft, beginTwoStep, CHALLENGE_ATTEMPTS, changePassword, checkPassword, confirmEmail, confirmTwoStep,
  createChallenge, disableTwoStep, finishReset, googleGate, peekAuthToken, pendingTwoStep, regenerateBackupCodes, registerAccount,
  reissueVerification, spendSecondFactor, startReset,
} from "./flows";
import { claim, clearFailures, emailKey, networkKey, overLimit, record, release, rules, succeeded } from "./limits";
import { verifyPassword } from "./password";
import { stepAt, totpAt } from "./totp";
import { loadSavedWork, storeSavedWork } from "../storage/account";
import { SAVED_LIMITS } from "../storage/saved";

/**
 * The account rules against a real Postgres. Uses its own schema in the
 * throwaway TEST_DATABASE_URL database, so it can run beside the content tests.
 */
const base = process.env.TEST_DATABASE_URL;
const throwaway = !!base && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(base);
const url = base ? `${base}${base.includes("?") ? "&" : "?"}schema=accounts_test` : "";

const notBreached = async () => false;
const strong = "correct horse battery staple";

describe.skipIf(!throwaway)("accounts database", () => {
  let db: PrismaClient;
  const secretBefore = process.env.AUTH_SECRET;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "accounts-test-secret";
    const wipe = new PrismaClient({ datasourceUrl: base });
    await wipe.$executeRawUnsafe("DROP SCHEMA IF EXISTS accounts_test CASCADE");
    await wipe.$disconnect();
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url }, stdio: "pipe" });
    db = new PrismaClient({ datasourceUrl: url });
  }, 300_000);

  afterAll(async () => {
    process.env.AUTH_SECRET = secretBefore;
    await db?.$disconnect();
  });

  let n = 0;
  /** A new account with a password; verified unless asked otherwise. */
  async function account({ verified = true, email = `person${++n}@example.com` } = {}) {
    const r = await registerAccount(db, { name: "Dana Reyes", email, password: strong, accountType: "INDIVIDUAL" }, { breached: notBreached });
    if (!("created" in r) || !r.created) throw new Error("account not created");
    if (verified) await confirmEmail(db, r.verifyToken);
    return { ...r, id: r.userId };
  }

  /** An account with two-step login on, and its plain secret. */
  async function twoStepAccount(now = new Date("2026-11-05T12:00:00Z")) {
    const a = await account();
    const setup = await beginTwoStep(db, a.id);
    if (!("secret" in setup)) throw new Error("setup failed");
    const confirmed = await confirmTwoStep(db, a.id, totpAt(setup.secret!, stepAt(now.getTime())), now);
    if (!("codes" in confirmed)) throw new Error("confirm failed");
    return { ...a, secret: setup.secret!, codes: confirmed.codes, now };
  }

  const session = (userId: string, token = sha256(Math.random().toString())) =>
    db.session.create({ data: { userId, sessionToken: token, expires: new Date(Date.now() + 86_400_000) } });

  describe("sign-up", () => {
    it("checks the form before anything is stored", async () => {
      const input = { name: "Dana", email: "dana@example.com", password: strong, accountType: "INDIVIDUAL" };
      expect(await registerAccount(db, { ...input, name: "  " }, { breached: notBreached })).toMatchObject({ field: "name" });
      expect(await registerAccount(db, { ...input, email: "not-an-email" }, { breached: notBreached })).toMatchObject({ field: "email" });
      expect(await registerAccount(db, { ...input, accountType: "ADMIN" }, { breached: notBreached })).toMatchObject({ field: "accountType" });
      expect(await registerAccount(db, { ...input, password: "short" }, { breached: notBreached })).toMatchObject({ field: "password" });
      expect(await registerAccount(db, input, { breached: async () => true })).toMatchObject({ field: "password", error: expect.stringMatching(/breach/) });
      expect(await db.user.count({ where: { email: "dana@example.com" } })).toBe(0);
    });

    it("stores an Argon2id hash and a hashed, single-use verification link", async () => {
      const r = await registerAccount(db, { name: " Dana ", email: " New.Person@Example.com ", password: strong, accountType: "CONSULTANT", company: "Reyes Air" }, { breached: notBreached });
      if (!("created" in r) || !r.created) throw new Error("expected an account");
      const u = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
      expect(u).toMatchObject({ email: "new.person@example.com", name: "Dana", company: "Reyes Air", accountType: "CONSULTANT", emailVerified: null, platformRole: "USER" });
      expect(u.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await db.authToken.count({ where: { tokenHash: r.verifyToken } })).toBe(0);
      expect(await db.authToken.count({ where: { tokenHash: sha256(r.verifyToken) } })).toBe(1);

      expect(await peekAuthToken(db, r.verifyToken, "VERIFY_EMAIL")).toBe(r.userId);
      expect(await peekAuthToken(db, r.verifyToken, "RESET_PASSWORD")).toBeNull();
      expect(await confirmEmail(db, r.verifyToken)).toMatchObject({ userId: r.userId, alreadyVerified: false, twoStep: false });
      expect(await confirmEmail(db, r.verifyToken)).toBeNull();
      expect((await db.user.findUniqueOrThrow({ where: { id: r.userId } })).emailVerified).not.toBeNull();
    });

    it("never makes a second account for an address, and doesn't say so to the visitor", async () => {
      const a = await account();
      const again = await registerAccount(db, { name: "Someone", email: a.email.toUpperCase(), password: "another long password", accountType: "INDIVIDUAL" }, { breached: notBreached });
      expect(again).toEqual({ created: false, email: a.email, canSignIn: true });
      expect(await db.user.count({ where: { email: a.email } })).toBe(1);
      expect(await checkPassword(db, a.email, "another long password")).toBeNull();
    });

    it("voids the older link when a new one is sent, and expires links after a day", async () => {
      const a = await account({ verified: false });
      const fresh = await reissueVerification(db, a.id);
      expect(await confirmEmail(db, a.verifyToken)).toBeNull();
      expect(await confirmEmail(db, fresh!.token, new Date(Date.now() + 25 * 3_600_000))).toBeNull();
      expect(await confirmEmail(db, fresh!.token)).toMatchObject({ userId: a.id });
      expect(await reissueVerification(db, a.id)).toBeNull();
    });
  });

  describe("password sign-in and reset", () => {
    it("signs in with the right password only, whatever the address's case", async () => {
      const a = await account();
      expect((await checkPassword(db, ` ${a.email.toUpperCase()} `, strong))?.id).toBe(a.id);
      expect(await checkPassword(db, a.email, `${strong}!`)).toBeNull();
      expect(await checkPassword(db, "nobody@example.com", strong)).toBeNull();
      expect(await checkPassword(db, a.email, "")).toBeNull();
    });

    it("resets once, within 30 minutes, ending every session and confirming the email", async () => {
      const a = await account({ verified: false });
      await session(a.id);
      await session(a.id);
      const first = await startReset(db, a.email.toUpperCase());
      const link = await startReset(db, a.email);
      expect(await finishReset(db, first!.token, "a brand new passphrase", { breached: notBreached })).toMatchObject({ error: expect.stringMatching(/expired/) });
      expect(await finishReset(db, link!.token, "a brand new passphrase", { breached: notBreached, now: new Date(Date.now() + 31 * 60_000) })).toMatchObject({ error: expect.stringMatching(/expired/) });
      expect(await finishReset(db, link!.token, "short", { breached: notBreached })).toMatchObject({ error: expect.stringMatching(/at least/) });
      expect(await finishReset(db, link!.token, "a brand new passphrase", { breached: notBreached })).toMatchObject({ userId: a.id });
      expect(await finishReset(db, link!.token, "yet another passphrase", { breached: notBreached })).toMatchObject({ error: expect.stringMatching(/expired/) });

      const u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(await verifyPassword(u.passwordHash!, "a brand new passphrase")).toBe(true);
      expect(u.emailVerified).not.toBeNull();
      expect(await db.session.count({ where: { userId: a.id } })).toBe(0);
      expect(await startReset(db, "nobody@example.com")).toBeNull();
    });

    it("changes a password, keeping only the session that made the change", async () => {
      const a = await account();
      const here = await session(a.id);
      await session(a.id);
      expect(await changePassword(db, a.id, "wrong password!", "a different passphrase", { keepSessionToken: here.sessionToken, breached: notBreached })).toMatchObject({ error: expect.stringMatching(/current password/) });
      expect(await changePassword(db, a.id, strong, "a different passphrase", { keepSessionToken: here.sessionToken, breached: notBreached })).toEqual({ ok: true, email: a.email, added: false });
      expect((await db.session.findMany({ where: { userId: a.id } })).map((s) => s.sessionToken)).toEqual([here.sessionToken]);
      expect((await checkPassword(db, a.email, "a different passphrase"))?.id).toBe(a.id);
    });

    it("lets a Google-only account add a password without a current one", async () => {
      const u = await db.user.create({ data: { email: `google${++n}@example.com`, emailVerified: new Date() } });
      expect(await changePassword(db, u.id, "", "a first passphrase here", { breached: notBreached })).toMatchObject({ ok: true, added: true });
      expect((await checkPassword(db, u.email!, "a first passphrase here"))?.id).toBe(u.id);
    });

    it("never signs in or resets a system account", async () => {
      const sys = await db.user.create({ data: { email: `system${++n}@example.com`, isSystem: true, emailVerified: new Date() } });
      expect(await startReset(db, sys.email!)).toBeNull();
      expect(await registerAccount(db, { name: "x", email: sys.email!, password: strong, accountType: "INDIVIDUAL" }, { breached: notBreached })).toMatchObject({ created: false, canSignIn: false });
    });
  });

  describe("two-step login", () => {
    it("needs a confirmed email, and only turns on once a code matches", async () => {
      const unverified = await account({ verified: false });
      expect(await beginTwoStep(db, unverified.id)).toMatchObject({ error: expect.stringMatching(/Confirm your email/) });

      const a = await account();
      const setup = await beginTwoStep(db, a.id);
      if (!("secret" in setup)) throw new Error("setup failed");
      const stored = (await db.user.findUniqueOrThrow({ where: { id: a.id } })).twoFactorSecret!;
      expect(stored).not.toContain(setup.secret!);
      expect(await pendingTwoStep(db, a.id)).toEqual(setup);
      expect(await confirmTwoStep(db, a.id, "000000")).toMatchObject({ error: expect.stringMatching(/didn't match/) });
      expect((await db.user.findUniqueOrThrow({ where: { id: a.id } })).twoFactorEnabledAt).toBeNull();
      const on = await confirmTwoStep(db, a.id, totpAt(setup.secret!, stepAt(Date.now())));
      expect(on).toMatchObject({ codes: expect.any(Array) });
      expect(await backupCodesLeft(db, a.id)).toBe(10);
      expect(await pendingTwoStep(db, a.id)).toBeNull();
      expect(await beginTwoStep(db, a.id)).toMatchObject({ error: expect.stringMatching(/already on/) });
    });

    it("takes each app code and each backup code once", async () => {
      const a = await twoStepAccount();
      const t = a.now.getTime();
      expect(await spendSecondFactor(db, a.id, totpAt(a.secret, stepAt(t)), a.now)).toBe(false);
      const later = new Date(t + 30_000);
      expect(await spendSecondFactor(db, a.id, totpAt(a.secret, stepAt(later.getTime())), later)).toBe("app");
      expect(await spendSecondFactor(db, a.id, totpAt(a.secret, stepAt(later.getTime())), later)).toBe(false);

      expect(await spendSecondFactor(db, a.id, a.codes[0].toLowerCase(), later)).toBe("backup");
      expect(await spendSecondFactor(db, a.id, a.codes[0], later)).toBe(false);
      expect(await backupCodesLeft(db, a.id)).toBe(9);
      expect(await spendSecondFactor(db, a.id, "AAAA-BBBB-CCCC", later)).toBe(false);
    });

    it("replaces backup codes and turns off only with a valid code", async () => {
      const a = await twoStepAccount();
      expect(await regenerateBackupCodes(db, a.id, "123456", a.now)).toMatchObject({ error: expect.any(String) });
      const fresh = await regenerateBackupCodes(db, a.id, a.codes[1], a.now);
      if (!("codes" in fresh)) throw new Error("expected codes");
      expect(await spendSecondFactor(db, a.id, a.codes[2], a.now)).toBe(false);
      expect(await disableTwoStep(db, a.id, "123456", a.now)).toMatchObject({ error: expect.any(String) });
      expect(await disableTwoStep(db, a.id, fresh.codes![0], a.now)).toMatchObject({ ok: true });
      const u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(u).toMatchObject({ twoFactorSecret: null, twoFactorEnabledAt: null });
      expect(await backupCodesLeft(db, a.id)).toBe(0);
    });

    it("keeps two-step login on for staff, without spending their code", async () => {
      const a = await twoStepAccount();
      await db.user.update({ where: { id: a.id }, data: { platformRole: "REVIEWER" } });
      expect(await disableTwoStep(db, a.id, a.codes[0], a.now)).toMatchObject({ error: expect.stringMatching(/must keep/) });
      expect(await backupCodesLeft(db, a.id)).toBe(10);
    });

    it("ends the code step after five wrong codes, ten minutes, or one success", async () => {
      const a = await twoStepAccount();
      const wrong = await createChallenge(db, a.id, "/dashboard", a.now);
      for (let i = 1; i < CHALLENGE_ATTEMPTS; i++) expect(await answerChallenge(db, wrong, "000000", a.now)).toMatchObject({ restart: false });
      expect(await answerChallenge(db, wrong, "000000", a.now)).toMatchObject({ restart: true });
      expect(await answerChallenge(db, wrong, a.codes[0], a.now)).toMatchObject({ restart: true });

      const slow = await createChallenge(db, a.id, "/dashboard", a.now);
      expect(await answerChallenge(db, slow, a.codes[0], new Date(a.now.getTime() + 11 * 60_000))).toMatchObject({ restart: true });

      const ok = await createChallenge(db, a.id, "/tools/deviation-log", a.now);
      expect(await answerChallenge(db, ok, a.codes[0], a.now)).toEqual({ userId: a.id, next: "/tools/deviation-log", via: "backup" });
      expect(await answerChallenge(db, ok, a.codes[1], a.now)).toMatchObject({ restart: true });
      expect(await answerChallenge(db, "", a.codes[1], a.now)).toMatchObject({ restart: true });
    });
  });

  describe("Google sign-in", () => {
    const google = (id: string) => ({ provider: "google", providerAccountId: id, type: "oidc" });

    it("refuses addresses Google hasn't verified, and system accounts", async () => {
      expect(await googleGate(db, { email: "x@example.com", email_verified: false }, google("g1"), "/dashboard")).toBe("/sign-in?error=GoogleUnverified");
      expect(await googleGate(db, { email: null, email_verified: true }, google("g1"), "/dashboard")).toBe("/sign-in?error=GoogleUnverified");
      const sys = await db.user.create({ data: { email: `system${++n}@example.com`, isSystem: true } });
      expect(await googleGate(db, { email: sys.email, email_verified: true }, google("g2"), "/dashboard")).toBe(false);
      expect(await googleGate(db, { email: "brand-new@example.com", email_verified: true }, google("g3"), "/dashboard")).toBe(true);
    });

    it("takes back an unconfirmed account from whoever registered the address", async () => {
      const a = await account({ verified: false });
      await session(a.id);
      expect(await googleGate(db, { email: a.email.toUpperCase(), email_verified: true }, google("g4"), "/dashboard")).toBe(true);
      const u = await db.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(u.passwordHash).toBeNull();
      expect(u.emailVerified).not.toBeNull();
      expect(await db.session.count({ where: { userId: a.id } })).toBe(0);
      expect(await confirmEmail(db, a.verifyToken)).toBeNull();
    });

    it("leaves a confirmed account's password alone", async () => {
      const a = await account();
      expect(await googleGate(db, { email: a.email, email_verified: true }, google("g5"), "/dashboard")).toBe(true);
      expect((await checkPassword(db, a.email, strong))?.id).toBe(a.id);
    });

    it("sends two-step accounts to the code step, with Google linked", async () => {
      const a = await twoStepAccount();
      const to = await googleGate(db, { email: a.email, email_verified: true }, google("g6"), "/permit-finder", { now: a.now });
      expect(to).toMatch(/^\/sign-in\/two-step\?c=/);
      expect(await db.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: "g6" } } })).toMatchObject({ userId: a.id });
      const token = decodeURIComponent(String(to).split("c=")[1]);
      expect(await answerChallenge(db, token, a.codes[3], a.now)).toMatchObject({ userId: a.id, next: "/permit-finder" });
      expect(await googleGate(db, { email: a.email, email_verified: true }, google("g6"), "/account", { now: a.now, signedInAs: a.id })).toBe(true);
    });
  });

  describe("attempt limits and devices", () => {
    it("lets no more than the limit through when tries arrive all at once", async () => {
      const key = emailKey(`burst${++n}@example.com`);
      const net = networkKey(`198.51.100.${n}`);
      const burst = await Promise.all(Array.from({ length: 30 }, () => claim(db, [[key, rules.signInEmail], [net, rules.signInNetwork]])));
      // A burst may be refused outright (every try sees the others); it can never get more than the limit.
      const through = burst.filter(Boolean);
      expect(through.length).toBeLessThanOrEqual(rules.signInEmail.limit);
      // Refused tries leave nothing behind; the ones let through stay counted as failures.
      expect(await db.authAttempt.count({ where: { key } })).toBe(through.length);
      // One at a time, the rest of the limit is still there, and no more.
      let later = 0;
      while (await claim(db, [[key, rules.signInEmail]])) later++;
      expect(through.length + later).toBe(rules.signInEmail.limit);
    });

    it("stops counting a try that worked, and forgets one taken back", async () => {
      const key = emailKey(`claim${++n}@example.com`);
      for (let i = 0; i < rules.signInEmail.limit - 1; i++) expect(await claim(db, [[key, rules.signInEmail]])).not.toBeNull();
      const last = await claim(db, [[key, rules.signInEmail]]);
      expect(last).not.toBeNull();
      await succeeded(db, last!);
      expect(await claim(db, [[key, rules.signInEmail]])).not.toBeNull();
      expect(await claim(db, [[key, rules.signInEmail]])).toBeNull();

      const send = emailKey(`taken-back${n}@example.com`);
      const sends = await Promise.all(Array.from({ length: 10 }, () => claim(db, [[send, rules.emailSend]])));
      expect(sends.filter(Boolean).length).toBeLessThanOrEqual(rules.emailSend.limit);
      for (const t of sends) if (t) await release(db, t);
      expect(await db.authAttempt.count({ where: { key: send } })).toBe(0);
    });

    it("gives a two-step challenge no extra tries when codes arrive all at once", async () => {
      const a = await twoStepAccount();
      const token = await createChallenge(db, a.id, "/dashboard", a.now);
      const answers = await Promise.all(Array.from({ length: 20 }, () => answerChallenge(db, token, "000000", a.now)));
      const checked = answers.filter((r) => "error" in r && /didn't match|Too many wrong/.test(r.error));
      expect(checked.length).toBe(CHALLENGE_ATTEMPTS);
      expect((await db.twoFactorChallenge.findUniqueOrThrow({ where: { id: sha256(token) } })).attempts).toBe(CHALLENGE_ATTEMPTS);
    });

    it("counts failures in the window and clears them after a sign-in", async () => {
      const key = emailKey(`Limit${++n}@Example.com`);
      for (let i = 0; i < rules.signInEmail.limit - 1; i++) await record(db, [key], "sign-in", false);
      await record(db, [key], "sign-in", true);
      expect(await overLimit(db, key, rules.signInEmail)).toBe(false);
      await record(db, [key], "sign-in", false);
      expect(await overLimit(db, key, rules.signInEmail)).toBe(true);
      expect(await overLimit(db, key, rules.signInEmail, new Date(Date.now() + 16 * 60_000))).toBe(false);
      await clearFailures(db, key, "sign-in");
      expect(await overLimit(db, key, rules.signInEmail)).toBe(false);

      const send = emailKey(`send${n}@example.com`);
      for (let i = 0; i < rules.emailSend.limit; i++) await record(db, [send], "email", true);
      expect(await overLimit(db, send, rules.emailSend)).toBe(true);
    });

    it("emails the account when a second browser signs in, not the first", async () => {
      const sent: { to: string; subject: string }[] = [];
      vi.stubGlobal("fetch", async (_: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)));
        return new Response("{}");
      });
      try {
        const a = await account();
        const firefox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0";
        expect(await noteSignIn(db, a, "device-one-aaaaaaaaaaaa", firefox)).toEqual({ newDevice: false });
        expect(await noteSignIn(db, a, "device-one-aaaaaaaaaaaa", firefox)).toEqual({ newDevice: false });
        expect(sent).toHaveLength(0);
        expect(await noteSignIn(db, a, "device-two-bbbbbbbbbbbb", null)).toEqual({ newDevice: true });
        expect(sent).toMatchObject([{ to: a.email, subject: "New sign-in to your AirPermitHub account" }]);
        expect(await db.knownDevice.count({ where: { userId: a.id, deviceHash: "device-one-aaaaaaaaaaaa" } })).toBe(0);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("saved work", () => {
    const ok = (r: Awaited<ReturnType<typeof storeSavedWork>>) => {
      if ("error" in r) throw new Error(r.error);
      return r;
    };

    it("keeps each tool's work by key, with a version per change", async () => {
      const a = await account();
      const b = await account();
      const first = ok(await storeSavedWork(db, a.id, [{ key: "aph.jobs.saved.v1", value: ["j1"], base: null }, { key: "aph.tools.deviations.v1", value: { cycle: 6, items: [] }, base: null }]));
      expect(first.conflicts).toEqual([]);
      const v1 = first.saved.find((x) => x.key === "aph.jobs.saved.v1")!.version!;
      const second = ok(await storeSavedWork(db, a.id, [{ key: "aph.jobs.saved.v1", value: ["j1", "j2"], base: v1 }], () => new Date(Date.parse(v1) + 1000)));
      expect(second.saved).toEqual([{ key: "aph.jobs.saved.v1", version: new Date(Date.parse(v1) + 1000).toISOString() }]);
      expect((await loadSavedWork(db, a.id)).map(({ key, value }) => ({ key, value }))).toEqual([
        { key: "aph.jobs.saved.v1", value: ["j1", "j2"] },
        { key: "aph.tools.deviations.v1", value: { cycle: 6, items: [] } },
      ]);
      expect(await loadSavedWork(db, b.id)).toEqual([]);
      const v2 = second.saved[0].version!;
      expect(ok(await storeSavedWork(db, a.id, [{ key: "aph.jobs.saved.v1", value: null, base: v2 }])).saved).toEqual([{ key: "aph.jobs.saved.v1", version: null }]);
      expect((await loadSavedWork(db, a.id)).map((i) => i.key)).toEqual(["aph.tools.deviations.v1"]);
    });

    it("never lets a browser that hasn't seen the account's copy overwrite it", async () => {
      const a = await account();
      const laptop = ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.rolling.v1", value: { values: [1, 2, 3] }, base: null }]));
      const v1 = laptop.saved[0].version!;
      // A new browser opens the tool before the account's copy arrives and saves a blank form.
      const phone = ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.rolling.v1", value: { values: [] }, base: null }]));
      expect(phone.saved).toEqual([]);
      expect(phone.conflicts).toEqual([{ key: "aph.tools.rolling.v1", value: { values: [1, 2, 3] }, version: v1 }]);
      // A browser holding an older version gets the newer copy instead of overwriting it.
      const later = new Date(Date.parse(v1) + 5000);
      ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.rolling.v1", value: { values: [1, 2, 3, 4] }, base: v1 }], () => later));
      const stale = ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.rolling.v1", value: { values: [9] }, base: v1 }]));
      expect(stale.conflicts).toEqual([{ key: "aph.tools.rolling.v1", value: { values: [1, 2, 3, 4] }, version: later.toISOString() }]);
      expect(ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.rolling.v1", value: null, base: v1 }])).conflicts).toHaveLength(1);
      expect((await loadSavedWork(db, a.id))[0].value).toEqual({ values: [1, 2, 3, 4] });
    });

    it("refuses other keys and work over the size limits", async () => {
      const a = await account();
      expect(await storeSavedWork(db, a.id, [{ key: "aph.sync.owner", value: "x", base: null }])).toMatchObject({ error: expect.any(String) });
      expect(await storeSavedWork(db, a.id, [{ key: "aph.tools.x.v1", value: 1, base: "not a date" }])).toMatchObject({ error: expect.any(String) });
      expect(await storeSavedWork(db, a.id, [{ key: "aph.tools.x.v1", value: 1 }])).toMatchObject({ error: expect.any(String) });
      expect(await storeSavedWork(db, a.id, [])).toMatchObject({ error: expect.any(String) });
      expect(await storeSavedWork(db, a.id, "nope")).toMatchObject({ error: expect.any(String) });
      expect(await storeSavedWork(db, a.id, [{ key: "aph.tools.big.v1", value: "x".repeat(SAVED_LIMITS.bytesPerKey), base: null }])).toMatchObject({ error: expect.stringMatching(/too large/) });
      const chunk = "x".repeat(SAVED_LIMITS.bytesPerKey - 10);
      const fill = Array.from({ length: Math.floor(SAVED_LIMITS.bytesPerAccount / SAVED_LIMITS.bytesPerKey) }, (_, i) => ({ key: `aph.tools.fill-${i}.v1`, value: chunk, base: null }));
      const filled = ok(await storeSavedWork(db, a.id, fill));
      expect(await storeSavedWork(db, a.id, [{ key: "aph.tools.one-more.v1", value: chunk, base: null }])).toMatchObject({ error: expect.stringMatching(/storage limit/) });
      // Replacing a key counts its new size, not old plus new.
      const v = filled.saved.find((x) => x.key === "aph.tools.fill-0.v1")!.version;
      expect(ok(await storeSavedWork(db, a.id, [{ key: "aph.tools.fill-0.v1", value: chunk, base: v }])).conflicts).toEqual([]);
    });
  });

  it("deletes an account and everything stored with it", async () => {
    const a = await twoStepAccount();
    await session(a.id);
    await startReset(db, a.email);
    await createChallenge(db, a.id, "/dashboard", a.now);
    await db.knownDevice.create({ data: { userId: a.id, deviceHash: sha256("d"), firstSeenAt: a.now, lastSeenAt: a.now } });
    await db.account.create({ data: { userId: a.id, provider: "google", providerAccountId: `del-${a.id}`, type: "oidc" } });
    await db.auditLog.create({ data: { actorId: null, action: "user.two-step-on", entityType: "User", entityId: a.id } });
    await storeSavedWork(db, a.id, [{ key: "aph.calc.saved.v1", value: [{ id: "c1" }], base: null }]);

    await db.$transaction([
      db.auditLog.create({ data: { actorId: null, action: "user.delete", entityType: "User", entityId: a.id } }),
      db.user.delete({ where: { id: a.id } }),
    ]);
    for (const count of [
      db.session.count({ where: { userId: a.id } }), db.authToken.count({ where: { userId: a.id } }), db.backupCode.count({ where: { userId: a.id } }),
      db.twoFactorChallenge.count({ where: { userId: a.id } }), db.knownDevice.count({ where: { userId: a.id } }), db.account.count({ where: { userId: a.id } }),
      db.savedWork.count({ where: { userId: a.id } }),
    ]) expect(await count).toBe(0);
    expect(await db.auditLog.count({ where: { entityId: a.id } })).toBe(2);
  });
});
