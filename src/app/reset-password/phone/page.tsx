import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { KeyRound } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneResetForm } from "@/components/auth/CodeForms";
import { accountsEnabled } from "@/lib/auth/config";
import { maskPhone } from "@/lib/auth/phone";
import { PHONE_RESET_COOKIE } from "@/lib/auth/server";

export const metadata: Metadata = withSocial({ title: "Choose a new password", robots: { index: false } });

export default async function Page() {
  const phone = (await cookies()).get(PHONE_RESET_COOKIE)?.value ?? "";
  const ready = accountsEnabled && /^\+1\d{10}$/.test(phone);
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><KeyRound className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Choose a new password</h1>
        {ready ? (
          <>
            <p className="mt-3 text-slate-700">If {maskPhone(phone)} has an AirPermitHub account, we texted it a 6-digit code. It expires in 10 minutes.</p>
            <p className="mt-2 text-sm text-muted">Saving the new password signs you out on every device. Then sign in with it.</p>
            <div className="mt-6"><PhoneResetForm /></div>
            <p className="mt-6 text-sm text-muted">No text? <Link href="/forgot-password?method=phone" className="font-semibold text-brand-600">Ask for a new code</Link>.</p>
          </>
        ) : (
          <p className="mt-3 text-slate-700">This reset has expired. <Link href="/forgot-password?method=phone" className="font-semibold text-brand-600">Ask for a new code</Link>.</p>
        )}
      </div>
    </AuthLayout>
  );
}
