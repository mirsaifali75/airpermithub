import type { Prisma, PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";

/**
 * Attempt limits kept in the database, so they hold across every server
 * instance. Each rule counts attempts (or only failures) for one key, an
 * email address or a network, inside a sliding window.
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
} satisfies Record<string, Rule>;

/** Keys are keyed hashes, so the table never holds an email or IP address in the clear. */
const keyed = (s: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "").update(s).digest("base64url");
export const emailKey = (email: string) => `email:${keyed(email.trim().toLowerCase())}`;
export const networkKey = (ip: string) => `net:${keyed(ip)}`;

export async function overLimit(db: Db, key: string, rule: Rule, now = new Date()) {
  const since = new Date(now.getTime() - rule.minutes * 60_000);
  const n = await db.authAttempt.count({ where: { key, action: rule.action, createdAt: { gte: since }, ...(rule.failuresOnly ? { ok: false } : {}) } });
  return n >= rule.limit;
}

export async function record(db: Db, keys: string[], action: string, ok: boolean) {
  await db.authAttempt.createMany({ data: keys.map((key) => ({ key, action, ok })) });
  // Old rows only matter for a day; trim now and then rather than on a schedule.
  if (Math.random() < 0.02) await db.authAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
}

/** A successful sign-in clears that address's failures, so one typo doesn't count against later sign-ins. */
export const clearFailures = (db: Db, key: string, action: string) => db.authAttempt.deleteMany({ where: { key, action, ok: false } });
