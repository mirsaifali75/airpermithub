"use client";

import { Download, FlaskConical, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useId } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { camCsv, camLabels, camScreen, missingPlan, planFields, type Answer, type CamStatus, type CamUnit } from "@/lib/tools/cam";
import { quoteHref } from "@/lib/tools/rule-text";
import { NumberField, csvFileName, downloadText, field, labelCls, useStoredState } from "./shared";

interface CamState { facility: string; majorPart70: Answer; units: CamUnit[]; demo?: boolean }
const newId = () => Math.random().toString(36).slice(2, 9);
const blankUnit = (): CamUnit => ({ id: newId(), unit: "", pollutant: "", limit: "", subjectToLimit: "unknown", exempt: "unknown", usesControl: "unknown", precontrol: null, majorAmount: null, controlDevice: "", indicators: "", range: "", rangeBasis: "", performance: "", frequency: "", excursion: "", response: "", records: "" });
const blank = (): CamState => ({ facility: "", majorPart70: "unknown", units: [blankUnit()] });
const example = (): CamState => ({
  demo: true, facility: "Example plant (demo data)", majorPart70: "yes",
  units: [
    { ...blankUnit(), unit: "DRY-1", pollutant: "PM", limit: "Permit condition 4.2 (demo)", subjectToLimit: "yes", exempt: "no", usesControl: "yes", precontrol: 180, majorAmount: 100, controlDevice: "Baghouse", indicators: "Pressure drop across the baghouse", range: "Demo range set from the performance test", rangeBasis: "Performance test and manufacturer data", frequency: "Recorded every 15 minutes; daily average" },
    { ...blankUnit(), unit: "HTR-2", pollutant: "NOx", limit: "Permit condition 5.1 (demo)", subjectToLimit: "yes", exempt: "no", usesControl: "no", precontrol: 40, majorAmount: 100 },
  ],
});
const tone: Record<CamStatus, "amber" | "gray" | "blue" | "green"> = { meets: "amber", "does-not-meet": "gray", "more-info": "blue", "not-major": "gray" };
const answers: [Answer, string][] = [["unknown", "Not sure"], ["yes", "Yes"], ["no", "No"]];

export function CamPlanBuilder() {
  const uid = useId();
  const [s, setS] = useStoredState<CamState>("aph.tools.cam.v1", blank());
  const set = (p: Partial<CamState>) => setS({ ...s, ...p, demo: p.units ? false : s.demo });
  const setU = (id: string, p: Partial<CamUnit>) => set({ units: s.units.map((u) => (u.id === id ? { ...u, ...p } : u)) });
  const sel = (id: string, k: "subjectToLimit" | "exempt" | "usesControl", label: string, u: CamUnit) => (
    <div><label htmlFor={`${id}-${k}`} className={labelCls}>{label}</label><select id={`${id}-${k}`} className={field} value={u[k]} onChange={(e) => setU(u.id, { [k]: e.target.value as Answer })}>{answers.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-a`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${uid}-a`} className="text-lg font-bold text-ink">1. The source</h2>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => setS(example())}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Load example</Button>
            <Button variant="subtle" size="sm" onClick={() => setS(blank())}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
            <Button variant="subtle" size="sm" onClick={() => downloadText(csvFileName("cam-plan", s.facility), camCsv(s.units, s.majorPart70, s.facility))}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
            <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
          </div>
        </div>
        {s.demo && <p className="mt-3"><Badge tone="amber">Demo data: illustrative entries, not a real facility</Badge></p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor={`${uid}-f`} className={labelCls}>Facility</label><input id={`${uid}-f`} className={field} value={s.facility} onChange={(e) => set({ facility: e.target.value })} /></div>
          <div><label htmlFor={`${uid}-m`} className={labelCls}>Major source required to obtain a Part 70 or 71 permit?</label><select id={`${uid}-m`} className={field} value={s.majorPart70} onChange={(e) => set({ majorPart70: e.target.value as Answer })}>{answers.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        </div>
      </section>

      {s.units.map((u, i) => {
        const r = camScreen(u, s.majorPart70);
        const id = `${uid}-u${u.id}`;
        const missing = r.status === "meets" ? missingPlan(u) : [];
        return (
          <section key={u.id} className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${id}-h`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${id}-h`} className="text-lg font-bold text-ink">{i + 2}. {u.unit || "Unit"}{u.pollutant ? ` · ${u.pollutant}` : ""}</h2>
              <div className="flex items-center gap-2">
                <Badge tone={tone[r.status]}>{camLabels[r.status]}</Badge>
                {s.units.length > 1 && <button type="button" aria-label={`Remove ${u.unit || `unit ${i + 1}`}`} onClick={() => set({ units: s.units.filter((x) => x.id !== u.id) })} className="no-print rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><label htmlFor={`${id}-u`} className={labelCls}>Unit ID</label><input id={`${id}-u`} className={field} value={u.unit} onChange={(e) => setU(u.id, { unit: e.target.value })} /></div>
              <div><label htmlFor={`${id}-p`} className={labelCls}>Pollutant</label><input id={`${id}-p`} className={field} value={u.pollutant} onChange={(e) => setU(u.id, { pollutant: e.target.value })} /></div>
              <div className="sm:col-span-2"><label htmlFor={`${id}-l`} className={labelCls}>Emission limitation or standard (citation)</label><input id={`${id}-l`} className={field} value={u.limit} onChange={(e) => setU(u.id, { limit: e.target.value })} /></div>
              {sel(id, "subjectToLimit", "(a)(1) Subject to it?", u)}
              {sel(id, "exempt", "Exempt under 64.2(b)(1)?", u)}
              {sel(id, "usesControl", "(a)(2) Control device used to comply?", u)}
              <div className="grid grid-cols-2 gap-2">
                <div><label htmlFor={`${id}-pc`} className={labelCls}>(a)(3) Pre-control PTE (tpy)</label><NumberField id={`${id}-pc`} value={u.precontrol} onChange={(v) => setU(u.id, { precontrol: v })} /></div>
                <div><label htmlFor={`${id}-ma`} className={labelCls}>Major source amount (tpy)</label><NumberField id={`${id}-ma`} value={u.majorAmount} onChange={(v) => setU(u.id, { majorAmount: v })} /></div>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">{r.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>
            {r.status === "meets" && (
              <div className="mt-5">
                <h3 className="font-semibold text-ink">Monitoring approach (what 64.4(a) asks you to submit)</h3>
                {missing.length > 0 && <p className="mt-1 text-xs text-amber-800">Still to fill in: {missing.join(", ")}.</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {planFields.map((f) => (
                    <div key={f.key}>
                      <label htmlFor={`${id}-${f.key}`} className={labelCls}>{f.label}</label>
                      <textarea id={`${id}-${f.key}`} rows={2} className={cn(field, "h-auto py-2")} value={u[f.key] as string} onChange={(e) => setU(u.id, { [f.key]: e.target.value })} />
                      {f.quote && <p className="mt-1 text-[11px] text-muted">&ldquo;{f.quote.text}&rdquo; <a href={quoteHref(f.quote) ?? undefined} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{f.quote.cite}</a></p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
      <div className="no-print"><Button variant="subtle" size="sm" disabled={s.units.length >= 40} onClick={() => set({ units: [...s.units, blankUnit()] })}><Plus className="h-4 w-4" aria-hidden="true" /> Add unit and pollutant</Button></div>
    </div>
  );
}
