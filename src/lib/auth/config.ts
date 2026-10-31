/**
 * Accounts open only when the database, the session secret, and the email
 * service are all configured; next.config.ts sets NEXT_PUBLIC_ACCOUNTS at
 * build time. Until then the sign-in pages say accounts are coming soon.
 */
export const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS === "1";

/** Sender for sign-in emails. The domain must be verified in Resend. */
export const emailFrom = process.env.AUTH_EMAIL_FROM || "AirPermitHub <sign-in@airpermithub.com>";

/** Sign-in links work once, for this long. */
export const LINK_MINUTES = 15;

/** ADMIN_EMAILS: comma- or space-separated addresses that get the admin role when they sign in. */
export function isAdminEmail(email: string, list = process.env.ADMIN_EMAILS ?? "") {
  const admins = list.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

/** Only same-site paths survive as a post-sign-in destination. */
export function safeNext(path: unknown, fallback = "/dashboard") {
  return typeof path === "string" && /^\/(?![/\\])[^\s]*$/.test(path) ? path : fallback;
}
