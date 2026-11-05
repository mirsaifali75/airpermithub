import type { Metadata } from "next";
import { MailWarning, PartyPopper, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResendVerificationForm } from "@/components/auth/SettingsForms";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { dashboardNav } from "@/components/dashboard/nav";
import { ToolDirectory } from "@/components/dashboard/ToolDirectory";
import { buttonClass } from "@/components/ui/Button";
import { accountsEnabled } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Dashboard", robots: { index: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const session = await getSession();
  if (accountsEnabled && !session) redirect("/sign-in?next=/dashboard");
  const verified = !!(await searchParams).verified;
  const first = session?.user.name?.split(/\s+/)[0];

  return (
    <div className="bg-canvas pt-32 lg:pt-40">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Dashboard" className="rounded-2xl border border-line bg-white p-2 shadow-card">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {dashboardNav.map(({ label, href, icon: Icon }, i) => (
                <li key={label} className="shrink-0">
                  <Link href={href} aria-current={i === 0 ? "page" : undefined} className={i === 0 ? "flex items-center gap-2.5 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white" : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-canvas"}>
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 hidden rounded-2xl bg-navy-900 p-4 text-white lg:block">
            {session ? (
              <>
                <p className="text-sm font-semibold">Signed in{session.user.name ? ` as ${session.user.name}` : ""}</p>
                <p className="mt-1 text-xs break-all text-white/70">{session.user.email}</p>
                <Link href="/account" className={buttonClass("primary", "sm", "mt-3 w-full")}>Account settings</Link>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Accounts are coming</p>
                <p className="mt-1 text-xs text-white/70">Keep projects, calculations, and deadlines with your account on any device.</p>
                <Link href="/sign-up" className={buttonClass("primary", "sm", "mt-3 w-full")}>Get Started</Link>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{first ? `Welcome back, ${first}` : "Welcome back"}</h1>
            <p className="mt-1 text-muted">Everything in AirPermitHub, in one place.</p>
          </div>

          {verified && session?.user.emailVerified && (
            <p role="status" className="flex items-center gap-2 rounded-2xl border border-eco-500/30 bg-eco-50 px-4 py-3 text-sm text-eco-700">
              <PartyPopper className="h-4.5 w-4.5" aria-hidden="true" /> Your email is confirmed and your account is ready.
            </p>
          )}
          {session && !session.user.emailVerified && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold"><MailWarning className="h-4.5 w-4.5" aria-hidden="true" /> Confirm your email address</p>
              <p className="mt-1">We sent a link to {session.user.email}. Confirm it to save work to your account and turn on two-step login.</p>
              <div className="mt-3"><ResendVerificationForm /></div>
            </section>
          )}
          {session?.user.emailVerified && !session.user.twoStep && (
            <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-700 shadow-card">
              <ShieldCheck className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" /> Protect your account with two-step login.
              <Link href="/account/two-step" className="font-semibold text-brand-600">Set it up</Link>
            </p>
          )}

          <ToolDirectory />
          <DashboardHome />
        </div>
      </div>
    </div>
  );
}
