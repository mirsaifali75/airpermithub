"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { signUp } from "@/app/sign-up/actions";
import { Button } from "@/components/ui/Button";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import type { FormState } from "@/lib/auth/forms";
import { accountTypes } from "@/lib/auth/types";
import { Field, FormAlert, inputClass, PasswordInput } from "./fields";

export function SignUpForm({ next, enabled }: { next: string; enabled: boolean }) {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const v = state.values ?? {};
  const err = (f: string) => (state.field === f ? state.error : undefined);
  const general = state.error && !["name", "email", "password", "accountType", "company"].includes(state.field ?? "") ? state.error : undefined;
  const k = JSON.stringify(v);
  return (
    <form action={action} className="space-y-4" key={k}>
      <input type="hidden" name="next" value={next} />
      <FormAlert message={general} />
      <Field id={`${id}-name`} label="Full name" error={err("name")}>
        <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} defaultValue={v.name} className={inputClass} aria-invalid={!!err("name") || undefined} disabled={!enabled} />
      </Field>
      <Field id={`${id}-email`} label="Work email" error={err("email")}>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={v.email} className={inputClass} aria-invalid={!!err("email") || undefined} disabled={!enabled} />
      </Field>
      <Field id={`${id}-password`} label="Password" error={err("password")} hint={`At least ${PASSWORD_MIN} characters. A short phrase works well.`}>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="new-password" minLength={PASSWORD_MIN} invalid={!!err("password")} describedBy={err("password") ? `${id}-password-err` : `${id}-password-hint`} disabled={!enabled} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-type`} label="I am" error={err("accountType")}>
          <select id={`${id}-type`} name="accountType" defaultValue={v.accountType || "INDIVIDUAL"} className={inputClass} disabled={!enabled}>
            {accountTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field id={`${id}-company`} label={<>Company <span className="font-normal text-muted">(optional)</span></>} error={err("company")}>
          <input id={`${id}-company`} name="company" autoComplete="organization" maxLength={120} defaultValue={v.company} className={inputClass} disabled={!enabled} />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-line" disabled={!enabled} />
        <span>I agree to the <Link href="/terms" className="font-semibold text-brand-600">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-600">Privacy Policy</Link>.</span>
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={!enabled || pending}>{pending ? "Creating your account..." : "Create free account"}</Button>
    </form>
  );
}
