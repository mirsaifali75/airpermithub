import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { OILGAS_WORKBOOK_PATH } from "../workbook-layout";
import { blankSection, exampleSection, getUtility, oilGasCalcs, runSection } from "../index";
import { fromSI, toSI } from "../units";
import { importUtilities } from "../xlsx";
import { C_RADIAL } from "./inflow";
import { ROD_K } from "./lift";
import { PSI_FT_PER_PPG, colebrook, dak } from "./core";

function run(slug: string, section: string, values: Record<string, [number, string] | null>) {
  const s = getUtility(slug)!.sections.find((x) => x.id === section)!;
  const st = blankSection(s);
  for (const [k, v] of Object.entries(values)) st.entries[k] = v ? { v: v[0], u: v[1] } : { v: null, u: s.inputs.find((i) => i.id === k)!.unit };
  const out = runSection(s, st);
  const r = (id: string, unit?: string) => {
    const x = out.results.find((y) => y.id === id);
    if (!x) return undefined;
    return unit ? fromSI(x.family, unit, x.value) : x.value;
  };
  return { out, r };
}
const near = (a: number | undefined, b: number, rel = 1e-3) => {
  expect(a).toBeDefined();
  expect(Math.abs((a as number) - b) / Math.abs(b)).toBeLessThan(rel);
};

describe("oil and gas worked examples", () => {
  for (const u of oilGasCalcs)
    for (const s of u.sections)
      it(`${u.slug} / ${s.id} runs and gives its main results`, () => {
        const out = runSection(s, exampleSection(s));
        expect(out.error).toBeUndefined();
        expect(out.results.filter((r) => r.key).length).toBeGreaterThan(0);
        for (const r of out.results) expect(Number.isFinite(r.value)).toBe(true);
      });
});

describe("oilfield constants come out of exact unit definitions", () => {
  it("141.2, 0.052, 0.1166", () => {
    near(C_RADIAL, 141.2, 2e-4);
    near(PSI_FT_PER_PPG, 0.051948, 1e-5);
    near(ROD_K, 0.1166, 5e-4);
  });
  it("annular capacity (8.5² − 5²) ÷ 1029.4 bbl/ft", () => {
    const { r } = run("drilling-well-control", "annular", { dh: [8.5, "in"], od: [5, "in"], id: [4.276, "in"], md: [10000, "ft"] });
    near(r("ca", "bblft"), (8.5 ** 2 - 5 ** 2) / 1029.4, 1e-4);
  });
});

describe("oil and gas hand checks", () => {
  it("DAK reproduces a Standing-Katz chart point (Tpr 1.5, Ppr 2 ≈ 0.82)", () => {
    expect(dak(1.5, 2).z).toBeGreaterThan(0.81);
    expect(dak(1.5, 2).z).toBeLessThan(0.83);
  });
  it("Colebrook at Re 1e5, ε/D 1e-4 is about 0.0185", () => {
    near(colebrook(1e5, 1e-4), 0.0185, 0.01);
  });
  it("kill sheet: 10 ppg + 400 psi at 10,000 ft gives 10.77 ppg and FCP 538.5 psi", () => {
    const { r } = run("drilling-well-control", "kill-sheet", { omw: [10, "ppg"], sidpp: [400, "psi"], tvd: [10000, "ft"], scr: [500, "psi"] });
    near(r("kmw", "ppg"), 10 + 400 / (PSI_FT_PER_PPG * 10000), 1e-9);
    near(r("fcp", "psi"), (500 * (10 + 400 / (PSI_FT_PER_PPG * 10000))) / 10, 1e-9);
    expect(r("kmwup")).toBeCloseTo(10.8, 9);
  });
  it("API 35 is γo 0.8498", () => {
    const { r } = run("crude-oil-pvt", "gravity", { api: [35, "x"] });
    near(r("sg"), 141.5 / 166.5, 1e-9);
  });
  it("Gilbert: 400 bbl/d, GLR 800, 16/64 in gives 10 × 800^0.546 × 400 ÷ 16^1.89 psig", () => {
    const { r } = run("choke-calculator", "gilbert", { set: [1, "n"], q: [400, "bpd"], S: [16, "in64"], glr: [800, "scfbbl"] });
    near(r("pwh", "psig"), (10 * 800 ** 0.546 * 400) / 16 ** 1.89, 1e-9);
  });
  it("rates: 250 oil, 750 water, 300 Mscf/d is 75 % water cut and GOR 1,200", () => {
    const { r } = run("separators-and-tanks", "rates", { qo: [250, "bpd"], qw: [750, "bpd"], qg: [300, "mscfd"] });
    near(r("wc"), 75, 1e-9);
    near(r("gor", "scfbbl"), 1200, 1e-9);
  });
  it("gas analysis: pure methane is M 16.04, γ 0.554, VOC 0 %", () => {
    const { r } = run("natural-gas-properties", "composition", { c1: [100, "pct"] });
    near(r("M"), 16.0428, 1e-9);
    near(r("gamma"), 16.0428 / 28.9647, 1e-9);
    expect(r("voc")).toBe(0);
  });
});

describe("solve-for-the-blank round trips", () => {
  it("Darcy: rate → permeability → skin → flowing pressure", () => {
    const base = { mode: [1, "n"], pr: [3000, "psia"], h: [30, "ft"], mu: [1.2, "cp"], bo: [1.25, "x"], re: [1490, "ft"], rw: [0.328, "ft"] } as Record<string, [number, string]>;
    const q = run("well-inflow", "darcy", { ...base, k: [50, "md"], s: [3, "x"], pwf: [2000, "psia"], q: null }).r("q", "bpd")!;
    near(run("well-inflow", "darcy", { ...base, q: [q, "bpd"], s: [3, "x"], pwf: [2000, "psia"], k: null }).r("k"), 50, 1e-9);
    near(run("well-inflow", "darcy", { ...base, q: [q, "bpd"], k: [50, "md"], pwf: [2000, "psia"], s: null }).r("s"), 3, 1e-9);
    near(run("well-inflow", "darcy", { ...base, q: [q, "bpd"], k: [50, "md"], s: [3, "x"], pwf: null }).r("pwf", "psia"), 2000, 1e-9);
  });
  it("gas line: outlet pressure → rate and diameter", () => {
    const base = { p1: [800, "psia"], l: [10, "mi"], eps: [0.0018, "in"], t: [80, "f"], gamma: [0.65, "x"] } as Record<string, [number, string]>;
    const p2 = run("pipeline-flow", "gas-line", { ...base, q: [5, "mmscfd"], d: [6.065, "in"], p2: null }).r("p2", "psia")!;
    near(run("pipeline-flow", "gas-line", { ...base, p2: [p2, "psia"], d: [6.065, "in"], q: null }).r("q", "mmscfd"), 5, 2e-3);
    near(run("pipeline-flow", "gas-line", { ...base, p2: [p2, "psia"], q: [5, "mmscfd"], d: null }).r("d", "in"), 6.065, 2e-3);
  });
  it("Standing: GOR → bubble point → GOR", () => {
    const base = { api: [35, "x"], gg: [0.75, "x"], t: [200, "f"] } as Record<string, [number, string]>;
    const pb = run("crude-oil-pvt", "bubble-point", { ...base, rsb: [600, "scfbbl"], pb: null }).r("pb", "psia")!;
    near(run("crude-oil-pvt", "bubble-point", { ...base, pb: [pb, "psia"], rsb: null }).r("rsb", "scfbbl"), 600, 5e-4);
  });
  it("choke: size → rate → size", () => {
    const base = { p1: [1000, "psia"], p2: [400, "psia"], t1: [100, "f"], gamma: [0.65, "x"], k: [1.28, "x"], cd: [0.85, "x"] } as Record<string, [number, string]>;
    const q = run("choke-calculator", "gas-choke", { ...base, d: [24, "in64"], q: null }).r("q", "mscfd")!;
    near(run("choke-calculator", "gas-choke", { ...base, q: [q, "mscfd"], d: null }).r("d", "in64"), 24, 1e-9);
  });
});

describe("oil and gas impossible inputs give an error, not a number", () => {
  const cases: [string, string, Record<string, [number, string] | null>, RegExp][] = [
    ["well-inflow", "darcy", { mode: [1, "n"], k: [50, "md"], s: [3, "x"], pwf: [3500, "psia"], pr: [3000, "psia"], h: [30, "ft"], mu: [1.2, "cp"], bo: [1.25, "x"], re: [1490, "ft"], rw: [0.328, "ft"] }, /below reservoir pressure/],
    ["well-inflow", "vogel", { pr: [3000, "psia"], qt: [400, "bpd"], pt: [3200, "psia"] }, /below reservoir pressure/],
    ["natural-gas-properties", "composition", { c1: [50, "pct"] }, /add up to 50 %/],
    ["natural-gas-properties", "z-factor", { p: [2000, "psia"], t: [180, "f"], gamma: [0.3, "x"] }, /between/],
    ["pipeline-flow", "gas-line", { q: [60, "mmscfd"], p1: [800, "psia"], d: [6.065, "in"], l: [10, "mi"], eps: [0.0018, "in"], t: [80, "f"], gamma: [0.65, "x"] }, /cannot carry this rate/],
    ["drilling-well-control", "annular", { dh: [8.5, "in"], od: [9, "in"], id: [4.276, "in"], md: [10000, "ft"] }, /smaller than the hole/],
    ["drilling-well-control", "hydrostatic", { mw: [10, "ppg"], tvd: [10000, "ft"], p: [5000, "psi"] }, /exactly one/],
    ["choke-calculator", "gas-choke", { p1: [1000, "psia"], p2: [1200, "psia"], t1: [100, "f"], gamma: [0.65, "x"], k: [1.28, "x"], cd: [0.85, "x"], d: [24, "in64"] }, /below upstream/],
    ["separators-and-tanks", "tank-gauge", { shape: [1, "n"], d: [12, "ft"], l: [8, "ft"], h1: [10, "ft"] }, /higher than the tank/],
    ["artificial-lift", "rod-pump", { dp: [1.75, "in"], s: [100, "in"], n: [8, "x"], ev: [0, "pct"] }, /between 1 % and 100 %/],
    ["artificial-lift", "esp", { q: [1500, "bpd"], h: [6000, "ft"], pip: [3500, "psig"], pwh: [100, "psig"], sg: [1.03, "sg"], mu: [1, "cp"], d: [2.441, "in"], eps: [0.0006, "in"] }, /flow without a pump/],
    ["gas-well-deliverability", "nodal", { pr: [2000, "psia"], C: [0.0029, "x"], n: [0.95, "x"], pt: [1950, "psia"], d: [2.441, "in"], eps: [0.0006, "in"], tvd: [8000, "ft"], tt: [100, "f"], tb: [200, "f"], gamma: [0.65, "x"] }, /cannot flow/],
    ["gas-well-deliverability", "static", { pt: [1800, "psia"], tvd: [8000, "ft"], md: [7000, "ft"], tt: [80, "f"], tb: [200, "f"], gamma: [0.65, "x"] }, /Measured depth cannot be less/],
  ];
  for (const [slug, section, values, msg] of cases) {
    it(`${slug} ${section}: ${msg.source}`, () => {
      const { out } = run(slug, section, values);
      expect(out.error).toMatch(msg);
      expect(out.results.filter((x) => x.key)).toHaveLength(0);
    });
  }
});

describe("oil and gas workbook import", () => {
  it("reads inputs typed into the oil and gas workbook in the units beside them", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(readFileSync(join(process.cwd(), "public", OILGAS_WORKBOOK_PATH)) as never);
    const ws = wb.getWorksheet("Drilling")!;
    ws.eachRow((row) => {
      const k = row.getCell(6).value;
      if (k === "in:drilling-well-control.hydrostatic.mw") row.getCell(2).value = 10.5;
      if (k === "in:drilling-well-control.hydrostatic.tvd") row.getCell(2).value = 10000;
    });
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const r = await importUtilities(new File([buf], "mine.xlsx"));
    expect(r.recognized).toBe(true);
    const st = r.states["drilling-well-control"].hydrostatic;
    expect(st.entries.mw).toEqual({ v: 10.5, u: "ppg" });
    const out = runSection(getUtility("drilling-well-control")!.sections[0], st);
    expect(fromSI("dp", "psi", out.results.find((x) => x.id === "p")!.value)).toBeCloseTo(10.5 * PSI_FT_PER_PPG * 10000, 6);
    void toSI;
  }, 60000);
});
