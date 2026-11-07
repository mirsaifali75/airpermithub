import type { Metadata } from "next";
import { CircleAlert, CircleCheck, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { GoogleMark } from "@/components/auth/GoogleButton";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { DeleteAccountForm, EmailChangeForm, PasswordForm, ResendVerificationForm } from "@/components/auth/SettingsForms";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { googleEnabled } from "@/lib/auth/config";
import { formatPhone } from "@/lib/auth/phone";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { connectGoogle, disconnectGoogle, signOutAction, signOutEverywhere } from "./actions";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

const googleNotes: Record<string, string> = {
  connected: "Google is connected. You can sign in with either.",
  disconnected: "Google is disconnected. Sign in with your email and password.",
  "need-password": "Add a password first, so you can still sign in without Google.",
  off: "Google sign-in isn't available yet.",
};

function Card({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 shadow-card ${danger ? "border-red-200" : "border-line"}`}>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ google?: string; twostep?: string; email?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/sign-in?next=/account");
  const sp = await searchParams;
  const [google, sessions, devices] = await Promise.all([
    prisma.account.findFirst({ where: { userId: s.user.id, provider: "google" } }),
    prisma.session.count({ where: { userId: s.user.id, expires: { gt: new Date() } } }),
    prisma.knownDevice.count({ where: { userId: s.user.id } }),
  ]);
  const u = s.user;
  const phone = u.phone ? formatPhone(u.phone) : null;
  const note = sp.google ? googleNotes[sp.google]
    : sp.twostep === "off" ? "Two-step login is off."
    : sp.email === "changed" ? `Your email is now ${u.email}. We let your old address know.`
    : sp.email === "added" ? `${u.email} is added and confirmed. You can sign in with it or your phone number.`
    : undefined;

  return (
    <>
      <PageHeader crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account settings" }]} eyebrow="Account" title="Account settings" icon={<UserRound className="h-7 w-7" />} description={`Signed in as ${u.email ?? phone}.`} />
      <div className="container-page space-y-6 py-10">
        {note && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{note}</p>}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card title="Profile">
              <ProfileForm name={u.name ?? ""} company={u.company ?? ""} accountType={u.accountType} submitLabel="Save profile" />
            </Card>
            {u.email ? <Card title="Email">
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <span className="font-semibold">{u.email}</span>
                {u.emailVerified
                  ? <Badge tone="green" icon={<CircleCheck className="h-3.5 w-3.5" />}>Confirmed</Badge>
                  : <Badge tone="amber" icon={<CircleAlert className="h-3.5 w-3.5" />}>Not confirmed</Badge>}
              </p>
              {!u.emailVerified && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted">Confirm your email to save work and turn on two-step login. Check your inbox for the link, or send a new one.</p>
                  <ResendVerificationForm />
                </div>
              )}
              <div className="mt-4">
                {u.hasPassword
                  ? <EmailChangeForm adding={false} twoStep={u.twoStep} />
                  : <p className="text-sm text-muted">To change your email, add a password first.</p>}
              </div>
            </Card> : null}
            {phone && (
              <Card title="Phone number">
                <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                  <span className="font-semibold">{phone}</span>
                  <Badge tone="green" icon={<CircleCheck className="h-3.5 w-3.5" />}>Confirmed</Badge>
                </p>
                {!u.email && <p className="mt-3 text-sm text-muted">You sign in with this number and your password. If you forget the password, we text a code to this number to reset it.</p>}
              </Card>
            )}
            {!u.email && (
              <Card title="Email">
                <p className="mb-4 text-sm text-muted">Add an email address to sign in with it, reset your password by email, and get security alerts when a new browser signs in.</p>
                <EmailChangeForm adding twoStep={u.twoStep} />
              </Card>
            )}
            <Card title={u.hasPassword ? "Password" : "Add a password"}>
              {!u.hasPassword && <p className="mb-4 text-sm text-muted">You sign in with Google. Add a password to sign in with your {u.email ? "email" : "phone number"} too.</p>}
              <PasswordForm hasPassword={u.hasPassword} />
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Two-step login">
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                {u.twoStep
                  ? <Badge tone="green" icon={<ShieldCheck className="h-3.5 w-3.5" />}>On</Badge>
                  : <Badge tone="gray">Off</Badge>}
                <span className="text-muted">{u.twoStep ? "Signing in needs a code from your authenticator app." : "Add a code from an authenticator app to every sign-in."}</span>
              </p>
              {u.platformRole !== "USER" && !u.twoStep && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">Admin and reviewer pages stay locked until two-step login is on.</p>}
              <Link href="/account/two-step" className={buttonClass("subtle", "md", "mt-4")}>{u.twoStep ? "Manage two-step login" : "Set up two-step login"}</Link>
            </Card>
            <Card title="Google">
              {google ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm text-ink"><GoogleMark /> Connected. You can sign in with Google.</p>
                  {u.hasPassword
                    ? <form action={disconnectGoogle}><Button type="submit" variant="subtle" size="sm">Disconnect Google</Button></form>
                    : <p className="text-sm text-muted">Add a password before disconnecting, so you can still sign in.</p>}
                </div>
              ) : googleEnabled() ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Connect your Google account to sign in with one click.</p>
                  <form action={connectGoogle}><Button type="submit" variant="subtle"><GoogleMark /> Connect Google</Button></form>
                </div>
              ) : (
                <p className="text-sm text-muted">Google sign-in isn&apos;t available yet.</p>
              )}
            </Card>
            <Card title="Devices and sign-out">
              <p className="text-sm text-muted">
                {sessions} active {sessions === 1 ? "session" : "sessions"} · {devices} {devices === 1 ? "browser" : "browsers"} seen.{u.email ? " We email you when a new browser signs in." : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={signOutAction}><Button type="submit" variant="subtle"><LogOut className="h-4 w-4" aria-hidden="true" /> Sign out</Button></form>
                <form action={signOutEverywhere}><Button type="submit" variant="subtle">Sign out of all devices</Button></form>
              </div>
            </Card>
            <Card title="Delete account" danger>
              {u.platformRole === "USER" ? (
                <>
                  <p className="mb-4 text-sm text-muted">Deletes your account and everything saved in it. This can&apos;t be undone.</p>
                  <DeleteAccountForm email={u.email} phone={phone ?? undefined} hasPassword={u.hasPassword} />
                </>
              ) : (
                <p className="text-sm text-muted">Editor, reviewer, and admin accounts are removed by an admin, because their reviews stay on record.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
