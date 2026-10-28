"use client";

import { ArrowRight, BookmarkCheck, Briefcase, Calculator, CalendarClock, FileStack, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ComplianceBadge, DemoBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { demoFacilities } from "@/lib/data/compliance";
import { demoJobs } from "@/lib/data/jobs";

interface Local {
  calcs: { id: string; sourceName: string; method: string; pollutant: string; tpy: number; savedAt?: string }[];
  tasks: { id: string; title: string; facility: string; category: string; date: string }[];
  jobs: string[];
}

const read = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; }
};


/**
 * Dashboard home. Until accounts launch, it reads what this browser has
 * saved (calculations, compliance tasks, bookmarked jobs) and shows demo
 * facilities, clearly labeled, to preview the facility workspace.
 */
export function DashboardHome() {
  const [d, setD] = useState<Local | null>(null);
  useEffect(() => {
    setD({ calcs: read("aph.calc.saved.v1", []), tasks: read("aph.compliance.tasks.v1", []), jobs: read("aph.jobs.saved.v1", []) });
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = (d?.tasks ?? []).filter((t) => new Date(t.date + "T00:00") >= today).sort((a, b) => a.date.localeCompare(b.date));

  const stats = [
    { label: "Projects", value: 0, icon: FolderKanban, note: "With accounts" },
    { label: "Saved jobs", value: d?.jobs.length ?? 0, icon: BookmarkCheck, href: "/jobs" },
    { label: "Upcoming deadlines", value: upcoming.length, icon: CalendarClock, href: "/compliance" },
    { label: "Calculations", value: d?.calcs.length ?? 0, icon: Calculator, href: "/calculators" },
    { label: "Applications", value: 0, icon: FileStack, note: "With accounts" },
  ];

  const activity = [
    ...(d?.calcs ?? []).map((c) => ({ id: c.id, text: `${c.method} calculation: ${c.sourceName} (${c.pollutant})`, when: c.savedAt ?? "", href: "/calculators" })),
    ...(d?.tasks ?? []).map((t) => ({ id: t.id, text: `Added deadline: ${t.title}`, when: new Date(Number(t.id.slice(1)) || 0).toISOString(), href: "/compliance" })),
    ...(d?.jobs ?? []).map((id) => ({ id, text: `Saved job: ${demoJobs.find((j) => j.id === id)?.title ?? id}`, when: "", href: "/jobs" })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 6);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Welcome back</h1>
        <p className="mt-1 text-muted">Manage your projects, tools and resources. Until accounts launch, this page shows what you have saved in this browser.</p>
      </div>

      <section aria-labelledby="qs">
        <h2 id="qs" className="mb-3 font-bold text-ink">Quick Stats</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map(({ label, value, icon: Icon, href, note }) => {
            const body = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="mt-3 block font-display text-3xl font-extrabold text-navy-900 tabular-nums">{d ? value : "–"}</span>
                <span className="block text-sm text-muted">{label}</span>
                {note && <span className="mt-1 block text-[0.7rem] text-muted">{note}</span>}
              </>
            );
            return (
              <li key={label}>
                {href ? <Link href={href} className="block h-full rounded-2xl border border-line bg-white p-4 shadow-card hover:border-brand-200">{body}</Link> : <div className="h-full rounded-2xl border border-line bg-white p-4 shadow-card">{body}</div>}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="ra">
          <h2 id="ra" className="font-bold text-ink">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing yet. Save a calculation, bookmark a job, or add a compliance deadline and it will show up here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id}><Link href={a.href} className="flex items-center justify-between gap-3 py-2.5 text-sm text-slate-700 hover:text-brand-700"><span className="min-w-0 truncate">{a.text}</span>{a.when && <span className="shrink-0 text-xs text-muted">{new Date(a.when).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="ud">
          <div className="flex items-center justify-between">
            <h2 id="ud" className="font-bold text-ink">Upcoming Deadlines</h2>
            <Link href="/compliance" className="text-sm font-semibold text-brand-600">Calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No deadlines saved. <Link href="/compliance" className="font-semibold text-brand-600">Add one in the Compliance Calendar</Link>.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {upcoming.slice(0, 5).map((t) => {
                const dt = new Date(t.date + "T00:00");
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1 text-brand-700">
                      <span className="text-[0.6rem] font-bold uppercase">{dt.toLocaleDateString(undefined, { month: "short" })}</span>
                      <span className="font-display text-base leading-none font-extrabold">{dt.getDate()}</span>
                    </span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{t.title}</span><span className="text-xs text-muted">{t.facility} · {t.category}</span></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section id="calculations" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink">Saved calculations</h2>
          <Link href="/calculators" className={cn("inline-flex items-center gap-1 text-sm font-semibold text-brand-600")}>New calculation <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {(d?.calcs.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted">Use “Add to calculation set” in any calculator; results are kept here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {d!.calcs.map((c) => <li key={c.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{c.sourceName} · {c.method} · {c.pollutant}</span><span className="tabular-nums text-muted">{c.tpy.toFixed(3)} tpy</span></li>)}
          </ul>
        )}
      </section>

      <section id="projects" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-3"><h2 className="font-bold text-ink">My Projects (facility workspace preview)</h2><DemoBadge /></div>
        <ul className="divide-y divide-line">
          {demoFacilities.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0"><span className="block truncate font-medium text-ink">{f.name}</span><span className="text-xs text-muted">{f.location} · {f.permitStatus} · {f.openTasks} open tasks</span></span>
              <ComplianceBadge status={f.status} />
            </li>
          ))}
        </ul>
      </section>
      <p className="flex items-center gap-2 text-xs text-muted"><Briefcase className="h-3.5 w-3.5" aria-hidden="true" />Data on this page stays in this browser. Accounts (coming soon) will sync it across devices and teams.</p>
    </div>
  );
}
