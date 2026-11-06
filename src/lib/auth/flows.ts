import type { AuthTokenKind, Prisma, PrismaClient } from "@prisma/client";
import { decrypt, encrypt, newToken, sha256 } from "./crypto";
import { RESET_MINUTES, VERIFY_HOURS } from "./email";
import { hashPassword, isBreached, passwordProblem, verifyDecoy, verifyPassword } from "./password";
import { hashBackupCode, looksLikeBackupCode, matchTotp, newBackupCodes, newTotpSecret, otpauthUrl } from "./totp";
import { accountTypes, type AccountType } from "./types";

/**
 * The account rules, kept apart from Next.js so tests can drive them against
 * a real database: sign-up, sign-in, email and reset links, two-step login,
 * and Google sign-in. Pages and server actions add cookies and redirects.
 */

type Db = PrismaClient;
type Breach = (password: string) => Promise<boolean | null>;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const TOTP_PURPOSE = "totp-secret";
export const CHALLENGE_MINUTES = 10;
export const CHALLENGE_ATTEMPTS = 5;

const breachMessage = "This password has appeared in a known data breach, so it's easy to guess. Choose a different one.";

async function newPasswordProblem(password: string, email: string, breached: Breach) {
  const problem = passwordProblem(password, email);
  if (problem) return problem;
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
  const problem = await newPasswordProblem(input.password, email, breached);
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

/** Checks an email and password. Unknown addresses take as long as wrong passwords. */
export async function checkPassword(db: Db, rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  const user = validEmail(email) && password ? await db.user.findUnique({ where: { email } }) : null;
  if (!user || !user.passwordHash || user.isSystem || password.length > 1024) {
    await verifyDecoy(password.slice(0, 1024));
    return null;
  }
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
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
  const problem = await newPasswordProblem(password, user.email, breached);
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
  const problem = await newPasswordProblem(next, user.email, breached);
  if (problem) return { error: problem };
  const passwordHash = await hashPassword(next);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now } }),
    db.session.deleteMany({ where: { userId, ...(keepSessionToken ? { sessionToken: { not: keepSessionToken } } : {}) } }),
  ]);
  return { ok: true as const, email: user.email, added: !user.passwordHash };
}

// ───────── Two-step login ─────────

/** Starts setting up two-step login: a new secret, kept until the first code confirms it. */
export async function beginTwoStep(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorEnabledAt) return { error: "Two-step login is already on." };
  if (!user.emailVerified) return { error: "Confirm your email address before turning on two-step login." };
  const secret = newTotpSecret();
  await db.user.update({ where: { id: userId }, data: { twoFactorSecret: encrypt(secret, TOTP_PURPOSE), twoFactorLastStep: null } });
  return { secret, url: otpauthUrl(secret, user.email) };
}

/** The secret waiting for its first code, to show again if the setup page reloads. */
export async function pendingTwoStep(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorEnabledAt || !user.twoFactorSecret) return null;
  const secret = decrypt(user.twoFactorSecret, TOTP_PURPOSE);
  return { secret, url: otpauthUrl(secret, user.email) };
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
  const ch = await db.twoFactorChallenge.findUnique({ where: { id } });
  if (!ch || ch.usedAt || ch.expiresAt <= now || ch.attempts >= CHALLENGE_ATTEMPTS) {
    return { error: "This sign-in step has expired. Sign in again.", restart: true };
  }
  return db.$transaction(async (tx) => {
    const via = await spendSecondFactor(tx, ch.userId, code, now);
    if (!via) {
      const updated = await tx.twoFactorChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
      const left = CHALLENGE_ATTEMPTS - updated.attempts;
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
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return true;
  if (user.isSystem) return false;
  // Connecting Google from account settings: this session already passed sign-in.
  if (signedInAs === user.id) return true;
  if (!user.emailVerified) {
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { emailVerified: now, passwordHash: null, passwordChangedAt: null } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.authToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    ]);
  }
  if (user.twoFactorEnabledAt) {
    const { provider, providerAccountId, type } = account;
    await db.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId: user.id, provider, providerAccountId, type },
      update: {},
    });
    return `/sign-in/two-step?c=${encodeURIComponent(await createChallenge(db, user.id, next, now))}`;
  }
  return true;
}
