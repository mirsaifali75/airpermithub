import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ClosedNotice } from "@/components/auth/ClosedNotice";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { SignInForm } from "@/components/auth/SignInForm";
import { Logo } from "@/components/brand/Logo";
import { accountsEnabled, googleEnabled, safeNext } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { phoneEnabled } from "@/lib/auth/sms";

export const metadata: Metadata = withSocial({ title: "Sign In", robots: { index: false } });

/** Auth.js and our own redirects land here with one of these codes. */
const notices: Record<string, string> = {
  GoogleUnverified: "Google hasn't confirmed that email address, so it can't be used to sign in.",
  GoogleOff: "Google sign-in isn't available yet. Use your email and password.",
  AccessDenied: "That account can't sign in here.",
  OAuthAccountNotLinked: "That Google account is already connected to a different AirPermitHub account.",
  OAuthCallbackError: "Google sign-in was cancelled or didn't finish. Try again.",
  Configuration: "Sign-in is having trouble right now. Try again in a few minutes.",
};

type Search = Promise<{ next?: string; callbackUrl?: string; error?: string; reset?: string; verified?: string; expired?: string; method?: string; exists?: string }>;

export default async function Page({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const next = safeNext(sp.next ?? sp.callbackUrl);
  if (await getSession()) redirect(next);
  const error = sp.error ? notices[sp.error] ?? notices.Configuration : undefined;
  const notice = sp.reset ? "Your password is changed and every device was signed out. Sign in with the new password."
    : sp.verified ? "Your email is confirmed. Sign in to continue."
    : sp.expired ? "That sign-in step expired. Sign in again."
    : sp.exists ? "That number already has an AirPermitHub account, so we didn't make a new one. Sign in with it, or use Forgot password if you don't remember the password." : undefined;
  const signUpHref = `/sign-up${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <Logo tone="light" className="h-28" />
        <h1 className="mt-8 text-3xl font-extrabold text-navy-900">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to use the tools and pick up your saved work.</p>
        {!accountsEnabled && <ClosedNotice />}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        {accountsEnabled && googleEnabled() && (
          <>
            <div className="mt-6"><GoogleButton next={next} /></div>
            <OrDivider />
          </>
        )}
        <div className={accountsEnabled && googleEnabled() ? "" : "mt-6"}><SignInForm next={next} enabled={accountsEnabled} notice={notice} phone={accountsEnabled && phoneEnabled()} initialMethod={sp.method === "phone" ? "phone" : "email"} /></div>
        <p className="mt-6 text-center text-sm text-muted">New to AirPermitHub? <Link href={signUpHref} className="font-semibold text-brand-600">Create a free account</Link></p>
      </div>
    </AuthLayout>
  );
}
