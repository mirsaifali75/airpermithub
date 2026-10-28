"use client";

import { ArrowRight, Cloud, Cog, Container, Fan, Flame, Gauge, Search, Sigma, Wind, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { CalcCategory, CalcIcon } from "@/lib/calc/methods";

export interface CalcCard {
  slug: string;
  title: string;
  short: string;
  formula: string;
  categories: CalcCategory[];
  icon: CalcIcon;
}

const icons: Record<CalcIcon, LucideIcon> = {
  engine: Cog,
  combustion: Flame,
  flare: Flame,
  tank: Container,
  fugitive: Wind,
  factor: Sigma,
  vent: Fan,
  compressor: Gauge,
  pneumatic: Gauge,
  ghg: Cloud,
};

export function CalculatorGrid({ methods, categories }: { methods: CalcCard[]; categories: readonly CalcCategory[] }) {
  const [tab, setTab] = useState<CalcCategory | "All">("Popular");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return methods.filter((m) => (tab === "All" || m.categories.includes(tab)) && (!term || `${m.title} ${m.short}`.toLowerCase().includes(term)));
  }, [methods, tab, q]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Calculator categories" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {(["All", ...categories] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
              className={cn("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", tab === c ? "bg-brand-600 text-white shadow-card" : "text-slate-600 hover:bg-white hover:text-ink")}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search calculators</span>
          <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calculators" className="h-10 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-sm focus:border-brand-500 focus:outline-none" />
        </label>
      </div>

      <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3" role="tabpanel">
        {list.map((m) => {
          const Icon = icons[m.icon];
          return (
            <li key={m.slug}>
              <Link href={`/calculators/${m.slug}`} className="group flex h-full gap-4 rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                  <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold text-navy-900">{m.title}</span>
                  <span className="mt-1 text-sm text-muted">{m.short}</span>
                  <code className="mt-3 block truncate rounded-lg bg-canvas px-2.5 py-1.5 text-[0.7rem] text-navy-800">{m.formula}</code>
                  <span className="mt-3 flex flex-wrap gap-1">
                    {m.categories.filter((c) => c !== "Popular").map((c) => <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-600">{c}</span>)}
                  </span>
                </span>
                <ArrowRight className="mt-auto h-5 w-5 shrink-0 self-end text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="col-span-full rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No calculators match. Try another category.</li>}
      </ul>
    </div>
  );
}
