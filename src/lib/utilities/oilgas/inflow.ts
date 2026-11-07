import { Calc, labelsOf } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { MD_M2, fmt, fromSI, toSI } from "../units";
import { BBL_M3, P_SC_PSIA, kPa, psia } from "./core";
import { OG } from "./refs";

const bpd = (si: number) => fromSI("vflow", "bpd", si);
const bpdSI = (x: number) => toSI("vflow", "bpd", x);
const mscfd = (si: number) => fromSI("gasflow", "mscfd", si);
const mscfdSI = (x: number) => toSI("gasflow", "mscfd", x);

/** The oilfield radial-flow constant: q[bbl/d] = kh Δp ÷ (C μ B (…)) with k mD, h ft, Δp psi, μ cP. Derived from exact unit definitions. */
export const C_RADIAL = 1 / ((2 * Math.PI * MD_M2 * 0.3048 * 6894.757293168) / 1e-3 / (BBL_M3 / 86400));

/* ------------------------------------------------------------ Darcy radial */

const darcyInputs: SectionDef["inputs"] = [
  { id: "mode", label: "Flow condition", family: "count", unit: "n", choices: [{ value: 1, label: "Pseudo-steady state, average reservoir pressure (− 0.75)" }, { value: 2, label: "Steady state, pressure at the drainage boundary (+ 0)" }] },
  { id: "q", label: "Oil rate (stock-tank)", sym: "q", family: "vflow", unit: "bpd", solvable: true, min: 0 },
  { id: "k", label: "Permeability", sym: "k", family: "perm", unit: "md", solvable: true, min: 0 },
  { id: "s", label: "Skin factor", sym: "s", family: "ratio", unit: "x", solvable: true, min: -8, max: 200 },
  { id: "pwf", label: "Flowing bottomhole pressure", sym: "pwf", family: "pabs", unit: "psia", solvable: true, min: 0 },
  { id: "pr", label: "Reservoir pressure (average, or at the boundary)", sym: "p̄", family: "pabs", unit: "psia", min: 1 },
  { id: "h", label: "Net pay thickness", sym: "h", family: "length", unit: "ft", min: 0 },
  { id: "mu", label: "Oil viscosity at reservoir conditions", sym: "μo", family: "visc", unit: "cp" },
  { id: "bo", label: "Oil formation volume factor, bbl/STB", sym: "Bo", family: "ratio", unit: "x", min: 0.5, max: 5 },
  { id: "re", label: "Drainage radius", sym: "re", family: "length", unit: "ft", min: 0 },
  { id: "rw", label: "Wellbore radius", sym: "rw", family: "length", unit: "ft", min: 0 },
];

const darcy: SectionDef = {
  id: "darcy",
  title: "Productivity index and skin (radial Darcy flow)",
  question: "How much should this well make for its permeability, thickness, and drawdown, and what does skin cost?",
  formulas: [
    "q = k h (p̄ − pwf) ÷ (141.2 Bo μo [ln(re ÷ rw) − 0.75 + s])   (pseudo-steady, oilfield units)",
    "141.2 = 1 ÷ (2π × mD × ft × psi ÷ (cP × bbl/d)), from exact unit definitions",
    "J = q ÷ (p̄ − pwf);   Δp_skin = 141.2 q Bo μo s ÷ (k h)",
  ],
  solveNote: "Leave one of oil rate, permeability, skin, or flowing pressure blank to solve for it.",
  inputs: darcyInputs,
  example: { title: "A 30 ft sand of 50 mD with skin +3, 3,000 psia average pressure flowing at 2,000 psia.", values: { mode: [1, "n"], k: [50, "md"], s: [3, "x"], pwf: [2000, "psia"], pr: [3000, "psia"], h: [30, "ft"], mu: [1.2, "cp"], bo: [1.25, "x"], re: [1490, "ft"], rw: [0.328, "ft"] } },
  refs: [OG.oilWell, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pr", "h", "mu", "bo", "re", "rw");
    if (miss.length) return c.missing(miss, labelsOf(darcyInputs));
    const b = c.blank("q", "k", "s", "pwf");
    if (b.length !== 1) return c.done("Leave exactly one of oil rate, permeability, skin, or flowing pressure blank.");
    const ss = v.mode === 2;
    const cst = ss ? 0 : -0.75;
    const lnr = Math.log(c.n("re") / c.n("rw"));
    if (!(lnr > 0)) return c.done("The drainage radius must be larger than the wellbore radius.");
    const h = c.n("h") / 0.3048, mu = c.n("mu") * 1000, B = c.n("bo"), pr = psia(c.n("pr"));
    c.step("Constant", `C = ${fmt(C_RADIAL, 6)} (the "141.2"),  ln(re/rw) = ln(${fmt(c.n("re") / 0.3048)} ÷ ${fmt(c.n("rw") / 0.3048)}) = ${fmt(lnr, 5)},  ${ss ? "steady state (+0)" : "pseudo-steady state (−0.75)"}`);
    let q = v.q === null ? NaN : bpd(c.n("q")), k = v.k ?? NaN, s = v.s ?? NaN, pwf = v.pwf === null ? NaN : psia(c.n("pwf"));
    c.solved = b[0];
    if (b[0] === "q") {
      const den = lnr + cst + s;
      if (!(den > 0)) return c.done("ln(re/rw) − 0.75 + s must be positive. Check the skin and radii.");
      q = (k * h * (pr - pwf)) / (C_RADIAL * B * mu * den);
      c.step("Oil rate", `q = ${fmt(k)} × ${fmt(h)} × (${fmt(pr)} − ${fmt(pwf)}) ÷ (${fmt(C_RADIAL, 5)} × ${fmt(B)} × ${fmt(mu)} × ${fmt(den, 5)}) = ${fmt(q)} bbl/d`);
    } else if (b[0] === "k") {
      k = (q * C_RADIAL * B * mu * (lnr + cst + s)) / (h * (pr - pwf));
      c.step("Permeability", `k = q × C Bo μ (ln(re/rw) ${cst ? "− 0.75 " : ""}+ s) ÷ (h Δp) = ${fmt(q)} × ${fmt(C_RADIAL, 5)} × ${fmt(B)} × ${fmt(mu)} × ${fmt(lnr + cst + s, 5)} ÷ (${fmt(h)} × ${fmt(pr - pwf)}) = ${fmt(k)} mD`);
    } else if (b[0] === "s") {
      s = (k * h * (pr - pwf)) / (q * C_RADIAL * B * mu) - lnr - cst;
      c.step("Skin", `s = k h Δp ÷ (C q Bo μ) − ln(re/rw) ${cst ? "+ 0.75" : ""} = ${fmt((k * h * (pr - pwf)) / (q * C_RADIAL * B * mu), 5)} − ${fmt(lnr + cst, 5)} = ${fmt(s)}`);
    } else {
      pwf = pr - (q * C_RADIAL * B * mu * (lnr + cst + s)) / (k * h);
      c.step("Flowing bottomhole pressure", `pwf = p̄ − q C Bo μ (ln(re/rw) ${cst ? "− 0.75 " : ""}+ s) ÷ (k h) = ${fmt(pr)} − ${fmt(pr - pwf)} = ${fmt(pwf)} psia`);
      if (!(pwf > 0)) return c.done("This rate needs more drawdown than the reservoir pressure allows.");
    }
    if (!(pr > pwf)) return c.done("Flowing pressure must be below reservoir pressure.");
    if (!(k > 0) || !(q > 0)) return c.done("These inputs give no flow. Check the values.");
    const dp = pr - pwf;
    const J = q / dp;
    const dps = (q * C_RADIAL * B * mu * s) / (k * h);
    const Jideal = (k * h) / (C_RADIAL * B * mu * (lnr + cst));
    c.step("Productivity index", `J = ${fmt(q)} ÷ ${fmt(dp)} = ${fmt(J, 5)} bbl/d per psi`, "J = q ÷ (p̄ − pwf)");
    c.step("Pressure drop across the skin", `Δp_skin = ${fmt(C_RADIAL, 5)} × ${fmt(q)} × ${fmt(B)} × ${fmt(mu)} × ${fmt(s)} ÷ (${fmt(k)} × ${fmt(h)}) = ${fmt(dps)} psi;  J with zero skin = ${fmt(Jideal, 5)};  flow efficiency = ${fmt(((dp - dps) / dp) * 100)} %`);
    c.result("q", "Oil rate", "vflow", bpdSI(q), ["bpd", "m3d"], true);
    c.result("k", "Permeability", "perm", k, ["md"], b[0] === "k");
    c.result("s", "Skin factor", "ratio", s, ["x"], b[0] === "s");
    c.result("pwf", "Flowing bottomhole pressure", "pabs", kPa(pwf), ["psia", "bara"], b[0] === "pwf");
    c.result("J", "Productivity index", "pindex", toSI("pindex", "bpdpsi", J), ["bpdpsi", "m3dbar"], true);
    c.result("dps", "Pressure drop across the skin", "dp", kPa(dps), ["psi", "bar"]);
    c.result("fe", "Flow efficiency (ideal drawdown ÷ actual)", "pct", ((dp - dps) / dp) * 100, ["pct"]);
    c.result("q0", "Rate at the same drawdown with zero skin", "vflow", bpdSI(Jideal * dp), ["bpd", "m3d"]);
    return c.done();
  },
};

/* ------------------------------------------------------------ Vogel */

const vogelInputs: SectionDef["inputs"] = [
  { id: "pr", label: "Average reservoir pressure", sym: "p̄", family: "pabs", unit: "psia", min: 1 },
  { id: "pb", label: "Bubble-point pressure (blank = reservoir is at or below it)", sym: "pb", family: "pabs", unit: "psia", optional: true, min: 1 },
  { id: "qt", label: "Test oil rate", sym: "q_test", family: "vflow", unit: "bpd", min: 0 },
  { id: "pt", label: "Test flowing bottomhole pressure", sym: "pwf_test", family: "pabs", unit: "psia", min: 0 },
  { id: "pwf", label: "Planned flowing pressure (optional)", sym: "pwf", family: "pabs", unit: "psia", optional: true, min: 0 },
  { id: "q", label: "Target oil rate (optional)", sym: "q", family: "vflow", unit: "bpd", optional: true, min: 0 },
];

/** Vogel/composite IPR from one test. Pressures psia, rates bbl/d. */
export function vogelIpr(pr: number, pbIn: number | null, qt: number, pt: number) {
  const pb = pbIn === null || pbIn >= pr ? pr : pbIn;
  const sat = pb >= pr;
  const vog = (x: number) => 1 - 0.2 * x - 0.8 * x * x;
  let J: number, qb: number, qv: number;
  if (sat) {
    qv = qt / vog(pt / pr);
    qb = 0;
    J = (1.8 * qv) / pr;
  } else if (pt >= pb) {
    J = qt / (pr - pt);
    qb = J * (pr - pb);
    qv = (J * pb) / 1.8;
  } else {
    J = qt / (pr - pb + (pb / 1.8) * vog(pt / pb));
    qb = J * (pr - pb);
    qv = (J * pb) / 1.8;
  }
  const qOf = (pwf: number) => (pwf >= pb ? J * (pr - pwf) : qb + qv * vog(pwf / pb));
  const pOf = (q: number) => {
    if (q <= qb) return pr - q / J;
    const r = 1 - (q - qb) / qv;
    const x = (-0.2 + Math.sqrt(0.04 + 3.2 * r)) / 1.6;
    return x * pb;
  };
  return { pb, sat, J, qb, qv, qmax: qb + qv, qOf, pOf, vog };
}

const vogel: SectionDef = {
  id: "vogel",
  title: "Inflow performance (Vogel and composite IPR)",
  question: "From one well test, what is the maximum rate, and what rate will the well make at a lower flowing pressure?",
  formulas: [
    "Vogel: q ÷ q_max = 1 − 0.2 (pwf ÷ p̄) − 0.8 (pwf ÷ p̄)²",
    "Above pb: q = J (p̄ − pwf);   below pb: q = q_b + (J pb ÷ 1.8) [1 − 0.2 (pwf ÷ pb) − 0.8 (pwf ÷ pb)²]",
    "q_b = J (p̄ − pb),   q_max = q_b + J pb ÷ 1.8",
  ],
  inputs: vogelInputs,
  example: { title: "A well tested 400 bbl/d at 1,800 psia; reservoir 3,000 psia, bubble point 2,400 psia.", values: { pr: [3000, "psia"], pb: [2400, "psia"], qt: [400, "bpd"], pt: [1800, "psia"], pwf: [1000, "psia"], q: [600, "bpd"] } },
  refs: [OG.oilWell, OG.vogel],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pr", "qt", "pt");
    if (miss.length) return c.missing(miss, labelsOf(vogelInputs));
    const pr = psia(c.n("pr")), qt = bpd(c.n("qt")), pt = psia(c.n("pt"));
    if (!(pt < pr)) return c.done("Test flowing pressure must be below reservoir pressure.");
    if (!(qt > 0)) return c.done("Enter a test rate above zero.");
    const pbIn = v.pb === null || v.pb === undefined ? null : psia(v.pb);
    const ipr = vogelIpr(pr, pbIn, qt, pt);
    if (ipr.sat) {
      c.step("Saturated reservoir: Vogel from the test", `x = ${fmt(pt)} ÷ ${fmt(pr)} = ${fmt(pt / pr, 5)};  q_max = ${fmt(qt)} ÷ (1 − 0.2×${fmt(pt / pr, 5)} − 0.8×${fmt(pt / pr, 5)}²) = ${fmt(ipr.qmax)} bbl/d`);
    } else {
      c.step("Undersaturated reservoir: productivity index", pt >= ipr.pb ? `Test is above pb: J = ${fmt(qt)} ÷ (${fmt(pr)} − ${fmt(pt)}) = ${fmt(ipr.J, 5)} bbl/d/psi` : `Test is below pb: J = ${fmt(qt)} ÷ [(${fmt(pr)} − ${fmt(ipr.pb)}) + (${fmt(ipr.pb)} ÷ 1.8)(1 − 0.2×${fmt(pt / ipr.pb, 5)} − 0.8×${fmt(pt / ipr.pb, 5)}²)] = ${fmt(ipr.J, 5)} bbl/d/psi`);
      c.step("Rate at the bubble point and maximum rate", `q_b = ${fmt(ipr.J, 5)} × (${fmt(pr)} − ${fmt(ipr.pb)}) = ${fmt(ipr.qb)} bbl/d;  q_max = ${fmt(ipr.qb)} + ${fmt(ipr.J, 5)} × ${fmt(ipr.pb)} ÷ 1.8 = ${fmt(ipr.qmax)} bbl/d`);
    }
    c.result("qmax", "Maximum rate (pwf = 0), AOF", "vflow", bpdSI(ipr.qmax), ["bpd", "m3d"], true);
    if (!ipr.sat) c.result("J", "Productivity index above pb", "pindex", toSI("pindex", "bpdpsi", ipr.J), ["bpdpsi", "m3dbar"]);
    if (!ipr.sat) c.result("qb", "Rate at the bubble point", "vflow", bpdSI(ipr.qb), ["bpd", "m3d"]);
    if (v.pwf !== null && v.pwf !== undefined) {
      const p = psia(v.pwf);
      if (p >= pr) c.warn("The planned flowing pressure is not below reservoir pressure.");
      else {
        const q = ipr.qOf(p);
        c.step(`Rate at pwf = ${fmt(p)} psia`, `q = ${fmt(q)} bbl/d`);
        c.result("q", "Rate at the planned flowing pressure", "vflow", bpdSI(q), ["bpd", "m3d"], true);
      }
    }
    if (v.q !== null && v.q !== undefined) {
      const q = bpd(v.q);
      if (q >= ipr.qmax) c.warn(`The target rate is at or above the maximum rate of ${fmt(ipr.qmax)} bbl/d.`);
      else {
        const p = ipr.pOf(q);
        c.step(`Flowing pressure for q = ${fmt(q)} bbl/d`, q <= ipr.qb ? `pwf = p̄ − q ÷ J = ${fmt(p)} psia` : `Solve 0.8x² + 0.2x − (1 − (q − q_b) ÷ (J pb/1.8)) = 0:  x = ${fmt(p / ipr.pb, 5)};  pwf = x × ${fmt(ipr.pb)} = ${fmt(p)} psia`);
        c.result("pwfq", "Flowing pressure needed for the target rate", "pabs", kPa(p), ["psia", "bara"], true);
      }
    }
    for (const f of [0.75, 0.5, 0.25]) c.result(`q${f * 100}`, `IPR point: rate at pwf = ${f * 100} % of p̄`, "vflow", bpdSI(ipr.qOf(f * pr)), ["bpd", "m3d"]);
    return c.done();
  },
};

/* ------------------------------------------------------------ gas back-pressure */

const bpInputs: SectionDef["inputs"] = [
  { id: "pr", label: "Average reservoir (shut-in) pressure", sym: "p̄", family: "pabs", unit: "psia", min: 1 },
  { id: "q1", label: "Test 1 gas rate", sym: "q₁", family: "gasflow", unit: "mscfd", min: 0 },
  { id: "p1", label: "Test 1 flowing bottomhole pressure", sym: "pwf₁", family: "pabs", unit: "psia", min: 0 },
  { id: "q2", label: "Test 2 gas rate (or enter n)", sym: "q₂", family: "gasflow", unit: "mscfd", optional: true, min: 0 },
  { id: "p2", label: "Test 2 flowing bottomhole pressure", sym: "pwf₂", family: "pabs", unit: "psia", optional: true, min: 0 },
  { id: "n", label: "Deliverability exponent n (if only one test)", sym: "n", family: "ratio", unit: "x", optional: true, min: 0.3, max: 1.2 },
  { id: "pwf", label: "Flowing pressure to predict the rate at (optional)", sym: "pwf", family: "pabs", unit: "psia", optional: true, min: 0 },
];

/** Atmospheric pressure used for the absolute open flow, psia. */
const P_ATM = P_SC_PSIA;

const backpressure: SectionDef = {
  id: "backpressure",
  title: "Gas well deliverability (back-pressure equation, AOF)",
  question: "From a flow-after-flow test, what are C and n, the absolute open flow, and the rate at a given flowing pressure?",
  formulas: [
    "q = C (p̄² − pwf²)^n",
    "n = log(q₂ ÷ q₁) ÷ log(Δ₂ ÷ Δ₁),  Δ = p̄² − pwf²;   C = q₁ ÷ Δ₁^n",
    "AOF = C (p̄² − 14.696²)^n",
  ],
  inputs: bpInputs,
  example: { title: "Shut-in at 2,000 psia; tests of 1,500 Mscf/d at 1,700 psia and 3,000 Mscf/d at 1,300 psia.", values: { pr: [2000, "psia"], q1: [1500, "mscfd"], p1: [1700, "psia"], q2: [3000, "mscfd"], p2: [1300, "psia"], pwf: [800, "psia"] } },
  refs: [OG.gasWell, OG.gasTest],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("pr", "q1", "p1");
    if (miss.length) return c.missing(miss, labelsOf(bpInputs));
    const pr = psia(c.n("pr")), q1 = mscfd(c.n("q1")), p1 = psia(c.n("p1"));
    const d1 = pr * pr - p1 * p1;
    if (!(d1 > 0)) return c.done("Test flowing pressure must be below reservoir pressure.");
    c.step("Test 1 drawdown", `Δ₁ = ${fmt(pr)}² − ${fmt(p1)}² = ${fmt(d1)} psia²`);
    let n: number;
    if (v.q2 !== null && v.q2 !== undefined && v.p2 !== null && v.p2 !== undefined) {
      const q2 = mscfd(v.q2), p2 = psia(v.p2);
      const d2 = pr * pr - p2 * p2;
      if (!(d2 > 0) || Math.abs(d2 - d1) < 1e-9 * d1 || Math.abs(q2 - q1) < 1e-12) return c.done("Test 2 must have a different rate and a flowing pressure below reservoir pressure.");
      n = Math.log10(q2 / q1) / Math.log10(d2 / d1);
      c.step("Deliverability exponent", `Δ₂ = ${fmt(pr)}² − ${fmt(p2)}² = ${fmt(d2)};  n = log(${fmt(q2)} ÷ ${fmt(q1)}) ÷ log(${fmt(d2)} ÷ ${fmt(d1)}) = ${fmt(n, 5)}`);
      if (!(n > 0)) return c.done("The two tests give a negative exponent: the higher rate must have the lower flowing pressure.");
    } else if (v.n !== null && v.n !== undefined) {
      n = v.n;
      c.step("Deliverability exponent (entered)", `n = ${fmt(n)}`);
    } else return c.done("Enter a second test point, or the exponent n.");
    const C = q1 / d1 ** n;
    c.step("Flow coefficient", `C = ${fmt(q1)} ÷ ${fmt(d1)}^${fmt(n, 5)} = ${C.toPrecision(5)} Mscf/d per psia^${fmt(2 * n, 4)}`);
    const aof = C * (pr * pr - P_ATM * P_ATM) ** n;
    c.step("Absolute open flow", `AOF = ${C.toPrecision(5)} × (${fmt(pr)}² − ${fmt(P_ATM, 5)}²)^${fmt(n, 5)} = ${fmt(aof)} Mscf/d`);
    c.result("n", "Deliverability exponent n", "ratio", n, ["x"], true);
    c.result("C", "Flow coefficient C, Mscf/d per psia^(2n)", "ratio", C, ["x"], true);
    c.result("aof", "Absolute open flow (AOF)", "gasflow", mscfdSI(aof), ["mscfd", "mmscfd", "ksm3d"], true);
    if (v.pwf !== null && v.pwf !== undefined) {
      const p = psia(v.pwf);
      if (p >= pr) c.warn("The flowing pressure must be below reservoir pressure.");
      else {
        const q = C * (pr * pr - p * p) ** n;
        c.step(`Rate at pwf = ${fmt(p)} psia`, `q = ${C.toPrecision(5)} × (${fmt(pr)}² − ${fmt(p)}²)^${fmt(n, 5)} = ${fmt(q)} Mscf/d`);
        c.result("q", "Rate at the flowing pressure", "gasflow", mscfdSI(q), ["mscfd", "mmscfd", "ksm3d"], true);
      }
    }
    if (n < 0.5 || n > 1.0) c.warn("n is normally between 0.5 (fully turbulent) and 1.0 (laminar). Check the test data for unstabilized rates or pressures.");
    if (pr > 2000) c.warn("The pressure-squared form is meant for reservoirs below about 2,000 psia; at higher pressures, pseudo-pressure analysis is more accurate.");
    return c.done();
  },
};

export const wellInflow: UtilityDef = {
  slug: "well-inflow",
  name: "Well Inflow Performance (IPR) Calculator",
  short: "Well inflow (IPR)",
  problem: "How much will this well produce, what is its productivity index, and how much is skin costing?",
  description: "Well inflow calculations: radial Darcy flow productivity index with skin (solve rate, permeability, skin, or flowing pressure), Vogel and composite IPR from one well test, and gas-well back-pressure C and n with absolute open flow (AOF), with every step shown.",
  keywords: "ipr inflow performance relationship vogel productivity index pi skin darcy radial flow 141.2 aof absolute open flow back pressure equation c and n gas well deliverability flow after flow test",
  sheet: "Inflow (IPR)",
  sections: [darcy, vogel, backpressure],
  notes: [
    "Oilfield units: psia, bbl/d, Mscf/d, mD, ft, cP. The 141.2 constant is computed from exact unit definitions.",
    "The back-pressure equation uses absolute pressures; AOF is the rate at an atmospheric flowing pressure at the sandface.",
  ],
};
