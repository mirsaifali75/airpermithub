import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Phone numbers for sign-up and sign-in. Only US and Canadian numbers that can
 * take a text are accepted: texts abroad cost more and are the usual target of
 * SMS fraud, and toll-free, premium-rate and other special numbers can't get
 * a code. Server-only: the number metadata is large.
 */

const COUNTRIES = new Set(["US", "CA"]);
const TEXTABLE = new Set(["MOBILE", "FIXED_LINE_OR_MOBILE"]);

/** The number in E.164 (+15555550123), or null when it isn't a US or Canadian number that takes texts. */
export function normalizePhone(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 40 || !/^[\d\s()+.\-]+$/.test(text)) return null;
  const p = parsePhoneNumberFromString(text, "US");
  if (!p || !p.isValid() || !p.country || !COUNTRIES.has(p.country)) return null;
  const type = p.getType();
  return type && TEXTABLE.has(type) ? p.number : null;
}

/** A stored number for people to read: (555) 555-0123. */
export function formatPhone(e164: string) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** Only the last four digits, for pages that shouldn't show the whole number. */
export function maskPhone(e164: string) {
  return `(•••) •••-${e164.slice(-4)}`;
}

export const phoneProblem = "Enter a US or Canadian mobile number, like (555) 555-0123.";
