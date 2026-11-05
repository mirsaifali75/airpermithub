"use client";

import { useActionState, useId } from "react";
import { changePasswordAction, deleteAccount, resendVerification } from "@/app/account/actions";
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

export function DeleteAccountForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form
      action={action} className="space-y-3"
      onSubmit={(e) => { if (!window.confirm("Delete your AirPermitHub account and everything saved in it? This can't be undone.")) e.preventDefault(); }}
    >
      <FormAlert message={state.error} />
      <Field id={`${id}-confirm`} label="Type your email to confirm">
        <input id={`${id}-confirm`} name="confirm" type="email" autoComplete="off" placeholder={email} className={inputClass} />
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
