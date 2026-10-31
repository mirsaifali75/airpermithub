"use client";

import { Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useId, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { fmt, hapCsv, hapSummary, hapToSm, limitRow, statusLabel, type Comparison, type HapRow } from "@/lib/tools/synthetic-minor";
import { NumberField, csvFileName, downloadText, field, labelCls, useStoredState } from "./shared";

interface HapState { facility: string; oilGas: boolean; marginPct: number | null; rows: HapRow[]; demo?: boolean }

const newId = () => Math.random().toString(36).slice(2, 9);
const blankRow = (unit = "EU-1"): HapRow => ({ id: newId(), unit, description: "", hapName: "", cas: "", uncontrolled: null, control: null, controlEnforceable: true, basis: "" });
const blank = (): HapState => ({ facility: "", oilGas: false, marginPct: 10, rows: [blankRow()] });
const example = (): HapState => {
  const r = (p: Partial<HapRow>) => ({ ...blankRow(), ...p, basis: "Demo value" });
  return {
    demo: true, facility: "Example production site (demo data)", oilGas: true, marginPct: 10,
    rows: [
      r({ unit: "ENG-1", description: "Compressor engine", hapName: "Formaldehyde", cas: "50-00-0", uncontrolled: 4.2 }),
      r({ unit: "ENG-2", description: "Compressor engine", hapName: "Formaldehyde", cas: "50-00-0", uncontrolled: 4.2 }),
      r({ unit: "ENG-1", description: "Compressor engine", hapName: "Acetaldehyde", cas: "75-07-0", uncontrolled: 0.6 }),
      r({ unit: "DEHY-1", description: "Glycol dehydrator still vent", hapName: "Benzene", cas: "71-43-2", uncontrolled: 6, control: 95 }),
      r({ unit: "TK-1", description: "Condensate tanks", hapName: "Benzene", cas: "71-43-2", uncontrolled: 0.4 }),
      r({ unit: "TK-1", description: "Condensate tanks", hapName: "n-Hexane", cas: "110-54-3", uncontrolled: 3.1 }),
    ],
  };
};
const tone = (c: Comparison) => (c.status === "at-or-above" ? "red" : c.status === "near" ? "amber" : "green") as "red" | "amber" | "green";

export function HapTracker() {
  const uid = useId();
  const [s, setS] = useStoredState<HapState>("aph.tools.hap-tracker.v1", blank());
  const set = (p: Partial<HapState>) => setS({ ...s, ...p, demo: p.rows ? false : s.demo });
  const setRow = (id: string, p: Partial<HapRow>) => set({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const sum = useMemo(() => hapSummary(s.rows, s.marginPct, s.oilGas), [s.rows, s.marginPct, s.oilGas]);
  const lines = [...sum.haps.map((h) => ({ name: h.name, value: h.limited, c: h.comparison })), ...(sum.hapTotal ? [{ name: "All HAP combined", value: sum.hapTotal.limited, c: sum.hapTotal.comparisons[0] }] : [])];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. HAP potential to emit by unit</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank())}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative numbers, not a real facility or emission factors</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><label htmlFor={`${uid}-f`} className={labelCls}>Facility or surface site</label><input id={`${uid}-f`} className={field} value={s.facility} onChange={(e) => set({ facility: e.target.value })} /></div>
          <div><label htmlFor={`${uid}-m`} className={labelCls}>Design margin (%), your choice</label><NumberField id={`${uid}-m`} value={s.marginPct} onChange={(v) => set({ marginPct: v })} /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700"><input type="checkbox" checked={s.oilGas} onChange={(e) => set({ oilGas: e.target.checked })} /> Oil and gas production facility</label>
        </div>
        <div className="relative mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[60rem] text-sm">
            <caption className="sr-only">HAP emission units</caption>
            <thead className="bg-canvas text-left text-xs text-muted">
              <tr>
                {["Unit", "Description", "HAP (blank = unspeciated)", "CAS No.", "Uncontrolled PTE (tpy)", "Control (%)", "Enforceable", "PTE with enforceable controls", "Factor or method", ""].map((h) => <th key={h} scope="col" className="px-2 py-2 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.rows.map((r, i) => {
                const x = limitRow(hapToSm(r));
                const cell = "h-9 w-full rounded-md border border-line bg-white px-2 text-sm focus:border-brand-500 focus:outline-none";
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-2 py-1.5"><input aria-label={`Unit, row ${i + 1}`} className={cn(cell, "w-20")} value={r.unit} onChange={(e) => setRow(r.id, { unit: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input aria-label={`Description, row ${i + 1}`} className={cell} value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input aria-label={`HAP, row ${i + 1}`} className={cell} value={r.hapName} onChange={(e) => setRow(r.id, { hapName: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><input aria-label={`CAS number, row ${i + 1}`} className={cn(cell, "w-24")} value={r.cas} onChange={(e) => setRow(r.id, { cas: e.target.value })} /></td>
                    <td className="px-2 py-1.5"><NumberField ariaLabel={`Uncontrolled PTE, row ${i + 1}`} className={cn(cell, "w-24")} value={r.uncontrolled} onChange={(v) => setRow(r.id, { uncontrolled: v })} /></td>
                    <td className="px-2 py-1.5"><NumberField ariaLabel={`Control efficiency, row ${i + 1}`} className={cn(cell, "w-20")} value={r.control} onChange={(v) => setRow(r.id, { control: v })} /></td>
                    <td className="px-2 py-1.5 text-center"><input type="checkbox" aria-label={`Control enforceable, row ${i + 1}`} className="mt-2.5" checked={r.controlEnforceable} onChange={(e) => setRow(r.id, { controlEnforceable: e.target.checked })} /></td>
                    <td className="px-2 py-1.5">
                      <span className="block pt-2 font-semibold tabular-nums">{x.limited === null ? "—" : fmt(x.limited)}</span>
                      <span className="block font-mono text-[11px] text-muted">{x.limited === null ? "" : x.steps}</span>
                      {x.problems.map((p) => <span key={p} className="block text-[11px] text-amber-800">{p}</span>)}
                    </td>
                    <td className="px-2 py-1.5"><input aria-label={`Factor or method, row ${i + 1}`} className={cell} value={r.basis} onChange={(e) => setRow(r.id, { basis: e.target.value })} /></td>
                    <td className="px-2 py-1.5">{s.rows.length > 1 && <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => set({ rows: s.rows.filter((y) => y.id !== r.id) })} className="no-print mt-1 rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="no-print mt-3"><Button variant="subtle" size="sm" disabled={s.rows.length >= 150} onClick={() => set({ rows: [...s.rows, blankRow(s.rows.at(-1)?.unit)] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add row</Button></div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">2. Site totals against 40 CFR 63.2</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => downloadText(csvFileName("hap-major-source", s.facility), hapCsv(s.rows, s.marginPct, s.oilGas, s.facility))}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data: illustrative numbers, not a real facility or emission factors</Badge></p>}
        <p role="status" className={cn("mt-4 rounded-xl border p-4 text-sm font-semibold", sum.status === "major" ? "border-red-200 bg-red-50 text-red-800" : sum.status === "area" ? "border-eco-500/30 bg-eco-50 text-eco-700" : "border-line bg-canvas text-slate-700")}>
          {sum.status === "major" ? "At or above a HAP major source threshold" : sum.status === "area" ? "Below both HAP major source thresholds with the values entered" : "Enter HAP potential to emit to screen the site"}. Screening aid, not a determination.
        </p>
        {lines.length > 0 && (
          <ul className="mt-4 space-y-3">
            {lines.map((l) => {
              const pct = Math.min(100, (l.value / l.c.tpy) * 100);
              return (
                <li key={l.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink">{l.name}</span>
                    <span className="tabular-nums text-slate-700">{fmt(l.value)} of {fmt(l.c.tpy)} tpy · headroom {fmt(l.c.headroom)} tpy <Badge tone={tone(l.c)}>{statusLabel[l.c.status]}</Badge></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas" aria-hidden="true"><div className={cn("h-full rounded-full", l.c.status === "at-or-above" ? "bg-red-500" : l.c.status === "near" ? "bg-amber-500" : "bg-eco-500")} style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
        {sum.unspeciated.uncontrolled > 0 && <p className="mt-3 text-xs text-amber-800">{fmt(sum.unspeciated.limited)} tpy is unspeciated: it counts toward the combined total but cannot be checked against the single-HAP threshold.</p>}
        <p className="mt-3 text-xs text-muted">Each HAP is summed across every unit by name (case and spacing ignored) before it is compared with the single-HAP threshold. A total equal to a threshold counts as at or above it.{s.oilGas ? " For oil and gas production, the surface site is the unit of the major source determination; enter only the units at one surface site." : ""}</p>
      </section>
    </div>
  );
}
