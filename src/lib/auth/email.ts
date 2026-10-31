import { LINK_MINUTES } from "./config";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Subject, plain text, and HTML for a sign-in link. */
export function signInEmail(url: string) {
  const host = new URL(url).host;
  const subject = "Your AirPermitHub sign-in link";
  const text = [
    "Use this link to sign in to AirPermitHub:",
    url,
    "",
    `It works once and expires in ${LINK_MINUTES} minutes. If you didn't ask to sign in, you can ignore this email.`,
    "",
    `AirPermitHub · ${host}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:20px;font-weight:bold;color:#0b2942">Sign in to AirPermitHub</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5">Click the button to sign in. The link works once and expires in ${LINK_MINUTES} minutes.</td></tr>
<tr><td style="padding:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#0066db;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">Sign in</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#5b6b7b">If you didn't ask to sign in, you can ignore this email. Nobody can sign in without the link.</td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#8a97a6">AirPermitHub · ${esc(host)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Sends a sign-in link through Resend's HTTP API. */
export async function sendSignInEmail({ to, url, from, apiKey }: { to: string; url: string; from: string; apiKey: string }) {
  const { subject, text, html } = signInEmail(url);
  // RESEND_API_URL points local end-to-end tests at a stand-in server.
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend refused the sign-in email (${res.status}): ${await res.text()}`);
}
