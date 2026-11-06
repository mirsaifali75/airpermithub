import { esc, type Email } from "@/lib/auth/email";
import { normalizeEmail, validEmail } from "@/lib/auth/flows";
import { contactTopics, MESSAGE_MAX, MESSAGE_MIN, type ContactTopic } from "@/lib/contact-topics";
import { site } from "@/lib/site";

const NAME_MAX = 100;
const LINK_MAX = 500;

export interface ContactInput {
  topic: string;
  name: string;
  email: string;
  page: string;
  source: string;
  message: string;
}

export interface ContactMessage {
  topic: ContactTopic;
  name: string;
  email: string;
  page: string | null;
  source: string | null;
  message: string;
}

const isTopic = (t: string): t is ContactTopic => Object.hasOwn(contactTopics, t);

/** A web address as typed, or null if it isn't an http(s) link. A bare path like /states/nd counts as a page on this site. */
export function cleanLink(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > LINK_MAX) return null;
  try {
    const url = s.startsWith("/") && !s.startsWith("//") ? new URL(s, site.url) : new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Checks a contact message. Returns the cleaned message, or what to fix and which field. */
export function checkContact(input: ContactInput): { ok: ContactMessage } | { error: string; field: string } {
  if (!isTopic(input.topic)) return { error: "Choose what your message is about.", field: "topic" };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length > NAME_MAX) return { error: `Keep your name under ${NAME_MAX} characters.`, field: "name" };
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) return { error: "Enter the email address we should reply to.", field: "email" };
  const page = input.page.trim() ? cleanLink(input.page) : null;
  if (input.page.trim() && !page) return { error: "Enter the page as a web address, like https://airpermithub.com/states/nd.", field: "page" };
  const source = input.source.trim() ? cleanLink(input.source) : null;
  if (input.source.trim() && !source) return { error: "Enter the official source as a web address.", field: "source" };
  const message = input.message.replace(/\r\n?/g, "\n").trim();
  if (message.length < MESSAGE_MIN) return { error: "Tell us a little more in your message.", field: "message" };
  if (message.length > MESSAGE_MAX) return { error: `Keep your message under ${MESSAGE_MAX.toLocaleString("en-US")} characters.`, field: "message" };
  return { ok: { topic: input.topic, name, email, page, source, message } };
}

/** The email the inbox receives. Every value the visitor typed is escaped, and links are shown as text, not made clickable. */
export function contactEmailMessage(m: ContactMessage, { signedIn = false }: { signedIn?: boolean } = {}): Email {
  const label = contactTopics[m.topic];
  const rows: [string, string][] = [
    ["About", label],
    ["From", m.name ? `${m.name} <${m.email}>` : m.email],
    ...(m.page ? [["Page", m.page] as [string, string]] : []),
    ...(m.source ? [["Official source", m.source] as [string, string]] : []),
    ["Reply address", signedIn ? "Confirmed: they were signed in with it" : "Not confirmed: typed into the form"],
  ];
  const text = [
    `New message from the ${site.domain} contact form`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    m.message,
    "",
    "Reply to this email to answer them.",
  ].join("\n");
  // Links go in as plain text inside <code>, so a crafted link can't hide where it points.
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:18px;font-weight:bold;color:#0b2942">${esc(label)}</td></tr>
<tr><td style="padding-top:12px;font-size:14px;line-height:1.6">${rows.map(([k, v]) => `<strong>${esc(k)}:</strong> ${k === "Page" || k === "Official source" ? `<code style="word-break:break-all">${esc(v)}</code>` : esc(v)}`).join("<br>")}</td></tr>
<tr><td style="padding-top:16px;font-size:15px;line-height:1.55;white-space:pre-wrap;border-top:1px solid #e3e8ef">${esc(m.message)}</td></tr>
<tr><td style="padding-top:20px;font-size:12px;color:#8a97a6">Sent from the ${esc(site.domain)} contact form. Reply to this email to answer them.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `Contact form: ${label}`, text, html };
}
