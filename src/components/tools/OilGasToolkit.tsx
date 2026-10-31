"use client";

import { ChevronDown, Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { quadOWindows, siteLabels, type Site } from "@/lib/tools/applicability";
import {
  ap42ExampleTank, blankEngine, blankFlare, blankLeak, blankTank, engineCalc, flareCalc, inventoryCsv, leakCalc, matrixSubparts, quadOMatrix, quadOMeta, rollup, tankCalc,
  type EngineRow, type FactorRow, type FlareInput, type LeakRow, type TankInput,
} from "@/lib/tools/oilgas";
import { RT, quoteHref, type RuleQuote } from "@/lib/tools/rule-text";
import { NumberField, downloadText, field, labelCls, useStoredState } from "./shared";

interface ToolkitState { siteName: string; site: Site; date: string; tanks: TankInput[]; flares: FlareInput[]; leaks: LeakRow[]; engines: EngineRow[]; demo: boolean }

const initial: ToolkitState = { siteName: "", site: "well-site", date: "", tanks: [], flares: [], leaks: [], engines: [], demo: false };
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 3 : 1 });
const card = "rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6";

/** Oil and gas site workbook: Quad O matrix, tanks, flares, fugitives, engines, and a site roll-up, with every step shown. */
export function OilGasToolkit() {
  const uid = useId();
  const [s, setS] = useStoredState<ToolkitState>("aph.tools.oilgas.v1", initial);
  const set = (patch: Partial<ToolkitState>) => setS((p) => ({ ...p, ...patch, demo: patch.demo ?? false }));
  const upd = <K extends "tanks" | "flares" | "leaks" | "engines">(k: K, id: string, patch: Partial<ToolkitState[K][number]>) =>
    setS((p) => ({ ...p, demo: false, [k]: (p[k] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const del = (k: "tanks" | "flares" | "leaks" | "engines", id: string) => setS((p) => ({ ...p, demo: false, [k]: (p[k] as { id: string }[]).filter((x) => x.id !== id) }));
  const roll = useMemo(() => rollup(s), [s]);
  const exportCsv = () => downloadText("oil-gas-site-workbook.csv", inventoryCsv(s.siteName, s, new Date().toISOString().slice(0, 10)));

  const tabs = [
    { label: "Quad O matrix", content: <MatrixPanel site={s.site} date={s.date} onSite={(site) => set({ site })} onDate={(date) => set({ date })} /> },
    {
      label: "Storage tanks", count: s.tanks.length,
      content: (
        <Panel
          intro={<>Fixed roof tank standing and working losses with AP-42 Section 7.1 Equations 1-1, 1-2, and 1-37. Enter VV, WV, KE, and KS from the AP-42 equations or your tank software. AP-42 leaves flashing losses to site-specific methods, so enter those from a lab sample or process simulation.</>}
          add={<Button size="sm" onClick={() => set({ tanks: [...s.tanks, blankTank(newId("tank"))] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add tank</Button>}
        >
          {s.tanks.map((t) => <TankCard key={t.id} t={t} onChange={(p) => upd("tanks", t.id, p)} onRemove={() => del("tanks", t.id)} />)}
        </Panel>
      ),
    },
    {
      label: "Flares", count: s.flares.length,
      content: (
        <Panel
          intro={<>VOC remaining after the destruction efficiency you enter, and combustion products from the factors you enter (lb/MMBtu) times heat input. Use the destruction efficiency your permit or the applicable rule allows.</>}
          add={<Button size="sm" onClick={() => set({ flares: [...s.flares, blankFlare(newId("flare"))] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add flare</Button>}
        >
          {s.flares.map((x) => <FlareCard key={x.id} x={x} onChange={(p) => upd("flares", x.id, p)} onRemove={() => del("flares", x.id)} />)}
        </Panel>
      ),
    },
    {
      label: "Fugitive components", count: s.leaks.length,
      content: (
        <Panel
          intro={<>Average emission factor approach from EPA&apos;s 1995 Protocol for Equipment Leak Emission Estimates. Enter one row per equipment type and service, with the factor and the table it comes from.</>}
          add={<Button size="sm" onClick={() => set({ leaks: [...s.leaks, blankLeak(newId("leak"))] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add component group</Button>}
        >
          {s.leaks.map((x) => <LeakCard key={x.id} x={x} onChange={(p) => upd("leaks", x.id, p)} onRemove={() => del("leaks", x.id)} />)}
        </Panel>
      ),
    },
    {
      label: "Engines", count: s.engines.length,
      content: (
        <Panel
          intro={<>Annual emissions from g/hp-hr factors (permit limits, manufacturer data, or the emission standard the engine is certified to). Screen NSPS JJJJ, IIII, and NESHAP ZZZZ applicability in the <Link href="/applicability" className="font-semibold text-brand-700 hover:underline">Applicability Checker</Link>.</>}
          add={<Button size="sm" onClick={() => set({ engines: [...s.engines, blankEngine(newId("eng"))] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add engine</Button>}
        >
          {s.engines.map((x) => <EngineCard key={x.id} x={x} onChange={(p) => upd("engines", x.id, p)} onRemove={() => del("engines", x.id)} />)}
        </Panel>
      ),
    },
    {
      label: "Site total",
      content: (
        <section className={card}>
          <h3 className="text-lg font-bold text-ink">Site total{s.siteName ? `: ${s.siteName}` : ""}</h3>
          {s.demo && <p className="mt-2"><Badge tone="amber">Demo data</Badge></p>}
          {roll.rows.length === 0 ? <p className="mt-3 text-sm text-muted">Add tanks, flares, components, or engines to build the total.</p> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="text-left text-xs text-muted"><tr><th className="py-2 pr-3">Group</th><th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Pollutant</th><th className="py-2 text-right">tpy</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {roll.rows.map((x, i) => <tr key={i}><td className="py-2 pr-3 text-muted">{x.group}</td><td className="py-2 pr-3">{x.source}</td><td className="py-2 pr-3">{x.pollutant}</td><td className="py-2 text-right font-mono">{fmt(x.tpy)}</td></tr>)}
                </tbody>
                <tfoot className="border-t-2 border-ink/20 font-semibold">
                  {Object.entries(roll.totals).map(([p, v]) => <tr key={p}><td className="py-2 pr-3" colSpan={2}>Total</td><td className="py-2 pr-3">{p}</td><td className="py-2 text-right font-mono">{fmt(v)}</td></tr>)}
                </tfoot>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">Compare totals with potential to emit only after applying the limits that are legally and practically enforceable at the site. The <Link href="/tools/synthetic-minor-limit-designer" className="font-semibold text-brand-700 hover:underline">Synthetic Minor Limit Designer</Link> works through that step.</p>
        </section>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold">Screening estimates for planning. Not a permit application or a regulatory determination.</p>
        <p className="mt-1">The tool supplies no emission factors or liquid properties. Enter each one with its source; the math and the source go into the export. Entries stay in this browser.</p>
      </div>
      <section className={cn(card, "no-print")} aria-labelledby={`${uid}-site`}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[14rem] flex-1">
            <label id={`${uid}-site`} htmlFor={`${uid}-sn`} className={labelCls}>Site name</label>
            <input id={`${uid}-sn`} className={field} value={s.siteName} onChange={(e) => set({ siteName: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={() => setS((p) => ({ ...p, demo: true, tanks: [...p.tanks.filter((t) => !t.id.startsWith("ap42-")), ap42ExampleTank("ap42-example")] }))}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Add AP-42 example tank</Button>
            <Button size="sm" variant="subtle" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button size="sm" variant="subtle" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print</Button>
            <Button size="sm" variant="subtle" onClick={() => setS(initial)}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: the example tank uses the inputs from AP-42 Section 7.1&apos;s worked example</Badge></p>}
      </section>
      <Tabs tabs={tabs} printAll />
    </div>
  );
}

function Panel({ intro, add, children }: { intro: ReactNode; add: ReactNode; children: ReactNode }) {
  const empty = Array.isArray(children) && children.length === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-canvas p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl">{intro}</p>
        <div className="no-print shrink-0">{add}</div>
      </div>
      {empty ? <p className="text-sm text-muted">Nothing added yet.</p> : <ul className="space-y-4">{children}</ul>}
    </div>
  );
}

function Quotes({ items, label = "Source text" }: { items: RuleQuote[]; label?: string }) {
  const unique = items.filter((q, i) => items.indexOf(q) === i);
  return (
    <details className="group mt-3 rounded-lg bg-canvas">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm font-semibold text-brand-700">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /> {label} ({unique.length})
      </summary>
      <ul className="space-y-2 px-3 pb-3">
        {unique.map((q) => {
          const href = quoteHref(q);
          return (
            <li key={q.cite + q.text} className="rounded-lg bg-white px-3 py-2">
              <p className="text-sm text-slate-800">&ldquo;{q.text}&rdquo;</p>
              <p className="mt-1 text-xs font-semibold text-muted">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700 hover:underline">{q.cite}</a> : q.cite}</p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function Steps({ steps, missing }: { steps: string[]; missing?: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-line bg-white p-3">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">Math</p>
      {steps.length ? <ol className="mt-1 space-y-1 font-mono text-[0.8rem] text-slate-800">{steps.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="mt-1 text-sm text-muted">Enter the inputs to see each step.</p>}
      {missing && missing.length > 0 && <p className="mt-2 text-xs text-amber-800">Still needed: {missing.join("; ")}.</p>}
    </div>
  );
}

function Num({ label, value, onChange, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <NumberField id={id} value={value} onChange={onChange} />
      {hint && <p className="mt-0.5 text-[0.7rem] text-muted">{hint}</p>}
    </div>
  );
}

function Text({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} className={field} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CardHead({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold text-ink">{title}</h3>
      <Button size="sm" variant="ghost" className="no-print" onClick={onRemove} aria-label={`Remove ${title}`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>
    </div>
  );
}

function MatrixPanel({ site, date, onSite, onDate }: { site: Site; date: string; onSite: (s: Site) => void; onDate: (d: string) => void }) {
  const uid = useId();
  const rows = useMemo(() => quadOMatrix(site), [site]);
  const windows = /^\d{4}-\d{2}-\d{2}$/.test(date) ? quadOWindows(date) : [];
  return (
    <section className={card}>
      <p className="text-sm text-slate-700">Which subpart lists each kind of oil and gas equipment, and whether the listing reaches your site type. The date windows come from each subpart&apos;s applicability section. Details such as wet seals, gas-driven, bleed rate, and tank emissions are assumed to match; screen a specific unit in the <Link href="/applicability" className="font-semibold text-brand-700 hover:underline">Applicability Checker</Link>.</p>
      <div className="no-print mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <label htmlFor={`${uid}-st`} className={labelCls}>Site type</label>
          <select id={`${uid}-st`} className={field} value={site} onChange={(e) => onSite(e.target.value as Site)}>
            {(Object.keys(siteLabels) as Site[]).map((k) => <option key={k} value={k}>{siteLabels[k]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-d`} className={labelCls}>Construction, modification, or reconstruction date (optional)</label>
          <input id={`${uid}-d`} type="date" className={field} value={date} onChange={(e) => onDate(e.target.value)} />
        </div>
      </div>
      {windows.length > 0 && <p className="mt-3 text-sm text-ink">That date falls in: <strong>{windows.join(", ")}</strong>{windows.includes("OOOOc") ? " (OOOOc applies through an approved state, Tribal, or federal plan)" : ""}.</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white py-2 pr-3 text-left text-xs text-muted">Equipment</th>
              {matrixSubparts.map((s) => (
                <th key={s} scope="col" className={cn("px-2 py-2 text-left text-xs", windows.includes(s) ? "rounded-t-lg bg-brand-50 text-brand-700" : "text-muted")}>
                  {quadOMeta[s].library ? <Link href={quadOMeta[s].library!} className="hover:underline">{s}</Link> : s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type}>
                <th scope="row" className="sticky left-0 border-t border-line bg-white py-2 pr-3 text-left font-medium text-ink">{r.label}</th>
                {matrixSubparts.map((s) => {
                  const c = r.cells[s];
                  return (
                    <td key={s} title={c.note} className={cn("border-t border-line px-2 py-2 align-top", windows.includes(s) && "bg-brand-50")}>
                      {!c.listed ? <span className="text-xs text-slate-400">Not listed</span>
                        : c.atSite === false ? <span className="text-xs text-slate-500">Listed, not at this site type</span>
                        : c.atSite === null ? <Badge tone="amber">Listed: check site</Badge>
                        : <Badge tone="blue">Listed</Badge>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Quotes label="Date windows and listings, word for word" items={[...matrixSubparts.map((s) => quadOMeta[s].window), ...rows.flatMap((r) => matrixSubparts.map((s) => r.cells[s].quote).filter((q): q is RuleQuote => !!q))]} />
    </section>
  );
}

function TankCard({ t, onChange, onRemove }: { t: TankInput; onChange: (p: Partial<TankInput>) => void; onRemove: () => void }) {
  const c = tankCalc(t);
  const uid = useId();
  return (
    <li className={card}>
      <CardHead title={t.name || "Tank"} onRemove={onRemove} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Text label="Tank name or ID" value={t.name} onChange={(name) => onChange({ name })} />
        <Text label="Where the inputs came from" value={t.source} onChange={(source) => onChange({ source })} className="sm:col-span-2 lg:col-span-3" />
        <Num label="VV, vapor space volume (ft³)" value={t.vv} onChange={(vv) => onChange({ vv })} />
        <Num label="WV, stock vapor density (lb/ft³)" value={t.wv} onChange={(wv) => onChange({ wv })} />
        <Num label="KE, vapor space expansion factor (per day)" value={t.ke} onChange={(ke) => onChange({ ke })} />
        <Num label="KS, vented vapor saturation factor" value={t.ks} onChange={(ks) => onChange({ ks })} />
        <Num label="Q, annual net throughput (bbl/yr)" value={t.q} onChange={(q) => onChange({ q })} hint="1 bbl = 42 gal" />
        <div>
          <label htmlFor={`${uid}-nm`} className={labelCls}>Turnovers N</label>
          <select id={`${uid}-nm`} className={field} value={t.nMode} onChange={(e) => onChange({ nMode: e.target.value as TankInput["nMode"] })}>
            <option value="enter">Enter N</option>
            <option value="geometry">From diameter and liquid heights</option>
          </select>
        </div>
        {t.nMode === "enter" ? <Num label="N, turnovers per year" value={t.n} onChange={(n) => onChange({ n })} /> : (
          <>
            <Num label="D, diameter (ft)" value={t.d} onChange={(d) => onChange({ d })} />
            <Num label="HLX, maximum liquid height (ft)" value={t.hlx} onChange={(hlx) => onChange({ hlx })} />
            <Num label="HLN, minimum liquid height (ft)" value={t.hln} onChange={(hln) => onChange({ hln })} />
          </>
        )}
        <div>
          <label htmlFor={`${uid}-kp`} className={labelCls}>Stored liquid (sets KP)</label>
          <select id={`${uid}-kp`} className={field} value={t.product} onChange={(e) => onChange({ product: e.target.value as TankInput["product"] })}>
            <option value="crude">Crude oil (KP = 0.75)</option>
            <option value="other">Other organic liquid (KP = 1)</option>
          </select>
        </div>
        <Num label="KB, vent setting correction factor" value={t.kb} onChange={(kb) => onChange({ kb })} hint="1 for vents up to ±0.03 psig; see AP-42 Eq. 1-42 otherwise" />
        <Num label="Control efficiency (%)" value={t.controlPct} onChange={(controlPct) => onChange({ controlPct })} hint="Blank or 0 if uncontrolled" />
        <Num label="VOC weight fraction of the vapor" value={t.vocFraction} onChange={(vocFraction) => onChange({ vocFraction })} hint="0 to 1, from your vapor analysis" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={t.flashing} onChange={(e) => onChange({ flashing: e.target.checked })} />
        Receives pressurized liquid from a separator (flashing occurs)
      </label>
      {t.flashing && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Flash emissions (lb/yr)" value={t.flashLbYr} onChange={(flashLbYr) => onChange({ flashLbYr })} />
          <Text label="How flash was estimated (sample, simulation, GOR)" value={t.flashMethod} onChange={(flashMethod) => onChange({ flashMethod })} className="sm:col-span-1 lg:col-span-3" />
        </div>
      )}
      <Steps steps={c.steps} missing={c.missing} />
      <Quotes items={[...c.basis, RT.ap42VvDef, RT.ap42WvDef, RT.ap42KeDef, RT.ap42KsDef, ...(t.nMode === "geometry" ? [RT.ap42NDef] : [])]} />
    </li>
  );
}

function FactorEditor({ rows, unit, onChange }: { rows: FactorRow[]; unit: string; onChange: (rows: FactorRow[]) => void }) {
  const uid = useId();
  return (
    <div className="mt-3">
      <p className={labelCls}>Factors ({unit}), each with its source</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[6rem_8rem_minmax(0,1fr)_auto] items-center gap-2">
            <input aria-label="Pollutant" className={field} value={r.pollutant} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, pollutant: e.target.value } : x)))} />
            <NumberField id={`${uid}-${i}`} ariaLabel={`${r.pollutant || "Factor"} ${unit}`} value={r.value} onChange={(value) => onChange(rows.map((x, j) => (j === i ? { ...x, value } : x)))} />
            <input aria-label="Source of this factor" placeholder="Source (document, table, or permit condition)" className={field} value={r.source} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))} />
            <Button size="sm" variant="ghost" className="no-print" aria-label="Remove factor" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="subtle" className="no-print mt-2" onClick={() => onChange([...rows, { pollutant: "", value: null, source: "" }])}><Plus className="h-4 w-4" aria-hidden="true" /> Add factor</Button>
    </div>
  );
}

function FlareCard({ x, onChange, onRemove }: { x: FlareInput; onChange: (p: Partial<FlareInput>) => void; onRemove: () => void }) {
  const c = flareCalc(x);
  return (
    <li className={card}>
      <CardHead title={x.name || "Flare"} onRemove={onRemove} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Text label="Flare name or ID" value={x.name} onChange={(name) => onChange({ name })} />
        <Num label="VOC routed to the flare (tpy)" value={x.vocIn} onChange={(vocIn) => onChange({ vocIn })} />
        <Num label="Destruction efficiency (%)" value={x.dre} onChange={(dre) => onChange({ dre })} />
        <Num label="Gas burned (scf/yr)" value={x.scfYr} onChange={(scfYr) => onChange({ scfYr })} />
        <Num label="Higher heating value (Btu/scf)" value={x.hhv} onChange={(hhv) => onChange({ hhv })} />
      </div>
      <FactorEditor rows={x.factors} unit="lb/MMBtu" onChange={(factors) => onChange({ factors })} />
      <Steps steps={c.steps} />
      <Quotes items={[RT.ap42Flare98, RT.ap42FlareDre, RT.flareVe, RT.flarePilot]} />
    </li>
  );
}

function LeakCard({ x, onChange, onRemove }: { x: LeakRow; onChange: (p: Partial<LeakRow>) => void; onRemove: () => void }) {
  const c = leakCalc(x);
  return (
    <li className={card}>
      <CardHead title={[x.component, x.service].filter(Boolean).join(", ") || "Component group"} onRemove={onRemove} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Text label="Equipment type (valves, connectors, seals)" value={x.component} onChange={(component) => onChange({ component })} />
        <Text label="Service (gas, light oil, water/oil)" value={x.service} onChange={(service) => onChange({ service })} />
        <Num label="N, number of components" value={x.count} onChange={(count) => onChange({ count })} />
        <Num label="FA, average factor (kg/hr/source)" value={x.factor} onChange={(factor) => onChange({ factor })} />
        <Text label="Factor source (document and table)" value={x.factorSource} onChange={(factorSource) => onChange({ factorSource })} className="sm:col-span-2" />
        <Num label="WFTOC, TOC weight fraction" value={x.wfToc} onChange={(wfToc) => onChange({ wfToc })} />
        <Num label="VOC weight fraction" value={x.wfVoc} onChange={(wfVoc) => onChange({ wfVoc })} />
        <Num label="Hours in service per year" value={x.hours} onChange={(hours) => onChange({ hours })} />
      </div>
      <Steps steps={c?.steps ?? []} missing={c ? [] : ["N, FA, WFTOC, and hours"]} />
      <Quotes items={[RT.leakEquation, RT.leakEtocDef, RT.leakFaDef, RT.leakWfDef, RT.leakNDef, RT.leakSpeciate, RT.leakPopulation]} />
    </li>
  );
}

function EngineCard({ x, onChange, onRemove }: { x: EngineRow; onChange: (p: Partial<EngineRow>) => void; onRemove: () => void }) {
  const c = engineCalc(x);
  return (
    <li className={card}>
      <CardHead title={x.name || "Engine"} onRemove={onRemove} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Text label="Engine name or ID" value={x.name} onChange={(name) => onChange({ name })} />
        <Num label="Rated power (hp)" value={x.hp} onChange={(hp) => onChange({ hp })} />
        <Num label="Operating hours per year" value={x.hours} onChange={(hours) => onChange({ hours })} />
      </div>
      <FactorEditor rows={x.factors} unit="g/hp-hr" onChange={(factors) => onChange({ factors })} />
      <Steps steps={c.steps} />
    </li>
  );
}
