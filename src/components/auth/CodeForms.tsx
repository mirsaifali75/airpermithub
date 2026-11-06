"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { answerTwoStep } from "@/app/sign-in/actions";
import { requestReset } from "@/app/forgot-password/actions";
import { setNewPassword, setNewPasswordByPhone } from "@/app/reset-password/actions";
import { confirmPhoneSignup, resendPhoneSignupCode } from "@/app/sign-up/actions";
import { confirmEmailAction } from "@/app/verify-email/actions";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { Field, FormAlert, inputClass, MethodSwitch, PasswordInput, PhoneInput, TextCodeInput, type Method } from "./fields";

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

export function ForgotForm({ phone = false, initialMethod = "email" }: { phone?: boolean; initialMethod?: Method }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, {});
  const [chosen, setMethod] = useState<Method>(phone ? initialMethod : "email");
  const method: Method = phone ? chosen : "email";
  return (
    <form action={action} className="space-y-4">
      {phone && <MethodSwitch value={method} onChange={setMethod} legend="Reset with" />}
      <FormAlert message={state.error} />
      {method === "phone" ? (
        <Field id={`${id}-phone`} label="Phone number" hint="The number you signed up with. Message and data rates may apply.">
          <PhoneInput id={`${id}-phone`} defaultValue={state.values?.phone} key={state.values?.phone} describedBy={`${id}-phone-hint`} />
        </Field>
      ) : (
        <Field id={`${id}-email`} label="Email">
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className={inputClass} />
        </Field>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending..." : method === "phone" ? "Text me a code" : "Email me a reset link"}
      </Button>
    </form>
  );
}

/** A new password from a texted code. */
export function PhoneResetForm() {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(setNewPasswordByPhone, {});
  if (state.restart) {
    return (
      <div className="space-y-4">
        <FormAlert message={state.error} />
        <Link href="/forgot-password?method=phone" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700">Ask for a new code</Link>
      </div>
    );
  }
  const err = (f: string) => (state.field === f ? state.error : undefined);
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.field ? undefined : state.error} />
      <Field id={`${id}-code`} label="6-digit code from the text" error={err("code")}>
        <TextCodeInput id={`${id}-code`} />
      </Field>
      <Field id={`${id}-password`} label="New password" error={err("password")} hint={`At least ${PASSWORD_MIN} characters.`}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={!!err("password")} />
      </Field>
      <Field id={`${id}-confirm`} label="Type it again" error={err("confirm")}>
        <PasswordInput id={`${id}-confirm`} name="confirm" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={!!err("confirm")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving..." : "Set new password"}</Button>
    </form>
  );
}

/** The texted code that finishes a phone sign-up. */
export function PhoneSignupCodeForm() {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(confirmPhoneSignup, {});
  if (state.restart) {
    return (
      <div className="space-y-4">
        <FormAlert message={state.error} />
        <Link href="/sign-up?method=phone" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700">Start again</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <Field id={`${id}-code`} label="6-digit code">
        <TextCodeInput id={`${id}-code`} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Checking..." : "Confirm and create account"}</Button>
    </form>
  );
}

export function ResendSignupCodeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resendPhoneSignupCode, {});
  return (
    <form action={action} className="space-y-3">
      <FormAlert message={state.error} />
      {!state.error && <FormAlert message={state.notice} tone="ok" />}
      <button type="submit" disabled={pending} className="text-sm font-semibold text-brand-600 disabled:opacity-50">{pending ? "Sending..." : "Text me a new code"}</button>
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
