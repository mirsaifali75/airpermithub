/**
 * Accounts open only when the database, the session secret, and the email
 * service are all configured; next.config.ts sets NEXT_PUBLIC_ACCOUNTS at
 * build time. Until then the sign-in pages say accounts are coming soon and
 * every tool works without one.
 */
export const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS === "1";

/** Google sign-in shows once its OAuth client is configured (server env, read at request time). */
export const googleEnabled = () => Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** Sender for account emails. The domain must be verified in Resend. */
export const emailFrom = process.env.AUTH_EMAIL_FROM || "AirPermitHub <accounts@airpermithub.com>";

/** Sessions last this long; signing in again starts a new one. */
export const SESSION_DAYS = 30;

/** Session cookies carry the __Secure- prefix wherever the site is served over HTTPS (every Vercel deployment). */
export const useSecureCookies = process.env.NODE_ENV === "production";
export const sessionCookieName = `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`;

/** ADMIN_EMAILS: comma- or space-separated addresses that get the admin role when they sign in. */
export function isAdminEmail(email: string, list = process.env.ADMIN_EMAILS ?? "") {
  const admins = list.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

/** Only same-site paths survive as a post-sign-in destination. */
export function safeNext(path: unknown, fallback = "/dashboard") {
  return typeof path === "string" && /^\/(?![/\\])[^\s]*$/.test(path) ? path : fallback;
}
