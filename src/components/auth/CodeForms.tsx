"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { answerTwoStep } from "@/app/sign-in/actions";
import { requestReset } from "@/app/forgot-password/actions";
import { setNewPassword } from "@/app/reset-password/actions";
import { confirmEmailAction } from "@/app/verify-email/actions";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { Field, FormAlert, inputClass, PasswordInput } from "./fields";

/** The two-step code at sign-in: six digits from the app, or a backup code. */
export function TwoStepForm({ challenge }: { challenge: string }) {
  const id = useId();
  const [backup, setBackup] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(answerTwoStep, {});
  if (state.restart) {
    return (
      <div className="space-y-4">
        <FormAlert message={state.error} />
        <Link href="/sign-in" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700">Sign in again</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="c" value={challenge} />
      <FormAlert message={state.error} />
      <Field id={`${id}-code`} label={backup ? "Backup code" : "6-digit code from your authenticator app"}>
        <input
          id={`${id}-code`} name="code" required autoFocus key={String(backup)}
          {...(backup
            ? { autoComplete: "off", placeholder: "XXXX-XXXX-XXXX", maxLength: 20 }
            : { inputMode: "numeric" as const, autoComplete: "one-time-code", pattern: "[0-9 ]{6,7}", placeholder: "123456", maxLength: 7 })}
          className={`${inputClass} text-center font-mono text-xl tracking-[0.3em]`}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Checking..." : "Verify and sign in"}</Button>
      <button type="button" onClick={() => setBackup((b) => !b)} className="w-full text-center text-sm font-semibold text-brand-600">
        {backup ? "Use a code from my app instead" : "Lost your phone? Use a backup code"}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, {});
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <Field id={`${id}-email`} label="Email">
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={inputClass} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Sending..." : "Email me a reset link"}</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert message={state.field ? undefined : state.error} />
      <Field id={`${id}-password`} label="New password" error={state.field === "password" ? state.error : undefined} hint={`At least ${PASSWORD_MIN} characters.`}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={state.field === "password"} />
      </Field>
      <Field id={`${id}-confirm`} label="Type it again" error={state.field === "confirm" ? state.error : undefined}>
        <PasswordInput id={`${id}-confirm`} name="confirm" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={state.field === "confirm"} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving..." : "Set new password"}</Button>
    </form>
  );
}

export function VerifyForm({ token, next }: { token: string; next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEmailAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="next" value={next} />
      <FormAlert message={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Confirming..." : "Confirm my email"}</Button>
    </form>
  );
}
