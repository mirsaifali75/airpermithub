import type { Prisma, PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";

/**
 * Attempt limits kept in the database, so they hold across every server
 * instance. Each rule counts attempts (or only failures) for one key, an
 * email address, a phone number, a network, or the whole site, inside a
 * sliding window.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export interface Rule { action: string; limit: number; minutes: number; failuresOnly?: boolean }

export const rules = {
  signInEmail: { action: "sign-in", limit: 8, minutes: 15, failuresOnly: true },
  signInNetwork: { action: "sign-in", limit: 40, minutes: 15, failuresOnly: true },
  signUpNetwork: { action: "sign-up", limit: 8, minutes: 60 },
  emailSend: { action: "email", limit: 3, minutes: 60 },
  emailNetwork: { action: "email", limit: 15, minutes: 60 },
  twoStepNetwork: { action: "two-step", limit: 20, minutes: 15, failuresOnly: true },
  /** Texted codes: each one costs money, so a number, a network, and the whole site each have a cap. */
  smsSend: { action: "sms", limit: 3, minutes: 60 },
  smsNetwork: { action: "sms", limit: 10, minutes: 60 },
  smsDaily: { action: "sms", limit: Number(process.env.SMS_DAILY_LIMIT) || 300, minutes: 1440 },
  /** Wrong texted codes for one number, on top of Twilio's 5 checks per code. */
  phoneCode: { action: "phone-code", limit: 10, minutes: 60, failuresOnly: true },
} satisfies Record<string, Rule>;

/** Keys are keyed hashes, so the table never holds an email or IP address in the clear. */
const keyed = (s: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "").update(s).digest("base64url");
export const emailKey = (email: string) => `email:${keyed(email.trim().toLowerCase())}`;
export const networkKey = (ip: string) => `net:${keyed(ip)}`;
export const phoneKey = (phone: string) => `phone:${keyed(phone)}`;
/** One key for the whole site, for the daily cap on texts. */
export const SITE_KEY = "site";

export async function overLimit(db: Db, key: string, rule: Rule, now = new Date()) {
  const since = new Date(now.getTime() - rule.minutes * 60_000);
  const n = await db.authAttempt.count({ where: { key, action: rule.action, createdAt: { gte: since }, ...(rule.failuresOnly ? { ok: false } : {}) } });
  return n >= rule.limit;
}

// Old rows only matter for a day; trim now and then rather than on a schedule.
const trimNowAndThen = async (db: Db) => {
  if (Math.random() < 0.02) await db.authAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
};

export async function record(db: Db, keys: string[], action: string, ok: boolean) {
  await db.authAttempt.createMany({ data: keys.map((key) => ({ key, action, ok })) });
  await trimNowAndThen(db);
}

/**
 * Counts a try before acting on it. Its rows are written first and counted
 * after, so when many tries arrive at once (a script firing in parallel), each
 * sees the ones written before it and no more than `limit` get through.
 * Checking first and writing after would let every try in a burst see the
 * same old count. Rows for failure-only rules start as failures; call
 * `succeeded` when the try works. Returns the rows' ids, or null when any rule
 * is over its limit, in which case nothing stays written.
 */
export async function claim(db: Db, checks: [key: string, rule: Rule][], now = new Date()): Promise<string[] | null> {
  const rows = await db.authAttempt.createManyAndReturn({
    data: checks.map(([key, rule]) => ({ key, action: rule.action, ok: !rule.failuresOnly, createdAt: now })),
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  for (const [key, rule] of checks) {
    const since = new Date(now.getTime() - rule.minutes * 60_000);
    const n = await db.authAttempt.count({ where: { key, action: rule.action, createdAt: { gte: since, lte: now }, ...(rule.failuresOnly ? { ok: false } : {}) } });
    if (n > rule.limit) {
      await release(db, ids);
      return null;
    }
  }
  await trimNowAndThen(db);
  return ids;
}

/** The claimed try worked, so it no longer counts against failure-only limits. */
export const succeeded = (db: Db, ids: string[]) => db.authAttempt.updateMany({ where: { id: { in: ids } }, data: { ok: true } });

/** Takes a claimed try back, for when nothing was done after all. */
export const release = (db: Db, ids: string[]) => db.authAttempt.deleteMany({ where: { id: { in: ids } } });

/** A successful sign-in clears that address's failures, so one typo doesn't count against later sign-ins. */
export const clearFailures = (db: Db, key: string, action: string) => db.authAttempt.deleteMany({ where: { key, action, ok: false } });
