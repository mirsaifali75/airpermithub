import { RT } from "../../tools/rule-text";
import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { P_ATM_KPA, R_UNIVERSAL, fmt, fromSI, toSI } from "../units";
import { AIR } from "./refs";

/** Method 19 section 12.1 constants in English units (scf/lb per weight %); K = 10⁶ Btu/million Btu. */
export const M19K = { hd: 3.64, hw: 5.57, c: 1.53, s: 0.57, n: 0.14, o: 0.46, w: 0.21, cc: 0.321 } as const;
/** Table 19-1: ppm to lb/scf. */
export const T191 = { so2: 1.66e-7, nox: 1.194e-7 } as const;

const fIn: InputDef[] = [
  { id: "C", label: "Carbon", sym: "%C", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "H", label: "Hydrogen", sym: "%H", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "S", label: "Sulfur", sym: "%S", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "N", label: "Nitrogen", sym: "%N", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "O", label: "Oxygen", sym: "%O", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "W", label: "Moisture (for F_w only)", sym: "%H₂O", family: "pct", unit: "pct", optional: true, min: 0, max: 100, help: "Leave blank if %H and %O already include the hydrogen and oxygen in the water (Method 19, 12.3.2.1 note)." },
  { id: "gcv", label: "Gross calorific value, same basis as the analysis", sym: "GCV", family: "hv", unit: "btulb", min: 0, help: "Higher heating value of the fuel on the same (dry or as-fired) basis as the ultimate analysis." },
  { id: "gcvw", label: "Gross calorific value for F_w (as-fired basis, optional)", sym: "GCV_w", family: "hv", unit: "btulb", optional: true, min: 0, help: "Blank uses the GCV above." },
];

const ff: SectionDef = {
  id: "f-factor",
  title: "F factors from a fuel's ultimate analysis",
  question: "What are F_d, F_w, and F_c for a fuel that is not in Table 19-2, or for your own fuel analysis?",
  formulas: [
    "Eq. 19-13: F_d = K (3.64 %H + 1.53 %C + 0.57 %S + 0.14 %N − 0.46 %O) ÷ GCV",
    "Eq. 19-14: F_w = K (5.57 %H + 1.53 %C + 0.57 %S + 0.14 %N − 0.46 %O + 0.21 %H₂O) ÷ GCV_w",
    "Eq. 19-15: F_c = K (0.321 %C) ÷ GCV,   K = 10⁶ (scf/10⁶ Btu with GCV in Btu/lb)",
  ],
  inputs: fIn,
  example: { title: "A bituminous coal, dry basis: 75.0 % C, 5.0 % H, 2.5 % S, 1.5 % N, 6.5 % O, 13,500 Btu/lb.", values: { C: [75, "pct"], H: [5, "pct"], S: [2.5, "pct"], N: [1.5, "pct"], O: [6.5, "pct"], gcv: [13500, "btulb"] } },
  refs: [AIR.method19, AIR.method19Pdf],
  quotes: [RT.m19F, RT.m19Determined, RT.m19Gcv, RT.m19K, RT.m19Khd, RT.m19Khw, RT.m19Kc, RT.m19Kcc, RT.m19Ks, RT.m19Kn, RT.m19Ko, RT.m19Kw, RT.m19FwOmit, RT.m19Avg],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("C", "H", "S", "N", "O", "gcv");
    if (miss.length) return c.missing(miss, labelsOf(fIn));
    const C = c.n("C"), H = c.n("H"), S = c.n("S"), N = c.n("N"), O = c.n("O"), W = v.W ?? 0;
    const total = C + H + S + N + O + W;
    if (total > 100.5) return c.done(`The analysis adds up to ${fmt(total)} %, more than 100 %.`);
    const gcv = fromSI("hv", "btulb", c.n("gcv"));
    const gcvw = v.gcvw ? fromSI("hv", "btulb", v.gcvw) : gcv;
    const K = M19K;
    const nd = K.hd * H + K.c * C + K.s * S + K.n * N - K.o * O;
    const nw = K.hw * H + K.c * C + K.s * S + K.n * N - K.o * O + K.w * W;
    const Fd = (1e6 * nd) / gcv, Fw = (1e6 * nw) / gcvw, Fc = (1e6 * K.cc * C) / gcv;
    c.step("Dry F factor", `10⁶ × (3.64×${fmt(H)} + 1.53×${fmt(C)} + 0.57×${fmt(S)} + 0.14×${fmt(N)} − 0.46×${fmt(O)}) ÷ ${fmt(gcv)} = 10⁶ × ${fmt(nd, 6)} ÷ ${fmt(gcv)} = ${fmt(Fd, 5)} dscf/10⁶ Btu`, "Eq. 19-13");
    c.step("Wet F factor", `10⁶ × (5.57×${fmt(H)} + 1.53×${fmt(C)} + 0.57×${fmt(S)} + 0.14×${fmt(N)} − 0.46×${fmt(O)} + 0.21×${fmt(W)}) ÷ ${fmt(gcvw)} = ${fmt(Fw, 5)} wscf/10⁶ Btu`, "Eq. 19-14");
    c.step("Carbon F factor", `10⁶ × 0.321 × ${fmt(C)} ÷ ${fmt(gcv)} = ${fmt(Fc, 5)} scf CO₂/10⁶ Btu`, "Eq. 19-15");
    c.result("fd", "Dry F factor, F_d", "ffac", toSI("ffac", "scfmmbtu", Fd), ["scfmmbtu", "scmj"], true);
    c.result("fw", "Wet F factor, F_w", "ffac", toSI("ffac", "scfmmbtu", Fw), ["scfmmbtu", "scmj"], true);
    c.result("fc", "Carbon F factor, F_c", "ffac", toSI("ffac", "scfmmbtu", Fc), ["scfmmbtu", "scmj"], true);
    c.result("total", "Analysis total (ash and other make up the rest)", "pct", total, ["pct"]);
    if (!(nd > 0)) c.warn("The bracket in Eq. 19-13 is not positive. Check the analysis.");
    if (!v.gcvw && W > 0) c.warn("F_w used the same GCV as F_d. If the analysis is on a dry basis, enter the as-fired GCV for F_w.");
    return c.done();
  },
};

const EQ = [
  { value: 1, label: "Eq. 19-1: O₂ dry, pollutant dry (F_d)" },
  { value: 2, label: "Eq. 19-2: O₂ wet, pollutant wet, ambient moisture B_wa (F_w)" },
  { value: 3, label: "Eq. 19-3: O₂ wet, pollutant wet, stack moisture B_ws (F_d)" },
  { value: 4, label: "Eq. 19-4: pollutant wet, O₂ dry (F_d)" },
  { value: 5, label: "Eq. 19-5: pollutant dry, O₂ wet (F_d)" },
  { value: 6, label: "Eq. 19-6: CO₂ dry, pollutant dry (F_c)" },
  { value: 7, label: "Eq. 19-7: CO₂ wet, pollutant wet (F_c)" },
  { value: 8, label: "Eq. 19-8: pollutant wet, CO₂ dry (F_c)" },
  { value: 9, label: "Eq. 19-9: pollutant dry, CO₂ wet (F_c)" },
];
const NEEDS_B = new Set([2, 3, 4, 5, 8, 9]);

/** Method 19 diluent term for equations 19-1 to 19-9; `d` is %O₂ or %CO₂, `b` the moisture fraction. */
export function m19Factor(eq: number, d: number, b: number) {
  switch (eq) {
    case 1: return 20.9 / (20.9 - d);
    case 2: return 20.9 / (20.9 * (1 - b) - d);
    case 3: return 20.9 / (20.9 * (1 - b) - d);
    case 4: return 20.9 / ((1 - b) * (20.9 - d));
    case 5: return 20.9 / (20.9 - d / (1 - b));
    case 6: return 100 / d;
    case 7: return 100 / d;
    case 8: return 100 / ((1 - b) * d);
    default: return ((1 - b) * 100) / d;
  }
}

const eIn: InputDef[] = [
  { id: "eq", label: "Measurement basis (Method 19 equation)", family: "count", unit: "n", choices: EQ },
  { id: "pol", label: "Pollutant (for a ppm concentration)", family: "count", unit: "n", choices: [{ value: 1, label: "SO₂ (Table 19-1 factor)" }, { value: 2, label: "NOx as NO₂ (Table 19-1 factor)" }, { value: 3, label: "Other: enter molecular weight" }] },
  { id: "ppm", label: "Pollutant concentration, ppm", sym: "C", family: "ppmv", unit: "ppmv", optional: true, min: 0 },
  { id: "mw", label: "Molecular weight (other pollutant)", sym: "MW", family: "ratio", unit: "x", optional: true, min: 1, max: 500, help: "g/mol, e.g. 28.01 for CO. Used only with Other." },
  { id: "cm", label: "Or: pollutant mass concentration", sym: "C", family: "conc", unit: "grscf", optional: true, min: 0, help: "For PM or a value already in mass units. Leave the ppm blank." },
  { id: "F", label: "F factor for this equation (F_d, F_w or F_c)", sym: "F", family: "ffac", unit: "scfmmbtu", min: 0, help: "From Table 19-2, section 1 of this calculator, or your permit." },
  { id: "dil", label: "O₂ or CO₂ concentration for this equation", sym: "%O₂ / %CO₂", family: "pct", unit: "pct", min: 0, max: 100 },
  { id: "b", label: "Moisture fraction, B_ws or B_wa (decimal)", sym: "B", family: "ratio", unit: "x", optional: true, min: 0, max: 0.99, help: "Needed for Eq. 19-2 to 19-5, 19-8 and 19-9. Method 19 allows B_wa = 0.027 at any location." },
];

/** EPA standard molar volume, m³/mol at 293.15 K and 101.325 kPa (40 CFR 60.2). */
export const VM_STD = (R_UNIVERSAL * 293.15) / (P_ATM_KPA * 1000);

const rate: SectionDef = {
  id: "emission-rate",
  title: "Emission rate in lb/MMBtu (Eq. 19-1 to 19-9)",
  question: "What is the emission rate E in lb/MMBtu from a stack concentration, the O₂ or CO₂, and the F factor, on any dry or wet basis?",
  formulas: [
    "19-1: E = C_d F_d × 20.9 ÷ (20.9 − %O₂d)      19-2: E = C_w F_w × 20.9 ÷ (20.9(1 − B_wa) − %O₂w)",
    "19-3: E = C_w F_d × 20.9 ÷ (20.9(1 − B_ws) − %O₂w)      19-4: E = C_w F_d × 20.9 ÷ ((1 − B_ws)(20.9 − %O₂d))",
    "19-5: E = C_d F_d × 20.9 ÷ (20.9 − %O₂w ÷ (1 − B_ws))",
    "19-6, 19-7: E = C F_c × 100 ÷ %CO₂      19-8: E = C_w F_c × 100 ÷ ((1 − B_ws) %CO₂d)      19-9: E = C_d F_c (1 − B_ws) × 100 ÷ %CO₂w",
    "C (lb/scf) = ppm × 1.660 × 10⁻⁷ (SO₂) or × 1.194 × 10⁻⁷ (NOx), Table 19-1",
  ],
  solveNote: "Enter the concentration in ppm or as a mass concentration, not both.",
  inputs: eIn,
  example: { title: "Natural gas boiler: 45 ppm NOx and 3.5 % O₂, both dry, with the Table 19-2 natural gas F_d of 8,710 dscf/10⁶ Btu.", values: { eq: [1, "n"], pol: [2, "n"], ppm: [45, "ppmv"], F: [8710, "scfmmbtu"], dil: [3.5, "pct"] } },
  refs: [AIR.method19, AIR.method19Pdf, AIR.ecfr602],
  quotes: [RT.m19Units, RT.m19So2, RT.m19Nox, RT.m19F, RT.m19FwNote, RT.m19Bwa, RT.m19Avg],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("F", "dil");
    if (miss.length) return c.missing(miss, labelsOf(eIn));
    const eq = v.eq ?? 1;
    const conc = c.blank("ppm", "cm");
    if (conc.length !== 1) return c.done("Enter the pollutant concentration either in ppm or as a mass concentration.");
    let C: number; // kg/m³ at standard conditions
    if (conc[0] === "cm") {
      const pol = v.pol ?? 1;
      const ppm = c.n("ppm");
      if (pol === 3) {
        if (!v.mw) return c.done("Enter the molecular weight of the pollutant.");
        C = (ppm * 1e-6 * v.mw * 1e-3) / VM_STD;
        c.step("Concentration in lb/scf", `${fmt(ppm)} ppm × 10⁻⁶ × ${fmt(v.mw)} g/mol ÷ ${fmt(VM_STD * 1000, 6)} L/mol (20 °C, 760 mm Hg) = ${fmt(fromSI("conc", "lbscf", C), 5)} lb/scf`, "ppm × MW ÷ molar volume");
      } else {
        const f = pol === 1 ? T191.so2 : T191.nox;
        C = toSI("conc", "lbscf", ppm * f);
        c.step("Concentration in lb/scf (Table 19-1)", `${fmt(ppm)} ppm × ${f.toExponential(3)} = ${fmt(ppm * f, 5)} lb/scf`);
      }
    } else {
      C = c.n("cm");
      c.step("Concentration in lb/scf", `${fmt(fromSI("conc", "lbscf", C), 5)} lb/scf`);
    }
    const d = c.n("dil");
    if (NEEDS_B.has(eq) && (v.b === null || v.b === undefined)) return c.done(`Eq. 19-${eq} needs the moisture fraction ${eq === 2 ? "B_wa" : "B_ws"}.`);
    const b = v.b ?? 0;
    if (eq <= 5 && d >= 20.9) return c.done("O₂ must be below 20.9 %.");
    if (eq >= 6 && !(d > 0)) return c.done("CO₂ must be greater than zero.");
    const k = m19Factor(eq, d, b);
    if (!(k > 0) || !Number.isFinite(k)) return c.done("The diluent term is zero or negative for these O₂ and moisture values. Check the basis: wet O₂ cannot exceed 20.9 × (1 − B).");
    const F = c.n("F");
    const E = C * F * k * 1e12; // kg/m³ × m³/J → kg/J → ng/J
    c.step(`Diluent term, Eq. 19-${eq}`, `${fmt(k, 6)}`, EQ[eq - 1].label.split(": ")[1]);
    c.step("Emission rate", `E = ${fmt(fromSI("conc", "lbscf", C), 5)} lb/scf × ${fmt(fromSI("ffac", "scfmmbtu", F), 6)} scf/10⁶ Btu × ${fmt(k, 6)} = ${fmt(fromSI("ef", "lbmmbtu", E), 5)} lb/MMBtu`, "E = C × F × diluent term");
    c.result("e", "Emission rate, E", "ef", E, ["lbmmbtu", "ngj"], true);
    c.result("c", "Pollutant concentration", "conc", C, ["lbscf", "mgscm", "ngscm"]);
    c.result("k", "Diluent correction term", "ratio", k, ["x"]);
    if (eq === 2) c.warn("Eq. 19-2 uses F_w. F_w procedures do not apply to units with wet scrubbers or other processes that add water (Method 19, 12.2).");
    if ((v.pol ?? 1) === 2 && conc[0] === "cm") c.warn("Table 19-1 expresses NOx as NO₂.");
    return c.done();
  },
};

const mIn: InputDef[] = [
  { id: "e", label: "Emission rate, E", sym: "E", family: "ef", unit: "lbmmbtu", min: 0 },
  { id: "hi", label: "Heat input rate", sym: "H", family: "power", unit: "mmbtuh", min: 0, help: "Use the heat input basis (HHV) that matches the F factor." },
  { id: "hrs", label: "Operating hours per year", sym: "t", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
];

const mass: SectionDef = {
  id: "mass-rate",
  title: "Mass emission rate from E and heat input",
  question: "How many lb/h and tons per year is that emission rate at this heat input?",
  formulas: ["lb/h = E (lb/MMBtu) × heat input (MMBtu/h)", "tons/yr = lb/h × hours ÷ 2,000"],
  inputs: mIn,
  example: { title: "0.0562 lb/MMBtu at 250 MMBtu/h for 8,760 hours.", values: { e: [0.0562, "lbmmbtu"], hi: [250, "mmbtuh"], hrs: [8760, "h"] } },
  refs: [AIR.method19, AIR.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("e", "hi");
    if (miss.length) return c.missing(miss, labelsOf(mIn));
    const E = fromSI("ef", "lbmmbtu", c.n("e")), H = fromSI("power", "mmbtuh", c.n("hi"));
    const lbh = E * H;
    c.step("Mass rate", `${fmt(E, 5)} × ${fmt(H)} = ${fmt(lbh, 5)} lb/h`);
    c.result("lbh", "Mass emission rate", "erate", toSI("erate", "lbh", lbh), ["lbh", "kgh"], true);
    if (v.hrs !== null && v.hrs !== undefined) {
      const h = v.hrs / 3600;
      const t = (lbh * h) / 2000;
      c.step("Annual emissions", `${fmt(lbh, 5)} lb/h × ${fmt(h)} h ÷ 2,000 = ${fmt(t, 5)} tons/yr`);
      c.result("tpy", "Annual emissions at these hours", "erate", toSI("erate", "lbyr", lbh * h), ["tpy", "tonnepy"], true);
    }
    return c.done();
  },
};

const comboIn: InputDef[] = [];
for (let k = 1; k <= 3; k++) {
  comboIn.push({ id: `x${k}`, label: `Fuel ${k}: share of total heat input`, sym: `X${k}`, family: "pct", unit: "pct", optional: k > 2, min: 0, max: 100 });
  comboIn.push({ id: `f${k}`, label: `Fuel ${k}: F factor`, sym: `F${k}`, family: "ffac", unit: "scfmmbtu", optional: k > 2, min: 0 });
}

const combo: SectionDef = {
  id: "fuel-mix",
  title: "F factor for a combination of fuels",
  question: "What F factor applies when two or three fuels are fired together?",
  formulas: ["Eq. 19-16 to 19-18: F = Σ Xₖ Fₖ   (use all F_d, all F_w, or all F_c)", "Xₖ = fraction of total heat input from fuel k; the fractions add to 1"],
  inputs: comboIn,
  example: { title: "70 % of heat input from natural gas (F_d 8,710) and 30 % from oil (F_d 9,190).", values: { x1: [70, "pct"], f1: [8710, "scfmmbtu"], x2: [30, "pct"], f2: [9190, "scfmmbtu"] } },
  refs: [AIR.method19, AIR.method19Pdf],
  quotes: [RT.m19Combo, RT.m19Xk],
  compute(v) {
    const c = new Calc(v);
    const used: { k: number; x: number; f: number }[] = [];
    for (let k = 1; k <= 3; k++) {
      const x = v[`x${k}`], f = v[`f${k}`];
      if ((x === null || x === undefined) !== (f === null || f === undefined)) return c.done(`Fuel ${k} needs both its heat input share and its F factor.`);
      if (x !== null && x !== undefined && f !== null && f !== undefined) used.push({ k, x, f });
    }
    if (used.length < 2) return c.done("Enter at least two fuels.");
    const sx = used.reduce((a, u) => a + u.x, 0);
    if (Math.abs(sx - 100) > 0.5) return c.done(`The heat input shares add to ${fmt(sx)} %; they must add to 100 %.`);
    const F = used.reduce((a, u) => a + (u.x / 100) * u.f, 0);
    c.step("Weighted F factor", used.map((u) => `${fmt(u.x / 100, 4)} × ${fmt(fromSI("ffac", "scfmmbtu", u.f), 6)}`).join(" + ") + ` = ${fmt(fromSI("ffac", "scfmmbtu", F), 6)} scf/10⁶ Btu`, "Σ Xₖ Fₖ");
    c.result("f", "Combined F factor", "ffac", F, ["scfmmbtu", "scmj"], true);
    return c.done();
  },
};

export const method19: UtilityDef = {
  slug: "method-19-f-factor",
  name: "EPA Method 19 F-Factor & Emission Rate Calculator",
  short: "Method 19 F factors",
  problem: "What is my emission rate in lb/MMBtu from the stack test or CEMS numbers, and what F factor applies to my fuel?",
  description: "EPA Method 19 (40 CFR Part 60, Appendix A-7) with every step shown: F_d, F_w and F_c from a fuel's ultimate analysis (Eq. 19-13 to 19-15), emission rate E in lb/MMBtu by all nine O₂ and CO₂ equations on dry, wet and mixed bases (Eq. 19-1 to 19-9), Table 19-1 ppm conversions, mixed-fuel F factors, and lb/h and tons per year.",
  keywords: "method 19 f factor fd fw fc dscf/mmbtu lb/mmbtu emission rate ppm to lb/mmbtu o2 correction co2 f factor wet basis dry basis bws bwa ultimate analysis gcv table 19-2 table 19-1 nox so2 cems stack test 40 cfr 60 appendix a-7",
  sheet: "Method 19",
  sections: [ff, rate, combo, mass],
  notes: [
    "Equations are Method 19 as published in eCFR; Eq. 19-5 is the March 29, 2023 revision.",
    "English-unit constants are used (scf/lb per percent; GCV in Btu/lb), exactly as section 12.1 lists them.",
    "Standard conditions are 20 °C and 760 mm Hg (40 CFR 60.2) for ppm conversions of other pollutants.",
    "No F factor is prefilled. Table 19-2 values appear only in worked examples, which are labeled.",
  ],
};
