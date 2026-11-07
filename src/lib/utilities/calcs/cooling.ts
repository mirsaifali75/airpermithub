import { Calc, K, labelsOf, q } from "../helpers";
import { liquid, satT } from "../if97";
import type { SectionDef, UtilityDef } from "../types";
import { fmt } from "../units";
import { balanceSection } from "./balance";
import { REF } from "./refs";

const flow = balanceSection(
  {
    id: "flow",
    title: "Cooling water flow, heat load, or outlet temperature",
    question: "How much cooling water does this exchanger need, or how hot will the return get?",
    formulas: ["Q = ṁ × cp × (T_out − T_in)", "ṁ = Q ÷ (cp × ΔT),   V̇ = ṁ ÷ ρ", "US shortcut: gpm ≈ Btu/h ÷ (500 × ΔT °F), where 500 ≈ 8.33 lb/gal × 60 min/h × 1 Btu/lb·°F"],
    example: { title: "Cool a process stream with a 1.2 MW duty using cooling water supplied at 30 °C and returned at 40 °C.", values: { Q: [1.2, "mw"], tin: [30, "c"], tout: [40, "c"] } },
    refs: [REF.if97, REF.ahtt],
  },
  { lo: { id: "tin", label: "Cooling water supply (inlet)", sym: "T_in" }, hi: { id: "tout", label: "Cooling water return (outlet)", sym: "T_out" }, water: true, qLabel: "Heat load", qShow: ["mw", "mmbtuh", "btuh"], vShow: ["m3h", "gpm", "ls"] },
  (r, c) => {
    const gpm = r.V / (3.785411784e-3 / 60);
    const btuh = r.Q / (1.05505585262 / 3600);
    const dTF = r.dT * 1.8;
    c.step("US cross-check (500 rule)", `${fmt(btuh)} Btu/h ÷ (500 × ${fmt(dTF)} °F) = ${fmt(btuh / (500 * dTF))} gpm vs. ${fmt(gpm)} gpm from the property-based result`);
  },
);

const towerInputs: SectionDef["inputs"] = [
  { id: "V", label: "Circulating water flow", sym: "V̇c", family: "vflow", unit: "m3h", min: 0 },
  { id: "thot", label: "Hot water to the tower", sym: "T_hot", family: "temp", unit: "c", min: 0, max: 100 },
  { id: "tcold", label: "Cold water from the tower", sym: "T_cold", family: "temp", unit: "c", min: 0, max: 100 },
  { id: "C", label: "Cycles of concentration", sym: "C", family: "ratio", unit: "x", min: 1.01, help: "Ratio of a dissolved solid (often conductivity or chloride) in the tower water to the makeup water." },
  { id: "drift", label: "Drift loss, % of circulating flow", sym: "D%", family: "pct", unit: "pct", optional: true, min: 0, max: 5, help: "From the tower manufacturer's drift eliminator rating." },
  { id: "fevap", label: "Share of heat rejected by evaporation (blank = 100 %)", sym: "f", family: "pct", unit: "pct", optional: true, min: 1, max: 100, help: "100 % gives the upper bound. Part of the heat leaves as sensible heat to the air, more so in cold weather." },
  { id: "twb", label: "Ambient wet-bulb temperature", sym: "T_wb", family: "temp", unit: "c", optional: true },
  { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
];

const tower: SectionDef = {
  id: "tower",
  title: "Cooling tower makeup, evaporation, and blowdown",
  question: "How much makeup water will the tower use, and how much must we blow down?",
  formulas: [
    "Range = T_hot − T_cold,   Q = ṁc × cp × Range",
    "E = f × Q ÷ hfg(T_mean)",
    "B = E ÷ (C − 1) − D,   D = drift % × ṁc",
    "Makeup M = E + B + D",
    "Approach = T_cold − T_wb,   effectiveness = Range ÷ (Range + Approach)",
  ],
  inputs: towerInputs,
  example: {
    title: "A 1,000 m³/h tower cooling from 40 °C to 30 °C at 5 cycles, 0.005 % drift, 26 °C wet bulb.",
    values: { V: [1000, "m3h"], thot: [40, "c"], tcold: [30, "c"], C: [5, "x"], drift: [0.005, "pct"], twb: [26, "c"], hours: [8000, "h"] },
  },
  refs: [REF.femptower, REF.if97],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "thot", "tcold", "C");
    if (miss.length) return c.missing(miss, labelsOf(towerInputs));
    const range = c.n("thot") - c.n("tcold");
    if (!(range > 0)) return c.done("Hot water must be warmer than cold water.");
    if (c.n("C") <= 1) return c.done("Cycles of concentration must be greater than 1.");
    const tm = (c.n("thot") + c.n("tcold")) / 2;
    const w = liquid(K(tm));
    const hfg = satT(K(tm)).hfg;
    const mc = w.rho * c.n("V");
    const Q = mc * w.cp * range;
    c.step("Water properties", `At ${fmt(tm)} °C: ρ = ${fmt(w.rho)} kg/m³, cp = ${fmt(w.cp)} kJ/kg·K, hfg = ${fmt(hfg)} kJ/kg (IAPWS-IF97)`);
    c.step("Heat rejected", `Q = ${fmt(mc)} kg/s × ${fmt(w.cp)} × ${fmt(range)} = ${q(Q, "power", "kw")}`, "Q = ṁc × cp × Range");
    const f = (v.fevap ?? 100) / 100;
    const E = (f * Q) / hfg;
    c.step("Evaporation", `E = ${fmt(f)} × ${fmt(Q)} kW ÷ ${fmt(hfg)} kJ/kg = ${fmt(E)} kg/s = ${q(E / w.rho, "vflow", "m3h")}`, "E = f × Q ÷ hfg");
    const D = ((v.drift ?? 0) / 100) * mc;
    const BD = E / (c.n("C") - 1);
    let B = BD - D;
    c.step("Blowdown", `B = ${fmt(E)} ÷ (${fmt(c.n("C"))} − 1) − ${fmt(D)} = ${fmt(B)} kg/s`, "B = E ÷ (C − 1) − D");
    if (B < 0) {
      c.warn("Drift alone removes more water than the cycles need, so no blowdown is needed and the tower would run below the entered cycles.");
      B = 0;
    }
    const M = E + B + D;
    c.step("Makeup", `M = ${fmt(E)} + ${fmt(B)} + ${fmt(D)} = ${fmt(M)} kg/s = ${q(M / w.rho, "vflow", "m3h")} = ${q(M / w.rho, "vflow", "gpm")}`, "M = E + B + D");
    c.result("Q", "Heat rejected", "power", Q, ["kw", "mw", "mmbtuh"]);
    c.result("range", "Range", "dtemp", range, ["k", "f"]);
    c.result("E", "Evaporation", "vflow", E / w.rho, ["m3h", "gpm"], true);
    c.result("B", "Blowdown", "vflow", B / w.rho, ["m3h", "gpm"], true);
    c.result("D", "Drift", "vflow", D / w.rho, ["m3h", "gpm"]);
    c.result("M", "Makeup water", "vflow", M / w.rho, ["m3h", "gpm", "m3d"], true);
    c.result("Epct", "Evaporation as % of circulation", "pct", (100 * E) / mc, ["pct"]);
    if (v.twb !== null && v.twb !== undefined) {
      const approach = c.n("tcold") - v.twb;
      if (approach <= 0) c.warn("Cold water at or below the wet bulb is not physically possible for an evaporative tower. Check the temperatures.");
      else {
        const eff = range / (range + approach);
        c.step("Approach and effectiveness", `Approach = ${fmt(c.n("tcold"))} − ${fmt(v.twb)} = ${fmt(approach)} °C;  effectiveness = ${fmt(range)} ÷ (${fmt(range)} + ${fmt(approach)}) = ${fmt(eff * 100)} %`);
        c.result("approach", "Approach", "dtemp", approach, ["k", "f"]);
        c.result("eff", "Tower effectiveness", "pct", eff * 100, ["pct"]);
      }
    }
    if (v.hours) {
      const annual = (M / w.rho) * v.hours;
      c.step("Annual makeup", `${fmt((M / w.rho) * 3600)} m³/h × ${fmt(v.hours / 3600)} h = ${fmt(annual)} m³/yr`);
      c.result("annual", "Annual makeup", "volume", annual, ["m3", "gal"]);
    }
    return c.done();
  },
};

const hxInputs: SectionDef["inputs"] = [
  { id: "thi", label: "Hot side in", sym: "Th,i", family: "temp", unit: "c" },
  { id: "tho", label: "Hot side out", sym: "Th,o", family: "temp", unit: "c" },
  { id: "tci", label: "Cold side in", sym: "Tc,i", family: "temp", unit: "c" },
  { id: "tco", label: "Cold side out", sym: "Tc,o", family: "temp", unit: "c" },
  { id: "flow", label: "Flow arrangement", family: "count", unit: "n", choices: [{ value: 1, label: "Counterflow" }, { value: 2, label: "Parallel flow" }] },
  { id: "F", label: "LMTD correction factor F (blank = 1)", sym: "F", family: "ratio", unit: "x", optional: true, min: 0.5, max: 1, help: "For multi-pass shell-and-tube units, from the exchanger's correction-factor chart." },
  { id: "Q", label: "Duty", sym: "Q", family: "power", unit: "kw", solvable: true, min: 0 },
  { id: "U", label: "Overall heat transfer coefficient", sym: "U", family: "uval", unit: "wm2k", solvable: true, min: 0, help: "From the exchanger data sheet, or your design value including fouling." },
  { id: "A", label: "Heat transfer area", sym: "A", family: "area", unit: "m2", solvable: true, min: 0 },
];

const hx: SectionDef = {
  id: "exchanger",
  title: "Heat exchanger area (LMTD method)",
  question: "How much exchanger area does this duty need, or what U is the exchanger achieving?",
  formulas: ["ΔT₁, ΔT₂ = end temperature differences", "LMTD = (ΔT₁ − ΔT₂) ÷ ln(ΔT₁ ÷ ΔT₂)", "Q = U × A × F × LMTD"],
  solveNote: "Leave exactly one of duty, U, or area blank and it is solved.",
  inputs: hxInputs,
  example: { title: "A counterflow cooler: process 80 → 40 °C, cooling water 30 → 40 °C, 1,200 kW, U = 800 W/m²·K.", values: { thi: [80, "c"], tho: [40, "c"], tci: [30, "c"], tco: [40, "c"], flow: [1, "n"], Q: [1200, "kw"], U: [800, "wm2k"] } },
  refs: [REF.ahtt],
  compute(v) {
    const c = new Calc(v);
    const L = labelsOf(hxInputs);
    const miss = c.blank("thi", "tho", "tci", "tco");
    if (miss.length) return c.missing(miss, L);
    const counter = (v.flow ?? 1) === 1;
    const d1 = counter ? c.n("thi") - c.n("tco") : c.n("thi") - c.n("tci");
    const d2 = counter ? c.n("tho") - c.n("tci") : c.n("tho") - c.n("tco");
    c.step("End temperature differences", counter ? `ΔT₁ = ${fmt(c.n("thi"))} − ${fmt(c.n("tco"))} = ${fmt(d1)} °C;  ΔT₂ = ${fmt(c.n("tho"))} − ${fmt(c.n("tci"))} = ${fmt(d2)} °C` : `ΔT₁ = ${fmt(c.n("thi"))} − ${fmt(c.n("tci"))} = ${fmt(d1)} °C;  ΔT₂ = ${fmt(c.n("tho"))} − ${fmt(c.n("tco"))} = ${fmt(d2)} °C`, counter ? "Counterflow: ΔT₁ = Th,i − Tc,o, ΔT₂ = Th,o − Tc,i" : "Parallel: ΔT₁ = Th,i − Tc,i, ΔT₂ = Th,o − Tc,o");
    if (d1 <= 0 || d2 <= 0) return c.done("A temperature cross: the hot side must stay hotter than the cold side at both ends for this arrangement.");
    const lmtd = Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
    c.step("LMTD", `LMTD = (${fmt(d1)} − ${fmt(d2)}) ÷ ln(${fmt(d1)} ÷ ${fmt(d2)}) = ${fmt(lmtd)} °C`, "LMTD = (ΔT₁ − ΔT₂) ÷ ln(ΔT₁/ΔT₂)");
    const F = v.F ?? 1;
    const unk = c.blank("Q", "U", "A");
    if (unk.length !== 1) return c.done(unk.length ? `Leave only one of duty, U, or area blank (now blank: ${unk.map((i) => L[i]).join(", ")}).` : "Leave one of duty, U, or area blank to solve it.");
    c.solved = unk[0];
    const UkW = (x: number) => x / 1000;
    if (unk[0] === "A") {
      const A = c.n("Q") / (UkW(c.n("U")) * F * lmtd);
      c.step("Area", `A = ${fmt(c.n("Q"))} kW ÷ (${fmt(UkW(c.n("U")))} kW/m²·K × ${fmt(F)} × ${fmt(lmtd)}) = ${fmt(A)} m²`, "A = Q ÷ (U F LMTD)");
      c.result("A", "Required area", "area", A, ["m2", "ft2"], true);
    } else if (unk[0] === "U") {
      const U = (c.n("Q") / (c.n("A") * F * lmtd)) * 1000;
      c.step("U", `U = ${fmt(c.n("Q"))} kW ÷ (${fmt(c.n("A"))} m² × ${fmt(F)} × ${fmt(lmtd)}) = ${fmt(U)} W/m²·K`, "U = Q ÷ (A F LMTD)");
      c.result("U", "Overall heat transfer coefficient", "uval", U, ["wm2k", "btuhft2f"], true);
    } else {
      const Q = UkW(c.n("U")) * c.n("A") * F * lmtd;
      c.step("Duty", `Q = ${fmt(UkW(c.n("U")))} × ${fmt(c.n("A"))} × ${fmt(F)} × ${fmt(lmtd)} = ${fmt(Q)} kW`, "Q = U A F LMTD");
      c.result("Q", "Duty", "power", Q, ["kw", "mmbtuh"], true);
    }
    c.result("lmtd", "LMTD", "dtemp", lmtd, ["k", "f"]);
    return c.done();
  },
};

export const coolingWater: UtilityDef = {
  slug: "cooling-water",
  name: "Cooling Water Calculator",
  short: "Cooling water",
  sheet: "Cooling Water",
  problem: "How much cooling water does this exchanger need, and how much makeup will the tower use?",
  description: "Cooling water flow from heat load and ΔT (or solve the load or return temperature), cooling tower evaporation, blowdown, drift and makeup at your cycles, and heat exchanger area by LMTD.",
  keywords: "cooling water calculation cooling water flow rate heat load m3/h gpm cooling tower makeup water evaporation blowdown cycles of concentration drift approach range lmtd heat exchanger area",
  sections: [flow, tower, hx],
  notes: [
    "Water density and specific heat are taken at the mean temperature from IAPWS-IF97 unless you enter your own.",
    "Tower evaporation uses an energy balance: the heat you tell it is rejected by evaporation divided by water's latent heat at the mean water temperature.",
    "Blowdown and makeup follow the tower mass balance M = E + B + D with C = M ÷ (B + D).",
  ],
};
