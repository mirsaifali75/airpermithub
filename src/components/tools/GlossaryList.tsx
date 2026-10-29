"use client";

import { ArrowRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { glossaryCategories, type GlossaryCategory, type GlossaryTerm } from "@/lib/data/glossary";
import { field } from "./shared";

/** Searchable glossary. Every term renders on the server; filtering only hides entries. */
export function GlossaryList({ terms }: { terms: GlossaryTerm[] }) {
  const uid = useId();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GlossaryCategory | "">("");
  const byslug = new Map(terms.map((t) => [t.slug, t]));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = terms.filter((t) => (!cat || t.category === cat) && words.every((w) => `${t.term} ${t.abbr ?? ""} ${t.definition}`.toLowerCase().includes(w)));
  const letters = [...new Set(shown.map((t) => t.term[0].toUpperCase()))];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor={`${uid}-q`} className="sr-only">Search terms</label>
          <input id={`${uid}-q`} className={cn(field, "h-11 pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, e.g. PTE, deviation, baseline" />
        </div>
        <label htmlFor={`${uid}-c`} className="sr-only">Category</label>
        <select id={`${uid}-c`} className={cn(field, "h-11")} value={cat} onChange={(e) => setCat(e.target.value as GlossaryCategory | "")}>
          <option value="">All categories</option>
          {glossaryCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
        {letters.map((l) => <a key={l} href={`#letter-${l}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-navy-900 ring-1 ring-line hover:bg-brand-50 hover:text-brand-700">{l}</a>)}
      </nav>
      <p className="text-sm text-muted" aria-live="polite">{shown.length} of {terms.length} terms</p>
      <div className="space-y-3">
        {shown.map((t, i) => {
          const first = i === 0 || shown[i - 1].term[0].toUpperCase() !== t.term[0].toUpperCase();
          return (
            <div key={t.slug} id={t.slug} className="scroll-mt-28 rounded-2xl target:ring-2 target:ring-brand-500">
              {first && <h2 id={`letter-${t.term[0].toUpperCase()}`} className="mt-6 mb-2 scroll-mt-28 text-sm font-bold tracking-widest text-muted">{t.term[0].toUpperCase()}</h2>}
              <dl className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <dt className="flex flex-wrap items-baseline gap-2">
                  <a href={`#${t.slug}`} className="text-lg font-bold text-navy-900 hover:text-brand-700">{t.term}</a>
                  {t.abbr && <span className="rounded-md bg-navy-900 px-1.5 py-0.5 text-xs font-bold text-white">{t.abbr}</span>}
                  <span className="text-xs font-semibold text-brand-600">{t.category}</span>
                </dt>
                <dd className="mt-2 text-[0.98rem] leading-relaxed text-slate-700">{t.definition}</dd>
                <dd className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                  <span className="text-xs font-semibold text-muted">Defined or governed by:</span>
                  {t.cites.map((c) => (
                    <a key={c.url + c.label} href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">{c.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
                  ))}
                </dd>
                {(t.related?.length || t.links?.length) ? (
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {t.links?.map((l) => <Link key={l.href + l.label} href={l.href} className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-brand-700">{l.label} <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>)}
                    {t.related?.map((r) => byslug.get(r)).filter((r) => !!r).map((r) => (
                      <a key={r.slug} href={`#${r.slug}`} onClick={() => { setQ(""); setCat(""); }} className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-line ring-inset hover:text-brand-700">{r.abbr ?? r.term}</a>
                    ))}
                  </dd>
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
