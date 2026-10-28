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
    <div className="mx-auto w-full max-w-md">
      <Logo tone="light" />
      <h1 className="mt-8 text-3xl font-extrabold text-navy-900">{mode === "sign-in" ? "Welcome Back" : "Create your free account"}</h1>
      <p className="mt-1 text-sm text-muted">{mode === "sign-in" ? "Sign in to your account." : "Free accounts include regulation search, calculators, and resources."}</p>
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
        {submitted && <p role="status" className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-navy-800">Accounts open in Phase 2. Nothing was sent or stored.</p>}
        {mode === "sign-in" && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" name="remember" className="h-4 w-4 accent-brand-500" /> Remember me</label>
            <button type="button" onClick={() => setSubmitted(true)} className="font-semibold text-brand-600 hover:text-brand-700">Forgot password?</button>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full">{mode === "sign-in" ? "Sign In" : "Create account"}</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or continue with<span className="h-px flex-1 bg-line" /></div>
      <div className="grid gap-2.5">
        <button type="button" onClick={() => setSubmitted(true)} className="flex h-12 items-center justify-center gap-3 rounded-xl border border-line bg-white font-semibold text-ink hover:bg-canvas">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"/></svg>
          Continue with Google
        </button>
        <button type="button" onClick={() => setSubmitted(true)} className="flex h-12 items-center justify-center gap-3 rounded-xl border border-line bg-white font-semibold text-ink hover:bg-canvas">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#F25022" d="M1 1h10.5v10.5H1z"/><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z"/><path fill="#00A4EF" d="M1 12.5h10.5V23H1z"/><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z"/></svg>
          Continue with Microsoft
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "sign-in" ? <>Don&apos;t have an account? <Link href="/sign-up" className="font-semibold text-brand-600">Get started</Link></> : <>Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600">Sign in</Link></>}
      </p>
    </div>
  );
}
