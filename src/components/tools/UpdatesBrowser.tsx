"use client";

import { CalendarClock, ExternalLink, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { updateGroups, type FrDoc, type GroupKey } from "@/lib/fedreg";
import { field } from "./shared";

const DAY = 86400000;
const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
const nice = (s: string) => new Date(parseYmd(s)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Filters for the Federal Register list. "Today" is read on the client so comment deadlines stay current. */
export function UpdatesBrowser({ docs }: { docs: FrDoc[] }) {
  const uid = useId();
  const [group, setGroup] = useState<GroupKey | "">("");
  const [type, setType] = useState<"" | "Rule" | "Proposed Rule">("");
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => { const d = new Date(); d.setHours(0, 0, 0, 0); setToday(d.getTime()); }, []);

  const isOpen = (d: FrDoc) => !!(today !== null && d.type === "Proposed Rule" && d.commentsClose && parseYmd(d.commentsClose) >= today);
  const closing = useMemo(() => (today === null ? [] : docs.filter(isOpen).sort((a, b) => (a.commentsClose ?? "").localeCompare(b.commentsClose ?? "")).slice(0, 6)), [docs, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = docs.filter((d) => (!group || d.groups.includes(group)) && (!type || d.type === type) && (!openOnly || isOpen(d)) && terms.every((t) => `${d.title} ${d.abstract ?? ""} ${d.dockets.join(" ")}`.toLowerCase().includes(t)));
  const count = (k: GroupKey) => docs.filter((d) => d.groups.includes(k)).length;

  return (
    <div className="space-y-6">
      {closing.length > 0 && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-5" aria-labelledby={`${uid}-cl`}>
          <h2 id={`${uid}-cl`} className="flex items-center gap-2 font-bold text-amber-900"><CalendarClock className="h-5 w-5" aria-hidden="true" /> Comment periods closing soonest</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {closing.map((d) => {
              const days = Math.round((parseYmd(d.commentsClose!) - (today ?? 0)) / DAY);
              return (
                <li key={d.documentNumber} className="rounded-xl bg-white p-3 shadow-card">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-brand-700 hover:underline">{d.title}</a>
                  <p className="mt-1 text-xs font-semibold text-amber-800">Comments close {nice(d.commentsClose!)} · {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by program">
        <button type="button" aria-pressed={!group} onClick={() => setGroup("")} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset", !group ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-line hover:ring-brand-300")}>All <span className={cn("text-xs", !group ? "text-white" : "text-muted")}>{docs.length}</span></button>
        {updateGroups.map((g) => (
          <button key={g.key} type="button" aria-pressed={group === g.key} title={g.long} onClick={() => setGroup(group === g.key ? "" : g.key)} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset", group === g.key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-line hover:ring-brand-300")}>
            {g.label} <span className={cn("text-xs", group === g.key ? "text-white" : "text-muted")}>{count(g.key)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor={`${uid}-q`} className="sr-only">Search titles</label>
          <input id={`${uid}-q`} className={cn(field, "pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by state, subpart, or docket (e.g., Texas, OOOOb)" />
        </div>
        <label htmlFor={`${uid}-t`} className="sr-only">Document type</label>
        <select id={`${uid}-t`} className={field} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="">Final and proposed</option>
          <option value="Rule">Final rules</option>
          <option value="Proposed Rule">Proposed rules</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open for comment</label>
      </div>

      <p className="text-sm text-muted" aria-live="polite">{list.length} document{list.length === 1 ? "" : "s"}</p>
      <ul className="space-y-3">
        {list.map((d) => (
          <li key={d.documentNumber} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full px-2 py-0.5 font-semibold", d.type === "Rule" ? "bg-eco-50 text-eco-700" : "bg-brand-50 text-brand-700")}>{d.type === "Rule" ? "Final rule" : "Proposed rule"}</span>
              <span className="text-muted">Published {nice(d.published)}</span>
              {d.parts.map((p) => <span key={p} className="rounded-full bg-canvas px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-line ring-inset">40 CFR {p}</span>)}
            </div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-start gap-1.5 font-semibold text-navy-900 hover:text-brand-700 hover:underline">
              {d.title} <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
            {d.abstract && <p className="mt-1.5 line-clamp-3 text-sm text-slate-700">{d.abstract}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {d.effective && <span>Effective {nice(d.effective)}</span>}
              {d.commentsClose && <span className={cn(isOpen(d) && "font-semibold text-amber-800")}>Comments close {nice(d.commentsClose)}</span>}
              {d.dockets.length > 0 && <span>Docket {d.dockets.join(", ")}</span>}
              <span>FR Doc. {d.documentNumber}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
