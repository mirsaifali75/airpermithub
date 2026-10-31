"use client";

import { Calculator, Check, Copy, Download, Printer } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { converterDefaults, fmt, getConverter } from "@/lib/tools/converters";
import { NumberField, downloadText, field, labelCls, toCsv } from "./shared";

/** Renders one converter by slug (definitions hold functions, so they load on the client). */
export function ConverterTool({ slug }: { slug: string }) {
  const c = getConverter(slug)!;
  const uid = useId();
  const [mode, setMode] = useState(c.modes?.[0].key ?? "fwd");
  const [v, setV] = useState<Record<string, number | null>>(() => converterDefaults(c));
  const out = c.compute(v, mode);
  const fields = c.fields.filter((f) => !f.modes || f.modes.includes(mode));
  const [copied, setCopied] = useState(false);
  const modeLabel = c.modes?.find((m) => m.key === mode)?.label;

  /** Inputs, results, and steps as plain lines, for a calculation record or an email. */
  const record = () => [
    `${c.name}${modeLabel ? ` (${modeLabel})` : ""}`,
    ...fields.map((f) => `${f.label}: ${v[f.key] ?? "(blank)"}${f.unit ? ` ${f.unit}` : ""}`),
    ...out.results.map((r) => `${r.label}: ${fmt(r.value)} ${r.unit}`),
    ...out.steps,
    "Calculated with AirPermitHub. Reference values (O2, F-factors, standard conditions, limits) come from your permit or rule.",
  ].join("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(record()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const exportCsv = () =>
    downloadText(`${c.slug}-${mode}.csv`, toCsv(`${c.name} Calculation Record`, [
      ["Engineering arithmetic only. Reference O2, F-factors, standard conditions, and limits come from your permit or rule."],
      ...(modeLabel ? [["Direction", modeLabel]] : []),
      [],
      ["Input", "Value", "Unit"], ...fields.map((f) => [f.label, v[f.key] ?? "", f.unit ?? ""]),
      [],
      ["Result", "Value", "Unit"], ...out.results.map((r) => [r.label, r.value, r.unit]),
      [],
      ["Steps"], ...out.steps.map((st) => [st]),
      [],
      ["Formula"], ...c.formula.map((f) => [f]),
      [],
      ["Source", "URL"], ...c.sources.map((src) => [src.title, src.url]),
    ]));

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="flex items-center gap-2 text-lg font-bold text-ink"><Calculator className="h-5 w-5 text-brand-500" aria-hidden="true" /> {c.name} calculator</h2>
      {c.modes && (
        <div className="mt-4 inline-flex rounded-xl bg-canvas p-1" role="radiogroup" aria-label="Direction">
          {c.modes.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} onClick={() => setMode(m.key)} className={cn("rounded-lg px-3.5 py-1.5 text-sm font-semibold", mode === m.key ? "bg-brand-600 text-white shadow-card" : "text-slate-600 hover:text-ink")}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {fields.map((f) => {
            const preset = c.presets?.find((p) => p.field === f.key);
            return (
              <div key={f.key}>
                <label htmlFor={`${uid}-${f.key}`} className={labelCls}>{f.label}{f.unit && <span className="font-normal text-muted"> ({f.unit})</span>}</label>
                <NumberField id={`${uid}-${f.key}`} value={v[f.key] ?? null} onChange={(nv) => setV((p) => ({ ...p, [f.key]: nv }))} className={cn(field, "h-11 text-base")} placeholder={f.default === null ? "Required" : undefined} />
                {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
                {preset && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`${preset.label} presets`}>
                    {preset.options.map((o) => (
                      <button key={o.label} type="button" onClick={() => setV((p) => ({ ...p, [f.key]: o.value }))} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", v[f.key] === o.value ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line hover:ring-brand-300")}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-4" aria-live="polite">
          {out.error ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{out.error}</p>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              {out.results.map((r, i) => (
                <div key={r.label + r.unit} className={cn("rounded-xl p-4", i === 0 ? "bg-navy-900 text-white sm:col-span-2" : "border border-line bg-canvas")}>
                  <dt className={cn("text-xs font-semibold", i === 0 ? "text-cyan-300" : "text-muted")}>{r.label}</dt>
                  <dd className={cn("mt-1 font-bold tabular-nums", i === 0 ? "text-3xl" : "text-xl text-ink")}>{fmt(r.value)} <span className={cn("text-sm font-semibold", i === 0 ? "text-white/75" : "text-muted")}>{r.unit}</span></dd>
                </div>
              ))}
            </dl>
          )}
          {out.steps.length > 0 && (
            <div className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-bold text-ink">Steps</h3>
              <ol className="mt-2 space-y-1.5">
                {out.steps.map((st) => <li key={st} className="font-mono text-xs leading-relaxed break-words text-slate-700">{st}</li>)}
              </ol>
            </div>
          )}
          {!out.error && (
            <div className="no-print flex flex-wrap gap-2">
              <Button size="sm" variant="subtle" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy result and steps"}</Button>
              <Button size="sm" variant="subtle" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
              <Button size="sm" variant="subtle" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
