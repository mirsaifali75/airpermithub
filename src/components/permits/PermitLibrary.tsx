"use client";

import { FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DemoBadge, OriginBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Notices";
import { demoPermits, originLabel } from "@/lib/data/permits";
import type { DocumentOrigin } from "@/lib/data/types";

const fields = ["Company", "Facility", "Permit number", "State", "County", "Industry", "Equipment", "Pollutant", "Agency", "Keyword"];

export function PermitLibrary() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [origin, setOrigin] = useState<"" | DocumentOrigin>("");

  const results = useMemo(() => {
    const t = q.toLowerCase();
    return demoPermits.filter(
      (p) =>
        (!t || [p.facility, p.company, p.permitNumber, p.county, p.industry, p.agency, p.permitType, ...p.equipment].join(" ").toLowerCase().includes(t)) &&
        (!state || p.state === state) &&
        (!origin || p.origin === origin),
    );
  }, [q, state, origin]);

  const sel = "h-12 rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none";
  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_10rem_14rem]">
          <div className="relative">
            <label htmlFor="pq" className="sr-only">Search permits</label>
            <Search className="absolute top-3.5 left-3.5 h-5 w-5 text-brand-500" aria-hidden="true" />
            <input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company, facility, permit number, equipment..." className="h-12 w-full rounded-xl border border-line pr-3 pl-11 text-ink focus:border-brand-500 focus:outline-none" />
          </div>
          <label className="sr-only" htmlFor="ps">State</label>
          <select id="ps" className={sel} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option><option value="TX">Texas</option><option value="NM">New Mexico</option>
          </select>
          <label className="sr-only" htmlFor="po">Document type</label>
          <select id="po" className={sel} value={origin} onChange={(e) => setOrigin(e.target.value as DocumentOrigin | "")}>
            <option value="">All document types</option>
            {(Object.keys(originLabel) as DocumentOrigin[]).map((o) => <option key={o} value={o}>{originLabel[o]}</option>)}
          </select>
        </div>
        <p className="mt-3 text-xs text-muted">Searchable fields: {fields.join(" · ")}</p>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">{results.length} demo records</p>
      {results.length === 0 ? (
        <div className="mt-3"><EmptyState icon={<FileText className="h-6 w-6" />} title="No matching records">Try a different search.</EmptyState></div>
      ) : (
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {results.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink">{p.facility}</h3>
                  <p className="text-sm text-muted">{p.company}</p>
                </div>
                <div className="flex flex-wrap gap-1.5"><DemoBadge>Demo</DemoBadge><OriginBadge origin={p.origin} /></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                {[
                  ["Location", `${p.county}, ${p.state}`],
                  ["Permit type", p.permitType],
                  ["Permit number", p.permitNumber],
                  ["Agency", p.agency],
                  ["Issued", p.issueDate],
                  ["Expires", p.expirationDate ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">{p.equipment.join(", ")}</span>
                <span className="inline-flex items-center gap-1 text-slate-400"><FileText className="h-4 w-4" aria-hidden="true" /> Document (demo)</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
