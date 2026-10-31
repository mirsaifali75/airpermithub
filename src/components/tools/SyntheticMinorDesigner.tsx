"use client";

import { Copy, Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { RT, quoteHref, type RuleQuote } from "@/lib/tools/rule-text";
import { fmt, limitRow, limitTypeLabels, smCsv, smPollutants, statusLabel, summarize, type Comparison, type LimitType, type SmRow, type SmSettings } from "@/lib/tools/synthetic-minor";
import { NumberField, csvFileName, downloadText, field, labelCls, useStoredState } from "./shared";

interface SmState { facility: string; settings: SmSettings; rows: SmRow[]; checks: Record<string, boolean>; demo?: boolean }

const newId = () => Math.random().toString(36).slice(2, 9);
const blankRow = (unit = "EU-1"): SmRow => ({
  id: newId(), unit, description: "", pollutant: "NOx", hapName: "", uncontrolled: null, control: null, controlEnforceable: true,
  limitType: "none", limitValue: null, limitUnits: "", capacity: null, basis: "", condition: "", averaging: "12-month rolling total, updated monthly", monitoring: "", records: "", reporting: "",
});
const blank = (): SmState => ({ facility: "", settings: { ozone: "unknown", listed: "unknown", marginPct: 10, oilGas: false }, rows: [blankRow()], checks: {} });

/** Illustrative numbers only. Not a real facility, and not emission factors. */
const example = (): SmState => {
  const r = (p: Partial<SmRow>) => ({ ...blankRow(), ...p });
  return {
    demo: true,
    facility: "Example compressor station (demo data)",
    settings: { ozone: "none", listed: "no", marginPct: 10, oilGas: true },
    checks: {},
    rows: [
      r({ unit: "ENG-1", description: "Compressor engine", pollutant: "NOx", uncontrolled: 150, limitType: "hours", limitValue: 5000, limitUnits: "hr/yr", basis: "Demo value", condition: "Operate ENG-1 no more than 5,000 hours in any 12 consecutive months", monitoring: "Non-resettable hour meter", records: "Monthly hours and 12-month rolling total", reporting: "Rolling totals in semiannual report" }),
      r({ unit: "ENG-1", description: "Compressor engine", pollutant: "CO", uncontrolled: 120, control: 80, limitType: "hours", limitValue: 5000, limitUnits: "hr/yr", basis: "Demo value", condition: "Oxidation catalyst; operate no more than 5,000 hours in any 12 consecutive months", monitoring: "Catalyst inlet temperature and pressure drop; hour meter", records: "Parameter readings; monthly hours", reporting: "Deviations and rolling totals" }),
      r({ unit: "ENG-1", description: "Compressor engine", pollutant: "HAP", hapName: "Formaldehyde", uncontrolled: 12, control: 70, limitType: "hours", limitValue: 5000, limitUnits: "hr/yr", basis: "Demo value" }),
      r({ unit: "TK-1", description: "Condensate tanks", pollutant: "VOC", uncontrolled: 140, control: 95, limitType: "throughput", limitValue: 60000, capacity: 180000, limitUnits: "bbl/yr", basis: "Demo value", condition: "Route tank vapors to the combustor; condensate throughput no more than 60,000 bbl in any 12 consecutive months", monitoring: "Throughput meter; combustor pilot monitor", records: "Monthly throughput; pilot flame records", reporting: "Deviations and rolling totals" }),
      r({ unit: "TK-1", description: "Condensate tanks", pollutant: "HAP", hapName: "Benzene", uncontrolled: 3, control: 95, limitType: "throughput", limitValue: 60000, capacity: 180000, limitUnits: "bbl/yr", basis: "Demo value" }),
    ],
  };
};

const tone = (c: Comparison) => (c.status === "at-or-above" ? "red" : c.status === "near" ? "amber" : "green") as "red" | "amber" | "green";

/** Practical enforceability checklist: each item is EPA guidance text, quoted. */
const checklist: { key: string; label: string; quote: RuleQuote }[] = [
  { key: "elements", label: "Each limit states the limitation and the units it covers, the time period, and how compliance is determined", quote: RT.pte95Elements },
  { key: "averaging", label: "Averaging period is as short as practical; any rolling period is justified", quote: RT.pte95Averaging },
  { key: "parameters", label: "Where emissions are not measured directly, operating parameters are limited and monitored", quote: RT.pte95Parameters },
  { key: "independent", label: "Production and operational limits can each be enforced on their own", quote: RT.pte89Independent },
  { key: "records", label: "Recordkeeping lets the agency verify compliance with each limit", quote: RT.pte89Records },
  { key: "controls", label: "Control efficiency claims carry the operating parameters and assumptions they rest on", quote: RT.pte89Controls },
  { key: "federal", label: "The limit will be federally enforceable and enforceable as a practical matter", quote: RT.pte89TwoCriteria },
];

export function SyntheticMinorDesigner() {
  const uid = useId();
  const [s, setS] = useStoredState<SmState>("aph.tools.synthetic-minor.v1", blank());
  const [showDoc, setShowDoc] = useState(true);
  const set = (p: Partial<SmState>) => setS({ ...s, ...p, demo: p.demo ?? (p.rows ? false : s.demo) });
  const setSettings = (p: Partial<SmSettings>) => set({ settings: { ...s.settings, ...p } });
  const setRow = (id: string, p: Partial<SmRow>) => set({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const sum = useMemo(() => summarize(s.rows, s.settings), [s.rows, s.settings]);
  const docRows = s.rows.filter((r) => r.limitType !== "none" || (r.control ?? 0) > 0);

  const exportCsv = () => downloadText(csvFileName("synthetic-minor-limits", s.facility), smCsv(s.rows, s.settings, s.facility));

  const overall = {
    major: { t: "At or above a major source threshold with the limits entered", c: "border-red-200 bg-red-50 text-red-800" },
    near: { t: "Under every threshold, but inside your design margin on at least one", c: "border-amber-200 bg-amber-50 text-amber-900" },
    under: { t: "Under every threshold compared, with the limits entered", c: "border-eco-500/30 bg-eco-50 text-eco-700" },
    incomplete: { t: "Enter at least one unit to compare with the thresholds", c: "border-line bg-canvas text-slate-700" },
  }[sum.overall];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. Facility and area</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank())}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative numbers, not a real facility or emission factors</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-f`} className={labelCls}>Facility name</label>
            <input id={`${uid}-f`} className={field} value={s.facility} onChange={(e) => set({ facility: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${uid}-oz`} className={labelCls}>Ozone classification (for VOC and NOx)</label>
            <select id={`${uid}-oz`} className={field} value={s.settings.ozone} onChange={(e) => setSettings({ ozone: e.target.value as SmSettings["ozone"] })}>
              <option value="unknown">Not sure</option>
              <option value="none">Attainment or unclassifiable</option>
              <option value="marginal">Marginal nonattainment</option>
              <option value="moderate">Moderate nonattainment</option>
              <option value="serious">Serious nonattainment</option>
              <option value="severe">Severe nonattainment</option>
              <option value="extreme">Extreme nonattainment</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-psd`} className={labelCls}>Listed PSD source category?</label>
            <select id={`${uid}-psd`} className={field} value={s.settings.listed} onChange={(e) => setSettings({ listed: e.target.value as SmSettings["listed"] })}>
              <option value="unknown">Not sure</option>
              <option value="yes">Yes, one of the listed categories</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-m`} className={labelCls}>Design margin (%), your choice</label>
            <NumberField id={`${uid}-m`} value={s.settings.marginPct} onChange={(v) => setSettings({ marginPct: v })} />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className={labelCls}>Other areas with lower Part 70 thresholds (40 CFR 70.2)</legend>
          <div className="mt-1 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!s.settings.otr} onChange={(e) => setSettings({ otr: e.target.checked })} /> Ozone transport region (VOC)</label>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!s.settings.coSerious} onChange={(e) => setSettings({ coSerious: e.target.checked })} /> Serious CO nonattainment area where stationary sources contribute significantly</label>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!s.settings.pm10Serious} onChange={(e) => setSettings({ pm10Serious: e.target.checked })} /> Serious PM-10 nonattainment area</label>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={s.settings.oilGas} onChange={(e) => setSettings({ oilGas: e.target.checked })} /> Oil and gas production facility (HAP major source status by surface site)</label>
          </div>
        </fieldset>
        <p className="mt-3 text-xs text-muted">The design margin only colors results that are close to a threshold. It is not a regulatory value. Your state&apos;s program may set its own thresholds or definitions.</p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
        <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">2. Units, uncontrolled PTE, and proposed limits</h2>
        <p className="mt-1 text-sm text-muted">One row per unit and pollutant. Enter potential to emit at full design capacity and 8,760 hours per year, before controls, from your own emission factors and method. A control or limit reduces PTE only when it will be enforceable.</p>
        <ul className="mt-4 space-y-4">
          {s.rows.map((r, i) => {
            const x = limitRow(r);
            const rid = `${uid}-r${r.id}`;
            return (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div><label htmlFor={`${rid}-u`} className={labelCls}>Unit ID</label><input id={`${rid}-u`} className={field} value={r.unit} onChange={(e) => setRow(r.id, { unit: e.target.value })} /></div>
                  <div className="lg:col-span-2"><label htmlFor={`${rid}-d`} className={labelCls}>Description</label><input id={`${rid}-d`} className={field} value={r.description} onChange={(e) => setRow(r.id, { description: e.target.value })} /></div>
                  <div>
                    <label htmlFor={`${rid}-p`} className={labelCls}>Pollutant</label>
                    <select id={`${rid}-p`} className={field} value={r.pollutant} onChange={(e) => setRow(r.id, { pollutant: e.target.value as SmRow["pollutant"] })}>
                      {smPollutants.map((p) => <option key={p}>{p}</option>)}
                      <option value="HAP">HAP</option>
                    </select>
                  </div>
                  {r.pollutant === "HAP" && <div><label htmlFor={`${rid}-h`} className={labelCls}>HAP name (blank = unspeciated)</label><input id={`${rid}-h`} className={field} value={r.hapName} onChange={(e) => setRow(r.id, { hapName: e.target.value })} /></div>}
                  <div><label htmlFor={`${rid}-pte`} className={labelCls}>Uncontrolled PTE (tpy)</label><NumberField id={`${rid}-pte`} value={r.uncontrolled} onChange={(v) => setRow(r.id, { uncontrolled: v })} /></div>
                  <div><label htmlFor={`${rid}-ce`} className={labelCls}>Control efficiency (%)</label><NumberField id={`${rid}-ce`} value={r.control} onChange={(v) => setRow(r.id, { control: v })} /></div>
                  <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-700"><input type="checkbox" checked={r.controlEnforceable} onChange={(e) => setRow(r.id, { controlEnforceable: e.target.checked })} /> Control will be enforceable</label>
                  <div className="lg:col-span-2">
                    <label htmlFor={`${rid}-lt`} className={labelCls}>Proposed limit</label>
                    <select id={`${rid}-lt`} className={field} value={r.limitType} onChange={(e) => {
                      const lt = e.target.value as LimitType;
                      setRow(r.id, { limitType: lt, limitUnits: lt === "hours" ? "hr/yr" : lt === "cap" ? "tpy" : r.limitUnits === "hr/yr" || r.limitUnits === "tpy" ? "" : r.limitUnits });
                    }}>
                      {(Object.keys(limitTypeLabels) as LimitType[]).map((k) => <option key={k} value={k}>{limitTypeLabels[k]}</option>)}
                    </select>
                  </div>
                  {r.limitType !== "none" && <div><label htmlFor={`${rid}-lv`} className={labelCls}>Limit value ({r.limitType === "hours" ? "hr/yr" : r.limitType === "cap" ? "tpy" : "per year"})</label><NumberField id={`${rid}-lv`} value={r.limitValue} onChange={(v) => setRow(r.id, { limitValue: v })} /></div>}
                  {r.limitType === "throughput" && (
                    <>
                      <div><label htmlFor={`${rid}-lu`} className={labelCls}>Units</label><input id={`${rid}-lu`} className={field} placeholder="bbl/yr, MMscf/yr" value={r.limitUnits} onChange={(e) => setRow(r.id, { limitUnits: e.target.value })} /></div>
                      <div><label htmlFor={`${rid}-cap`} className={labelCls}>Throughput at full capacity (same units)</label><NumberField id={`${rid}-cap`} value={r.capacity} onChange={(v) => setRow(r.id, { capacity: v })} /></div>
                    </>
                  )}
                  <div className="sm:col-span-2 lg:col-span-3"><label htmlFor={`${rid}-b`} className={labelCls}>Emission factor or method (source)</label><input id={`${rid}-b`} className={field} value={r.basis} onChange={(e) => setRow(r.id, { basis: e.target.value })} /></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                  <p className="text-sm text-slate-800"><span className="font-semibold">Limited PTE: </span><span className="font-mono text-xs sm:text-sm">{x.steps}</span></p>
                  <div className="no-print flex gap-1">
                    <button type="button" aria-label={`Copy row ${i + 1}`} onClick={() => set({ rows: [...s.rows.slice(0, i + 1), { ...r, id: newId() }, ...s.rows.slice(i + 1)] })} className="rounded p-1.5 text-muted hover:bg-white hover:text-brand-700"><Copy className="h-4 w-4" aria-hidden="true" /></button>
                    {s.rows.length > 1 && <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => set({ rows: s.rows.filter((y) => y.id !== r.id) })} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
                  </div>
                </div>
                {x.problems.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-amber-800">{x.problems.map((p) => <li key={p}>• {p}</li>)}</ul>}
              </li>
            );
          })}
        </ul>
        <div className="no-print mt-3">
          <Button variant="subtle" size="sm" disabled={s.rows.length >= 60} onClick={() => set({ rows: [...s.rows, blankRow(s.rows.at(-1)?.unit ?? "EU-1")] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add row</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-c`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-c`} className="text-lg font-bold text-ink">3. Facility totals against major source thresholds</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data: illustrative numbers, not a real facility or emission factors</Badge></p>}
        <p className={cn("mt-4 rounded-xl border p-4 text-sm font-semibold", overall.c)} role="status">{overall.t}. This is a design screen, not an applicability determination.</p>
        {(sum.pollutants.length > 0 || sum.hapTotal) && (
          <div className="relative mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">Facility potential to emit compared with major source thresholds</caption>
              <thead className="bg-canvas text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Pollutant</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Uncontrolled (tpy)</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">With limits (tpy)</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Threshold</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Headroom (tpy)</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...sum.pollutants, ...sum.haps.map((h) => ({ pollutant: `HAP: ${h.name}`, uncontrolled: h.uncontrolled, limited: h.limited, comparisons: [h.comparison] })), ...(sum.hapTotal ? [sum.hapTotal] : [])].flatMap((p) =>
                  p.comparisons.map((c, ci) => (
                    <tr key={p.pollutant + c.program}>
                      {ci === 0 && <th scope="row" rowSpan={p.comparisons.length} className="px-3 py-2 text-left align-top font-semibold text-ink">{p.pollutant}</th>}
                      {ci === 0 && <td rowSpan={p.comparisons.length} className="px-3 py-2 text-right align-top tabular-nums">{fmt(p.uncontrolled)}</td>}
                      {ci === 0 && <td rowSpan={p.comparisons.length} className="px-3 py-2 text-right align-top font-semibold tabular-nums">{fmt(p.limited)}</td>}
                      <td className="px-3 py-2">
                        <span className="font-medium text-ink">{c.program}: {fmt(c.tpy)} tpy</span>
                        <span className="block text-xs text-muted">{c.basis}. {[...new Set(c.quotes.map((q) => q.cite))].join("; ")}</span>
                        {c.note && <span className="block text-xs text-amber-800">{c.note}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.headroom)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={tone(c)}>{statusLabel[c.status]}</Badge>
                        {c.limitsNeeded && c.status !== "at-or-above" && <span className="mt-1 block text-xs text-muted">Over without limits: the limits are what keep it under</span>}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
        {sum.unspeciated.uncontrolled > 0 && <p className="mt-3 text-xs text-amber-800">{fmt(sum.unspeciated.limited)} tpy of HAP is not named, so it counts in the total but cannot be checked against the single-HAP threshold. Speciate it to confirm the single-HAP result.</p>}
        {sum.rowProblems.length > 0 && <p className="mt-3 text-xs text-amber-800">{sum.rowProblems.length} row{sum.rowProblems.length > 1 ? "s are" : " is"} incomplete or flagged above; totals include only rows with a result.</p>}
        <p className="mt-3 text-xs text-muted">Comparison: a total equal to a threshold counts as at or above it, because each definition says “or more.” PSD thresholds apply to the major source test for new sources and are shown for every pollutant; where your area is nonattainment for a pollutant, check your state&apos;s nonattainment NSR rule instead.</p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-d`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-d`} className="text-lg font-bold text-ink">4. Making each limit enforceable</h2>
          <button type="button" className="no-print text-sm font-semibold text-brand-700 hover:underline" onClick={() => setShowDoc(!showDoc)}>{showDoc ? "Hide" : "Show"}</button>
        </div>
        {showDoc && (
          <>
            <p className="mt-1 text-sm text-muted">Record the condition, averaging period, monitoring, recordkeeping, and reporting for every row that uses a control or a limit. These go to the export for your application support.</p>
            {docRows.length === 0 ? <p className="mt-3 text-sm text-slate-700">No rows use a control or limit yet.</p> : (
              <ul className="mt-4 space-y-3">
                {docRows.map((r) => {
                  const rid = `${uid}-doc${r.id}`;
                  const f = (k: "condition" | "averaging" | "monitoring" | "records" | "reporting", label: string, wide = false) => (
                    <div className={wide ? "sm:col-span-2" : ""}><label htmlFor={`${rid}-${k}`} className={labelCls}>{label}</label><input id={`${rid}-${k}`} className={field} value={r[k]} onChange={(e) => setRow(r.id, { [k]: e.target.value })} /></div>
                  );
                  return (
                    <li key={r.id} className="rounded-xl bg-canvas p-4">
                      <p className="text-sm font-semibold text-ink">{r.unit} · {r.pollutant === "HAP" ? `HAP: ${r.hapName || "unspeciated"}` : r.pollutant}</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {f("condition", "Proposed enforceable condition", true)}
                        {f("averaging", "Averaging period")}
                        {f("monitoring", "Monitoring")}
                        {f("records", "Recordkeeping")}
                        {f("reporting", "Reporting")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3 className="mt-6 font-semibold text-ink">Practical enforceability checklist (EPA guidance)</h3>
            <ul className="mt-3 space-y-3">
              {checklist.map((c) => {
                const href = quoteHref(c.quote);
                return (
                  <li key={c.key} className="rounded-xl border border-line p-3">
                    <label className="flex gap-2 text-sm font-medium text-ink">
                      <input type="checkbox" className="mt-1" checked={!!s.checks[c.key]} onChange={(e) => set({ checks: { ...s.checks, [c.key]: e.target.checked } })} />
                      {c.label}
                    </label>
                    <blockquote className="mt-2 border-l-2 border-brand-200 pl-3 text-xs text-slate-700">&ldquo;{c.quote.text}&rdquo; <a href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{c.quote.cite}</a></blockquote>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
