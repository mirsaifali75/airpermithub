import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { G, fmt, fromSI, toSI } from "../units";
import { BBL_M3, FT_M, IN_M, colebrook } from "./core";
import { OG } from "./refs";

/** bbl/d per (in² × in × stroke/min): π/4 × 1,440 min/d × in³ ÷ in³ per bbl. */
export const ROD_K = ((Math.PI / 4) * 1440 * IN_M ** 3) / BBL_M3;

const rodIn: InputDef[] = [
  { id: "dp", label: "Plunger diameter", sym: "D_p", family: "diam", unit: "in", min: 0.005, max: 0.2 },
  { id: "s", label: "Effective plunger stroke", sym: "S_p", family: "diam", unit: "in", min: 0.01, max: 8, help: "Net plunger travel after rod and tubing stretch; the surface stroke length is an upper limit." },
  { id: "n", label: "Pumping speed, strokes per minute", sym: "N", family: "ratio", unit: "x", solvable: true, min: 0.1, max: 30 },
  { id: "ev", label: "Volumetric efficiency", sym: "E_v", family: "pct", unit: "pct", min: 1, max: 100, help: "Rate measured at surface ÷ pump displacement; gas interference and leakage lower it." },
  { id: "q", label: "Target production rate", sym: "q", family: "vflow", unit: "bpd", solvable: true, min: 0 },
];

const rod: SectionDef = {
  id: "rod-pump",
  title: "Sucker rod pump displacement and speed",
  question: "How much will this pump displace at this speed, or what speed is needed for the target rate?",
  formulas: ["PD = 0.1166 × D_p² × S_p × N   (bbl/d; D_p and S_p in inches)", "0.1166 = π/4 × 1,440 min/d ÷ 9,702 in³/bbl", "q = PD × E_v"],
  solveNote: "Leave the pumping speed or the target rate blank.",
  inputs: rodIn,
  example: { title: "A 1.75 in plunger with 100 in effective stroke at 8 strokes/min and 80 % volumetric efficiency.", values: { dp: [1.75, "in"], s: [100, "in"], n: [8, "x"], ev: [80, "pct"] } },
  refs: [OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("dp", "s", "ev");
    if (miss.length) return c.missing(miss, labelsOf(rodIn));
    const b = c.blank("n", "q");
    if (b.length !== 1) return c.done("Leave either the pumping speed or the target rate blank.");
    const D = c.n("dp") / IN_M, S = c.n("s") / IN_M, ev = c.n("ev") / 100;
    const K = ROD_K * D * D * S;
    c.step("Pump constant", `${fmt(ROD_K, 5)} × ${fmt(D)}² × ${fmt(S)} = ${fmt(K, 5)} bbl/d per stroke/min`);
    let N: number, PD: number;
    if (b[0] === "q") {
      N = c.n("n");
      PD = K * N;
      c.solved = "q";
      c.step("Displacement and rate", `PD = ${fmt(K, 5)} × ${fmt(N)} = ${fmt(PD)} bbl/d;  q = ${fmt(PD)} × ${fmt(ev)} = ${fmt(PD * ev)} bbl/d`);
    } else {
      const q = fromSI("vflow", "bpd", c.n("q"));
      PD = q / ev;
      N = PD / K;
      c.solved = "n";
      c.step("Speed for the target", `PD = ${fmt(q)} ÷ ${fmt(ev)} = ${fmt(PD)} bbl/d;  N = ${fmt(PD)} ÷ ${fmt(K, 5)} = ${fmt(N)} strokes/min`);
    }
    c.result("pd", "Pump displacement", "vflow", toSI("vflow", "bpd", PD), ["bpd", "m3d"], true);
    c.result("q", "Expected production", "vflow", toSI("vflow", "bpd", PD * ev), ["bpd", "m3d"], b[0] === "q");
    c.result("n", "Pumping speed, strokes/min", "ratio", N, ["x"], b[0] === "n");
    c.result("k", "Pump constant, bbl/d per stroke/min", "ratio", K, ["x"]);
    if (N > 15) c.warn("Above about 15 strokes/min, check rod loading and fatigue with a rod design program.");
    return c.done();
  },
};

const espIn: InputDef[] = [
  { id: "q", label: "Target total liquid rate", sym: "q", family: "vflow", unit: "bpd", min: 0 },
  { id: "h", label: "Pump setting depth (TVD)", sym: "H", family: "length", unit: "ft", min: 1 },
  { id: "md", label: "Tubing length (MD, blank = TVD)", sym: "L", family: "length", unit: "ft", optional: true, min: 1 },
  { id: "pip", label: "Pump intake pressure at the target rate", sym: "PIP", family: "pabs", unit: "psig", min: 0, help: "From the IPR at the target rate, corrected from the perforations up to the pump." },
  { id: "pwh", label: "Wellhead (tubing) pressure", sym: "p_wh", family: "pabs", unit: "psig", min: 0 },
  { id: "chp", label: "Casing head pressure (optional, for the fluid level)", sym: "CHP", family: "pabs", unit: "psig", optional: true, min: 0 },
  { id: "sg", label: "Produced fluid specific gravity", sym: "γ", family: "rho", unit: "sg", min: 500, max: 1300 },
  { id: "mu", label: "Fluid viscosity", sym: "μ", family: "visc", unit: "cp" },
  { id: "d", label: "Tubing inside diameter", sym: "D", family: "diam", unit: "in", min: 0.01, max: 0.3 },
  { id: "eps", label: "Tubing roughness", sym: "ε", family: "rough", unit: "in", min: 0, max: 0.01 },
  { id: "hs", label: "Head per stage at the target rate (pump curve)", sym: "h_s", family: "head", unit: "ft", optional: true, min: 0.1 },
  { id: "ps", label: "Horsepower per stage at the target rate (pump curve, water)", sym: "P_s", family: "power", unit: "hp", optional: true, min: 0 },
];

const esp: SectionDef = {
  id: "esp",
  title: "ESP sizing: total dynamic head, stages, and horsepower",
  question: "How much head must the pump make at the target rate, how many stages does that take, and what horsepower?",
  formulas: [
    "TDH = H + h_f + (p_wh − PIP) ÷ (ρ g)",
    "h_f = f (L ÷ D) v² ÷ (2g),  f from Colebrook",
    "Stages = TDH ÷ head per stage (rounded up);   BHP = stages × hp/stage × SG",
    "Hydraulic power = ρ g q TDH",
  ],
  inputs: espIn,
  example: { title: "1,500 bbl/d of 1.03 SG fluid lifted from a pump at 6,000 ft with 600 psig intake, 100 psig wellhead, 2.441 in tubing; stage makes 22 ft and 0.30 hp.", values: { q: [1500, "bpd"], h: [6000, "ft"], pip: [600, "psig"], pwh: [100, "psig"], chp: [50, "psig"], sg: [1.03, "sg"], mu: [1, "cp"], d: [2.441, "in"], eps: [0.0006, "in"], hs: [22, "ft"], ps: [0.3, "hp"] } },
  refs: [OG.doePump, OG.colebrook],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("q", "h", "pip", "pwh", "sg", "mu", "d", "eps");
    if (miss.length) return c.missing(miss, labelsOf(espIn));
    const rho = c.n("sg"), H = c.n("h"), L = v.md ?? H;
    if (L < H - 1e-6) return c.done("Tubing length cannot be less than the pump TVD.");
    const D = c.n("d"), A = (Math.PI * D * D) / 4, vel = c.n("q") / A;
    const Re = (rho * vel * D) / c.n("mu");
    const f = colebrook(Re, c.n("eps") / D);
    const hf = (f * (L / D) * vel * vel) / (2 * G);
    c.step("Tubing friction", `v = ${fmt(vel / FT_M)} ft/s;  Re = ${fmt(Re)};  f = ${fmt(f, 5)};  h_f = ${fmt(f, 5)} × (${fmt(L / FT_M)} ÷ ${fmt(D / FT_M, 5)}) × ${fmt(vel)}² ÷ (2 × ${G}) = ${fmt(hf)} m = ${fmt(hf / FT_M)} ft`);
    const hp = ((c.n("pwh") - c.n("pip")) * 1000) / (rho * G);
    c.step("Pressure head", `(p_wh − PIP) ÷ (ρ g) = (${fmt(fromSI("pabs", "psig", c.n("pwh")))} − ${fmt(fromSI("pabs", "psig", c.n("pip")))}) psi ÷ ${fmt(fromSI("grad", "psift", (rho * G) / 1000), 5)} psi/ft = ${fmt(hp / FT_M)} ft`);
    const tdh = H + hf + hp;
    c.step("Total dynamic head", `TDH = ${fmt(H / FT_M)} + ${fmt(hf / FT_M)} + ${fmt(hp / FT_M)} = ${fmt(tdh / FT_M)} ft`);
    if (!(tdh > 0)) return c.done("The intake pressure alone lifts the fluid to surface: the well would flow without a pump at this rate.");
    const hhp = (rho * G * c.n("q") * tdh) / 1000;
    c.result("tdh", "Total dynamic head", "head", tdh, ["ft", "m"], true);
    c.result("hf", "Tubing friction head", "head", hf, ["ft", "m"]);
    c.result("hhp", "Hydraulic power", "power", hhp, ["hp", "kw"], true);
    if (v.chp !== null && v.chp !== undefined) {
      const fop = ((c.n("pip") - v.chp) * 1000) / (rho * G);
      c.result("fop", "Fluid column above the pump (gas-free)", "length", fop, ["ft", "m"]);
      c.result("fl", "Working fluid level from surface", "length", H - fop, ["ft", "m"]);
    }
    if (v.hs) {
      const st = Math.ceil(tdh / v.hs - 1e-9);
      c.step("Stages", `${fmt(tdh / FT_M)} ÷ ${fmt(v.hs / FT_M)} = ${fmt(tdh / v.hs)} → ${st} stages`);
      c.result("stages", "Pump stages", "count", st, ["n"], true);
      if (v.ps) {
        const bhp = st * v.ps * (rho / 999.016);
        c.step("Brake horsepower", `${st} × ${fmt(fromSI("power", "hp", v.ps))} hp × ${fmt(rho / 999.016, 4)} = ${fmt(fromSI("power", "hp", bhp))} hp;  pump efficiency = ${fmt((hhp / bhp) * 100)} %`);
        c.result("bhp", "Pump brake horsepower", "power", bhp, ["hp", "kw"], true);
        c.result("eff", "Implied pump efficiency", "pct", (hhp / bhp) * 100, ["pct"]);
      }
    }
    c.warn("Assumes liquid only above the pump. Free gas at the intake reduces head; use a gas separator or a gas-handling pump and a multiphase tubing correlation for gassy wells.");
    return c.done();
  },
};

export const artificialLift: UtilityDef = {
  slug: "artificial-lift",
  name: "Artificial Lift Calculator (Rod Pump & ESP)",
  short: "Artificial lift",
  problem: "What pump speed or size do I need, and how many ESP stages and horsepower for the target rate?",
  description: "Artificial lift sizing: sucker rod pump displacement, pumping speed for a target rate, and ESP total dynamic head, stages, and horsepower from the pump curve, with every step shown.",
  keywords: "artificial lift rod pump pump displacement 0.1166 strokes per minute volumetric efficiency esp sizing total dynamic head tdh stages horsepower pump intake pressure fluid level",
  sheet: "Artificial Lift",
  sections: [rod, esp],
  notes: ["Rod pump constant 0.1166 computed from exact unit definitions.", "ESP head per stage and horsepower come from your pump curve at the target rate; the calculator does not include vendor curves."],
};
