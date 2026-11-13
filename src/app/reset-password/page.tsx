import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetForm } from "@/components/auth/CodeForms";
import { accountsEnabled } from "@/lib/auth/config";
import { peekAuthToken } from "@/lib/auth/flows";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = withSocial({ title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" });

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = accountsEnabled && !!(await peekAuthToken(prisma, token, "RESET_PASSWORD"));
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><KeyRound className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Choose a new password</h1>
        {valid ? (
          <>
            <p className="mt-2 text-sm text-muted">Saving it signs you out on every device. Then sign in with the new password.</p>
            <div className="mt-6"><ResetForm token={token} /></div>
          </>
        ) : (
          <p className="mt-3 text-slate-700">This reset link has expired or was already used. <Link href="/forgot-password" className="font-semibold text-brand-600">Ask for a new one</Link>.</p>
        )}
      </div>
    </AuthLayout>
  );
}
