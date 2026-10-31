/**
 * Deviation log helpers. The permit defines what a deviation is, which ones
 * need prompt reporting, and the reporting periods; the user sets the period
 * start month to match the permit, and these helpers group entries by it.
 */

import { csvLines } from "../csv";

export interface Deviation {
  id: string;
  /** YYYY-MM-DD the deviation began. */
  start: string;
  /** YYYY-MM-DD it ended, or "" if ongoing. */
  end: string;
  unit: string;
  requirement: string;
  description: string;
  cause: string;
  corrective: string;
  durationHours: number | null;
  pollutants: string;
  excessEstimate: string;
  /** YYYY-MM-DD a prompt (or other) deviation report was submitted, or "". */
  reportedOn: string;
  status: "open" | "closed";
}

export const deviationColumns: { key: keyof Deviation; label: string }[] = [
  { key: "start", label: "Start date" },
  { key: "end", label: "End date" },
  { key: "unit", label: "Emission unit" },
  { key: "requirement", label: "Permit condition / requirement" },
  { key: "description", label: "What happened" },
  { key: "cause", label: "Probable cause" },
  { key: "corrective", label: "Corrective action / preventive measures" },
  { key: "durationHours", label: "Duration (hours)" },
  { key: "pollutants", label: "Pollutant(s)" },
  { key: "excessEstimate", label: "Excess emissions estimate" },
  { key: "reportedOn", label: "Prompt report submitted" },
  { key: "status", label: "Status" },
];

export interface ReportingPeriod {
  key: string;
  label: string;
  /** YYYY-MM-DD inclusive. */
  from: string;
  /** YYYY-MM-DD inclusive. */
  to: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/**
 * The reporting period containing a date, for periods of `months` length
 * (6 for semiannual, 3 for quarterly, 12 for annual) whose cycle starts in
 * `startMonth` (1-12).
 */
export function periodFor(date: string, startMonth: number, months: number): ReportingPeriod {
  const [y, m] = date.split("-").map(Number);
  const offset = (((m - startMonth) % months) + months) % months;
  let sm0 = m - 1 - offset; // zero-based start month, may be negative
  let sy = y;
  while (sm0 < 0) { sm0 += 12; sy -= 1; }
  const endTotal = sm0 + months - 1;
  const ey = sy + Math.floor(endTotal / 12);
  const em0 = endTotal % 12;
  const from = `${sy}-${pad(sm0 + 1)}-01`;
  const to = `${ey}-${pad(em0 + 1)}-${pad(lastDay(ey, em0))}`;
  return { key: from, label: `${MONTHS[sm0]} ${sy} – ${MONTHS[em0]} ${ey}`, from, to };
}

/** Groups deviations by reporting period, newest period first. Entries keep their order within a period. */
export function groupByPeriod(devs: Deviation[], startMonth: number, months: number) {
  const groups = new Map<string, { period: ReportingPeriod; items: Deviation[] }>();
  for (const d of devs) {
    if (!d.start) continue;
    const p = periodFor(d.start, startMonth, months);
    const g = groups.get(p.key) ?? { period: p, items: [] };
    g.items.push(d);
    groups.set(p.key, g);
  }
  return [...groups.values()].sort((a, b) => b.period.from.localeCompare(a.period.from));
}

export function deviationsCsv(devs: Deviation[], startMonth: number, months: number): string {
  const head = ["Reporting period", ...deviationColumns.map((c) => c.label)];
  const rows = devs.map((d) => [d.start ? periodFor(d.start, startMonth, months).label : "", ...deviationColumns.map((c) => d[c.key])]);
  return csvLines([["AirPermitHub Template: Deviation Log (not an agency form)"], head, ...rows]);
}

