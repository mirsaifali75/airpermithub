"use client";

import { useActionState, useId } from "react";
import { saveProfile, type ProfileState } from "@/app/account/actions";
import { Button } from "@/components/ui/Button";
import { accountTypes, type AccountType } from "@/lib/auth/types";

/** Name and account type, asked once after the first sign-in and editable from the account page. */
export function ProfileForm({ name, accountType, submitLabel }: { name: string; accountType: AccountType; submitLabel: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const field = "h-12 w-full rounded-xl border border-line px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-semibold text-ink">Full name</label>
        <input id={`${id}-name`} name="name" defaultValue={name} autoComplete="name" required maxLength={120} className={field} />
      </div>
      <div>
        <label htmlFor={`${id}-type`} className="mb-1.5 block text-sm font-semibold text-ink">Account type</label>
        <select id={`${id}-type`} name="accountType" defaultValue={accountType} className={field}>
          {accountTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
    </form>
  );
}
