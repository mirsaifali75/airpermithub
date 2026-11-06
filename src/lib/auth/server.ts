import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { clientKey } from "@/lib/api/rate-limit";
import { isAdminEmail, SESSION_DAYS, sessionCookieName, useSecureCookies } from "./config";
import { DEVICE_COOKIE, DEVICE_MAX_AGE, noteSignIn } from "./devices";
import { claim, clearFailures, emailKey, networkKey, phoneKey, release, rules, SITE_KEY } from "./limits";
import { sendCode, type SendResult } from "./sms";

/**
 * The Next.js side of signing in: the session cookie Auth.js reads, the
 * device cookie behind new-sign-in alerts, and the client's network for
 * attempt limits. Used by server actions and the Auth.js callbacks.
 */

export async function clientNetwork() {
  return clientKey({ headers: await headers() });
}

/** This browser's device id, set the first time it's needed. */
export async function deviceId() {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{20,64}$/.test(existing)) return existing;
  const id = randomBytes(24).toString("base64url");
  jar.set(DEVICE_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: useSecureCookies, path: "/", maxAge: DEVICE_MAX_AGE });
  return id;
}

/** Starts a database session the same way Auth.js does, so `auth()` and sign-out treat it like any other. */
export async function startSession(db: PrismaClient, userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { sessionToken, userId, expires } });
  (await cookies()).set(sessionCookieName, sessionToken, { httpOnly: true, sameSite: "lax", secure: useSecureCookies, path: "/", expires });
}

export async function currentSessionToken() {
  return (await cookies()).get(sessionCookieName)?.value;
}

type SignedInUser = { id: string; email: string | null; phone: string | null; emailVerified: Date | null; platformRole: string };

/** Admin rights come only from ADMIN_EMAILS, and only for a confirmed address. */
export async function grantAdminIfListed(db: PrismaClient, user: SignedInUser) {
  if (user.email && user.emailVerified && user.platformRole !== "ADMIN" && isAdminEmail(user.email)) {
    await db.user.update({ where: { id: user.id }, data: { platformRole: "ADMIN" } });
  }
}

/** Everything after a sign-in is proven: the device check, admin rights, and clearing failed attempts. */
export async function afterSignIn(db: PrismaClient, user: SignedInUser) {
  const ua = (await headers()).get("user-agent");
  await noteSignIn(db, user, await deviceId(), ua);
  await grantAdminIfListed(db, user);
  if (user.email) await clearFailures(db, emailKey(user.email), "sign-in");
  if (user.phone) await clearFailures(db, phoneKey(user.phone), "sign-in");
}

// ───────── Texted codes ─────────

/** The phone sign-up waiting for its code, and the number a reset code went to. Both httpOnly and short-lived. */
export const PHONE_SIGNUP_COOKIE = "aph_phone_signup";
export const PHONE_RESET_COOKIE = "aph_phone_reset";

export async function setShortCookie(name: string, value: string, path: string, minutes: number) {
  (await cookies()).set(name, value, { httpOnly: true, sameSite: "lax", secure: useSecureCookies, path, maxAge: minutes * 60 });
}

export async function clearCookie(name: string, path: string) {
  (await cookies()).delete({ name, path });
}

/**
 * Texts a code within the limits for the number, this network, and the whole
 * site per day. A text that didn't go out doesn't count. Pass
 * `networkCounted` when the caller already claimed this network's try.
 */
export async function textCode(db: PrismaClient, phone: string, { networkCounted = false } = {}): Promise<SendResult> {
  const checks: Parameters<typeof claim>[1] = [[phoneKey(phone), rules.smsSend], [SITE_KEY, rules.smsDaily]];
  if (!networkCounted) checks.push([networkKey(await clientNetwork()), rules.smsNetwork]);
  const tries = await claim(db, checks);
  if (!tries) return "too-many";
  const sent = await sendCode(phone);
  if (sent !== "sent") await release(db, tries);
  return sent;
}

/** Signs a proven user in from a server action. */
export async function signInAs(db: PrismaClient, user: SignedInUser) {
  await startSession(db, user.id);
  await afterSignIn(db, user);
}
