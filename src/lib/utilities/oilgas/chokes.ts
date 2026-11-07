import { Calc, labelsOf } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { R_UNIVERSAL, fmt, fromSI, toSI } from "../units";
import { M_AIR_G, gasState, degR, kPa, psia } from "./core";
import { OG } from "./refs";

/** Critical-flow choke coefficients, p_wh (psig) = a R^b q ÷ S^c with R scf/STB, q STB/d, S in 64ths. */
export const CHOKE_SETS = [
  { value: 1, label: "Gilbert (1954): a 10.0, b 0.546, c 1.89", a: 10.0, b: 0.546, c: 1.89 },
  { value: 2, label: "Baxendell (1958): a 9.56, b 0.546, c 1.93", a: 9.56, b: 0.546, c: 1.93 },
  { value: 3, label: "Ros (1960): a 17.40, b 0.500, c 2.00", a: 17.4, b: 0.5, c: 2.0 },
  { value: 4, label: "Achong (1961): a 3.82, b 0.650, c 1.88", a: 3.82, b: 0.65, c: 1.88 },
] as const;

const liqIn: SectionDef["inputs"] = [
  { id: "set", label: "Correlation", family: "count", unit: "n", choices: CHOKE_SETS.map(({ value, label }) => ({ value, label })) },
  { id: "pwh", label: "Wellhead (upstream) pressure", sym: "p_wh", family: "pabs", unit: "psig", solvable: true, min: 101.325 },
  { id: "q", label: "Liquid rate (oil + water)", sym: "q", family: "vflow", unit: "bpd", solvable: true, min: 0 },
  { id: "S", label: "Choke (bean) size", sym: "S", family: "diam", unit: "in64", solvable: true, min: 0.0002, max: 0.2 },
  { id: "glr", label: "Gas-liquid ratio", sym: "R", family: "gor", unit: "scfbbl", min: 0.01 },
  { id: "pdn", label: "Downstream (flowline) pressure, to check critical flow (optional)", sym: "p_dn", family: "pabs", unit: "psig", optional: true, min: 0 },
];

const liquid: SectionDef = {
  id: "gilbert",
  title: "Wellhead choke for oil wells (Gilbert-type)",
  question: "What bean size gives this rate, or what rate and wellhead pressure go with this bean?",
  formulas: ["p_wh = a R^b q ÷ S^c   (p_wh psig, R scf/STB, q STB/d, S in 64ths of an inch)", "Gilbert a = 10.0, b = 0.546, c = 1.89"],
  solveNote: "Leave one of wellhead pressure, liquid rate, or choke size blank.",
  inputs: liqIn,
  example: { title: "400 bbl/d with a GLR of 800 scf/bbl through a 16/64 in bean.", values: { set: [1, "n"], q: [400, "bpd"], S: [16, "in64"], glr: [800, "scfbbl"], pdn: [150, "psig"] } },
  refs: [OG.chokes],
  compute(v) {
    const c = new Calc(v);
    if (c.blank("glr").length) return c.missing(["glr"], labelsOf(liqIn));
    const set = CHOKE_SETS.find((s) => s.value === (v.set ?? 1)) ?? CHOKE_SETS[0];
    const b = c.blank("pwh", "q", "S");
    if (b.length !== 1) return c.done("Leave exactly one of wellhead pressure, liquid rate, or choke size blank.");
    const R = fromSI("gor", "scfbbl", c.n("glr"));
    let p = v.pwh === null ? NaN : fromSI("pabs", "psig", c.n("pwh"));
    let q = v.q === null ? NaN : fromSI("vflow", "bpd", c.n("q"));
    let S = v.S === null ? NaN : fromSI("diam", "in64", c.n("S"));
    const Rb = R ** set.b;
    c.step("Gas-liquid term", `R^b = ${fmt(R)}^${set.b} = ${fmt(Rb, 5)}`);
    c.solved = b[0];
    if (b[0] === "pwh") {
      p = (set.a * Rb * q) / S ** set.c;
      c.step("Wellhead pressure", `p_wh = ${set.a} × ${fmt(Rb, 5)} × ${fmt(q)} ÷ ${fmt(S)}^${set.c} = ${fmt(p)} psig`);
    } else if (b[0] === "q") {
      if (!(p > 0)) return c.done("Wellhead pressure must be above 0 psig.");
      q = (p * S ** set.c) / (set.a * Rb);
      c.step("Liquid rate", `q = p_wh S^c ÷ (a R^b) = ${fmt(p)} × ${fmt(S)}^${set.c} ÷ (${set.a} × ${fmt(Rb, 5)}) = ${fmt(q)} bbl/d`);
    } else {
      if (!(p > 0)) return c.done("Wellhead pressure must be above 0 psig.");
      S = ((set.a * Rb * q) / p) ** (1 / set.c);
      c.step("Choke size", `S = (a R^b q ÷ p_wh)^(1/c) = (${set.a} × ${fmt(Rb, 5)} × ${fmt(q)} ÷ ${fmt(p)})^(1/${set.c}) = ${fmt(S)} /64 in`);
    }
    if (!(q > 0) || !(S > 0) || !(p > 0)) return c.done("These inputs give no flow. Check the values.");
    c.result("pwh", "Wellhead pressure", "pabs", toSI("pabs", "psig", p), ["psig", "barg"], b[0] === "pwh");
    c.result("q", "Liquid rate", "vflow", toSI("vflow", "bpd", q), ["bpd", "m3d"], b[0] === "q");
    c.result("S", "Choke size", "diam", toSI("diam", "in64", S), ["in64", "in", "mm"], b[0] === "S");
    c.result("Sr", "Next standard size up, 64ths", "ratio", Math.ceil(S - 1e-9), ["x"]);
    c.result("gas", "Gas rate through the choke", "gasflow", toSI("gasflow", "scfd", q * R), ["mscfd", "ksm3d"]);
    if (v.pdn !== null && v.pdn !== undefined) {
      const ratio = v.pdn / toSI("pabs", "psig", p);
      c.step("Critical-flow check", `p_dn ÷ p_wh (absolute) = ${fmt(ratio, 4)}`);
      c.result("ratio", "Downstream ÷ upstream pressure (absolute)", "ratio", ratio, ["x"]);
      if (ratio > 0.5) c.warn("Downstream pressure is more than about half the upstream pressure (absolute), so flow may not be critical. These correlations assume critical flow and then overstate the rate.");
    }
    if (b[0] === "S" && S < 4) c.warn("Choke sizes below about 4/64 in are outside the data these correlations came from.");
    return c.done();
  },
};

const gasIn: SectionDef["inputs"] = [
  { id: "p1", label: "Upstream pressure", sym: "p₁", family: "pabs", unit: "psia", min: 1 },
  { id: "p2", label: "Downstream pressure", sym: "p₂", family: "pabs", unit: "psia", min: 0 },
  { id: "t1", label: "Upstream temperature", sym: "T₁", family: "temp", unit: "f", min: -40, max: 400 },
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 1.8 },
  { id: "k", label: "Ratio of specific heats cp/cv", sym: "k", family: "ratio", unit: "x", min: 1.05, max: 1.67, help: "About 1.25–1.31 for natural gas near ambient temperature; use the value for your gas." },
  { id: "cd", label: "Discharge coefficient", sym: "Cd", family: "ratio", unit: "x", min: 0.1, max: 1, help: "From the choke maker's data or a calibration; sharp-edged beans are lower than nozzles." },
  { id: "d", label: "Choke (bean) size", sym: "d", family: "diam", unit: "in64", solvable: true, min: 0.0002, max: 0.2 },
  { id: "q", label: "Gas rate", sym: "q", family: "gasflow", unit: "mscfd", solvable: true, min: 0 },
  { id: "z", label: "Upstream Z-factor (blank = calculated)", sym: "Z₁", family: "ratio", unit: "x", optional: true, min: 0.2, max: 1.5 },
];

const gasChoke: SectionDef = {
  id: "gas-choke",
  title: "Gas flow through a choke or orifice (critical and subcritical)",
  question: "How much gas will pass through this choke, or what size passes this rate?",
  formulas: [
    "r = max(p₂ ÷ p₁, r_c),   r_c = (2 ÷ (k + 1))^(k ÷ (k − 1))",
    "ṁ = Cd A p₁ √( (2k ÷ (k − 1)) × M ÷ (Z₁ R T₁) × (r^(2/k) − r^((k+1)/k)) )",
    "At r = r_c this equals the choked-flow equation  ṁ = Cd A p₁ √(k M ÷ (Z R T)) (2 ÷ (k + 1))^((k+1) ÷ (2(k−1)))",
  ],
  solveNote: "Leave the choke size or the gas rate blank.",
  inputs: gasIn,
  example: { title: "0.65 gravity gas at 1,000 psia and 100 °F through a 24/64 in choke to 400 psia; k 1.28, Cd 0.85.", values: { p1: [1000, "psia"], p2: [400, "psia"], t1: [100, "f"], gamma: [0.65, "x"], k: [1.28, "x"], cd: [0.85, "x"], d: [24, "in64"] } },
  refs: [OG.nasaChoke, OG.realGases],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("p1", "p2", "t1", "gamma", "k", "cd");
    if (miss.length) return c.missing(miss, labelsOf(gasIn));
    const b = c.blank("d", "q");
    if (b.length !== 1) return c.done("Leave either the choke size or the gas rate blank.");
    const p1 = c.n("p1") * 1000, p2 = c.n("p2") * 1000, k = c.n("k"), T = c.n("t1") + 273.15;
    if (!(p2 < p1)) return c.done("Downstream pressure must be below upstream pressure.");
    const M = (c.n("gamma") * M_AIR_G) / 1000;
    let Z = v.z ?? NaN;
    if (v.z === null || v.z === undefined) {
      const st = gasState(psia(c.n("p1")), degR(c.n("t1")), { gamma: c.n("gamma") });
      if (!st.ok) return c.done("The Z-factor equation has no solution here. Enter Z.");
      Z = st.z;
      c.step("Upstream Z-factor", `Sutton pseudo-criticals and Dranchuk & Abou-Kassem: Z₁ = ${fmt(Z, 5)}`);
    }
    const rc = (2 / (k + 1)) ** (k / (k - 1));
    const r0 = p2 / p1;
    const crit = r0 <= rc;
    const r = crit ? rc : r0;
    c.step("Flow regime", `r_c = (2 ÷ ${fmt(k + 1)})^(${fmt(k)} ÷ ${fmt(k - 1)}) = ${fmt(rc, 5)};  p₂ ÷ p₁ = ${fmt(r0, 5)} → ${crit ? "critical (choked): the rate does not depend on p₂" : "subcritical"}`);
    const G = Math.sqrt(((2 * k) / (k - 1)) * (M / (Z * R_UNIVERSAL * T)) * (r ** (2 / k) - r ** ((k + 1) / k)));
    c.step("Mass flux per unit area per unit Cd", `G = p₁ √(...) = ${fmt(p1)} Pa × ${fmt(G, 5)} = ${fmt(p1 * G)} kg/(s·m²)`);
    let A: number, md: number;
    if (b[0] === "q") {
      A = (Math.PI * c.n("d") ** 2) / 4;
      md = c.n("cd") * A * p1 * G;
      c.solved = "q";
      c.step("Gas rate", `A = π × ${fmt(c.n("d") * 1000, 5)} mm² ÷ 4 = ${fmt(A * 1e6, 5)} mm²;  ṁ = ${fmt(c.n("cd"))} × ${fmt(A, 5)} × ${fmt(p1 * G)} = ${fmt(md, 5)} kg/s = ${fmt(md / M)} mol/s = ${fmt(fromSI("gasflow", "mscfd", md / M))} Mscf/d`);
    } else {
      md = c.n("q") * M;
      A = md / (c.n("cd") * p1 * G);
      c.solved = "d";
      c.step("Choke size", `ṁ = ${fmt(md, 5)} kg/s;  A = ṁ ÷ (Cd p₁ G) = ${fmt(A * 1e6, 5)} mm²;  d = √(4A ÷ π) = ${fmt(Math.sqrt((4 * A) / Math.PI) * 1000, 5)} mm = ${fmt(fromSI("diam", "in64", Math.sqrt((4 * A) / Math.PI)))} /64 in`);
    }
    const d = Math.sqrt((4 * A) / Math.PI);
    c.result("q", "Gas rate", "gasflow", md / M, ["mscfd", "mmscfd", "ksm3d"], b[0] === "q");
    c.result("d", "Choke size", "diam", d, ["in64", "in", "mm"], b[0] === "d");
    c.result("crit", "Flow is critical (1 = yes, 0 = no)", "ratio", crit ? 1 : 0, ["x"], true);
    c.result("rc", "Critical pressure ratio", "ratio", rc, ["x"]);
    c.result("z", "Upstream Z-factor", "ratio", Z, ["x"]);
    c.result("p2max", "Highest downstream pressure that keeps flow critical", "pabs", (p1 * rc) / 1000, ["psia", "bara"]);
    void kPa;
    return c.done();
  },
};

export const chokes: UtilityDef = {
  slug: "choke-calculator",
  name: "Wellhead Choke Calculator (Oil and Gas)",
  short: "Chokes",
  problem: "What bean size do I need, and what rate and wellhead pressure go with it?",
  description: "Wellhead choke sizing: Gilbert, Baxendell, Ros, and Achong critical-flow correlations for oil wells (solve wellhead pressure, rate, or bean size), and compressible gas flow through a choke or orifice with the critical-flow check, with every step shown.",
  keywords: "choke size bean size gilbert correlation ros baxendell achong wellhead choke critical flow gas choke orifice 64ths choked flow critical pressure ratio",
  sheet: "Chokes",
  sections: [liquid, gasChoke],
  notes: [
    "Gilbert-type correlations hold for critical (choked) multiphase flow; check that downstream pressure is well below upstream.",
    "Gas choke flow treats the gas as ideal with a constant Z at upstream conditions and isentropic expansion, with a discharge coefficient for the real choke.",
  ],
};
