import { Calc, K, labelsOf, q } from "../helpers";
import { liquid } from "../if97";
import type { InputDef, Outcome, SectionDef, Values } from "../types";
import { fmt } from "../units";

export interface BalanceCfg {
  /** Input ids for the colder and hotter stream temperatures. */
  lo: { id: string; label: string; sym: string };
  hi: { id: string; label: string; sym: string };
  /** Water: properties from IF97 at the mean temperature unless overridden. Otherwise cp and ρ are required. */
  water: boolean;
  qLabel: string;
  /** Extra units to show for Q. */
  qShow: string[];
  vShow: string[];
}

export function balanceInputs(cfg: BalanceCfg): InputDef[] {
  return [
    { id: "Q", label: cfg.qLabel, sym: "Q", family: "power", unit: "kw", solvable: true, min: 0 },
    { id: "V", label: "Volumetric flow", sym: "V̇", family: "vflow", unit: "m3h", solvable: true, min: 0 },
    { id: cfg.lo.id, label: cfg.lo.label, sym: cfg.lo.sym, family: "temp", unit: "c", solvable: true },
    { id: cfg.hi.id, label: cfg.hi.label, sym: cfg.hi.sym, family: "temp", unit: "c", solvable: true },
    {
      id: "cp", label: cfg.water ? "Specific heat (blank = water, IAPWS-IF97)" : "Specific heat (fluid data sheet)", sym: "cp", family: "cp", unit: "kjkgk", optional: cfg.water, min: 0,
    },
    {
      id: "rho", label: cfg.water ? "Density (blank = water, IAPWS-IF97)" : "Density at mean temperature (fluid data sheet)", sym: "ρ", family: "rho", unit: "kgm3", optional: cfg.water, min: 0,
    },
  ];
}

/**
 * Q = ṁ × cp × ΔT with ṁ = ρ × V̇ and ΔT = T_hi − T_lo. Solves whichever one
 * of Q, V̇, T_lo, T_hi is blank.
 */
export interface BalanceOk { c: Calc; out: Outcome; Q: number; V: number; m: number; dT: number; cp: number; rho: number; lo: number; hi: number }
type BalanceResult = { c: Calc; out: Outcome } | BalanceOk;

export function balance(v: Values, cfg: BalanceCfg, inputs: InputDef[], c = new Calc(v)): BalanceResult {
  const L = labelsOf(inputs);
  const unknowns = c.blank("Q", "V", cfg.lo.id, cfg.hi.id);
  if (unknowns.length > 1) return { c, out: c.done(`Leave only one of these blank and fill in the rest: ${unknowns.map((i) => L[i]).join(", ")}.`) };
  if (!cfg.water && c.blank("cp", "rho").length) return { c, out: c.missing(c.blank("cp", "rho"), L) };
  const solve = unknowns[0];
  let lo = v[cfg.lo.id] ?? null;
  let hi = v[cfg.hi.id] ?? null;
  let props = { cp: v.cp ?? 0, rho: v.rho ?? 0 };
  const pick = (tMean: number) => {
    let cp = v.cp ?? null;
    let rho = v.rho ?? null;
    if (cfg.water && (cp === null || rho === null)) {
      const w = liquid(K(tMean));
      cp = cp ?? w.cp;
      rho = rho ?? w.rho;
    }
    return { cp: cp as number, rho: rho as number };
  };
  try {
    if (solve === cfg.lo.id || solve === cfg.hi.id) {
      // ΔT from Q, iterate the mean temperature for water properties.
      const known = (solve === cfg.lo.id ? hi : lo) as number;
      let dT = 0;
      props = pick(known);
      for (let i = 0; i < 4; i++) {
        dT = c.n("Q") / (props.rho * c.n("V") * props.cp);
        props = pick(solve === cfg.lo.id ? known - dT / 2 : known + dT / 2);
      }
      dT = c.n("Q") / (props.rho * c.n("V") * props.cp);
      if (solve === cfg.lo.id) lo = known - dT;
      else hi = known + dT;
    } else props = pick(((lo as number) + (hi as number)) / 2);
  } catch (e) {
    if (solve === cfg.lo.id || solve === cfg.hi.id)
      return { c, out: c.done(`The solved ${L[solve].toLowerCase()} would be below freezing or above boiling, outside the range for plain water. Check the load and flow, or for a glycol mix enter its specific heat and density.`) };
    return { c, out: c.done((e as Error).message) };
  }
  const tMean = ((lo as number) + (hi as number)) / 2;
  const waterProps = cfg.water && (v.cp === null || v.cp === undefined || v.rho === null || v.rho === undefined);
  if (waterProps && (solve === cfg.lo.id || solve === cfg.hi.id)) {
    const T = (solve === cfg.lo.id ? lo : hi) as number;
    if (T < 0) return { c, out: c.done(`The solved ${L[solve].toLowerCase()} is ${fmt(T)} °C, below freezing. Check the load and flow, or for a glycol mix enter its specific heat and density.`) };
    if (T > 100) return { c, out: c.done(`The solved ${L[solve].toLowerCase()} is ${fmt(T)} °C, above the boiling point of water at atmospheric pressure. Check the load and flow.`) };
  }
  if (waterProps && ((lo as number) < 0 || (hi as number) > 100)) c.warn("A water temperature is below 0 °C or above 100 °C. Plain water would freeze or (unless the loop is pressurized) boil; for glycol, enter its specific heat and density.");
  if (waterProps)
    c.step("Water properties at the mean temperature", `T_mean = ${fmt(tMean)} °C:  cp = ${fmt(props.cp)} kJ/kg·K,  ρ = ${fmt(props.rho)} kg/m³ (IAPWS-IF97 region 1)`);
  else c.step("Fluid properties (entered)", `cp = ${fmt(props.cp)} kJ/kg·K,  ρ = ${fmt(props.rho)} kg/m³`);
  const { cp, rho } = props;
  let Q: number, V: number;
  const dT = (hi as number) - (lo as number);
  if (solve !== cfg.lo.id && solve !== cfg.hi.id && !(dT > 0)) return { c, out: c.done(`${L[cfg.hi.id]} must be higher than ${L[cfg.lo.id]}.`) };
  if (solve === "Q") {
    V = c.n("V");
    Q = rho * V * cp * dT;
    c.solved = "Q";
    c.step("Heat load", `Q = ${fmt(rho)} × ${fmt(V)} m³/s × ${fmt(cp)} × ${fmt(dT)} = ${q(Q, "power", "kw")}`, "Q = ρ × V̇ × cp × ΔT");
  } else if (solve === "V") {
    Q = c.n("Q");
    const m = Q / (cp * dT);
    V = m / rho;
    c.solved = "V";
    c.step("Mass flow", `ṁ = ${fmt(Q)} kW ÷ (${fmt(cp)} × ${fmt(dT)}) = ${fmt(m)} kg/s`, "ṁ = Q ÷ (cp × ΔT)");
    c.step("Volumetric flow", `V̇ = ${fmt(m)} ÷ ${fmt(rho)} = ${fmt(V)} m³/s = ${q(V, "vflow", "m3h")} = ${q(V, "vflow", "gpm")}`, "V̇ = ṁ ÷ ρ");
  } else if (solve) {
    Q = c.n("Q");
    V = c.n("V");
    c.solved = solve;
    const T = solve === cfg.lo.id ? lo : hi;
    c.step(`Solve ${L[solve].toLowerCase()}`, `ΔT = ${fmt(Q)} ÷ (${fmt(rho)} × ${fmt(V)} × ${fmt(cp)}) = ${fmt(dT)} °C, so ${cfg[solve === cfg.lo.id ? "lo" : "hi"].sym} = ${fmt(T as number)} °C`, "ΔT = Q ÷ (ρ × V̇ × cp)");
  } else {
    Q = c.n("Q");
    V = c.n("V");
    const Qc = rho * V * cp * dT;
    c.step("Check: all four entered", `ρ × V̇ × cp × ΔT = ${q(Qc, "power", "kw")} vs. entered Q = ${q(Q, "power", "kw")}`);
    if (Math.abs(Qc - Q) > 0.01 * Math.max(Q, Qc)) c.warn(`The entered values disagree by ${fmt((100 * (Qc - Q)) / Q, 3)} %. Leave one blank to have it solved.`);
  }
  const m = rho * V;
  if (solve === cfg.lo.id || solve === cfg.hi.id) c.result(solve, L[solve], "temp", (solve === cfg.lo.id ? lo : hi) as number, ["c", "f"], true);
  c.result("Q", cfg.qLabel, "power", Q, ["kw", ...cfg.qShow], solve === "Q");
  c.result("m", "Mass flow", "mflow", m, ["kgs", "kgh", "th", "lbh"], solve === "V");
  c.result("V", "Volumetric flow", "vflow", V, cfg.vShow, solve === "V");
  c.result("dT", "Temperature difference ΔT", "dtemp", dT, ["k", "f"]);
  return { c, out: c.done(), Q, V, m, dT, cp, rho, lo: lo as number, hi: hi as number };
}

/** A whole section built on `balance`. */
export function balanceSection(base: Omit<SectionDef, "inputs" | "compute" | "solveNote">, cfg: BalanceCfg, extra?: (r: BalanceOk, c: Calc) => void): SectionDef {
  const inputs = balanceInputs(cfg);
  return {
    ...base,
    inputs,
    solveNote: `Leave exactly one of heat load, flow, ${cfg.lo.label.toLowerCase()}, or ${cfg.hi.label.toLowerCase()} blank and it is solved.`,
    compute(v) {
      const r = balance(v, cfg, inputs);
      if (r.out.error || !("Q" in r)) return r.out;
      extra?.(r, r.c);
      return r.c.done();
    },
  };
}
