import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ClosedNotice } from "@/components/auth/ClosedNotice";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Logo } from "@/components/brand/Logo";
import { accountsEnabled, googleEnabled, safeNext } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { phoneEnabled } from "@/lib/auth/sms";

export const metadata: Metadata = withSocial({ title: "Sign Up", robots: { index: false } });

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; callbackUrl?: string; method?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next ?? sp.callbackUrl);
  if (await getSession()) redirect(next);
  const signInHref = `/sign-in${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <Logo tone="light" className="h-28" />
        <h1 className="mt-8 text-3xl font-extrabold text-navy-900">Create your free account</h1>
        <p className="mt-1 text-sm text-muted">Use every calculator and tool, and keep your work in one place.</p>
        {!accountsEnabled && <ClosedNotice />}
        {accountsEnabled && googleEnabled() && (
          <>
            <div className="mt-6"><GoogleButton next={next} label="Sign up with Google" /></div>
            <OrDivider />
          </>
        )}
        <div className={accountsEnabled && googleEnabled() ? "" : "mt-6"}><SignUpForm next={next} enabled={accountsEnabled} phone={accountsEnabled && phoneEnabled()} initialMethod={sp.method === "phone" ? "phone" : "email"} /></div>
        <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href={signInHref} className="font-semibold text-brand-600">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
