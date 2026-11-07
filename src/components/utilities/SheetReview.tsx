"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Download, FileUp, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { csvFileName, toCsv } from "@/lib/csv";
import { UTIL_BASE, getUtility, storageKey } from "@/lib/utilities";
import type { IssueKind } from "@/lib/utilities/review";
import type { FileReview } from "@/lib/utilities/xlsx";
import { readStored, writeStored } from "@/lib/storage/browser";
import { downloadText } from "@/components/tools/shared";

const kindLabel: Record<IssueKind, string> = {
  error: "Error values",
  "broken-ref": "Broken references",
  "blank-ref": "Formulas reading blank cells",
  "text-number": "Numbers stored as text",
  constant: "Engineering constants and rules of thumb",
  hardcoded: "Other numbers typed into formulas",
};

export function SheetReview() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<FileReview | null>(null);
  const [filter, setFilter] = useState<IssueKind | "all">("all");
  const [loaded, setLoaded] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  async function run(file: File) {
    setBusy(true);
    setErr(null);
    setRes(null);
    setLoaded([]);
    try {
      const { reviewFile } = await import("@/lib/utilities/xlsx");
      setRes(await reviewFile(file));
      setFilter("all");
    } catch (e) {
      setErr(`Could not read that file: ${(e as Error).message}.`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function loadIntoCalculators() {
    if (!res) return;
    const done: string[] = [];
    for (const [slug, sections] of Object.entries(res.template.states)) {
      const key = storageKey(slug);
      writeStored(key, { ...readStored<Record<string, unknown>>(key, {}), ...sections });
      done.push(slug);
    }
    setLoaded(done);
  }

  const issues = res ? res.report.issues.filter((i) => filter === "all" || i.kind === filter) : [];
  const high = res ? res.report.issues.filter((i) => i.severity === "high").length : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="up-h">
        <h2 id="up-h" className="text-lg font-bold text-ink">1. Import a workbook</h2>
        <p className="mt-1 text-sm text-muted">Any .xlsx calculation sheet. The file is read in your browser and is never uploaded or stored.</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) run(f); }}
          className={cn("mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center", drag ? "border-brand-500 bg-brand-50" : "border-rule bg-canvas")}
        >
          <FileUp className="h-8 w-8 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-slate-700">Drop an Excel file here, or</p>
          <Button onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" aria-hidden="true" /> {busy ? "Reviewing…" : "Import Excel"}</Button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="Choose an Excel workbook to review" onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
        </div>
        {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </section>

      {res && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="res-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="res-h" className="text-lg font-bold text-ink">2. Review of {res.file}</h2>
            <Button variant="subtle" size="sm" onClick={() => downloadText(csvFileName("sheet-review", res.file.replace(/\.xlsx$/i, "")), toCsv("Excel Calculation Sheet Review", [["File", res.file], [], ["Severity", "Type", "Sheet", "Cell", "Row label", "Formula", "Finding"], ...res.report.issues.map((i) => [i.severity, kindLabel[i.kind], i.sheet, i.address, i.label ?? "", i.formula ? `=${i.formula}` : "", i.message]), ...(res.template.mismatches.length ? [[], ["Results that differ from the website's recalculation"], ["Calculator", "Section", "Result", "In the file", "Website", "Difference %"], ...res.template.mismatches.map((m) => [m.utility, m.section, m.result, m.file, m.site, m.diffPct.toFixed(2)])] : [])]))}>
              <Download className="h-4 w-4" aria-hidden="true" /> Export findings (CSV)
            </Button>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {res.report.sheets.length} sheet{res.report.sheets.length === 1 ? "" : "s"}, {res.report.sheets.reduce((a, s) => a + s.cells, 0).toLocaleString()} cells, {res.report.sheets.reduce((a, s) => a + s.formulas, 0).toLocaleString()} formulas.{" "}
            {high ? <strong className="text-red-700">{high} cell{high > 1 ? "s need" : " needs"} fixing.</strong> : <span className="text-eco-700">No error values or broken references.</span>}
          </p>

          {res.template.recognized && (
            <div className="mt-4 rounded-xl border border-gold-500/40 bg-gold-200/20 p-4">
              <p className="flex items-center gap-2 font-semibold text-ink"><CheckCircle2 className="h-5 w-5 text-eco-600" aria-hidden="true" /> This is an AirPermitHub utility workbook</p>
              <p className="mt-1 text-sm text-slate-700">
                The site recalculated every section from your inputs.{" "}
                {res.template.compared > 0 ? (res.template.mismatches.length ? <strong className="text-red-700">{res.template.mismatches.length} of {res.template.compared} results differ by more than 0.5 %.</strong> : <span className="text-eco-700">All {res.template.compared} results match within 0.5 %.</span>) : "The file has no saved results to compare (open it in Excel and save it first)."}
                {res.template.uncached > 0 && ` ${res.template.uncached} results had no saved value.`}
              </p>
              {res.template.overwritten.length > 0 && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  <p className="font-semibold">{res.template.overwritten.length} result cell{res.template.overwritten.length > 1 ? "s have" : " has"} a typed number where the formula should be:</p>
                  <ul className="mt-1 list-disc pl-5">{res.template.overwritten.slice(0, 20).map((o) => <li key={o.sheet + o.address}>{o.sheet}!{o.address}: {o.label}</li>)}</ul>
                  <p className="mt-1">Download a fresh workbook, or export again from the calculator, to restore the formulas.</p>
                </div>
              )}
              {res.template.mismatches.length > 0 && (
                <div className="relative mt-3 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead className="text-left text-xs text-muted"><tr><th scope="col" className="py-1">Calculator</th><th scope="col" className="py-1">Result</th><th scope="col" className="py-1 text-right">In the file</th><th scope="col" className="py-1 text-right">Website</th><th scope="col" className="py-1 text-right">Difference</th></tr></thead>
                    <tbody className="divide-y divide-line">{res.template.mismatches.map((m, k) => <tr key={k}><td className="py-1.5">{m.utility}: {m.section}</td><td className="py-1.5">{m.result}</td><td className="py-1.5 text-right tabular-nums">{m.file}</td><td className="py-1.5 text-right tabular-nums">{m.site}</td><td className="py-1.5 text-right tabular-nums">{m.diffPct.toFixed(2)} %</td></tr>)}</tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted">A difference usually means a formula on that sheet was edited, or a value was typed over a formula.</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="subtle" size="sm" onClick={loadIntoCalculators}>Load these inputs into the calculators</Button>
                {loaded.map((s) => <Link key={s} href={`${UTIL_BASE}/${s}`} className="text-sm font-semibold text-brand-700 hover:underline">Open {getUtility(s)?.short}</Link>)}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter findings">
            <button type="button" onClick={() => setFilter("all")} className={cn("rounded-sm border px-2.5 py-1 text-xs font-semibold", filter === "all" ? "border-navy-900 bg-navy-900 text-white" : "border-rule bg-white text-navy-900")}>All ({res.report.issues.length})</button>
            {(Object.keys(kindLabel) as IssueKind[]).filter((k) => res.report.counts[k]).map((k) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={cn("rounded-sm border px-2.5 py-1 text-xs font-semibold", filter === k ? "border-navy-900 bg-navy-900 text-white" : "border-rule bg-white text-navy-900")}>{kindLabel[k]} ({res.report.counts[k]})</button>
            ))}
          </div>
          {issues.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-eco-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Nothing to flag here.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {issues.slice(0, 500).map((i, k) => (
                <li key={k} className="rounded-lg border border-line px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {i.severity === "high" ? <AlertOctagon className="h-4 w-4 text-red-600" aria-hidden="true" /> : i.severity === "medium" ? <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" /> : <Info className="h-4 w-4 text-brand-600" aria-hidden="true" />}
                    <Badge tone={i.severity === "high" ? "red" : i.severity === "medium" ? "amber" : "blue"}>{i.severity === "high" ? "Fix" : i.severity === "medium" ? "Check" : "Note"}</Badge>
                    <span className="font-mono text-xs font-semibold text-ink">{i.sheet}!{i.address}</span>
                    {i.label && <span className="text-xs text-muted">{i.label}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{i.message}</p>
                  {i.formula && <code className="mt-1 block font-mono text-xs break-all text-slate-600">={i.formula}</code>}
                </li>
              ))}
            </ul>
          )}
          {issues.length > 500 && <p className="mt-2 text-xs text-muted">Showing the first 500; export the CSV for all {issues.length}.</p>}
        </section>
      )}
    </div>
  );
}
