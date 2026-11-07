import { Calc, labelsOf } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { M_AIR, fmt } from "../units";
import { LBFT3, M_AIR_G, P_SC_PSIA, T_SC_R, dak, dakRange, degR, kPa, lge, psia, sutton, wichertAziz } from "./core";
import { OG } from "./refs";

/** Components: molar mass (g/mol), critical temperature (K) and pressure (kPa), from the reference equations of state in the NIST WebBook. */
export const COMPONENTS = [
  { id: "n2", name: "Nitrogen (N₂)", M: 28.0135, Tc: 126.192, Pc: 3395.8, voc: false, hap: false },
  { id: "co2", name: "Carbon dioxide (CO₂)", M: 44.0098, Tc: 304.1282, Pc: 7377.3, voc: false, hap: false },
  { id: "h2s", name: "Hydrogen sulfide (H₂S)", M: 34.0809, Tc: 373.1, Pc: 9000.0, voc: false, hap: false },
  { id: "c1", name: "Methane (C₁)", M: 16.0428, Tc: 190.564, Pc: 4599.2, voc: false, hap: false },
  { id: "c2", name: "Ethane (C₂)", M: 30.069, Tc: 305.322, Pc: 4872.2, voc: false, hap: false },
  { id: "c3", name: "Propane (C₃)", M: 44.0956, Tc: 369.89, Pc: 4251.2, voc: true, hap: false },
  { id: "ic4", name: "Isobutane (i-C₄)", M: 58.1222, Tc: 407.81, Pc: 3629.0, voc: true, hap: false },
  { id: "nc4", name: "n-Butane (n-C₄)", M: 58.1222, Tc: 425.125, Pc: 3796.0, voc: true, hap: false },
  { id: "ic5", name: "Isopentane (i-C₅)", M: 72.1488, Tc: 460.35, Pc: 3378.0, voc: true, hap: false },
  { id: "nc5", name: "n-Pentane (n-C₅)", M: 72.1488, Tc: 469.7, Pc: 3367.5, voc: true, hap: false },
  { id: "nc6", name: "n-Hexane (C₆, a HAP)", M: 86.1754, Tc: 507.82, Pc: 3044.1, voc: true, hap: true },
  { id: "bz", name: "Benzene (HAP)", M: 78.1118, Tc: 562.02, Pc: 4906.3, voc: true, hap: true },
  { id: "tol", name: "Toluene (HAP)", M: 92.1384, Tc: 591.75, Pc: 4126.3, voc: true, hap: true },
  { id: "eb", name: "Ethylbenzene (HAP)", M: 106.165, Tc: 617.12, Pc: 3622.4, voc: true, hap: true },
  { id: "xyl", name: "Xylenes (HAP, as m-xylene)", M: 106.165, Tc: 616.89, Pc: 3534.6, voc: true, hap: true },
  { id: "c7", name: "Heptanes plus (C₇+, as n-heptane)", M: 100.202, Tc: 540.13, Pc: 2736.0, voc: true, hap: false },
] as const;

const compInputs: SectionDef["inputs"] = [
  ...COMPONENTS.map((c) => ({ id: c.id, label: c.name, family: "pct" as const, unit: "pct", optional: true, min: 0, max: 100 })),
  { id: "p", label: "Pressure for Z and density (optional)", sym: "p", family: "pabs", unit: "psia", optional: true, min: 1 },
  { id: "t", label: "Temperature for Z and density (optional)", sym: "T", family: "temp", unit: "f", optional: true, min: -100, max: 500 },
];

const composition: SectionDef = {
  id: "composition",
  title: "Gas analysis: molecular weight, gravity, VOC and HAP weight %",
  question: "From a gas analysis (mole %), what are the molecular weight, specific gravity, pseudo-critical properties, and the VOC and HAP weight percent for a permit application?",
  formulas: [
    "M = Σ yᵢ Mᵢ,   γg = M ÷ 28.9647",
    "Kay's rule: Tpc = Σ yᵢ Tcᵢ,   Ppc = Σ yᵢ Pcᵢ",
    "Wichert-Aziz: ε = 120(A^0.9 − A^1.6) + 15(B^0.5 − B^4),  A = y_CO₂ + y_H₂S,  B = y_H₂S",
    "wᵢ = yᵢ Mᵢ ÷ M;   VOC wt % = Σ w (C₃ and heavier);   HAP wt % = Σ w (hexane, BTEX)",
  ],
  solveNote: "Enter the mole % from the lab report in the boxes you have; leave the rest blank. The total is normalized to 100 %.",
  inputs: compInputs,
  example: {
    title: "A sweet natural gas analysis with 1.5 % CO₂ and trace BTEX, Z at 1,000 psia and 120 °F.",
    values: { n2: [1.0, "pct"], co2: [1.5, "pct"], c1: [85.0, "pct"], c2: [6.5, "pct"], c3: [3.0, "pct"], ic4: [0.6, "pct"], nc4: [0.9, "pct"], ic5: [0.3, "pct"], nc5: [0.3, "pct"], nc6: [0.25, "pct"], bz: [0.02, "pct"], tol: [0.03, "pct"], eb: [0.005, "pct"], xyl: [0.02, "pct"], c7: [0.575, "pct"], p: [1000, "psia"], t: [120, "f"] },
  },
  refs: [OG.nist, OG.realGases, OG.voc, OG.hap],
  compute(v) {
    const c = new Calc(v);
    const ys = COMPONENTS.map((k) => ({ ...k, y: v[k.id] ?? 0 }));
    const sum = ys.reduce((a, k) => a + k.y, 0);
    if (!(sum > 0)) return c.done("Enter the mole % of at least one component.");
    if (sum < 90 || sum > 110) return c.done(`The components add up to ${fmt(sum)} %. Check the analysis; it should total about 100 %.`);
    c.step("Total of the analysis", `Σ y = ${fmt(sum)} %${Math.abs(sum - 100) > 1e-9 ? ", normalized to 100 %" : ""}`);
    if (Math.abs(sum - 100) > 0.5) c.warn(`The analysis totals ${fmt(sum)} %, not 100 %. Results use the normalized analysis.`);
    const y = ys.map((k) => ({ ...k, x: k.y / sum }));
    const M = y.reduce((a, k) => a + k.x * k.M, 0);
    c.step("Molecular weight", `M = ${y.filter((k) => k.x > 0).map((k) => `${fmt(k.x, 4)}×${fmt(k.M, 5)}`).join(" + ")} = ${fmt(M)} g/mol`, "M = Σ yᵢMᵢ");
    const gamma = M / M_AIR_G;
    c.step("Specific gravity (air = 1)", `γg = ${fmt(M)} ÷ ${fmt(M_AIR_G, 6)} = ${fmt(gamma)}`);
    const TcK = y.reduce((a, k) => a + k.x * k.Tc, 0);
    const PcK = y.reduce((a, k) => a + k.x * k.Pc, 0);
    const Tpc0 = TcK * 1.8, Ppc0 = psia(PcK);
    c.step("Kay's rule pseudo-criticals", `Tpc = Σ yᵢTcᵢ = ${fmt(TcK)} K = ${fmt(Tpc0)} °R;  Ppc = Σ yᵢPcᵢ = ${fmt(PcK)} kPa = ${fmt(Ppc0)} psia`);
    const yc = y.find((k) => k.id === "co2")!.x, yh = y.find((k) => k.id === "h2s")!.x;
    let Tpc = Tpc0, Ppc = Ppc0;
    if (yc + yh > 0) {
      const w = wichertAziz(Tpc0, Ppc0, yc, yh);
      Tpc = w.Tpc;
      Ppc = w.Ppc;
      c.step("Wichert-Aziz correction for CO₂ and H₂S", `A = ${fmt(yc + yh)}, B = ${fmt(yh)};  ε = ${fmt(w.eps)} °R;  Tpc′ = ${fmt(Tpc0)} − ${fmt(w.eps)} = ${fmt(Tpc)} °R;  Ppc′ = ${fmt(Ppc0)} × ${fmt(Tpc)} ÷ (${fmt(Tpc0)} + ${fmt(yh)}(1 − ${fmt(yh)})${fmt(w.eps)}) = ${fmt(Ppc)} psia`);
    }
    const w = y.map((k) => ({ ...k, w: (k.x * k.M) / M }));
    const voc = w.filter((k) => k.voc).reduce((a, k) => a + k.w, 0) * 100;
    const hap = w.filter((k) => k.hap).reduce((a, k) => a + k.w, 0) * 100;
    const inert = w.filter((k) => ["n2", "co2", "h2s"].includes(k.id)).reduce((a, k) => a + k.w, 0) * 100;
    c.step("Weight fractions", w.filter((k) => k.x > 0).map((k) => `${k.name.split(" (")[0]} ${fmt(k.w * 100, 4)} %`).join("; "), "wᵢ = yᵢMᵢ ÷ M");
    c.step("VOC and HAP", `VOC (propane and heavier) = ${fmt(voc)} wt %;  HAP (hexane + BTEX) = ${fmt(hap)} wt %`);
    c.result("M", "Molecular weight, g/mol", "ratio", M, ["x"], true);
    c.result("gamma", "Specific gravity (air = 1)", "ratio", gamma, ["x"], true);
    c.result("voc", "VOC, weight %", "pct", voc, ["pct"], true);
    c.result("hap", "HAP (hexane + BTEX), weight %", "pct", hap, ["pct"], true);
    c.result("inert", "N₂ + CO₂ + H₂S, weight %", "pct", inert, ["pct"]);
    c.result("tpc", "Pseudo-critical temperature (corrected)", "temp", Tpc / 1.8 - 273.15, ["r", "f", "k"]);
    c.result("ppc", "Pseudo-critical pressure (corrected)", "pabs", kPa(Ppc), ["psia", "kpaa"]);
    const rhoSc = ((101.325e3 * (M / 1000)) / (8.314462618 * (T_SC_R / 1.8))) / LBFT3;
    c.result("rhosc", "Density at 60 °F and 14.696 psia", "rho", rhoSc * LBFT3, ["lbft3", "kgm3"]);
    void P_SC_PSIA;
    if (v.p !== null && v.p !== undefined && v.t !== null && v.t !== undefined) {
      const TR = degR(v.t), p = psia(v.p);
      const Tpr = TR / Tpc, Ppr = p / Ppc;
      const d = dak(Tpr, Ppr);
      c.step("Reduced properties", `Tpr = ${fmt(TR)} ÷ ${fmt(Tpc)} = ${fmt(Tpr)};  Ppr = ${fmt(p)} ÷ ${fmt(Ppc)} = ${fmt(Ppr)}`);
      if (!d.ok) return c.done("The Z-factor equation has no solution at these reduced conditions. Check the pressure and temperature.");
      c.step("Z-factor (Dranchuk & Abou-Kassem)", `Newton's method on ρr: ρr = ${fmt(d.rhoR, 5)};  Z = 0.27 Ppr ÷ (ρr Tpr) = ${fmt(d.z, 5)}`);
      const rho = (v.p * 1000 * (M / 1000)) / (d.z * 8.314462618 * (v.t + 273.15));
      c.step("Density at p and T", `ρ = pM ÷ (ZRT) = ${fmt(rho)} kg/m³ = ${fmt(rho / LBFT3)} lb/ft³`);
      c.result("z", "Z-factor at p and T", "ratio", d.z, ["x"], true);
      c.result("rho", "Gas density at p and T", "rho", rho, ["lbft3", "kgm3"]);
      if (!dakRange(Tpr, Ppr)) c.warn("Tpr or Ppr is outside the range the Z-factor equation was fitted to (Tpr 1.0–3.0, Ppr 0.2–30).");
    }
    if (y.find((k) => k.id === "c7")!.x > 0) c.warn("Heptanes plus are treated as n-heptane. If the lab reports C₇+ molecular weight, a heavier fraction raises VOC weight % and molecular weight.");
    return c.done();
  },
};

const zInputs: SectionDef["inputs"] = [
  { id: "p", label: "Pressure", sym: "p", family: "pabs", unit: "psia", min: 1 },
  { id: "t", label: "Temperature", sym: "T", family: "temp", unit: "f", min: -100, max: 500 },
  { id: "gamma", label: "Gas specific gravity (air = 1)", sym: "γg", family: "ratio", unit: "x", min: 0.55, max: 2.0 },
  { id: "co2", label: "CO₂, mole %", family: "pct", unit: "pct", optional: true, min: 0, max: 80 },
  { id: "h2s", label: "H₂S, mole %", family: "pct", unit: "pct", optional: true, min: 0, max: 80 },
  { id: "tpc", label: "Pseudo-critical temperature (optional, from a gas analysis)", sym: "Tpc", family: "temp", unit: "r", optional: true, help: "Leave blank to use Sutton's correlation with the gravity. Enter it (and Ppc) from section 1 to use the full analysis." },
  { id: "ppc", label: "Pseudo-critical pressure (optional)", sym: "Ppc", family: "pabs", unit: "psia", optional: true, min: 100 },
];

const zfactor: SectionDef = {
  id: "z-factor",
  title: "Z-factor, density, formation volume factor, and viscosity",
  question: "What are Z, density, Bg, and viscosity of this gas at line or reservoir conditions?",
  formulas: [
    "Sutton: Tpc = 169.2 + 349.5γg − 74.0γg²  (°R),   Ppc = 756.8 − 131.07γg − 3.6γg²  (psia)",
    "Tpr = T ÷ Tpc,   Ppr = p ÷ Ppc;   Z from Dranchuk & Abou-Kassem",
    "ρ = pM ÷ (ZRT),   Bg = (p_sc ÷ T_sc) Z T ÷ p",
    "Lee-Gonzalez-Eakin: μg = 10⁻⁴ K exp(X ρ^Y)",
  ],
  inputs: zInputs,
  example: { title: "0.70 gravity gas with 2 % CO₂ at 2,000 psia and 180 °F.", values: { p: [2000, "psia"], t: [180, "f"], gamma: [0.7, "x"], co2: [2, "pct"] } },
  refs: [OG.realGases, OG.gasVisc],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("p", "t", "gamma");
    if (miss.length) return c.missing(miss, labelsOf(zInputs));
    const g = c.n("gamma");
    const p = psia(c.n("p")), TR = degR(c.n("t"));
    let Tpc: number, Ppc: number;
    if (v.tpc !== null && v.tpc !== undefined && v.ppc !== null && v.ppc !== undefined) {
      Tpc = degR(v.tpc);
      Ppc = psia(v.ppc);
      c.step("Pseudo-criticals (entered)", `Tpc = ${fmt(Tpc)} °R, Ppc = ${fmt(Ppc)} psia`);
    } else {
      const s = sutton(g);
      c.step("Sutton pseudo-criticals", `Tpc = 169.2 + 349.5×${fmt(g)} − 74.0×${fmt(g)}² = ${fmt(s.Tpc)} °R;  Ppc = 756.8 − 131.07×${fmt(g)} − 3.6×${fmt(g)}² = ${fmt(s.Ppc)} psia`);
      Tpc = s.Tpc;
      Ppc = s.Ppc;
      const yc = (v.co2 ?? 0) / 100, yh = (v.h2s ?? 0) / 100;
      if (yc + yh > 0) {
        const w = wichertAziz(Tpc, Ppc, yc, yh);
        c.step("Wichert-Aziz correction", `ε = 120(${fmt(yc + yh)}^0.9 − ${fmt(yc + yh)}^1.6) + 15(${fmt(yh)}^0.5 − ${fmt(yh)}^4) = ${fmt(w.eps)} °R;  Tpc′ = ${fmt(w.Tpc)} °R;  Ppc′ = ${fmt(w.Ppc)} psia`);
        Tpc = w.Tpc;
        Ppc = w.Ppc;
      }
    }
    const Tpr = TR / Tpc, Ppr = p / Ppc;
    c.step("Reduced properties", `Tpr = ${fmt(TR)} °R ÷ ${fmt(Tpc)} = ${fmt(Tpr)};  Ppr = ${fmt(p)} psia ÷ ${fmt(Ppc)} = ${fmt(Ppr)}`);
    const d = dak(Tpr, Ppr);
    if (!d.ok) return c.done("The Z-factor equation has no solution at these reduced conditions. Check the pressure, temperature, and gravity.");
    c.step("Z-factor (Dranchuk & Abou-Kassem)", `Newton's method on reduced density from ρr = 0.27Ppr/Tpr: ρr = ${fmt(d.rhoR, 5)};  Z = 0.27 × ${fmt(Ppr)} ÷ (${fmt(d.rhoR, 5)} × ${fmt(Tpr)}) = ${fmt(d.z, 5)}`);
    const M = g * M_AIR_G;
    const rho = (c.n("p") * 1000 * (M / 1000)) / (d.z * 8.314462618 * (c.n("t") + 273.15));
    c.step("Density", `M = ${fmt(g)} × ${fmt(M_AIR_G, 6)} = ${fmt(M)} g/mol;  ρ = pM ÷ (ZRT) = ${fmt(c.n("p") * 1000)} × ${fmt(M / 1000)} ÷ (${fmt(d.z, 5)} × 8.31446 × ${fmt(c.n("t") + 273.15)}) = ${fmt(rho)} kg/m³ = ${fmt(rho / LBFT3)} lb/ft³`);
    const Bg = ((P_SC_PSIA / T_SC_R) * d.z * TR) / p;
    c.step("Gas formation volume factor", `Bg = (${fmt(P_SC_PSIA, 5)} ÷ ${fmt(T_SC_R)}) × ${fmt(d.z, 5)} × ${fmt(TR)} ÷ ${fmt(p)} = ${fmt(Bg, 5)} ft³/scf = ${fmt((Bg * 1000) / 5.614583)} bbl/Mscf`);
    const l = lge(TR, rho / 1000, M);
    c.step("Viscosity (Lee-Gonzalez-Eakin)", `K = (9.4 + 0.02M)T^1.5 ÷ (209 + 19M + T) = ${fmt(l.K)};  X = 3.5 + 986/T + 0.01M = ${fmt(l.X)};  Y = 2.4 − 0.2X = ${fmt(l.Y)};  μ = 10⁻⁴ × ${fmt(l.K)} × exp(${fmt(l.X)} × ${fmt(rho / 1000, 4)}^${fmt(l.Y)}) = ${fmt(l.mu)} cP`);
    c.result("z", "Z-factor", "ratio", d.z, ["x"], true);
    c.result("rho", "Gas density", "rho", rho, ["lbft3", "kgm3"], true);
    c.result("bg", "Bg, reservoir ft³ per scf (= m³/m³ at 60 °F)", "ratio", Bg, ["x"], true);
    c.result("bgbbl", "Bg, reservoir bbl per Mscf", "ratio", (Bg * 1000) / 5.614583, ["x"]);
    c.result("e", "Expansion factor 1/Bg, scf per ft³", "ratio", 1 / Bg, ["x"]);
    c.result("mu", "Gas viscosity", "visc", l.mu / 1000, ["cp"], true);
    c.result("tpr", "Tpr", "ratio", Tpr, ["x"]);
    c.result("ppr", "Ppr", "ratio", Ppr, ["x"]);
    c.result("M", "Molecular weight, g/mol", "ratio", M, ["x"]);
    if (!dakRange(Tpr, Ppr)) c.warn("Tpr or Ppr is outside the range the Z-factor equation was fitted to (Tpr 1.0–3.0, Ppr 0.2–30).");
    if ((v.co2 ?? 0) + (v.h2s ?? 0) > 0 && v.tpc !== null && v.tpc !== undefined) c.warn("Entered pseudo-criticals are used as given; correct them for CO₂ and H₂S first (section 1 does this).");
    void M_AIR;
    return c.done();
  },
};

export const naturalGas: UtilityDef = {
  slug: "natural-gas-properties",
  name: "Natural Gas Properties Calculator",
  short: "Natural gas properties",
  problem: "What is the molecular weight, gravity, Z-factor, density, and VOC weight % of this gas?",
  description: "Natural gas properties from a gas analysis or gravity: molecular weight, specific gravity, VOC and HAP weight % for permits, Kay's rule and Sutton pseudo-criticals, Wichert-Aziz sour-gas correction, Dranchuk-Abou-Kassem Z-factor, density, Bg, and Lee-Gonzalez-Eakin viscosity, with every step shown.",
  keywords: "natural gas properties z factor compressibility factor dranchuk abou-kassem sutton wichert aziz gas gravity molecular weight voc weight percent hap gas analysis bg gas formation volume factor gas viscosity lee gonzalez eakin",
  sheet: "Gas Properties",
  sections: [composition, zfactor],
  notes: [
    "Correlations are those printed in the cited papers, applied in oilfield units (psia, °R).",
    "Z-factor equation: Dranchuk & Abou-Kassem, fitted to the Standing-Katz chart for Tpr 1.0–3.0 and Ppr 0.2–30.",
    "Standard conditions are 60 °F and 14.696 psia.",
  ],
};
