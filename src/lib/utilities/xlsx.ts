/**
 * Excel import and export for the utility calculators, in the browser only
 * (loaded on demand, so the spreadsheet library is not in any page bundle).
 * Files people import are read here and never sent anywhere.
 */
import type { Workbook, Worksheet, Cell } from "exceljs";
import { csvFileName } from "@/lib/csv";
import { blankSection, collectionOf, getUtility, runSection, type SectionState } from "./index";
import { reviewCells, type CellModel, type ReviewReport } from "./review";
import { families, fmt, fromSI, toSI, unitOf } from "./units";
import { KEY_COL, LIST_ROWS, inKey, listKey, parseKey } from "./workbook-layout";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_CELLS = 200_000;

async function lib() {
  const m = (await import("exceljs")) as unknown as { default?: typeof import("exceljs") } & typeof import("exceljs");
  return m.default ?? m;
}

async function load(data: ArrayBuffer): Promise<Workbook> {
  const ExcelJS = await lib();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  return wb;
}

async function readFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error("the file is larger than 15 MB");
  if (!/\.xlsx$/i.test(file.name)) throw new Error("only .xlsx workbooks can be read (save .xls or .xlsm files as .xlsx first)");
  return load(await file.arrayBuffer());
}

/** A cell's plain value: number, text, boolean, or null; formulas give their cached result. */
function plain(c: Cell): { value: string | number | boolean | null; error?: string; formula?: string } {
  const v = c.value as unknown;
  const formula = (c as unknown as { formula?: string }).formula || undefined;
  const scalar = (x: unknown): { value: string | number | boolean | null; error?: string } => {
    if (x === null || x === undefined) return { value: null };
    if (typeof x === "number" || typeof x === "string" || typeof x === "boolean") return { value: x };
    if (x instanceof Date) return { value: x.toISOString().slice(0, 10) };
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.error === "string") return { value: o.error, error: o.error };
      if (Array.isArray(o.richText)) return { value: (o.richText as { text: string }[]).map((t) => t.text).join("") };
      if (typeof o.text === "string") return { value: o.text };
      if ("result" in o) return scalar(o.result);
    }
    return { value: null };
  };
  return { ...scalar(v), formula };
}

function toCells(wb: Workbook): CellModel[] {
  const cells: CellModel[] = [];
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (c) => {
        if (cells.length >= MAX_CELLS) return;
        const p = plain(c);
        cells.push({ sheet: ws.name, address: c.address, value: p.value, formula: p.formula, error: p.error });
      });
    });
  });
  return cells;
}

/** Finds a unit by its label or id within a family; falls back to `dflt`. */
function unitFromText(family: keyof typeof families, text: unknown, dflt: string) {
  if (typeof text !== "string" || !text.trim()) return dflt;
  const t = text.trim().toLowerCase();
  const u = families[family].units.find((x) => x.label.toLowerCase() === t || x.id === t);
  return u?.id ?? dflt;
}

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x)) ? Number(x) : null);

export interface Mismatch {
  utility: string;
  section: string;
  result: string;
  file: string;
  site: string;
  diffPct: number;
}

export interface ImportResult {
  recognized: boolean;
  states: Record<string, Record<string, SectionState>>;
  count: Record<string, number>;
  /** Results the workbook had calculated that differ from the site's by more than 0.5 %. */
  mismatches: Mismatch[];
  /** Results compared. */
  compared: number;
  /** Results found with no cached value (the file was never opened and saved in Excel). */
  uncached: number;
  /** Result cells where the formula was replaced by a typed value. */
  overwritten: { sheet: string; address: string; label: string }[];
}

function readTemplate(wb: Workbook): ImportResult {
  const states: ImportResult["states"] = {};
  const count: Record<string, number> = {};
  const outs: { slug: string; section: string; id: string; value: number | null; unitText: unknown }[] = [];
  const overwritten: ImportResult["overwritten"] = [];
  let recognized = false;
  wb.eachSheet((ws: Worksheet) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      const key = parseKey(plain(row.getCell(KEY_COL)).value);
      if (!key) return;
      const util = getUtility(key.slug);
      const sec = util?.sections.find((s) => s.id === key.section);
      if (!util || !sec) return;
      recognized = true;
      const bySlug = (states[key.slug] ??= {});
      const st = (bySlug[sec.id] ??= { ...blankSection(sec), lists: sec.list ? { [sec.list.id]: [] } : {} });
      if (key.kind === "in") {
        const def = sec.inputs.find((i) => i.id === key.id);
        if (!def) return;
        const v = num(plain(row.getCell(2)).value);
        if (v === null) return;
        st.entries[def.id] = { v, u: def.choices ? def.unit : unitFromText(def.family, plain(row.getCell(3)).value, def.unit) };
        count[key.slug] = (count[key.slug] ?? 0) + 1;
      } else if (key.kind === "list" && sec.list && key.id === sec.list.id) {
        const cols = sec.list.columns;
        const vals = cols.map((c, j) => {
          const p = plain(row.getCell(j + 1)).value;
          return c.text ? (p === null ? "" : String(p)) : num(p);
        });
        if (vals.slice(1).every((x) => x === null) && !vals[0]) return;
        st.lists[sec.list.id].push(vals);
        count[key.slug] = (count[key.slug] ?? 0) + 1;
      } else if (key.kind === "out") {
        const b = plain(row.getCell(2));
        if (!b.formula && b.value !== null && b.value !== "") overwritten.push({ sheet: ws.name, address: row.getCell(2).address, label: String(plain(row.getCell(1)).value ?? key.id) });
        outs.push({ slug: key.slug, section: sec.id, id: key.id, value: num(plain(row.getCell(2)).value), unitText: plain(row.getCell(3)).value });
      }
    });
  });
  for (const bySlug of Object.values(states)) for (const st of Object.values(bySlug)) for (const [k, rows] of Object.entries(st.lists)) if (!rows.length) st.lists[k] = [[null, null, null, null]];

  const mismatches: Mismatch[] = [];
  let compared = 0, uncached = 0;
  for (const o of outs) {
    const util = getUtility(o.slug)!;
    const sec = util.sections.find((s) => s.id === o.section)!;
    const st = states[o.slug]?.[o.section];
    if (!st) continue;
    const site = runSection(sec, st).results.find((r) => r.id === o.id);
    if (!site) continue;
    if (o.value === null) {
      uncached++;
      continue;
    }
    const u = unitFromText(site.family, o.unitText, site.show[0]);
    const fileSI = site.family === "money" || site.family === "ratio" || site.family === "count" || site.family === "pct" ? o.value : toSI(site.family, u, o.value);
    compared++;
    const diff = Math.abs(fileSI - site.value) / Math.max(Math.abs(site.value), 1e-9);
    if (diff > 0.005 && Math.abs(fileSI - site.value) > 1e-9) {
      mismatches.push({ utility: util.short, section: sec.title, result: site.label, file: `${fmt(o.value)} ${unitOf(site.family, u).label}`.trim(), site: `${fmt(fromSI(site.family, u, site.value))} ${unitOf(site.family, u).label}`.trim(), diffPct: diff * 100 });
    }
  }
  return { recognized, states, count, mismatches, compared, uncached, overwritten };
}

/** Reads an AirPermitHub utility workbook (or one exported from the site) back into the calculators. */
export async function importUtilities(file: File): Promise<ImportResult> {
  return readTemplate(await readFile(file));
}

export interface FileReview {
  file: string;
  report: ReviewReport;
  template: ImportResult;
}

/** Reviews any .xlsx: formula checks for every cell, plus a full recalculation check when it is our workbook. */
export async function reviewFile(file: File): Promise<FileReview> {
  const wb = await readFile(file);
  const cells = toCells(wb);
  const template = readTemplate(wb);
  // In our own workbook the formulas guard blanks and document their constants, so only real faults are listed.
  const report = reviewCells(cells);
  if (template.recognized) {
    report.issues = report.issues.filter((i) => i.sheet !== "Calculation Record" && (i.kind === "error" || i.kind === "broken-ref" || i.kind === "text-number"));
    for (const k of Object.keys(report.counts) as (keyof typeof report.counts)[]) report.counts[k] = report.issues.filter((i) => i.kind === k).length;
  }
  return { file: file.name, report, template };
}

function download(buf: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads the formula workbook with the person's inputs in its input cells
 * (converted to the workbook's units) and a Calculation Record sheet with the
 * site's results and steps.
 */
export async function exportUtilities(slugs: string[], saved: Record<string, Record<string, SectionState>>) {
  const col = collectionOf(slugs[0]);
  const res = await fetch(col.workbook);
  if (!res.ok) throw new Error("the workbook template could not be loaded");
  const wb = await load(await res.arrayBuffer());
  const where = new Map<string, Cell>();
  const listRows = new Map<string, number>();
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      const raw = plain(row.getCell(KEY_COL)).value;
      if (typeof raw === "string" && parseKey(raw)) {
        where.set(raw.trim(), row.getCell(2));
        listRows.set(raw.trim(), row.number);
      }
    });
  });
  const rec = wb.addWorksheet("Calculation Record");
  rec.columns = [{ width: 46 }, { width: 22 }, { width: 22 }, { width: 90 }];
  rec.addRow([`AirPermitHub ${col.name.toLowerCase()} calculation record (engineering aid, not an agency form)`]).font = { bold: true, size: 13 };
  rec.addRow(["Exported", new Date().toISOString().slice(0, 10)]);
  rec.addRow(["The yellow input cells on each sheet hold the same inputs; Excel recalculates those sheets when the file opens. This sheet lists the website's own results for comparison."]);
  let skipped = 0;
  for (const slug of slugs) {
    const util = getUtility(slug);
    if (!util) continue;
    for (const sec of util.sections) {
      const st = saved[slug]?.[sec.id];
      if (!st) continue;
      for (const i of sec.inputs) {
        const e = st.entries[i.id];
        const cell = where.get(inKey(slug, sec.id, i.id));
        if (!cell) continue;
        cell.value = e && e.v !== null ? (i.choices ? e.v : Number(fromSI(i.family, i.unit, toSI(i.family, e.u, e.v)).toPrecision(10))) : null;
      }
      if (sec.list) {
        const rows = st.lists[sec.list.id] ?? [];
        for (let r = 0; r < LIST_ROWS; r++) {
          const n = listRows.get(listKey(slug, sec.id, sec.list.id, r));
          if (n === undefined) continue;
          const row = where.get(listKey(slug, sec.id, sec.list.id, r))!.worksheet.getRow(n);
          sec.list.columns.forEach((_, j) => { row.getCell(j + 1).value = rows[r]?.[j] ?? null; });
        }
        if (rows.length > LIST_ROWS) skipped += rows.length - LIST_ROWS;
      }
      const out = runSection(sec, st);
      rec.addRow([]);
      rec.addRow([`${util.short}: ${sec.title}`]).font = { bold: true, size: 12 };
      for (const i of sec.inputs) {
        const e = st.entries[i.id];
        if (!e || e.v === null) continue;
        rec.addRow([i.label, e.v, i.choices ? i.choices.find((c) => c.value === e.v)?.label ?? "" : unitOf(i.family, e.u).label]);
      }
      if (out.error) rec.addRow(["Result", out.error]);
      for (const r of out.results) {
        const u = r.show[0];
        rec.addRow([r.label, Number(fromSI(r.family, u, r.value).toPrecision(8)), r.family === "money" ? "$" : unitOf(r.family, u).label]).font = r.key ? { bold: true } : {};
      }
      out.steps.forEach((s, k) => { rec.addRow([`Step ${k + 1}: ${s.label}`, "", "", s.work]); });
      for (const w of out.warnings) rec.addRow(["Note", "", "", w]);
    }
  }
  if (skipped) rec.addRow(["Note", "", "", `${skipped} list rows beyond the workbook's ${LIST_ROWS} rows are in this record but not in the formula sheet.`]);
  wb.calcProperties = { ...(wb.calcProperties ?? {}), fullCalcOnLoad: true };
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  download(buf, csvFileName(col.file, slugs.length === 1 ? slugs[0] : "all").replace(/\.csv$/, ".xlsx"));
}
