"use client";

import { ArrowDown, ClipboardPaste, Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { addMonths, isMonth, monthFromIndex, monthIndex, monthName, parsePastedTable, thisMonth } from "@/lib/tools/months";
import { baselineWindows, bestBaseline, projectIncrease, type ProjectUnit } from "@/lib/tools/nsr";
import { NumberField, downloadText, field, labelCls, toCsv, useStoredState } from "./shared";

type Lookback = "other" | "egu" | "custom";
interface DataUnit { name: string; monthly: (number | null)[] }
interface NsrState {
  pollutant: string;
  projectMonth: string;
  lookback: Lookback;
  customYears: number | null;
  window: number;
  dataStart: string;
  months: number;
  units: DataUnit[];
  project: ProjectUnit[];
  significance: number | null;
  countDecreases: boolean;
  /** The example is loaded; cleared by Clear or a paste. */
  demo?: boolean;
}

const blank = (dataStart = ""): NsrState => ({
  pollutant: "", projectMonth: "", lookback: "other", customYears: 10, window: 24, dataStart, months: 36,
  units: [{ name: "EU-1", monthly: Array(36).fill(null) }], project: [], significance: null, countDecreases: false,
});

// Illustrative numbers only: three units, five years of monthly tons with a seasonal swing.
const example = (): NsrState => {
  const months = 60;
  const start = addMonths(thisMonth(), -months - 2);
  const series = (base: number, swing: number, trend: number) => Array.from({ length: months }, (_, i) => Math.round((base + swing * Math.sin((i / 12) * 2 * Math.PI) + trend * (i - 30) ** 2 / 900) * 100) / 100);
  const units: DataUnit[] = [{ name: "Heater H-1", monthly: series(1.6, 0.25, 0.4) }, { name: "Engine E-2", monthly: series(2.4, 0.4, -0.3) }, { name: "Turbine T-3", monthly: series(3.1, 0.3, 0.2) }];
  units[1].monthly[17] = null; // a month without adequate data
  return {
    pollutant: "Example: NOx", projectMonth: addMonths(start, months + 1), lookback: "other", customYears: 10, window: 24, dataStart: start, months, units,
    project: [
      { name: "Heater H-1", kind: "existing", baseline: 0, projected: 24, usesPte: false, excluded: 1.5 },
      { name: "Engine E-2", kind: "existing", baseline: 0, projected: 30, usesPte: false, excluded: 0 },
      { name: "Turbine T-3", kind: "existing", baseline: 0, projected: 36, usesPte: false, excluded: 0 },
      { name: "New heater H-4", kind: "new", baseline: 0, projected: 6, usesPte: false, excluded: 0 },
    ],
    significance: null, countDecreases: false, demo: true,
  };
};

const n = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d }));
const lookbackYears = (s: NsrState) => (s.lookback === "egu" ? 5 : s.lookback === "other" ? 10 : Math.max(1, s.customYears ?? 10));

/** NSR baseline actual emissions finder and Step 1 project emissions test. Data stays in this browser. */
export function NsrBaseline() {
  const uid = useId();
  const [s, setS] = useStoredState<NsrState>("aph.tools.nsr.v1", blank());
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<NsrState>) => setS((p) => ({ ...p, ...patch }));
  useEffect(() => { setS((p) => (p.dataStart ? p : { ...p, dataStart: addMonths(thisMonth(), -37) })); }, [setS]);

  const startIdx = isMonth(s.dataStart) ? monthIndex(s.dataStart) : 0;
  const projIdx = isMonth(s.projectMonth) ? monthIndex(s.projectMonth) : null;
  const years = lookbackYears(s);
  const win = Math.max(1, Math.round(s.window || 24));
  const firstEligible = projIdx === null ? -Infinity : projIdx - years * 12;
  const lastEligible = projIdx === null ? Infinity : projIdx - 1;
  const label = (idx: number) => (isMonth(s.dataStart) ? monthName(monthFromIndex(idx)) : `Month ${idx - startIdx + 1}`);

  const windows = useMemo(
    () => baselineWindows(s.units.map((u) => u.monthly.slice(0, s.months)), { window: win, dataStart: startIdx, firstEligible, lastEligible }),
    [s.units, s.months, win, startIdx, firstEligible, lastEligible],
  );
  const best = bestBaseline(windows);
  const ranked = [...windows].sort((a, b) => b.total - a.total || b.start - a.start).slice(0, 5);
  const possible = Math.max(0, s.months - win + 1);
  const result = projectIncrease(s.project, s.significance, s.countDecreases);

  const setMonths = (m: number) => {
    const months = Math.max(win, Math.min(180, Math.round(m)));
    set({ months, units: s.units.map((u) => ({ ...u, monthly: Array.from({ length: months }, (_, i) => u.monthly[i] ?? null) })) });
  };
  const usePaste = () => {
    const rows = parsePastedTable(paste);
    if (!rows.length) { setMsg("No numbers found. Paste rows of months with one column per unit."); return; }
    const cols = Math.max(...rows.map((r) => r.length));
    const units = Array.from({ length: Math.min(8, cols) }, (_, c) => ({ name: s.units[c]?.name ?? `EU-${c + 1}`, monthly: rows.map((r) => r[c] ?? null) }));
    set({ units, months: rows.length, demo: false });
    setMsg(`Loaded ${rows.length} months for ${units.length} unit${units.length > 1 ? "s" : ""}. Rename the units below if needed.`);
    setPaste("");
  };
  const useBaselines = () => {
    if (!best) return;
    const existing = s.units.map((u, i) => {
      const prev = s.project.find((p) => p.name === u.name);
      return { name: u.name, kind: "existing" as const, baseline: Math.round(best.perUnit[i] * 1000) / 1000, projected: prev?.projected ?? 0, usesPte: prev?.usesPte ?? false, excluded: prev?.excluded ?? 0 };
    });
    const extra = s.project.filter((p) => !s.units.some((u) => u.name === p.name));
    set({ project: [...existing, ...extra] });
  };
  const exportCsv = () => {
    const meta = [
      ...(s.demo ? [["DEMO DATA: illustrative numbers, not a real facility"]] : []),
      ["Worksheet only. Not an applicability determination; the reviewing agency decides what counts toward baseline and projected emissions."],
      ["Pollutant", s.pollutant], ["Project date (earlier of construction or complete application)", s.projectMonth], ["Lookback (years)", years], ["Averaging window (months)", win], []];
    const data = [["Month", ...s.units.map((u) => `${u.name} (tons)`)], ...Array.from({ length: s.months }, (_, i) => [monthFromIndex(startIdx + i), ...s.units.map((u) => u.monthly[i] ?? "")]), []];
    const base = best ? [["Highest eligible window", `${monthFromIndex(best.start)} to ${monthFromIndex(best.start + win - 1)}`], ...s.units.map((u, i) => [`${u.name} baseline (tpy)`, best.perUnit[i]]), ["Total (tpy)", best.total], []] : [["No eligible window"], []];
    const proj = [["Unit", "Type", "Baseline (tpy)", "Projected or PTE (tpy)", "Uses PTE", "Excluded (tpy)", "Increase (tpy)"], ...s.project.map((p, i) => [p.name, p.kind, p.kind === "new" ? 0 : p.baseline, p.projected, p.usesPte ? "yes" : "", p.excluded, result.perUnit[i].increase]), ["Sum", "", "", "", "", "", result.total], ["Significance value entered (tpy)", s.significance ?? ""], ["Decreases counted", s.countDecreases ? "yes" : "no"]];
    downloadText(`nsr-baseline-${(s.pollutant || "pollutant").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, toCsv("NSR Baseline and Project Emissions Worksheet", [...meta, ...data, ...base, ...proj]));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. Project and lookback</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank(addMonths(thisMonth(), -37)))}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative numbers, not a real facility</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-pol`} className={labelCls}>Regulated NSR pollutant</label>
            <input id={`${uid}-pol`} className={field} value={s.pollutant} onChange={(e) => set({ pollutant: e.target.value })} placeholder="e.g., NOx" />
          </div>
          <div>
            <label htmlFor={`${uid}-pm`} className={labelCls}>Project date (earlier of construction start or complete application)</label>
            <input id={`${uid}-pm`} type="month" className={field} value={s.projectMonth} onChange={(e) => set({ projectMonth: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${uid}-w`} className={labelCls}>Averaging window (consecutive months)</label>
            <NumberField id={`${uid}-w`} value={s.window} onChange={(v) => set({ window: v && v > 0 ? Math.round(v) : 24 })} />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className={labelCls}>Lookback period</legend>
          <div className="mt-1 grid gap-2 md:grid-cols-3">
            {([
              ["other", "Existing units other than electric utility steam generating units", "10 years"],
              ["egu", "Electric utility steam generating units", "5 years"],
              ["custom", "Custom (state rule differs)", `${s.customYears ?? 10} years`],
            ] as const).map(([k, l, yrs]) => (
              <label key={k} className={cn("flex cursor-pointer gap-2 rounded-xl border p-3 text-sm", s.lookback === k ? "border-brand-500 bg-brand-50" : "border-line")}>
                <input type="radio" name={`${uid}-lb`} checked={s.lookback === k} onChange={() => set({ lookback: k })} className="mt-1" />
                <span><span className="font-semibold text-ink">{l}</span><span className="block text-xs text-muted">{yrs} before the project date</span></span>
              </label>
            ))}
          </div>
          {s.lookback === "custom" && (
            <div className="mt-2 w-40">
              <label htmlFor={`${uid}-cy`} className={labelCls}>Lookback (years)</label>
              <NumberField id={`${uid}-cy`} value={s.customYears} onChange={(v) => set({ customYears: v })} />
            </div>
          )}
        </fieldset>
        <p className="mt-3 text-xs text-muted">
          {projIdx === null
            ? "Enter the project date to limit windows to the lookback. Until then every window in your data is treated as eligible."
            : `Eligible windows must fall within ${monthName(monthFromIndex(projIdx - years * 12))} through ${monthName(monthFromIndex(projIdx - 1))}.`}
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
        <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">2. Monthly emissions by unit (tons per month)</h2>
        <p className="mt-1 text-sm text-muted">Enter values already adjusted as the rule requires (for example, excluding non-compliant emissions and emissions above limits that now apply). Leave a month blank if it lacks adequate data; windows that include it are skipped.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor={`${uid}-ds`} className={labelCls}>First month of data</label>
                <input id={`${uid}-ds`} type="month" className={cn(field, "w-44")} value={s.dataStart} onChange={(e) => set({ dataStart: e.target.value })} />
              </div>
              <div className="w-32">
                <label htmlFor={`${uid}-mo`} className={labelCls}>Months of data</label>
                <NumberField id={`${uid}-mo`} value={s.months} onChange={(v) => v && setMonths(v)} />
              </div>
              <Button variant="subtle" size="sm" disabled={s.units.length >= 8} onClick={() => set({ units: [...s.units, { name: `EU-${s.units.length + 1}`, monthly: Array(s.months).fill(null) }] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add unit</Button>
            </div>
            <div className="relative mt-3 max-h-[28rem] overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-canvas text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-semibold">Month</th>
                    {s.units.map((u, ui) => (
                      <th key={ui} scope="col" className="min-w-[8rem] px-2 py-1.5 font-semibold">
                        <div className="flex items-center gap-1">
                          <input aria-label={`Unit ${ui + 1} name`} className={cn(field, "h-8 px-2 text-xs")} value={u.name} onChange={(e) => set({ units: s.units.map((x, j) => (j === ui ? { ...x, name: e.target.value } : x)) })} />
                          {s.units.length > 1 && <button type="button" aria-label={`Remove ${u.name}`} onClick={() => set({ units: s.units.filter((_, j) => j !== ui) })} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Array.from({ length: s.months }, (_, i) => {
                    const idx = startIdx + i;
                    const inBest = best && idx >= best.start && idx < best.start + win;
                    return (
                      <tr key={i} className={cn(inBest && "bg-eco-50/70")}>
                        <th scope="row" className="px-2 py-1 text-left text-xs font-medium whitespace-nowrap text-slate-700">{label(idx)}</th>
                        {s.units.map((u, ui) => (
                          <td key={ui} className="px-2 py-1">
                            <NumberField ariaLabel={`${u.name}, ${label(idx)}`} value={u.monthly[i] ?? null} onChange={(v) => set({ units: s.units.map((x, j) => (j === ui ? { ...x, monthly: x.monthly.map((m, k) => (k === i ? v : m)) } : x)) })} className={cn(field, "h-8 px-2")} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Rows shaded green are the highest eligible window.</p>
          </div>
          <div className="space-y-2 self-start rounded-xl bg-canvas p-4">
            <label htmlFor={`${uid}-paste`} className="flex items-center gap-1.5 text-sm font-semibold text-ink"><ClipboardPaste className="h-4 w-4 text-brand-600" aria-hidden="true" /> Paste from a spreadsheet</label>
            <p className="text-xs text-muted">One row per month, one column per unit (up to 8). A month label column and a header row are ignored. Set the first month of data first.</p>
            <textarea id={`${uid}-paste`} value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="w-full rounded-lg border border-line bg-white p-2 font-mono text-xs focus:border-brand-500 focus:outline-none" />
            <Button size="sm" onClick={usePaste} disabled={!paste.trim()}>Use pasted table</Button>
            {msg && <p role="status" className="text-xs text-slate-700">{msg}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-c`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-c`} className="text-lg font-bold text-ink">3. Baseline actual emissions</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data: illustrative numbers, not a real facility</Badge></p>}
        {best ? (
          <>
            <div className="mt-4 rounded-xl border border-eco-500/30 bg-eco-50 p-4">
              <p className="text-sm font-semibold text-eco-700">Highest eligible {win}-month window</p>
              <p className="mt-1 text-xl font-bold text-ink">{label(best.start)} – {label(best.start + win - 1)}</p>
              <p className="mt-1 text-sm text-slate-700">Combined baseline: <strong className="tabular-nums">{n(best.total, 3)} tpy</strong> across {s.units.length} unit{s.units.length > 1 ? "s" : ""}, using one window for all units as the rule requires.</p>
            </div>
            <div className="relative mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[32rem] text-sm">
                <caption className="sr-only">Top eligible baseline windows</caption>
                <thead className="bg-canvas text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Window</th>
                    {s.units.map((u, i) => <th key={i} scope="col" className="px-3 py-2 text-right font-semibold">{u.name} (tpy)</th>)}
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Total (tpy)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ranked.map((w, k) => (
                    <tr key={w.start} className={cn(k === 0 && "bg-eco-50/60")}>
                      <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap text-ink">{label(w.start)} – {label(w.start + win - 1)}</th>
                      {w.perUnit.map((v, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{n(v, 3)}</td>)}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{n(w.total, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">{windows.length} of {possible} possible windows are eligible. The others fall outside the lookback or include a month without data. Each value is the window&apos;s total tons × 12 ÷ {win}.</p>
            <Button className="mt-4" size="sm" variant="secondary" onClick={useBaselines}><ArrowDown className="h-4 w-4" aria-hidden="true" /> Use these baselines in step 4</Button>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">No eligible window yet. You need at least {win} consecutive months with data for every unit, inside the lookback.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-d`}>
        <h2 id={`${uid}-d`} className="text-lg font-bold text-ink">4. Project emissions increase (Step 1)</h2>
        <p className="mt-1 text-sm text-muted">For each unit in the project, enter projected actual emissions (or its potential to emit). New units have a baseline of zero, so the sum below is the hybrid test when the project has both.</p>
        <div className="relative mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-canvas text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-2 py-2 font-semibold">Unit</th>
                <th scope="col" className="px-2 py-2 font-semibold">Type</th>
                <th scope="col" className="px-2 py-2 font-semibold">Baseline (tpy)</th>
                <th scope="col" className="px-2 py-2 font-semibold">Projected actual or PTE (tpy)</th>
                <th scope="col" className="px-2 py-2 font-semibold">Uses PTE</th>
                <th scope="col" className="px-2 py-2 font-semibold">Could have accommodated (tpy)</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">Increase</th>
                <th scope="col" className="px-2 py-2"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.project.map((p, i) => {
                const upd = (patch: Partial<ProjectUnit>) => set({ project: s.project.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <tr key={i}>
                    <td className="px-2 py-1.5"><input aria-label="Unit name" className={cn(field, "h-9 min-w-[8rem] px-2")} value={p.name} onChange={(e) => upd({ name: e.target.value })} /></td>
                    <td className="px-2 py-1.5">
                      <select aria-label={`${p.name} type`} className={cn(field, "h-9 px-2")} value={p.kind} onChange={(e) => upd({ kind: e.target.value as ProjectUnit["kind"] })}>
                        <option value="existing">Existing</option>
                        <option value="new">New</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">{p.kind === "new" ? <span className="px-2 text-muted">0 (new)</span> : <NumberField ariaLabel={`${p.name} baseline`} value={p.baseline} onChange={(v) => upd({ baseline: v ?? 0 })} className={cn(field, "h-9 px-2")} />}</td>
                    <td className="px-2 py-1.5"><NumberField ariaLabel={`${p.name} projected`} value={p.projected} onChange={(v) => upd({ projected: v ?? 0 })} className={cn(field, "h-9 px-2")} /></td>
                    <td className="px-2 py-1.5 text-center"><input type="checkbox" aria-label={`${p.name} uses potential to emit`} checked={p.usesPte} disabled={p.kind === "new"} onChange={(e) => upd({ usesPte: e.target.checked })} /></td>
                    <td className="px-2 py-1.5">{p.kind === "new" || p.usesPte ? <span className="px-2 text-muted">n/a</span> : <NumberField ariaLabel={`${p.name} excluded`} value={p.excluded} onChange={(v) => upd({ excluded: v ?? 0 })} className={cn(field, "h-9 px-2")} />}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums"><span className="font-semibold">{n(result.perUnit[i]?.increase, 3)}</span><span className="block text-[0.7rem] text-muted">{result.perUnit[i]?.steps}</span></td>
                    <td className="px-2 py-1.5"><button type="button" aria-label={`Remove ${p.name}`} onClick={() => set({ project: s.project.filter((_, j) => j !== i) })} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" onClick={() => set({ project: [...s.project, { name: `New unit ${s.project.length + 1}`, kind: "new", baseline: 0, projected: 0, usesPte: false, excluded: 0 }] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add unit</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <label htmlFor={`${uid}-sig`} className={labelCls}>Significance value for this pollutant (tpy)</label>
              <NumberField id={`${uid}-sig`} value={s.significance} onChange={(v) => set({ significance: v })} placeholder="From 52.21(b)(23) or state rule" />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={s.countDecreases} onChange={(e) => set({ countDecreases: e.target.checked })} className="mt-1" />
              <span>Count project-related decreases in Step 1. Whether this is allowed depends on the version of the rule that applies to you; confirm before using it.</span>
            </label>
          </div>
          <div className={cn("rounded-xl border p-4", result.significant === true ? "border-amber-300 bg-amber-50" : result.significant === false ? "border-eco-500/30 bg-eco-50" : "border-line bg-canvas")} role="status">
            <p className="text-sm font-semibold text-muted">Sum of unit increases{s.pollutant ? ` (${s.pollutant})` : ""}</p>
            <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{n(result.total, 3)} tpy</p>
            <p className="mt-2 text-sm text-slate-700">
              {result.significant === null
                ? "Enter the significance value from the rule that applies to compare."
                : result.significant
                  ? `Based on your entries, the sum equals or exceeds the ${n(s.significance)} tpy you entered, which indicates a projected significant emissions increase under Step 1. A major modification also requires a significant net emissions increase (Step 2, contemporaneous netting).`
                  : `Based on your entries, the sum is below the ${n(s.significance)} tpy you entered. If you used projected actual emissions, the rule's recordkeeping and reporting provisions for such projects may still apply.`}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
