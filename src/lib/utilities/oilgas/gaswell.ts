import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef, Values } from "../types";
import { G, R_UNIVERSAL, fmt, fromSI, toSI } from "../units";
import { NPASS, P_SC_PSIA, gasColumn, gasState, degR, kPa, psia, type GasSpec } from "./core";
import { OG } from "./refs";

const mscfd = (si: number) => fromSI("gasflow", "mscfd", si);
const mscfdSI = (x: number) => toSI("gasflow", "mscfd", x);

const gasIn: InputDef[] = [
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 1.8 },
  { id: "co2", label: "CO₂, mole %", family: "pct", unit: "pct", optional: true, min: 0, max: 50 },
  { id: "h2s", label: "H₂S, mole %", family: "pct", unit: "pct", optional: true, min: 0, max: 50 },
];
const gasOf = (v: Values): GasSpec => ({ gamma: v.gamma as number, yCO2: (v.co2 ?? 0) / 100, yH2S: (v.h2s ?? 0) / 100 });

const wellIn: InputDef[] = [
  { id: "tvd", label: "True vertical depth to mid-perforations", sym: "H", family: "length", unit: "ft", min: 1 },
  { id: "md", label: "Measured depth (blank = vertical well)", sym: "L", family: "length", unit: "ft", optional: true, min: 1 },
  { id: "tt", label: "Wellhead temperature", sym: "T_wh", family: "temp", unit: "f", min: -40, max: 400 },
  { id: "tb", label: "Bottomhole temperature", sym: "T_bh", family: "temp", unit: "f", min: -40, max: 450 },
];
const tubingIn: InputDef[] = [
  { id: "d", label: "Tubing inside diameter", sym: "D", family: "diam", unit: "in", min: 0.0127, max: 0.5 },
  { id: "eps", label: "Pipe roughness", sym: "ε", family: "rough", unit: "in", min: 0, max: 0.005, help: "Absolute roughness of the tubing wall. New steel tubing is commonly taken as 0.0006 in; use your own value for scaled or coated pipe." },
];

function checkWell(c: Calc, v: Values) {
  const H = v.tvd as number, L = v.md ?? H;
  if (L < H - 1e-6) return "Measured depth cannot be less than true vertical depth.";
  return null;
}

function columnSteps(c: Calc, r: ReturnType<typeof gasColumn>, pTop: number, H: number, L: number, flowing: boolean) {
  c.step("Average temperature", `T̄ = ${fmt(r.Tk - 273.15)} °C = ${fmt(r.Tk * 1.8)} °R`);
  c.step(`Average pressure loop (${NPASS} passes)`, `Z̄ at the average of top and bottom pressure = ${fmt(r.z, 5)}${flowing ? `;  μ̄ = ${fmt(r.mu, 4)} cP` : ""}`);
  c.step("Elevation term", `s = 2 M g H ÷ (Z̄ R T̄) = 2 × ${fmt(r.M, 5)} × ${G} × ${fmt(H)} ÷ (${fmt(r.z, 5)} × ${fmt(R_UNIVERSAL, 7)} × ${fmt(r.Tk)}) = ${fmt(r.s, 5)}`, "s = 2MgH ÷ (Z̄RT̄)");
  if (flowing) {
    c.step("Friction", `ṁ = ${fmt(r.mdot, 5)} kg/s;  Re = 4ṁ ÷ (π D μ̄) = ${fmt(r.Re)};  f (Colebrook) = ${fmt(r.f, 5)};  b = f ṁ² Z̄RT̄ ÷ (2 D A² M) = ${r.b.toPrecision(5)} Pa²/m`);
    c.step("Bottomhole pressure", `p_bh² = p_wh² eˢ + 2 b L (eˢ − 1) ÷ s = (${fmt(pTop * 1000)} Pa)² × e^${fmt(r.s, 5)} + 2 × ${r.b.toPrecision(5)} × ${fmt(L)} m × ${fmt(Math.abs(r.s) > 1e-12 ? (Math.exp(r.s) - 1) / r.s : 1, 6)};  p_bh = ${fmt(r.pBot)} kPa = ${fmt(psia(r.pBot))} psia`);
  } else c.step("Bottomhole pressure", `p_bh = p_wh e^(s/2) = ${fmt(psia(pTop))} × e^${fmt(r.s / 2, 5)} = ${fmt(psia(r.pBot))} psia`);
}

/* ------------------------------------------------------------ static */

const staticIn: InputDef[] = [{ id: "pt", label: "Shut-in wellhead pressure", sym: "p_ws", family: "pabs", unit: "psia", min: 1 }, ...wellIn, ...gasIn];

const staticBhp: SectionDef = {
  id: "static",
  title: "Static bottomhole pressure from shut-in wellhead pressure",
  question: "What is the reservoir pressure at the perforations, from the shut-in pressure at the wellhead?",
  formulas: ["p_bh = p_wh exp(M g H ÷ (Z̄ R T̄)) = p_wh e^(s/2)", "M = 28.9647 γg;  Z̄ at (p_wh + p_bh) ÷ 2 and T̄, solved by repeated passes"],
  inputs: staticIn,
  example: { title: "A dry-gas well shut in at 1,800 psia, 8,000 ft deep, 80 °F at surface and 200 °F at depth.", values: { pt: [1800, "psia"], tvd: [8000, "ft"], tt: [80, "f"], tb: [200, "f"], gamma: [0.65, "x"] } },
  refs: [OG.realGases, OG.gasWell],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pt", "tvd", "tt", "tb", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(staticIn));
    const err = checkWell(c, v);
    if (err) return c.done(err);
    const H = c.n("tvd");
    const r = gasColumn({ pTop: c.n("pt"), tTop: c.n("tt"), tBot: c.n("tb"), H, L: v.md ?? H, D: 0.05, eps: 0, n: 0, gas: gasOf(v) });
    if (!r.ok) return c.done("The Z-factor equation has no solution here. Check the pressure, temperature, and gravity.");
    columnSteps(c, r, c.n("pt"), H, v.md ?? H, false);
    const grad = (r.pBot - c.n("pt")) / H;
    c.result("pbh", "Static bottomhole pressure", "pabs", r.pBot, ["psia", "psig", "bara"], true);
    c.result("grad", "Average gas gradient", "grad", grad, ["psift", "kpam"], true);
    c.result("z", "Average Z-factor", "ratio", r.z, ["x"]);
    if (!r.inRange) c.warn("Average Tpr or Ppr is outside the Z-factor equation's fitted range.");
    return c.done();
  },
};

/* ------------------------------------------------------------ flowing */

const flowIn: InputDef[] = [
  { id: "pt", label: "Flowing wellhead (tubing) pressure", sym: "p_wh", family: "pabs", unit: "psia", min: 1 },
  { id: "q", label: "Gas rate", sym: "q", family: "gasflow", unit: "mscfd", min: 0 },
  ...tubingIn,
  ...wellIn,
  ...gasIn,
];

const flowing: SectionDef = {
  id: "flowing",
  title: "Flowing bottomhole pressure in gas well tubing",
  question: "For this rate and wellhead pressure, what is the flowing pressure at the perforations?",
  formulas: [
    "p_bh² = p_wh² eˢ + 2 b L (eˢ − 1) ÷ s,   s = 2 M g H ÷ (Z̄ R T̄)",
    "b = f ṁ² Z̄ R T̄ ÷ (2 D A² M),   f from Colebrook with Re = 4ṁ ÷ (π D μ̄)",
  ],
  inputs: flowIn,
  example: { title: "3,000 Mscf/d up 2.441 in tubing to 8,000 ft, 600 psia at the wellhead.", values: { pt: [600, "psia"], q: [3000, "mscfd"], d: [2.441, "in"], eps: [0.0006, "in"], tvd: [8000, "ft"], tt: [100, "f"], tb: [200, "f"], gamma: [0.65, "x"] } },
  refs: [OG.realGases, OG.gasVisc, OG.colebrook],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pt", "q", "d", "eps", "tvd", "tt", "tb", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(flowIn));
    const err = checkWell(c, v);
    if (err) return c.done(err);
    const H = c.n("tvd"), L = v.md ?? H;
    const r = gasColumn({ pTop: c.n("pt"), tTop: c.n("tt"), tBot: c.n("tb"), H, L, D: c.n("d"), eps: c.n("eps"), n: c.n("q"), gas: gasOf(v) });
    if (!r.ok) return c.done("The Z-factor equation has no solution here. Check the pressure, temperature, and gravity.");
    c.step("Gas mass rate", `${fmt(mscfd(c.n("q")))} Mscf/d = ${fmt(c.n("q"))} mol/s × ${fmt(r.M, 5)} kg/mol = ${fmt(r.mdot, 5)} kg/s`);
    columnSteps(c, r, c.n("pt"), H, L, true);
    const stat = gasColumn({ pTop: c.n("pt"), tTop: c.n("tt"), tBot: c.n("tb"), H, L, D: c.n("d"), eps: 0, n: 0, gas: gasOf(v) });
    const vel = (pk: number, tc: number) => {
      const st = gasState(psia(pk), degR(tc), gasOf(v));
      return (c.n("q") * st.z * R_UNIVERSAL * (tc + 273.15)) / (pk * 1000) / r.A;
    };
    c.result("pbh", "Flowing bottomhole pressure", "pabs", r.pBot, ["psia", "psig", "bara"], true);
    c.result("dpf", "Pressure added by friction", "dp", r.pBot - stat.pBot, ["psi", "bar"], true);
    c.result("vwh", "Gas velocity at the wellhead", "vel", vel(c.n("pt"), c.n("tt")), ["fts", "ms"]);
    c.result("vbh", "Gas velocity at the bottom", "vel", vel(r.pBot, c.n("tb")), ["fts", "ms"]);
    c.result("z", "Average Z-factor", "ratio", r.z, ["x"]);
    c.result("re", "Reynolds number", "ratio", r.Re, ["x"]);
    c.result("f", "Darcy friction factor", "ratio", r.f, ["x"]);
    c.warn("Single-phase gas only. Produced water or condensate adds liquid head and raises the bottomhole pressure; check liquid loading in section 4.");
    return c.done();
  },
};

/* ------------------------------------------------------------ nodal */

const NODAL_ITER = 40;

const nodalIn: InputDef[] = [
  { id: "pr", label: "Average reservoir pressure", sym: "p̄", family: "pabs", unit: "psia", min: 1 },
  { id: "C", label: "Back-pressure coefficient C, Mscf/d per psia^(2n)", sym: "C", family: "ratio", unit: "x", min: 0, help: "From a deliverability test (Inflow calculator, section 3)." },
  { id: "n", label: "Back-pressure exponent n", sym: "n", family: "ratio", unit: "x", min: 0.3, max: 1.2 },
  { id: "pt", label: "Flowing wellhead pressure (separator or line pressure plus surface losses)", sym: "p_wh", family: "pabs", unit: "psia", min: 1 },
  ...tubingIn,
  ...wellIn,
  ...gasIn,
];

/** Operating point: rate where the reservoir's pwf equals the tubing's pwf, by bisection between 0 and AOF. */
export function nodal(v: Values) {
  const pr = psia(v.pr as number), C = v.C as number, n = v.n as number;
  const H = v.tvd as number, L = v.md ?? H;
  const iprP = (q: number) => Math.sqrt(Math.max(pr * pr - (q / C) ** (1 / n), 0));
  const tub = (q: number) => psia(gasColumn({ pTop: v.pt as number, tTop: v.tt as number, tBot: v.tb as number, H, L, D: v.d as number, eps: v.eps as number, n: mscfdSI(q), gas: gasOf(v) }).pBot);
  const aof = C * (pr * pr - P_SC_PSIA ** 2) ** n;
  let lo = 0, hi = aof;
  for (let i = 0; i < NODAL_ITER; i++) {
    const mid = (lo + hi) / 2;
    if (iprP(mid) > tub(mid)) lo = mid;
    else hi = mid;
  }
  const q = (lo + hi) / 2;
  return { q, pwf: iprP(q), aof, static: tub(0), iprP, tub };
}

const nodalSec: SectionDef = {
  id: "nodal",
  title: "Nodal analysis: where the reservoir and the tubing agree",
  question: "With this reservoir, tubing, and wellhead pressure, what rate will the well actually flow?",
  formulas: [
    "Inflow: pwf = √(p̄² − (q ÷ C)^(1/n))",
    "Outflow: pwf from the flowing-tubing equation at the wellhead pressure",
    "Operating point: the rate where the two are equal (bisection between 0 and AOF)",
  ],
  inputs: nodalIn,
  example: { title: "Reservoir at 2,000 psia with C = 0.0029 and n = 0.95 (the section 3 test of the Inflow calculator); 2.441 in tubing to 8,000 ft; 600 psia at the wellhead.", values: { pr: [2000, "psia"], C: [0.0029, "x"], n: [0.95, "x"], pt: [600, "psia"], d: [2.441, "in"], eps: [0.0006, "in"], tvd: [8000, "ft"], tt: [100, "f"], tb: [200, "f"], gamma: [0.65, "x"] } },
  refs: [OG.gasWell, OG.realGases, OG.colebrook],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pr", "C", "n", "pt", "d", "eps", "tvd", "tt", "tb", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(nodalIn));
    const err = checkWell(c, v);
    if (err) return c.done(err);
    if (!(c.n("C") > 0)) return c.done("C must be greater than zero.");
    const r = nodal(v);
    c.step("Absolute open flow", `AOF = C (p̄² − 14.696²)^n = ${fmt(r.aof)} Mscf/d`);
    c.step("Tubing at zero rate (static column)", `pwf = ${fmt(r.static)} psia vs reservoir ${fmt(psia(c.n("pr")))} psia`);
    if (r.static >= psia(c.n("pr"))) return c.done("The gas column in the tubing alone needs more pressure than the reservoir has: the well cannot flow against this wellhead pressure.");
    const pts = [0.2, 0.4, 0.6, 0.8].map((x) => x * r.aof);
    c.step("Curves", pts.map((q) => `q ${fmt(q)}: reservoir ${fmt(r.iprP(q))}, tubing ${fmt(r.tub(q))} psia`).join(";  "));
    c.step(`Operating point (${NODAL_ITER} bisection steps)`, `q = ${fmt(r.q)} Mscf/d at pwf = ${fmt(r.pwf)} psia`);
    c.result("q", "Operating gas rate", "gasflow", mscfdSI(r.q), ["mscfd", "mmscfd", "ksm3d"], true);
    c.result("pwf", "Flowing bottomhole pressure at that rate", "pabs", kPa(r.pwf), ["psia", "bara"], true);
    c.result("aof", "Absolute open flow (AOF)", "gasflow", mscfdSI(r.aof), ["mscfd", "mmscfd"]);
    c.result("pct", "Operating rate as % of AOF", "pct", (r.q / r.aof) * 100, ["pct"]);
    c.warn("Rerun with a lower wellhead pressure or a different tubing size to see what compression or a tubing change would gain.");
    return c.done();
  },
};

/* ------------------------------------------------------------ liquid loading */

const loadIn: InputDef[] = [
  { id: "p", label: "Flowing pressure where you check (usually the wellhead)", sym: "p", family: "pabs", unit: "psia", min: 1 },
  { id: "t", label: "Temperature at that point", sym: "T", family: "temp", unit: "f", min: -40, max: 400 },
  { id: "d", label: "Tubing inside diameter", sym: "D", family: "diam", unit: "in", min: 0.0127, max: 0.5 },
  { id: "rhol", label: "Liquid density", sym: "ρL", family: "rho", unit: "lbft3", min: 400, max: 1300, help: "Turner's paper used 67 lb/ft³ for water and 45 lb/ft³ for condensate." },
  { id: "sigma", label: "Gas-liquid surface tension, dyn/cm (= mN/m)", sym: "σ", family: "ratio", unit: "x", min: 1, max: 100, help: "Turner's paper used 60 dyn/cm for water and 20 dyn/cm for condensate." },
  { id: "adj", label: "Velocity basis", family: "count", unit: "n", choices: [{ value: 1, label: "Turner with the 20 % upward adjustment (as published)" }, { value: 2, label: "Droplet model without the adjustment" }] },
  { id: "q", label: "Current gas rate (optional)", sym: "q", family: "gasflow", unit: "mscfd", optional: true, min: 0 },
  ...gasIn,
];

const loading: SectionDef = {
  id: "loading",
  title: "Liquid loading: critical rate to lift water or condensate (Turner)",
  question: "Is the gas moving fast enough to carry liquid out of the well, or will it load up and die?",
  formulas: [
    "Largest droplet: We = ρg v² d ÷ σ = 30;  drag coefficient 0.44",
    "v_t = [4 g We σ (ρL − ρg) ÷ (3 × 0.44 × ρg²)]^¼,  × 1.2 (Turner's adjustment)",
    "q_c = v_t A p ÷ (Z R T), as standard gas",
  ],
  inputs: loadIn,
  example: { title: "Water-producing gas well, 2.441 in tubing, 300 psia and 100 °F at the wellhead, flowing 600 Mscf/d.", values: { p: [300, "psia"], t: [100, "f"], d: [2.441, "in"], rhol: [67, "lbft3"], sigma: [60, "x"], adj: [1, "n"], q: [600, "mscfd"], gamma: [0.65, "x"] } },
  refs: [OG.turner, OG.turnerPaper, OG.realGases],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("p", "t", "d", "rhol", "sigma", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(loadIn));
    const st = gasState(psia(c.n("p")), degR(c.n("t")), gasOf(v));
    if (!st.ok) return c.done("The Z-factor equation has no solution here. Check the pressure, temperature, and gravity.");
    const rg = st.rhoSI, rl = c.n("rhol"), sig = c.n("sigma") / 1000;
    if (!(rl > rg)) return c.done("The liquid must be denser than the gas.");
    c.step("Gas density", `Z = ${fmt(st.z, 5)};  ρg = pM ÷ (ZRT) = ${fmt(rg)} kg/m³ = ${fmt(fromSI("rho", "lbft3", rg))} lb/ft³`);
    const v0 = ((4 * G * 30 * sig * (rl - rg)) / (3 * 0.44 * rg * rg)) ** 0.25;
    const k = v.adj === 2 ? 1 : 1.2;
    const vt = v0 * k;
    c.step("Critical velocity", `v = [4 × ${G} × 30 × ${fmt(sig, 4)} N/m × (${fmt(rl)} − ${fmt(rg)}) ÷ (3 × 0.44 × ${fmt(rg)}²)]^¼ = ${fmt(v0)} m/s${k > 1 ? ` × 1.2 = ${fmt(vt)} m/s` : ""} = ${fmt(fromSI("vel", "fts", vt))} ft/s`);
    const A = (Math.PI * c.n("d") ** 2) / 4;
    const nmol = (vt * A * c.n("p") * 1000) / (st.z * R_UNIVERSAL * (c.n("t") + 273.15));
    c.step("Critical rate", `A = ${fmt(A, 5)} m²;  q_c = v A p ÷ (Z R T) = ${fmt(nmol)} mol/s = ${fmt(mscfd(nmol))} Mscf/d`);
    c.result("vt", "Critical (minimum) gas velocity", "vel", vt, ["fts", "ms"], true);
    c.result("qc", "Critical (minimum) gas rate to unload liquids", "gasflow", nmol, ["mscfd", "mmscfd", "ksm3d"], true);
    c.result("rhog", "Gas density", "rho", rg, ["lbft3", "kgm3"]);
    c.result("z", "Z-factor", "ratio", st.z, ["x"]);
    if (v.q !== null && v.q !== undefined) {
      const ratio = (v.q / nmol) * 100;
      c.result("ratio", "Current rate as % of critical", "pct", ratio, ["pct"], true);
      c.step("Compare", `${fmt(mscfd(v.q))} ÷ ${fmt(mscfd(nmol))} = ${fmt(ratio)} %`);
      c.warn(ratio < 100 ? "Below the critical rate: liquid is likely accumulating. Options include smaller tubing, lower wellhead pressure, plunger lift, or foamers." : "Above the critical rate at this point. Check the point in the well with the lowest velocity too (often the wellhead in a constant-diameter string).");
    }
    return c.done();
  },
};

export const gasWell: UtilityDef = {
  slug: "gas-well-deliverability",
  name: "Gas Well Pressure, Nodal Analysis & Liquid Loading",
  short: "Gas well deliverability",
  problem: "What is my bottomhole pressure, what rate will this well flow, and is it loading up with liquid?",
  description: "Gas well calculations: static bottomhole pressure from shut-in wellhead pressure, flowing bottomhole pressure in tubing (average temperature and Z method with Colebrook friction), nodal analysis of the back-pressure inflow against the tubing curve, and Turner critical rate for liquid loading, with every step shown.",
  keywords: "gas well bottomhole pressure static flowing bhp average temperature z method cullender smith nodal analysis operating point tubing performance curve liquid loading turner critical velocity critical rate unloading",
  sheet: "Gas Well",
  sections: [staticBhp, flowing, nodalSec, loading],
  notes: [
    "Z from Dranchuk & Abou-Kassem with Sutton pseudo-criticals and the Wichert-Aziz correction; viscosity from Lee-Gonzalez-Eakin.",
    "Single-phase gas in the tubing; temperature is the average of the wellhead and bottomhole values.",
    "The pressure equation is integrated from momentum (hydrostatic plus friction, kinetic energy neglected) with Z̄ and μ̄ at the average pressure.",
  ],
};
