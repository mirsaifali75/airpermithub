"use client";

import { Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useId, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { invCsv, invPollutants, invRow, invSummary, type InvPollutant, type InvRow } from "@/lib/tools/inventory";
import { NumberField, csvFileName, downloadText, field, labelCls, useStoredState } from "./shared";

interface InvState { facility: string; year: string; rows: InvRow[]; demo?: boolean }
const newId = () => Math.random().toString(36).slice(2, 9);
const blankRow = (unit = "EU-1"): InvRow => ({ id: newId(), unit, description: "", pollutant: "NOx", name: "", activity: null, activityUnits: "", factor: null, factorSource: "", control: null, controlApplies: true, otherTpy: null, method: "" });
const blank = (): InvState => ({ facility: "", year: String(new Date().getFullYear() - 1), rows: [blankRow()] });
const example = (): InvState => {
  const r = (p: Partial<InvRow>) => ({ ...blankRow(), factorSource: "Demo value, not a published factor", ...p });
  return {
    demo: true, facility: "Example facility (demo data)", year: "2025",
    rows: [
      r({ unit: "H-1", description: "Process heater", pollutant: "NOx", activity: 300, activityUnits: "MMscf", factor: 100 }),
      r({ unit: "H-1", description: "Process heater", pollutant: "CO", activity: 300, activityUnits: "MMscf", factor: 84 }),
      r({ unit: "ENG-1", description: "Compressor engine", pollutant: "NOx", otherTpy: 18.2, method: "CEMS annual total", factorSource: "" }),
      r({ unit: "TK-1", description: "Condensate tanks", pollutant: "VOC", activity: 40000, activityUnits: "bbl", factor: 1.5, control: 95 }),
      r({ unit: "ENG-1", description: "Compressor engine", pollutant: "HAP", name: "Formaldehyde", otherTpy: 1.1, method: "Stack test rate × hours", factorSource: "" }),
    ],
  };
};

export function EmissionInventory() {
  const uid = useId();
  const [s, setS] = useStoredState<InvState>("aph.tools.inventory.v1", blank());
  const set = (p: Partial<InvState>) => setS({ ...s, ...p, demo: p.rows ? false : s.demo });
  const setRow = (id: string, p: Partial<InvRow>) => set({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const sum = useMemo(() => invSummary(s.rows), [s.rows]);
  const f4 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. Activity, factors, and controls</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank())}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative numbers, not a real facility or published emission factors</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2"><label htmlFor={`${uid}-f`} className={labelCls}>Facility</label><input id={`${uid}-f`} className={field} value={s.facility} onChange={(e) => set({ facility: e.target.value })} /></div>
          <div><label htmlFor={`${uid}-y`} className={labelCls}>Inventory year</label><input id={`${uid}-y`} className={field} value={s.year} onChange={(e) => set({ year: e.target.value })} /></div>
        </div>
        <ul className="mt-4 space-y-3">
          {s.rows.map((r, i) => {
            const x = invRow(r);
            const rid = `${uid}-r${r.id}`;
            return (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div><label htmlFor={`${rid}-u`} className={labelCls}>Unit ID</label><input id={`${rid}-u`} className={field} value={r.unit} onChange={(e) => setRow(r.id, { unit: e.target.value })} /></div>
                  <div className="lg:col-span-2"><label htmlFor={`${rid}-d`} className={labelCls}>Description</label><input id={`${rid}-d`} className={field} value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} /></div>
                  <div><label htmlFor={`${rid}-p`} className={labelCls}>Pollutant</label><select id={`${rid}-p`} className={field} value={r.pollutant} onChange={(e) => setRow(r.id, { pollutant: e.target.value as InvPollutant })}>{invPollutants.map((p) => <option key={p}>{p}</option>)}</select></div>
                  {(r.pollutant === "HAP" || r.pollutant === "Other") && <div className="lg:col-span-2"><label htmlFor={`${rid}-n`} className={labelCls}>{r.pollutant === "HAP" ? "HAP name (blank = unspeciated)" : "Pollutant name"}</label><input id={`${rid}-n`} className={field} value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })} /></div>}
                  <div><label htmlFor={`${rid}-a`} className={labelCls}>Annual activity</label><NumberField id={`${rid}-a`} value={r.activity} onChange={(v) => setRow(r.id, { activity: v })} /></div>
                  <div><label htmlFor={`${rid}-au`} className={labelCls}>Activity units</label><input id={`${rid}-au`} className={field} placeholder="MMscf, bbl, hr" value={r.activityUnits} onChange={(e) => setRow(r.id, { activityUnits: e.target.value })} /></div>
                  <div><label htmlFor={`${rid}-ef`} className={labelCls}>Factor (lb per activity unit)</label><NumberField id={`${rid}-ef`} value={r.factor} onChange={(v) => setRow(r.id, { factor: v })} /></div>
                  <div className="lg:col-span-2"><label htmlFor={`${rid}-src`} className={labelCls}>Factor source and citation</label><input id={`${rid}-src`} className={field} value={r.factorSource} onChange={(e) => setRow(r.id, { factorSource: e.target.value })} /></div>
                  <div><label htmlFor={`${rid}-c`} className={labelCls}>Control (%)</label><NumberField id={`${rid}-c`} value={r.control} onChange={(v) => setRow(r.id, { control: v })} /></div>
                  <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-700"><input type="checkbox" checked={r.controlApplies} onChange={(e) => setRow(r.id, { controlApplies: e.target.checked })} /> Control operated as assumed</label>
                  <div><label htmlFor={`${rid}-o`} className={labelCls}>Or: value from another method (tpy)</label><NumberField id={`${rid}-o`} value={r.otherTpy} onChange={(v) => setRow(r.id, { otherTpy: v })} /></div>
                  <div className="lg:col-span-2"><label htmlFor={`${rid}-m`} className={labelCls}>Method (CEMS, stack test, mass balance)</label><input id={`${rid}-m`} className={field} value={r.method} onChange={(e) => setRow(r.id, { method: e.target.value })} /></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                  <p className="text-sm text-slate-800"><span className="font-semibold">Actual emissions: </span><span className="font-mono text-xs sm:text-sm">{x.steps}</span></p>
                  {s.rows.length > 1 && <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => set({ rows: s.rows.filter((y) => y.id !== r.id) })} className="no-print rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
                </div>
                {x.problems.map((p) => <p key={p} className="mt-1 text-xs text-amber-800">• {p}</p>)}
              </li>
            );
          })}
        </ul>
        <div className="no-print mt-3"><Button variant="subtle" size="sm" disabled={s.rows.length >= 300} onClick={() => set({ rows: [...s.rows, blankRow(s.rows.at(-1)?.unit)] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add row</Button></div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">2. Facility totals{s.year ? `, ${s.year}` : ""}</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => downloadText(csvFileName("emission-inventory", s.facility, s.year), invCsv(s.rows, s.facility, s.year))}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data</Badge></p>}
        {sum.totals.length === 0 ? <p className="mt-3 text-sm text-slate-700">Totals appear when a row has a result.</p> : (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <table className="w-full text-sm">
              <caption className="sr-only">Totals by pollutant</caption>
              <thead className="text-left text-xs text-muted"><tr><th scope="col" className="py-1.5">Pollutant</th><th scope="col" className="py-1.5 text-right">Actual (tpy)</th><th scope="col" className="py-1.5 text-right">Rows</th></tr></thead>
              <tbody className="divide-y divide-line">{sum.totals.map((t) => <tr key={t.label}><th scope="row" className="py-1.5 text-left font-semibold text-ink">{t.label}</th><td className="py-1.5 text-right tabular-nums">{f4(t.tpy)}</td><td className="py-1.5 text-right text-muted">{t.rows}</td></tr>)}</tbody>
            </table>
            {sum.haps.length > 0 && (
              <table className="w-full text-sm">
                <caption className="sr-only">HAP by name</caption>
                <thead className="text-left text-xs text-muted"><tr><th scope="col" className="py-1.5">HAP</th><th scope="col" className="py-1.5 text-right">Actual (tpy)</th></tr></thead>
                <tbody className="divide-y divide-line">{sum.haps.map((h) => <tr key={h.label}><th scope="row" className="py-1.5 text-left font-medium text-ink">{h.label}</th><td className="py-1.5 text-right tabular-nums">{f4(h.tpy)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}
        {sum.incomplete > 0 && <p className={cn("mt-3 text-xs text-amber-800")}>{sum.incomplete} row{sum.incomplete > 1 ? "s have" : " has"} no result yet and are not in the totals.</p>}
        <p className="mt-3 text-xs text-muted">Totals are actual emissions for the year you entered. States set their own inventory pollutants, thresholds, methods, and forms; submit through your agency&apos;s system.</p>
      </section>
    </div>
  );
}
