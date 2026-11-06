"use client";

import { Eye, EyeOff, Mail, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-white px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:bg-slate-50 aria-invalid:border-red-400";

/** A labeled input. `aside` sits at the end of the label row, outside the label, so a link there isn't read as part of the field's name. */
export function Field({ id, label, aside, hint, error, children }: { id: string; label: ReactNode; aside?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
        {aside}
      </div>
      {children}
      {error ? <p id={`${id}-err`} className="mt-1.5 text-sm text-red-700">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** A password input with a show/hide toggle. */
export function PasswordInput({ id, name, autoComplete, invalid, describedBy, disabled, minLength }: {
  id: string; name: string; autoComplete: "current-password" | "new-password"; invalid?: boolean; describedBy?: string; disabled?: boolean; minLength?: number;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} maxLength={128}
        className={cn(inputClass, "pr-12")} aria-invalid={invalid || undefined} aria-describedby={describedBy} disabled={disabled}
      />
      <button
        type="button" onClick={() => setShown((s) => !s)} disabled={disabled}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-ink"
        aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}
      >
        {shown ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function FormAlert({ message, tone = "error" }: { message?: string; tone?: "error" | "ok" }) {
  if (!message) return null;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl px-4 py-2.5 text-sm", tone === "error" ? "bg-red-50 text-red-700" : "bg-eco-50 text-eco-700")}>
      {message}
    </p>
  );
}

export type Method = "email" | "phone";

/**
 * Email or phone number, as two radio buttons styled as a switch. The radios
 * are named "method", so the form submits the choice without extra code.
 */
export function MethodSwitch({ value, onChange, legend, disabled }: { value: Method; onChange: (m: Method) => void; legend: string; disabled?: boolean }) {
  const options: { m: Method; label: string; Icon: typeof Mail }[] = [
    { m: "email", label: "Email", Icon: Mail },
    { m: "phone", label: "Phone number", Icon: Smartphone },
  ];
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas p-1">
        {options.map(({ m, label, Icon }) => (
          <label
            key={m}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
              value === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio" name="method" value={m} checked={value === m} onChange={() => onChange(m)} disabled={disabled} className="sr-only"
              aria-label={`${legend} ${label.toLowerCase()}`}
            />
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A US or Canadian phone number. The server checks and formats it. */
export function PhoneInput({ id, defaultValue, invalid, describedBy, disabled, autoFocus }: {
  id: string; defaultValue?: string; invalid?: boolean; describedBy?: string; disabled?: boolean; autoFocus?: boolean;
}) {
  return (
    <input
      id={id} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} placeholder="(555) 555-0123"
      defaultValue={defaultValue} className={inputClass} aria-invalid={invalid || undefined} aria-describedby={describedBy} disabled={disabled} autoFocus={autoFocus}
    />
  );
}

/** The 6-digit code from a text. */
export function TextCodeInput({ id, autoFocus = true }: { id: string; autoFocus?: boolean }) {
  return (
    <input
      id={id} name="code" required autoFocus={autoFocus} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={8}
      className={`${inputClass} text-center font-mono text-xl tracking-[0.3em]`}
    />
  );
}
