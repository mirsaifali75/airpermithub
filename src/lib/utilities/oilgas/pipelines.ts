import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef, Values } from "../types";
import { G, R_UNIVERSAL, fmt, fromSI } from "../units";
import { FT_M, LBFT3, M_AIR_G, NPASS, colebrook, degR, gasState, psia, type GasSpec } from "./core";
import { OG } from "./refs";

/** Average pressure of a gas line, (2/3)(p₁ + p₂ − p₁p₂ ÷ (p₁ + p₂)). */
export const pAvg = (p1: number, p2: number) => (2 / 3) * (p1 + p2 - (p1 * p2) / (p1 + p2));
const psiFn = (s: number) => (Math.abs(s) > 1e-12 ? (1 - Math.exp(-s)) / s : 1);
export const GASLINE_ITER = 12;
export const DIAM_ITER = 50;

const gasIn: InputDef[] = [
  { id: "q", label: "Gas rate", sym: "q", family: "gasflow", unit: "mmscfd", solvable: true, min: 0 },
  { id: "p1", label: "Inlet pressure", sym: "p₁", family: "pabs", unit: "psia", min: 1 },
  { id: "p2", label: "Outlet pressure", sym: "p₂", family: "pabs", unit: "psia", solvable: true, min: 1 },
  { id: "d", label: "Pipe inside diameter", sym: "D", family: "diam", unit: "in", solvable: true, min: 0.005, max: 2 },
  { id: "l", label: "Pipe length", sym: "L", family: "length", unit: "mi", min: 1 },
  { id: "dz", label: "Outlet elevation minus inlet elevation (optional)", sym: "Δz", family: "length", unit: "ft", optional: true },
  { id: "eps", label: "Pipe roughness", sym: "ε", family: "rough", unit: "in", min: 0, max: 0.05, help: "New commercial steel is often taken as 0.0018 in (0.046 mm); use your own value for older or coated pipe." },
  { id: "t", label: "Average flowing temperature", sym: "T", family: "temp", unit: "f", min: -40, max: 300 },
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 1.8 },
  { id: "e", label: "Pipeline efficiency (blank = 100 %)", sym: "E", family: "pct", unit: "pct", optional: true, min: 50, max: 100, help: "Multiplies the flow; less than 100 % allows for fouling, liquids, and fittings." },
];

interface LineOut { q: number; p2: number; D: number; z: number; mu: number; f: number; Re: number; s: number; pbar: number; mdot: number; v1: number; v2: number }

/** Solves the gas line for whichever of q (mol/s), p₂ (kPa abs), or D (m) is null. */
export function gasLine(v: Values, which: "q" | "p2" | "d"): LineOut | string {
  const gas: GasSpec = { gamma: v.gamma as number };
  const M = ((v.gamma as number) * M_AIR_G) / 1000;
  const T = (v.t as number) + 273.15;
  const L = v.l as number, dz = v.dz ?? 0, eps = v.eps as number, E = (v.e ?? 100) / 100;
  const p1 = (v.p1 as number) * 1000;
  const props = (pbarPa: number) => gasState(psia(pbarPa / 1000), degR(v.t as number), gas);
  const sOf = (z: number) => (2 * M * G * dz) / (z * R_UNIVERSAL * T);
  const bOf = (f: number, md: number, D: number, z: number) => (f * md ** 2 * z * R_UNIVERSAL * T) / (2 * D * ((Math.PI * D ** 2) / 4) ** 2 * M * E * E);
  const ReOf = (md: number, D: number, mu: number) => (4 * md) / (Math.PI * D * (mu / 1000));
  let q = (v.q as number) ?? NaN, p2 = ((v.p2 as number) ?? NaN) * 1000, D = (v.d as number) ?? NaN;
  let z = 1, mu = 0.01, f = 0, Re = 0, s = 0, pbar = p1;
  if (which === "p2") {
    p2 = p1;
    for (let i = 0; i < NPASS; i++) {
      pbar = pAvg(p1, p2);
      const st = props(pbar);
      z = st.z;
      mu = st.mu;
      s = sOf(z);
      Re = ReOf(q * M, D, mu);
      f = colebrook(Re, eps / D);
      const sq = p1 ** 2 * Math.exp(-s) - 2 * bOf(f, q * M, D, z) * L * psiFn(s);
      if (!(sq > 0)) return "The pipe cannot carry this rate from this inlet pressure: the outlet pressure would fall to zero. Use a larger pipe or a lower rate.";
      p2 = Math.sqrt(sq);
    }
  } else {
    if (!(p2 < p1) && dz <= 0) return "Outlet pressure must be below inlet pressure for flow.";
    pbar = pAvg(p1, p2);
    const st = props(pbar);
    z = st.z;
    mu = st.mu;
    s = sOf(z);
    const B = (p1 ** 2 * Math.exp(-s) - p2 ** 2) / (2 * L * psiFn(s));
    if (!(B > 0)) return "The elevation gain alone uses up the pressure difference: no flow.";
    if (which === "q") {
      f = 0.02;
      let md = 0;
      for (let i = 0; i < GASLINE_ITER; i++) {
        md = Math.sqrt((B * 2 * D * ((Math.PI * D ** 2) / 4) ** 2 * M * E * E) / (f * z * R_UNIVERSAL * T));
        Re = ReOf(md, D, mu);
        f = colebrook(Re, eps / D);
      }
      q = md / M;
    } else {
      let lo = Math.log(0.005), hi = Math.log(2);
      for (let i = 0; i < DIAM_ITER; i++) {
        const Dm = Math.exp((lo + hi) / 2);
        Re = ReOf(q * M, Dm, mu);
        f = colebrook(Re, eps / Dm);
        if (bOf(f, q * M, Dm, z) > B) lo = (lo + hi) / 2;
        else hi = (lo + hi) / 2;
      }
      D = Math.exp((lo + hi) / 2);
      Re = ReOf(q * M, D, mu);
      f = colebrook(Re, eps / D);
      if (D > 1.99) return "Even a 2 m pipe cannot carry this rate with this pressure drop.";
    }
  }
  const A = (Math.PI * D ** 2) / 4;
  const vel = (p: number) => {
    const st = props(p);
    return (q * st.z * R_UNIVERSAL * T) / p / A;
  };
  return { q, p2: p2 / 1000, D, z, mu, f, Re, s, pbar: pbar / 1000, mdot: q * M, v1: vel(p1), v2: vel(p2) };
}

const gasLineSec: SectionDef = {
  id: "gas-line",
  title: "Gas pipeline: flow, outlet pressure, or pipe size",
  question: "How much gas will this line carry, what pressure arrives at the end, or what size pipe is needed?",
  formulas: [
    "p₂² = p₁² e⁻ˢ − 2 b L (1 − e⁻ˢ) ÷ s,   s = 2 M g Δz ÷ (Z̄ R T)",
    "b = f ṁ² Z̄ R T ÷ (2 D A² M E²);   f from Colebrook, Re = 4ṁ ÷ (π D μ̄)",
    "Z̄ and μ̄ at p̄ = (2/3)(p₁ + p₂ − p₁p₂ ÷ (p₁ + p₂))",
  ],
  solveNote: "Leave one of gas rate, outlet pressure, or pipe diameter blank.",
  inputs: gasIn,
  example: { title: "5 MMscf/d of 0.65 gravity gas through 10 miles of 6.065 in pipe from 800 psia at 80 °F.", values: { q: [5, "mmscfd"], p1: [800, "psia"], d: [6.065, "in"], l: [10, "mi"], eps: [0.0018, "in"], t: [80, "f"], gamma: [0.65, "x"] } },
  refs: [OG.colebrook, OG.realGases, OG.gasVisc],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("p1", "l", "eps", "t", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(gasIn));
    const b = c.blank("q", "p2", "d");
    if (b.length !== 1) return c.done("Leave exactly one of gas rate, outlet pressure, or pipe diameter blank.");
    const which = b[0] as "q" | "p2" | "d";
    const r = gasLine(v, which);
    if (typeof r === "string") return c.done(r);
    c.solved = which;
    const M = c.n("gamma") * M_AIR_G;
    c.step("Gas", `M = ${fmt(M)} g/mol;  T = ${fmt(c.n("t") + 273.15)} K`);
    c.step("Average pressure and properties", `p̄ = ${fmt(psia(r.pbar))} psia;  Z̄ = ${fmt(r.z, 5)};  μ̄ = ${fmt(r.mu, 4)} cP${which === "p2" ? ` (after ${NPASS} passes, since p̄ depends on p₂)` : ""}`);
    if (v.dz) c.step("Elevation", `s = 2 M g Δz ÷ (Z̄ R T) = ${fmt(r.s, 5)}`);
    c.step("Friction", `Re = ${fmt(r.Re)};  ε/D = ${fmt(c.n("eps") / r.D, 4)};  f = ${fmt(r.f, 5)}${v.e ? `;  efficiency ${fmt(v.e)} %` : ""}`);
    if (which === "q") c.step("Gas rate", `ṁ = √(B × 2DA²ME² ÷ (f Z̄ R T)) with B = (p₁²e⁻ˢ − p₂²) ÷ (2Lψ), repeated ${GASLINE_ITER} times with Colebrook: ṁ = ${fmt(r.mdot, 5)} kg/s = ${fmt(fromSI("gasflow", "mmscfd", r.q), 5)} MMscf/d`);
    if (which === "p2") c.step("Outlet pressure", `p₂ = ${fmt(psia(r.p2))} psia`);
    if (which === "d") c.step("Pipe diameter", `Bisection on D (${DIAM_ITER} steps) until the pressure drop matches: D = ${fmt(r.D / 0.0254, 5)} in`);
    c.result("q", "Gas rate", "gasflow", r.q, ["mmscfd", "mscfd", "ksm3d"], which === "q");
    c.result("p2", "Outlet pressure", "pabs", r.p2, ["psia", "psig", "bara"], which === "p2");
    c.result("d", "Pipe inside diameter", "diam", r.D, ["in", "mm"], which === "d");
    c.result("dp", "Pressure drop", "dp", c.n("p1") - r.p2, ["psi", "bar"], true);
    c.result("v1", "Gas velocity at the inlet", "vel", r.v1, ["fts", "ms"]);
    c.result("v2", "Gas velocity at the outlet", "vel", r.v2, ["fts", "ms"], true);
    c.result("z", "Average Z-factor", "ratio", r.z, ["x"]);
    c.result("re", "Reynolds number", "ratio", r.Re, ["x"]);
    c.result("f", "Darcy friction factor", "ratio", r.f, ["x"]);
    if (r.v2 > 18.288) c.warn("Outlet velocity is above 60 ft/s; check noise, erosion, and your company's velocity limit.");
    if (c.n("p1") - r.p2 > 0.4 * c.n("p1")) c.warn("The pressure drop is more than 40 % of the inlet pressure; split long lines into segments for better accuracy.");
    return c.done();
  },
};

const liqIn: InputDef[] = [
  { id: "q", label: "Liquid rate", sym: "q", family: "vflow", unit: "bpd", min: 0 },
  { id: "rho", label: "Liquid specific gravity", sym: "ρ", family: "rho", unit: "sg", min: 400, max: 2000 },
  { id: "mu", label: "Liquid viscosity at flowing temperature", sym: "μ", family: "visc", unit: "cp" },
  { id: "d", label: "Pipe inside diameter", sym: "D", family: "diam", unit: "in", min: 0.005, max: 2 },
  { id: "l", label: "Pipe length", sym: "L", family: "length", unit: "ft", min: 0 },
  { id: "dz", label: "Outlet elevation minus inlet elevation (optional)", sym: "Δz", family: "length", unit: "ft", optional: true },
  { id: "eps", label: "Pipe roughness", sym: "ε", family: "rough", unit: "in", min: 0, max: 0.05 },
  { id: "p1", label: "Inlet pressure (optional)", sym: "p₁", family: "pabs", unit: "psig", optional: true, min: 0 },
];

const liquidLine: SectionDef = {
  id: "liquid-line",
  title: "Oil or water line pressure drop",
  question: "How much pressure does this flowline or transfer line lose, and how fast is the liquid moving?",
  formulas: ["Δp = f (L ÷ D) ρ v² ÷ 2 + ρ g Δz", "v = q ÷ A,   Re = ρ v D ÷ μ,   f from Colebrook (64/Re if laminar)"],
  inputs: liqIn,
  example: { title: "5,000 bbl/d of 0.85 SG oil at 5 cP through 2 miles of 4.026 in pipe, 50 ft uphill.", values: { q: [5000, "bpd"], rho: [0.85, "sg"], mu: [5, "cp"], d: [4.026, "in"], l: [10560, "ft"], dz: [50, "ft"], eps: [0.0018, "in"], p1: [300, "psig"] } },
  refs: [OG.colebrook, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("q", "rho", "mu", "d", "l", "eps");
    if (miss.length) return c.missing(miss, labelsOf(liqIn));
    const D = c.n("d"), A = (Math.PI * D * D) / 4, rho = c.n("rho"), mu = c.n("mu");
    const vel = c.n("q") / A;
    const Re = (rho * vel * D) / mu;
    if (!(Re > 0)) return c.done("Enter a flow above zero.");
    const f = colebrook(Re, c.n("eps") / D);
    c.step("Velocity and Reynolds number", `v = ${fmt(c.n("q"), 5)} m³/s ÷ ${fmt(A, 5)} m² = ${fmt(vel)} m/s (${fmt(vel / FT_M)} ft/s);  Re = ${fmt(rho)} × ${fmt(vel)} × ${fmt(D, 5)} ÷ ${fmt(mu, 4)} = ${fmt(Re)}`);
    c.step("Friction factor", `${Re < 2300 ? "Laminar: f = 64 ÷ Re" : "Colebrook"} = ${fmt(f, 5)}`);
    const dpf = (f * (c.n("l") / D) * rho * vel * vel) / 2 / 1000;
    const dpz = (rho * G * (v.dz ?? 0)) / 1000;
    c.step("Pressure drop", `friction = ${fmt(f, 5)} × (${fmt(c.n("l"))} ÷ ${fmt(D, 5)}) × ${fmt(rho)} × ${fmt(vel)}² ÷ 2 = ${fmt(dpf)} kPa;  elevation = ${fmt(rho)} × ${G} × ${fmt(v.dz ?? 0)} = ${fmt(dpz)} kPa`);
    c.result("dp", "Total pressure drop", "dp", dpf + dpz, ["psi", "bar"], true);
    c.result("dpf", "Friction pressure drop", "dp", dpf, ["psi", "bar"]);
    c.result("dpz", "Elevation pressure change", "dp", dpz, ["psi", "bar"]);
    c.result("v", "Velocity", "vel", vel, ["fts", "ms"], true);
    c.result("re", "Reynolds number", "ratio", Re, ["x"]);
    c.result("f", "Darcy friction factor", "ratio", f, ["x"]);
    if (c.n("l") > 0) c.result("dpmi", "Friction loss per mile, psi", "ratio", fromSI("dp", "psi", dpf) / (c.n("l") / 1609.344), ["x"]);
    if (v.p1 !== null && v.p1 !== undefined) {
      const p2 = v.p1 - dpf - dpz;
      c.result("p2", "Outlet pressure", "pabs", p2, ["psig", "barg"], true);
      if (p2 < 101.325) c.warn("The outlet pressure is below atmospheric: the pump or inlet pressure cannot deliver this rate.");
    }
    if (Re >= 2300 && Re < 4000) c.warn("Flow is transitional (Re 2,300–4,000); the friction factor is uncertain there.");
    return c.done();
  },
};

const eroIn: InputDef[] = [
  { id: "qo", label: "Oil rate (blank = none)", sym: "q_o", family: "vflow", unit: "bpd", optional: true, min: 0 },
  { id: "qw", label: "Water rate", sym: "q_w", family: "vflow", unit: "bpd", optional: true, min: 0 },
  { id: "qg", label: "Gas rate", sym: "q_g", family: "gasflow", unit: "mmscfd", min: 0 },
  { id: "p", label: "Flowing pressure", sym: "p", family: "pabs", unit: "psia", min: 1 },
  { id: "t", label: "Flowing temperature", sym: "T", family: "temp", unit: "f", min: -40, max: 400 },
  { id: "so", label: "Oil specific gravity", sym: "γo", family: "rho", unit: "sg", min: 500, max: 1100 },
  { id: "sw", label: "Water specific gravity (blank = 1.0)", sym: "γw", family: "rho", unit: "sg", optional: true, min: 950, max: 1300 },
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 1.8 },
  { id: "d", label: "Pipe inside diameter", sym: "D", family: "diam", unit: "in", min: 0.005, max: 2 },
  { id: "C", label: "Empirical constant C (ft/s × (lb/ft³)^½)", sym: "C", family: "ratio", unit: "x", min: 10, max: 500, help: "API RP 14E gives values for continuous and intermittent service; use the value from your edition and company standard." },
];

const erosional: SectionDef = {
  id: "erosional",
  title: "Erosional velocity check for multiphase lines (API RP 14E form)",
  question: "Is the mixture velocity in this line below the erosional limit, and what is the smallest pipe that meets it?",
  formulas: [
    "ρm = (ṁ_oil + ṁ_water + ṁ_gas) ÷ (V̇_oil + V̇_water + V̇_gas at p, T)   (no-slip mixture)",
    "V_e = C ÷ √ρm   (ft/s with ρm in lb/ft³)",
    "Minimum area = (V̇ total) ÷ V_e",
  ],
  inputs: eroIn,
  example: { title: "2,000 bbl/d oil, 500 bbl/d water and 3 MMscf/d gas at 500 psia and 100 °F in a 4.026 in line, C = 100.", values: { qo: [2000, "bpd"], qw: [500, "bpd"], qg: [3, "mmscfd"], p: [500, "psia"], t: [100, "f"], so: [0.85, "sg"], gamma: [0.7, "x"], d: [4.026, "in"], C: [100, "x"] } },
  refs: [OG.bseeProd, OG.realGases],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("qg", "p", "t", "so", "gamma", "d", "C");
    if (miss.length) return c.missing(miss, labelsOf(eroIn));
    const st = gasState(psia(c.n("p")), degR(c.n("t")), { gamma: c.n("gamma") });
    if (!st.ok) return c.done("The Z-factor equation has no solution here. Check pressure, temperature, and gravity.");
    const M = (c.n("gamma") * M_AIR_G) / 1000;
    const Vo = v.qo ?? 0, Vw = v.qw ?? 0;
    const Vg = (c.n("qg") * st.z * R_UNIVERSAL * (c.n("t") + 273.15)) / (c.n("p") * 1000);
    const mo = Vo * c.n("so"), mw = Vw * (v.sw ?? 1000 * 0.999016), mg = c.n("qg") * M;
    const Vt = Vo + Vw + Vg;
    const rhom = (mo + mw + mg) / Vt;
    c.step("Gas at flowing conditions", `Z = ${fmt(st.z, 5)};  V̇_gas = ṅ Z R T ÷ p = ${fmt(Vg, 5)} m³/s`);
    c.step("No-slip mixture density", `ρm = (${fmt(mo, 4)} + ${fmt(mw, 4)} + ${fmt(mg, 4)}) kg/s ÷ (${fmt(Vo, 4)} + ${fmt(Vw, 4)} + ${fmt(Vg, 4)}) m³/s = ${fmt(rhom)} kg/m³ = ${fmt(rhom / LBFT3)} lb/ft³`);
    const Ve = (c.n("C") / Math.sqrt(rhom / LBFT3)) * FT_M;
    c.step("Erosional velocity", `V_e = ${fmt(c.n("C"))} ÷ √${fmt(rhom / LBFT3)} = ${fmt(Ve / FT_M)} ft/s`);
    const A = (Math.PI * c.n("d") ** 2) / 4;
    const vm = Vt / A;
    const Amin = Vt / Ve;
    const Dmin = Math.sqrt((4 * Amin) / Math.PI);
    c.step("Mixture velocity in this pipe", `v_m = ${fmt(Vt, 5)} ÷ ${fmt(A, 5)} = ${fmt(vm / FT_M)} ft/s = ${fmt((vm / Ve) * 100)} % of V_e;  minimum ID = √(4 × ${fmt(Amin, 5)} ÷ π) = ${fmt(Dmin / 0.0254)} in`);
    c.result("rhom", "Mixture density (no slip)", "rho", rhom, ["lbft3", "kgm3"]);
    c.result("ve", "Erosional velocity", "vel", Ve, ["fts", "ms"], true);
    c.result("vm", "Mixture velocity in this pipe", "vel", vm, ["fts", "ms"], true);
    c.result("pct", "Mixture velocity as % of erosional", "pct", (vm / Ve) * 100, ["pct"], true);
    c.result("dmin", "Smallest inside diameter that stays at or below V_e", "diam", Dmin, ["in", "mm"], true);
    c.result("z", "Gas Z-factor", "ratio", st.z, ["x"]);
    if (vm > Ve) c.warn("The mixture velocity is above the erosional velocity for this C. Use a larger line or reduce rate, or document why a higher C applies (for example, solids-free, corrosion-resistant service).");
    c.warn("The C ÷ √ρ form does not account for sand. With solids, use a sand-erosion method.");
    return c.done();
  },
};

export const pipelines: UtilityDef = {
  slug: "pipeline-flow",
  name: "Oil and Gas Pipeline & Flowline Calculator",
  short: "Pipelines and flowlines",
  problem: "How much will this line carry, what pressure arrives at the end, and is the velocity safe?",
  description: "Pipeline and flowline calculations: gas pipeline flow, outlet pressure, or diameter from the isothermal flow equation with elevation, Colebrook friction and real-gas Z; liquid line pressure drop; and the API RP 14E erosional velocity check with a no-slip mixture density, with every step shown.",
  keywords: "gas pipeline flow equation pressure drop pipe sizing weymouth panhandle alternative isothermal flow colebrook liquid flowline pressure drop erosional velocity api rp 14e c factor mixture density",
  sheet: "Pipelines",
  sections: [gasLineSec, liquidLine, erosional],
  notes: [
    "The gas line equation is integrated from the momentum balance (isothermal, kinetic energy neglected) instead of using a fixed-coefficient formula like Weymouth or Panhandle, so it is valid for any diameter and roughness.",
    "Z and viscosity are evaluated at the line's average pressure with Sutton pseudo-criticals (no sour-gas correction here).",
  ],
};
