import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { clientKey } from "@/lib/api/rate-limit";
import { isAdminEmail, SESSION_DAYS, sessionCookieName, useSecureCookies } from "./config";
import { DEVICE_COOKIE, DEVICE_MAX_AGE, noteSignIn } from "./devices";
import { clearFailures, emailKey } from "./limits";

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

/** Admin rights come only from ADMIN_EMAILS, and only for a confirmed address. */
export async function grantAdminIfListed(db: PrismaClient, user: { id: string; email: string; emailVerified: Date | null; platformRole: string }) {
  if (user.emailVerified && user.platformRole !== "ADMIN" && isAdminEmail(user.email)) {
    await db.user.update({ where: { id: user.id }, data: { platformRole: "ADMIN" } });
  }
}

/** Everything after a sign-in is proven: the device check, admin rights, and clearing failed attempts. */
export async function afterSignIn(db: PrismaClient, user: { id: string; email: string; emailVerified: Date | null; platformRole: string }) {
  const ua = (await headers()).get("user-agent");
  await noteSignIn(db, user, await deviceId(), ua);
  await grantAdminIfListed(db, user);
  await clearFailures(db, emailKey(user.email), "sign-in");
}

/** Signs a proven user in from a server action. */
export async function signInAs(db: PrismaClient, user: { id: string; email: string; emailVerified: Date | null; platformRole: string }) {
  await startSession(db, user.id);
  await afterSignIn(db, user);
}
