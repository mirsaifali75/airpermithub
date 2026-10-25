"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { accountTypes } from "@/lib/auth/types";

/**
 * Sign-in / sign-up UI. Not wired to a provider yet: submission explains that
 * accounts open in Phase 2. See src/lib/auth for the provider-agnostic contract.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const id = useId();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = "h-12 w-full rounded-xl border border-line px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-lift sm:p-8">
      <Logo tone="light" />
      <h1 className="mt-6 text-2xl font-bold text-ink">{mode === "sign-in" ? "Sign in" : "Create your free account"}</h1>
      <p className="mt-1 text-sm text-muted">{mode === "sign-in" ? "Welcome back." : "Free accounts include regulation search, basic calculators, and resources."}</p>
      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const email = String(data.get("email") ?? "");
          if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
          if (String(data.get("password") ?? "").length < 8) return setError("Password must be at least 8 characters.");
          setError(null);
          setSubmitted(true);
        }}
      >
        {mode === "sign-up" && (
          <>
            <div>
              <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-semibold text-ink">Full name</label>
              <input id={`${id}-name`} name="name" autoComplete="name" className={field} />
            </div>
            <div>
              <label htmlFor={`${id}-type`} className="mb-1.5 block text-sm font-semibold text-ink">Account type</label>
              <select id={`${id}-type`} name="accountType" className={field}>
                {accountTypes.filter((t) => t.value !== "ADMIN").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </>
        )}
        <div>
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-semibold text-ink">Work email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required className={field} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
        </div>
        <div>
          <label htmlFor={`${id}-pw`} className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
          <input id={`${id}-pw`} name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} className={field} />
        </div>
        {error && <p id={`${id}-err`} role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        {submitted && <p role="status" className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-navy-800">Accounts open in Phase 2. Your details were not stored.</p>}
        <Button type="submit" size="lg" className="w-full">{mode === "sign-in" ? "Sign in" : "Create account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "sign-in" ? <>New to AirPermitHub? <Link href="/sign-up" className="font-semibold text-brand-600">Create an account</Link></> : <>Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600">Sign in</Link></>}
      </p>
    </div>
  );
}
