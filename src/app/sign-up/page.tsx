import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign Up", robots: { index: false } };

export default function Page() {
  return (
    <div className="relative min-h-[80vh] bg-navy-900 px-4 pt-28 pb-16">
      <div aria-hidden="true" className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="relative"><AuthForm mode="sign-up" /></div>
    </div>
  );
}
