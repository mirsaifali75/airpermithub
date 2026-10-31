import { describe, expect, it } from "vitest";
import { converterDefaults, converters, getConverter, molarVolumeScf } from "./converters";
import { deviationsCsv, groupByPeriod, periodFor, type Deviation } from "./deviations";
import { addMonthsToDate, calendarCategory, calendarTask, conditionTitle, parsePermitText } from "./matrix";
import { dueDates, parseYmd } from "../compliance-calendar";
import { addMonths, monthIndex, parsePastedColumn, parsePastedTable } from "./months";
import { baselineWindows, bestBaseline, projectIncrease } from "./nsr";
import { computeRolling, firstForecastExceedance, nextMonthHeadroom } from "./rolling";

const pts = (vals: (number | null)[]) => vals.map((value) => ({ value }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe("rolling limits", () => {
  const o = { period: 12, mode: "sum" as const, limit: 100, alertPct: 90 };
  const rows = computeRolling(pts(range(1, 14)), o);

  it("marks windows shorter than the period as partial", () => {
    expect(rows[10].status).toBe("partial");
    expect(rows[10].total).toBe(66);
  });
  it("sums full windows and compares with the limit", () => {
    expect(rows[11]).toMatchObject({ total: 78, status: "ok" });
    expect(rows[12]).toMatchObject({ total: 90, status: "watch" }); // 2..13, at the alert level
    expect(rows[13]).toMatchObject({ total: 102, status: "over" }); // 3..14
  });
  it("treats a total equal to the limit as not over", () => {
    const r = computeRolling(pts(Array(12).fill(10)), { ...o, limit: 120, alertPct: 101 });
    expect(r[11]).toMatchObject({ total: 120, status: "ok" });
  });
  it("flags a full window with a missing month", () => {
    const vals: (number | null)[] = range(1, 12);
    vals[5] = null;
    expect(computeRolling(pts(vals), o)[11].status).toBe("missing");
  });
  it("averages in average mode", () => {
    const r = computeRolling(pts(range(1, 12)), { ...o, mode: "average", limit: 6 });
    expect(r[11].total).toBe(6.5);
    expect(r[11].status).toBe("over");
  });
  it("computes next-month headroom from the last period - 1 months", () => {
    expect(nextMonthHeadroom(pts(range(1, 14)), o)).toBe(1); // 100 - sum(4..14)
    expect(nextMonthHeadroom(pts(range(1, 14)), { ...o, mode: "average", limit: 8 })).toBe(-3); // 96 - 99
    expect(nextMonthHeadroom(pts(range(1, 5)), o)).toBeNull();
    expect(nextMonthHeadroom(pts(range(1, 14)), { ...o, limit: null })).toBeNull();
  });
  it("finds the first forecast month over the limit", () => {
    const points = [...pts(Array(12).fill(8)), ...Array(3).fill({ value: 10, forecast: true })];
    const r = computeRolling(points, o); // 96, then 98, 100, 102
    expect(firstForecastExceedance(r)).toBe(14);
  });
});

describe("pasted values", () => {
  it("reads a column with a header, label cells, thousands separators, and blanks", () => {
    expect(parsePastedColumn("NOx (tons)\n2026-01\t1,234.5\n2026-02\t\n2026-03\t7\n\n")).toEqual([1234.5, null, 7]);
  });
  it("reads a table and drops label columns", () => {
    expect(parsePastedTable("Month\tEU-1\tEU-2\nJan-24\t1\t2\nFeb-24\t3\t\n")).toEqual([[1, 2], [3, null]]);
  });
  it("does month arithmetic", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(monthIndex("2026-01") - monthIndex("2025-01")).toBe(12);
  });
});

describe("NSR baseline and project test", () => {
  const unitA = [...Array(12).fill(1), ...Array(12).fill(2), ...Array(12).fill(3)];
  const base = { window: 24, dataStart: 1000, firstEligible: 1000, lastEligible: 1035 };

  it("annualizes each 24-month window and picks the highest", () => {
    const w = baselineWindows([unitA], base);
    expect(w).toHaveLength(13);
    expect(w[0].total).toBe(18); // (12*1 + 12*2) * 12 / 24
    expect(bestBaseline(w)).toMatchObject({ start: 1012, total: 30 });
  });
  it("respects the eligible lookback", () => {
    expect(bestBaseline(baselineWindows([unitA], { ...base, lastEligible: 1034 }))).toMatchObject({ start: 1011, total: 29 });
  });
  it("skips windows with months lacking adequate data", () => {
    const withGap: (number | null)[] = [...unitA];
    withGap[30] = null;
    const w = baselineWindows([withGap], base);
    expect(w.map((x) => x.start)).toEqual(range(1000, 1006));
    expect(bestBaseline(w)?.total).toBe(24);
  });
  it("uses one window for all units and prefers the latest on a tie", () => {
    const unitB = [...unitA].reverse();
    const best = bestBaseline(baselineWindows([unitA, unitB], base));
    expect(best).toMatchObject({ start: 1012, total: 48, perUnit: [30, 18] });
  });
  it("sums project increases, with new units at a zero baseline", () => {
    const units = [
      { name: "EU-1", kind: "existing" as const, baseline: 30, projected: 50, usesPte: false, excluded: 5 },
      { name: "EU-2", kind: "new" as const, baseline: 99, projected: 10, usesPte: false, excluded: 3 },
      { name: "EU-3", kind: "existing" as const, baseline: 20, projected: 15, usesPte: false, excluded: 0 },
    ];
    const r = projectIncrease(units, 25, false);
    expect(r.perUnit.map((u) => u.increase)).toEqual([15, 10, 0]);
    expect(r.total).toBe(25);
    expect(r.significant).toBe(true); // equals the value entered
    const withDecreases = projectIncrease(units, 25, true);
    expect(withDecreases.total).toBe(20);
    expect(withDecreases.significant).toBe(false);
    expect(projectIncrease(units, null, false).significant).toBeNull();
  });
  it("ignores the demand-growth exclusion when potential to emit is used", () => {
    const r = projectIncrease([{ name: "EU-1", kind: "existing", baseline: 30, projected: 50, usesPte: true, excluded: 5 }], null, false);
    expect(r.total).toBe(20);
  });
});

describe("unit converters", () => {
  const run = (slug: string, values: Record<string, number | null>, mode = "fwd") => {
    const c = getConverter(slug)!;
    return c.compute({ ...converterDefaults(c), ...values }, mode);
  };

  it("uses the ideal-gas molar volume", () => {
    expect(molarVolumeScf(68, 29.92)).toBeCloseTo(385.3, 1);
    expect(molarVolumeScf(60, 29.92)).toBeCloseTo(379.5, 1);
  });
  it("converts ppm to lb/hr and back", () => {
    const lb = run("ppm-to-lb-hr", { ppm: 50, mw: 46.006, flow: 5000, tF: 68, pIn: 29.92 }).results[0].value;
    expect(lb).toBeCloseTo(1.791, 3);
    expect(run("ppm-to-lb-hr", { lbhr: lb, mw: 46.006, flow: 5000 }, "rev").results[0].value).toBeCloseTo(50, 6);
  });
  it("corrects to a reference O2", () => {
    const r = run("o2-correction", { c: 25, o2m: 10, o2r: 15 });
    expect(r.results[0].value).toBeCloseTo((25 * 5.9) / 10.9, 9);
    expect(run("o2-correction", { o2m: 20.9 }).error).toBeTruthy();
  });
  it("matches the Method 19 lb/scf-per-ppm factor for NOx and converts to lb/MMBtu", () => {
    const perPpm = (1e-6 * 46.006) / molarVolumeScf(68, 29.92);
    expect(perPpm).toBeCloseTo(1.194e-7, 9);
    const e = run("ppm-to-lb-mmbtu", { ppm: 9, o2: 15, fd: 10000 }).results[0].value;
    expect(e).toBeCloseTo(9 * perPpm * 10000 * (20.9 / 5.9), 9);
    expect(run("ppm-to-lb-mmbtu", { e, o2: 15, fd: 10000 }, "rev").results[0].value).toBeCloseTo(9, 6);
    expect(run("ppm-to-lb-mmbtu", { ppm: 9 }).error).toBeTruthy(); // no F-factor prefilled
  });
  it("converts engine, annual, ambient, and moisture units", () => {
    expect(run("g-hp-hr-to-lb-hr", { g: 1, hp: 1000, hrs: 8760 }).results.map((r) => r.value)).toEqual([1000 / 453.59237, (1000 / 453.59237) * 4.38]);
    expect(run("lb-hr-to-tpy", { lbhr: 1, hrs: 8760 }).results[0].value).toBe(4.38);
    expect(run("lb-hr-to-tpy", { tpy: 4.38, hrs: 8760 }, "rev").results[0].value).toBeCloseTo(1, 12);
    expect(run("ppm-to-mg-m3", { ppm: 1, mw: 64.058, tC: 25, pAtm: 1 }).results[0].value).toBeCloseTo(2.6183, 4);
    expect(run("wet-to-dry", { c: 40, bws: 12 }).results[0].value).toBeCloseTo(45.4545, 4);
    expect(run("lb-mmbtu-to-lb-hr", { ef: 0.1, fuel: 10000, hv: 1000, hrs: 8760 }, "fuel").results[0].value).toBeCloseTo(1, 12);
  });
  it("has unique slugs, related links that resolve, and sources", () => {
    const slugs = converters.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of converters) {
      for (const r of c.related) expect(slugs).toContain(r);
      expect(c.sources.length).toBeGreaterThan(0);
      for (const s of c.sources) expect(s.url).toMatch(/^https:\/\/www\.(ecfr\.gov|epa\.gov)\//);
    }
  });
});

describe("permit text parser", () => {
  const text = [
    "Special Condition 1. The permit holder shall not exceed the NOx limit in Table 1.",
    "Emissions shall be calculated monthly.",
    "2.1 The owner shall conduct a performance test using EPA Method 7E within 180 days after initial startup.",
    "2.2 Records of fuel use shall be kept on site.",
    "(a) Record the fuel use each month.",
    "(b) Calculate the 12-month rolling total.",
    "Page 3 of 10",
    "3. The permittee shall submit a semiannual monitoring report within 30 days after the end of each reporting period, per 40 CFR 70.6(a)(3)(iii).",
  ].join("\n");

  it("splits numbered conditions and joins continuation lines", () => {
    const rows = parsePermitText(text);
    expect(rows.map((r) => r.ref)).toEqual(["Special Condition 1", "2.1", "2.2", "3"]);
    expect(rows[0].text).toContain("calculated monthly");
    expect(rows[2].text).toContain("(b) Calculate");
    expect(rows.some((r) => r.text.includes("Page 3"))).toBe(false);
  });
  it("suggests types, frequencies, citations, and deadlines", () => {
    const [c1, c21, , c3] = parsePermitText(text);
    expect(c1.types).toContain("Limit");
    expect(c1.frequencies[0]).toBe("Monthly");
    expect(c21.types).toContain("Testing");
    expect(c21.frequencies[0]).toBe("One-time");
    expect(c21.deadlines[0]).toBe("within 180 days after initial startup");
    expect(c3.types).toContain("Reporting");
    expect(c3.frequencies).toContain("Semiannual");
    expect(c3.citations).toContain("40 CFR 70.6(a)(3)(iii)");
    expect(calendarCategory(c3.types)).toBe("Reporting");
  });
  it("treats Method 9 and Method 22 observations as monitoring, not testing", () => {
    const [c] = parsePermitText("2.3 The permittee shall conduct a visible emissions observation using Method 22 each calendar quarter.");
    expect(c.types).toContain("Monitoring");
    expect(c.types).not.toContain("Testing");
    expect(calendarCategory(c.types)).toBe("Monitoring");
    expect(c.frequencies[0]).toBe("Quarterly");
  });
  it("can split lettered sub-items under their parent", () => {
    const rows = parsePermitText(text, { splitSubitems: true });
    expect(rows.map((r) => r.ref)).toEqual(["Special Condition 1", "2.1", "2.2", "2.2(a)", "2.2(b)", "3"]);
    expect(rows[4].frequencies[0]).toBe("12-month rolling");
  });
  it("builds short titles and month-stepped dates", () => {
    expect(conditionTitle({ ref: "3", text: "Submit the report. Then more." })).toBe("3: Submit the report.");
    expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToDate("2026-11-15", 3)).toBe("2027-02-15");
  });
  it("makes one repeating calendar task per dated condition, with the condition as its basis", () => {
    const base = { ref: "2.3", text: "Conduct a visible emissions observation each calendar quarter.", types: ["Monitoring" as const], citations: ["40 CFR 60.18"], type: "" as const, due: "2026-12-31" };
    const q = calendarTask({ ...base, frequency: "Quarterly" }, "North Pad", "2026-10-31");
    expect(q).toMatchObject({ id: "mx-2.3", facility: "North Pad", category: "Monitoring", date: "2026-12-31", repeat: "quarterly", basis: "Permit condition 2.3; 40 CFR 60.18", created: "2026-10-31" });
    expect(dueDates(q, parseYmd("2026-10-31"), parseYmd("2027-12-31")).length).toBe(5);
    expect(calendarTask({ ...base, frequency: "12-month rolling" }, "", "2026-10-31")).toMatchObject({ repeat: "monthly", facility: "My facility" });
    expect(calendarTask({ ...base, frequency: "One-time" }, "", "2026-10-31").repeat).toBe("none");
  });
});

describe("deviation reporting periods", () => {
  it("finds semiannual periods for any cycle start", () => {
    expect(periodFor("2026-03-15", 1, 6)).toMatchObject({ from: "2026-01-01", to: "2026-06-30" });
    expect(periodFor("2026-03-15", 4, 6)).toMatchObject({ from: "2025-10-01", to: "2026-03-31" });
    expect(periodFor("2026-12-01", 7, 6)).toMatchObject({ from: "2026-07-01", to: "2026-12-31" });
    expect(periodFor("2026-02-10", 3, 12)).toMatchObject({ from: "2025-03-01", to: "2026-02-28" });
  });
  it("groups newest period first and exports a labeled CSV", () => {
    const d = (id: string, start: string): Deviation => ({ id, start, end: "", unit: "EU-1", requirement: "Cond 3", description: 'Flare "pilot" out, briefly', cause: "", corrective: "", durationHours: 1.5, pollutants: "VOC", excessEstimate: "", reportedOn: "", status: "open" });
    const devs = [d("a", "2026-02-01"), d("b", "2026-08-01"), d("c", "2026-03-01")];
    const g = groupByPeriod(devs, 1, 6);
    expect(g.map((x) => x.period.from)).toEqual(["2026-07-01", "2026-01-01"]);
    expect(g[1].items.map((x) => x.id)).toEqual(["a", "c"]);
    const csv = deviationsCsv(devs, 1, 6);
    expect(csv.split("\r\n")[0]).toContain("AirPermitHub Template");
    expect(csv).toContain('"Flare ""pilot"" out, briefly"');
  });
});
