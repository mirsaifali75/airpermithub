import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LINK_MINUTES } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function Page() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Check your email</h1>
        <p className="mt-3 text-slate-700">We sent a sign-in link to the address you entered. Open it on this device to finish signing in.</p>
        <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>The link works once and expires in {LINK_MINUTES} minutes.</li>
          <li>It comes from sign-in@airpermithub.com. Check spam or quarantine if it hasn&apos;t arrived in a minute or two.</li>
        </ul>
        <p className="mt-6 text-sm text-muted">Wrong address? <Link href="/sign-in" className="font-semibold text-brand-600">Start again</Link></p>
      </div>
    </AuthLayout>
  );
}
