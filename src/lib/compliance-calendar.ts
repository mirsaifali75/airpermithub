import { complianceCategories } from "./data/compliance";
import type { ComplianceStatus } from "./data/types";

/**
 * The user's compliance tasks: storage shape, repeat rules, status, and
 * exports (.ics and CSV). Tasks live in this browser until accounts launch.
 * Other tools (the Compliance Matrix Builder) write one-off tasks to the same
 * store, so every field added here is optional.
 */

export type Category = (typeof complianceCategories)[number];
export type Repeat = "none" | "monthly" | "quarterly" | "semiannual" | "annual";

export interface StoredTask {
  id: string;
  title: string;
  facility: string;
  category: Category;
  /** First (or only) due date, YYYY-MM-DD. */
  date: string;
  repeat?: Repeat;
  /** Days before each due date to be reminded in the exported calendar. */
  remindDays?: number;
  /** Where the deadline comes from: permit condition or rule citation. */
  basis?: string;
  notes?: string;
  /** Due dates (YYYY-MM-DD) marked done. */
  done?: string[];
  /** YYYY-MM-DD the task was added; repeats before this date aren't shown. */
  created?: string;
}

export interface Occurrence {
  /** Unique per occurrence: task id plus due date. */
  key: string;
  task: StoredTask;
  due: Date;
  status: ComplianceStatus;
}

export const STORE = "aph.compliance.tasks.v1";

export const repeatLabels: Record<Repeat, string> = {
  none: "Does not repeat",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every 6 months",
  annual: "Annually",
};
const repeatMonths: Record<Exclude<Repeat, "none">, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const DAY = 86400000;

/** A start date on the last day of its month repeats on the last day of each month (e.g. Jan 31, Apr 30, Jul 31). */
const isMonthEnd = (d: Date) => d.getDate() === daysIn(d.getFullYear(), d.getMonth()) && d.getDate() >= 28;

/**
 * Due dates of a task between `from` and `until` (inclusive). Repeats follow
 * the same rule as the exported RRULE: a day that doesn't exist in a month is
 * skipped, except month-end starts, which stay on the last day.
 */
export function dueDates(t: StoredTask, from: Date, until: Date): Date[] {
  const start = parseYmd(t.date);
  const repeat = t.repeat ?? "none";
  if (repeat === "none") return +start >= +from && +start <= +until ? [start] : [];
  const step = repeatMonths[repeat];
  const monthEnd = isMonthEnd(start) && step < 12;
  const floor = Math.max(+from, t.created ? +parseYmd(t.created) : -Infinity);
  const out: Date[] = [];
  for (let k = 0; k < 600 && out.length < 240; k++) {
    const m = start.getMonth() + k * step;
    const y = start.getFullYear() + Math.floor(m / 12);
    const mm = ((m % 12) + 12) % 12;
    const last = daysIn(y, mm);
    if (!monthEnd && start.getDate() > last) continue;
    const d = new Date(y, mm, monthEnd ? last : start.getDate());
    if (+d > +until) break;
    if (+d >= floor) out.push(d);
  }
  return out;
}

export function statusFor(due: Date, today: Date, done: boolean): ComplianceStatus {
  if (done) return "completed";
  const days = (+due - +today) / DAY;
  return days < 0 ? "overdue" : days <= 14 ? "due-soon" : "on-track";
}

/** Every occurrence of the user's tasks in a window, sorted by date. */
export function occurrences(tasks: StoredTask[], today: Date, from: Date, until: Date): Occurrence[] {
  return tasks
    .flatMap((task) =>
      dueDates(task, from, until).map((due) => {
        const key = ymd(due);
        return { key: `${task.id}@${key}`, task, due, status: statusFor(due, today, !!task.done?.includes(key)) };
      }))
    .sort((a, b) => +a.due - +b.due);
}

/** Counts for the summary cards, from the user's own tasks. */
export function summarize(occ: Occurrence[], today: Date) {
  const open = occ.filter((o) => o.status !== "completed");
  const within = (days: number) => open.filter((o) => +o.due >= +today && +o.due <= +today + days * DAY).length;
  return {
    overdue: open.filter((o) => o.status === "overdue").length,
    dueSoon: within(14),
    next30: within(30),
    completed: occ.filter((o) => o.status === "completed").length,
  };
}

/** One row per facility: the most urgent open status and how many tasks have something open. */
export function facilityStatus(occ: Occurrence[]) {
  const rank: ComplianceStatus[] = ["overdue", "due-soon", "on-track"];
  const map = new Map<string, { name: string; status: ComplianceStatus; open: number; next?: Date; ids: Set<string> }>();
  for (const o of occ) {
    const name = o.task.facility || "My facility";
    const row = map.get(name) ?? { name, status: "completed" as ComplianceStatus, open: 0, ids: new Set<string>() };
    if (o.status !== "completed") {
      row.ids.add(o.task.id);
      row.open = row.ids.size;
      if (row.status === "completed" || rank.indexOf(o.status) < rank.indexOf(row.status)) row.status = o.status;
      if (o.status !== "overdue" && (!row.next || +o.due < +row.next)) row.next = o.due;
    }
    map.set(name, row);
  }
  return [...map.values()].map(({ ids: _ids, ...row }) => row).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- .ics (RFC 5545) ----------

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets, continuing with a leading space. */
export function foldLine(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      size = 0;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function rrule(t: StoredTask): string | null {
  const repeat = t.repeat ?? "none";
  if (repeat === "none") return null;
  if (repeat === "annual") return "RRULE:FREQ=YEARLY";
  const start = parseYmd(t.date);
  return `RRULE:FREQ=MONTHLY;INTERVAL=${repeatMonths[repeat]}${isMonthEnd(start) ? ";BYMONTHDAY=-1" : ""}`;
}

export function toIcs(tasks: StoredTask[], now: Date) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AirPermitHub//Compliance Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:AirPermitHub compliance tasks"];
  for (const t of tasks) {
    const start = parseYmd(t.date);
    const repeat = rrule(t);
    if (!repeat && t.done?.includes(t.date)) continue;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const description = [
      `Facility: ${t.facility || "My facility"}`,
      `Category: ${t.category}`,
      t.basis ? `Basis: ${t.basis}` : "",
      t.notes ? `Notes: ${t.notes}` : "",
      "Exported from AirPermitHub. Confirm the date against the permit condition or rule it comes from.",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@airpermithub.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start).replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${ymd(end).replace(/-/g, "")}`,
      ...(repeat ? [repeat] : []),
      `SUMMARY:${icsText(t.title)}`,
      `DESCRIPTION:${icsText(description)}`,
      `CATEGORIES:${icsText(t.category)}`,
      "TRANSP:TRANSPARENT",
    );
    if (t.remindDays && t.remindDays > 0) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(`Due in ${t.remindDays} day${t.remindDays === 1 ? "" : "s"}: ${t.title}`)}`, `TRIGGER:-P${t.remindDays}D`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function tasksCsv(tasks: StoredTask[]) {
  const rows = [
    ["Task", "Facility", "Category", "First due", "Repeats", "Reminder (days before)", "Basis (permit condition or rule)", "Notes", "Dates marked done"],
    ...tasks.map((t) => [t.title, t.facility, t.category, t.date, repeatLabels[t.repeat ?? "none"], t.remindDays ?? "", t.basis ?? "", t.notes ?? "", (t.done ?? []).join(" ")]),
  ];
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
