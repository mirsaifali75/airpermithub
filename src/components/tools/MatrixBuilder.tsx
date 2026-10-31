"use client";

import { CalendarPlus, ChevronDown, ChevronUp, Download, FileText, Merge, Printer, RotateCcw, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { STORE as CAL_STORE, ymd, type StoredTask } from "@/lib/compliance-calendar";
import { cn } from "@/lib/cn";
import {
  calendarTask, classify, conditionTitle, conditionTypes, frequencies, matrixTaskId, parsePermitText, recurrence,
  type ConditionType, type Frequency, type ParsedCondition,
} from "@/lib/tools/matrix";
import { csvFileName, downloadText, field, labelCls, toCsv, useStoredState } from "./shared";

interface MatrixRow extends ParsedCondition {
  id: string;
  heading: boolean;
  type: ConditionType | "";
  frequency: Frequency;
  owner: string;
  evidence: string;
  due: string;
}
interface MatrixState { facility: string; split: boolean; rows: MatrixRow[]; /** Rows came from the sample text. */ sample?: boolean }


const sample = `SAMPLE PERMIT TEXT (written by AirPermitHub to show the tool; not from a real permit)
1. Emission Limits
1.1 Emissions from Engine E-1 shall not exceed the limits in Table 1 of this permit.
1.2 Total facility NOx emissions shall not exceed the limit in Table 2 on a 12-month rolling basis.
2. Monitoring and Testing
2.1 The permittee shall conduct an initial performance test on Engine E-1 using EPA Method 7E and Method 10 within the period required by 40 CFR 60.8.
2.2 The permittee shall monitor and record engine operating hours monthly.
2.3 The permittee shall conduct a visible emissions observation of the flare using Method 22 each calendar quarter.
3. Recordkeeping
3.1 The permittee shall maintain records of fuel use each month and calculate the 12-month rolling total of NOx emissions.
3.2 All records required by this permit shall be retained on site and made available upon request.
4. Reporting
4.1 The permittee shall submit a semiannual monitoring report by the dates stated in Section 4.3, in accordance with 40 CFR 70.6(a)(3)(iii)(A).
4.2 The permittee shall report deviations from permit requirements promptly, as defined in this permit.
4.3 The responsible official shall submit an annual compliance certification as required by 40 CFR 70.6(c)(5).
5. Leak Detection
5.1 The permittee shall monitor fugitive emissions components using optical gas imaging each quarter and repair leaks as required by 40 CFR Part 60, Subpart OOOOb.`;

const isHeading = (text: string) => text.length < 60 && !/\b(shall|must|will|may not)\b/i.test(text);

const toRow = (c: ParsedCondition, i: number): MatrixRow => {
  const heading = c.ref === "Preamble" || isHeading(c.text);
  return { ...c, id: `${i}-${c.ref}`, heading, type: heading ? "" : (c.types[0] ?? ""), frequency: c.frequencies[0], owner: "", evidence: "", due: "" };
};

const typeTone: Record<ConditionType, string> = {
  Limit: "bg-red-50 text-red-700",
  Monitoring: "bg-cyan-500/10 text-sky-800",
  Testing: "bg-violet-50 text-violet-700",
  Recordkeeping: "bg-slate-100 text-slate-700",
  Reporting: "bg-brand-50 text-brand-700",
  Certification: "bg-eco-50 text-eco-700",
  LDAR: "bg-rose-50 text-rose-700",
  Inspection: "bg-teal-50 text-teal-700",
  "Work practice": "bg-amber-50 text-amber-800",
};

/** Permit text to compliance matrix. Suggestions are keyword-based; the user confirms every row. */
export function MatrixBuilder() {
  const uid = useId();
  const [s, setS] = useStoredState<MatrixState>("aph.tools.matrix.v1", { facility: "", split: false, rows: [] });
  const [text, setText] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<ConditionType | "">("");
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<MatrixState>) => setS((p) => ({ ...p, ...patch }));
  const upd = (id: string, patch: Partial<MatrixRow>) => setS((p) => ({ ...p, rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const reqs = s.rows.filter((r) => !r.heading);
  const counts = useMemo(() => conditionTypes.map((t) => [t, reqs.filter((r) => r.type === t || r.types.includes(t)).length] as const).filter(([, c]) => c > 0), [reqs]);
  const shown = s.rows.filter((r) => !typeFilter || r.heading || r.type === typeFilter || r.types.includes(typeFilter));
  const dated = reqs.filter((r) => r.due && recurrence(r.frequency));

  const build = (src: string, isSample = false) => {
    const parsed = parsePermitText(src, { splitSubitems: s.split });
    set({ rows: parsed.map(toRow), sample: isSample });
    setMsg(`Found ${parsed.filter((c) => !isHeading(c.text)).length} conditions. Review each suggested type and frequency.`);
  };

  const mergeUp = (i: number) => setS((p) => {
    if (i === 0) return p;
    const rows = [...p.rows];
    const text = `${rows[i - 1].text} ${rows[i].text}`;
    const c = classify(text);
    rows[i - 1] = { ...rows[i - 1], ...c, text, heading: false, type: rows[i - 1].type || c.types[0] || "" };
    rows.splice(i, 1);
    return { ...p, rows };
  });

  const exportCsv = () => {
    const head = ["Condition", "Requirement text", "Type", "All suggested types", "Frequency", "Citations", "Deadline phrases", "Owner", "Evidence / record", "Next due"];
    const body = s.rows.map((r) => (r.heading ? [r.ref, r.text.toUpperCase()] : [r.ref, r.text, r.type, r.types.join("; "), r.frequency, r.citations.join("; "), r.deadlines.join("; "), r.owner, r.evidence, r.due]));
    downloadText(csvFileName("compliance-matrix", s.facility), toCsv("Compliance Matrix", [["Facility", s.facility], ...(s.sample ? [["DEMO DATA: sample permit text written by AirPermitHub, not a real permit"]] : []), ["Suggested types and frequencies are keyword-based. Confirm each against the permit."], [], head, ...body]));
  };

  const toCalendar = () => {
    if (s.sample) return;
    let existing: StoredTask[] = [];
    try { existing = JSON.parse(localStorage.getItem(CAL_STORE) ?? "[]"); } catch {}
    const tasks = dated.map((r) => calendarTask(r, s.facility, ymd(new Date())));
    const ids = new Set(tasks.map((t) => t.id));
    // Replace this condition's earlier entries, including the one-per-month entries older versions wrote.
    const stale = (id: string) => ids.has(id) || dated.some((r) => id.startsWith(`${matrixTaskId(r.ref)}-`));
    const kept = existing.filter((t) => !stale(t.id));
    const merged = tasks.map((t) => ({ ...t, done: existing.find((e) => e.id === t.id)?.done }));
    try { localStorage.setItem(CAL_STORE, JSON.stringify([...kept, ...merged])); } catch {}
    const repeating = tasks.filter((t) => t.repeat !== "none").length;
    setMsg(`Added ${tasks.length} calendar task${tasks.length === 1 ? "" : "s"}${repeating ? `, ${repeating} repeating` : ""}, each with its condition number as the basis.`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. Paste permit conditions</h2>
        <p className="mt-1 text-sm text-muted">Copy the conditions from the permit PDF and paste them here. Numbered items (1., 3.1.2, A.1, Condition 5) start new rows; wrapped lines join the row above. Text stays in this browser.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor={`${uid}-f`} className={labelCls}>Facility</label>
            <input id={`${uid}-f`} className={field} value={s.facility} onChange={(e) => set({ facility: e.target.value })} placeholder="Facility name (used on calendar entries)" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={s.split} onChange={(e) => set({ split: e.target.checked })} /> Split (a), (b) sub-items into rows
          </label>
        </div>
        <label htmlFor={`${uid}-t`} className="sr-only">Permit text</label>
        <textarea id={`${uid}-t`} value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Paste permit conditions here" className="mt-3 w-full rounded-xl border border-line bg-white p-3 font-mono text-xs leading-relaxed focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={!text.trim()} onClick={() => build(text)}><Wand2 className="h-4 w-4" aria-hidden="true" /> Build matrix</Button>
          <Button size="sm" variant="subtle" onClick={() => { setText(sample); build(sample, true); }}><FileText className="h-4 w-4" aria-hidden="true" /> Try sample text</Button>
          {s.rows.length > 0 && <Button size="sm" variant="subtle" onClick={() => { set({ rows: [], sample: false }); setMsg(""); }}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear matrix</Button>}
        </div>
        {msg && <p role="status" className="mt-3 text-sm text-slate-700">{msg}{msg.startsWith("Added") && <> <Link href="/compliance?view=list" className="font-semibold text-brand-700 hover:underline">Open the Compliance Calendar</Link></>}</p>}
      </section>

      {s.rows.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-b`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${uid}-b`} className="text-lg font-bold text-ink">2. Review the matrix <span className="text-sm font-normal text-muted">({reqs.length} conditions)</span></h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" size="sm" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
              <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
              <Button variant="secondary" size="sm" disabled={dated.length === 0 || !!s.sample} onClick={toCalendar}
                title={s.sample ? "Sample text is never added to your calendar" : dated.length ? undefined : "Set a next due date on at least one row"}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add {dated.length || ""} dated to calendar
              </Button>
            </div>
          </div>
          {s.sample && <p className="mt-3"><Badge tone="amber">Demo data: sample permit text written by AirPermitHub, not a real permit. Not added to your calendar.</Badge></p>}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            <button type="button" aria-pressed={!typeFilter} onClick={() => setTypeFilter("")} className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset", !typeFilter ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-line")}>All</button>
            {counts.map(([t, c]) => (
              <button key={t} type="button" aria-pressed={typeFilter === t} onClick={() => setTypeFilter(typeFilter === t ? "" : t)} className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset", typeFilter === t ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-700 ring-line")}>{t} {c}</button>
            ))}
          </div>
          <ol className="mt-4 space-y-3">
            {shown.map((r) => {
              const i = s.rows.indexOf(r);
              if (r.heading) {
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 border-b border-line pt-3 pb-1">
                    <p className="text-sm font-bold tracking-wide text-navy-900 uppercase">{r.ref === "Preamble" ? "" : `${r.ref} `}{r.text}</p>
                    <button type="button" onClick={() => upd(r.id, { heading: false, type: r.types[0] ?? "" })} className="text-xs font-semibold text-brand-700 hover:underline">Treat as condition</button>
                  </li>
                );
              }
              const long = r.text.length > 220;
              const expanded = open[r.id];
              return (
                <li key={r.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-navy-900">{r.ref}</p>
                    <div className="flex gap-1">
                      {i > 0 && <button type="button" onClick={() => mergeUp(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-canvas" aria-label={`Merge ${r.ref} into the row above`}><Merge className="h-3.5 w-3.5" aria-hidden="true" /> Merge up</button>}
                      <button type="button" onClick={() => set({ rows: s.rows.filter((x) => x.id !== r.id) })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${r.ref}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete</button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{long && !expanded ? `${r.text.slice(0, 220)}…` : r.text}</p>
                  {long && (
                    <button type="button" onClick={() => setOpen({ ...open, [r.id]: !expanded })} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700" aria-expanded={!!expanded}>
                      {expanded ? <><ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> Show all</>}
                    </button>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.types.map((t) => <span key={t} className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", typeTone[t])}>{t}</span>)}
                    {r.citations.map((c) => <span key={c} className="rounded-full bg-navy-900 px-2 py-0.5 text-[0.7rem] font-semibold text-white">{c}</span>)}
                    {r.deadlines.map((d) => <span key={d} className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-800 ring-1 ring-amber-500/30 ring-inset">&ldquo;{d}&rdquo;</span>)}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <label htmlFor={`${uid}-${r.id}-ty`} className={labelCls}>Type</label>
                      <select id={`${uid}-${r.id}-ty`} className={field} value={r.type} onChange={(e) => upd(r.id, { type: e.target.value as ConditionType | "" })}>
                        <option value="">Not set</option>
                        {conditionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${uid}-${r.id}-fq`} className={labelCls}>Frequency</label>
                      <select id={`${uid}-${r.id}-fq`} className={field} value={r.frequency} onChange={(e) => upd(r.id, { frequency: e.target.value as Frequency })}>
                        {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${uid}-${r.id}-ow`} className={labelCls}>Owner</label>
                      <input id={`${uid}-${r.id}-ow`} className={field} value={r.owner} onChange={(e) => upd(r.id, { owner: e.target.value })} placeholder="Who does it" />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-${r.id}-ev`} className={labelCls}>Evidence / record</label>
                      <input id={`${uid}-${r.id}-ev`} className={field} value={r.evidence} onChange={(e) => upd(r.id, { evidence: e.target.value })} placeholder="Log, report, data file" />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-${r.id}-du`} className={labelCls}>Next due</label>
                      <input id={`${uid}-${r.id}-du`} type="date" className={field} value={r.due} onChange={(e) => upd(r.id, { due: e.target.value })} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted">Types, frequencies, citations, and deadline phrases are keyword suggestions. Read each condition and correct them; the permit text governs. Calendar entries repeat by frequency for 12 months from the date you set; daily, weekly, and continuous items stay in the matrix.</p>
        </section>
      )}
    </div>
  );
}
