import { Calc, K, labelsOf, q } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { M_N2, P_ATM_KPA, R_UNIVERSAL, fmt } from "../units";
import { REF } from "./refs";

const NM3_PER_MOL = (R_UNIVERSAL * 273.15) / (P_ATM_KPA * 1000); // m³ per mol at 0 °C, 1 atm

const fillInputs: SectionDef["inputs"] = [
  { id: "V", label: "Vessel or system volume", sym: "V", family: "volume", unit: "m3", min: 0 },
  { id: "p1", label: "Starting pressure", sym: "P₁", family: "pabs", unit: "barg" },
  { id: "p2", label: "Final pressure", sym: "P₂", family: "pabs", unit: "barg" },
  { id: "T", label: "Gas temperature", sym: "T", family: "temp", unit: "c" },
  { id: "rate", label: "Supply rate (to get fill time)", family: "gasflow", unit: "nm3h", optional: true, min: 0 },
];

const fill: SectionDef = {
  id: "pressurize",
  title: "Nitrogen to pressurize a vessel or pressure-test a system",
  question: "How much nitrogen does it take to bring this volume from P₁ to P₂?",
  formulas: ["n = V × (P₂ − P₁) ÷ (R × T)", "Mass = n × M(N₂),   Normal volume = n × 22.414 L/mol"],
  inputs: fillInputs,
  example: { title: "Pressure up a 50 m³ vessel from 0 to 5 bar(g) at 25 °C with a 200 Nm³/h supply.", values: { V: [50, "m3"], p1: [0, "barg"], p2: [5, "barg"], T: [25, "c"], rate: [200, "nm3h"] } },
  refs: [REF.nistR, REF.csbN2],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "p1", "p2", "T");
    if (miss.length) return c.missing(miss, labelsOf(fillInputs));
    const dP = (c.n("p2") - c.n("p1")) * 1000;
    if (!(dP > 0)) return c.done("Final pressure must be above the starting pressure.");
    const n = (c.n("V") * dP) / (R_UNIVERSAL * K(c.n("T")));
    c.step("Moles of nitrogen", `n = ${fmt(c.n("V"))} m³ × ${fmt(dP)} Pa ÷ (${fmt(R_UNIVERSAL)} × ${fmt(K(c.n("T")))} K) = ${fmt(n)} mol`, "n = VΔP ÷ RT");
    c.step("Mass and normal volume", `m = ${fmt(n)} × ${M_N2} = ${fmt(n * M_N2)} kg;  V_N = ${fmt(n)} × ${fmt(NM3_PER_MOL)} = ${fmt(n * NM3_PER_MOL)} Nm³`);
    c.result("nm3", "Nitrogen required (Nm³, 0 °C, 1 atm)", "ratio", n * NM3_PER_MOL, ["x"], true);
    c.result("kg", "Nitrogen mass (kg)", "ratio", n * M_N2, ["x"], true);
    c.result("scf", "Nitrogen required (scf, 60 °F, 14.696 psia)", "ratio", (n * R_UNIVERSAL * 288.70556) / (P_ATM_KPA * 1000) / 0.3048 ** 3, ["x"]);
    if (v.rate) {
      const t = n / v.rate;
      c.step("Fill time", `t = ${fmt(n)} mol ÷ ${fmt(v.rate)} mol/s = ${fmt(t / 60)} min`);
      c.result("t", "Fill time at the supply rate", "time", t, ["min", "h"]);
    }
    return c.done();
  },
};

const swingInputs: SectionDef["inputs"] = [
  { id: "V", label: "Vessel volume", sym: "V", family: "volume", unit: "m3", min: 0 },
  { id: "ph", label: "Pressurize to", sym: "P_H", family: "pabs", unit: "barg" },
  { id: "pl", label: "Vent down to", sym: "P_L", family: "pabs", unit: "barg" },
  { id: "T", label: "Gas temperature", sym: "T", family: "temp", unit: "c" },
  { id: "c0", label: "Starting oxygen", sym: "C₀", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "ct", label: "Target oxygen", sym: "C_target", family: "pct", unit: "pct", min: 0, max: 100, help: "Your target, set below the limiting oxygen concentration for the materials with your safety margin." },
  { id: "cs", label: "Oxygen in the nitrogen supply (blank = 0)", sym: "C_s", family: "pct", unit: "pct", optional: true, min: 0, max: 21 },
];

const swing: SectionDef = {
  id: "pressure-purge",
  title: "Pressure-swing purge (pressurize and vent cycles)",
  question: "How many pressure-and-vent cycles get the oxygen down to my target, and how much nitrogen will they use?",
  formulas: ["C_j = C_s + (C₀ − C_s) × (P_L ÷ P_H)^j", "j = ln((C₀ − C_s) ÷ (C_target − C_s)) ÷ ln(P_H ÷ P_L), rounded up", "N₂ per cycle = V × (P_H − P_L) ÷ (R T)"],
  inputs: swingInputs,
  example: { title: "A 20 m³ vessel cycled between 4 bar(g) and 0.2 bar(g) to take air (20.9 % O₂) down to 2 % O₂.", values: { V: [20, "m3"], ph: [4, "barg"], pl: [0.2, "barg"], T: [25, "c"], c0: [20.9, "pct"], ct: [2, "pct"] } },
  refs: [REF.nistR, REF.csbN2],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "ph", "pl", "T", "c0", "ct");
    if (miss.length) return c.missing(miss, labelsOf(swingInputs));
    const cs = v.cs ?? 0;
    if (c.n("ph") <= c.n("pl")) return c.done("Pressurize-to pressure must be above the vent-down pressure.");
    if (!(c.n("ct") > cs)) return c.done("The target must be above the oxygen content of the nitrogen supply.");
    if (c.n("ct") >= c.n("c0")) return c.done("The target is already met at the start.");
    const ratio = c.n("ph") / c.n("pl");
    const jExact = Math.log((c.n("c0") - cs) / (c.n("ct") - cs)) / Math.log(ratio);
    const j = Math.ceil(jExact - 1e-9);
    c.step("Cycles", `j = ln((${fmt(c.n("c0"))} − ${fmt(cs)}) ÷ (${fmt(c.n("ct"))} − ${fmt(cs)})) ÷ ln(${fmt(c.n("ph"))} ÷ ${fmt(c.n("pl"))}) = ${fmt(jExact)} → ${j} cycles`, "j = ln(ΔC₀/ΔC) ÷ ln(P_H/P_L)");
    const cFinal = cs + (c.n("c0") - cs) * (1 / ratio) ** j;
    c.step("Oxygen after the last cycle", `C_${j} = ${fmt(cs)} + (${fmt(c.n("c0"))} − ${fmt(cs)}) × (1 ÷ ${fmt(ratio)})^${j} = ${fmt(cFinal)} %`);
    const nCycle = (c.n("V") * (c.n("ph") - c.n("pl")) * 1000) / (R_UNIVERSAL * K(c.n("T")));
    c.step("Nitrogen", `Per cycle ${fmt(nCycle)} mol = ${fmt(nCycle * NM3_PER_MOL)} Nm³;  × ${j} = ${fmt(nCycle * j * NM3_PER_MOL)} Nm³`, "V(P_H − P_L) ÷ RT");
    c.result("j", "Cycles needed", "count", j, ["n"], true);
    c.result("cf", "Oxygen after the last cycle", "pct", cFinal, ["pct"], true);
    c.result("nm3", "Total nitrogen (Nm³)", "ratio", nCycle * j * NM3_PER_MOL, ["x"], true);
    c.result("kg", "Total nitrogen (kg)", "ratio", nCycle * j * M_N2, ["x"]);
    c.warn("Nitrogen displaces oxygen without warning signs. Vent to a safe place and follow confined space entry rules (see the CSB bulletin in the sources).");
    return c.done();
  },
};

const sweepInputs: SectionDef["inputs"] = [
  { id: "V", label: "Vessel volume", sym: "V", family: "volume", unit: "m3", min: 0 },
  { id: "c0", label: "Starting oxygen", sym: "C₀", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "ct", label: "Target oxygen", sym: "C_target", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "cs", label: "Oxygen in the nitrogen supply (blank = 0)", sym: "C_s", family: "pct", unit: "pct", optional: true, min: 0, max: 21 },
  { id: "k", label: "Mixing factor K (1 = perfect mixing)", sym: "K", family: "ratio", unit: "x", optional: true, min: 0.05, max: 1, help: "Below 1 when the inlet and outlet are close or flow short-circuits. Use a value you can justify for the vessel." },
  { id: "rate", label: "Nitrogen flow (to get purge time)", family: "gasflow", unit: "nm3h", optional: true, min: 0 },
  { id: "T", label: "Gas temperature in the vessel", family: "temp", unit: "c", optional: true },
];

const sweep: SectionDef = {
  id: "sweep-purge",
  title: "Sweep-through (dilution) purge",
  question: "How many vessel volumes of nitrogen, and how long, to sweep the oxygen out at atmospheric pressure?",
  formulas: ["Volumes needed = (1 ÷ K) × ln((C₀ − C_s) ÷ (C_target − C_s))", "N₂ volume = V × volumes needed (at vessel conditions)"],
  inputs: sweepInputs,
  example: { title: "Sweep a 30 m³ tank from 20.9 % to 5 % O₂ with K = 0.5 and 60 Nm³/h of nitrogen.", values: { V: [30, "m3"], c0: [20.9, "pct"], ct: [5, "pct"], k: [0.5, "x"], rate: [60, "nm3h"], T: [20, "c"] } },
  refs: [REF.csbN2],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "c0", "ct");
    if (miss.length) return c.missing(miss, labelsOf(sweepInputs));
    const cs = v.cs ?? 0;
    const K0 = v.k ?? 1;
    if (!(c.n("ct") > cs) || c.n("ct") >= c.n("c0")) return c.done("The target must be between the supply's oxygen and the starting oxygen.");
    const vols = Math.log((c.n("c0") - cs) / (c.n("ct") - cs)) / K0;
    c.step("Vessel volumes of nitrogen", `(1 ÷ ${fmt(K0)}) × ln((${fmt(c.n("c0"))} − ${fmt(cs)}) ÷ (${fmt(c.n("ct"))} − ${fmt(cs)})) = ${fmt(vols)} volumes`, "(1/K) ln(ΔC₀/ΔC)");
    const Vn = vols * c.n("V");
    const T = K(v.T ?? 0);
    const n = (Vn * P_ATM_KPA * 1000) / (R_UNIVERSAL * T);
    c.step("Nitrogen", `${fmt(vols)} × ${fmt(c.n("V"))} m³ = ${fmt(Vn)} m³ at ${fmt(T - 273.15)} °C, 1 atm = ${fmt(n * NM3_PER_MOL)} Nm³`);
    c.result("vols", "Vessel volumes of nitrogen", "ratio", vols, ["x"], true);
    c.result("nm3", "Nitrogen (Nm³)", "ratio", n * NM3_PER_MOL, ["x"], true);
    if (v.rate) {
      const t = n / v.rate;
      c.step("Purge time", `${fmt(n)} mol ÷ ${fmt(v.rate)} mol/s = ${fmt(t / 60)} min`);
      c.result("t", "Purge time", "time", t, ["min", "h"], true);
    }
    return c.done();
  },
};

const blanketInputs: SectionDef["inputs"] = [
  { id: "pump", label: "Liquid pump-out rate", sym: "V̇_out", family: "vflow", unit: "m3h", min: 0 },
  { id: "pb", label: "Blanket pressure setting", sym: "P_b", family: "pabs", unit: "kpag", help: "Gauge pressure in the vapor space, often a few kPa or inches of water." },
  { id: "T", label: "Vapor space temperature", sym: "T", family: "temp", unit: "c" },
  { id: "thermal", label: "Thermal in-breathing (from your API 2000 or vendor calculation)", family: "gasflow", unit: "nm3h", optional: true, min: 0 },
  { id: "hours", label: "Pump-out hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
];

const blanket: SectionDef = {
  id: "blanketing",
  title: "Tank blanketing nitrogen",
  question: "How much nitrogen does the blanket regulator have to supply while we pump the tank down?",
  formulas: ["ṅ = V̇_out × P_b,abs ÷ (R × T)", "Peak supply = pump-out nitrogen + thermal in-breathing"],
  inputs: blanketInputs,
  example: { title: "Pumping out at 80 m³/h with a 1 kPa(g) blanket at 30 °C, plus a 40 Nm³/h thermal in-breathing allowance from the tank's venting calculation.", values: { pump: [80, "m3h"], pb: [1, "kpag"], T: [30, "c"], thermal: [40, "nm3h"], hours: [500, "h"] } },
  refs: [REF.nistR, REF.csbN2],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pump", "pb", "T");
    if (miss.length) return c.missing(miss, labelsOf(blanketInputs));
    const n = (c.n("pump") * c.n("pb") * 1000) / (R_UNIVERSAL * K(c.n("T")));
    c.step("Nitrogen to replace pumped liquid", `ṅ = ${fmt(c.n("pump"))} m³/s × ${fmt(c.n("pb") * 1000)} Pa ÷ (${fmt(R_UNIVERSAL)} × ${fmt(K(c.n("T")))}) = ${fmt(n)} mol/s = ${q(n, "gasflow", "nm3h")}`, "ṅ = V̇ P ÷ RT");
    const total = n + (v.thermal ?? 0);
    if (v.thermal) c.step("Peak supply", `${q(n, "gasflow", "nm3h")} + ${q(v.thermal, "gasflow", "nm3h")} = ${q(total, "gasflow", "nm3h")}`);
    c.result("pumpout", "Nitrogen for pump-out", "gasflow", n, ["nm3h", "scfm"]);
    c.result("peak", "Peak regulator capacity", "gasflow", total, ["nm3h", "scfm"], true);
    if (v.hours) {
      const annual = n * v.hours * NM3_PER_MOL;
      c.step("Annual pump-out nitrogen", `${q(n, "gasflow", "nm3h")} × ${fmt(v.hours / 3600)} h = ${fmt(annual)} Nm³`);
      c.result("annual", "Annual pump-out nitrogen (Nm³)", "ratio", annual, ["x"]);
    }
    return c.done();
  },
};

export const nitrogen: UtilityDef = {
  slug: "nitrogen",
  name: "Nitrogen Calculator",
  short: "Nitrogen",
  sheet: "Nitrogen",
  problem: "How much nitrogen do we need to purge, blanket, or pressure up this vessel?",
  description: "Nitrogen to pressurize a vessel, pressure-swing purge cycles to an oxygen target, sweep-through purge volumes and time, and tank blanketing supply during pump-out, in Nm³, scf, and kg.",
  keywords: "nitrogen calculation nitrogen purge calculation pressure swing purge sweep purge oxygen concentration tank blanketing nitrogen consumption nm3 scf inerting pressurize vessel",
  sections: [fill, swing, sweep, blanket],
  notes: [
    "Gas amounts use the ideal gas law with R = 8.314462618 J/mol·K (exact in the SI) and M(N₂) = 28.0134 g/mol.",
    "Purge equations assume well-mixed gas; the sweep purge's K factor accounts for poor mixing.",
    "Set oxygen targets from the limiting oxygen concentration for your materials and your own safety margin.",
  ],
};
