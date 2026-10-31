"use client";

import {
  ArrowRight, BookMarked, BookmarkPlus, Copy, CopyPlus, Download, ExternalLink, FlaskConical, FolderPlus, Info, Plus, Printer, RotateCcw, Sigma, Trash2, TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useStoredState } from "@/components/tools/shared";
import { DemoBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { factorLibrary, factorsFor, MY_FACTORS_STORE, sameFactor, type EmissionFactorRecord } from "@/lib/calc/factors";
import { annualize, getMethod, type AnnualizedResult, type CalcStep } from "@/lib/calc/methods";
import { quoteHref } from "@/lib/tools/rule-text";
import { pollutants, type Pollutant } from "@/lib/data/equipment";

interface FactorSource {
  reference: string;
  section?: string;
  url: string;
  revision: string;
  rating?: string;
}

/** One pollutant in the calculation: its factors, per-pollutant inputs, control, and citation. */
interface PollutantRow {
  id: string;
  pollutant: Pollutant;
  values: Record<string, string>;
  control: string;
  gwp: string;
  source: FactorSource;
}

interface SavedCalc {
  id: string;
  sourceName: string;
  method: string;
  pollutant: Pollutant;
  lbPerHr: number;
  lbPerDay: number;
  tpy: number;
  co2eTpy: number | null;
  usedDemo: boolean;
  factorRef: string;
  steps: CalcStep[];
  savedAt?: string;
}

export interface RelatedRule {
  slug: string;
  shortName: string;
  citation: string;
}

/** Calculation set persists in this browser until accounts launch (shared across calculators and the dashboard). */
export const CALC_STORE = "aph.calc.saved.v1";

const fmt = (n: number) =>
  !Number.isFinite(n) ? "—" : n === 0 ? "0" : Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Math.abs(n) >= 1 ? n.toFixed(3) : n.toPrecision(3);

const GHG = new Set<Pollutant>(["CO2", "CH4", "N2O"]);
const pollutantChoices = pollutants.filter((p) => p !== "CO2e");
const num = (v: string | undefined) => (v === undefined || v.trim() === "" ? NaN : Number(v));
const blankSource: FactorSource = { reference: "", section: "", url: "", revision: "", rating: "" };
const tabLabels = ["Inputs", "Method & Factors", "Results", "References"] as const;

/** In-progress inputs for one calculator, kept in this browser so a reload doesn't lose them. */
interface Draft {
  sourceName: string;
  inputs: Record<string, string>;
  hours: string;
  rows: PollutantRow[];
  usedDemo: boolean;
}

interface RowResult {
  row: PollutantRow;
  result: AnnualizedResult | null;
  missing: string[];
  co2eTpy: number | null;
  gwp: number;
}

export function EmissionCalculator({ methodSlug, related = [] }: { methodSlug: string; related?: RelatedRule[] }) {
  const method = getMethod(methodSlug)!;
  const uid = useId();

  const sharedInputs = useMemo(() => method.inputs.filter((i) => !i.perPollutant), [method]);
  const rowFields = useMemo(() => [...method.inputs.filter((i) => i.perPollutant), ...method.factors], [method]);
  const initialValue = (f: object) => ("initial" in f && typeof f.initial === "number" ? String(f.initial) : "");
  const newRow = (pollutant: Pollutant): PollutantRow => ({
    id: crypto.randomUUID(), pollutant, values: Object.fromEntries(rowFields.map((f) => [f.key, initialValue(f)])), control: "0", gwp: "", source: { ...blankSource },
  });
  const blankInputs = () => Object.fromEntries(sharedInputs.map((i) => [i.key, initialValue(i)]));
  const blankDraft = (): Draft => ({ sourceName: "", inputs: blankInputs(), hours: "8760", rows: [newRow(method.slug === "tank-losses" ? "VOC" : "NOx")], usedDemo: false });

  const [tab, setTab] = useState(0);
  const [draft, setDraft] = useStoredState<Draft>(`aph.calc.draft.${method.slug}.v1`, blankDraft());
  const { sourceName, hours, rows, usedDemo } = draft;
  const inputs = useMemo(() => ({ ...blankInputs(), ...draft.inputs }), [draft.inputs]); // eslint-disable-line react-hooks/exhaustive-deps
  const setter = <K extends keyof Draft>(k: K) => (v: Draft[K] | ((prev: Draft[K]) => Draft[K])) =>
    setDraft((d) => ({ ...d, [k]: typeof v === "function" ? (v as (prev: Draft[K]) => Draft[K])(d[k]) : v }));
  const setSourceName = setter("sourceName");
  const setInputs = setter("inputs");
  const setHours = setter("hours");
  const setRows = setter("rows");
  const setUsedDemo = setter("usedDemo");
  const [myFactors, setMyFactors] = useStoredState<EmissionFactorRecord[]>(MY_FACTORS_STORE, []);
  const knownFactors = useMemo(() => [...factorLibrary, ...myFactors], [myFactors]);
  const [saved, setSaved] = useState<SavedCalc[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(CALC_STORE) ?? "[]")); } catch {}
  }, []);
  useEffect(() => {
    // Skip the first run so the empty initial state never overwrites stored work.
    if (!loaded.current) { loaded.current = true; return; }
    try { localStorage.setItem(CALC_STORE, JSON.stringify(saved)); } catch {}
  }, [saved]);

  const shared = useMemo(() => {
    const values = Object.fromEntries(sharedInputs.map((x) => [x.key, num(inputs[x.key])]));
    const h = num(hours);
    const missing = [...sharedInputs.filter((x) => !Number.isFinite(values[x.key])).map((x) => x.label), ...(!Number.isFinite(h) ? ["Operating hours"] : [])];
    const negative = Object.values(values).some((v) => v < 0);
    const hoursValid = h > 0 && h <= 8784;
    const invalid = missing.length === 0 && !negative ? method.validate?.(values) ?? null : null;
    return { values, h, missing, negative, hoursValid, invalid };
  }, [inputs, hours, sharedInputs, method]);

  const results: RowResult[] = useMemo(() => rows.map((row) => {
    const vals = Object.fromEntries(rowFields.map((f) => [f.key, num(row.values[f.key])]));
    const missing = rowFields.filter((f) => !Number.isFinite(vals[f.key])).map((f) => f.label);
    const ce = row.control.trim() === "" ? 0 : Number(row.control);
    const gwp = row.pollutant === "CO2" ? 1 : num(row.gwp);
    const blocked = shared.missing.length > 0 || shared.negative || !shared.hoursValid || !!shared.invalid || missing.length > 0
      || Object.values(vals).some((v) => v < 0) || !(ce >= 0 && ce <= 100);
    if (blocked) return { row, result: null, missing, co2eTpy: null, gwp };
    const perPollutant = Object.fromEntries(method.inputs.filter((i) => i.perPollutant).map((i) => [i.key, vals[i.key]]));
    const factors = Object.fromEntries(method.factors.map((f) => [f.key, vals[f.key]]));
    const base = method.compute({ ...shared.values, ...perPollutant, __hours: shared.h }, factors);
    const result = annualize(base, ce, shared.h);
    const co2eTpy = GHG.has(row.pollutant) && gwp > 0 ? result.tpy * gwp : null;
    return { row, result, missing, co2eTpy, gwp };
  }), [rows, shared, method, rowFields]);

  const ready = results.filter((r) => r.result);

  const updateRow = (id: string, patch: Partial<PollutantRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow(pollutantChoices.find((p) => !rs.some((r) => r.pollutant === p)) ?? "NOx")]);
  const duplicateRow = (row: PollutantRow) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === row.id);
      const copy = { ...row, id: crypto.randomUUID(), values: { ...row.values }, source: { ...row.source } };
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
  const removeRow = (id: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));

  const fillDemo = () => {
    setInputs(Object.fromEntries(sharedInputs.map((i) => [i.key, String(i.demo)])));
    setRows((rs) => rs.map((r, idx) => idx === 0
      ? { ...r, values: Object.fromEntries(rowFields.map((f) => [f.key, String(f.demo)])), source: { ...blankSource, reference: method.demoNote ?? "DEMO VALUE: illustrative only, no source" } }
      : r));
    setSourceName((n) => n || `Demo ${method.name.toLowerCase()} unit`);
    setUsedDemo(true);
  };

  const reset = () => {
    setDraft(blankDraft());
    setNotice(null);
    setTab(0);
  };

  /** Keeps this row's factors, with their citation, for reuse in any calculator. */
  const saveFactors = (row: PollutantRow) => {
    const records: EmissionFactorRecord[] = method.factors
      .filter((f) => Number.isFinite(num(row.values[f.key])))
      .map((f) => ({
        id: crypto.randomUUID(), origin: "user", method: method.slug, factorKey: f.key, sourceCategory: `${method.equipmentCategory}: ${f.label}`,
        pollutant: row.pollutant, value: num(row.values[f.key]), units: f.unit, referenceDocument: row.source.reference.trim(),
        sectionTable: (row.source.section ?? "").trim(), revisionDate: row.source.revision.trim(), url: row.source.url.trim(),
        rating: (row.source.rating ?? "").trim(), notes: "", versions: [],
      }));
    const fresh = records.filter((r) => !knownFactors.some((k) => sameFactor(k, r)));
    setMyFactors((m) => [...m, ...fresh]);
    setNotice(fresh.length ? `Saved ${fresh.length} factor${fresh.length > 1 ? "s" : ""} to My factors. Pick ${fresh.length > 1 ? "them" : "it"} from the list next time.` : "Those factors are already in My factors.");
  };
  const applyFactor = (row: PollutantRow, key: string, rec: EmissionFactorRecord) =>
    updateRow(row.id, {
      values: { ...row.values, [key]: String(rec.value) },
      source: { reference: rec.referenceDocument, section: rec.sectionTable, url: rec.url, revision: rec.revisionDate, rating: rec.rating },
    });

  const addToSet = () => {
    if (ready.length === 0) return;
    const now = new Date().toISOString();
    setSaved((s) => [
      ...s,
      ...ready.map(({ row, result, co2eTpy }) => ({
        id: crypto.randomUUID(),
        sourceName: sourceName || `${method.name} source`,
        method: method.name,
        pollutant: row.pollutant,
        lbPerHr: result!.controlledLbPerHr,
        lbPerDay: result!.lbPerDay,
        tpy: result!.tpy,
        co2eTpy,
        usedDemo,
        factorRef: row.source.reference || "Not provided",
        steps: result!.steps,
        savedAt: now,
      })),
    ]);
    setNotice(`Added ${ready.length} pollutant${ready.length > 1 ? "s" : ""} to the calculation set below.`);
  };

  const download = (name: string, rowsOut: (string | number)[][]) => {
    const csv = rowsOut.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  /** One file with everything needed to reproduce this calculation. */
  const exportThis = () => {
    const out: (string | number)[][] = [
      ["AirPermitHub calculation", method.title],
      ["Screening estimate. Check every input and factor against its source before using the result in a permit application or report."],
      ["Source", sourceName || "Not named"],
      ["Formula", method.formula],
      ...method.variables.map((v) => [`  ${v.symbol}`, v.meaning, v.unit]),
      ["Exported", new Date().toISOString()],
      ["Demo values", usedDemo ? "YES - not for regulatory use" : "no"],
      [],
      ["Input", "Value", "Unit"],
      ...sharedInputs.map((i) => [i.label, inputs[i.key], i.unit]),
      ["Operating hours", hours, "hr/yr"],
      [],
      ["Pollutant", ...rowFields.map((f) => `${f.label} (${f.unit})`), "Control efficiency (%)", "GWP", "Uncontrolled lb/hr", "Controlled lb/hr", "lb/day", "tons/yr", "CO2e tons/yr", "Factor reference", "Section / table", "Revision", "Source URL", "Rating"],
      ...results.map(({ row, result, co2eTpy, gwp }) => [
        row.pollutant, ...rowFields.map((f) => row.values[f.key]), row.control, GHG.has(row.pollutant) && gwp > 0 ? gwp : "",
        result?.lbPerHr ?? "", result?.controlledLbPerHr ?? "", result?.lbPerDay ?? "", result?.tpy ?? "", co2eTpy ?? "",
        row.source.reference, row.source.section ?? "", row.source.revision, row.source.url, row.source.rating ?? "",
      ]),
      [],
      ["Pollutant", "Step", "Expression", "Value", "Unit"],
      ...ready.flatMap(({ row, result }) => result!.steps.map((s) => [row.pollutant, s.label, s.expression, s.value, s.unit])),
      ...(method.basis?.length ? [[], ["Method basis (verbatim)", "Source", "URL"], ...method.basis.map((q) => [q.text, q.cite, quoteHref(q) ?? ""])] : []),
    ];
    download(`airpermithub-${method.slug}${sourceName ? `-${sourceName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : ""}.csv`, out);
  };

  const exportSet = () =>
    download("airpermithub-calculation-set.csv", [
      ["Source", "Method", "Pollutant", "lb/hr", "lb/day", "tons/yr", "CO2e tons/yr", "Factor reference", "Demo values", "Saved"],
      ...saved.map((c) => [c.sourceName, c.method, c.pollutant, c.lbPerHr, c.lbPerDay, c.tpy, c.co2eTpy ?? "", c.factorRef, c.usedDemo ? "YES - not for regulatory use" : "no", c.savedAt ?? ""]),
    ]);

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of saved) m.set(c.pollutant, (m.get(c.pollutant) ?? 0) + c.tpy);
    return [...m.entries()];
  }, [saved]);

  const field = "h-11 w-full rounded-xl border border-line bg-white px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";
  const blocker = shared.missing.length
    ? `Enter ${shared.missing.slice(0, 3).join(", ").toLowerCase()}${shared.missing.length > 3 ? ", …" : ""} on the Inputs tab.`
    : shared.negative ? "Inputs cannot be negative." : !shared.hoursValid ? "Operating hours must be between 0 and 8,784." : shared.invalid;

  const actions = (
    <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
      <Button size="sm" onClick={addToSet} disabled={ready.length === 0}><Copy className="h-4 w-4" aria-hidden="true" /> Save to calculation set</Button>
      <Button size="sm" variant="subtle" onClick={exportThis} disabled={ready.length === 0}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
      <Button size="sm" variant="subtle" onClick={() => window.print()} disabled={ready.length === 0}><Printer className="h-4 w-4" aria-hidden="true" /> Export PDF</Button>
      <Button size="sm" variant="subtle" disabled title="Requires an account (coming soon)"><FolderPlus className="h-4 w-4" aria-hidden="true" /> Add to Facility</Button>
      <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset</Button>
    </div>
  );

  const resultsTable = (
    <section aria-live="polite" aria-labelledby={`${uid}-res`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${uid}-res`} className="text-lg font-bold text-ink">Emissions results</h2>
        {usedDemo && <DemoBadge>Demo values: not for regulatory use</DemoBadge>}
      </div>
      {blocker && <p className="mt-3 rounded-xl bg-canvas px-4 py-3 text-sm text-muted">{blocker}</p>}
      {/* Cards on mobile, table on larger screens */}
      <ul className="mt-3 space-y-2 sm:hidden">
        {results.map(({ row, result, missing, co2eTpy }) => (
          <li key={row.id} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-semibold text-ink">{row.pollutant}</p>
            {result ? (
              <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
                <dt className="text-muted">Uncontrolled</dt><dd className="text-right">{fmt(result.lbPerHr)} lb/hr</dd>
                <dt className="text-muted">Controlled</dt><dd className="text-right">{fmt(result.controlledLbPerHr)} lb/hr</dd>
                <dt className="text-muted">Annual</dt><dd className="text-right font-semibold">{fmt(result.tpy)} tons/yr</dd>
                {co2eTpy !== null && <><dt className="text-muted">CO2e</dt><dd className="text-right">{fmt(co2eTpy)} tons/yr</dd></>}
              </dl>
            ) : <p className="mt-1 text-xs text-muted">{missing.length ? `Needs ${missing.join(", ").toLowerCase()}` : "Waiting for inputs"}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line sm:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Uncontrolled and controlled emissions by pollutant</caption>
          <thead className="bg-canvas text-left text-xs text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-2.5">Pollutant</th>
              <th scope="col" className="px-4 py-2.5 text-right">Uncontrolled <span className="normal-case">(lb/hr)</span></th>
              <th scope="col" className="px-4 py-2.5 text-right">Controlled <span className="normal-case">(lb/hr)</span></th>
              <th scope="col" className="px-4 py-2.5 text-right">Controlled <span className="normal-case">(lb/day)</span></th>
              <th scope="col" className="px-4 py-2.5 text-right">Controlled <span className="normal-case">(tons/yr)</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {results.map(({ row, result, missing, co2eTpy, gwp }) => (
              <tr key={row.id}>
                <th scope="row" className="px-4 py-2.5 text-left font-semibold text-ink">{row.pollutant}</th>
                {result ? (
                  <>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(result.lbPerHr)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(result.controlledLbPerHr)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(result.lbPerDay)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {fmt(result.tpy)}
                      {co2eTpy !== null && <span className="block text-xs font-normal text-eco-700">CO2e {fmt(co2eTpy)} (GWP {gwp})</span>}
                    </td>
                  </>
                ) : (
                  <td colSpan={4} className="px-4 py-2.5 text-xs text-muted">{missing.length ? `Needs ${missing.join(", ").toLowerCase()} (Method & Factors tab)` : "Waiting for inputs"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Annual values assume {Number(hours).toLocaleString()} hr/yr and each pollutant&apos;s control efficiency.</p>
      {notice && <p role="status" className="mt-3 rounded-xl bg-eco-50 px-4 py-2.5 text-sm text-eco-700">{notice}</p>}
    </section>
  );

  const inputsPanel = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Activity data shared by every pollutant. Factors and control efficiency are on <button type="button" className="font-semibold text-brand-600 hover:text-brand-700" onClick={() => setTab(1)}>Method & Factors</button>.</p>
        <Button type="button" variant="subtle" size="sm" onClick={fillDemo}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Fill demo values</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="mb-1.5 block text-sm font-semibold text-ink">Source name / ID</label>
          <input id={`${uid}-name`} className={field} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g., ENG-1" />
        </div>
        {sharedInputs.map((inp) => (
          <NumberField key={inp.key} id={`${uid}-${inp.key}`} label={inp.label} unit={inp.unit} help={inp.help} min={inp.min} max={inp.max} step={inp.step}
            value={inputs[inp.key]} onChange={(v) => setInputs((s) => ({ ...s, [inp.key]: v }))} />
        ))}
        <NumberField id={`${uid}-hours`} label="Operating hours" unit="hr/yr" help="8,760 hr/yr for potential to emit unless an enforceable limit applies." min={0} max={8784} step={1} value={hours} onChange={setHours} />
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setTab(1)}>Next: Method & Factors <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
      </div>
    </div>
  );

  const methodPanel = (
    <div className="space-y-6">
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Sigma className="h-5 w-5 text-brand-500" aria-hidden="true" /> Method</h2>
        <p className="mt-2 text-sm text-slate-700">{method.methodology}</p>
        <div className="mt-3 overflow-x-auto rounded-xl bg-navy-950 px-4 py-3 font-mono text-sm text-cyan-300">{method.formula}</div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Symbols in the formula</caption>
            <thead className="bg-canvas text-left text-xs text-muted uppercase"><tr><th scope="col" className="px-3 py-2">Symbol</th><th scope="col" className="px-3 py-2">Meaning</th><th scope="col" className="px-3 py-2">Unit</th></tr></thead>
            <tbody className="divide-y divide-line">
              {method.variables.map((v) => (
                <tr key={v.symbol}><th scope="row" className="px-3 py-1.5 text-left font-mono font-semibold whitespace-nowrap text-ink">{v.symbol}</th><td className="px-3 py-1.5 text-slate-700">{v.meaning}</td><td className="px-3 py-1.5 whitespace-nowrap text-muted">{v.unit}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {method.basis && method.basis.length > 0 && (
          <details className="mt-3 rounded-xl border border-line bg-canvas px-4 py-3 text-sm" open={method.basis.length <= 3}>
            <summary className="cursor-pointer font-semibold text-ink">Official basis: the procedure&apos;s own words ({method.basis.length} {method.basis.length === 1 ? "quote" : "quotes"})</summary>
            <ul className="mt-2 space-y-2">
              {method.basis.map((q) => (
                <li key={q.text}>
                  <blockquote className="border-l-2 border-brand-200 pl-3 text-slate-700">&ldquo;{q.text}&rdquo;</blockquote>
                  <a href={quoteHref(q) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 pl-3 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    {q.cite} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{method.factors.length ? "AirPermitHub does not supply emission factors. " : ""}{method.factorGuidance}</span>
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Pollutants and factors</h2>
          <Button type="button" variant="subtle" size="sm" onClick={addRow}><Plus className="h-4 w-4" aria-hidden="true" /> Add pollutant</Button>
        </div>
        <ul className="mt-3 space-y-4">
          {rows.map((row, idx) => {
            const rid = `${uid}-r${idx}`;
            return (
              <li key={row.id} className="rounded-2xl border border-line p-4 sm:p-5">
                <fieldset className="space-y-4">
                  <legend className="sr-only">Pollutant {idx + 1}: {row.pollutant}</legend>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="w-40">
                      <label htmlFor={`${rid}-pol`} className="mb-1.5 block text-sm font-semibold text-ink">Pollutant</label>
                      <select id={`${rid}-pol`} className={field} value={row.pollutant} onChange={(e) => updateRow(row.id, { pollutant: e.target.value as Pollutant })}>
                        {pollutantChoices.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => duplicateRow(row)}><CopyPlus className="h-4 w-4" aria-hidden="true" /> Duplicate</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.id)} disabled={rows.length === 1}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>
                    </div>
                  </div>
                  {rowFields.length === 0 && <p className="text-sm text-muted">This method uses measured or engineered inputs only; no emission factor is needed.</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {rowFields.map((f) => {
                      const options = factorsFor(knownFactors, method.slug, f.key, f.unit).filter((r) => r.pollutant === row.pollutant);
                      return (
                        <div key={f.key}>
                          <NumberField id={`${rid}-${f.key}`} label={f.label} unit={f.unit} min={0} step="any"
                            value={row.values[f.key] ?? ""} onChange={(v) => updateRow(row.id, { values: { ...row.values, [f.key]: v } })} />
                          {options.length > 0 && (
                            <select aria-label={`Use a saved ${f.label.toLowerCase()} for ${row.pollutant}`} className="mt-1.5 h-9 w-full rounded-lg border border-line bg-white px-2 text-xs text-ink" value=""
                              onChange={(e) => { const rec = options.find((o) => o.id === e.target.value); if (rec) applyFactor(row, f.key, rec); }}>
                              <option value="">Use a saved factor ({options.length})</option>
                              {options.map((o) => <option key={o.id} value={o.id}>{o.value} {o.units}: {o.referenceDocument || "no reference"}{o.sectionTable ? `, ${o.sectionTable}` : ""}{o.origin === "library" ? " (library)" : ""}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })}
                    <NumberField id={`${rid}-ce`} label="Control efficiency" unit="%" help="Only claim control you can document and enforce." min={0} max={100} step={0.1}
                      value={row.control} onChange={(v) => updateRow(row.id, { control: v })} />
                    {GHG.has(row.pollutant) && row.pollutant !== "CO2" && (
                      <NumberField id={`${rid}-gwp`} label={`${row.pollutant} global warming potential`} unit="×" min={0} step="any" value={row.gwp}
                        onChange={(v) => updateRow(row.id, { gwp: v })} help="Enter the GWP your reporting program requires and cite it." />
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label htmlFor={`${rid}-ref`} className="mb-1.5 block text-sm font-semibold text-ink">{method.factors.length ? "Factor source / reference" : "Input source / reference"}</label>
                      <input id={`${rid}-ref`} className={field} value={row.source.reference} onChange={(e) => updateRow(row.id, { source: { ...row.source, reference: e.target.value } })} placeholder="Document name" />
                    </div>
                    <div>
                      <label htmlFor={`${rid}-sec`} className="mb-1.5 block text-sm font-semibold text-ink">Section / table</label>
                      <input id={`${rid}-sec`} className={field} value={row.source.section ?? ""} onChange={(e) => updateRow(row.id, { source: { ...row.source, section: e.target.value } })} placeholder="e.g. Table 3.2-2" />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor={`${rid}-url`} className="mb-1.5 block text-sm font-semibold text-ink">Source URL</label>
                      <input id={`${rid}-url`} type="url" className={field} value={row.source.url} onChange={(e) => updateRow(row.id, { source: { ...row.source, url: e.target.value } })} placeholder="https://" />
                    </div>
                    <div>
                      <label htmlFor={`${rid}-rev`} className="mb-1.5 block text-sm font-semibold text-ink">Revision date</label>
                      <input id={`${rid}-rev`} className={field} value={row.source.revision} onChange={(e) => updateRow(row.id, { source: { ...row.source, revision: e.target.value } })} placeholder="YYYY-MM" />
                    </div>
                    {method.factors.length > 0 && (
                      <>
                        <div>
                          <label htmlFor={`${rid}-rat`} className="mb-1.5 block text-sm font-semibold text-ink">Rating / quality <span className="font-normal text-muted">(optional)</span></label>
                          <input id={`${rid}-rat`} className={field} value={row.source.rating ?? ""} onChange={(e) => updateRow(row.id, { source: { ...row.source, rating: e.target.value } })} placeholder="e.g. A" />
                        </div>
                        <div className="flex items-end sm:col-span-2">
                          <Button type="button" variant="subtle" size="sm" onClick={() => saveFactors(row)}
                            disabled={!row.source.reference.trim() || !method.factors.some((f) => Number.isFinite(num(row.values[f.key]))) || row.source.reference.startsWith("DEMO")}
                            title="Needs a factor value and a reference">
                            <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> Save to My factors
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setTab(2)}>See results <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
      </div>
    </div>
  );

  const resultsPanel = (
    <div className="space-y-6">
      {resultsTable}
      {ready.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Step-by-step</h2>
          <div className="mt-3 space-y-3">
            {ready.map(({ row, result }) => (
              <details key={row.id} open={ready.length === 1} className="group rounded-xl border border-line">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">{row.pollutant}: {result!.steps.length} steps</summary>
                <ol className="divide-y divide-line border-t border-line">
                  {result!.steps.map((s, i) => (
                    <li key={i} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                      <span className="font-medium text-ink">{i + 1}. {s.label}</span>
                      <span className="font-mono text-xs break-words text-muted">{s.expression}</span>
                      <span className="font-semibold text-ink tabular-nums sm:text-right">= {fmt(s.value)} {s.unit}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const referencesPanel = (
    <div className="space-y-6">
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><BookMarked className="h-5 w-5 text-brand-500" aria-hidden="true" /> Factor references</h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {rows.map((row) => (
            <li key={row.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
              <span className="font-semibold text-ink">{row.pollutant}</span>
              {row.source.reference ? (
                <span className="min-w-0 text-slate-700">
                  {row.source.reference}
                  {row.source.section && <span className="text-muted"> · {row.source.section}</span>}
                  {row.source.revision && <span className="text-muted"> · Revision {row.source.revision}</span>}
                  {row.source.rating && <span className="text-muted"> · Rating {row.source.rating}</span>}
                  {row.source.url && (
                    <a href={row.source.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-xs text-brand-600 hover:underline">
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />{row.source.url}
                    </a>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-800"><TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" /> Not provided. Results without a cited factor are not defensible.</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{method.factorGuidance}</p>
      </section>
      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Related regulations</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/regulations/${r.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50">
                  {r.shortName} <span className="text-xs text-muted">{r.citation}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-slate-700">
        Methods define the math only. Every factor comes from the reference you enter, so the result is only as defensible as that reference.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <Tabs
          variant="underline"
          printAll
          selected={tab}
          onSelect={setTab}
          tabs={[
            { label: tabLabels[0], content: inputsPanel },
            { label: tabLabels[1], content: methodPanel, count: rows.length },
            { label: tabLabels[2], content: resultsPanel, count: ready.length },
            { label: tabLabels[3], content: referencesPanel },
          ]}
        />
        {tab !== 2 && <div className="no-print mt-8 border-t border-line pt-6">{resultsTable}</div>}
        {actions}
      </div>

      {/* Browser calculation set */}
      <section className="no-print rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Calculation set</h2>
            <p className="text-sm text-muted">Saved calculations from every calculator, totaled by pollutant. Kept in this browser until accounts launch.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="subtle" onClick={exportSet} disabled={!saved.length}><Download className="h-4 w-4" aria-hidden="true" /> Export Excel (CSV)</Button>
            <Button size="sm" variant="ghost" onClick={() => setSaved([])} disabled={!saved.length}><Trash2 className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {saved.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-4 py-4 text-sm text-muted"><Info className="h-4 w-4" aria-hidden="true" /> No calculations saved yet.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2 md:hidden">
              {saved.map((c) => (
                <li key={c.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex justify-between font-semibold text-ink"><span>{c.sourceName}</span><span>{c.pollutant}</span></div>
                  <div className="mt-1 text-muted">{c.method}{c.usedDemo && " · demo values"}</div>
                  <div className="mt-2 grid grid-cols-3 tabular-nums"><span>{fmt(c.lbPerHr)} lb/hr</span><span>{fmt(c.lbPerDay)} lb/d</span><span className="font-semibold">{fmt(c.tpy)} tpy</span></div>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-line md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Calculation set</caption>
                <thead className="bg-canvas text-left text-xs text-muted uppercase">
                  <tr><th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Method</th><th className="px-4 py-2.5">Pollutant</th><th className="px-4 py-2.5 text-right">lb/hr</th><th className="px-4 py-2.5 text-right">lb/day</th><th className="px-4 py-2.5 text-right">tons/yr</th><th className="px-4 py-2.5">Factor reference</th><th className="px-4 py-2.5"><span className="sr-only">Remove</span></th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {saved.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-medium text-ink">{c.sourceName}</td>
                      <td className="px-4 py-2.5">{c.method}</td>
                      <td className="px-4 py-2.5">{c.pollutant}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(c.lbPerHr)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(c.lbPerDay)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(c.tpy)}</td>
                      <td className="px-4 py-2.5 text-xs">{c.usedDemo ? <DemoBadge>Demo</DemoBadge> : c.factorRef}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button type="button" onClick={() => setSaved((s) => s.filter((x) => x.id !== c.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${c.sourceName} ${c.pollutant}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {totals.map(([p, t]) => (
                <span key={p} className={cn("rounded-xl bg-navy-900 px-3 py-2 text-sm text-white")}><span className="text-cyan-400">{p}</span> total <strong className="tabular-nums">{fmt(t)}</strong> tpy</span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function NumberField({ id, label, unit, help, value, onChange, min, max, step }: {
  id: string; label: string; unit: string; help?: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number | "any";
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      <div className="flex rounded-xl border border-line bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step ?? "any"} value={value} onChange={(e) => onChange(e.target.value)}
          aria-describedby={help ? `${id}-help` : undefined}
          className="h-11 min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-ink tabular-nums outline-none" />
        <span className="flex items-center rounded-r-xl border-l border-line bg-canvas px-3 text-xs font-medium whitespace-nowrap text-muted">{unit}</span>
      </div>
      {help && <p id={`${id}-help`} className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  );
}
