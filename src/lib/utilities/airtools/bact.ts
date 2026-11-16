import { RT } from "../../tools/rule-text";
import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { fmt, fromSI, toSI } from "../units";
import { AIR } from "./refs";

const tpy = (si: number) => fromSI("erate", "tpy", si);
const usd = (v: number) => `$${fmt(v, 7)}`;

/** EPA Cost Manual eq. 2.8a. With a zero rate the factor is 1/n (straight-line). */
export function crf(iPct: number, n: number) {
  const i = iPct / 100;
  if (i === 0) return 1 / n;
  const f = Math.pow(1 + i, n);
  return (i * f) / (f - 1);
}

const annualIn: InputDef[] = [
  { id: "tci", label: "Total capital investment (TCI)", sym: "TCI", family: "money", unit: "usd", min: 0, help: "Purchased equipment, installation, and indirect installation costs, from vendor quotes or the Cost Manual chapter for the control device." },
  { id: "i", label: "Interest rate (nominal)", sym: "i", family: "pct", unit: "pct", min: 0, max: 50, help: "Your firm-specific nominal rate, or the bank prime rate when that is not available (Cost Manual, section 2.5.2)." },
  { id: "n", label: "Equipment life (or analysis period, if shorter)", sym: "n", family: "years", unit: "yr", min: 1, max: 100 },
  { id: "dac", label: "Direct annual costs", sym: "DAC", family: "costyr", unit: "usdyr", min: 0, help: "Labor, maintenance, reagents, utilities, catalyst replacement, waste disposal." },
  { id: "iac", label: "Indirect annual costs other than capital recovery", sym: "IAC", family: "costyr", unit: "usdyr", optional: true, min: 0, help: "Overhead, administrative charges, property tax, insurance." },
  { id: "rc", label: "Recovery credits", sym: "RC", family: "costyr", unit: "usdyr", optional: true, min: 0, help: "Value of recovered product or energy, net of the cost to recover it." },
];

const annual: SectionDef = {
  id: "annual-cost",
  title: "Total annual cost with capital recovery",
  question: "What does the control cost per year once the capital is spread over its life?",
  formulas: ["CRF = i(1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)   (Cost Manual eq. 2.8a)", "Capital recovery cost CRC = TCI × CRF", "Total annual cost TAC = DAC + IAC + CRC − RC"],
  inputs: annualIn,
  example: { title: "A $2.5 million control system at 8.5 % over 20 years with $180,000 direct and $95,000 indirect annual costs.", values: { tci: [2_500_000, "usd"], i: [8.5, "pct"], n: [20, "yr"], dac: [180_000, "usdyr"], iac: [95_000, "usdyr"], rc: [0, "usdyr"] } },
  refs: [AIR.costManual],
  quotes: [RT.costCrc, RT.costCrf, RT.costLife, RT.costRate, RT.costSameRate, RT.costTac],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("tci", "i", "n", "dac");
    if (miss.length) return c.missing(miss, labelsOf(annualIn));
    const i = c.n("i"), n = c.n("n");
    const f = crf(i, n);
    c.step("Capital recovery factor", i === 0 ? `i = 0, so CRF = 1 ÷ n = 1 ÷ ${fmt(n)} = ${fmt(f, 6)}` : `CRF = ${fmt(i / 100, 6)} × (1 + ${fmt(i / 100, 6)})^${fmt(n)} ÷ ((1 + ${fmt(i / 100, 6)})^${fmt(n)} − 1) = ${fmt(f, 6)}`, "i(1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)");
    const crc = c.n("tci") * f;
    c.step("Capital recovery cost", `${usd(c.n("tci"))} × ${fmt(f, 6)} = ${usd(crc)}/yr`, "TCI × CRF");
    const iac = v.iac ?? 0, rc = v.rc ?? 0;
    const tac = c.n("dac") + iac + crc - rc;
    c.step("Total annual cost", `${usd(c.n("dac"))} + ${usd(iac)} + ${usd(crc)} − ${usd(rc)} = ${usd(tac)}/yr`, "DAC + IAC + CRC − RC");
    c.result("tac", "Total annual cost (TAC)", "costyr", tac, ["usdyr"], true);
    c.result("crc", "Capital recovery cost (CRC)", "costyr", crc, ["usdyr"], true);
    c.result("crf", "Capital recovery factor (CRF)", "ratio", f, ["x"]);
    if (tac <= 0) c.warn("Recovery credits are larger than the costs: the control pays for itself, so a cost per ton is not meaningful.");
    if (n > 30) c.warn("Equipment lives over 30 years are unusual for add-on controls. Use the life the Cost Manual chapter or vendor gives for this device.");
    return c.done();
  },
};

const avgIn: InputDef[] = [
  { id: "tac", label: "Total annual cost of the control option", sym: "TAC", family: "costyr", unit: "usdyr", min: 0, help: "From section 1, or your own cost analysis." },
  { id: "base", label: "Baseline emissions (uncontrolled)", sym: "E_base", family: "erate", unit: "tpy", min: 0, help: "Realistic upper-bound uncontrolled emissions (NSR Workshop Manual, Chapter B)." },
  { id: "ctrl", label: "Controlled emissions with this option", sym: "E_ctrl", family: "erate", unit: "tpy", optional: true, min: 0 },
  { id: "ce", label: "Control efficiency (if controlled emissions are blank)", sym: "CE", family: "pct", unit: "pct", optional: true, min: 0, max: 100 },
];

const average: SectionDef = {
  id: "average",
  title: "Average cost-effectiveness ($/ton removed)",
  question: "How many dollars does this control option cost per ton of pollutant it removes?",
  formulas: ["Tons removed = E_base − E_ctrl   (or E_base × CE ÷ 100)", "Average cost-effectiveness = TAC ÷ tons removed per year"],
  solveNote: "Enter either the controlled emissions or the control efficiency.",
  inputs: avgIn,
  example: { title: "The control from section 1 removes 90 % of 250 tons/yr of NOx.", values: { tac: [539_177, "usdyr"], base: [250, "tpy"], ce: [90, "pct"] } },
  refs: [AIR.nsrManual, AIR.costManual],
  quotes: [RT.bactAvg, RT.bactBaseline],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("tac", "base");
    if (miss.length) return c.missing(miss, labelsOf(avgIn));
    const given = c.blank("ctrl", "ce");
    if (given.length !== 1) return c.done("Enter either the controlled emissions or the control efficiency, not both.");
    const base = c.n("base");
    let removed: number, ctrl: number;
    if (given[0] === "ce") {
      ctrl = c.n("ctrl");
      if (ctrl > base) return c.done("Controlled emissions cannot be higher than the baseline.");
      removed = base - ctrl;
      c.step("Tons removed", `${fmt(tpy(base))} − ${fmt(tpy(ctrl))} = ${fmt(tpy(removed))} tons/yr`, "E_base − E_ctrl");
    } else {
      removed = (base * c.n("ce")) / 100;
      ctrl = base - removed;
      c.step("Tons removed", `${fmt(tpy(base))} × ${fmt(c.n("ce"))} ÷ 100 = ${fmt(tpy(removed))} tons/yr`, "E_base × CE ÷ 100");
    }
    if (!(removed > 0)) return c.done("The option removes nothing, so cost per ton is undefined. Check the baseline and controlled emissions.");
    const ace = c.n("tac") / tpy(removed);
    c.step("Average cost-effectiveness", `${usd(c.n("tac"))}/yr ÷ ${fmt(tpy(removed))} tons/yr = ${usd(ace)}/ton`, "TAC ÷ tons removed");
    c.result("ace", "Average cost-effectiveness", "costton", ace, ["usdton", "usdtonne"], true);
    c.result("removed", "Emissions removed", "erate", removed, ["tpy", "lbh"], true);
    c.result("ctrl", "Controlled emissions", "erate", ctrl, ["tpy", "lbh"]);
    c.result("pct", "Control efficiency", "pct", (removed / base) * 100, ["pct"]);
    c.warn("Whether a cost per ton is reasonable is decided case by case by the permitting authority; this tool does not apply a threshold.");
    return c.done();
  },
};

export const OPTIONS = 4;
const optIn: InputDef[] = [{ id: "base", label: "Baseline emissions (uncontrolled)", sym: "E_base", family: "erate", unit: "tpy", min: 0 }];
for (let k = 1; k <= OPTIONS; k++) {
  optIn.push({ id: `tac${k}`, label: `Option ${k}: total annual cost`, sym: `TAC${k}`, family: "costyr", unit: "usdyr", optional: true, min: 0 });
  optIn.push({ id: `e${k}`, label: `Option ${k}: controlled emissions`, sym: `E${k}`, family: "erate", unit: "tpy", optional: true, min: 0 });
}

export interface RankedOption {
  k: number;
  tac: number;
  /** tons/yr removed */
  removed: number;
  ace: number;
  dominatedBy?: number;
  /** $/ton against the next less stringent dominant option. */
  ice?: number;
  prev?: number;
}

/**
 * Average and incremental cost-effectiveness for up to four options.
 * An option is dominated when another removes at least as much for no more
 * cost (with one of the two strictly better, or an exact tie listed earlier).
 * Incremental cost-effectiveness is taken between contiguous dominant options,
 * ranked by tons removed (NSR Workshop Manual, Chapter B).
 */
export function rankOptions(opts: { k: number; tac: number; removed: number }[]): RankedOption[] {
  const out: RankedOption[] = opts.map((o) => ({ ...o, ace: o.tac / o.removed }));
  for (const o of out) {
    const by = out.find((j) => j.k !== o.k && j.removed >= o.removed && j.tac <= o.tac && (j.removed > o.removed || j.tac < o.tac || j.k < o.k));
    if (by) o.dominatedBy = by.k;
  }
  const dom = out.filter((o) => o.dominatedBy === undefined).sort((a, b) => a.removed - b.removed);
  for (let j = 1; j < dom.length; j++) {
    dom[j].ice = (dom[j].tac - dom[j - 1].tac) / (dom[j].removed - dom[j - 1].removed);
    dom[j].prev = dom[j - 1].k;
  }
  return out;
}

const incremental: SectionDef = {
  id: "incremental",
  title: "Compare options: dominant set and incremental cost-effectiveness",
  question: "Ranking up to four control options, which ones are on the least-cost envelope, and what does each extra ton cost going from one to the next?",
  formulas: [
    "Average cost-effectiveness of option k = TAC_k ÷ (E_base − E_k)",
    "Incremental cost-effectiveness = (TAC_k − TAC_prev) ÷ (E_prev − E_k)",
    "prev = the next less stringent dominant option",
  ],
  solveNote: "Fill in two to four options; an option needs both its annual cost and its controlled emissions.",
  inputs: optIn,
  example: {
    title: "250 tons/yr NOx baseline: low-NOx burners (125 tons/yr, $120,000/yr), SNCR (150 tons/yr, $210,000/yr), SCR (25 tons/yr, $539,177/yr), and burners plus SCR (12.5 tons/yr, $640,000/yr).",
    values: { base: [250, "tpy"], tac1: [120_000, "usdyr"], e1: [125, "tpy"], tac2: [210_000, "usdyr"], e2: [150, "tpy"], tac3: [539_177, "usdyr"], e3: [25, "tpy"], tac4: [640_000, "usdyr"], e4: [12.5, "tpy"] },
  },
  refs: [AIR.nsrManual],
  quotes: [RT.bactIncr, RT.bactDominant, RT.bactAvg],
  compute(v) {
    const c = new Calc(v);
    if (c.blank("base").length) return c.missing(["base"], labelsOf(optIn));
    const base = tpy(c.n("base"));
    const opts: { k: number; tac: number; removed: number }[] = [];
    for (let k = 1; k <= OPTIONS; k++) {
      const t = v[`tac${k}`], e = v[`e${k}`];
      if ((t === null || t === undefined) !== (e === null || e === undefined)) return c.done(`Option ${k} needs both its total annual cost and its controlled emissions.`);
      if (t === null || t === undefined || e === null || e === undefined) continue;
      if (tpy(e) > base + 1e-9) return c.done(`Option ${k}: controlled emissions cannot be higher than the baseline.`);
      if (!(base - tpy(e) > 0)) return c.done(`Option ${k} removes nothing, so its cost per ton is undefined.`);
      opts.push({ k, tac: t, removed: base - tpy(e) });
    }
    if (opts.length < 2) return c.done("Enter at least two options, each with its total annual cost and controlled emissions.");
    const ranked = rankOptions(opts);
    for (const o of ranked) {
      c.step(`Option ${o.k}: average cost-effectiveness`, `${usd(o.tac)} ÷ (${fmt(base)} − ${fmt(base - o.removed)}) = ${usd(o.tac)} ÷ ${fmt(o.removed)} tons/yr = ${usd(o.ace)}/ton`);
      c.result(`ace${o.k}`, `Option ${o.k}: average cost-effectiveness`, "costton", o.ace, ["usdton", "usdtonne"], true);
      c.result(`red${o.k}`, `Option ${o.k}: tons removed`, "erate", toSI("erate", "tpy", o.removed), ["tpy"]);
    }
    for (const o of [...ranked].sort((a, b) => a.removed - b.removed)) {
      if (o.dominatedBy !== undefined) {
        const by = ranked.find((x) => x.k === o.dominatedBy)!;
        c.step(`Option ${o.k} is dominated`, `Option ${by.k} removes ${fmt(by.removed)} tons/yr (≥ ${fmt(o.removed)}) for ${usd(by.tac)}/yr (≤ ${usd(o.tac)}), so option ${o.k} is left out of the incremental comparison.`);
      } else if (o.ice !== undefined) {
        const p = ranked.find((x) => x.k === o.prev)!;
        c.step(`Option ${o.k} vs option ${p.k}: incremental cost-effectiveness`, `(${usd(o.tac)} − ${usd(p.tac)}) ÷ (${fmt(o.removed)} − ${fmt(p.removed)}) = ${usd(o.ice)}/ton`, "ΔTAC ÷ Δtons removed");
        c.result(`ice${o.k}`, `Option ${o.k}: incremental cost-effectiveness vs option ${p.k}`, "costton", o.ice, ["usdton", "usdtonne"], true);
      } else {
        c.step(`Option ${o.k}: least stringent dominant option`, `There is no less stringent dominant option to compare it with; its cost per ton is the average cost-effectiveness above.`);
      }
    }
    const dominated = ranked.filter((o) => o.dominatedBy !== undefined).map((o) => o.k);
    c.result("ndom", "Dominant options (least-cost envelope)", "count", ranked.length - dominated.length, ["n"]);
    if (dominated.length) c.warn(`Dominated and left out of the incremental comparison: option ${dominated.join(", option ")}.`);
    c.warn("Dominance here means another option removes at least as much for no more cost. Check the envelope on a cost versus tons removed plot, as the NSR Workshop Manual (Figure B-1) shows.");
    return c.done();
  },
};

export const bactCost: UtilityDef = {
  slug: "bact-cost-effectiveness",
  name: "BACT Cost-Effectiveness ($/ton) Calculator",
  short: "BACT cost-effectiveness",
  problem: "Is this control option cost-effective, and what does each extra ton of reduction cost?",
  description: "BACT and RACT economic analysis with every step shown: capital recovery factor and total annual cost by the EPA Air Pollution Control Cost Manual, average cost-effectiveness in dollars per ton removed, and incremental cost-effectiveness between dominant control options by the EPA NSR Workshop Manual.",
  keywords: "bact cost effectiveness dollars per ton $/ton incremental cost effectiveness capital recovery factor crf total annual cost tac epa control cost manual nsr workshop manual top-down bact ract economic analysis interest rate equipment life",
  sheet: "BACT Cost",
  sections: [annual, average, incremental],
  notes: [
    "Annualizing follows the EPA Cost Manual (7th ed., Section 1, Chapter 2): capital recovery factor from the interest rate and equipment life you enter.",
    "Cost-effectiveness follows the NSR Workshop Manual, Chapter B (draft, October 1990), which EPA and states still cite for top-down BACT.",
    "Tons are short tons (2,000 lb); tons per year use an 8,760-hour year when converted to lb/h.",
    "No cost-per-ton threshold is applied. What is reasonable is decided by the permitting authority for each case.",
  ],
};
