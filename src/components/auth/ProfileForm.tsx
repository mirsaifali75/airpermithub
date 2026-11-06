"use client";

import { useActionState, useId } from "react";
import { saveProfile, type ProfileState } from "@/app/account/actions";
import { Button } from "@/components/ui/Button";
import { accountTypes, type AccountType } from "@/lib/auth/types";
import { Field, FormAlert, inputClass } from "./fields";

/** Name, company, and account type. Asked once after a first Google sign-in, and editable in settings. */
export function ProfileForm({ name, company, accountType, submitLabel, setup = false }: {
  name: string; company: string; accountType: AccountType; submitLabel: string; setup?: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  return (
    <form action={action} className="space-y-4">
      {setup && <input type="hidden" name="setup" value="1" />}
      <Field id={`${id}-name`} label="Full name">
        <input id={`${id}-name`} name="name" defaultValue={name} autoComplete="name" required maxLength={120} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-type`} label="I am">
          <select id={`${id}-type`} name="accountType" defaultValue={accountType} className={inputClass}>
            {accountTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field id={`${id}-company`} label={<>Company <span className="font-normal text-muted">(optional)</span></>}>
          <input id={`${id}-company`} name="company" defaultValue={company} autoComplete="organization" maxLength={120} className={inputClass} />
        </Field>
      </div>
      <FormAlert message={state.error} />
      <FormAlert message={state.saved ? "Saved." : undefined} tone="ok" />
      <Button type="submit" size={setup ? "lg" : "md"} className={setup ? "w-full" : ""} disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
    </form>
  );
}
