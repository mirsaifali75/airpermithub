import { describe, expect, it } from "vitest";
import { RT } from "@/lib/tools/rule-text";
import { factorLibrary, factorRecordFields, factorsCsv, factorsFor, sameFactor, type EmissionFactorRecord } from "./factors";
import { annualize, calculatorMethods, G_PER_LB, getMethod, LB_PER_KG } from "./methods";

/** Runs a method with explicit inputs and factors. */
function run(slug: string, inputs: Record<string, number>, factors: Record<string, number> = {}) {
  const m = getMethod(slug);
  if (!m) throw new Error(`unknown method ${slug}`);
  return m.compute(inputs, factors);
}

const demo = (slug: string) => {
  const m = getMethod(slug)!;
  return {
    inputs: Object.fromEntries(m.inputs.map((x) => [x.key, x.demo])),
    factors: Object.fromEntries(m.factors.map((x) => [x.key, x.demo])),
  };
};

describe("calculator methods: hand-checked math", () => {
  it("engines: EF × hp × load ÷ g/lb", () => {
    expect(run("engines", { hp: 1380, load: 100 }, { ef: 1 }).lbPerHr).toBeCloseTo(1380 / G_PER_LB, 9);
    expect(run("engines", { hp: 1000, load: 50 }, { ef: 2 }).lbPerHr).toBeCloseTo(1000 / G_PER_LB, 9);
  });

  it("heaters: EF × heat input ÷ HHV", () => {
    expect(run("heaters", { q: 1.5, hhv: 1020 }, { ef: 100 }).lbPerHr).toBeCloseTo((100 * 1.5) / 1020, 12);
  });

  it("flares: EF × flow × 1,000 × HV ÷ 10^6", () => {
    expect(run("flares", { flow: 10, hv: 1500 }, { ef: 0.1 }).lbPerHr).toBeCloseTo(1.5, 12);
  });

  it("tanks: annual mass spread over operating hours", () => {
    expect(run("tanks", { throughput: 365000 }, { ef: 0.05 }).lbPerHr).toBeCloseTo(18250 / 8760, 12);
    expect(run("tanks", { throughput: 365000, __hours: 4380 }, { ef: 0.05 }).lbPerHr).toBeCloseTo(18250 / 4380, 12);
  });

  it("tanks: annualized tons match annual mass regardless of hours", () => {
    for (const hours of [8760, 4380, 1000]) {
      const base = run("tanks", { throughput: 365000, __hours: hours }, { ef: 0.05 });
      expect(annualize(base, 0, hours).tpy).toBeCloseTo(18250 / 2000, 9);
    }
  });

  it("fugitives: Σ counts × factors × lb/kg × weight fraction", () => {
    const kg = 120 * 0.004 + 400 * 0.0002 + 80 * 0.0004 + 20 * 0.009;
    const r = run("fugitives", { valves: 120, connectors: 400, flanges: 80, other: 20, wt: 25 }, { efValves: 0.004, efConnectors: 0.0002, efFlanges: 0.0004, efOther: 0.009 });
    expect(r.lbPerHr).toBeCloseTo(kg * LB_PER_KG * 0.25, 12);
  });

  it("ap-42: activity × factor", () => {
    expect(run("ap-42", { a: 50 }, { ef: 0.2 }).lbPerHr).toBeCloseTo(10, 12);
  });

  it("venting: scf ÷ molar volume × MW × weight fraction", () => {
    expect(run("venting", { v: 500, mw: 20, wt: 10, molarVolume: 379.3 }).lbPerHr).toBeCloseTo((500 / 379.3) * 20 * 0.1, 12);
  });

  it("compressors: count × rate, then gas mass", () => {
    expect(run("compressors", { n: 2, mw: 20, wt: 10, molarVolume: 379.3 }, { rate: 50 }).lbPerHr).toBeCloseTo((100 / 379.3) * 20 * 0.1, 12);
  });

  it("pneumatics: Σ device counts × bleed rates, then gas mass", () => {
    const scf = 2 * 30 + 4 * 1 + 6 * 10;
    const r = run("pneumatics", { nHigh: 2, nLow: 4, nInt: 6, mw: 20, wt: 10, molarVolume: 379.3 }, { bHigh: 30, bLow: 1, bInt: 10 });
    expect(r.lbPerHr).toBeCloseTo((scf / 379.3) * 20 * 0.1, 12);
  });

  it("tank-losses: reproduces AP-42 Section 7.1's fixed roof worked example", () => {
    const ex = { vv: 169.6, wv: 0.0143, ke: 0.108, ks: 0.888, q: 201.2, d: 6, hlx: 11.5, hln: 4.5, kp: 1, kb: 1, flash: 0, wt: 100, __hours: 8760 };
    const r = run("tank-losses", ex);
    const step = (label: string) => r.steps.find((s) => s.label.startsWith(label))!.value;
    const ls = 365 * 169.6 * 0.0143 * 0.108 * 0.888;
    expect(step("Standing loss")).toBeCloseTo(ls, 2);
    expect(step("ΣHQI")).toBeCloseTo(39.9, 1); // "ΣHQI =(5.614) (201.2) / ((π/4) 62) = 39.9 ft"
    expect(step("Turnovers")).toBeCloseTo(5.7, 1); // "N =39.9 / (11.5 – 4.5) = 5.7"
    expect(step("Turnover factor")).toBe(1);
    expect(Math.abs(step("Working loss") - 16.1)).toBeLessThan(0.1); // "LW = ... = 16.1 lb/yr"
    expect(r.lbPerHr * 8760).toBeCloseTo(ls + 5.614 * 201.2 * 0.0143, 6);
    for (const x of [RT.ap42HqiExample, RT.ap42NExample, RT.ap42LwExample, RT.ap42LsExample]) expect(getMethod("tank-losses")!.basis).toContain(x);
  });

  it("tank-losses: KN above 36 turnovers, KN = 1 with flashing, and KP for crude", () => {
    const base = { vv: 100, wv: 0.02, ke: 0.1, ks: 0.9, q: 50000, d: 10, hlx: 20, hln: 2, kp: 1, kb: 1, flash: 0, wt: 50, __hours: 8760 };
    const n = (5.614 * 50000) / ((Math.PI / 4) * 100) / 18;
    expect(n).toBeGreaterThan(36);
    const kn = (180 + n) / (6 * n);
    const step = (r: ReturnType<typeof run>, label: string) => r.steps.find((s) => s.label.startsWith(label))!.value;
    const r = run("tank-losses", base);
    expect(step(r, "Turnover factor")).toBeCloseTo(kn, 4);
    const crude = run("tank-losses", { ...base, kp: 0.75 });
    expect(step(crude, "Working loss") / step(r, "Working loss")).toBeCloseTo(0.75, 4);
    const flashed = run("tank-losses", { ...base, flash: 1000 });
    expect(step(flashed, "Turnover factor")).toBe(1);
    expect(flashed.steps.some((s) => s.label === "Add flashing")).toBe(true);
    expect(getMethod("tank-losses")!.validate!({ ...base, hlx: 2 })).toMatch(/Maximum liquid height/);
    expect(getMethod("tank-losses")!.validate!({ ...base, d: 0 })).toMatch(/diameter/);
    expect(getMethod("tank-losses")!.validate!(base)).toBeNull();
  });

  it("tank-losses: every constant in the math is stated in a quoted AP-42 line", () => {
    const quoted = getMethod("tank-losses")!.basis!.map((q) => q.text).join(" ");
    for (const c of ["365", "5.614", "180", "36", "0.75", "KB = 1", "KN = 1"]) expect(quoted, c).toContain(c);
  });

  it("ghg: heat input × kg/MMBtu × lb/kg (CO2e is applied in the calculator from the GWP the user enters)", () => {
    expect(run("ghg", { q: 10 }, { ef: 50 }).lbPerHr).toBeCloseTo(500 * LB_PER_KG, 9);
  });
});

describe("calculator methods: structure", () => {
  it("has unique slugs", () => {
    const slugs = calculatorMethods.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(calculatorMethods.map((m) => [m.slug]))("%s produces finite, non-negative results and steps from demo values", (slug) => {
    const { inputs, factors } = demo(slug);
    const r = run(slug, { ...inputs, __hours: 8760 }, factors);
    expect(Number.isFinite(r.lbPerHr)).toBe(true);
    expect(r.lbPerHr).toBeGreaterThanOrEqual(0);
    expect(r.steps.length).toBeGreaterThan(0);
    for (const s of r.steps) expect(Number.isFinite(s.value)).toBe(true);
  });

  it.each(calculatorMethods.map((m) => [m.slug]))("%s shows its formula and methodology", (slug) => {
    const m = getMethod(slug)!;
    expect(m.formula.length).toBeGreaterThan(5);
    expect(m.variables.length).toBeGreaterThan(1);
    for (const v of m.variables) expect(v.meaning.length, `${slug} ${v.symbol}`).toBeGreaterThan(3);
    for (const q of m.basis ?? []) expect(Object.values(RT), `${slug}: ${q.text}`).toContain(q);
    expect(m.methodology.length).toBeGreaterThan(20);
    expect(m.factorGuidance.length).toBeGreaterThan(20);
  });
});

describe("annualize", () => {
  const base = { lbPerHr: 10, steps: [] };

  it("applies control efficiency, daily, and annual totals", () => {
    const r = annualize(base, 90, 8760);
    expect(r.lbPerHr).toBe(10);
    expect(r.controlledLbPerHr).toBeCloseTo(1, 12);
    expect(r.lbPerDay).toBeCloseTo(24, 12);
    expect(r.tpy).toBeCloseTo(4.38, 12);
  });

  it("clamps control efficiency to 0–100%", () => {
    expect(annualize(base, 150, 8760).controlledLbPerHr).toBe(0);
    expect(annualize(base, -20, 8760).controlledLbPerHr).toBe(10);
  });

  it("adds a control step only when control is applied", () => {
    expect(annualize(base, 0, 8760).steps.some((s) => s.label === "Apply control")).toBe(false);
    expect(annualize(base, 50, 8760).steps.some((s) => s.label === "Apply control")).toBe(true);
  });
});

describe("factor records", () => {
  const rec = (patch: Partial<EmissionFactorRecord> = {}): EmissionFactorRecord => ({
    id: "1", origin: "user", method: "engines", factorKey: "ef", sourceCategory: "Engines", pollutant: "NOx", value: 1, units: "g/hp-hr",
    referenceDocument: "Manufacturer guarantee", sectionTable: "Sheet 2", revisionDate: "2026-01", url: "", rating: "", notes: "", versions: [], ...patch,
  });

  it("ships no library factors until they pass review", () => {
    expect(factorLibrary).toEqual([]);
  });

  it("matches saved factors to the calculator field and unit", () => {
    const list = [rec(), rec({ id: "2", units: "lb/MMBtu" }), rec({ id: "3", method: "heaters" })];
    expect(factorsFor(list, "engines", "ef", "g/hp-hr").map((r) => r.id)).toEqual(["1"]);
    for (const m of calculatorMethods) for (const f of m.factors) expect(factorsFor([rec({ method: m.slug, factorKey: f.key, units: f.unit })], m.slug, f.key, f.unit)).toHaveLength(1);
  });

  it("treats the same value and citation as one factor", () => {
    expect(sameFactor(rec(), rec({ id: "9" }))).toBe(true);
    expect(sameFactor(rec(), rec({ value: 2 }))).toBe(false);
    expect(sameFactor(rec(), rec({ sectionTable: "Sheet 3" }))).toBe(false);
  });

  it("exports every record field", () => {
    const csv = factorsCsv([rec()]).split("\r\n");
    expect(csv[0].split(",")).toHaveLength(factorRecordFields.length + 2);
    expect(csv[1]).toContain("Manufacturer guarantee");
  });
});
