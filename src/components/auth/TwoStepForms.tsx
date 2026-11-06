"use client";

import { Check, Copy, Download } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { confirmTwoStepAction, disableTwoStepAction, newBackupCodesAction, type TwoStepState } from "@/app/account/actions";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, FormAlert, inputClass } from "./fields";

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = `AirPermitHub backup codes\nEach code works once.\n\n${codes.join("\n")}\n`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">Save these backup codes somewhere safe, such as a password manager. Each one signs you in once if you don&apos;t have your phone. <span className="font-semibold">They won&apos;t be shown again.</span></p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-slate-50 p-4 font-mono text-sm text-ink">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="subtle" size="sm" onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy"}
        </Button>
        <a className={buttonClass("subtle", "sm")} href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download="airpermithub-backup-codes.txt">
          <Download className="h-4 w-4" aria-hidden="true" /> Download
        </a>
        <Link href="/account" className={buttonClass("primary", "sm")}>I saved them</Link>
      </div>
    </div>
  );
}

function CodeField({ id, label = "6-digit code from your app", allowBackup = false }: { id: string; label?: string; allowBackup?: boolean }) {
  return (
    <Field id={id} label={label} hint={allowBackup ? "Or one of your backup codes." : undefined}>
      <input
        id={id} name="code" required autoComplete="one-time-code" maxLength={allowBackup ? 20 : 7}
        {...(allowBackup ? {} : { inputMode: "numeric" as const, pattern: "[0-9 ]{6,7}" })}
        className={`${inputClass} max-w-xs font-mono text-lg tracking-widest`}
      />
    </Field>
  );
}

export function ConfirmTwoStepForm() {
  const id = useId();
  const [state, action, pending] = useActionState<TwoStepState, FormData>(confirmTwoStepAction, {});
  if (state.codes) return <BackupCodes codes={state.codes} />;
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <CodeField id={`${id}-code`} />
      <Button type="submit" disabled={pending}>{pending ? "Checking..." : "Turn on two-step login"}</Button>
    </form>
  );
}

export function NewBackupCodesForm() {
  const id = useId();
  const [state, action, pending] = useActionState<TwoStepState, FormData>(newBackupCodesAction, {});
  if (state.codes) return <BackupCodes codes={state.codes} />;
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <CodeField id={`${id}-code`} allowBackup />
      <Button type="submit" variant="subtle" disabled={pending}>Make new backup codes</Button>
    </form>
  );
}

export function DisableTwoStepForm() {
  const id = useId();
  const [state, action, pending] = useActionState<TwoStepState, FormData>(disableTwoStepAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <CodeField id={`${id}-code`} allowBackup />
      <Button type="submit" variant="subtle" className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50" disabled={pending}>Turn off two-step login</Button>
    </form>
  );
}
