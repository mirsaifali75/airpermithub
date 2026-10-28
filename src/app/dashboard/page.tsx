import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { dashboardNav } from "@/components/dashboard/nav";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My Dashboard", robots: { index: false } };

export default function DashboardPage() {
  return (
    <div className="bg-canvas pt-16 lg:pt-[4.5rem]">
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
            <p className="text-sm font-semibold">Accounts are coming</p>
            <p className="mt-1 text-xs text-white/70">Sync projects, calculations and deadlines across devices and your team.</p>
            <Link href="/sign-up" className={buttonClass("primary", "sm", "mt-3 w-full")}>Get Started</Link>
          </div>
        </aside>
        <DashboardHome />
      </div>
    </div>
  );
}
