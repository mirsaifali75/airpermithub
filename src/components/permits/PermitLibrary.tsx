"use client";

import { Download, ExternalLink, FileSpreadsheet, FileText, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, DemoBadge, OriginBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { DocumentOrigin } from "@/lib/data/types";

export const libraryTabs = ["Permits", "Templates", "Forms", "Checklists", "Applications", "Examples"] as const;
export type LibraryTab = (typeof libraryTabs)[number];

export interface LibraryItem {
  id: string;
  tab: LibraryTab;
  title: string;
  subtitle: string;
  tags: string[];
  state?: string;
  industry?: string;
  type?: string;
  href?: string;
  action: "download" | "external" | "none";
  kind: "demo" | "official" | "aph";
  origin?: DocumentOrigin;
}

const tabNote: Record<LibraryTab, string> = {
  Permits: "Fictional records that preview the upcoming permit database. Not real permits.",
  Templates: "AirPermitHub templates are our own working files (CSV). They are not government forms.",
  Forms: "Official forms pages from each state air agency, linked to the agency's own site.",
  Checklists: "AirPermitHub checklists (CSV). Pair them with the agency's own instructions.",
  Applications: "Official application and registration pages, linked to each state agency.",
  Examples: "Fictional example records showing how permits will be summarized. Not real permits.",
};

export function PermitLibrary({ items, states }: { items: LibraryItem[]; states: { code: string; name: string }[] }) {
  const [tab, setTab] = useState<LibraryTab>("Permits");
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [industry, setIndustry] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    const match = libraryTabs.find((x) => x.toLowerCase() === t);
    if (match) setTab(match);
  }, []);

  const inTab = useMemo(() => items.filter((i) => i.tab === tab), [items, tab]);
  const industries = useMemo(() => [...new Set(inTab.map((i) => i.industry).filter(Boolean))].sort() as string[], [inTab]);
  const types = useMemo(() => [...new Set(inTab.map((i) => i.type).filter(Boolean))].sort() as string[], [inTab]);
  const stateCodes = useMemo(() => new Set(inTab.map((i) => i.state).filter(Boolean)), [inTab]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return inTab.filter(
      (i) =>
        (!t || `${i.title} ${i.subtitle} ${i.tags.join(" ")}`.toLowerCase().includes(t)) &&
        (!state || i.state === state) &&
        (!industry || i.industry === industry) &&
        (!type || i.type === type),
    );
  }, [inTab, q, state, industry, type]);

  const select = (t: LibraryTab) => {
    setTab(t);
    setState("");
    setIndustry("");
    setType("");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t.toLowerCase());
    window.history.replaceState(null, "", url);
  };

  const sel = "h-10 rounded-lg border border-line bg-white px-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none disabled:opacity-50";

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <div className="border-b border-line p-4 sm:p-5">
        <div role="tablist" aria-label="Library sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {libraryTabs.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => select(t)} className={cn("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold", tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-canvas hover:text-ink")}>
              {t} <span className={cn("ml-0.5 text-xs", tab === t ? "text-white" : "text-muted")}>{items.filter((i) => i.tab === t).length}</span>
            </button>
          ))}
        </div>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search the library</span>
            <Search className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search permits, industries, states..." className="h-12 w-full rounded-xl border border-line pr-3 pl-10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
          </label>
          <button type="submit" className="h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={industries.length === 0} className={sel}>
            <option value="">All industries</option>
            {industries.map((i) => <option key={i}>{i}</option>)}
          </select>
          <select aria-label="State" value={state} onChange={(e) => setState(e.target.value)} disabled={stateCodes.size === 0} className={sel}>
            <option value="">All states</option>
            {states.filter((s) => stateCodes.has(s.code)).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} disabled={types.length === 0} className={sel}>
            <option value="">All types</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          {tab === "Permits" || tab === "Examples" ? <DemoBadge>Demo</DemoBadge> : tab === "Forms" || tab === "Applications" ? <Badge tone="green" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Official source</Badge> : <Badge tone="navy">AirPermitHub Template</Badge>}
          {tabNote[tab]}
        </p>
      </div>

      <ul className="divide-y divide-line">
        {results.slice(0, 60).map((i) => {
          const Icon = i.kind === "aph" ? FileSpreadsheet : FileText;
          return (
            <li key={i.id} className="flex items-center gap-4 px-4 py-4 sm:px-5" {...(i.kind === "demo" ? { "data-nosnippet": true } : {})}>
              <span className={cn("flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-[0.55rem] font-bold", i.kind === "demo" ? "bg-red-50 text-red-700" : i.kind === "aph" ? "bg-eco-50 text-eco-700" : "bg-brand-50 text-brand-600")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {i.kind === "demo" ? "PDF" : i.kind === "aph" ? "CSV" : "WEB"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900">{i.title}</p>
                <p className="truncate text-sm text-muted">{i.subtitle}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {i.kind === "demo" && <DemoBadge>Demo</DemoBadge>}
                  {i.origin && <OriginBadge origin={i.origin} />}
                  {i.tags.map((t) => <span key={t} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[0.7rem] font-semibold text-brand-700">{t}</span>)}
                </div>
              </div>
              {i.action === "download" && i.href && (
                <a href={i.href} download className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Download ${i.title} (CSV)`}><Download className="h-5 w-5" aria-hidden="true" /></a>
              )}
              {i.action === "external" && i.href && (
                <a href={i.href} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Open ${i.title} on the agency site`}><ExternalLink className="h-5 w-5" aria-hidden="true" /></a>
              )}
              {i.action === "none" && <span className="hidden shrink-0 text-xs text-muted sm:block">Preview only</span>}
            </li>
          );
        })}
        {results.length === 0 && <li className="px-5 py-12 text-center text-sm text-muted">No documents match these filters.</li>}
      </ul>
      {results.length > 60 && <p className="border-t border-line px-5 py-3 text-sm text-muted">Showing 60 of {results.length}. Narrow by state or search to see more.</p>}
    </div>
  );
}
