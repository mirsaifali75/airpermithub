import type { AuthTokenKind, Prisma, PrismaClient } from "@prisma/client";
import { decrypt, encrypt, newToken, sha256 } from "./crypto";
import { EMAIL_CHANGE_HOURS, RESET_MINUTES, VERIFY_HOURS } from "./email";
import { hashPassword, isBreached, passwordProblem, verifyDecoy, verifyPassword } from "./password";
import { normalizePhone, phoneProblem } from "./phone";
import type { CodeCheck } from "./sms";
import { hashBackupCode, looksLikeBackupCode, matchTotp, newBackupCodes, newTotpSecret, otpauthUrl } from "./totp";
import { accountTypes, type AccountType } from "./types";

/**
 * The account rules, kept apart from Next.js so tests can drive them against
 * a real database: sign-up, sign-in, email and reset links, texted codes for
 * phone accounts, two-step login, and Google sign-in. Pages and server
 * actions add cookies, texts and redirects.
 */

type Db = PrismaClient;
type Breach = (password: string) => Promise<boolean | null>;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email);

const TOTP_PURPOSE = "totp-secret";
export const CHALLENGE_MINUTES = 10;
export const CHALLENGE_ATTEMPTS = 5;

const breachMessage = "This password has appeared in a known data breach, so it's easy to guess. Choose a different one.";

async function newPasswordProblem(password: string, who: { email: string | null; phone?: string | null }, breached: Breach) {
  const problem = passwordProblem(password, who.email ?? undefined);
  if (problem) return problem;
  if (who.phone && password.replace(/\D/g, "").includes(who.phone.slice(-7))) return "Don't use your phone number in your password.";
  return (await breached(password)) === true ? breachMessage : null;
}

// ───────── One-time email links ─────────

/** Issues a link token; earlier unused links of the same kind for the account stop working. */
export async function createAuthToken(db: Db | Prisma.TransactionClient, userId: string, kind: AuthTokenKind, now = new Date()) {
  const { token, hash } = newToken();
  const ms = kind === "VERIFY_EMAIL" ? VERIFY_HOURS * 3_600_000 : RESET_MINUTES * 60_000;
  await db.authToken.updateMany({ where: { userId, kind, usedAt: null }, data: { usedAt: now } });
  await db.authToken.create({ data: { userId, kind, tokenHash: hash, expiresAt: new Date(now.getTime() + ms) } });
  return token;
}

/** The account a link belongs to, if it is still usable. Doesn't use it up. */
export async function peekAuthToken(db: Db, token: string, kind: AuthTokenKind, now = new Date()) {
  if (!token) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  return row && row.kind === kind && !row.usedAt && row.expiresAt > now ? row.userId : null;
}

/** Uses a link up. Only one caller can win, even if the link is opened twice at once. */
async function consumeAuthToken(db: Db | Prisma.TransactionClient, token: string, kind: AuthTokenKind, now = new Date()) {
  if (!token) return null;
  const tokenHash = sha256(token);
  const { count } = await db.authToken.updateMany({ where: { tokenHash, kind, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (count !== 1) return null;
  return (await db.authToken.findUniqueOrThrow({ where: { tokenHash } })).userId;
}

// ───────── Sign-up and email verification ─────────

export interface SignUpInput { name: string; email: string; password: string; accountType: string; company?: string }

export type SignUpResult =
  | { error: string; field?: "name" | "email" | "password" | "accountType" | "company" }
  | { created: true; userId: string; email: string; verifyToken: string }
  | { created: false; email: string; canSignIn: boolean };

/**
 * Creates an account with a password, or reports that the address is taken
 * (the caller emails that address rather than telling the visitor).
 */
export async function registerAccount(db: Db, input: SignUpInput, { breached = isBreached as Breach } = {}): Promise<SignUpResult> {
  const name = input.name.trim().slice(0, 120);
  const email = normalizeEmail(input.email);
  const company = input.company?.trim().slice(0, 120) || null;
  if (!name) return { error: "Enter your name.", field: "name" };
  if (!validEmail(email)) return { error: "Enter a valid email address.", field: "email" };
  if (!accountTypes.some((t) => t.value === input.accountType)) return { error: "Choose what describes you best.", field: "accountType" };
  const problem = await newPasswordProblem(input.password, { email }, breached);
  if (problem) return { error: problem, field: "password" };

  const existing = await db.user.findUnique({ where: { email }, select: { isSystem: true } });
  if (existing) return { created: false, email, canSignIn: !existing.isSystem };

  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, company, accountType: input.accountType as AccountType, passwordHash, passwordChangedAt: new Date() },
      });
      return { created: true as const, userId: user.id, email, verifyToken: await createAuthToken(tx, user.id, "VERIFY_EMAIL") };
    });
  } catch (e) {
    // Two sign-ups for one address at the same moment: the second is told the address is taken.
    if ((e as { code?: string }).code === "P2002") return { created: false, email, canSignIn: true };
    throw e;
  }
}

/** A fresh verification link for a signed-in account that hasn't confirmed its email. */
export async function reissueVerification(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return user.emailVerified ? null : { email: user.email, token: await createAuthToken(db, userId, "VERIFY_EMAIL") };
}

/** Confirms an email address. Returns the account, and whether it was already confirmed. */
export async function confirmEmail(db: Db, token: string, now = new Date()) {
  const userId = await consumeAuthToken(db, token, "VERIFY_EMAIL", now);
  if (!userId) return null;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.emailVerified) await db.user.update({ where: { id: userId }, data: { emailVerified: now } });
  return { userId, email: user.email, alreadyVerified: !!user.emailVerified, twoStep: !!user.twoFactorEnabledAt };
}

// ───────── Password sign-in and resets ─────────

type UserRow = NonNullable<Awaited<ReturnType<Db["user"]["findUnique"]>>>;

/** Unknown accounts take as long as wrong passwords, so the reply doesn't tell which accounts exist. */
async function passwordMatches(user: UserRow | null, password: string) {
  if (!user || !user.passwordHash || user.isSystem || password.length > 1024) {
    await verifyDecoy(password.slice(0, 1024));
    return null;
  }
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}

/** Checks an email and password. */
export async function checkPassword(db: Db, rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  return passwordMatches(validEmail(email) && password ? await db.user.findUnique({ where: { email } }) : null, password);
}

/** Checks a phone number and password. */
export async function checkPhonePassword(db: Db, rawPhone: string, password: string) {
  const phone = normalizePhone(rawPhone);
  const user = phone && password ? await db.user.findUnique({ where: { phone } }) : null;
  return passwordMatches(user?.phoneVerified ? user : null, password);
}

/** A reset link for an address, or null when no account (or only a system account) has it. */
export async function startReset(db: Db, rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email)) return null;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.isSystem) return null;
  return { email, token: await createAuthToken(db, user.id, "RESET_PASSWORD") };
}

/**
 * Sets a new password from a reset link. The link proves the address, so it
 * also confirms the email; every session ends and any pending two-step
 * challenge is dropped. Two-step login itself stays on.
 */
export async function finishReset(db: Db, token: string, password: string, { breached = isBreached as Breach, now = new Date() } = {}) {
  const userId = await peekAuthToken(db, token, "RESET_PASSWORD", now);
  if (!userId) return { error: "This reset link has expired or was already used. Ask for a new one." };
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const problem = await newPasswordProblem(password, user, breached);
  if (problem) return { error: problem };
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    if (!(await consumeAuthToken(tx, token, "RESET_PASSWORD", now))) return { error: "This reset link has expired or was already used. Ask for a new one." };
    await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now, emailVerified: user.emailVerified ?? now } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.twoFactorChallenge.deleteMany({ where: { userId } });
    return { userId, email: user.email };
  });
}

/**
 * Changes (or, for a Google-only account, adds) a password. Other sessions
 * end; the one making the change stays signed in.
 */
export async function changePassword(
  db: Db, userId: string, current: string, next: string,
  { keepSessionToken, breached = isBreached as Breach, now = new Date() }: { keepSessionToken?: string; breached?: Breach; now?: Date } = {},
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.passwordHash && !(await verifyPassword(user.passwordHash, current))) return { error: "Your current password isn't right." };
  const problem = await newPasswordProblem(next, user, breached);
  if (problem) return { error: problem };
  const passwordHash = await hashPassword(next);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now } }),
    db.session.deleteMany({ where: { userId, ...(keepSessionToken ? { sessionToken: { not: keepSessionToken } } : {}) } }),
  ]);
  return { ok: true as const, email: user.email, added: !user.passwordHash };
}

// ───────── Changing or adding an email address ─────────

export type EmailChangeStart =
  | { error: string; field: "email" | "password" | "code" }
  | { email: string; oldEmail: string | null; token: string | null };

/**
 * Starts moving an account to a new email address (or adding one to a phone
 * account). Needs the password, and a two-step code when two-step login is on,
 * so a borrowed session alone can't take the account. Nothing changes until
 * the link sent to the new address is opened. When the address already has an
 * account, `token` is null and the caller tells that address instead, so the
 * form never says which addresses are registered.
 */
export async function startEmailChange(
  db: Db, userId: string, input: { email: string; password: string; code?: string }, now = new Date(),
): Promise<EmailChangeStart> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) return { error: "Enter a valid email address.", field: "email" };
  if (email === user.email) return { error: "That's already the email on your account.", field: "email" };
  if (!user.passwordHash) return { error: "Add a password to your account first.", field: "password" };
  if (input.password.length > 1024 || !(await verifyPassword(user.passwordHash, input.password))) return { error: "Your password isn't right.", field: "password" };
  if (user.twoFactorEnabledAt && !(await spendSecondFactor(db, userId, (input.code ?? "").trim(), now))) {
    return { error: "That two-step code didn't match. Use a code from your authenticator app or a backup code.", field: "code" };
  }
  if (await db.user.findUnique({ where: { email } })) return { email, oldEmail: user.email, token: null };
  const { token, hash } = newToken();
  await db.$transaction([
    db.emailChange.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lt: now } }] } }),
    db.emailChange.create({ data: { id: hash, userId, email, expiresAt: new Date(now.getTime() + EMAIL_CHANGE_HOURS * 3_600_000) } }),
  ]);
  return { email, oldEmail: user.email, token };
}

export type EmailChangeResult = { error: string } | { userId: string; email: string; oldEmail: string | null };

const changeExpired = "This link has expired or was already used. Ask for a new one from your account settings.";

/**
 * Finishes an email change from the link. Only one open of the link can win.
 * The new address counts as confirmed; links sent to the old address stop
 * working, and sessions stay as they are.
 */
export async function confirmEmailChange(db: Db, token: string, now = new Date()): Promise<EmailChangeResult> {
  if (!token) return { error: changeExpired };
  const id = sha256(token);
  const row = await db.emailChange.findUnique({ where: { id } });
  if (!row || row.expiresAt <= now) return { error: changeExpired };
  const holder = await db.user.findUnique({ where: { email: row.email } });
  if (holder && holder.id !== row.userId) {
    await db.emailChange.deleteMany({ where: { id } });
    return { error: "That address now belongs to another account, so nothing changed." };
  }
  try {
    return await db.$transaction(async (tx) => {
      const { count } = await tx.emailChange.deleteMany({ where: { id, expiresAt: { gt: now } } });
      if (count !== 1) return { error: changeExpired };
      const user = await tx.user.findUniqueOrThrow({ where: { id: row.userId } });
      await tx.user.update({ where: { id: user.id }, data: { email: row.email, emailVerified: now } });
      await tx.emailChange.deleteMany({ where: { userId: user.id } });
      await tx.authToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.auditLog.create({ data: { actorId: null, action: user.email ? "user.email-change" : "user.email-add", entityType: "User", entityId: user.id } });
      return { userId: user.id, email: row.email, oldEmail: user.email };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { error: "That address now belongs to another account, so nothing changed." };
    throw e;
  }
}

/** The address a change link is waiting on, if it is still usable. Doesn't use it up. */
export async function pendingEmailChange(db: Db, token: string, now = new Date()) {
  if (!token) return null;
  const row = await db.emailChange.findUnique({ where: { id: sha256(token) } });
  return row && row.expiresAt > now ? row.email : null;
}

// ───────── Phone accounts ─────────

export const PHONE_SIGNUP_MINUTES = 30;
const signupExpired = "This sign-up has expired. Start again.";

export interface PhoneSignUpInput { name: string; phone: string; password: string; accountType: string; company?: string; next: string }

/**
 * Keeps a phone sign-up until the texted code comes back. The caller texts
 * the code and keeps the token in a cookie; the account itself is created by
 * `finishPhoneSignup`, so a number nobody confirmed never holds an account.
 */
export type PhoneSignupStart = { error: string; field: "name" | "phone" | "accountType" | "password" } | { token: string; phone: string };

export async function startPhoneSignup(db: Db, input: PhoneSignUpInput, { breached = isBreached as Breach, now = new Date() } = {}): Promise<PhoneSignupStart> {
  const name = input.name.trim().slice(0, 120);
  const phone = normalizePhone(input.phone);
  const company = input.company?.trim().slice(0, 120) || null;
  if (!name) return { error: "Enter your name.", field: "name" };
  if (!phone) return { error: phoneProblem, field: "phone" };
  if (!accountTypes.some((t) => t.value === input.accountType)) return { error: "Choose what describes you best.", field: "accountType" };
  const problem = await newPasswordProblem(input.password, { email: null, phone }, breached);
  if (problem) return { error: problem, field: "password" };
  const { token, hash } = newToken();
  await db.phoneSignup.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.phoneSignup.create({
    data: {
      id: hash, phone, name, company, accountType: input.accountType as AccountType, passwordHash: await hashPassword(input.password),
      next: input.next, expiresAt: new Date(now.getTime() + PHONE_SIGNUP_MINUTES * 60_000),
    },
  });
  return { token, phone };
}

/** The sign-up a cookie points at, while it can still be finished. */
export async function pendingPhoneSignup(db: Db, token: string, now = new Date()) {
  if (!token) return null;
  const row = await db.phoneSignup.findUnique({ where: { id: sha256(token) } });
  return row && row.expiresAt > now && row.attempts < CHALLENGE_ATTEMPTS ? row : null;
}

export type PhoneSignupResult =
  | { error: string; restart: boolean }
  | { exists: true; phone: string }
  | { user: UserRow; next: string };

/**
 * Checks the texted code and creates the account. Five wrong codes or 30
 * minutes end the sign-up. If the number got an account in the meantime, the
 * person (who has just proven they hold the number) is told to sign in instead.
 */
export async function finishPhoneSignup(db: Db, token: string, code: string, check: CodeCheck, now = new Date()): Promise<PhoneSignupResult> {
  const id = sha256(token || "-");
  // Counted before the code is checked, in one conditional update, as for two-step codes.
  const { count: claimed } = await db.phoneSignup.updateMany({
    where: { id, expiresAt: { gt: now }, attempts: { lt: CHALLENGE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  const row = claimed === 1 ? await db.phoneSignup.findUnique({ where: { id } }) : null;
  if (!row) return { error: signupExpired, restart: true };
  if (!(await check(row.phone, code))) {
    const left = CHALLENGE_ATTEMPTS - row.attempts;
    return left > 0
      ? { error: `That code didn't match. ${left} ${left === 1 ? "try" : "tries"} left.`, restart: false }
      : { error: "Too many wrong codes. Start again.", restart: true };
  }
  // Only one try can turn the sign-up into an account.
  const { count: taken } = await db.phoneSignup.deleteMany({ where: { id } });
  if (taken !== 1) return { error: signupExpired, restart: true };
  try {
    const user = await db.user.create({
      data: {
        phone: row.phone, phoneVerified: now, name: row.name, company: row.company, accountType: row.accountType,
        passwordHash: row.passwordHash, passwordChangedAt: now,
      },
    });
    return { user, next: row.next };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { exists: true, phone: row.phone };
    throw e;
  }
}

/** Whether a reset code should be texted: only to a number that belongs to an account. */
export async function phoneCanReset(db: Db, phone: string) {
  const user = await db.user.findUnique({ where: { phone }, select: { isSystem: true, phoneVerified: true } });
  return !!user && !user.isSystem && !!user.phoneVerified;
}

/**
 * Sets a new password from a texted code. The code is checked with Twilio
 * even when the number has no account, so the reply takes as long either way.
 * Every session ends and any pending two-step challenge is dropped; two-step
 * login itself stays on.
 */
export async function finishPhoneReset(
  db: Db, rawPhone: string, code: string, password: string, check: CodeCheck,
  { breached = isBreached as Breach, now = new Date() } = {},
) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "Ask for a new code.", field: "code" as const, restart: true };
  const user = await db.user.findUnique({ where: { phone } });
  const problem = await newPasswordProblem(password, { email: user?.email ?? null, phone }, breached);
  if (problem) return { error: problem, field: "password" as const };
  const approved = await check(phone, code);
  if (!approved || !user || user.isSystem || !user.phoneVerified) return { error: "That code didn't match, or it has expired.", field: "code" as const };
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: now } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.twoFactorChallenge.deleteMany({ where: { userId: user.id } }),
  ]);
  return { userId: user.id, email: user.email };
}

// ───────── Two-step login ─────────

/** How an authenticator app names the account: its email, or its phone number. */
const accountLabel = (user: { email: string | null; phone: string | null }) => user.email ?? user.phone ?? "account";

/** Starts setting up two-step login: a new secret, kept until the first code confirms it. */
export async function beginTwoStep(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorEnabledAt) return { error: "Two-step login is already on." };
  if (!user.emailVerified && !user.phoneVerified) return { error: "Confirm your email address before turning on two-step login." };
  const secret = newTotpSecret();
  await db.user.update({ where: { id: userId }, data: { twoFactorSecret: encrypt(secret, TOTP_PURPOSE), twoFactorLastStep: null } });
  return { secret, url: otpauthUrl(secret, accountLabel(user)) };
}

/** The secret waiting for its first code, to show again if the setup page reloads. */
export async function pendingTwoStep(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorEnabledAt || !user.twoFactorSecret) return null;
  const secret = decrypt(user.twoFactorSecret, TOTP_PURPOSE);
  return { secret, url: otpauthUrl(secret, accountLabel(user)) };
}

async function storeBackupCodes(tx: Prisma.TransactionClient, userId: string) {
  const codes = newBackupCodes();
  await tx.backupCode.deleteMany({ where: { userId } });
  await tx.backupCode.createMany({ data: codes.map((c) => ({ userId, codeHash: c.hash })) });
  return codes.map((c) => c.code);
}

/** Turns two-step login on once the app's first code matches. Returns the backup codes, shown once. */
export async function confirmTwoStep(db: Db, userId: string, code: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorEnabledAt) return { error: "Two-step login is already on." };
  if (!user.twoFactorSecret) return { error: "Start setup again." };
  const step = matchTotp(decrypt(user.twoFactorSecret, TOTP_PURPOSE), code, { now: now.getTime() });
  if (step === null) return { error: "That code didn't match. Check the time on your phone is set automatically, then try the newest code." };
  return db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { twoFactorEnabledAt: now, twoFactorLastStep: step } });
    return { codes: await storeBackupCodes(tx, userId), email: user.email };
  });
}

/**
 * Checks a code from the app or an unused backup code, and uses it up.
 * Conditional updates make each code work once even under concurrent tries.
 */
export async function spendSecondFactor(db: Db | Prisma.TransactionClient, userId: string, input: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorEnabledAt || !user.twoFactorSecret) return false;
  const step = matchTotp(decrypt(user.twoFactorSecret, TOTP_PURPOSE), input, { now: now.getTime(), lastStep: user.twoFactorLastStep });
  if (step !== null) {
    const { count } = await db.user.updateMany({
      where: { id: userId, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    return count === 1 ? "app" : false;
  }
  if (looksLikeBackupCode(input)) {
    const { count } = await db.backupCode.updateMany({ where: { userId, codeHash: hashBackupCode(input), usedAt: null }, data: { usedAt: now } });
    return count === 1 ? "backup" : false;
  }
  return false;
}

export async function disableTwoStep(db: Db, userId: string, code: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.platformRole !== "USER") return { error: "Admin and reviewer accounts must keep two-step login on." };
  if (!(await spendSecondFactor(db, userId, code, now))) return { error: "That code didn't match." };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null } }),
    db.backupCode.deleteMany({ where: { userId } }),
  ]);
  return { ok: true as const, email: user.email };
}

export async function regenerateBackupCodes(db: Db, userId: string, code: string, now = new Date()) {
  if (!(await spendSecondFactor(db, userId, code, now))) return { error: "That code didn't match." };
  return { codes: await db.$transaction((tx) => storeBackupCodes(tx, userId)) };
}

export const backupCodesLeft = (db: Db, userId: string) => db.backupCode.count({ where: { userId, usedAt: null } });

// ───────── The step between a password (or Google) and the code ─────────

export async function createChallenge(db: Db, userId: string, next: string, now = new Date()) {
  const { token, hash } = newToken();
  await db.twoFactorChallenge.deleteMany({ where: { userId, OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }] } });
  await db.twoFactorChallenge.create({ data: { id: hash, userId, next, expiresAt: new Date(now.getTime() + CHALLENGE_MINUTES * 60_000) } });
  return token;
}

export type ChallengeResult = { userId: string; next: string; via: "app" | "backup" } | { error: string; restart: boolean };

/** Answers a challenge with a code. Five wrong codes, ten minutes, or one success ends it. */
export async function answerChallenge(db: Db, token: string, code: string, now = new Date()): Promise<ChallengeResult> {
  const id = sha256(token || "-");
  // The try is counted before the code is checked, in one conditional update, so
  // codes fired all at once still get no more than CHALLENGE_ATTEMPTS tries.
  const { count: claimed } = await db.twoFactorChallenge.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: now }, attempts: { lt: CHALLENGE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  const ch = claimed === 1 ? await db.twoFactorChallenge.findUnique({ where: { id } }) : null;
  if (!ch) return { error: "This sign-in step has expired. Sign in again.", restart: true };
  return db.$transaction(async (tx) => {
    const via = await spendSecondFactor(tx, ch.userId, code, now);
    if (!via) {
      const left = CHALLENGE_ATTEMPTS - ch.attempts;
      return left > 0
        ? { error: `That code didn't match. ${left} ${left === 1 ? "try" : "tries"} left.`, restart: false }
        : { error: "Too many wrong codes. Sign in again.", restart: true };
    }
    const { count } = await tx.twoFactorChallenge.updateMany({ where: { id, usedAt: null }, data: { usedAt: now } });
    if (count !== 1) return { error: "This sign-in step has expired. Sign in again.", restart: true };
    return { userId: ch.userId, next: ch.next, via };
  });
}

// ───────── Google ─────────

export interface GoogleProfile { email?: string | null; email_verified?: boolean | null }
export interface OAuthAccount { provider: string; providerAccountId: string; type: string; [k: string]: unknown }

/**
 * Decides a Google sign-in before Auth.js links or creates the account:
 * - Google must have verified the address.
 * - A Google account already connected decides the account; otherwise the
 *   address does.
 * - An existing account whose email was never confirmed loses its password
 *   and sessions first, so whoever registered the address can't keep a way in.
 * - An account with two-step login gets its Google account linked here and
 *   is sent to the code step instead of being signed in.
 * Returns true to continue, false to refuse, or a path to redirect to.
 */
export async function googleGate(
  db: Db, profile: GoogleProfile, account: OAuthAccount, next: string,
  { now = new Date(), signedInAs }: { now?: Date; signedInAs?: string | null } = {},
): Promise<boolean | string> {
  const email = profile.email ? normalizeEmail(profile.email) : "";
  if (!email || profile.email_verified !== true) return "/sign-in?error=GoogleUnverified";
  // A Google account already connected to an account signs in to that one, whatever
  // its email, so two-step login applies to it too (a phone account has no email, and
  // Google can be connected from an account with a different address).
  const { provider, providerAccountId } = account;
  const linked = await db.account.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, include: { user: true } });
  const user = linked?.user ?? (await db.user.findUnique({ where: { email } }));
  if (!user) return true;
  if (user.isSystem) return false;
  // Connecting Google from account settings: this session already passed sign-in.
  if (signedInAs === user.id) return true;
  if (!linked && !user.emailVerified) {
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { emailVerified: now, passwordHash: null, passwordChangedAt: null } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.authToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    ]);
  }
  if (user.twoFactorEnabledAt) {
    const { type } = account;
    await db.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId: user.id, provider, providerAccountId, type },
      update: {},
    });
    return `/sign-in/two-step?c=${encodeURIComponent(await createChallenge(db, user.id, next, now))}`;
  }
  return true;
}
