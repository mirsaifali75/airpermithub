import type { PrismaClient } from "@prisma/client";
import { sha256 } from "./crypto";
import { newDeviceEmail, sendEmail } from "./email";

/** A long-lived random cookie names each browser; only its hash is stored. */
export const DEVICE_COOKIE = "aph_device";
export const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;

/** A short description of a browser from its user agent, for the alert email. */
export function describeAgent(ua: string | null | undefined) {
  if (!ua) return "an unknown browser";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "a browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  return `${browser} on ${os}`;
}

/**
 * Records a sign-in from this browser. The first browser an account uses is
 * just remembered; any later new one gets an email to the account's address
 * (accounts made with a phone number have none, so they get no alert).
 */
export async function noteSignIn(db: PrismaClient, user: { id: string; email: string | null }, deviceId: string, userAgent: string | null, now = new Date()) {
  const deviceHash = sha256(`device:${deviceId}`);
  const known = await db.knownDevice.findUnique({ where: { userId_deviceHash: { userId: user.id, deviceHash } } });
  if (known) {
    await db.knownDevice.update({ where: { id: known.id }, data: { lastSeenAt: now, userAgent: userAgent?.slice(0, 300) ?? known.userAgent } });
    return { newDevice: false };
  }
  const others = await db.knownDevice.count({ where: { userId: user.id } });
  await db.knownDevice.create({ data: { userId: user.id, deviceHash, userAgent: userAgent?.slice(0, 300) ?? null, firstSeenAt: now, lastSeenAt: now } });
  if (others > 0 && user.email) {
    await sendEmail(user.email, newDeviceEmail({ device: describeAgent(userAgent), when: now })).catch((e) => console.error("new-device email failed", e));
  }
  return { newDevice: others > 0 };
}
