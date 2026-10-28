"use client";

import { Bookmark, BookmarkCheck, MapPin, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, DemoBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Notices";
import { cn } from "@/lib/cn";
import { companyFor, demoJobs, jobCategories, roleGroups, type Job } from "@/lib/data/jobs";
import { CompanyLogo } from "./CompanyLogo";

const STORE = "aph.jobs.saved.v1";
const uniq = (list: Job[], k: keyof Job) => [...new Set(list.map((j) => String(j[k])))].sort();

export function JobBoard({ jobs: source = demoJobs, compact = false }: { jobs?: Job[]; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [group, setGroup] = useState("All Roles");
  const [more, setMore] = useState({ category: "", type: "", experience: "", industry: "", remote: false });
  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(STORE) ?? "[]")); } catch {}
  }, []);
  const toggleSave = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch {}
  };

  const states = uniq(source, "state");
  const jobs = useMemo(() => {
    const t = q.trim().toLowerCase();
    const g = roleGroups.find((r) => r.label === group);
    return source
      .filter(
        (j) =>
          (!t || `${j.title} ${j.company} ${j.category} ${j.industry}`.toLowerCase().includes(t)) &&
          (!loc || (loc === "remote" ? j.remote : j.state === loc)) &&
          (!g || g.categories.includes(j.category)) &&
          (!more.category || j.category === more.category) &&
          (!more.type || j.type === more.type) &&
          (!more.experience || j.experience === more.experience) &&
          (!more.industry || j.industry === more.industry) &&
          (!more.remote || j.remote) &&
          (!savedOnly || saved.includes(j.id)),
      )
      .sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }, [source, q, loc, group, more, savedOnly, saved]);

  const sel = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none";

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      {!compact && (
        <div className="border-b border-line p-4 sm:p-5">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-2 sm:grid-cols-[1fr_14rem_auto]">
            <label className="relative">
              <span className="sr-only">Job title, skill or company</span>
              <Search className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className="h-12 w-full rounded-xl border border-line pr-3 pl-10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
            </label>
            <label className="relative">
              <span className="sr-only">Location</span>
              <MapPin className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
              <select value={loc} onChange={(e) => setLoc(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-line bg-white pr-3 pl-10 focus:border-brand-500 focus:outline-none">
                <option value="">United States</option>
                <option value="remote">Remote</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button type="submit" className="h-12 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["All Roles", ...roleGroups.map((r) => r.label)].map((g) => (
              <button key={g} onClick={() => setGroup(g)} aria-pressed={group === g} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", group === g ? "border-brand-500 bg-brand-600 text-white" : "border-line text-slate-600 hover:border-brand-200")}>{g}</button>
            ))}
            <button onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> More filters
            </button>
            <button onClick={() => setSavedOnly((s) => !s)} aria-pressed={savedOnly} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", savedOnly ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-canvas")}>
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> Saved ({saved.length})
            </button>
          </div>
          {showMore && (
            <div className="mt-4 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2 lg:grid-cols-5">
              {([["category", "Category", [...jobCategories]], ["type", "Job type", uniq(source, "type")], ["experience", "Experience", uniq(source, "experience")], ["industry", "Industry", uniq(source, "industry")]] as const).map(([k, label, opts]) => (
                <label key={k} className="text-xs font-semibold text-muted">
                  {label}
                  <select className={cn(sel, "mt-1")} value={more[k]} onChange={(e) => setMore((m) => ({ ...m, [k]: e.target.value }))}>
                    <option value="">Any</option>
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
              ))}
              <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-ink">
                <input type="checkbox" checked={more.remote} onChange={(e) => setMore((m) => ({ ...m, remote: e.target.checked }))} className="h-4 w-4 accent-brand-500" /> Remote only
              </label>
            </div>
          )}
        </div>
      )}
      <p className="flex items-center justify-between px-5 pt-4 text-sm text-muted">
        <span>{jobs.length} {jobs.length === 1 ? "job" : "jobs"}</span>
        <DemoBadge>Sample listings</DemoBadge>
      </p>
      {jobs.length === 0 ? (
        <div className="p-5"><EmptyState title="No jobs match">Try clearing a filter or searching a broader title.</EmptyState></div>
      ) : (
        <ul className="divide-y divide-line">
          {jobs.map((j) => {
            const c = companyFor(j.company);
            return (
              <li key={j.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <CompanyLogo company={j.company} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{j.title}</p>
                  <p className="text-sm text-muted">
                    {c ? <Link href={`/jobs/companies/${c.slug}`} className="hover:text-brand-700 hover:underline">{j.company}</Link> : j.company} · {j.city}, {j.state}
                    {j.remote && " · Remote OK"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue">{j.type === "Full-time" ? "Full Time" : j.type}</Badge>
                    <Badge tone="gray">{j.experience}</Badge>
                    <span className="text-xs text-muted">{j.industry}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {j.postedDaysAgo <= 2 && <span className="rounded-md bg-eco-50 px-2 py-0.5 text-xs font-bold text-eco-700">New</span>}
                  <span className="hidden text-xs text-muted sm:block">{j.postedDaysAgo === 1 ? "1 day ago" : `${j.postedDaysAgo} days ago`}</span>
                </div>
                <button onClick={() => toggleSave(j.id)} aria-pressed={saved.includes(j.id)} aria-label={saved.includes(j.id) ? `Remove ${j.title} from saved` : `Save ${j.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-canvas hover:text-brand-600">
                  {saved.includes(j.id) ? <BookmarkCheck className="h-5 w-5 text-brand-600" /> : <Bookmark className="h-5 w-5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
