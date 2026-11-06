import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TwoStepForm } from "@/components/auth/CodeForms";

export const metadata: Metadata = { title: "Two-step login", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><ShieldCheck className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-6 text-3xl font-extrabold text-navy-900">Two-step login</h1>
        <p className="mt-2 text-sm text-muted">Your password was right. Enter the code your authenticator app shows for AirPermitHub.</p>
        <div className="mt-6">{c ? <TwoStepForm challenge={c} /> : <p className="text-sm text-muted">This page needs a sign-in first. <Link href="/sign-in" className="font-semibold text-brand-600">Sign in</Link></p>}</div>
      </div>
    </AuthLayout>
  );
}
