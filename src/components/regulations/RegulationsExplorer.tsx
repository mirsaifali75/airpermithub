"use client";

import { ArrowRight, BookOpen, CalendarClock, ExternalLink, FileText, Landmark, Layers, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export const explorerTabs = ["Federal", "State", "Programs", "Guidance", "Recent Updates"] as const;
export type ExplorerTab = (typeof explorerTabs)[number];

export interface ExplorerEntry {
  tab: ExplorerTab;
  title: string;
  citation?: string;
  description: string;
  href: string;
  external?: boolean;
  meta?: string;
  /** Extra searchable text that is not displayed. */
  keywords?: string;
}

const tabIcon = { Federal: FileText, State: Landmark, Programs: Layers, Guidance: BookOpen, "Recent Updates": CalendarClock } as const;
const PAGE = 25;

export function RegulationsExplorer({ entries }: { entries: ExplorerEntry[] }) {
  const [tab, setTab] = useState<ExplorerTab>("Federal");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    const match = explorerTabs.find((x) => x.toLowerCase().replace(/\s+/g, "-") === t);
    if (match) setTab(match);
  }, []);

  const term = q.trim().toLowerCase();
  const results = useMemo(
    () => entries.filter((e) => (term ? true : e.tab === tab) && (!term || `${e.title} ${e.citation ?? ""} ${e.description} ${e.keywords ?? ""}`.toLowerCase().includes(term))),
    [entries, tab, term],
  );
  const counts = useMemo(() => Object.fromEntries(explorerTabs.map((t) => [t, entries.filter((e) => e.tab === t).length])), [entries]);

  const select = (t: ExplorerTab) => {
    setTab(t);
    setQ("");
    setLimit(PAGE);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t.toLowerCase().replace(/\s+/g, "-"));
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <div className="border-b border-line p-4 sm:p-5">
        <div role="tablist" aria-label="Regulation categories" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {explorerTabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={!term && tab === t}
              onClick={() => select(t)}
              className={cn("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", !term && tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-canvas hover:text-ink")}
            >
              {t} <span className={cn("ml-1 text-xs", !term && tab === t ? "text-white" : "text-muted")}>{counts[t]}</span>
            </button>
          ))}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()} role="search">
          <label className="relative flex-1">
            <span className="sr-only">Search regulations</span>
            <Search className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search regulations, CFR, state rules, keywords..." className="h-12 w-full rounded-xl border border-line pr-3 pl-10 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
          </label>
          <button type="submit" className="h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">Search</button>
        </form>
        {term && <p className="mt-3 text-sm text-muted">{results.length} results across all categories for “{q}”.</p>}
      </div>

      <div role="tabpanel" aria-label={term ? "Search results" : tab}>
      <ul className="divide-y divide-line">
        {results.slice(0, limit).map((e) => {
          const Icon = tabIcon[e.tab];
          const inner = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 font-semibold text-navy-900">
                  {e.title}
                  {term && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-500">{e.tab}</span>}
                </span>
                {e.citation && <span className="block text-sm font-medium text-brand-600">{e.citation}</span>}
                <span className="mt-0.5 block text-sm text-muted">{e.description}</span>
              </span>
              {e.meta && <span className="hidden shrink-0 text-xs text-muted sm:block">{e.meta}</span>}
              {e.external ? <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
            </>
          );
          const cls = "group flex items-center gap-4 px-4 py-4 hover:bg-canvas/70 sm:px-5";
          return (
            <li key={`${e.tab}-${e.href}-${e.title}`}>
              {e.external ? <a href={e.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link href={e.href} className={cls}>{inner}</Link>}
            </li>
          );
        })}
        {results.length === 0 && <li className="px-5 py-12 text-center text-sm text-muted">Nothing matches “{q}”. Try a CFR part, a program name, or a state.</li>}
      </ul>
      </div>
      {results.length > limit && (
        <div className="border-t border-line p-4 text-center">
          <button onClick={() => setLimit((l) => l + PAGE * 2)} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Show more ({results.length - limit} remaining)</button>
        </div>
      )}
    </div>
  );
}
