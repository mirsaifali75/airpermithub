"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { signInWithPassword } from "@/app/sign-in/actions";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { Field, FormAlert, inputClass, MethodSwitch, PasswordInput, PhoneInput, type Method } from "./fields";

/** `phone` shows the Email | Phone number switch (only when texting is set up). */
export function SignInForm({ next, enabled, notice, phone = false, initialMethod = "email" }: {
  next: string; enabled: boolean; notice?: string; phone?: boolean; initialMethod?: Method;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(signInWithPassword, {});
  const [chosen, setMethod] = useState<Method>(phone ? initialMethod : "email");
  const method: Method = phone ? chosen : "email";
  const forgot = `/forgot-password${method === "phone" ? "?method=phone" : ""}`;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {phone && <MethodSwitch value={method} onChange={setMethod} legend="Sign in with" disabled={!enabled} />}
      <FormAlert message={state.error} />
      {!state.error && <FormAlert message={notice} tone="ok" />}
      {method === "phone" ? (
        <Field id={`${id}-phone`} label="Phone number">
          <PhoneInput id={`${id}-phone`} defaultValue={state.values?.phone} key={state.values?.phone} disabled={!enabled} />
        </Field>
      ) : (
        <Field id={`${id}-email`} label="Email">
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} key={state.values?.email} className={inputClass} disabled={!enabled} />
        </Field>
      )}
      <Field id={`${id}-password`} label="Password" aside={<Link href={forgot} className="text-sm font-semibold text-brand-600">Forgot password?</Link>}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="current-password" disabled={!enabled} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!enabled || pending}>{pending ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}
