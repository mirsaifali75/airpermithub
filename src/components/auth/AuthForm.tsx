"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useId } from "react";
import { requestSignInLink, type LinkState } from "@/app/sign-in/actions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

const errors: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Enter your email for a new one.",
  AccessDenied: "That account can't sign in here.",
  Configuration: "Sign-in is having trouble right now. Try again in a few minutes.",
};

/**
 * Email-link sign-in and sign-up. One form for both: a new address gets an
 * account when its link is clicked, then sets a name and account type.
 * Until accounts open, a notice says so and nothing is sent.
 */
export function AuthForm({ mode, enabled, error, next }: { mode: "sign-in" | "sign-up"; enabled: boolean; error?: string; next?: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<LinkState, FormData>(requestSignInLink, {});
  const message = state.error ?? (error ? errors[error] ?? errors.Configuration : undefined);
  const field = "h-12 w-full rounded-xl border border-line px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-md">
      <Logo tone="light" className="h-28" />
      <h1 className="mt-8 text-3xl font-extrabold text-navy-900">{mode === "sign-in" ? "Welcome Back" : "Create your free account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "sign-in"
          ? "Enter your work email and we'll send you a sign-in link. No password needed."
          : "Free accounts include regulation search, calculators, and resources. Enter your work email and we'll send a link to finish signing up."}
      </p>
      {!enabled && (
        <p role="note" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Accounts are coming soon.</span> Sign-in isn&apos;t available yet, and nothing you enter on this page is sent or stored. Every tool works without an account.
        </p>
      )}
      <form action={action} className="mt-6 space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-semibold text-ink">Work email</label>
          <input
            id={`${id}-email`} name="email" type="email" autoComplete="email" required className={field}
            aria-invalid={!!message} aria-describedby={message ? `${id}-err` : undefined} disabled={!enabled}
          />
        </div>
        {message && <p id={`${id}-err`} role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{message}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!enabled || pending}>
          <Mail className="h-5 w-5" aria-hidden="true" /> {pending ? "Sending..." : "Email me a sign-in link"}
        </Button>
        <p className="text-xs text-muted">The link works once and expires in 15 minutes. By continuing you agree to the <Link href="/terms" className="font-semibold text-brand-600">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-600">Privacy Policy</Link>.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "sign-in" ? <>Don&apos;t have an account? <Link href="/sign-up" className="font-semibold text-brand-600">Get started</Link></> : <>Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600">Sign in</Link></>}
      </p>
    </div>
  );
}
