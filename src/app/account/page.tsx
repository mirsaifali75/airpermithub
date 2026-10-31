import type { Metadata } from "next";
import { LogOut, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/auth/session";
import { deleteAccount, signOutAction } from "./actions";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

const deleteNotes: Record<string, string> = {
  mismatch: "The email you typed didn't match this account, so nothing was deleted.",
  staff: "Editor, reviewer, and admin accounts are removed by an admin, because their reviews stay on record.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/sign-in?callbackUrl=/account");
  const note = deleteNotes[(await searchParams).delete ?? ""];
  return (
    <>
      <PageHeader crumbs={[{ label: "My Account" }]} eyebrow="Account" title="My Account" icon={<UserRound className="h-7 w-7" />} description={`Signed in as ${s.user.email}.`} />
      <div className="container-page grid gap-6 py-10 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">Profile</h2>
          <div className="mt-4"><ProfileForm name={s.user.name ?? ""} accountType={s.user.accountType} submitLabel="Save" /></div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Sign out</h2>
            <p className="mt-1 text-sm text-muted">Signs you out on this device.</p>
            <form action={signOutAction} className="mt-4"><Button type="submit" variant="subtle"><LogOut className="h-4 w-4" aria-hidden="true" /> Sign out</Button></form>
          </section>
          <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Delete account</h2>
            <p className="mt-1 text-sm text-muted">Deletes your account and everything stored with it. Tools keep working without an account. Type your email to confirm.</p>
            {note && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{note}</p>}
            <form action={deleteAccount} className="mt-4 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="confirm-email">Your email</label>
              <input id="confirm-email" name="confirm" type="email" autoComplete="off" placeholder={s.user.email} className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm" />
              <Button type="submit" variant="subtle" className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50">Delete account</Button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
