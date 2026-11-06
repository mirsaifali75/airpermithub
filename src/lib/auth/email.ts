import { site } from "@/lib/site";
import { emailFrom } from "./config";

/**
 * Account emails: verify an address, reset a password, a note when someone
 * tries to sign up with an address that already has an account, and alerts
 * for a new browser or a changed password. Each has one link at most.
 */

export interface Email { subject: string; text: string; html: string }

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Where links in emails point. Never taken from the request's Host header,
 * so a forged header can't send someone a reset link to another site.
 */
export function appOrigin(env: Record<string, string | undefined> = process.env) {
  if (env.AUTH_URL) return new URL(env.AUTH_URL).origin;
  if (env.VERCEL_ENV === "preview" && (env.VERCEL_BRANCH_URL || env.VERCEL_URL)) return `https://${env.VERCEL_BRANCH_URL || env.VERCEL_URL}`;
  return new URL(site.url).origin;
}

export const appUrl = (path: string) => `${appOrigin()}${path}`;

const when = (d: Date) => d.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC";

function layout({ title, lines, button, footer }: { title: string; lines: string[]; button?: { label: string; url: string }; footer: string }) {
  const host = new URL(appOrigin()).host;
  const text = [title, "", ...lines, ...(button ? ["", `${button.label}: ${button.url}`] : []), "", footer, "", `AirPermitHub · ${host}`].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:20px;font-weight:bold;color:#0b2942">${esc(title)}</td></tr>
${lines.map((l) => `<tr><td style="padding-top:12px;font-size:15px;line-height:1.5">${esc(l)}</td></tr>`).join("\n")}
${button ? `<tr><td style="padding:24px 0 8px"><a href="${esc(button.url)}" style="display:inline-block;background:#0066db;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">${esc(button.label)}</a></td></tr>` : ""}
<tr><td style="padding-top:16px;font-size:13px;line-height:1.5;color:#5b6b7b">${esc(footer)}</td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#8a97a6">AirPermitHub · ${esc(host)}</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

export const VERIFY_HOURS = 24;
export const RESET_MINUTES = 30;

export function verifyEmail(url: string): Email {
  return {
    subject: "Confirm your AirPermitHub email",
    ...layout({
      title: "Confirm your email",
      lines: ["Thanks for creating an AirPermitHub account. Confirm this is your address to finish setting up."],
      button: { label: "Confirm my email", url },
      footer: `The link works once and expires in ${VERIFY_HOURS} hours. If you didn't create an account, ignore this email and nothing happens.`,
    }),
  };
}

export function resetPasswordEmail(url: string): Email {
  return {
    subject: "Reset your AirPermitHub password",
    ...layout({
      title: "Reset your password",
      lines: ["Someone asked to reset the password for this AirPermitHub account. If it was you, choose a new password with the button below."],
      button: { label: "Choose a new password", url },
      footer: `The link works once and expires in ${RESET_MINUTES} minutes. If you didn't ask, ignore this email; your password stays the same.`,
    }),
  };
}

/** Sent instead of a second account, so the sign-up form never says which addresses are registered. */
export function accountExistsEmail(): Email {
  return {
    subject: "You already have an AirPermitHub account",
    ...layout({
      title: "You already have an account",
      lines: [
        "Someone tried to create an AirPermitHub account with this email address, which already has one.",
        "If it was you, sign in instead. If you signed up with Google, use Continue with Google. Forgot your password? Use the reset link on the sign-in page.",
      ],
      button: { label: "Sign in", url: appUrl("/sign-in") },
      footer: "If it wasn't you, ignore this email. No new account was created.",
    }),
  };
}

export function newDeviceEmail({ device, when: at }: { device: string; when: Date }): Email {
  return {
    subject: "New sign-in to your AirPermitHub account",
    ...layout({
      title: "New sign-in",
      lines: [`Your account was signed in from ${device} on ${when(at)}.`, "If this was you, there's nothing to do."],
      button: { label: "Review account security", url: appUrl("/account") },
      footer: "If it wasn't you, reset your password and sign out of all devices from your account settings.",
    }),
  };
}

export function passwordChangedEmail(at: Date): Email {
  return {
    subject: "Your AirPermitHub password was changed",
    ...layout({
      title: "Password changed",
      lines: [`The password for your AirPermitHub account was changed on ${when(at)}, and other devices were signed out.`],
      button: { label: "Reset my password", url: appUrl("/forgot-password") },
      footer: "If you didn't change it, reset your password now.",
    }),
  };
}

export function twoStepChangedEmail(on: boolean, at: Date): Email {
  return {
    subject: on ? "Two-step login is on for your AirPermitHub account" : "Two-step login was turned off",
    ...layout({
      title: on ? "Two-step login is on" : "Two-step login is off",
      lines: [on
        ? `Two-step login was turned on for your account on ${when(at)}. Signing in now also needs a code from your authenticator app or a backup code.`
        : `Two-step login was turned off for your account on ${when(at)}.`],
      footer: "If you didn't make this change, reset your password and sign out of all devices from your account settings.",
    }),
  };
}

/**
 * Sends through Resend's HTTP API. RESEND_API_URL points local end-to-end tests at a stand-in server.
 * Accounts made with a phone number have no address, so for them nothing is sent.
 */
export async function sendEmail(to: string | null, { subject, text, html }: Email, { replyTo }: { replyTo?: string } = {}) {
  if (!to) return;
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: emailFrom, to, subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${await res.text()}`);
}
