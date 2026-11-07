import { Calc, labelsOf, q } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { fmt } from "../units";
import { balanceSection } from "./balance";
import { REF } from "./refs";

const circ = balanceSection(
  {
    id: "circulation",
    title: "Hot oil circulation rate, duty, or return temperature",
    question: "What circulation rate does this hot oil user need, or what return temperature should we see?",
    formulas: ["Q = ρ × V̇ × cp × (T_supply − T_return)", "Use cp and ρ at the mean temperature from the fluid's data sheet"],
    example: { title: "A 1.5 MW user on hot oil supplied at 280 °C and returned at 250 °C, cp 2.6 kJ/kg·K and ρ 800 kg/m³ from the (example) data sheet.", values: { Q: [1.5, "mw"], tr: [250, "c"], ts: [280, "c"], cp: [2.6, "kjkgk"], rho: [800, "kgm3"] } },
    refs: [REF.ahtt],
  },
  { lo: { id: "tr", label: "Return temperature", sym: "T_r" }, hi: { id: "ts", label: "Supply temperature", sym: "T_s" }, water: false, qLabel: "Heat duty", qShow: ["mw", "mmbtuh", "kcalh"], vShow: ["m3h", "gpm", "ls"] },
);

const heaterInputs: SectionDef["inputs"] = [
  { id: "Q", label: "Heater duty (absorbed by the fluid)", sym: "Q", family: "power", unit: "kw", min: 0 },
  { id: "eff", label: "Heater efficiency", sym: "η", family: "pct", unit: "pct", min: 1, max: 100, help: "From the heater's test or the manufacturer, on the same (HHV or LHV) basis as the heating value." },
  { id: "hv", label: "Fuel heating value", family: "hv", unit: "mjkg", optional: true, min: 0 },
  { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "price", label: "Fuel price", family: "fprice", unit: "mmbtu", optional: true, min: 0 },
];

const heater: SectionDef = {
  id: "heater",
  title: "Fired heater fuel",
  question: "How much fuel does the hot oil heater burn for this duty?",
  formulas: ["Fuel input = Q ÷ η", "Fuel flow = Fuel input ÷ heating value"],
  inputs: heaterInputs,
  example: { title: "A 1.5 MW heater duty at 85 % efficiency on fuel with 50 MJ/kg, 8,000 h/yr at $4/MMBtu.", values: { Q: [1500, "kw"], eff: [85, "pct"], hv: [50, "mjkg"], hours: [8000, "h"], price: [4, "mmbtu"] } },
  refs: [REF.doeSteam],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("Q", "eff");
    if (miss.length) return c.missing(miss, labelsOf(heaterInputs));
    const fuel = c.n("Q") / (c.n("eff") / 100);
    c.step("Fuel input", `${fmt(c.n("Q"))} kW ÷ ${fmt(c.n("eff") / 100)} = ${q(fuel, "power", "kw")} = ${q(fuel, "power", "mmbtuh")}`, "Fuel = Q ÷ η");
    c.result("fuel", "Fuel input", "power", fuel, ["kw", "mmbtuh"], true);
    if (v.hv) {
      c.step("Fuel flow", `${fmt(fuel)} kW ÷ ${fmt(v.hv)} kJ/kg = ${fmt((fuel / v.hv) * 3600)} kg/h`);
      c.result("mf", "Fuel flow", "mflow", fuel / v.hv, ["kgh", "lbh"], true);
    }
    if (v.hours) {
      const gj = (fuel * v.hours) / 1e6;
      c.result("annual", "Annual fuel", "energy", (fuel * v.hours) / 3600, ["gj", "mmbtu"]);
      if (v.price) {
        c.step("Annual fuel cost", `${fmt(gj)} GJ × $${fmt(v.price)}/GJ = $${fmt(gj * v.price)}`);
        c.result("cost", "Annual fuel cost", "money", gj * v.price, ["usd"], true);
      }
    }
    return c.done();
  },
};

export const thermalFluid: UtilityDef = {
  slug: "hot-oil",
  name: "Hot Oil / Thermal Fluid Calculator",
  short: "Hot oil",
  sheet: "Hot Oil",
  problem: "What circulation rate does this hot oil user need, and what will the heater burn?",
  description: "Thermal fluid (hot oil) circulation rate, duty, or return temperature from your fluid's data sheet properties, plus fired heater fuel input, fuel flow, and annual cost.",
  keywords: "hot oil calculation thermal fluid heater circulation rate thermic fluid flow m3/h heat duty fired heater fuel consumption",
  sections: [circ, heater],
  notes: ["Thermal fluid properties change a lot with temperature. Use cp and density at the mean temperature from your fluid supplier's data sheet."],
};
