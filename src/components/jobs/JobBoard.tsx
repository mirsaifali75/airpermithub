"use client";

import { Briefcase, MapPin, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, DemoBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { demoJobs, jobCategories, type Job } from "@/lib/data/jobs";

type Filters = { q: string; category: string; state: string; type: string; experience: string; industry: string; remote: boolean };
const empty: Filters = { q: "", category: "", state: "", type: "", experience: "", industry: "", remote: false };
const uniq = (k: keyof Job) => [...new Set(demoJobs.map((j) => String(j[k])))].sort();

export function JobBoard() {
  const [f, setF] = useState<Filters>(empty);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const jobs = useMemo(() => {
    const q = f.q.toLowerCase();
    return demoJobs.filter(
      (j) =>
        (!q || `${j.title} ${j.company} ${j.city}`.toLowerCase().includes(q)) &&
        (!f.category || j.category === f.category) &&
        (!f.state || j.state === f.state) &&
        (!f.type || j.type === f.type) &&
        (!f.experience || j.experience === f.experience) &&
        (!f.industry || j.industry === f.industry) &&
        (!f.remote || j.remote),
    );
  }, [f]);

  const active = Object.entries(f).filter(([k, v]) => k !== "q" && v).length;
  const select = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none";

  const panel = (
    <div className="space-y-4">
      {([
        ["category", "Category", [...jobCategories]],
        ["state", "State", uniq("state")],
        ["type", "Job type", uniq("type")],
        ["experience", "Experience", uniq("experience")],
        ["industry", "Industry", uniq("industry")],
      ] as const).map(([key, label, opts]) => (
        <div key={key}>
          <label htmlFor={`f-${key}`} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
          <select id={`f-${key}`} className={select} value={f[key]} onChange={(e) => set(key, e.target.value)}>
            <option value="">Any</option>
            {opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
        <input type="checkbox" checked={f.remote} onChange={(e) => set("remote", e.target.checked)} className="h-4.5 w-4.5 accent-brand-500" /> Remote only
      </label>
      <p className="text-xs text-muted">Company and salary filters activate once real listings include them.</p>
      {active > 0 && <button onClick={() => setF({ ...empty, q: f.q })} className="text-sm font-semibold text-brand-600">Clear filters</button>}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden rounded-2xl border border-line bg-white p-5 shadow-card lg:block lg:self-start" aria-label="Job filters">{panel}</aside>

      <div className="min-w-0">
        <div className="flex gap-2">
          <label htmlFor="job-q" className="sr-only">Search jobs</label>
          <input id="job-q" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search title, company, or city" className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-ink focus:border-brand-500 focus:outline-none" />
          <button onClick={() => setOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold lg:hidden" aria-haspopup="dialog">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{active ? ` (${active})` : ""}
          </button>
        </div>
        <p className="mt-4 text-sm text-muted" aria-live="polite">{jobs.length} {jobs.length === 1 ? "listing" : "listings"}</p>

        {jobs.length === 0 ? (
          <div className="mt-4"><EmptyState icon={<Briefcase className="h-6 w-6" />} title="No matching jobs">Try removing a filter.</EmptyState></div>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-cyan-400"><Briefcase className="h-5 w-5" aria-hidden="true" /></span>
                    <div>
                      <h3 className="font-semibold text-ink">{j.title}</h3>
                      <p className="text-sm text-muted">{j.company}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{j.city}, {j.state}{j.remote && " · Remote"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted">{j.postedDaysAgo}d ago</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <DemoBadge>Demo</DemoBadge>
                  <Badge tone="blue">{j.category}</Badge>
                  <Badge tone="gray">{j.type}</Badge>
                  <Badge tone="gray">{j.experience}</Badge>
                  <Badge tone="gray">{j.industry}</Badge>
                  {j.remote && <Badge tone="green">Remote</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Job filters">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className={cn("absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-lg p-2 hover:bg-canvas"><X className="h-5 w-5" /></button>
            </div>
            {panel}
            <button onClick={() => setOpen(false)} className="mt-6 h-12 w-full rounded-xl bg-brand-500 font-semibold text-white">Show {jobs.length} listings</button>
          </div>
        </div>
      )}
    </div>
  );
}
