"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { signInWithPassword } from "@/app/sign-in/actions";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { Field, FormAlert, inputClass, PasswordInput } from "./fields";

export function SignInForm({ next, enabled, notice }: { next: string; enabled: boolean; notice?: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(signInWithPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormAlert message={state.error} />
      {!state.error && <FormAlert message={notice} tone="ok" />}
      <Field id={`${id}-email`} label="Email">
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} key={state.values?.email} className={inputClass} disabled={!enabled} />
      </Field>
      <Field id={`${id}-password`} label="Password" aside={<Link href="/forgot-password" className="text-sm font-semibold text-brand-600">Forgot password?</Link>}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="current-password" disabled={!enabled} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!enabled || pending}>{pending ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}
