import { describe, expect, it } from "vitest";
import { RT } from "./rule-text";
import { ap42ExampleTank, blankTank, engineCalc, flareCalc, inventoryCsv, leakCalc, quadOMatrix, rollup, tankCalc } from "./oilgas";

describe("AP-42 Section 7.1 fixed roof tank", () => {
  it("reproduces the worked example in AP-42 Section 7.1", () => {
    const c = tankCalc(ap42ExampleTank("t"));
    expect(c.ls).toBeCloseTo(85, 0); // "LS = 85 lb/yr"
    expect(c.n).toBeCloseTo(5.7, 1); // "N =39.9 / (11.5 – 4.5) = 5.7"
    expect(c.kn).toBe(1);
    expect(Math.abs(c.lw! - 16.1)).toBeLessThan(0.1); // "LW = 16.1 lb/yr" (5.614 × 201.2 × 0.0143 = 16.15)
    expect(c.missing).toEqual([]);
  });

  it("uses the numbers in the quoted text", () => {
    expect(RT.ap42Standing.text).toContain("365");
    expect(RT.ap42VqQ.text).toContain("5.614");
    expect(RT.ap42Kn.text).toContain("(180 + N)/6N");
    expect(RT.ap42Kn.text).toContain("> 36");
    expect(RT.ap42Kp.text).toContain("0.75");
    expect(RT.ap42KpOther.text).toContain("KP = 1");
    expect(RT.ap42Kb.text).toContain("KB = 1");
  });

  it("applies the turnover factor above 36 turnovers and KN = 1 when flashing", () => {
    const base = { ...blankTank("t"), vv: 100, wv: 0.05, ke: 0.1, ks: 0.9, q: 50000, n: 60, product: "crude" as const };
    const c = tankCalc(base);
    expect(c.kn).toBeCloseTo((180 + 60) / (6 * 60), 6);
    expect(c.kp).toBe(0.75);
    expect(c.lw).toBeCloseTo(5.614 * 50000 * ((180 + 60) / 360) * 0.75 * 0.05 * 1, 6);
    const fl = tankCalc({ ...base, flashing: true, flashLbYr: 1000, controlPct: 95, vocFraction: 0.5 });
    expect(fl.kn).toBe(1);
    expect(fl.basis).toContain(RT.ap42KnFlash);
    expect(fl.controlledLb).toBeCloseTo((fl.lt! + 1000) * 0.05, 6);
    expect(fl.vocTpy).toBeCloseTo((fl.controlledLb! / 2000) * 0.5, 6);
  });

  it("lists what is missing instead of guessing", () => {
    const c = tankCalc(blankTank("t"));
    expect(c.lt).toBeNull();
    expect(c.missing.length).toBeGreaterThan(1);
  });
});

describe("flares, leaks, and engines", () => {
  it("applies the destruction efficiency the user enters", () => {
    const c = flareCalc({ id: "f", name: "F", vocIn: 50, dre: 98, scfYr: 10_000_000, hhv: 1200, factors: [{ pollutant: "NOx", value: 0.068, source: "test" }] });
    expect(c.tpy.VOC).toBeCloseTo(1, 6);
    expect(c.mmbtu).toBeCloseTo(12000, 6);
    expect(c.tpy.NOx).toBeCloseTo((0.068 * 12000) / 2000, 6);
    expect(RT.ap42FlareDre.text).toContain("98 percent");
  });

  it("follows ETOC = FA × WFTOC × N and speciates VOC by weight fraction", () => {
    const c = leakCalc({ id: "l", component: "Valves", service: "Gas", count: 100, factor: 0.004, factorSource: "test", wfToc: 0.9, wfVoc: 0.3, hours: 8760 })!;
    expect(c.etoc).toBeCloseTo(0.36, 9);
    expect(c.tocTpy).toBeCloseTo((0.36 * 8760) / 0.45359237 / 2000, 9);
    expect(c.vocTpy).toBeCloseTo(c.tocTpy / 3, 9);
    expect(leakCalc({ id: "l", component: "", service: "", count: 1, factor: null, factorSource: "", wfToc: 1, wfVoc: null, hours: 1 })).toBeNull();
  });

  it("converts g/hp-hr to tons per year", () => {
    const c = engineCalc({ id: "e", name: "E", hp: 1000, hours: 8760, factors: [{ pollutant: "NOx", value: 1, source: "test" }] });
    expect(c.tpy.NOx).toBeCloseTo((1000 / 453.59237) * 8760 / 2000, 9);
  });

  it("totals by pollutant and carries the steps into the CSV", () => {
    const inv = {
      tanks: [{ ...ap42ExampleTank("t"), vocFraction: 1 }],
      flares: [{ id: "f", name: "Flare", vocIn: 10, dre: 98, scfYr: null, hhv: null, factors: [] }],
      leaks: [],
      engines: [{ id: "e", name: "Eng", hp: 100, hours: 1000, factors: [{ pollutant: "VOC", value: 1, source: "" }] }],
    };
    const { totals } = rollup(inv);
    const tankVoc = tankCalc(inv.tanks[0]).vocTpy!;
    expect(totals.VOC).toBeCloseTo(tankVoc + 0.2 + (100 / 453.59237) * 1000 / 2000, 9);
    const csv = inventoryCsv("Site", inv, "2026-10-31");
    expect(csv.split("\r\n")[0]).toContain("AirPermitHub Template");
    expect(csv).toContain("LS = 365 × VV × WV × KE × KS");
  });
});

describe("Quad O matrix", () => {
  it("shows compressors are not affected facilities at well sites, and listed at compressor stations", () => {
    const well = quadOMatrix("well-site").find((r) => r.type === "reciprocating-compressor")!;
    expect(well.cells.OOOOb.listed).toBe(true);
    expect(well.cells.OOOOb.atSite).toBe(false);
    const station = quadOMatrix("compressor-station").find((r) => r.type === "reciprocating-compressor")!;
    expect(station.cells.OOOOb.atSite).toBe(true);
  });
  it("shows pneumatic pumps were not listed in OOOO", () => {
    const pumps = quadOMatrix("well-site").find((r) => r.type === "pneumatic-pump")!;
    expect(pumps.cells.OOOO.listed).toBe(false);
    expect(pumps.cells.OOOOa.listed).toBe(true);
  });
});
