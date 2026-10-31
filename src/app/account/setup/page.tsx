import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Finish setting up", robots: { index: false } };

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-navy-900">Welcome to AirPermitHub</h1>
        <p className="mt-2 text-sm text-muted">You&apos;re signed in as {s.user.email}. Tell us who you are to finish setting up.</p>
        <div className="mt-6"><ProfileForm name={s.user.name ?? ""} accountType={s.user.accountType} submitLabel="Continue to my dashboard" /></div>
      </div>
    </AuthLayout>
  );
}
