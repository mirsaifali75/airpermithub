import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const metadata: Metadata = { title: "Sign Up", robots: { index: false } };

export default function Page() {
  return (
    <AuthLayout>
      <AuthForm mode="sign-up" />
    </AuthLayout>
  );
}
