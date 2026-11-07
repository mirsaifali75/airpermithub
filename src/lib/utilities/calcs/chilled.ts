import { Calc, labelsOf, q } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { fmt } from "../units";
import { balanceSection } from "./balance";
import { REF } from "./refs";

const TON = (12000 * 1.05505585262) / 3600; // kW per ton of refrigeration

const load = balanceSection(
  {
    id: "load",
    title: "Chilled water flow and cooling load",
    question: "How many tons is this load, and what chilled water flow does it need at my ΔT?",
    formulas: ["Q = ṁ × cp × (T_return − T_supply)", "1 ton of refrigeration = 12,000 Btu/h = 3.517 kW", "US shortcut: tons ≈ gpm × ΔT °F ÷ 24"],
    example: { title: "A 600 kW process cooling load on 7 °C supply / 12 °C return chilled water.", values: { Q: [600, "kw"], ts: [7, "c"], tr: [12, "c"] } },
    refs: [REF.if97, REF.nist811],
  },
  { lo: { id: "ts", label: "Chilled water supply", sym: "T_s" }, hi: { id: "tr", label: "Chilled water return", sym: "T_r" }, water: true, qLabel: "Cooling load", qShow: ["tr", "btuh", "mmbtuh"], vShow: ["m3h", "gpm", "ls"] },
  (r, c) => {
    const gpm = r.V / (3.785411784e-3 / 60);
    const dTF = r.dT * 1.8;
    c.step("Cooling load in tons", `${fmt(r.Q)} kW ÷ ${fmt(TON)} kW/ton = ${fmt(r.Q / TON)} tons`, "tons = Q ÷ 3.517 kW");
    c.step("US cross-check", `${fmt(gpm)} gpm × ${fmt(dTF)} °F ÷ 24 = ${fmt((gpm * dTF) / 24)} tons`);
    if (r.dT < 3) c.warn("A chilled water ΔT under 3 °C (5 °F) needs a lot of flow and pumping; check the design ΔT.");
  },
);

const chInputs: SectionDef["inputs"] = [
  { id: "Q", label: "Cooling load", sym: "Q", family: "power", unit: "tr", solvable: true, min: 0 },
  { id: "W", label: "Chiller input power", sym: "W", family: "power", unit: "kw", solvable: true, min: 0 },
  { id: "kwt", label: "Efficiency (kW per ton)", sym: "kW/ton", family: "ratio", unit: "x", solvable: true, min: 0, help: "From the chiller rating or your metered data. Part-load efficiency differs from full load." },
  { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "lf", label: "Average load, % of the load above", family: "pct", unit: "pct", optional: true, min: 0, max: 100 },
  { id: "price", label: "Electricity price", family: "price", unit: "kwh", optional: true, min: 0 },
];

const chiller: SectionDef = {
  id: "chiller",
  title: "Chiller power, COP, and annual energy",
  question: "What does this chiller draw, how efficient is it, and what does it cost to run?",
  formulas: ["kW/ton = W ÷ (Q ÷ 3.517)", "COP = Q ÷ W = 3.517 ÷ (kW/ton)", "EER = Q (Btu/h) ÷ W (W) = 12 ÷ (kW/ton)", "Heat to the condenser ≈ Q + W"],
  solveNote: "Enter two of load, input power, and kW/ton; the third is solved.",
  inputs: chInputs,
  example: { title: "A 500-ton water-cooled chiller at 0.60 kW/ton, 6,000 h/yr at 70 % average load, $0.10/kWh.", values: { Q: [500, "tr"], kwt: [0.6, "x"], hours: [6000, "h"], lf: [70, "pct"], price: [0.1, "kwh"] } },
  refs: [REF.femchiller, REF.nist811],
  compute(v) {
    const c = new Calc(v);
    const L = labelsOf(chInputs);
    const unk = c.blank("Q", "W", "kwt");
    if (unk.length !== 1) return c.done(unk.length > 1 ? `Enter two of: ${["Q", "W", "kwt"].map((i) => L[i]).join(", ")}.` : "Leave one of load, input power, or kW/ton blank to solve it.");
    c.solved = unk[0];
    let Q = v.Q ?? 0, W = v.W ?? 0, kwt = v.kwt ?? 0;
    if (unk[0] === "W") {
      W = (Q / TON) * kwt;
      c.step("Input power", `W = ${fmt(Q / TON)} tons × ${fmt(kwt)} kW/ton = ${fmt(W)} kW`, "W = tons × kW/ton");
      c.result("W", "Chiller input power", "power", W, ["kw", "hp"], true);
    } else if (unk[0] === "kwt") {
      kwt = W / (Q / TON);
      c.step("kW per ton", `kW/ton = ${fmt(W)} ÷ ${fmt(Q / TON)} = ${fmt(kwt)}`, "kW/ton = W ÷ tons");
      c.result("kwt", "Efficiency (kW per ton)", "ratio", kwt, ["x"], true);
    } else {
      Q = (W / kwt) * TON;
      c.step("Cooling load", `tons = ${fmt(W)} ÷ ${fmt(kwt)} = ${fmt(W / kwt)} tons = ${fmt(Q)} kW`, "tons = W ÷ kW/ton");
      c.result("Q", "Cooling load", "power", Q, ["tr", "kw"], true);
    }
    if (!(Q > 0 && W > 0)) return c.done("Load and power must be above zero.");
    const cop = Q / W;
    c.step("COP and EER", `COP = ${fmt(Q)} ÷ ${fmt(W)} = ${fmt(cop)};  EER = 12 ÷ ${fmt(kwt)} = ${fmt(12 / kwt)} Btu/W·h`, "COP = Q ÷ W");
    c.result("cop", "COP", "ratio", cop, ["x"], true);
    c.result("eer", "EER (Btu/W·h)", "ratio", 12 / kwt, ["x"]);
    c.result("rej", "Heat rejected to condenser water", "power", Q + W, ["kw", "tr", "mmbtuh"]);
    c.step("Heat rejected", `Q_cond ≈ ${fmt(Q)} + ${fmt(W)} = ${q(Q + W, "power", "kw")} (energy balance; motor heat goes to the refrigerant in a hermetic machine)`);
    if (v.hours) {
      const lf = (v.lf ?? 100) / 100;
      const kwh = W * lf * (v.hours / 3600);
      c.step("Annual energy", `${fmt(W)} kW × ${fmt(lf)} × ${fmt(v.hours / 3600)} h = ${fmt(kwh)} kWh (assumes the kW/ton holds at the average load)`);
      c.result("kwh", "Annual electricity", "energy", kwh, ["kwh", "mwh"]);
      if (v.price) {
        c.step("Annual cost", `${fmt(kwh)} kWh × $${fmt(v.price)} = $${fmt(kwh * v.price)}`);
        c.result("cost", "Annual electricity cost", "money", kwh * v.price, ["usd"], true);
      }
    }
    return c.done();
  },
};

export const chilledWater: UtilityDef = {
  slug: "chilled-water",
  name: "Chilled Water Calculator",
  short: "Chilled water",
  sheet: "Chilled Water",
  problem: "How many tons is this load, what flow does it need, and what will the chiller cost to run?",
  description: "Chilled water flow from cooling load and ΔT in kW or tons (or solve the load or a temperature), plus chiller kW/ton, COP, EER, condenser heat rejection, and annual energy cost.",
  keywords: "chilled water calculation tons of refrigeration chilled water flow gpm m3/h chiller kw per ton cop eer chiller energy cost condenser heat rejection delta t",
  sections: [load, chiller],
  notes: [
    "A ton of refrigeration is 12,000 Btu/h (3.517 kW).",
    "The condenser heat estimate Q + W feeds straight into the cooling water calculator's heat load.",
  ],
};
