import { describe, expect, it } from "vitest";
import { dueDates, facilityStatus, foldLine, occurrences, rrule, summarize, tasksCsv, toIcs, ymd, type StoredTask } from "./compliance-calendar";

const d = (s: string) => {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const task = (patch: Partial<StoredTask> = {}): StoredTask => ({ id: "u1", title: "Report", facility: "Site A", category: "Reporting", date: "2026-01-15", ...patch });
const dates = (t: StoredTask, from = "2025-01-01", until = "2027-12-31") => dueDates(t, d(from), d(until)).map(ymd);

describe("repeating due dates", () => {
  it("returns a one-off task once, inside the window only", () => {
    expect(dates(task())).toEqual(["2026-01-15"]);
    expect(dates(task(), "2026-02-01")).toEqual([]);
  });

  it("steps monthly, quarterly, every 6 months, and yearly", () => {
    expect(dates(task({ repeat: "quarterly" }), "2026-01-01", "2026-12-31")).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
    expect(dates(task({ repeat: "semiannual" }), "2026-01-01", "2027-03-01")).toEqual(["2026-01-15", "2026-07-15", "2027-01-15"]);
    expect(dates(task({ repeat: "annual" }), "2026-01-01", "2028-12-31")).toEqual(["2026-01-15", "2027-01-15", "2028-01-15"]);
    expect(dates(task({ repeat: "monthly" }), "2026-01-01", "2026-03-31")).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("keeps month-end starts on the last day, and skips days a month doesn't have otherwise (as the RRULE does)", () => {
    expect(dates(task({ date: "2026-01-31", repeat: "monthly" }), "2026-01-01", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(rrule(task({ date: "2026-01-31", repeat: "monthly" }))).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=-1");
    expect(dates(task({ date: "2026-01-30", repeat: "monthly" }), "2026-01-01", "2026-04-30")).toEqual(["2026-01-30", "2026-03-30", "2026-04-30"]);
    expect(rrule(task({ date: "2026-01-30", repeat: "monthly" }))).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1");
  });

  it("doesn't show repeats from before the task was added", () => {
    expect(dates(task({ repeat: "quarterly", created: "2026-05-01" }), "2026-01-01", "2026-12-31")).toEqual(["2026-07-15", "2026-10-15"]);
  });

  it("reads tasks the Compliance Matrix Builder wrote (no repeat or created fields)", () => {
    expect(dates({ id: "mx-1-0", title: "VE observation", facility: "F", category: "Monitoring", date: "2026-03-01" })).toEqual(["2026-03-01"]);
  });
});

describe("status and summaries", () => {
  const today = d("2026-06-01");
  const occ = occurrences(
    [
      task({ id: "a", date: "2026-05-20" }),
      task({ id: "b", date: "2026-06-10", facility: "Site B" }),
      task({ id: "c", date: "2026-06-25" }),
      task({ id: "e", date: "2026-05-01", done: ["2026-05-01"] }),
    ],
    today, d("2026-01-01"), d("2026-12-31"),
  );

  it("marks overdue, due soon, on track, and done", () => {
    expect(occ.map((o) => [o.task.id, o.status])).toEqual([["e", "completed"], ["a", "overdue"], ["b", "due-soon"], ["c", "on-track"]]);
  });

  it("counts only open items", () => {
    expect(summarize(occ, today)).toEqual({ overdue: 1, dueSoon: 1, next30: 2, completed: 1 });
  });

  it("rolls up each facility to its most urgent open item", () => {
    expect(facilityStatus(occ).map((f) => [f.name, f.status, f.open])).toEqual([["Site A", "overdue", 2], ["Site B", "due-soon", 1]]);
  });
});

describe(".ics export", () => {
  const now = new Date("2026-10-31T12:00:00Z");

  it("writes a valid calendar with repeats, reminders, and the basis", () => {
    const ics = toIcs([task({ repeat: "quarterly", remindDays: 7, basis: "Permit O-1, Condition 3.2", notes: "Two lines\nhere" })], now);
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines).toContain("DTSTART;VALUE=DATE:20260115");
    expect(lines).toContain("DTEND;VALUE=DATE:20260116");
    expect(lines).toContain("RRULE:FREQ=MONTHLY;INTERVAL=3");
    expect(lines).toContain("TRIGGER:-P7D");
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("Basis: Permit O-1\\, Condition 3.2");
    expect(unfolded).toContain("Notes: Two lines\\nhere");
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it("leaves out one-off tasks already done", () => {
    expect(toIcs([task({ done: ["2026-01-15"] })], now)).not.toContain("BEGIN:VEVENT");
    expect(toIcs([task({ repeat: "annual", done: ["2026-01-15"] })], now)).toContain("RRULE:FREQ=YEARLY");
  });

  it("folds long lines without splitting characters", () => {
    const long = `SUMMARY:${"é".repeat(60)}`;
    const folded = foldLine(long);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
  });
});

it("exports the task list as CSV", () => {
  const csv = tasksCsv([task({ repeat: "annual", basis: 'Rule "A"' })]).split("\n");
  expect(csv[0]).toContain("Basis (permit condition or rule)");
  expect(csv[1]).toContain('"Rule ""A"""');
  expect(csv[1]).toContain("Annually");
});
