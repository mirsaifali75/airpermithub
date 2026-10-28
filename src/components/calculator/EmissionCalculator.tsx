"use client";

import { Copy, Download, FileDown, FlaskConical, FolderPlus, Info, Printer, Save, Sigma, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CitationBadge, DemoBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { annualize, getMethod, type CalcStep } from "@/lib/calc/methods";
import { pollutants, type Pollutant } from "@/lib/data/equipment";

interface FactorSource {
  reference: string;
  url: string;
  revision: string;
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

/** Calculation set persists in this browser until accounts launch (shared across calculators and the dashboard). */
export const CALC_STORE = "aph.calc.saved.v1";

const fmt = (n: number) =>
  !Number.isFinite(n) ? "—" : n === 0 ? "0" : Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Math.abs(n) >= 1 ? n.toFixed(3) : n.toPrecision(3);

const GHG = new Set<Pollutant>(["CO2", "CH4", "N2O"]);

export function EmissionCalculator({ methodSlug }: { methodSlug: string }) {
  const method = getMethod(methodSlug)!;
  const uid = useId();

  const blankInputs = Object.fromEntries(method.inputs.map((i) => [i.key, ""]));
  const blankFactors = Object.fromEntries(method.factors.map((f) => [f.key, ""]));

  const [sourceName, setSourceName] = useState("");
  const [pollutant, setPollutant] = useState<Pollutant>("NOx");
  const [inputs, setInputs] = useState<Record<string, string>>(blankInputs);
  const [factors, setFactors] = useState<Record<string, string>>(blankFactors);
  const [factorSource, setFactorSource] = useState<FactorSource>({ reference: "", url: "", revision: "" });
  const [control, setControl] = useState("0");
  const [hours, setHours] = useState("8760");
  const [gwp, setGwp] = useState("");
  const [usedDemo, setUsedDemo] = useState(false);
  const [saved, setSaved] = useState<SavedCalc[]>([]);
  const loaded = useRef(false);
  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(CALC_STORE) ?? "[]")); } catch {}
  }, []);
  useEffect(() => {
    // Skip the first run so the empty initial state never overwrites stored work.
    if (!loaded.current) { loaded.current = true; return; }
    try { localStorage.setItem(CALC_STORE, JSON.stringify(saved)); } catch {}
  }, [saved]);

  const parsed = useMemo(() => {
    const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
    const i = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, num(v)]));
    const f = Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, num(v)]));
    const h = num(hours);
    const missing = [
      ...method.inputs.filter((x) => !Number.isFinite(i[x.key])).map((x) => x.label),
      ...method.factors.filter((x) => !Number.isFinite(f[x.key])).map((x) => x.label),
      ...(!Number.isFinite(h) ? ["Operating hours"] : []),
    ];
    const negative = [...Object.values(i), ...Object.values(f)].some((v) => v < 0);
    return { i, f, h, missing, negative };
  }, [inputs, factors, hours, method]);

  const ready = parsed.missing.length === 0 && !parsed.negative && parsed.h > 0 && parsed.h <= 8784;
  const result = useMemo(() => {
    if (!ready) return null;
    const base = method.compute({ ...parsed.i, __hours: parsed.h }, parsed.f);
    return annualize(base, Number(control) || 0, parsed.h);
  }, [ready, parsed, control, method]);

  const gwpNum = pollutant === "CO2" ? 1 : Number(gwp);
  const co2eTpy = result && GHG.has(pollutant) && gwpNum > 0 ? result.tpy * gwpNum : null;

  const fillDemo = () => {
    setInputs(Object.fromEntries(method.inputs.map((i) => [i.key, String(i.demo)])));
    setFactors(Object.fromEntries(method.factors.map((f) => [f.key, String(f.demo)])));
    setFactorSource({ reference: "DEMO VALUE: illustrative only, no source", url: "", revision: "" });
    setSourceName((n) => n || `Demo ${method.name.toLowerCase()} unit`);
    setUsedDemo(true);
  };

  const clearAll = () => {
    setInputs(blankInputs);
    setFactors(blankFactors);
    setFactorSource({ reference: "", url: "", revision: "" });
    setUsedDemo(false);
  };

  const addToSet = () => {
    if (!result) return;
    setSaved((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        sourceName: sourceName || `${method.name} source`,
        method: method.name,
        pollutant,
        lbPerHr: result.controlledLbPerHr,
        lbPerDay: result.lbPerDay,
        tpy: result.tpy,
        co2eTpy,
        usedDemo,
        factorRef: factorSource.reference || "Not provided",
        steps: result.steps,
        savedAt: new Date().toISOString(),
      },
    ]);
  };

  const exportCsv = () => {
    const rows = [
      ["Source", "Method", "Pollutant", "lb/hr", "lb/day", "tons/yr", "CO2e tons/yr", "Factor reference", "Demo values"],
      ...saved.map((c) => [c.sourceName, c.method, c.pollutant, c.lbPerHr, c.lbPerDay, c.tpy, c.co2eTpy ?? "", c.factorRef, c.usedDemo ? "YES - not for regulatory use" : "no"]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "airpermithub-calculations.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of saved) m.set(c.pollutant, (m.get(c.pollutant) ?? 0) + c.tpy);
    return [...m.entries()];
  }, [saved]);

  const field = "h-11 w-full rounded-xl border border-line bg-white px-3 text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* Inputs */}
        <form className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Input assumptions</h2>
            <div className="flex gap-2">
              <Button type="button" variant="subtle" size="sm" onClick={fillDemo}>
                <FlaskConical className="h-4 w-4" aria-hidden="true" /> Fill demo values
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-name`} className="mb-1.5 block text-sm font-semibold text-ink">Source name / ID</label>
              <input id={`${uid}-name`} className={field} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g., ENG-1" />
            </div>
            <div>
              <label htmlFor={`${uid}-pol`} className="mb-1.5 block text-sm font-semibold text-ink">Pollutant</label>
              <select id={`${uid}-pol`} className={field} value={pollutant} onChange={(e) => setPollutant(e.target.value as Pollutant)}>
                {pollutants.filter((p) => p !== "CO2e").map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold tracking-wide text-muted uppercase">Activity data</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {method.inputs.map((inp) => (
                <NumberField key={inp.key} id={`${uid}-${inp.key}`} label={inp.label} unit={inp.unit} help={inp.help} min={inp.min} max={inp.max} step={inp.step}
                  value={inputs[inp.key]} onChange={(v) => setInputs((s) => ({ ...s, [inp.key]: v }))} />
              ))}
              <NumberField id={`${uid}-hours`} label="Operating hours" unit="hr/yr" help="8,760 hr/yr for potential to emit unless an enforceable limit applies." min={0} max={8784} step={1} value={hours} onChange={setHours} />
              <NumberField id={`${uid}-ce`} label="Control efficiency" unit="%" help="Only claim control you can document and enforce." min={0} max={100} step={0.1} value={control} onChange={setControl} />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold tracking-wide text-muted uppercase">{method.factors.length ? "Emission factor" : "Data source"}</legend>
            <p className="mt-1 text-xs text-muted">{method.factorGuidance}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {method.factors.map((f) => (
                <NumberField key={f.key} id={`${uid}-${f.key}`} label={f.label} unit={f.unit} min={0} step="any"
                  value={factors[f.key]} onChange={(v) => setFactors((s) => ({ ...s, [f.key]: v }))} />
              ))}
              {GHG.has(pollutant) && pollutant !== "CO2" && (
                <NumberField id={`${uid}-gwp`} label={`${pollutant} global warming potential`} unit="×" min={0} step="any" value={gwp} onChange={setGwp}
                  help="Enter the GWP required by your reporting program and cite it." />
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label htmlFor={`${uid}-ref`} className="mb-1.5 block text-sm font-semibold text-ink">Factor source / reference</label>
                <input id={`${uid}-ref`} className={field} value={factorSource.reference} onChange={(e) => setFactorSource((s) => ({ ...s, reference: e.target.value }))} placeholder="Document, section, table" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${uid}-url`} className="mb-1.5 block text-sm font-semibold text-ink">Source URL</label>
                <input id={`${uid}-url`} type="url" className={field} value={factorSource.url} onChange={(e) => setFactorSource((s) => ({ ...s, url: e.target.value }))} placeholder="https://" />
              </div>
              <div>
                <label htmlFor={`${uid}-rev`} className="mb-1.5 block text-sm font-semibold text-ink">Revision date</label>
                <input id={`${uid}-rev`} className={field} value={factorSource.revision} onChange={(e) => setFactorSource((s) => ({ ...s, revision: e.target.value }))} placeholder="YYYY-MM" />
              </div>
            </div>
          </fieldset>

          {parsed.negative && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Values cannot be negative.</p>}
          {!(parsed.h > 0 && parsed.h <= 8784) && Number.isFinite(parsed.h) && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Operating hours must be between 0 and 8,784.</p>
          )}
        </form>

        {/* Results + methodology */}
        <div className="space-y-6">
          <section aria-live="polite" className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink">Calculation result</h2>
              {usedDemo && <DemoBadge>Demo values: not for regulatory use</DemoBadge>}
            </div>
            {result ? (
              <>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "lb/hr", value: result.controlledLbPerHr },
                    { label: "lb/day", value: result.lbPerDay },
                    { label: "tons/yr", value: result.tpy, emphasis: true },
                  ].map((r) => (
                    <div key={r.label} className={cn("rounded-xl p-3 sm:p-4", r.emphasis ? "bg-navy-900 text-white" : "bg-canvas")}>
                      <dt className={cn("text-xs font-semibold", r.emphasis ? "text-cyan-400" : "text-muted")}>{pollutant} · {r.label}</dt>
                      <dd className="mt-1 font-display text-xl font-extrabold tabular-nums sm:text-2xl">{fmt(r.value)}</dd>
                    </div>
                  ))}
                </dl>
                {co2eTpy !== null && (
                  <p className="mt-3 rounded-xl bg-eco-50 px-4 py-2.5 text-sm text-eco-700">CO2e: <strong className="tabular-nums">{fmt(co2eTpy)}</strong> tons/yr ({pollutant} × GWP {gwpNum})</p>
                )}
                <p className="mt-3 text-xs text-muted">Annual emissions assume {Number(hours).toLocaleString()} hr/yr{Number(control) > 0 ? ` and ${control}% control` : ""}.</p>
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">
                Enter {parsed.missing.length ? parsed.missing.slice(0, 3).join(", ").toLowerCase() : "valid values"}{parsed.missing.length > 3 ? ", …" : ""} to see results, or fill demo values to explore.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <Button size="sm" onClick={addToSet} disabled={!result}><Copy className="h-4 w-4" aria-hidden="true" /> Add to calculation set</Button>
              <Button size="sm" variant="subtle" disabled title="Requires an account (coming soon)"><Save className="h-4 w-4" aria-hidden="true" /> Save</Button>
              <Button size="sm" variant="subtle" disabled title="Requires an account (coming soon)"><FolderPlus className="h-4 w-4" aria-hidden="true" /> Add to Facility</Button>
              <Button size="sm" variant="subtle" onClick={() => window.print()} disabled={!result}><Printer className="h-4 w-4" aria-hidden="true" /> Export PDF</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Sigma className="h-5 w-5 text-brand-500" aria-hidden="true" /> Calculation methodology</h2>
            <p className="mt-2 text-sm text-slate-700">{method.methodology}</p>
            <div className="mt-4 rounded-xl bg-navy-950 px-4 py-3 font-mono text-sm text-cyan-300">{method.formula}</div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-canvas p-3">
                <dt className="text-xs font-semibold text-muted uppercase">Emission factor</dt>
                <dd className="mt-1 text-ink">
                  {method.factors.length === 0 && <span className="block">None: mass balance from measured or engineered inputs.</span>}
                  {method.factors.map((f) => (
                    <span key={f.key} className="block tabular-nums">{f.label}: {factors[f.key] || "—"} {f.unit}</span>
                  ))}
                </dd>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <dt className="text-xs font-semibold text-muted uppercase">Source / reference</dt>
                <dd className={cn("mt-1", factorSource.reference ? "text-ink" : "text-amber-700")}>
                  {factorSource.reference || "Not provided. Results without a cited factor are not defensible."}
                  {factorSource.revision && <span className="block text-xs text-muted">Revision: {factorSource.revision}</span>}
                  {factorSource.url && <a href={factorSource.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-brand-600 hover:underline">{factorSource.url}</a>}
                </dd>
              </div>
            </dl>

            {result && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">Step-by-step</h3>
                <ol className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {result.steps.map((s, idx) => (
                    <li key={idx} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-3">
                      <span className="font-medium text-ink">{idx + 1}. {s.label}</span>
                      <span className="font-mono text-xs text-muted">{s.expression}</span>
                      <span className="font-semibold text-ink tabular-nums sm:text-right">= {fmt(s.value)} {s.unit}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Session calculation set */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Calculation set</h2>
            <p className="text-sm text-muted">Add several sources or pollutants and total them. Stored in this browser tab only until accounts launch.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="subtle" onClick={exportCsv} disabled={!saved.length}><Download className="h-4 w-4" aria-hidden="true" /> Export Excel (CSV)</Button>
            <Button size="sm" variant="ghost" onClick={() => setSaved([])} disabled={!saved.length}><Trash2 className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        {saved.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-4 py-4 text-sm text-muted"><Info className="h-4 w-4" aria-hidden="true" /> No calculations added yet.</p>
        ) : (
          <>
            {/* Cards on mobile, table on larger screens */}
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
                  <tr><th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Method</th><th className="px-4 py-2.5">Pollutant</th><th className="px-4 py-2.5 text-right">lb/hr</th><th className="px-4 py-2.5 text-right">lb/day</th><th className="px-4 py-2.5 text-right">tons/yr</th><th className="px-4 py-2.5">Factor reference</th></tr>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {totals.map(([p, t]) => (
                <span key={p} className="rounded-xl bg-navy-900 px-3 py-2 text-sm text-white"><span className="text-cyan-400">{p}</span> total <strong className="tabular-nums">{fmt(t)}</strong> tpy</span>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><FileDown className="h-3.5 w-3.5" aria-hidden="true" /> Native Excel and PDF exports with full methodology arrive with saved accounts. <CitationBadge>Coming soon</CitationBadge></p>
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
