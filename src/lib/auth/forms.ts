/** State a sign-in or account form keeps between submissions. Passwords are never echoed back. */
export interface FormState {
  error?: string;
  field?: string;
  notice?: string;
  values?: Record<string, string>;
  /** The two-step step expired, so the person has to sign in again. */
  restart?: boolean;
}

export const closedMessage = "Accounts aren't open yet. Every tool works without one for now.";

/**
 * One form value as text. NUL characters are dropped: no one can type one, and
 * Postgres refuses to store them, so a crafted request carrying one would
 * otherwise end in a server error instead of a normal answer.
 */
export const field = (form: FormData, name: string) => String(form.get(name) ?? "").replace(/\u0000/g, "");

/**
 * A value other people will read, like a name or company: control characters and
 * the invisible marks that flip text direction are removed, so a name can't
 * break a layout or disguise itself as something else.
 */
export const textField = (form: FormData, name: string) =>
  field(form, name).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");
