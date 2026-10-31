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
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm the deviation was discovered (the clock most permits start from). */
  discovered?: string;
  /** The prompt reporting rule (from the user's list) that applies, or "" for none. */
  ruleId?: string;
}

/**
 * A prompt reporting deadline as the user's permit or rule states it. Nothing
 * is prefilled: Part 70 leaves "prompt" to the permitting authority, so the
 * user enters the period and where it is written.
 */
export interface PromptRule {
  id: string;
  /** "Condition 3.4 excess emissions report". */
  name: string;
  amount: number | null;
  unit: "hours" | "days";
  /** What the clock starts from. */
  from: "discovery" | "start";
  /** Where the deadline is written (permit condition or rule citation). */
  source: string;
}

export type PromptStatus = "no-rule" | "incomplete" | "on-time" | "late" | "due" | "overdue";

export interface PromptResult {
  status: PromptStatus;
  /** "YYYY-MM-DD" for day rules, "YYYY-MM-DD HH:mm" for hour rules. */
  due: string | null;
  /** How the deadline was computed. */
  steps: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const parseStamp = (s: string) => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0)), hasTime: !!m[4] };
};

/**
 * The prompt report deadline for a deviation under the chosen rule. Day rules
 * add calendar days to the date; hour rules need a time and add hours. `today`
 * (YYYY-MM-DD) decides due versus overdue for unreported entries.
 */
export function promptDeadline(dev: Deviation, rules: PromptRule[], today: string): PromptResult {
  const rule = dev.ruleId ? rules.find((r) => r.id === dev.ruleId) : undefined;
  if (!rule) return { status: "no-rule", due: null, steps: "No prompt reporting rule selected." };
  const baseText = rule.from === "discovery" ? dev.discovered || "" : dev.start;
  const base = parseStamp(baseText);
  const what = rule.from === "discovery" ? "discovery" : "start";
  if (rule.amount === null || !Number.isFinite(rule.amount) || rule.amount < 0) return { status: "incomplete", due: null, steps: `Enter the reporting period for “${rule.name}”.` };
  if (!base) return { status: "incomplete", due: null, steps: `Enter the ${what} date.` };
  let due: string;
  let steps: string;
  if (rule.unit === "hours") {
    if (!base.hasTime) return { status: "incomplete", due: null, steps: `An hours-based deadline needs the ${what} time as well as the date.` };
    const d = new Date(base.date.getTime() + rule.amount * 3600_000);
    due = `${ymd(d)} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
    steps = `${baseText.replace("T", " ")} (${what}) + ${rule.amount} hours = ${due}`;
  } else {
    const d = new Date(base.date.getTime() + Math.round(rule.amount) * 86_400_000);
    due = ymd(d);
    steps = `${baseText.slice(0, 10)} (${what}) + ${Math.round(rule.amount)} calendar days = ${due}`;
  }
  const dueDay = due.slice(0, 10);
  if (dev.reportedOn) return { status: dev.reportedOn <= dueDay ? "on-time" : "late", due, steps: `${steps}; reported ${dev.reportedOn}${rule.unit === "hours" ? " (compared by date)" : ""}` };
  return { status: today > dueDay ? "overdue" : "due", due, steps };
}

export const promptLabels: Record<PromptStatus, string> = {
  "no-rule": "No prompt rule",
  incomplete: "Deadline incomplete",
  "on-time": "Reported on time",
  late: "Reported late",
  due: "Report due",
  overdue: "Overdue",
};

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

export function deviationsCsv(devs: Deviation[], startMonth: number, months: number, rules: PromptRule[] = [], today = ""): string {
  const head = ["Reporting period", ...deviationColumns.map((c) => c.label), "Discovered", "Prompt reporting rule", "Rule source", "Prompt deadline", "Prompt status", "Deadline calculation"];
  const rows = devs.map((d) => {
    const rule = rules.find((r) => r.id === d.ruleId);
    const p = promptDeadline(d, rules, today);
    return [d.start ? periodFor(d.start, startMonth, months).label : "", ...deviationColumns.map((c) => d[c.key]), (d.discovered ?? "").replace("T", " "), rule?.name ?? "", rule?.source ?? "", p.due ?? "", promptLabels[p.status], p.steps];
  });
  return csvLines([["AirPermitHub Template: Deviation Log (not an agency form)"], head, ...rows]);
}

