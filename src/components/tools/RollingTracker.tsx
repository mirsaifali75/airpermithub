"use client";

import { AlertTriangle, CheckCircle2, ClipboardPaste, Download, FlaskConical, Plus, Printer, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { addMonths, isMonth, monthName, parsePastedColumn, thisMonth } from "@/lib/tools/months";
import { computeRolling, firstForecastExceedance, nextMonthHeadroom, type RollingMode, type RollingRow } from "@/lib/tools/rolling";
import { NumberField, downloadText, field, labelCls, toCsv, useStoredState } from "./shared";

interface TrackerState {
  param: string;
  units: string;
  mode: RollingMode;
  period: number;
  limit: number | null;
  alertPct: number;
  start: string;
  values: (number | null)[];
  forecast: (number | null)[];
  /** The example is loaded; cleared by Clear or a paste. */
  demo?: boolean;
}

const blank = (start = ""): TrackerState => ({ param: "", units: "tons", mode: "sum", period: 12, limit: null, alertPct: 90, start, values: Array(12).fill(null), forecast: [] });

// Illustrative numbers only, so the page can be explored before entering real data.
const example = (): TrackerState => ({
  param: "Example: facility NOx", units: "tons", mode: "sum", period: 12, limit: 41, alertPct: 90, start: addMonths(thisMonth(), -18),
  values: [2.6, 2.4, 2.9, 3.1, 3.4, 3.6, 3.2, 2.8, 2.7, 3.0, 3.3, 3.5, 3.4, 3.1, 3.6, 3.8, 3.7, 3.4],
  forecast: [3.6, 3.7, 3.9],
  demo: true,
});

const n2 = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d }));

const statusMeta: Record<RollingRow["status"], { label: string; cls: string }> = {
  partial: { label: "Building window", cls: "bg-slate-100 text-slate-700" },
  missing: { label: "Missing month", cls: "bg-amber-50 text-amber-800" },
  ok: { label: "Below alert", cls: "bg-eco-50 text-eco-700" },
  watch: { label: "At or above alert", cls: "bg-amber-50 text-amber-800" },
  over: { label: "Over limit", cls: "bg-red-50 text-red-700" },
};

/** Rolling 12-month (or any N-month) limit tracker. Data stays in this browser. */
export function RollingTracker() {
  const uid = useId();
  const [s, setS] = useStoredState<TrackerState>("aph.tools.rolling.v1", blank());
  const [paste, setPaste] = useState("");
  const [pasteMsg, setPasteMsg] = useState("");
  const [fcCount, setFcCount] = useState<number | null>(3);
  const [fcValue, setFcValue] = useState<number | null>(null);
  const set = (patch: Partial<TrackerState>) => setS((p) => ({ ...p, ...patch }));
  // The page is prerendered, so the default start month is filled in on the client.
  useEffect(() => { setS((p) => (p.start ? p : { ...p, start: addMonths(thisMonth(), -12) })); }, [setS]);

  const opts = useMemo(() => ({ period: Math.max(1, Math.round(s.period || 12)), mode: s.mode, limit: s.limit, alertPct: s.alertPct || 90 }), [s.period, s.mode, s.limit, s.alertPct]);
  const points = useMemo(() => [...s.values.map((value) => ({ value })), ...s.forecast.map((value) => ({ value, forecast: true }))], [s.values, s.forecast]);
  const rows = useMemo(() => computeRolling(points, opts), [points, opts]);
  const actualRows = rows.filter((r) => !r.forecast);
  const latest = [...actualRows].reverse().find((r) => r.status !== "partial");
  const headroom = nextMonthHeadroom(s.values.map((value) => ({ value })), opts);
  const firstOver = firstForecastExceedance(rows);
  const label = (i: number) => (isMonth(s.start) ? monthName(addMonths(s.start, i)) : `Month ${i + 1}`);
  const u = s.units || "units";

  const usePaste = () => {
    const vals = parsePastedColumn(paste);
    if (!vals.length) { setPasteMsg("No numbers found. Paste one value per line."); return; }
    set({ values: vals, demo: false });
    setPasteMsg(`Loaded ${vals.length} months starting ${isMonth(s.start) ? monthName(s.start) : "the first month"}.`);
    setPaste("");
  };

  const exportCsv = () => {
    const head = ["Month", `Value (${u})`, "Forecast", `Rolling ${opts.period}-month ${opts.mode} (${u})`, "Months in window", "% of limit", "Status"];
    const body = rows.map((r) => [isMonth(s.start) ? addMonths(s.start, r.index) : r.index + 1, r.value ?? "", r.forecast ? "yes" : "", r.total ?? "", r.count, r.pct === null ? "" : r.pct.toFixed(1), statusMeta[r.status].label]);
    const meta = [
      ...(s.demo ? [["DEMO DATA: illustrative numbers, not a real facility"]] : []),
      ["Recordkeeping aid. The limit, window, and sum or average come from your permit condition; check every value against your records."],
      ["Parameter", s.param], ["Limit", s.limit ?? "", u], ["Alert at % of limit", opts.alertPct], ["Next-month headroom", headroom ?? "", u], [],
    ];
    downloadText(`rolling-${opts.period}-month-${(s.param || "tracker").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, toCsv("Rolling Limit Tracker", [...meta, head, ...body]));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-setup`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-setup`} className="text-lg font-bold text-ink">1. Set up the limit</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank(addMonths(thisMonth(), -12)))}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-p`} className={labelCls}>What is limited</label>
            <input id={`${uid}-p`} className={field} value={s.param} onChange={(e) => set({ param: e.target.value })} placeholder="e.g., NOx emissions, Plant gas throughput" />
          </div>
          <div>
            <label htmlFor={`${uid}-u`} className={labelCls}>Units</label>
            <input id={`${uid}-u`} className={field} value={s.units} onChange={(e) => set({ units: e.target.value })} placeholder="tons, MMscf, gal" />
          </div>
          <div>
            <label htmlFor={`${uid}-l`} className={labelCls}>Limit ({u})</label>
            <NumberField id={`${uid}-l`} value={s.limit} onChange={(v) => set({ limit: v })} placeholder="From your permit" />
          </div>
          <div>
            <label htmlFor={`${uid}-m`} className={labelCls}>Limit is a rolling</label>
            <select id={`${uid}-m`} className={field} value={s.mode} onChange={(e) => set({ mode: e.target.value as RollingMode })}>
              <option value="sum">Sum (total)</option>
              <option value="average">Average</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-w`} className={labelCls}>Window (months)</label>
            <NumberField id={`${uid}-w`} value={s.period} onChange={(v) => set({ period: v && v > 0 ? Math.min(120, Math.round(v)) : 12 })} />
          </div>
          <div>
            <label htmlFor={`${uid}-a`} className={labelCls}>Alert at (% of limit)</label>
            <NumberField id={`${uid}-a`} value={s.alertPct} onChange={(v) => set({ alertPct: v ?? 90 })} />
          </div>
          <div>
            <label htmlFor={`${uid}-s`} className={labelCls}>First month of data</label>
            <input id={`${uid}-s`} type="month" className={field} value={s.start} onChange={(e) => set({ start: e.target.value })} />
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative numbers, not a real facility</Badge></p>}
        <p className="mt-3 text-xs text-muted">Your permit condition defines the limit, the window, and whether it is a sum or an average. Enter them exactly as written. Data stays in this browser.</p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-data`}>
        <h2 id={`${uid}-data`} className="text-lg font-bold text-ink">2. Enter monthly values</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {s.values.map((v, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <label htmlFor={`${uid}-v${i}`} className="w-[4.5rem] shrink-0 text-xs font-medium text-muted">{label(i)}</label>
                  <NumberField id={`${uid}-v${i}`} value={v} onChange={(nv) => set({ values: s.values.map((x, j) => (j === i ? nv : x)) })} className={cn(field, "h-9 px-2")} />
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="subtle" size="sm" onClick={() => set({ values: [...s.values, null] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add month</Button>
              {s.values.length > 1 && <Button variant="subtle" size="sm" onClick={() => set({ values: s.values.slice(0, -1) })}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove last</Button>}
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-canvas p-4">
            <label htmlFor={`${uid}-paste`} className="flex items-center gap-1.5 text-sm font-semibold text-ink"><ClipboardPaste className="h-4 w-4 text-brand-600" aria-hidden="true" /> Paste from a spreadsheet</label>
            <p className="text-xs text-muted">Copy a column of monthly values (or month and value columns) from Excel and paste here. Blank cells count as missing months.</p>
            <textarea id={`${uid}-paste`} value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} className="w-full rounded-lg border border-line bg-white p-2 font-mono text-xs focus:border-brand-500 focus:outline-none" />
            <Button size="sm" onClick={usePaste} disabled={!paste.trim()}>Use pasted values</Button>
            {pasteMsg && <p role="status" className="text-xs text-slate-700">{pasteMsg}</p>}
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-semibold text-ink">Forecast (optional)</h3>
          <p className="mt-1 text-sm text-muted">Add planned months to see when the rolling value would cross the limit.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-28">
              <label htmlFor={`${uid}-fc`} className={labelCls}>Months</label>
              <NumberField id={`${uid}-fc`} value={fcCount} onChange={setFcCount} />
            </div>
            <div className="w-40">
              <label htmlFor={`${uid}-fv`} className={labelCls}>Planned value ({u}/month)</label>
              <NumberField id={`${uid}-fv`} value={fcValue} onChange={setFcValue} />
            </div>
            <Button size="sm" variant="secondary" disabled={!fcCount || fcValue === null} onClick={() => set({ forecast: Array(Math.min(36, Math.max(1, Math.round(fcCount ?? 1)))).fill(fcValue) })}>Set forecast</Button>
            {s.forecast.length > 0 && <Button size="sm" variant="subtle" onClick={() => set({ forecast: [] })}>Clear forecast</Button>}
          </div>
          {s.forecast.length > 0 && (
            <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {s.forecast.map((v, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <label htmlFor={`${uid}-f${i}`} className="w-[4.5rem] shrink-0 text-xs font-medium text-muted">{label(s.values.length + i)}</label>
                  <NumberField id={`${uid}-f${i}`} value={v} onChange={(nv) => set({ forecast: s.forecast.map((x, j) => (j === i ? nv : x)) })} className={cn(field, "h-9 border-dashed px-2")} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-res`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-res`} className="text-lg font-bold text-ink">3. Results{s.param ? `: ${s.param}` : ""}</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-2"><Badge tone="amber">Demo data: illustrative numbers, not a real facility</Badge></p>}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={latest ? `Rolling ${opts.mode === "sum" ? "total" : "average"}, ${label(latest.index)}` : "Rolling value"} value={latest ? `${n2(latest.total)} ${u}` : "Need a full window"} sub={latest && latest.pct !== null ? `${n2(latest.pct, 1)}% of limit` : s.limit === null ? "Enter a limit to compare" : undefined} tone={latest?.status} />
          <Stat label={`Headroom for ${label(s.values.length)}`} value={headroom === null ? "—" : `${n2(headroom)} ${u}`} sub={headroom === null ? (s.limit === null ? "Enter a limit" : `Needs the last ${opts.period - 1} months`) : headroom < 0 ? "Over even at zero next month" : "Most next month can be and stay at or under the limit"} tone={headroom !== null && headroom < 0 ? "over" : undefined} />
          <Stat label="Windows over the limit" value={String(actualRows.filter((r) => r.status === "over").length)} sub={`${actualRows.filter((r) => r.status === "watch").length} at or above the alert level`} tone={actualRows.some((r) => r.status === "over") ? "over" : undefined} />
          <Stat label="Forecast" value={s.forecast.length === 0 ? "None set" : firstOver >= 0 ? `Over in ${label(firstOver)}` : "Stays at or under"} sub={s.forecast.length ? `${s.forecast.length} planned months` : "Add planned months above"} tone={firstOver >= 0 ? "over" : undefined} />
        </dl>

        <RollingChart rows={rows} limit={s.limit} alertPct={opts.alertPct} label={label} units={u} />

        <div className="relative mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Rolling {opts.period}-month {opts.mode} by month</caption>
            <thead className="bg-canvas text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Month</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Value ({u})</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Rolling {opts.mode === "sum" ? "total" : "average"}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">% of limit</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.index} className={cn(r.forecast && "bg-brand-50/40")}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">{label(r.index)}{r.forecast && <span className="ml-1.5 text-xs font-semibold text-brand-700">forecast</span>}</th>
                  <td className="px-3 py-2 text-right tabular-nums">{n2(r.value, 3)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n2(r.total, 3)}{r.status === "partial" && <span className="ml-1 text-xs text-muted">({r.count} mo)</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.pct === null ? "—" : `${n2(r.pct, 1)}%`}</td>
                  <td className="px-3 py-2"><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", statusMeta[r.status].cls)}>{r.status === "over" ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : r.status === "ok" ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}{statusMeta[r.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: RollingRow["status"] }) {
  return (
    <div className={cn("rounded-xl border p-4", tone === "over" ? "border-red-200 bg-red-50/60" : tone === "watch" ? "border-amber-200 bg-amber-50/60" : "border-line bg-canvas")}>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-slate-600">{sub}</dd>}
    </div>
  );
}

/** Line of rolling values against the limit. Partial windows are left off; forecast months are dashed. */
function RollingChart({ rows, limit, alertPct, label, units }: { rows: RollingRow[]; limit: number | null; alertPct: number; label: (i: number) => string; units: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = rows.filter((r) => r.status !== "partial" && r.total !== null);
  if (pts.length < 2) {
    return <p className="mt-6 flex items-center gap-2 rounded-xl bg-canvas px-4 py-6 text-sm text-muted"><TrendingUp className="h-4 w-4" aria-hidden="true" /> The chart appears once there are at least two full windows.</p>;
  }
  const W = 720, H = 240, L = 48, R = 16, T = 14, B = 30;
  const max = Math.max(limit ?? 0, ...pts.map((p) => p.total as number)) * 1.12 || 1;
  const x = (i: number) => L + ((i - pts[0].index) / Math.max(1, pts.at(-1)!.index - pts[0].index)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const path = (list: RollingRow[]) => list.map((p, k) => `${k ? "L" : "M"}${x(p.index).toFixed(1)},${y(p.total as number).toFixed(1)}`).join(" ");
  const actual = pts.filter((p) => !p.forecast);
  const lastActual = actual.at(-1);
  const fc = pts.filter((p) => p.forecast);
  const h = hover === null ? null : pts.find((p) => p.index === hover);
  const every = Math.max(1, Math.ceil(pts.length / 8));
  const step = (W - L - R) / Math.max(1, pts.length - 1);

  return (
    <figure className="mt-6">
      <figcaption className="mb-2 text-sm font-semibold text-ink">Rolling value by month ({units})</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Line chart of the rolling value by month against the limit. The table below lists every value.">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5e6d82">{t.toLocaleString("en-US", { maximumFractionDigits: 1 })}</text>
          </g>
        ))}
        {limit !== null && (
          <g>
            <line x1={L} x2={W - R} y1={y(limit * (alertPct / 100))} y2={y(limit * (alertPct / 100))} stroke="#b45309" strokeWidth="1" strokeDasharray="2 4" />
            <line x1={L} x2={W - R} y1={y(limit)} y2={y(limit)} stroke="#d92d20" strokeWidth="1.5" />
            <text x={W - R} y={y(limit) - 5} textAnchor="end" fontSize="11" fontWeight="600" fill="#b42318">Limit {limit.toLocaleString("en-US")}</text>
            <text x={W - R} y={y(limit * (alertPct / 100)) + 13} textAnchor="end" fontSize="11" fill="#92400e">Alert {alertPct}%</text>
          </g>
        )}
        <path d={path(actual)} fill="none" stroke="#0066db" strokeWidth="2" strokeLinejoin="round" />
        {fc.length > 0 && <path d={path(lastActual ? [lastActual, ...fc] : fc)} fill="none" stroke="#0066db" strokeWidth="2" strokeDasharray="5 4" />}
        {pts.filter((p) => p.status === "over").map((p) => <circle key={p.index} cx={x(p.index)} cy={y(p.total as number)} r="4.5" fill="#d92d20" stroke="#fff" strokeWidth="2" />)}
        {pts.map((p, k) => k % every === 0 && <text key={p.index} x={x(p.index)} y={H - 10} textAnchor="middle" fontSize="11" fill="#5e6d82">{label(p.index)}</text>)}
        {h && (
          <g pointerEvents="none">
            <line x1={x(h.index)} x2={x(h.index)} y1={T} y2={H - B} stroke="#94a3b8" strokeWidth="1" />
            <circle cx={x(h.index)} cy={y(h.total as number)} r="5" fill="#0066db" stroke="#fff" strokeWidth="2" />
            <g transform={`translate(${Math.min(W - R - 170, Math.max(L, x(h.index) + 10))},${T + 4})`}>
              <rect width="170" height="46" rx="8" fill="#0b2942" />
              <text x="10" y="18" fontSize="11" fill="#fff" fontWeight="600">{label(h.index)}{h.forecast ? " (forecast)" : ""}</text>
              <text x="10" y="35" fontSize="11" fill="#cbd5e1">{(h.total as number).toLocaleString("en-US", { maximumFractionDigits: 2 })} {units}{h.pct !== null ? ` · ${h.pct.toFixed(1)}%` : ""}</text>
            </g>
          </g>
        )}
        {pts.map((p) => (
          <rect key={`hit-${p.index}`} x={x(p.index) - step / 2} y={T} width={step} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(p.index)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
    </figure>
  );
}
