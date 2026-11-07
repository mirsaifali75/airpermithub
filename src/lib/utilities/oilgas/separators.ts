import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { R_UNIVERSAL, fmt, fromSI, toSI } from "../units";
import { BBL_M3, FT_M, LBFT3, M_AIR_G, degR, gasState, psia } from "./core";
import { OG } from "./refs";

const gasIn: InputDef[] = [
  { id: "q", label: "Gas rate", sym: "q_g", family: "gasflow", unit: "mmscfd", solvable: true, min: 0 },
  { id: "d", label: "Vessel inside diameter (vertical vessel)", sym: "D", family: "diam", unit: "in", solvable: true, min: 0.05, max: 6 },
  { id: "p", label: "Operating pressure", sym: "p", family: "pabs", unit: "psia", min: 1 },
  { id: "t", label: "Operating temperature", sym: "T", family: "temp", unit: "f", min: -40, max: 400 },
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 1.8 },
  { id: "rhol", label: "Liquid density", sym: "ρL", family: "rho", unit: "lbft3", min: 400, max: 1300 },
  { id: "K", label: "Souders-Brown K (sizing) factor", sym: "K", family: "vel", unit: "fts", min: 0.01, max: 1, help: "From the mist extractor maker or your design standard; it depends on the internals, pressure, and liquid load." },
];

const gasCap: SectionDef = {
  id: "gas-capacity",
  title: "Separator gas capacity (Souders-Brown)",
  question: "How big a vertical separator does this gas rate need, or how much gas can this vessel handle?",
  formulas: ["V_max = K √((ρL − ρg) ÷ ρg)", "Gas flow at operating conditions: V̇ = ṅ Z R T ÷ p", "A = V̇ ÷ V_max,   D = √(4A ÷ π)"],
  solveNote: "Leave the gas rate or the vessel diameter blank.",
  inputs: gasIn,
  example: { title: "10 MMscf/d of 0.65 gravity gas at 1,000 psia and 100 °F, 50 lb/ft³ condensate, K 0.35 ft/s.", values: { q: [10, "mmscfd"], p: [1000, "psia"], t: [100, "f"], gamma: [0.65, "x"], rhol: [50, "lbft3"], K: [0.35, "fts"] } },
  refs: [OG.separators, OG.realGases],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("p", "t", "gamma", "rhol", "K");
    if (miss.length) return c.missing(miss, labelsOf(gasIn));
    const b = c.blank("q", "d");
    if (b.length !== 1) return c.done("Leave either the gas rate or the vessel diameter blank.");
    const st = gasState(psia(c.n("p")), degR(c.n("t")), { gamma: c.n("gamma") });
    if (!st.ok) return c.done("The Z-factor equation has no solution here. Check pressure, temperature, and gravity.");
    const rg = st.rhoSI, rl = c.n("rhol");
    if (!(rl > rg)) return c.done("The liquid must be denser than the gas.");
    c.step("Gas density", `Z = ${fmt(st.z, 5)};  ρg = pM ÷ (ZRT) = ${fmt(rg)} kg/m³ = ${fmt(rg / LBFT3)} lb/ft³`);
    const Vmax = c.n("K") * Math.sqrt((rl - rg) / rg);
    c.step("Maximum gas velocity", `V_max = ${fmt(c.n("K") / FT_M)} × √((${fmt(rl / LBFT3)} − ${fmt(rg / LBFT3)}) ÷ ${fmt(rg / LBFT3)}) = ${fmt(Vmax / FT_M)} ft/s`);
    const perMol = (st.z * R_UNIVERSAL * (c.n("t") + 273.15)) / (c.n("p") * 1000);
    let n: number, D: number;
    if (b[0] === "d") {
      n = c.n("q");
      const A = (n * perMol) / Vmax;
      D = Math.sqrt((4 * A) / Math.PI);
      c.solved = "d";
      c.step("Required diameter", `V̇ = ${fmt(n * perMol, 5)} m³/s;  A = ${fmt(n * perMol, 5)} ÷ ${fmt(Vmax, 5)} = ${fmt(A, 5)} m²;  D = ${fmt(D / 0.0254)} in`);
    } else {
      D = c.n("d");
      const A = (Math.PI * D * D) / 4;
      n = (A * Vmax) / perMol;
      c.solved = "q";
      c.step("Gas capacity", `A = ${fmt(A, 5)} m²;  V̇ = A × V_max = ${fmt(A * Vmax, 5)} m³/s;  ṅ = ${fmt(n)} mol/s = ${fmt(fromSI("gasflow", "mmscfd", n), 5)} MMscf/d`);
    }
    c.result("d", "Minimum vessel inside diameter", "diam", D, ["in", "mm"], b[0] === "d");
    c.result("q", "Gas capacity", "gasflow", n, ["mmscfd", "ksm3d"], b[0] === "q");
    c.result("vmax", "Maximum gas velocity", "vel", Vmax, ["fts", "ms"], true);
    c.result("rhog", "Gas density", "rho", rg, ["lbft3", "kgm3"]);
    c.result("vact", "Actual gas flow at operating conditions", "vflow", n * perMol, ["m3h"]);
    c.result("z", "Z-factor", "ratio", st.z, ["x"]);
    c.warn("Vertical vessel, full cross-section for gas. Check liquid retention (next section) too; the larger requirement sets the size.");
    return c.done();
  },
};

const liqIn: InputDef[] = [
  { id: "qo", label: "Oil (condensate) rate", sym: "q_o", family: "vflow", unit: "bpd", min: 0 },
  { id: "qw", label: "Water rate", sym: "q_w", family: "vflow", unit: "bpd", optional: true, min: 0 },
  { id: "tr", label: "Retention time", sym: "t_r", family: "time", unit: "min", min: 0, help: "From your design basis or test data; heavier or foaming crudes need longer." },
  { id: "d", label: "Vessel inside diameter (optional, vertical)", sym: "D", family: "diam", unit: "in", optional: true, min: 0.05, max: 6 },
];

const retention: SectionDef = {
  id: "retention",
  title: "Liquid retention volume and level",
  question: "How much liquid volume does the separator need for the retention time, and how high is that in a vertical vessel?",
  formulas: ["V_liquid = (q_o + q_w) × t_r", "Height in a vertical vessel = V_liquid ÷ (π D² ÷ 4)"],
  inputs: liqIn,
  example: { title: "1,500 bbl/d oil and 1,000 bbl/d water with 3 minutes retention in a 48 in vessel.", values: { qo: [1500, "bpd"], qw: [1000, "bpd"], tr: [3, "min"], d: [48, "in"] } },
  refs: [OG.separators],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("qo", "tr");
    if (miss.length) return c.missing(miss, labelsOf(liqIn));
    const Q = c.n("qo") + (v.qw ?? 0);
    const V = Q * c.n("tr");
    c.step("Liquid volume", `(${fmt(fromSI("vflow", "bpd", c.n("qo")))} + ${fmt(fromSI("vflow", "bpd", v.qw ?? 0))}) bbl/d × ${fmt(c.n("tr") / 60)} min ÷ 1,440 min/d = ${fmt(V / BBL_M3)} bbl`);
    c.result("v", "Liquid retention volume", "volume", V, ["bbl", "m3"], true);
    if (v.d) {
      const A = (Math.PI * v.d * v.d) / 4;
      const h = V / A;
      c.step("Liquid height", `A = ${fmt(A / FT_M ** 2)} ft²;  h = ${fmt(V / FT_M ** 3)} ft³ ÷ ${fmt(A / FT_M ** 2)} = ${fmt(h / FT_M)} ft`);
      c.result("h", "Liquid height above the outlet (vertical vessel)", "length", h, ["ft", "m"], true);
    }
    return c.done();
  },
};

const tankIn: InputDef[] = [
  { id: "shape", label: "Tank shape", family: "count", unit: "n", choices: [{ value: 1, label: "Vertical cylinder" }, { value: 2, label: "Horizontal cylinder (flat ends)" }] },
  { id: "d", label: "Tank inside diameter", sym: "D", family: "length", unit: "ft", min: 0.1 },
  { id: "l", label: "Shell length (horizontal) or shell height (vertical)", sym: "L", family: "length", unit: "ft", min: 0.1 },
  { id: "h1", label: "Liquid gauge (opening)", sym: "h₁", family: "length", unit: "ft", min: 0 },
  { id: "h2", label: "Liquid gauge (closing, optional)", sym: "h₂", family: "length", unit: "ft", optional: true, min: 0 },
];

export function tankVolume(shape: number, D: number, L: number, h: number) {
  if (shape === 2) {
    const R = D / 2;
    const hh = Math.min(Math.max(h, 0), D);
    return L * (R * R * Math.acos((R - hh) / R) - (R - hh) * Math.sqrt(Math.max(2 * R * hh - hh * hh, 0)));
  }
  return ((Math.PI * D * D) / 4) * Math.min(Math.max(h, 0), L);
}

const tank: SectionDef = {
  id: "tank-gauge",
  title: "Tank gauge to barrels",
  question: "How many barrels are in this tank at this gauge, and how much was produced or sold between two gauges?",
  formulas: [
    "Vertical: V = (π D² ÷ 4) h",
    "Horizontal: V = L [R² cos⁻¹((R − h) ÷ R) − (R − h) √(2Rh − h²)]",
    "Run volume = V(h₁) − V(h₂)",
  ],
  inputs: tankIn,
  example: { title: "A 400 bbl vertical tank, 12 ft diameter and 20 ft high, gauged at 15 ft 6 in and then at 4 ft.", values: { shape: [1, "n"], d: [12, "ft"], l: [20, "ft"], h1: [15.5, "ft"], h2: [4, "ft"] } },
  refs: [OG.blmOil],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("d", "l", "h1");
    if (miss.length) return c.missing(miss, labelsOf(tankIn));
    const shape = v.shape ?? 1, D = c.n("d"), L = c.n("l");
    const top = shape === 2 ? D : L;
    if (c.n("h1") > top + 1e-9 || (v.h2 ?? 0) > top + 1e-9) return c.done(`A gauge cannot be higher than the tank (${fmt(top / FT_M)} ft).`);
    const full = tankVolume(shape, D, L, top);
    const V1 = tankVolume(shape, D, L, c.n("h1"));
    c.step("Full capacity", `${shape === 2 ? `π R² L` : `π D² ÷ 4 × H`} = ${fmt(full / FT_M ** 3)} ft³ = ${fmt(full / BBL_M3)} bbl`);
    c.step("Volume at the opening gauge", `V(${fmt(c.n("h1") / FT_M)} ft) = ${fmt(V1 / FT_M ** 3)} ft³ = ${fmt(V1 / BBL_M3)} bbl`);
    c.result("v1", "Volume at the opening gauge", "volume", V1, ["bbl", "m3"], true);
    c.result("full", "Tank capacity (shell)", "volume", full, ["bbl", "m3"]);
    c.result("pct", "Percent full", "pct", (V1 / full) * 100, ["pct"]);
    if (shape === 1) c.result("perin", "Barrels per inch of gauge", "ratio", ((Math.PI * D * D) / 4) * 0.0254 / BBL_M3, ["x"]);
    if (v.h2 !== null && v.h2 !== undefined) {
      const V2 = tankVolume(shape, D, L, v.h2);
      c.step("Volume at the closing gauge and the run", `V(${fmt(v.h2 / FT_M)} ft) = ${fmt(V2 / BBL_M3)} bbl;  run = ${fmt(V1 / BBL_M3)} − ${fmt(V2 / BBL_M3)} = ${fmt((V1 - V2) / BBL_M3)} bbl`);
      c.result("v2", "Volume at the closing gauge", "volume", V2, ["bbl", "m3"]);
      c.result("run", "Volume between the gauges (gross)", "volume", V1 - V2, ["bbl", "m3"], true);
    }
    c.warn("Gross observed volume from shell geometry. Custody transfer uses the tank's calibration (strapping) table and corrects to 60 °F and for sediment and water.");
    return c.done();
  },
};

const rateIn: InputDef[] = [
  { id: "qo", label: "Oil rate", sym: "q_o", family: "vflow", unit: "bpd", min: 0 },
  { id: "qw", label: "Water rate (blank = none)", sym: "q_w", family: "vflow", unit: "bpd", optional: true, min: 0 },
  { id: "qg", label: "Gas rate (optional)", sym: "q_g", family: "gasflow", unit: "mscfd", optional: true, min: 0 },
];

const rates: SectionDef = {
  id: "rates",
  title: "Production ratios: GOR, GLR, water cut, WOR",
  question: "From a well test, what are the gas-oil ratio, gas-liquid ratio, water cut, and water-oil ratio?",
  formulas: ["GOR = q_g ÷ q_o,   GLR = q_g ÷ (q_o + q_w)", "Water cut = q_w ÷ (q_o + q_w),   WOR = q_w ÷ q_o"],
  inputs: rateIn,
  example: { title: "A test of 250 bbl/d oil, 750 bbl/d water and 300 Mscf/d gas.", values: { qo: [250, "bpd"], qw: [750, "bpd"], qg: [300, "mscfd"] } },
  refs: [OG.oilWell],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("qo");
    if (miss.length) return c.missing(miss, labelsOf(rateIn));
    const qo = fromSI("vflow", "bpd", c.n("qo")), qw = fromSI("vflow", "bpd", v.qw ?? 0);
    const ql = qo + qw;
    if (!(ql > 0)) return c.done("Enter an oil or water rate above zero.");
    const wc = (qw / ql) * 100;
    c.step("Total liquid and water cut", `${fmt(qo)} + ${fmt(qw)} = ${fmt(ql)} bbl/d;  water cut = ${fmt(qw)} ÷ ${fmt(ql)} = ${fmt(wc)} %`);
    c.result("ql", "Total liquid", "vflow", toSI("vflow", "bpd", ql), ["bpd", "m3d"], true);
    c.result("wc", "Water cut", "pct", wc, ["pct"], true);
    if (qo > 0) c.result("wor", "Water-oil ratio, bbl/bbl", "ratio", qw / qo, ["x"]);
    if (v.qg !== null && v.qg !== undefined) {
      const scf = fromSI("gasflow", "scfd", v.qg);
      if (qo > 0) {
        c.step("Gas-oil ratio", `${fmt(scf)} scf/d ÷ ${fmt(qo)} bbl/d = ${fmt(scf / qo)} scf/bbl`);
        c.result("gor", "Gas-oil ratio", "gor", toSI("gor", "scfbbl", scf / qo), ["scfbbl", "sm3m3"], true);
      }
      c.step("Gas-liquid ratio", `${fmt(scf)} ÷ ${fmt(ql)} = ${fmt(scf / ql)} scf/bbl`);
      c.result("glr", "Gas-liquid ratio", "gor", toSI("gor", "scfbbl", scf / ql), ["scfbbl", "sm3m3"], true);
    }
    return c.done();
  },
};

export const separators: UtilityDef = {
  slug: "separators-and-tanks",
  name: "Separator Sizing, Tank Gauge & Production Ratios",
  short: "Separators and tanks",
  problem: "Is my separator big enough, how many barrels are in the tank, and what are the GOR and water cut?",
  description: "Separator and tank battery calculations: Souders-Brown gas capacity and vessel diameter, liquid retention volume and level, tank gauge to barrels for vertical and horizontal tanks with run volume, and production ratios (GOR, GLR, water cut, WOR), with every step shown.",
  keywords: "separator sizing souders brown k factor gas capacity retention time liquid level tank gauge barrels tank strapping horizontal tank volume run ticket gor glr water cut wor production test",
  sheet: "Separators and Tanks",
  sections: [gasCap, retention, tank, rates],
  notes: ["Gas density uses the Dranchuk & Abou-Kassem Z-factor with Sutton pseudo-criticals.", "Tank volumes are gross shell geometry; corrections to 60 °F, for S&W, and for deadwood come from your measurement procedure."],
};

void M_AIR_G;
