import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { COLLECTIONS, blankSection, exampleSection, getUtility, runSection, utilities, type SectionState } from "./index";
import { psat, region1, region2, satP, tsat, viscosity, waterPT } from "./if97";
import { frictionFactor } from "./calcs/process";
import { formulaLiterals, matchConstant, reviewCells, sameSheetRefs } from "./review";
import { fromSI, toSI } from "./units";
import { parseKey } from "./workbook-layout";
import { importUtilities, reviewFile } from "./xlsx";

const close = (a: number, b: number, rel = 1e-8) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(rel);

function run(slug: string, section: string, values: Record<string, [number, string] | null>, lists?: SectionState["lists"]) {
  const s = getUtility(slug)!.sections.find((x) => x.id === section)!;
  const st = blankSection(s);
  for (const [k, v] of Object.entries(values)) st.entries[k] = v ? { v: v[0], u: v[1] } : { v: null, u: s.inputs.find((i) => i.id === k)!.unit };
  if (lists) st.lists = lists;
  const out = runSection(s, st);
  const r = (id: string) => out.results.find((x) => x.id === id)?.value;
  return { out, r };
}

describe("IAPWS-IF97 against the release's verification tables", () => {
  it("region 1 (Table 5)", () => {
    const a = region1(3, 300);
    close(a.v, 0.100215168e-2);
    close(a.h, 0.115331273e3);
    close(a.s, 0.392294792);
    close(a.cp, 0.417301218e1);
    close(region1(80, 300).h, 0.184142828e3);
    const b = region1(3, 500);
    close(b.h, 0.975542239e3);
    close(b.cp, 0.465580682e1);
  });
  it("region 2 (Table 15)", () => {
    const a = region2(0.0035, 300);
    close(a.v, 0.394913866e2);
    close(a.h, 0.254991145e4);
    close(region2(0.0035, 700).h, 0.333568375e4);
    const c = region2(30, 700);
    close(c.h, 0.263149474e4);
    close(c.s, 0.517540298e1);
  });
  it("region 4 saturation line (Tables 35, 36)", () => {
    close(psat(300), 0.353658941e-2);
    close(psat(500), 0.263889776e1);
    close(psat(600), 0.123443146e2);
    close(tsat(0.1), 0.372755919e3);
    close(tsat(1), 0.453035632e3);
    close(tsat(10), 0.584149488e3);
  });
  it("IAPWS 2008 viscosity check value (298.15 K, 998 kg/m³)", () => {
    close(viscosity(298.15, 998) * 1e6, 889.7351, 1e-6);
  });
  it("refuses the near-critical region", () => {
    expect(() => waterPT(25, 650)).toThrow();
    expect(() => satP(20)).toThrow();
  });
});

describe("units", () => {
  it("round-trips gauge pressure, °F, and standard gas volumes", () => {
    expect(toSI("pabs", "barg", 0)).toBeCloseTo(101.325, 9);
    expect(toSI("pabs", "psig", 0)).toBeCloseTo(101.325, 9);
    expect(toSI("temp", "f", 212)).toBeCloseTo(100, 9);
    expect(fromSI("temp", "f", 0)).toBeCloseTo(32, 9);
    // 1 Nm³ at 0 °C, 1 atm ≈ 44.615 mol
    expect(toSI("gasflow", "nm3h", 3600)).toBeCloseTo(44.615, 2);
    expect(fromSI("power", "tr", toSI("power", "kw", 3.51685284))).toBeCloseTo(1, 6);
  });
});

describe("worked examples", () => {
  for (const u of utilities)
    for (const s of u.sections)
      it(`${u.slug} / ${s.id} runs and gives its main results`, () => {
        const out = runSection(s, exampleSection(s));
        expect(out.error).toBeUndefined();
        expect(out.results.filter((r) => r.key).length).toBeGreaterThan(0);
        for (const r of out.results) expect(Number.isFinite(r.value)).toBe(true);
      });
});

describe("hand checks", () => {
  it("cooling water: 1.2 MW, 30→40 °C gives about 28.7 kg/s", () => {
    const { r, out } = run("cooling-water", "flow", { Q: [1200, "kw"], tin: [30, "c"], tout: [40, "c"], cp: [4.18, "kjkgk"], rho: [1000, "kgm3"] });
    expect(out.solved).toBe("V");
    expect(r("m")!).toBeCloseTo(1200 / (4.18 * 10), 9); // 28.708 kg/s
    expect(r("V")! * 3600).toBeCloseTo(103.35, 2);
  });
  it("cooling water: solves the return temperature when it is blank", () => {
    const { r, out } = run("cooling-water", "flow", { Q: [1200, "kw"], V: [0.0287081339712919 * 1, "m3s"], tin: [30, "c"], tout: null, cp: [4.18, "kjkgk"], rho: [1000, "kgm3"] });
    expect(out.solved).toBe("tout");
    expect(r("tout")!).toBeCloseTo(40, 6);
  });
  it("asks for one blank at a time", () => {
    const { out } = run("cooling-water", "flow", { Q: null, V: null, tin: [30, "c"], tout: [40, "c"] });
    expect(out.error).toMatch(/only one/);
  });
  it("chiller: 500 tons at 0.6 kW/ton is 300 kW and COP 5.86", () => {
    const { r } = run("chilled-water", "chiller", { Q: [500, "tr"], kwt: [0.6, "x"], W: null });
    expect(r("W")!).toBeCloseTo(300, 6);
    expect(r("cop")!).toBeCloseTo(3.51685284 / 0.6, 5);
  });
  it("flash steam from 10 bar(g) to 1 bar(g) is about 12.5 %", () => {
    const { r } = run("steam", "flash", { mc: [5000, "kgh"], p1: [10, "barg"], p2: [1, "barg"] });
    const a = satP(1.101325), b = satP(0.201325);
    expect(r("x")! / 100).toBeCloseTo((a.hf - b.hf) / b.hfg, 3);
    expect(r("x")!).toBeGreaterThan(12.4);
    expect(r("x")!).toBeLessThan(12.7);
  });
  it("steam for heating equals Q ÷ (hg − hf) for saturated steam with no losses", () => {
    const { r } = run("steam", "heating", { Q: [1000, "kw"], ps: [4, "barg"] });
    const s = satP(0.501325);
    expect(r("ms")!).toBeCloseTo(1000 / s.hfg, 9);
  });
  it("boiler blowdown from TDS: 150 ÷ 3000 = 5 %", () => {
    const { r } = run("steam", "boiler", { ms: [10000, "kgh"], p: [10, "barg"], tfw: [105, "c"], eff: [80, "pct"], tdsf: [150, "ppm"], tdsb: [3000, "ppm"] });
    expect(r("mfw")! * 3600).toBeCloseTo(10000 / 0.95, 6);
  });
  it("Colebrook friction factor matches the Moody chart point Re = 1e5, ε/D = 1e-4", () => {
    expect(frictionFactor(1e5, 1e-4).f).toBeCloseTo(0.0185, 3);
    expect(frictionFactor(1000, 1e-4).f).toBeCloseTo(0.064, 9);
  });
  it("pump: 50 m³/h × 36 m × 1000 kg/m³ is 4.903 kW hydraulic", () => {
    const { r } = run("process-water", "pump", { V: [50, "m3h"], H: [36, "m"], rho: [1000, "kgm3"], ep: [100, "pct"] });
    expect(r("Ph")!).toBeCloseTo((1000 * 9.80665 * (50 / 3600) * 36) / 1000, 9);
  });
  it("compressed air leak test: 40 s on, 110 s off is 26.7 %", () => {
    const { r } = run("compressed-air", "leaks", { on: [40, "s"], off: [110, "s"] });
    expect(r("pct")!).toBeCloseTo(26.6667, 3);
  });
  it("single-stage isothermal-intercooled power matches the ideal-gas formula", () => {
    const { r } = run("compressed-air", "compressor", { n: [1, "kmolh"], p1: [100, "kpaa"], t1: [20, "c"], p2: [800, "kpaa"], N: [1, "n"], eta: [100, "pct"] });
    const n = 1000 / 3600, T = 293.15;
    expect(r("Psh")!).toBeCloseTo((3.5 * n * 8.314462618 * T * (8 ** (0.4 / 1.4) - 1)) / 1000, 9);
  });
  it("nitrogen purge: 4 bar(g)/0.2 bar(g) from 20.9 % to 2 % takes 2 cycles", () => {
    const { r } = run("nitrogen", "pressure-purge", { V: [20, "m3"], ph: [4, "barg"], pl: [0.2, "barg"], T: [25, "c"], c0: [20.9, "pct"], ct: [2, "pct"] });
    expect(r("j")).toBe(2);
    expect(r("cf")!).toBeLessThan(2);
  });
  it("receiver: solves the volume or the time", () => {
    const a = run("compressed-air", "receiver", { t: [2, "min"], n: [10, "nm3min"], p1: [7, "barg"], p2: [6, "barg"], T: [30, "c"], V: null });
    const b = run("compressed-air", "receiver", { V: [a.r("V")!, "m3"], n: [10, "nm3min"], p1: [7, "barg"], p2: [6, "barg"], T: [30, "c"], t: null });
    expect(b.r("t")!).toBeCloseTo(120, 6);
  });
  it("water balance: consumption − recycle + losses", () => {
    const { r } = run("process-water", "demand", { loss: [10, "pct"] }, { users: [["A", 10, 2, 50], ["B", 5, null, null]] });
    expect(r("net")! * 3600).toBeCloseTo(25 - 10 + 2.5, 9);
  });
  it("stops on an input outside its physical range", () => {
    const { out } = run("steam", "flash", { mc: [-5, "kgh"], p1: [10, "barg"], p2: [1, "barg"] });
    expect(out.error).toMatch(/Condensate flow must be at least 0/);
    expect(out.results).toHaveLength(0);
  });
  it("only warns outside a typical (soft) range", () => {
    const { out, r } = run("steam", "boiler", { ms: [10000, "kgh"], p: [10, "barg"], tfw: [105, "c"], bd: [60, "pct"], eff: [82, "pct"] });
    expect(out.error).toBeUndefined();
    expect(out.warnings[0]).toMatch(/usually between 0 % and 50 %/);
    expect(r("mbd")).toBeGreaterThan(0);
  });
});

// Every case here once gave a number instead of an error. None may return a result.
describe("impossible inputs give an error, not a number", () => {
  const cases: [string, string, Record<string, [number, string]>, RegExp][] = [
    ["cooling-water", "flow", { Q: [50, "mw"], V: [100, "m3h"], tin: [30, "c"] }, /above the boiling point/],
    ["chilled-water", "load", { Q: [5000, "kw"], V: [50, "m3h"], tr: [12, "c"] }, /below freezing/],
    ["steam", "heating", { mp: [20000, "kgh"], cp: [4.18, "kjkgk"], t1: [30, "c"], t2: [160, "c"], ps: [4, "barg"] }, /cannot heat the product/],
    ["steam", "heating", { Q: [1000, "kw"], ps: [4, "barg"], loss: [100, "pct"] }, /between 0 % and 99 %/],
    ["steam", "boiler", { ms: [10000, "kgh"], p: [10, "barg"], tfw: [105, "c"], bd: [100, "pct"], eff: [82, "pct"] }, /below 100 %/],
    ["process-water", "pipe", { V: [50, "m3h"], d: [0, "mm"], len: [200, "m"], eps: [0.045, "mm"], t: [25, "c"] }, /greater than zero/],
    ["process-water", "pump", { V: [50, "m3h"], H: [36, "m"], ep: [0, "pct"] }, /Pump efficiency must be between/],
    ["hot-oil", "heater", { Q: [1500, "kw"], eff: [120, "pct"] }, /Heater efficiency must be between/],
    ["compressed-air", "hole", { d: [3, "mm"], p0: [7, "barg"], t0: [25, "c"], cd: [1.5, "x"] }, /Discharge coefficient must be between/],
    ["compressed-air", "compressor", { n: [1000, "nm3h"], p1: [1.013, "bara"], t1: [30, "c"], p2: [7, "barg"], N: [1, "n"], k: [0.9, "x"], eta: [80, "pct"] }, /between 1.01 and 1.7/],
    ["compressed-air", "leaks", { on: [-5, "s"], off: [100, "s"] }, /at least 0 s/],
    ["nitrogen", "sweep-purge", { V: [30, "m3"], c0: [20.9, "pct"], ct: [5, "pct"], k: [1.5, "x"] }, /between 0.05 and 1/],
    ["cooling-water", "exchanger", { thi: [40, "c"], tho: [80, "c"], tci: [10, "c"], tco: [20, "c"], flow: [1, "n"], Q: [1000, "kw"], U: [500, "wm2k"] }, /hot side must cool down/],
  ];
  for (const [slug, section, values, msg] of cases) {
    it(`${slug} ${section}: ${msg.source}`, () => {
      const { out } = run(slug, section, values);
      expect(out.error).toMatch(msg);
      expect(out.results.filter((x) => x.key)).toHaveLength(0);
    });
  }
});

describe("spreadsheet review", () => {
  it("finds refs and literals in formulas, skipping strings, ranges, and other sheets", () => {
    expect(sameSheetRefs('B2*C3+SUM(D1:D9)+Other!A1+"A5"')).toEqual(["B2", "C3"]);
    expect(formulaLiterals("B2/(500*C2)+LOG10(4.18)+Sheet2!B12")).toEqual([500, 4.18]);
    expect(matchConstant(500)?.meaning).toMatch(/500/);
  });
  it("flags errors, blank references, text numbers, and rules of thumb", () => {
    const rep = reviewCells([
      { sheet: "S", address: "A1", value: "Heat load (Btu/h)" },
      { sheet: "S", address: "B1", value: 1e6 },
      { sheet: "S", address: "A2", value: "Flow (gpm)" },
      { sheet: "S", address: "B2", value: 200, formula: "B1/(500*B3)" },
      { sheet: "S", address: "B4", value: "#DIV/0!", error: "#DIV/0!", formula: "B1/B5" },
      { sheet: "S", address: "B6", value: "12.5" },
      { sheet: "S", address: "B7", value: "#REF!", formula: "#REF!*2", error: "#REF!" },
    ]);
    expect(rep.counts.error).toBe(2);
    expect(rep.counts["broken-ref"]).toBe(1);
    expect(rep.counts["blank-ref"]).toBe(2);
    expect(rep.counts["text-number"]).toBe(1);
    expect(rep.counts.constant).toBe(1);
    expect(rep.issues.find((i) => i.kind === "constant")!.label).toBe("Flow (gpm)");
    expect(rep.issues[0].severity).toBe("high");
  });
});

describe("workbook keys and Excel round trip", () => {
  it("parses keys", () => {
    expect(parseKey("in:steam.boiler.ms")).toEqual({ kind: "in", slug: "steam", section: "boiler", id: "ms" });
    expect(parseKey("list:process-water.demand.users.3")).toEqual({ kind: "list", slug: "process-water", section: "demand", id: "users", row: 3 });
    expect(parseKey("in:steam.boiler")).toBeNull();
    expect(parseKey(42)).toBeNull();
  });

  const file = (path = COLLECTIONS[0].workbook) => readFileSync(join(process.cwd(), "public", path));

  for (const col of COLLECTIONS) {
    it(`${col.name}: has a cell for every calculator input and list row`, async () => {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(file(col.workbook) as never);
      const keys = new Set<string>();
      wb.eachSheet((ws) => ws.eachRow((row) => { const v = row.getCell(6).value; if (typeof v === "string") keys.add(v); }));
      for (const u of col.list)
        for (const s of u.sections) {
          for (const i of s.inputs) expect(keys.has(`in:${u.slug}.${s.id}.${i.id}`), `${u.slug}.${s.id}.${i.id}`).toBe(true);
          if (s.list) expect(keys.has(`list:${u.slug}.${s.id}.${s.list.id}.0`)).toBe(true);
        }
    });

    it(`${col.name}: locks every formula, leaves only the input cells open, and keeps that after the site's export`, async () => {
      const src = new ExcelJS.Workbook();
      await src.xlsx.load(file(col.workbook) as never);
      src.addWorksheet("Calculation Record"); // what exportUtilities adds
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await src.xlsx.writeBuffer()) as never);
      for (const u of col.list) {
        const ws = wb.getWorksheet(u.sheet)!;
        expect((ws as unknown as { sheetProtection?: { sheet?: boolean } }).sheetProtection?.sheet, u.sheet).toBe(true);
        ws.eachRow((row) =>
          row.eachCell((c) => {
            const key = row.getCell(6).value;
            const isInput = Number(c.col) === 2 && typeof key === "string" && key.startsWith("in:");
            if (c.formula) expect(c.protection?.locked, `${u.sheet}!${c.address} formula`).not.toBe(false);
            if (isInput) expect(c.protection?.locked, `${u.sheet}!${c.address} input`).toBe(false);
            if (isInput && !u.sections.some((s) => s.inputs.some((i) => i.choices && key === `in:${u.slug}.${s.id}.${i.id}`)))
              expect(c.dataValidation?.type, `${u.sheet}!${c.address} number-only`).toBe("decimal");
          }),
        );
      }
    }, 60000);
  }

  it("imports inputs typed into the workbook, in the units written beside them", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file() as never);
    const ws = wb.getWorksheet("Cooling Water")!;
    ws.eachRow((row) => {
      const k = row.getCell(6).value;
      if (k === "in:cooling-water.flow.Q") row.getCell(2).value = 1200;
      if (k === "in:cooling-water.flow.tin") row.getCell(2).value = 30;
      if (k === "in:cooling-water.flow.tout") { row.getCell(2).value = 104; row.getCell(3).value = "°F"; }
    });
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const r = await importUtilities(new File([buf], "mine.xlsx"));
    expect(r.recognized).toBe(true);
    const st = r.states["cooling-water"].flow;
    expect(st.entries.Q).toEqual({ v: 1200, u: "kw" });
    expect(st.entries.tout).toEqual({ v: 104, u: "f" });
    const out = runSection(getUtility("cooling-water")!.sections[0], st);
    expect(out.results.find((x) => x.id === "dT")!.value).toBeCloseTo(10, 9);
    expect(r.uncached).toBeGreaterThan(0);
  });

  it("reviews a workbook that is not ours", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("CW");
    ws.getCell("A1").value = "Load";
    ws.getCell("B1").value = 1000000;
    ws.getCell("A2").value = "gpm";
    ws.getCell("B2").value = { formula: "B1/(500*B3)", result: 0 } as ExcelJS.CellFormulaValue;
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const res = await reviewFile(new File([buf], "theirs.xlsx"));
    expect(res.template.recognized).toBe(false);
    expect(res.report.counts["blank-ref"]).toBe(1);
    expect(res.report.counts.constant).toBe(1);
  });
});
