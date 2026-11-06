import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyForm } from "@/components/auth/CodeForms";
import { accountsEnabled, safeNext } from "@/lib/auth/config";
import { peekAuthToken } from "@/lib/auth/flows";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };

/**
 * Opening the link only shows a button; pressing it confirms. Mail scanners
 * that open every link in an email can't use the link up on their own.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const sp = await searchParams;
  const token = sp.token ?? "";
  const valid = accountsEnabled && !!(await peekAuthToken(prisma, token, "VERIFY_EMAIL"));
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Confirm your email</h1>
        {valid ? (
          <>
            <p className="mt-2 text-sm text-muted">One click and your account is ready.</p>
            <div className="mt-6"><VerifyForm token={token} next={safeNext(sp.next)} /></div>
          </>
        ) : (
          <p className="mt-3 text-slate-700">This link has expired or was already used. <Link href="/sign-in" className="font-semibold text-brand-600">Sign in</Link> and ask for a new one from your dashboard.</p>
        )}
      </div>
    </AuthLayout>
  );
}
