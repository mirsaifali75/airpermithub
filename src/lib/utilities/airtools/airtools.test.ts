import { describe, expect, it } from "vitest";
import { RT } from "../../tools/rule-text";
import { airCalcs, blankSection, exampleSection, runSection, type SectionState } from "../index";
import type { SectionDef } from "../types";
import { toSI } from "../units";
import { crf, rankOptions } from "./bact";
import { MJSCM_PER_BTUSCF, TABLE12, flareVelocity, minNhv } from "./flare";
import { T191, VM_STD, m19Factor } from "./method19";

const sec = (slug: string, id: string) => airCalcs.find((u) => u.slug === slug)!.sections.find((s) => s.id === id)!;
const run = (s: SectionDef, over: Record<string, [number, string] | null> = {}) => {
  const st: SectionState = exampleSection(s);
  for (const [k, v] of Object.entries(over)) st.entries[k] = v ? { v: v[0], u: v[1] } : { v: null, u: s.inputs.find((i) => i.id === k)!.unit };
  return runSection(s, st);
};
const res = (o: ReturnType<typeof run>, id: string) => o.results.find((r) => r.id === id)?.value;

describe("air permit engineering calculators", () => {
  it("runs every worked example without an error and quotes only rule-text entries", () => {
    const known = new Set(Object.values(RT));
    for (const u of airCalcs)
      for (const s of u.sections) {
        const o = runSection(s, exampleSection(s));
        expect(o.error, `${u.slug}/${s.id}`).toBeUndefined();
        expect(o.results.length).toBeGreaterThan(0);
        for (const q of s.quotes ?? []) expect(known.has(q), `${u.slug}/${s.id}: ${q.text.slice(0, 40)}`).toBe(true);
        const blank = runSection(s, blankSection(s));
        expect(blank.results.length === 0 || !!blank.error || s.id === "net-heating-value", `${u.slug}/${s.id} blank`).toBe(true);
      }
  });

  it("capital recovery factor matches the Cost Manual formula and its zero-rate limit", () => {
    expect(crf(8.5, 20)).toBeCloseTo(0.105671, 6);
    expect(crf(7, 10)).toBeCloseTo(0.142378, 6);
    expect(crf(0, 20)).toBe(0.05);
    const o = run(sec("bact-cost-effectiveness", "annual-cost"));
    expect(res(o, "tac")).toBeCloseTo(539_177.44, 1);
  });

  it("average cost-effectiveness by control efficiency or by controlled emissions", () => {
    const s = sec("bact-cost-effectiveness", "average");
    expect(res(run(s), "ace")).toBeCloseTo(539_177 / 225, 2);
    expect(res(run(s, { ce: null, ctrl: [40, "tpy"] }), "ace")).toBeCloseTo(539_177 / 210, 2);
    expect(run(s, { ctrl: [40, "tpy"] }).error).toMatch(/not both/);
    expect(run(s, { ce: null, ctrl: [300, "tpy"] }).error).toMatch(/higher than the baseline/);
  });

  it("finds dominated options and takes incremental cost between contiguous dominant ones", () => {
    const r = rankOptions([
      { k: 1, tac: 120_000, removed: 125 },
      { k: 2, tac: 210_000, removed: 100 },
      { k: 3, tac: 539_177, removed: 225 },
      { k: 4, tac: 640_000, removed: 237.5 },
    ]);
    expect(r.find((o) => o.k === 2)!.dominatedBy).toBe(1);
    expect(r.find((o) => o.k === 1)!.ice).toBeUndefined();
    expect(r.find((o) => o.k === 3)!.ice).toBeCloseTo((539_177 - 120_000) / 100, 6);
    expect(r.find((o) => o.k === 4)!.ice).toBeCloseTo((640_000 - 539_177) / 12.5, 6);
    // Exact tie: the later option is the duplicate.
    const t = rankOptions([{ k: 1, tac: 100, removed: 10 }, { k: 2, tac: 100, removed: 10 }]);
    expect(t.find((o) => o.k === 1)!.dominatedBy).toBeUndefined();
    expect(t.find((o) => o.k === 2)!.dominatedBy).toBe(1);
  });

  it("flare heating value: Table 12 values, hydrogen basis, and the 300/200 Btu/scf minimum", () => {
    expect(TABLE12).toHaveLength(25);
    expect(MJSCM_PER_BTUSCF).toBeCloseTo(0.0372589, 6);
    expect(300 * MJSCM_PER_BTUSCF).toBeCloseTo(11.2, 1);
    expect(200 * MJSCM_PER_BTUSCF).toBeCloseTo(7.45, 2);
    const s = sec("flare-60-18-check", "net-heating-value");
    expect(res(run(s), "nhv")).toBeCloseTo(toSI("vhv", "btuscf", 892.43), 6);
    expect(res(run(s, { basis: [2, "n"] }), "nhv")).toBeCloseTo(toSI("vhv", "btuscf", 892.43 + 0.08 * (1212 - 274)), 6);
    expect(run(s).checks?.[0].pass).toBe(true);
    const lean = run(s, { c1: [10, "pct"], c2: null, c3: null, nc4: null, h2: null, n2: [80, "pct"], co2: [10, "pct"] });
    expect(lean.checks?.[0].pass).toBe(false); // 89.6 Btu/scf
    expect(minNhv(3)).toBe(7.45);
  });

  it("flare velocity limits at their edges", () => {
    expect(flareVelocity(1, 1, 18.29, 10).pass).toBe(true);
    expect(flareVelocity(1, 1, 18.3, 30).via).toBe("vmax"); // V_max = 71.5 m/s
    expect(flareVelocity(1, 1, 100, 10).pass).toBe(false); // V_max = 16.7 m/s
    expect(flareVelocity(1, 3, 121.9, 38).via).toBe("v400");
    expect(flareVelocity(1, 3, 122, 60).pass).toBe(false);
    expect(flareVelocity(1, 2, 16.6, 11.2).pass).toBe(true); // 8.706 + 0.7084 × 11.2 = 16.64
    expect(flareVelocity(1, 2, 16.7, 11.2).pass).toBe(false);
    expect(flareVelocity(2, 2, 16.6, 11.2).vmaxAir).toBeCloseTo(8.71 + 0.708 * 11.2, 9);
    const s = sec("flare-60-18-check", "exit-velocity");
    expect(res(run(s), "v")).toBeCloseTo(32.34, 2);
    const h2 = run(s, { type: [3, "n"], xh2: [30, "pct"], q: [200_000, "scfh20"], d: [12, "in"] });
    expect(h2.checks?.some((c) => c.text.startsWith("Hydrogen option") && c.pass)).toBe(true);
  });

  it("Method 19: Table 19-1 factors agree with molecular weight over the 20 °C molar volume", () => {
    const lbPerScf = (mw: number) => (mw * 1e-6 * 1e-3) / VM_STD / toSI("conc", "lbscf", 1);
    expect(Math.abs(lbPerScf(64.066) / T191.so2 - 1)).toBeLessThan(0.003);
    expect(Math.abs(lbPerScf(46.0055) / T191.nox - 1)).toBeLessThan(0.003);
  });

  it("Method 19 diluent terms for equations 19-1 to 19-9", () => {
    expect(m19Factor(1, 3, 0)).toBeCloseTo(20.9 / 17.9, 12);
    expect(m19Factor(2, 3, 0.027)).toBeCloseTo(20.9 / (20.9 * 0.973 - 3), 12);
    expect(m19Factor(3, 3, 0.15)).toBeCloseTo(20.9 / (20.9 * 0.85 - 3), 12);
    expect(m19Factor(4, 3, 0.15)).toBeCloseTo(20.9 / (0.85 * 17.9), 12);
    expect(m19Factor(5, 3, 0.15)).toBeCloseTo(20.9 / (20.9 - 3 / 0.85), 12);
    expect(m19Factor(6, 10, 0)).toBe(10);
    expect(m19Factor(8, 10, 0.12)).toBeCloseTo(100 / (0.88 * 10), 12);
    expect(m19Factor(9, 9, 0.12)).toBeCloseTo((0.88 * 100) / 9, 12);
    // Wet and dry routes agree when the moisture is consistent: %O2w = %O2d (1 − Bws), Cw = Cd (1 − Bws).
    const B = 0.12, o2d = 4, Cd = 1;
    const e1 = Cd * m19Factor(1, o2d, 0);
    expect((Cd * (1 - B)) * m19Factor(3, o2d * (1 - B), B)).toBeCloseTo(e1, 12);
    expect((Cd * (1 - B)) * m19Factor(4, o2d, B)).toBeCloseTo(e1, 12);
    expect(Cd * m19Factor(5, o2d * (1 - B), B)).toBeCloseTo(e1, 12);
  });

  it("Method 19 F factors from an ultimate analysis and the emission-rate example", () => {
    const f = run(sec("method-19-f-factor", "f-factor"));
    expect(res(f, "fd")).toBeCloseTo(toSI("ffac", "scfmmbtu", (1e6 * 131.595) / 13500), 15);
    expect(res(f, "fc")).toBeCloseTo(toSI("ffac", "scfmmbtu", (1e6 * 0.321 * 75) / 13500), 15);
    const e = run(sec("method-19-f-factor", "emission-rate"));
    expect(res(e, "e")).toBeCloseTo(toSI("ef", "lbmmbtu", 45 * 1.194e-7 * 8710 * (20.9 / 17.4)), 6);
    expect(run(sec("method-19-f-factor", "emission-rate"), { eq: [3, "n"] }).error).toMatch(/moisture fraction/);
  });
});
