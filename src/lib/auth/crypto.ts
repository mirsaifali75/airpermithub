import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/** Helpers for tokens and secrets that never leave the server. */

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** A random URL-safe token and the hash that gets stored in its place. */
export function newToken(bytes = 32) {
  const token = randomBytes(bytes).toString("base64url");
  return { token, hash: sha256(token) };
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function key(purpose: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return Buffer.from(hkdfSync("sha256", secret, "airpermithub", purpose, 32));
}

/** AES-256-GCM with a key derived from AUTH_SECRET. Rotating AUTH_SECRET makes earlier values unreadable. */
export function encrypt(plain: string, purpose: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(purpose), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(sealed: string, purpose: string) {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unreadable secret.");
  const d = createDecipheriv("aes-256-gcm", key(purpose), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

export const hmacSha1 = (k: Buffer, msg: Buffer) => createHmac("sha1", k).update(msg).digest();
