import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { accountsEnabled } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  return (
    <AuthLayout>
      <AuthForm mode="sign-in" enabled={accountsEnabled} error={error} next={callbackUrl} />
    </AuthLayout>
  );
}
