"use client";

import { ChevronDown, Download, ExternalLink, FlaskConical, MapPinned, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ApplicabilityBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { checkerUnitFor } from "@/lib/screening";
import {
  applicabilityCsv, equipmentLabel, equipmentTypes, hapStatus, oilGasTypes, ptePollutants, screenAll, siteLabels,
  type EquipmentInput, type EquipmentType, type FacilityInput, type Finding, type HapStatus, type ScreenStatus, type Site,
} from "@/lib/tools/applicability";
import { quoteHref } from "@/lib/tools/rule-text";
import { NumberField, downloadText, field, labelCls, useStoredState } from "./shared";

interface ScreenState { facility: FacilityInput; equipment: EquipmentInput[]; demo: boolean }

const blankFacility = (): FacilityInput => ({
  name: "", state: "", hap: "unknown", hapSingle: null, hapTotal: null,
  pte: { NOx: null, CO: null, VOC: null, SO2: null, PM10: null, "PM2.5": null, PM: null },
  listedCategory: "unknown", ozone: "unknown", oilGas: false, ghgListed: "unknown", ghgCo2e: null, combustionMmbtu: null,
});

const newId = () => `eq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Example entries, clearly labeled in the UI. Not a real facility. */
const demo = (): ScreenState => ({
  demo: true,
  facility: {
    ...blankFacility(), name: "Example compressor station (demo data)", state: "texas", hap: "area", oilGas: true,
    pte: { NOx: 82, CO: 64, VOC: 41, SO2: 0.4, PM10: 2.1, "PM2.5": 2.1, PM: 2.1 }, listedCategory: "no", ozone: "none", ghgListed: "unknown",
  },
  equipment: [
    { id: "demo-1", type: "si-engine", name: "Compressor engine C-1", date: "2024-03-04", dateKind: "construction", hp: 1380, manufactured: "2024-01-15", burn: "4SLB", emergency: false },
    { id: "demo-2", type: "reciprocating-compressor", name: "Compressor C-1", date: "2024-03-04", dateKind: "construction", site: "compressor-station" },
    { id: "demo-3", type: "tank", name: "Condensate tanks T-1 to T-2", date: "2024-03-04", dateKind: "construction", gallons: 16800, tvp: 5.2, liquid: "crude-condensate", beforeCustody: true, tankSite: "none", vocTpy: 8.5, ch4Tpy: 1.2 },
    { id: "demo-4", type: "fugitives", name: "Site fugitive components", date: "2024-03-04", dateKind: "construction", site: "compressor-station" },
    { id: "demo-5", type: "pneumatic-controller", name: "Process controllers", date: "2024-03-04", dateKind: "construction", site: "compressor-station", gasDriven: false },
  ],
});

/** What the Permit Finder passes in its "Continue with these units" link. */
interface Handoff { name?: string; state?: string; hap?: HapStatus; oilGas: boolean; site?: Site; units: { type: EquipmentType; name: string; from: string }[]; choose: string[] }
const handoffNames: Record<string, string> = {
  "Storage Tanks": "Storage tanks", Heaters: "Heater", "Heater Treaters": "Heater treater", Flares: "Flare",
  "Pneumatic Controllers": "Pneumatic controllers", "Pneumatic Pumps": "Pneumatic pumps", Fugitives: "Site fugitive components",
};

/** "a, b, and c" */
const listText = (xs: string[]) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`);

function readHandoff(): Handoff | null {
  const p = new URLSearchParams(window.location.search);
  if (p.get("from") !== "permit-finder") return null;
  const list = (k: string) => (p.get(k) ?? "").split("|").filter(Boolean);
  const hap = p.get("hap");
  const site = p.get("site");
  return {
    name: p.get("name") ?? undefined,
    state: p.get("state") ?? undefined,
    hap: hap === "major" || hap === "area" ? hap : undefined,
    oilGas: p.get("og") === "1",
    site: site && site in siteLabels ? (site as Site) : undefined,
    units: list("units").filter((u) => checkerUnitFor[u]).map((u) => ({ type: checkerUnitFor[u] as EquipmentType, name: handoffNames[u] ?? u, from: u })),
    choose: list("choose"),
  };
}

const tri = (v: boolean | undefined) => (v === undefined ? "" : v ? "yes" : "no");
const fromTri = (s: string) => (s === "" ? undefined : s === "yes");

const statusOrder: ScreenStatus[] = ["potentially-applicable", "more-info-needed", "likely-not-applicable"];

/** Federal applicability screen for a facility and its equipment, with the rule text behind each result. */
export function ApplicabilityScreener({ states }: { states: { slug: string; name: string; agency: string }[] }) {
  const uid = useId();
  const [s, setS] = useStoredState<ScreenState>("aph.tools.applicability.v1", { facility: blankFacility(), equipment: [], demo: false });
  const [addType, setAddType] = useState<EquipmentType>("si-engine");
  const [hideUnlikely, setHideUnlikely] = useState(false);
  const f = s.facility;
  const setF = (patch: Partial<FacilityInput>) => setS((p) => ({ ...p, demo: false, facility: { ...p.facility, ...patch } }));
  const setE = (id: string, patch: Partial<EquipmentInput>) => setS((p) => ({ ...p, demo: false, equipment: p.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const results = useMemo(() => screenAll(s.facility, s.equipment), [s.facility, s.equipment]);
  const all = [...results.facility, ...results.equipment.flatMap((r) => r.findings)];
  const counts = statusOrder.map((st) => [st, all.filter((x) => x.status === st).length] as const);
  const state = states.find((x) => x.slug === f.state);
  const hap = hapStatus(f);

  const [handoff, setHandoff] = useState<Handoff | null>(null);
  useEffect(() => setHandoff(readHandoff()), []);
  const closeHandoff = () => {
    setHandoff(null);
    window.history.replaceState(null, "", window.location.pathname);
  };
  const applyHandoff = (replace: boolean) => {
    if (!handoff) return;
    setS((p) => {
      const keep = replace || p.demo ? { facility: blankFacility(), equipment: [] as EquipmentInput[] } : p;
      return {
        demo: false,
        facility: {
          ...keep.facility,
          ...(handoff.name ? { name: handoff.name } : {}),
          ...(handoff.state ? { state: handoff.state } : {}),
          ...(handoff.hap ? { hap: handoff.hap } : {}),
          oilGas: keep.facility.oilGas || handoff.oilGas,
        },
        equipment: [
          ...keep.equipment,
          ...handoff.units.map((u): EquipmentInput => ({
            id: newId(), type: u.type, name: u.name, date: "", dateKind: "construction",
            ...(oilGasTypes.includes(u.type) ? { site: handoff.site ?? (handoff.oilGas ? undefined : "other") } : {}),
          })),
        ],
      };
    });
    closeHandoff();
  };
  const hasEntries = s.equipment.length > 0 && !s.demo;

  const add = () => setS((p) => ({ ...p, demo: false, equipment: [...p.equipment, { id: newId(), type: addType, name: "", date: "", dateKind: "construction", ...(oilGasTypes.includes(addType) ? { site: p.facility.oilGas ? undefined : "other" } : {}) }] }));
  const exportCsv = () => downloadText("applicability-screen.csv", applicabilityCsv(f, s.equipment, new Date().toISOString().slice(0, 10)));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold">Screening only. Not an applicability determination.</p>
        <p className="mt-1">Each result compares what you enter with the dates and sizes in the rule text quoted under it. Confirm against the current eCFR, your permit, and your state&apos;s rules before relying on it. Entries stay in this browser.</p>
      </div>

      {handoff && (
        <div className="no-print rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm" role="region" aria-label="Continue from the Permit Finder">
          <p className="font-semibold text-ink">Continue from the Permit Finder</p>
          <p className="mt-1 text-slate-700">
            {handoff.units.length > 0
              ? `Add ${handoff.units.length === 1 ? "an entry" : "one entry each"} for ${listText(handoff.units.map((u) => u.from.toLowerCase()))} to the equipment list, with the facility details you entered there.`
              : "Fill in the facility details you entered there."}{" "}
            Each unit still needs its date and size before it can be screened.
          </p>
          {handoff.choose.length > 0 && (
            <p className="mt-1 text-slate-700">
              {listText(handoff.choose)} need a type the Permit Finder didn&apos;t ask for (diesel or spark ignition; centrifugal or reciprocating). Add each one with <strong>Add equipment</strong> below.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => applyHandoff(false)}>{hasEntries ? "Add to my current list" : "Add these"}</Button>
            {hasEntries && <Button size="sm" variant="subtle" onClick={() => applyHandoff(true)}>Replace my current list</Button>}
            <Button size="sm" variant="ghost" onClick={closeHandoff}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Facility */}
      <section className="no-print rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-fac`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-fac`} className="text-lg font-bold text-ink">1. Facility</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={() => setS(demo())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button size="sm" variant="subtle" onClick={() => setS({ facility: blankFacility(), equipment: [], demo: false })}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: example entries, not a real facility</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-name`} className={labelCls}>Facility name</label>
            <input id={`${uid}-name`} className={field} value={f.name} onChange={(e) => setF({ name: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${uid}-st`} className={labelCls}>State</label>
            <select id={`${uid}-st`} className={field} value={f.state} onChange={(e) => setF({ state: e.target.value })}>
              <option value="">Select</option>
              {states.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex h-10 items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.oilGas} onChange={(e) => setF({ oilGas: e.target.checked })} />
              Crude oil or natural gas site
            </label>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-bold text-ink">Potential to emit, tons per year</h3>
        <p className="text-xs text-muted">Facility-wide potential to emit, counting only limits that are legally and practically enforceable. Leave blank if unknown.</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {ptePollutants.map((p) => (
            <div key={p}>
              <label htmlFor={`${uid}-pte-${p}`} className={labelCls}>{p}</label>
              <NumberField id={`${uid}-pte-${p}`} value={f.pte[p]} onChange={(v) => setF({ pte: { ...f.pte, [p]: v } })} />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`${uid}-hap`} className={labelCls}>HAP status</label>
            <select id={`${uid}-hap`} className={field} value={f.hap} onChange={(e) => setF({ hap: e.target.value as FacilityInput["hap"] })}>
              <option value="unknown">Not sure (use potential HAP)</option>
              <option value="major">Major source</option>
              <option value="area">Area source</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-h1`} className={labelCls}>Potential HAP, largest single (tpy)</label>
            <NumberField id={`${uid}-h1`} value={f.hapSingle} onChange={(v) => setF({ hapSingle: v })} />
          </div>
          <div>
            <label htmlFor={`${uid}-h2`} className={labelCls}>Potential HAP, combined (tpy)</label>
            <NumberField id={`${uid}-h2`} value={f.hapTotal} onChange={(v) => setF({ hapTotal: v })} />
          </div>
          <div>
            <label htmlFor={`${uid}-oz`} className={labelCls}>Ozone area classification</label>
            <select id={`${uid}-oz`} className={field} value={f.ozone} onChange={(e) => setF({ ozone: e.target.value as FacilityInput["ozone"] })}>
              <option value="unknown">Not sure</option>
              <option value="none">Attainment or unclassifiable</option>
              <option value="marginal">Nonattainment: marginal</option>
              <option value="moderate">Nonattainment: moderate</option>
              <option value="serious">Nonattainment: serious</option>
              <option value="severe">Nonattainment: severe</option>
              <option value="extreme">Nonattainment: extreme</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-cat`} className={labelCls}>One of the PSD listed source categories?</label>
            <select id={`${uid}-cat`} className={field} value={f.listedCategory} onChange={(e) => setF({ listedCategory: e.target.value as FacilityInput["listedCategory"] })}>
              <option value="unknown">Not sure</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-ghg`} className={labelCls}>GHG Reporting source category</label>
            <select id={`${uid}-ghg`} className={field} value={f.ghgListed} onChange={(e) => setF({ ghgListed: e.target.value as FacilityInput["ghgListed"] })}>
              <option value="unknown">Not sure</option>
              <option value="a3">Listed in Table A-3</option>
              <option value="a4">Listed in Table A-4</option>
              <option value="no">Neither (combustion only)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-co2e`} className={labelCls}>CO2e, metric tons per year</label>
            <NumberField id={`${uid}-co2e`} value={f.ghgCo2e} onChange={(v) => setF({ ghgCo2e: v })} />
          </div>
          <div>
            <label htmlFor={`${uid}-cmb`} className={labelCls}>Total combustion capacity, MMBtu/hr</label>
            <NumberField id={`${uid}-cmb`} value={f.combustionMmbtu} onChange={(v) => setF({ combustionMmbtu: v })} />
          </div>
        </div>
        {f.hap === "unknown" && hap !== "unknown" && <p className="mt-2 text-xs text-muted">From the potential HAP entered, the screen treats the site as a {hap} source.</p>}
      </section>

      {/* Equipment */}
      <section className="no-print rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-eq`}>
        <h2 id={`${uid}-eq`} className="text-lg font-bold text-ink">2. Equipment</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`${uid}-add`} className="sr-only">Equipment type</label>
          <select id={`${uid}-add`} className={cn(field, "sm:max-w-md")} value={addType} onChange={(e) => setAddType(e.target.value as EquipmentType)}>
            {equipmentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <Button onClick={add}><Plus className="h-4 w-4" aria-hidden="true" /> Add equipment</Button>
        </div>
        {s.equipment.length === 0 && <p className="mt-4 text-sm text-muted">Add each engine, boiler, turbine, tank, or oil and gas unit you want screened. Facility-wide programs are screened without equipment.</p>}
        <ul className="mt-4 space-y-3">
          {s.equipment.map((e) => (
            <EquipmentCard key={e.id} e={e} oilGas={f.oilGas} onChange={(patch) => setE(e.id, patch)} onRemove={() => setS((p) => ({ ...p, demo: false, equipment: p.equipment.filter((x) => x.id !== e.id) }))} />
          ))}
        </ul>
      </section>

      {/* Results */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-res`} aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-res`} className="text-lg font-bold text-ink">3. Screening results{f.name ? `: ${f.name}` : ""}</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button size="sm" variant="subtle" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data</Badge></p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {counts.map(([st, n]) => <span key={st} className="inline-flex max-w-full items-center gap-1.5 text-sm"><ApplicabilityBadge status={st} wrap /> <span className="font-semibold text-ink">{n}</span></span>)}
        </div>
        <label className="no-print mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={hideUnlikely} onChange={(e) => setHideUnlikely(e.target.checked)} />
          Hide &ldquo;likely not applicable&rdquo; results
        </label>

        <h3 className="mt-6 text-sm font-bold tracking-wider text-muted uppercase">Facility-wide programs</h3>
        <FindingList findings={results.facility} hideUnlikely={hideUnlikely} />

        {results.equipment.map((r) => (
          <div key={r.equipment.id}>
            <h3 className="mt-6 text-sm font-bold text-ink">{r.equipment.name || "Unnamed equipment"} <span className="font-normal text-muted">· {equipmentLabel(r.equipment.type)}</span></h3>
            <FindingList findings={r.findings} hideUnlikely={hideUnlikely} />
          </div>
        ))}

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-canvas p-4 text-sm">
          <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
          <p className="text-slate-700">
            This screen covers the federal rules listed below; state rules are not screened.{" "}
            {state
              ? <>See the <Link href={`/states/${state.slug}`} className="font-semibold text-brand-700 hover:underline">{state.name} air permit hub</Link> for permit programs and links from {state.agency}.</>
              : <>Pick a state above to link its air permit hub, or browse the <Link href="/states" className="font-semibold text-brand-700 hover:underline">State Explorer</Link>.</>}
          </p>
        </div>
      </section>
    </div>
  );
}

function FindingList({ findings, hideUnlikely }: { findings: Finding[]; hideUnlikely: boolean }) {
  const shown = hideUnlikely ? findings.filter((x) => x.status !== "likely-not-applicable") : findings;
  if (!shown.length) return <p className="mt-2 text-sm text-muted">Nothing to show with the current filter.</p>;
  return <ul className="mt-2 space-y-3">{shown.map((x) => <FindingCard key={x.key} f={x} />)}</ul>;
}

function FindingCard({ f }: { f: Finding }) {
  return (
    <li className="rounded-xl border border-line p-4 break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{f.rule}</p>
          <p className="text-xs text-muted">{f.citation} · {f.title}</p>
        </div>
        <ApplicabilityBadge status={f.status} />
      </div>
      <p className="mt-2 text-sm text-slate-800">{f.why}</p>
      {f.basis.length > 0 && (
        <details className="group mt-3 rounded-lg bg-canvas">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm font-semibold text-brand-700">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /> Rule text this rests on ({f.basis.length})
          </summary>
          <ul className="space-y-2 px-3 pb-3">
            {f.basis.map((b) => {
              const href = quoteHref(b);
              return (
                <li key={b.cite + b.text.slice(0, 24)} className="rounded-lg bg-white px-3 py-2">
                  <p className="text-sm text-slate-800">&ldquo;{b.text}&rdquo;</p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700 hover:underline">{b.cite}</a> : b.cite}
                  </p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {f.needed.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold tracking-wider text-muted uppercase">To confirm</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{f.needed.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={f.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Official text <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
        {f.library && <Link href={f.library} className="font-semibold text-brand-700 hover:underline">{f.library.startsWith("/regulations/") ? "Rule Library page" : "Related tool or guide"}</Link>}
      </div>
    </li>
  );
}

function EquipmentCard({ e, oilGas, onChange, onRemove }: { e: EquipmentInput; oilGas: boolean; onChange: (p: Partial<EquipmentInput>) => void; onRemove: () => void }) {
  const uid = useId();
  const t = e.type;
  const engine = t === "ci-engine" || t === "si-engine";
  const og = oilGasTypes.includes(t);
  const id = (k: string) => `${uid}-${k}`;
  const triSelect = (k: "wetSeals" | "gasDriven" | "continuousBleed", label: string) => (
    <div>
      <label htmlFor={id(k)} className={labelCls}>{label}</label>
      <select id={id(k)} className={field} value={tri(e[k])} onChange={(ev) => onChange({ [k]: fromTri(ev.target.value) })}>
        <option value="">Not sure</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
  const check = (k: "emergency" | "firePump" | "temporary" | "beforeCustody", label: string) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!e[k]} onChange={(ev) => onChange({ [k]: ev.target.checked })} />
      {label}
    </label>
  );
  const num = (k: "hp" | "mmbtu" | "mw" | "gallons" | "tvp" | "vocTpy" | "ch4Tpy" | "bleedScfh", label: string) => (
    <div>
      <label htmlFor={id(k)} className={labelCls}>{label}</label>
      <NumberField id={id(k)} value={e[k] ?? null} onChange={(v) => onChange({ [k]: v })} />
    </div>
  );

  return (
    <li className="rounded-xl border border-line bg-canvas/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{equipmentLabel(t)}</p>
        <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${e.name || equipmentLabel(t)}`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={id("name")} className={labelCls}>Name or ID</label>
          <input id={id("name")} className={field} value={e.name} onChange={(ev) => onChange({ name: ev.target.value })} />
        </div>
        <div>
          <label htmlFor={id("kind")} className={labelCls}>Date is for</label>
          <select id={id("kind")} className={field} value={e.dateKind} onChange={(ev) => onChange({ dateKind: ev.target.value as EquipmentInput["dateKind"] })}>
            <option value="construction">{engine ? "Order (construction)" : "Construction"}</option>
            <option value="modification">Modification</option>
            <option value="reconstruction">Reconstruction</option>
          </select>
        </div>
        <div>
          <label htmlFor={id("date")} className={labelCls}>{engine && e.dateKind === "construction" ? "Order date" : "Date commenced"}</label>
          <input id={id("date")} type="date" className={field} value={e.date} onChange={(ev) => onChange({ date: ev.target.value })} />
        </div>
        {engine && (
          <div>
            <label htmlFor={id("mfg")} className={labelCls}>Manufacture date</label>
            <input id={id("mfg")} type="date" className={field} value={e.manufactured ?? ""} onChange={(ev) => onChange({ manufactured: ev.target.value })} />
          </div>
        )}
        {engine && num("hp", "Power or site rating, hp")}
        {t === "si-engine" && (
          <div>
            <label htmlFor={id("burn")} className={labelCls}>Design</label>
            <select id={id("burn")} className={field} value={e.burn ?? "unknown"} onChange={(ev) => onChange({ burn: ev.target.value as EquipmentInput["burn"] })}>
              <option value="unknown">Not sure</option>
              <option value="4SRB">4-stroke rich burn</option>
              <option value="4SLB">4-stroke lean burn</option>
              <option value="2SLB">2-stroke lean burn</option>
            </select>
          </div>
        )}
        {(t === "boiler" || t === "process-heater" || t === "turbine") && num("mmbtu", "Heat input capacity, MMBtu/hr")}
        {(t === "boiler" || t === "process-heater") && (
          <div>
            <label htmlFor={id("fuel")} className={labelCls}>Fuel</label>
            <select id={id("fuel")} className={field} value={e.fuel ?? ""} onChange={(ev) => onChange({ fuel: (ev.target.value || undefined) as EquipmentInput["fuel"] })}>
              <option value="">Not sure</option>
              <option value="gas">Gas</option>
              <option value="liquid">Liquid</option>
              <option value="solid">Solid</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        {t === "turbine" && num("mw", "Rated peak power output, MW")}
        {t === "tank" && num("gallons", "Capacity, gallons")}
        {t === "tank" && num("tvp", "Maximum true vapor pressure, psia")}
        {t === "tank" && (
          <div>
            <label htmlFor={id("liq")} className={labelCls}>Stored liquid</label>
            <select id={id("liq")} className={field} value={e.liquid ?? "vol"} onChange={(ev) => onChange({ liquid: ev.target.value as EquipmentInput["liquid"] })}>
              <option value="vol">Volatile organic liquid</option>
              <option value="crude-condensate">Crude oil or condensate</option>
              <option value="not-vol">Not a volatile organic liquid</option>
            </select>
          </div>
        )}
        {t === "tank" && (
          <div>
            <label htmlFor={id("ts")} className={labelCls}>Tank location</label>
            <select id={id("ts")} className={field} value={e.tankSite ?? "none"} onChange={(ev) => onChange({ tankSite: ev.target.value as EquipmentInput["tankSite"] })}>
              <option value="none">Other</option>
              <option value="bulk-gasoline-plant">Bulk gasoline plant</option>
              <option value="service-station">Gasoline service station</option>
            </select>
          </div>
        )}
        {t === "tank" && oilGas && num("vocTpy", "Potential VOC, tpy (oil and gas)")}
        {t === "tank" && oilGas && num("ch4Tpy", "Potential methane, tpy (oil and gas)")}
        {og && (
          <div>
            <label htmlFor={id("site")} className={labelCls}>Site type</label>
            <select id={id("site")} className={field} value={e.site ?? "other"} onChange={(ev) => onChange({ site: ev.target.value as Site })}>
              {(Object.keys(siteLabels) as Site[]).map((k) => <option key={k} value={k}>{siteLabels[k]}</option>)}
            </select>
          </div>
        )}
        {t === "centrifugal-compressor" && triSelect("wetSeals", "Wet seals?")}
        {(t === "pneumatic-controller" || t === "pneumatic-pump") && triSelect("gasDriven", "Natural gas-driven?")}
        {t === "pneumatic-controller" && triSelect("continuousBleed", "Continuous bleed?")}
        {t === "pneumatic-controller" && num("bleedScfh", "Bleed rate, scfh")}
      </div>
      {(engine || t === "boiler" || t === "turbine" || t === "tank") && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {(engine || t === "turbine") && check("emergency", "Emergency unit")}
          {t === "ci-engine" && check("firePump", "Certified NFPA fire pump engine")}
          {t === "boiler" && check("temporary", "Temporary boiler")}
          {t === "tank" && check("beforeCustody", "Stores petroleum or condensate before custody transfer")}
        </div>
      )}
      {t === "flare" && <p className="mt-3 text-xs text-muted">Flares are screened by the subparts that send gas to them. Add those units too.</p>}
      {og && !oilGas && <p className="mt-3 text-xs text-amber-800">Tick &ldquo;Crude oil or natural gas site&rdquo; above if this site is in that source category.</p>}
    </li>
  );
}
