"use client";

import { AlertTriangle, Calculator, Download, FileSpreadsheet, FlaskConical, Plus, Printer, RotateCcw, Sigma, Trash2, Upload } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NumberField, field, labelCls, useStoredState } from "@/components/tools/shared";
import { cn } from "@/lib/cn";
import { blankSection, exampleSection, getUtility, runSection, storageKey, type SectionState } from "@/lib/utilities";
import type { InputDef, SectionDef } from "@/lib/utilities/types";
import { families, fmt, fromSI, toSI, unitOf, type Family } from "@/lib/utilities/units";
import { WORKBOOK_PATH } from "@/lib/utilities/workbook-layout";

type Saved = Record<string, SectionState>;

/** Unit used for each family when someone switches the whole calculator to US units. */
const US: Partial<Record<Family, string>> = {
  dp: "psi", temp: "f", dtemp: "f", mflow: "lbh", vflow: "gpm", gasflow: "scfm", cp: "btulbf", hspec: "btulb", hv: "btulb",
  rho: "lbft3", length: "ft", head: "ft", diam: "in", rough: "in", area: "ft2", volume: "ft3", vel: "fts", spower: "kw100cfm", uval: "btuhft2f",
};

const US_IDS = new Set(["psig", "psia", "psi", "f", "lbh", "klbh", "gpm", "scfm", "scfm68", "btuh", "mmbtuh", "tr", "hp", "btulbf", "btulb", "lbft3", "ft", "in", "ft2", "ft3", "gal", "fts", "ftmin", "kw100cfm", "btuhft2f", "mmbtu"]);

/** Puts the first US unit in front when the calculator is in US units. */
const order = (show: string[], us: boolean) => {
  if (!us) return show;
  const i = show.findIndex((u) => US_IDS.has(u));
  return i > 0 ? [show[i], ...show.filter((_, k) => k !== i)] : show;
};

function usUnit(i: InputDef) {
  if (i.family === "pabs") return ["bara", "kpaa", "mpaa"].includes(i.unit) ? "psia" : "psig";
  if (i.family === "power") return i.id === "Q" && i.unit !== "tr" ? "mmbtuh" : i.unit;
  if (i.family === "volume" && i.unit === "m3" && i.id === "V") return "ft3";
  return US[i.family] ?? i.unit;
}

function convertEntry(i: InputDef, e: { v: number | null; u: string }, to: string) {
  if (e.v === null || i.choices) return { v: e.v, u: to };
  const si = toSI(i.family, e.u, e.v);
  return { v: Number(fromSI(i.family, to, si).toPrecision(6)), u: to };
}

export function UtilityCalculator({ slug }: { slug: string }) {
  const util = getUtility(slug)!;
  const [saved, setSaved] = useStoredState<Saved>(storageKey(slug), {});
  const stateOf = (s: SectionDef) => saved[s.id] ?? blankSection(s);
  const setSection = (s: SectionDef, st: SectionState) => setSaved({ ...saved, [s.id]: st });
  const [system, setSystemPref] = useStoredState<"metric" | "us">("aph.tools.utilities.units.v1", "metric");
  const us = system === "us";
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "green" | "amber" | "red"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setSystem = (us: boolean) => {
    const next: Saved = {};
    for (const s of util.sections) {
      const st = stateOf(s);
      const entries = { ...st.entries };
      for (const i of s.inputs) {
        if (i.choices || families[i.family].units.length < 2) continue;
        entries[i.id] = convertEntry(i, entries[i.id] ?? { v: null, u: i.unit }, us ? usUnit(i) : i.unit);
      }
      next[s.id] = { ...st, entries };
    }
    setSaved(next);
    setSystemPref(us ? "us" : "metric");
  };

  async function exportExcel() {
    setBusy("export");
    setNote(null);
    try {
      const { exportUtilities } = await import("@/lib/utilities/xlsx");
      await exportUtilities([util.slug], { [util.slug]: saved });
      setNote({ tone: "green", text: "Workbook downloaded. Your inputs are in the yellow cells; Excel recalculates every formula when you open it, and the Calculation Record sheet lists the site's results for comparison." });
    } catch (e) {
      setNote({ tone: "red", text: `Could not build the workbook: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  async function importExcel(file: File) {
    setBusy("import");
    setNote(null);
    try {
      const { importUtilities } = await import("@/lib/utilities/xlsx");
      const r = await importUtilities(file);
      const mine = r.states[util.slug];
      if (!mine || !Object.keys(mine).length) {
        setNote({ tone: "amber", text: r.recognized ? `That workbook has no ${util.short.toLowerCase()} inputs. Open the other calculators, or use the Excel Sheet Review to check any workbook.` : "That file is not an AirPermitHub utility workbook. Use the Excel Sheet Review to check any workbook's formulas." });
      } else {
        setSaved({ ...saved, ...mine });
        setNote({ tone: "green", text: `Loaded ${r.count[util.slug] ?? 0} values from ${file.name}. Results below are recalculated by the site.${r.mismatches.length ? ` ${r.mismatches.length} result${r.mismatches.length > 1 ? "s" : ""} in the file differ from the site's; see the Excel Sheet Review for the list.` : ""}` });
      }
    } catch (e) {
      setNote({ tone: "red", text: `Could not read that file: ${(e as Error).message}` });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <nav aria-label={`${util.short} calculations`} className="flex flex-wrap gap-2">
          {util.sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-sm border border-rule bg-canvas px-2.5 py-1 text-xs font-semibold text-navy-900 hover:border-gold-500">{i + 1}. {s.title}</a>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Units" className="inline-flex">
            <Button variant={us ? "subtle" : "primary"} size="sm" aria-pressed={!us} onClick={() => setSystem(false)}>Metric</Button>
            <Button variant={us ? "primary" : "subtle"} size="sm" aria-pressed={us} onClick={() => setSystem(true)}>US units</Button>
          </div>
          <Button variant="subtle" size="sm" disabled={busy !== null} onClick={exportExcel}><Download className="h-4 w-4" aria-hidden="true" /> {busy === "export" ? "Building…" : "Export to Excel"}</Button>
          <Button variant="subtle" size="sm" disabled={busy !== null} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden="true" /> {busy === "import" ? "Reading…" : "Import Excel"}</Button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="Import an Excel workbook" onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])} />
          <a href={WORKBOOK_PATH} download className="inline-flex h-9 items-center gap-2 rounded-sm border border-rule bg-white px-3.5 text-sm font-semibold text-navy-900 hover:border-gold-500"><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Blank workbook</a>
          <Button variant="subtle" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF</Button>
        </div>
        {note && <p role="status" className={cn("w-full rounded-lg px-3 py-2 text-sm", note.tone === "green" ? "bg-eco-50 text-eco-700" : note.tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700")}>{note.text}</p>}
        <p className="w-full text-xs text-muted">Imported files are read in your browser and never uploaded.</p>
      </div>
      {util.sections.map((s, i) => (
        <SectionCard key={s.id} n={i + 1} s={s} st={stateOf(s)} us={us} set={(st) => setSection(s, st)} />
      ))}
    </div>
  );
}

function SectionCard({ n, s, st, us, set }: { n: number; s: SectionDef; st: SectionState; us: boolean; set: (st: SectionState) => void }) {
  const uid = useId();
  const out = useMemo(() => runSection(s, st), [s, st]);
  const setEntry = (id: string, e: { v: number | null; u: string }) => set({ ...st, entries: { ...st.entries, [id]: e }, example: false });
  const solved = out.solved;
  const results = out.results.map((r) => ({ ...r, show: order(r.show, us) }));
  const keys = results.filter((r) => r.key);
  const rest = results.filter((r) => !r.key);

  return (
    <section id={s.id} className="scroll-mt-28 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby={`${uid}-h`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${uid}-h`} className="text-lg font-bold text-ink">{n}. {s.title}</h2>
          <p className="mt-1 text-sm text-muted">{s.question}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" onClick={() => set(us ? toUs(s, exampleSection(s)) : exampleSection(s))}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Worked example</Button>
          <Button variant="subtle" size="sm" onClick={() => set(blankSection(s))}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear</Button>
        </div>
      </div>
      {st.example && <p className="mt-3"><Badge tone="amber" wrap>Worked example: {s.example.title} Example values, not data from a real plant.</Badge></p>}
      <div className="mt-4 rounded-xl bg-canvas px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted uppercase"><Sigma className="h-3.5 w-3.5" aria-hidden="true" /> Formulas</p>
        <ul className="mt-1.5 space-y-1">
          {s.formulas.map((f) => <li key={f} className="font-mono text-xs break-words text-navy-800 sm:text-sm">{f}</li>)}
        </ul>
        {s.solveNote && <p className="mt-2 text-xs font-semibold text-brand-700">{s.solveNote}</p>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {s.inputs.map((i) => {
          const e = st.entries[i.id] ?? { v: null, u: i.unit };
          const fam = families[i.family];
          const isSolved = solved === i.id;
          return (
            <div key={i.id} className={cn(isSolved && "rounded-lg ring-2 ring-eco-500/40")}>
              <label htmlFor={`${uid}-${i.id}`} className={labelCls}>
                {i.label}{i.sym ? <span className="font-mono font-normal text-muted"> ({i.sym})</span> : null}
                {i.solvable && <span className="ml-1 font-normal text-brand-700">· can solve</span>}
              </label>
              {i.choices ? (
                <select id={`${uid}-${i.id}`} className={field} value={e.v ?? i.choices[0].value} onChange={(ev) => setEntry(i.id, { v: Number(ev.target.value), u: e.u })}>
                  {i.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <NumberField id={`${uid}-${i.id}`} value={e.v} onChange={(v) => setEntry(i.id, { v, u: e.u })} placeholder={isSolved ? "solved below" : i.optional ? "optional" : i.solvable ? "value or blank" : ""} className={cn(field, "min-w-0 flex-1")} />
                  {fam.units.length > 1 ? (
                    <select aria-label={`${i.label} unit`} className={cn(field, "w-auto max-w-[9.5rem] shrink-0 px-2")} value={e.u} onChange={(ev) => setEntry(i.id, convertEntry(i, e, ev.target.value))}>
                      {fam.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                  ) : fam.units[0].label ? <span className="flex h-10 shrink-0 items-center px-1 text-sm text-muted">{fam.units[0].label}</span> : null}
                </div>
              )}
              {i.help && <p className="mt-1 text-xs text-muted">{i.help}</p>}
            </div>
          );
        })}
      </div>

      {s.list && <ListEditor s={s} st={st} set={set} />}

      <div className="mt-5 rounded-xl border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
          <Calculator className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h3 className="text-sm font-bold text-ink">Results</h3>
        </div>
        <div className="p-4">
          {out.error && <p className="text-sm text-slate-700">{out.error}</p>}
          {keys.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keys.map((r) => (
                <li key={r.id} className="rounded-lg border border-gold-500/40 bg-gold-200/20 px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                  <p className="mt-0.5 text-xl font-bold text-navy-900 tabular-nums">{show(r.family, r.show[0], r.value)}</p>
                  {r.show.length > 1 && <p className="text-xs text-muted tabular-nums">{r.show.slice(1).map((u) => show(r.family, u, r.value)).join(" · ")}</p>}
                </li>
              ))}
            </ul>
          )}
          {rest.length > 0 && (
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Other results</caption>
              <tbody className="divide-y divide-line">
                {rest.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-slate-700">{r.label}</th>
                    <td className="py-1.5 text-right tabular-nums text-ink">{r.show.map((u) => show(r.family, u, r.value)).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {out.warnings.map((w) => <p key={w} className="mt-3 flex gap-2 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{w}</p>)}
        </div>
      </div>

      {out.steps.length > 0 && (
        <details className="mt-4 rounded-xl border border-line open:bg-white" open>
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-bold text-ink">Calculation steps ({out.steps.length})</summary>
          <ol className="space-y-2 px-4 pb-4">
            {out.steps.map((x, k) => (
              <li key={k} className="text-sm">
                <p className="font-semibold text-ink">{k + 1}. {x.label}{x.formula && <span className="ml-2 font-mono text-xs font-normal text-muted">{x.formula}</span>}</p>
                <p className="mt-0.5 font-mono text-xs break-words text-slate-700">{x.work}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="mt-3 text-xs text-muted">
        Sources:{" "}
        {s.refs.map((r, k) => (
          <span key={r.url}>{k > 0 && "; "}<a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">{r.title}</a></span>
        ))}
      </p>
    </section>
  );
}

function toUs(s: SectionDef, st: SectionState): SectionState {
  const entries = { ...st.entries };
  for (const i of s.inputs) if (!i.choices && families[i.family].units.length > 1) entries[i.id] = convertEntry(i, entries[i.id], usUnit(i));
  return { ...st, entries };
}

const show = (family: Family, u: string, v: number) => {
  if (family === "money") return `$${fmt(v, 6)}`;
  const lbl = unitOf(family, u).label;
  return `${fmt(fromSI(family, u, v))}${lbl ? ` ${lbl}` : ""}`;
};

function ListEditor({ s, st, set }: { s: SectionDef; st: SectionState; set: (st: SectionState) => void }) {
  const uid = useId();
  const L = s.list!;
  const rows = st.lists[L.id] ?? [];
  const setRows = (r: (string | number | null)[][]) => set({ ...st, lists: { ...st.lists, [L.id]: r }, example: false });
  const setCell = (ri: number, ci: number, v: string | number | null) => setRows(rows.map((r, k) => (k === ri ? r.map((c, j) => (j === ci ? v : c)) : r)));
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-ink">{L.label}</h3>
      <div className="relative mt-2 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              {L.columns.map((c) => <th key={c.id} scope="col" className="px-1 py-1.5 font-semibold">{c.label}{c.family && c.unit ? ` (${unitOf(c.family, c.unit).label})` : ""}</th>)}
              <th scope="col" className="w-8"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {L.columns.map((c, ci) => (
                  <td key={c.id} className="px-1 py-1">
                    {c.text ? (
                      <input aria-label={`${c.label}, row ${ri + 1}`} id={`${uid}-${ri}-${ci}`} className={field} value={(r[ci] as string) ?? ""} onChange={(e) => setCell(ri, ci, e.target.value)} />
                    ) : (
                      <NumberField ariaLabel={`${c.label}, row ${ri + 1}`} value={r[ci] === null || r[ci] === "" ? null : Number(r[ci])} onChange={(v) => setCell(ri, ci, v)} />
                    )}
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button type="button" aria-label={`Remove row ${ri + 1}`} onClick={() => setRows(rows.filter((_, k) => k !== ri))} className="no-print rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="no-print mt-2"><Button variant="subtle" size="sm" disabled={rows.length >= L.maxRows} onClick={() => setRows([...rows, L.columns.map(() => null)])}><Plus className="h-4 w-4" aria-hidden="true" /> Add row</Button></div>
    </div>
  );
}
