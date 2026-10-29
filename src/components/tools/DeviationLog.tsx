"use client";

import { CheckCircle2, CircleDot, Download, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { deviationsCsv, groupByPeriod, type Deviation } from "@/lib/tools/deviations";
import { NumberField, downloadText, field, labelCls, useStoredState } from "./shared";

interface LogState { cycle: 3 | 6 | 12; startMonth: number; items: Deviation[] }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const empty = (): Omit<Deviation, "id"> => ({ start: "", end: "", unit: "", requirement: "", description: "", cause: "", corrective: "", durationHours: null, pollutants: "", excessEstimate: "", reportedOn: "", status: "open" });

/** Deviation log grouped by the permit's reporting periods. Entries stay in this browser. */
export function DeviationLog() {
  const uid = useId();
  const [s, setS] = useStoredState<LogState>("aph.tools.deviations.v1", { cycle: 6, startMonth: 1, items: [] });
  const [draft, setDraft] = useState<Omit<Deviation, "id">>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const groups = groupByPeriod(s.items, s.startMonth, s.cycle);
  const d = (patch: Partial<Deviation>) => setDraft((p) => ({ ...p, ...patch }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setS((p) => ({
      ...p,
      items: editing
        ? p.items.map((x) => (x.id === editing ? { ...draft, id: editing } : x))
        : [...p.items, { ...draft, id: `dev-${Date.now().toString(36)}` }].sort((a, b) => a.start.localeCompare(b.start)),
    }));
    setDraft(empty());
    setEditing(null);
    setFormOpen(false);
  };
  const edit = (x: Deviation) => { const { id, ...rest } = x; setDraft(rest); setEditing(id); setFormOpen(true); };
  const remove = (id: string) => setS((p) => ({ ...p, items: p.items.filter((x) => x.id !== id) }));

  return (
    <div className="space-y-6">
      <section className="no-print rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">Reporting periods</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" disabled={!s.items.length} onClick={() => downloadText("deviation-log.csv", deviationsCsv(s.items, s.startMonth, s.cycle))}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button size="sm" variant="subtle" disabled={!s.items.length} onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <div>
            <label htmlFor={`${uid}-c`} className={labelCls}>Report cycle</label>
            <select id={`${uid}-c`} className={field} value={s.cycle} onChange={(e) => setS((p) => ({ ...p, cycle: Number(e.target.value) as LogState["cycle"] }))}>
              <option value={6}>Semiannual</option>
              <option value={3}>Quarterly</option>
              <option value={12}>Annual</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-m`} className={labelCls}>A reporting period starts in</label>
            <select id={`${uid}-m`} className={field} value={s.startMonth} onChange={(e) => setS((p) => ({ ...p, startMonth: Number(e.target.value) }))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Set these to match the reporting periods in your permit. The permit defines what counts as a deviation and which ones need prompt reporting.</p>
      </section>

      <section className="no-print rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">{editing ? "Edit deviation" : "Log a deviation"}</h2>
          {!formOpen && <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> New entry</Button>}
        </div>
        {formOpen && (
          <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor={`${uid}-s`} className={labelCls}>Start date</label>
              <input id={`${uid}-s`} required type="date" className={field} value={draft.start} onChange={(e) => d({ start: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${uid}-e`} className={labelCls}>End date</label>
              <input id={`${uid}-e`} type="date" className={field} value={draft.end} onChange={(e) => d({ end: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${uid}-u`} className={labelCls}>Emission unit</label>
              <input id={`${uid}-u`} required className={field} value={draft.unit} onChange={(e) => d({ unit: e.target.value })} placeholder="e.g., FLR-1" />
            </div>
            <div>
              <label htmlFor={`${uid}-r`} className={labelCls}>Permit condition / requirement</label>
              <input id={`${uid}-r`} required className={field} value={draft.requirement} onChange={(e) => d({ requirement: e.target.value })} placeholder="e.g., Condition 4.2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-de`} className={labelCls}>What happened</label>
              <textarea id={`${uid}-de`} required rows={3} className={cn(field, "h-auto py-2")} value={draft.description} onChange={(e) => d({ description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-ca`} className={labelCls}>Probable cause</label>
              <textarea id={`${uid}-ca`} rows={3} className={cn(field, "h-auto py-2")} value={draft.cause} onChange={(e) => d({ cause: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-co`} className={labelCls}>Corrective action / preventive measures</label>
              <textarea id={`${uid}-co`} rows={3} className={cn(field, "h-auto py-2")} value={draft.corrective} onChange={(e) => d({ corrective: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${uid}-h`} className={labelCls}>Duration (hours)</label>
              <NumberField id={`${uid}-h`} value={draft.durationHours} onChange={(v) => d({ durationHours: v })} />
            </div>
            <div>
              <label htmlFor={`${uid}-p`} className={labelCls}>Pollutant(s)</label>
              <input id={`${uid}-p`} className={field} value={draft.pollutants} onChange={(e) => d({ pollutants: e.target.value })} placeholder="e.g., VOC, NOx" />
            </div>
            <div>
              <label htmlFor={`${uid}-x`} className={labelCls}>Excess emissions estimate</label>
              <input id={`${uid}-x`} className={field} value={draft.excessEstimate} onChange={(e) => d({ excessEstimate: e.target.value })} placeholder="Amount and basis" />
            </div>
            <div>
              <label htmlFor={`${uid}-rp`} className={labelCls}>Prompt report submitted</label>
              <input id={`${uid}-rp`} type="date" className={field} value={draft.reportedOn} onChange={(e) => d({ reportedOn: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${uid}-st`} className={labelCls}>Status</label>
              <select id={`${uid}-st`} className={field} value={draft.status} onChange={(e) => d({ status: e.target.value as Deviation["status"] })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" size="sm">{editing ? "Save changes" : "Add to log"}</Button>
              <Button type="button" size="sm" variant="subtle" onClick={() => { setFormOpen(false); setEditing(null); setDraft(empty()); }}><X className="h-4 w-4" aria-hidden="true" /> Cancel</Button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby={`${uid}-c2`} className="space-y-4">
        <h2 id={`${uid}-c2`} className="text-lg font-bold text-ink">Deviation log</h2>
        <p className="hidden text-xs print:block">AirPermitHub Template: Deviation Log. Not an agency form.</p>
        {groups.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted">No deviations logged. Entries you add are grouped here by reporting period.</p>}
        {groups.map((g) => {
          const open = g.items.filter((x) => x.status === "open").length;
          const reported = g.items.filter((x) => x.reportedOn).length;
          return (
            <div key={g.period.key} className="rounded-2xl border border-line bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <h3 className="font-bold text-navy-900">{g.period.label}</h3>
                <p className="text-xs text-muted">{g.items.length} logged · {open} open · {reported} with a prompt report date</p>
              </div>
              <ul className="divide-y divide-line">
                {g.items.map((x) => (
                  <li key={x.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-ink">
                        {x.start}{x.end && x.end !== x.start ? ` to ${x.end}` : ""} · {x.unit} · <span className="text-brand-700">{x.requirement}</span>
                      </p>
                      <div className="no-print flex items-center gap-1">
                        <span className={cn("mr-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", x.status === "open" ? "bg-amber-50 text-amber-800" : "bg-eco-50 text-eco-700")}>
                          {x.status === "open" ? <CircleDot className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}{x.status === "open" ? "Open" : "Closed"}
                        </span>
                        <button type="button" onClick={() => edit(x)} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label={`Edit deviation on ${x.start}`}><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => remove(x.id)} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700" aria-label={`Delete deviation on ${x.start}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{x.description}</p>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-700 sm:grid-cols-2">
                      {x.cause && <div><dt className="inline font-semibold">Cause: </dt><dd className="inline">{x.cause}</dd></div>}
                      {x.corrective && <div><dt className="inline font-semibold">Corrective action: </dt><dd className="inline">{x.corrective}</dd></div>}
                      {x.durationHours !== null && <div><dt className="inline font-semibold">Duration: </dt><dd className="inline">{x.durationHours} hr</dd></div>}
                      {x.pollutants && <div><dt className="inline font-semibold">Pollutants: </dt><dd className="inline">{x.pollutants}</dd></div>}
                      {x.excessEstimate && <div><dt className="inline font-semibold">Excess estimate: </dt><dd className="inline">{x.excessEstimate}</dd></div>}
                      <div><dt className="inline font-semibold">Prompt report: </dt><dd className="inline">{x.reportedOn || "Not recorded"}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
