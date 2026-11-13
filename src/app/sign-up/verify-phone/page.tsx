import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { MessageSquareText } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneSignupCodeForm, ResendSignupCodeForm } from "@/components/auth/CodeForms";
import { accountsEnabled } from "@/lib/auth/config";
import { pendingPhoneSignup } from "@/lib/auth/flows";
import { maskPhone } from "@/lib/auth/phone";
import { PHONE_SIGNUP_COOKIE } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = withSocial({ title: "Enter your code", robots: { index: false } });

export default async function Page() {
  const token = (await cookies()).get(PHONE_SIGNUP_COOKIE)?.value ?? "";
  const pending = accountsEnabled ? await pendingPhoneSignup(prisma, token) : null;
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MessageSquareText className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Enter your code</h1>
        {pending ? (
          <>
            <p className="mt-3 text-slate-700">We texted a 6-digit code to {maskPhone(pending.phone)}. Enter it to confirm your number and create your account.</p>
            <div className="mt-6"><PhoneSignupCodeForm /></div>
            <div className="mt-6 space-y-2 text-sm text-muted">
              <p>The code expires in 10 minutes. No text after a minute or two?</p>
              <ResendSignupCodeForm />
              <p><Link href="/sign-up?method=phone" className="font-semibold text-brand-600">Use a different number</Link></p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-slate-700">This sign-up has expired or was already finished. <Link href="/sign-up?method=phone" className="font-semibold text-brand-600">Start again</Link>, or <Link href="/sign-in?method=phone" className="font-semibold text-brand-600">sign in</Link>.</p>
        )}
      </div>
    </AuthLayout>
  );
}
