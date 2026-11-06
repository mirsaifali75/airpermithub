import { hash, verify } from "@node-rs/argon2";
import { createHash } from "node:crypto";

/** Passwords: Argon2id (19 MiB, 2 passes, the OWASP baseline), 10 to 128 characters, checked against known breaches. */

import { PASSWORD_MAX, PASSWORD_MIN } from "./password-rules";

export { PASSWORD_MAX, PASSWORD_MIN };

const ARGON2ID = 2;

export const hashPassword = (password: string) => hash(password, { algorithm: ARGON2ID });

export async function verifyPassword(stored: string, password: string) {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/** A hash of a random string, verified when an account doesn't exist so the reply takes as long either way. */
let decoy: Promise<string> | null = null;
export async function verifyDecoy(password: string) {
  decoy ??= hashPassword("decoy password that no account has");
  await verifyPassword(await decoy, password);
  return false;
}

/** What's wrong with a new password, in words for the person typing it, or null. */
export function passwordProblem(password: string, email?: string) {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (new Set(password).size < 4) return "Use a password with more variety.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    return "Don't use your email name in your password.";
  }
  return null;
}

/**
 * True when the password appears in a known data breach, using the Pwned
 * Passwords range API: only the first 5 characters of its SHA-1 hash leave
 * the server, and padded responses hide which range was asked about.
 * Null when the check couldn't run, so sign-up never stalls on it.
 */
export async function isBreached(password: string, fetcher: typeof fetch = fetch): Promise<boolean | null> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "AirPermitHub-password-check" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [s, count] = line.trim().split(":");
      if (s === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return null;
  }
}
