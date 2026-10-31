import { describe, expect, it } from "vitest";
import { limitRow, smCsv, summarize, type SmRow, type SmSettings } from "./synthetic-minor";

let n = 0;
const row = (p: Partial<SmRow>): SmRow => ({
  id: String(++n), unit: "EU-1", description: "", pollutant: "NOx", hapName: "", uncontrolled: null, control: null, controlEnforceable: true,
  limitType: "none", limitValue: null, limitUnits: "", capacity: null, basis: "", condition: "", averaging: "", monitoring: "", records: "", reporting: "", ...p,
});
const settings: SmSettings = { ozone: "none", listed: "no", marginPct: 10, oilGas: false };

describe("applying a limit to one unit", () => {
  it("scales an hours limit by hours ÷ 8,760", () => {
    const r = limitRow(row({ uncontrolled: 87.6, limitType: "hours", limitValue: 4380 }));
    expect(r.limited).toBeCloseTo(43.8);
    expect(r.steps).toBe("87.6 tpy × (4,380 ÷ 8,760 hr/yr) = 43.8 tpy");
  });
  it("applies control as a percent, only when enforceable", () => {
    expect(limitRow(row({ uncontrolled: 100, control: 95 })).limited).toBeCloseTo(5);
    const loose = limitRow(row({ uncontrolled: 100, control: 95, controlEnforceable: false }));
    expect(loose.limited).toBe(100);
    expect(loose.problems[0]).toMatch(/not marked enforceable/);
  });
  it("rejects a control efficiency entered as a fraction above 100 or below 0", () => {
    expect(limitRow(row({ uncontrolled: 10, control: 120 })).problems[0]).toMatch(/between 0 and 100/);
  });
  it("scales a throughput limit by limit ÷ full-capacity throughput", () => {
    const r = limitRow(row({ uncontrolled: 28, limitType: "throughput", limitValue: 50000, capacity: 200000, limitUnits: "bbl/yr" }));
    expect(r.limited).toBeCloseTo(7);
    expect(r.steps).toContain("(50,000 ÷ 200,000 bbl/yr)");
  });
  it("does not treat a throughput limit as unlimited when capacity is missing (the workbook bug)", () => {
    const r = limitRow(row({ uncontrolled: 28, limitType: "throughput", limitValue: 50000 }));
    expect(r.problems[0]).toMatch(/full design capacity/);
  });
  it("uses an emission cap only when it is lower", () => {
    expect(limitRow(row({ uncontrolled: 120, limitType: "cap", limitValue: 95 })).limited).toBe(95);
    const high = limitRow(row({ uncontrolled: 50, limitType: "cap", limitValue: 95 }));
    expect(high.limited).toBe(50);
    expect(high.problems[0]).toMatch(/does not restrict/);
  });
  it("never raises PTE with an hours limit above 8,760", () => {
    expect(limitRow(row({ uncontrolled: 10, limitType: "hours", limitValue: 9000 })).limited).toBe(10);
  });
});

describe("facility comparison", () => {
  it("treats a total equal to a threshold as at or above (the rule says 'or more')", () => {
    const s = summarize([row({ uncontrolled: 100 })], settings);
    expect(s.pollutants[0].comparisons[0]).toMatchObject({ program: "Title V", tpy: 100, status: "at-or-above" });
    expect(s.overall).toBe("major");
  });
  it("flags a synthetic minor: over uncontrolled, under with limits", () => {
    const s = summarize([row({ uncontrolled: 150, limitType: "hours", limitValue: 4380 })], settings);
    const tv = s.pollutants[0].comparisons[0];
    expect(tv.limitsNeeded).toBe(true);
    expect(tv.status).toBe("below");
    expect(tv.headroom).toBeCloseTo(25);
  });
  it("marks results inside the user's margin", () => {
    expect(summarize([row({ uncontrolled: 92 })], settings).overall).toBe("near");
    expect(summarize([row({ uncontrolled: 92 })], { ...settings, marginPct: null }).overall).toBe("under");
  });
  it("uses the ozone nonattainment threshold for VOC and NOx only", () => {
    const s = summarize([row({ pollutant: "VOC", uncontrolled: 30 }), row({ pollutant: "CO", uncontrolled: 30 })], { ...settings, ozone: "severe" });
    expect(s.pollutants.find((p) => p.pollutant === "VOC")!.comparisons[0].tpy).toBe(25);
    expect(s.pollutants.find((p) => p.pollutant === "CO")!.comparisons[0].tpy).toBe(100);
  });
  it("uses 100 tpy for PSD listed categories and 250 tpy otherwise", () => {
    const psd = (listed: SmSettings["listed"]) => summarize([row({ uncontrolled: 1 })], { ...settings, listed }).pollutants[0].comparisons.find((c) => c.program === "PSD")!.tpy;
    expect(psd("yes")).toBe(100);
    expect(psd("no")).toBe(250);
    expect(psd("unknown")).toBe(100);
  });
  it("sums each HAP across units before comparing with 10 tpy (the workbook took the largest single row)", () => {
    const s = summarize([
      row({ unit: "ENG-1", pollutant: "HAP", hapName: "Formaldehyde", uncontrolled: 6 }),
      row({ unit: "ENG-2", pollutant: "HAP", hapName: " formaldehyde", uncontrolled: 5 }),
      row({ unit: "TK-1", pollutant: "HAP", hapName: "Benzene", uncontrolled: 2 }),
      row({ unit: "FL-1", pollutant: "HAP", hapName: "", uncontrolled: 1 }),
    ], settings);
    expect(s.haps[0]).toMatchObject({ name: "Formaldehyde", limited: 11 });
    expect(s.haps[0].comparison.status).toBe("at-or-above");
    expect(s.unspeciated.limited).toBe(1);
    expect(s.hapTotal!.limited).toBe(14);
    expect(s.hapTotal!.comparisons[0].tpy).toBe(25);
  });
  it("lists rows that are incomplete", () => {
    const s = summarize([row({}), row({ uncontrolled: 5, limitType: "hours" })], settings);
    expect(s.rowProblems).toHaveLength(2);
    expect(s.overall).toBe("under");
  });
  it("exports every step and the citations", () => {
    const csv = smCsv([row({ uncontrolled: 150, limitType: "hours", limitValue: 4380, condition: "Hours ≤ 4,380 per 12 months" })], settings, "Demo");
    expect(csv).toContain("150 tpy × (4,380 ÷ 8,760 hr/yr) = 75 tpy");
    expect(csv).toContain("40 CFR 70.2");
    expect(csv).toContain("Hours ≤ 4,380 per 12 months");
  });
});

describe("HAP tracker", () => {
  const h = (p: Partial<import("./synthetic-minor").HapRow>) => ({ id: String(++n), unit: "U", description: "", hapName: "Benzene", cas: "71-43-2", uncontrolled: null, control: null, controlEnforceable: true, basis: "", ...p });
  it("is major when one HAP summed across units reaches 10 tpy", async () => {
    const { hapSummary } = await import("./synthetic-minor");
    expect(hapSummary([h({ uncontrolled: 6 }), h({ uncontrolled: 4 })], null, false).status).toBe("major");
    expect(hapSummary([h({ uncontrolled: 6 }), h({ hapName: "Toluene", uncontrolled: 3.9 })], null, false).status).toBe("area");
  });
  it("is major at 25 tpy combined even when no single HAP reaches 10", async () => {
    const { hapSummary } = await import("./synthetic-minor");
    const rows = ["A", "B", "C"].map((x) => h({ hapName: x, uncontrolled: 9 }));
    expect(hapSummary(rows, null, false).status).toBe("major");
  });
  it("ignores a control that is not enforceable", async () => {
    const { hapSummary } = await import("./synthetic-minor");
    expect(hapSummary([h({ uncontrolled: 20, control: 90, controlEnforceable: false })], null, false).status).toBe("major");
    expect(hapSummary([h({ uncontrolled: 20, control: 90 })], null, false).status).toBe("area");
  });
});

describe("other Part 70 area thresholds", () => {
  it("uses the lowest threshold that applies", () => {
    const tv = (p: SmRow["pollutant"], extra: Partial<SmSettings>) => summarize([row({ pollutant: p, uncontrolled: 1 })], { ...settings, ...extra }).pollutants[0].comparisons[0].tpy;
    expect(tv("VOC", { otr: true })).toBe(50);
    expect(tv("VOC", { otr: true, ozone: "severe" })).toBe(25);
    expect(tv("NOx", { otr: true })).toBe(100);
    expect(tv("CO", { coSerious: true })).toBe(50);
    expect(tv("PM10", { pm10Serious: true })).toBe(70);
    expect(tv("PM2.5", { pm10Serious: true })).toBe(100);
  });
});
