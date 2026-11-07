"use client";

import { useActionState, useId, useState } from "react";
import { changePasswordAction, deleteAccount, requestEmailChange, resendVerification } from "@/app/account/actions";
import { confirmEmailChangeAction } from "@/app/account/confirm-email/actions";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { Field, FormAlert, inputClass, PasswordInput } from "./fields";

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerification, {});
  return (
    <form action={action} className="space-y-3">
      <FormAlert message={state.error} />
      <FormAlert message={state.notice} tone="ok" />
      <Button type="submit" variant="subtle" size="sm" disabled={pending}>{pending ? "Sending..." : "Send a new confirmation link"}</Button>
    </form>
  );
}

/**
 * Change the account's email, or add one to a phone account. Opens from a
 * button so the settings page stays short. Needs the password, and a two-step
 * code when two-step login is on.
 */
export function EmailChangeForm({ adding, twoStep }: { adding: boolean; twoStep: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(requestEmailChange, {});
  const err = (f: string) => (state.field === f ? state.error : undefined);
  if (state.notice) return <FormAlert message={state.notice} tone="ok" />;
  if (!open) {
    return <Button type="button" variant="subtle" size="sm" onClick={() => setOpen(true)}>{adding ? "Add an email address" : "Change email"}</Button>;
  }
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.field ? undefined : state.error} />
      <Field id={`${id}-email`} label={adding ? "Email address" : "New email address"} error={err("email")} hint="We'll send a link there to confirm it.">
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.values?.email} className={inputClass} aria-invalid={!!err("email") || undefined} aria-describedby={err("email") ? `${id}-email-err` : `${id}-email-hint`} />
      </Field>
      <Field id={`${id}-password`} label="Your password" error={err("password")}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="current-password" invalid={!!err("password")} />
      </Field>
      {twoStep && (
        <Field id={`${id}-code`} label="Two-step code" error={err("code")} hint="From your authenticator app, or a backup code.">
          <input id={`${id}-code`} name="code" required autoComplete="one-time-code" maxLength={20} className={inputClass} aria-invalid={!!err("code") || undefined} aria-describedby={err("code") ? `${id}-code-err` : `${id}-code-hint`} />
        </Field>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Send confirmation link"}</Button>
        <Button type="button" variant="subtle" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

/** The button on the page the new address's link opens. */
export function ConfirmEmailChangeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEmailChangeAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert message={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Confirming..." : "Use this email"}</Button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const err = (f: string) => (state.field === f ? state.error : undefined);
  return (
    <form action={action} className="space-y-4" key={state.notice}>
      <FormAlert message={state.notice} tone="ok" />
      {hasPassword && (
        <Field id={`${id}-current`} label="Current password" error={err("current")}>
          <PasswordInput id={`${id}-current`} name="current" autoComplete="current-password" invalid={!!err("current")} />
        </Field>
      )}
      <Field id={`${id}-new`} label="New password" error={err("password")} hint={`At least ${PASSWORD_MIN} characters.`}>
        <PasswordInput id={`${id}-new`} name="password" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={!!err("password")} />
      </Field>
      <Field id={`${id}-confirm`} label="Type it again" error={err("confirm")}>
        <PasswordInput id={`${id}-confirm`} name="confirm" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={!!err("confirm")} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : hasPassword ? "Change password" : "Add password"}</Button>
    </form>
  );
}

/** `phone` is set for accounts made with a phone number: they confirm with the number instead of an email. */
export function DeleteAccountForm({ email, phone, hasPassword }: { email: string | null; phone?: string; hasPassword: boolean }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form
      action={action} className="space-y-3"
      onSubmit={(e) => { if (!window.confirm("Delete your AirPermitHub account and everything saved in it? This can't be undone.")) e.preventDefault(); }}
    >
      <FormAlert message={state.error} />
      <Field id={`${id}-confirm`} label={email ? "Type your email to confirm" : "Type your phone number to confirm"}>
        <input id={`${id}-confirm`} name="confirm" type={email ? "email" : "tel"} autoComplete="off" placeholder={email ?? phone} className={inputClass} />
      </Field>
      {hasPassword && (
        <Field id={`${id}-password`} label="Your password">
          <PasswordInput id={`${id}-password`} name="password" autoComplete="current-password" />
        </Field>
      )}
      <Button type="submit" variant="subtle" className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50" disabled={pending}>Delete account</Button>
    </form>
  );
}
