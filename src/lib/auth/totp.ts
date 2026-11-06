import { randomBytes } from "node:crypto";
import { hmacSha1, safeEqual, sha256 } from "./crypto";

/**
 * Two-step login codes (RFC 6238 TOTP: SHA-1, 6 digits, 30 seconds), the
 * kind Google Authenticator, Microsoft Authenticator, and 1Password make.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export const stepAt = (ms: number) => Math.floor(ms / 1000 / STEP_SECONDS);

export function totpAt(secret: string, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = hmacSha1(base32Decode(secret), msg);
  const offset = h[h.length - 1] & 15;
  const n = ((h[offset] & 127) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/**
 * The time step a code matches (allowing one step of clock drift either way),
 * or null. Steps at or before `lastStep` are refused so a code works once.
 */
export function matchTotp(secret: string, code: string, { now = Date.now(), lastStep = null as number | null } = {}) {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const current = stepAt(now);
  for (const step of [current - 1, current, current + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    if (safeEqual(totpAt(secret, step), digits)) return step;
  }
  return null;
}

export function otpauthUrl(secret: string, email: string) {
  const label = encodeURIComponent(`AirPermitHub:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=AirPermitHub&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

/** Ten backup codes like "7KQ2-MX9P-4TRA", shown once; only their hashes are kept. */
export function newBackupCodes(n = 10) {
  return Array.from({ length: n }, () => {
    const raw = base32Encode(randomBytes(8)).slice(0, 12);
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    return { code, hash: hashBackupCode(code) };
  });
}

export const hashBackupCode = (code: string) => sha256(`backup:${code.toUpperCase().replace(/[^A-Z2-7]/g, "")}`);

export const looksLikeBackupCode = (s: string) => s.toUpperCase().replace(/[^A-Z2-7]/g, "").length === 12;
