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

export const field = (form: FormData, name: string) => String(form.get(name) ?? "");
