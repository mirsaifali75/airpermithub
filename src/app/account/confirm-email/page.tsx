import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ConfirmEmailChangeForm } from "@/components/auth/SettingsForms";
import { accountsEnabled } from "@/lib/auth/config";
import { pendingEmailChange } from "@/lib/auth/flows";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Confirm your new email", robots: { index: false }, referrer: "no-referrer" };

/** Opening the link only shows a button, so mail scanners that open every link can't use it up. */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const email = accountsEnabled ? await pendingEmailChange(prisma, token) : null;
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Confirm your new email</h1>
        {email ? (
          <>
            <p className="mt-2 text-sm text-muted">Your account will use <span className="font-semibold text-ink">{email}</span> for sign-in and emails.</p>
            <div className="mt-6"><ConfirmEmailChangeForm token={token} /></div>
          </>
        ) : (
          <p className="mt-3 text-slate-700">This link has expired or was already used. <Link href="/account" className="font-semibold text-brand-600">Open your account settings</Link> to ask for a new one.</p>
        )}
      </div>
    </AuthLayout>
  );
}
