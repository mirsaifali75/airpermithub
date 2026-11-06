import type { Metadata } from "next";
import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ClosedNotice } from "@/components/auth/ClosedNotice";
import { ForgotForm } from "@/components/auth/CodeForms";
import { accountsEnabled } from "@/lib/auth/config";
import { RESET_MINUTES } from "@/lib/auth/email";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sent = !!(await searchParams).sent;
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {sent ? <MailCheck className="h-7 w-7" aria-hidden="true" /> : <KeyRound className="h-7 w-7" aria-hidden="true" />}
        </span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">{sent ? "Check your email" : "Reset your password"}</h1>
        {sent ? (
          <>
            <p className="mt-3 text-slate-700">If that address has an AirPermitHub account, a reset link is on its way. It works once and expires in {RESET_MINUTES} minutes.</p>
            <p className="mt-3 text-sm text-muted">Signed up with Google? You can keep using Continue with Google, or use the link to add a password too.</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">Enter the email you signed up with and we&apos;ll send a link to choose a new password.</p>
            {!accountsEnabled ? <ClosedNotice /> : <div className="mt-6"><ForgotForm /></div>}
          </>
        )}
        <p className="mt-6 text-sm text-muted"><Link href="/sign-in" className="font-semibold text-brand-600">Back to sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
