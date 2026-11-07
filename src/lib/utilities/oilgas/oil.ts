import { Calc, labelsOf } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { G, fmt, fromSI, toSI } from "../units";
import { LBFT3, M_AIR_G, PSI_KPA, T_SC_R, degF, kPa, psia } from "./core";
import { OG } from "./refs";

/** Water density at 60 °F and 1 atm, kg/m³, from IAPWS-IF97 (the base for oil specific gravity 60/60 °F). */
export const RHO_W60 = 999.016;
/** Air density at 60 °F and 14.696 psia from the ideal gas law, kg/m³ (the base for gas specific gravity). */
export const RHO_AIR_SC = (101325 * (M_AIR_G / 1000)) / (8.314462618 * (T_SC_R / 1.8));

export const apiToSg = (api: number) => 141.5 / (api + 131.5);
export const sgToApi = (sg: number) => 141.5 / sg - 131.5;

/** scf/STB ↔ the gor family's base (Sm³/m³). */
const scfbbl = (si: number) => fromSI("gor", "scfbbl", si);
const gorSI = (scf: number) => toSI("gor", "scfbbl", scf);

/** Standing (1947): bubble-point pressure (psia) from Rs (scf/STB), γg, API, T (°F). */
export const standingPb = (Rs: number, gg: number, api: number, TF: number) => 18.2 * ((Rs / gg) ** 0.83 * 10 ** (0.00091 * TF - 0.0125 * api) - 1.4);
/** Standing (1947): solution GOR (scf/STB) at p ≤ pb (psia). */
export const standingRs = (p: number, gg: number, api: number, TF: number) => gg * ((p / 18.2 + 1.4) * 10 ** (0.0125 * api - 0.00091 * TF)) ** 1.2048;
/** Standing (1947): oil formation volume factor at or below the bubble point (bbl/STB). */
export const standingBo = (Rs: number, gg: number, go: number, TF: number) => 0.9759 + 0.00012 * (Rs * Math.sqrt(gg / go) + 1.25 * TF) ** 1.2;

/* ------------------------------------------------------------ gravity */

const gravInputs: SectionDef["inputs"] = [
  { id: "api", label: "API gravity", sym: "°API", family: "ratio", unit: "x", solvable: true, min: -10, max: 100 },
  { id: "sg", label: "Specific gravity at 60/60 °F", sym: "γo", family: "ratio", unit: "x", solvable: true, min: 0.5, max: 1.2 },
];

const gravity: SectionDef = {
  id: "gravity",
  title: "API gravity, specific gravity, density, and gradient",
  question: "What is this crude's specific gravity, density, and pressure gradient from its API gravity (or the reverse)?",
  formulas: ["γo = 141.5 ÷ (°API + 131.5),   °API = 141.5 ÷ γo − 131.5", "ρo = γo × ρw(60 °F),   gradient = ρo g"],
  solveNote: "Enter API gravity or specific gravity; leave the other blank.",
  inputs: gravInputs,
  example: { title: "A 35 °API crude.", values: { api: [35, "x"] } },
  refs: [OG.oilFvf, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const b = c.blank("api", "sg");
    if (b.length === 2) return c.done("Enter API gravity or specific gravity.");
    let api: number, sg: number;
    if (b.includes("sg")) {
      api = c.n("api");
      sg = apiToSg(api);
      c.solved = "sg";
      c.step("Specific gravity", `γo = 141.5 ÷ (${fmt(api)} + 131.5) = ${fmt(sg, 5)}`, "γo = 141.5 ÷ (°API + 131.5)");
    } else if (b.includes("api")) {
      sg = c.n("sg");
      api = sgToApi(sg);
      c.solved = "api";
      c.step("API gravity", `°API = 141.5 ÷ ${fmt(sg, 5)} − 131.5 = ${fmt(api)}`, "°API = 141.5 ÷ γo − 131.5");
    } else {
      api = c.n("api");
      sg = c.n("sg");
      if (Math.abs(apiToSg(api) - sg) > 0.0005) c.warn("API gravity and specific gravity disagree. Leave one blank to have it solved.");
      c.step("Both entered", `141.5 ÷ (${fmt(api)} + 131.5) = ${fmt(apiToSg(api), 5)}`);
    }
    const rho = sg * RHO_W60;
    c.step("Density at 60 °F", `ρo = ${fmt(sg, 5)} × ${fmt(RHO_W60, 6)} kg/m³ = ${fmt(rho)} kg/m³ = ${fmt(rho / LBFT3)} lb/ft³`);
    const grad = (rho * G) / 1000;
    c.step("Hydrostatic gradient", `ρo g = ${fmt(rho)} × ${G} ÷ 1000 = ${fmt(grad)} kPa/m = ${fmt(fromSI("grad", "psift", grad))} psi/ft`);
    c.result("api", "API gravity", "ratio", api, ["x"], true);
    c.result("sg", "Specific gravity (60/60 °F)", "ratio", sg, ["x"], true);
    c.result("rho", "Density at 60 °F", "rho", rho, ["lbft3", "kgm3"], true);
    c.result("grad", "Static gradient of dead oil", "grad", grad, ["psift", "kpam"], true);
    c.result("lbbbl", "Mass per barrel, lb/bbl", "ratio", (rho * 0.158987294928) / 0.45359237, ["x"]);
    if (api > 10 && sg > 1) c.warn("Check the inputs: oil heavier than water has API below 10.");
    return c.done();
  },
};

/* ------------------------------------------------------------ bubble point, Rs, Bo */

const pvtInputs: SectionDef["inputs"] = [
  { id: "api", label: "Stock-tank oil API gravity", sym: "°API", family: "ratio", unit: "x", min: 5, max: 80 },
  { id: "gg", label: "Dissolved (separator) gas specific gravity", sym: "γg", family: "ratio", unit: "x", min: 0.5, max: 1.6 },
  { id: "t", label: "Reservoir temperature", sym: "T", family: "temp", unit: "f", min: 32, max: 400 },
  { id: "rsb", label: "Solution GOR at the bubble point", sym: "Rsb", family: "gor", unit: "scfbbl", solvable: true, min: 1, max: 5000 },
  { id: "pb", label: "Bubble-point pressure", sym: "pb", family: "pabs", unit: "psia", solvable: true, min: 30, max: 20000 / 1.0 * PSI_KPA },
  { id: "p", label: "Pressure of interest (optional)", sym: "p", family: "pabs", unit: "psia", optional: true, min: 14.696 * PSI_KPA },
  { id: "co", label: "Undersaturated oil compressibility (for p above pb)", sym: "co", family: "compress", unit: "perpsi", optional: true, min: 0, help: "From a PVT report; needed only when the pressure of interest is above the bubble point." },
];

const pvt: SectionDef = {
  id: "bubble-point",
  title: "Bubble point, solution GOR, and oil formation volume factor (Standing)",
  question: "What is the bubble-point pressure (or solution GOR), and how many reservoir barrels does one stock-tank barrel take up?",
  formulas: [
    "pb = 18.2 [ (Rs ÷ γg)^0.83 × 10^(0.00091T − 0.0125°API) − 1.4 ]   (psia, °F)",
    "Rs = γg [ (p ÷ 18.2 + 1.4) × 10^(0.0125°API − 0.00091T) ]^1.2048   for p ≤ pb",
    "Bo = 0.9759 + 0.000120 [ Rs (γg ÷ γo)^0.5 + 1.25T ]^1.2;   above pb: Bo = Bob exp(co (pb − p))",
    "ρo = (γo ρw + Rs γg ρair) ÷ Bo",
  ],
  solveNote: "Enter the solution GOR or the bubble-point pressure; leave the other blank.",
  inputs: pvtInputs,
  example: { title: "35 °API oil with 0.75 gravity gas, 600 scf/STB, 200 °F; properties at 1,500 psia.", values: { api: [35, "x"], gg: [0.75, "x"], t: [200, "f"], rsb: [600, "scfbbl"], p: [1500, "psia"] } },
  refs: [OG.oilFvf],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("api", "gg", "t");
    if (miss.length) return c.missing(miss, labelsOf(pvtInputs));
    const api = c.n("api"), gg = c.n("gg"), TF = degF(c.n("t"));
    const go = apiToSg(api);
    const b = c.blank("rsb", "pb");
    if (b.length === 2) return c.done("Enter the solution GOR at the bubble point or the bubble-point pressure.");
    const a = 0.00091 * TF - 0.0125 * api;
    c.step("Temperature-gravity term", `0.00091 × ${fmt(TF)} °F − 0.0125 × ${fmt(api)} = ${fmt(a, 5)}`);
    let Rsb: number, pb: number;
    if (b.includes("pb")) {
      Rsb = scfbbl(c.n("rsb"));
      pb = standingPb(Rsb, gg, api, TF);
      c.solved = "pb";
      c.step("Bubble-point pressure", `pb = 18.2 × [(${fmt(Rsb)} ÷ ${fmt(gg)})^0.83 × 10^${fmt(a, 5)} − 1.4] = ${fmt(pb)} psia`);
      if (!(pb > 14.696)) return c.done("This GOR is too low to give a bubble point above atmospheric pressure.");
    } else {
      pb = psia(c.n("pb"));
      Rsb = standingRs(pb, gg, api, TF);
      c.solved = b.includes("rsb") ? "rsb" : undefined;
      c.step("Solution GOR at pb", `Rs = ${fmt(gg)} × [(${fmt(pb)} ÷ 18.2 + 1.4) × 10^${fmt(-a, 5)}]^1.2048 = ${fmt(Rsb)} scf/STB`);
      if (!b.length) {
        const chk = standingPb(scfbbl(c.n("rsb")), gg, api, TF);
        if (Math.abs(chk - pb) > 0.02 * pb) c.warn(`The entered GOR gives a bubble point of ${fmt(chk)} psia by Standing's correlation, not the entered ${fmt(pb)} psia. Results use the entered bubble point. Leave one blank to have it solved.`);
      }
    }
    const Bob = standingBo(Rsb, gg, go, TF);
    c.step("Oil FVF at the bubble point", `γo = ${fmt(go, 5)};  Bob = 0.9759 + 0.000120 × [${fmt(Rsb)} × (${fmt(gg)} ÷ ${fmt(go, 5)})^0.5 + 1.25 × ${fmt(TF)}]^1.2 = ${fmt(Bob, 5)} bbl/STB`);
    const rhoOf = (Rs: number, Bo: number) => (go * RHO_W60 + gorSI(Rs) * gg * RHO_AIR_SC) / Bo;
    const rhob = rhoOf(Rsb, Bob);
    c.step("Oil density at pb", `ρo = (${fmt(go, 5)} × ${fmt(RHO_W60, 6)} + ${fmt(gorSI(Rsb))} × ${fmt(gg)} × ${fmt(RHO_AIR_SC, 5)}) ÷ ${fmt(Bob, 5)} = ${fmt(rhob)} kg/m³ = ${fmt(rhob / LBFT3)} lb/ft³`, "ρo = (γo ρw + Rs γg ρair) ÷ Bo");
    c.result("pb", "Bubble-point pressure", "pabs", kPa(pb), ["psia", "psig", "bara"], true);
    c.result("rsb", "Solution GOR at the bubble point", "gor", gorSI(Rsb), ["scfbbl", "sm3m3"], true);
    c.result("bob", "Oil FVF at the bubble point, bbl/STB", "ratio", Bob, ["x"], true);
    c.result("rhob", "Oil density at the bubble point", "rho", rhob, ["lbft3", "kgm3"]);
    if (v.p !== null && v.p !== undefined) {
      const p = psia(v.p);
      if (p <= pb) {
        const Rs = standingRs(p, gg, api, TF);
        const Bo = standingBo(Rs, gg, go, TF);
        c.step(`At ${fmt(p)} psia (below pb): Rs and Bo`, `Rs = ${fmt(gg)} × [(${fmt(p)} ÷ 18.2 + 1.4) × 10^${fmt(-a, 5)}]^1.2048 = ${fmt(Rs)} scf/STB;  Bo = ${fmt(Bo, 5)} bbl/STB`);
        c.result("rs", "Solution GOR at p", "gor", gorSI(Rs), ["scfbbl", "sm3m3"], true);
        c.result("bo", "Oil FVF at p, bbl/STB", "ratio", Bo, ["x"], true);
        c.result("rho", "Oil density at p", "rho", rhoOf(Rs, Bo), ["lbft3", "kgm3"]);
        c.result("free", "Gas released from solution (Rsb − Rs)", "gor", gorSI(Rsb - Rs), ["scfbbl", "sm3m3"]);
      } else if (v.co !== null && v.co !== undefined) {
        const co = fromSI("compress", "perpsi", v.co);
        const Bo = Bob * Math.exp(co * (pb - p));
        c.step(`At ${fmt(p)} psia (above pb): Bo`, `Bo = ${fmt(Bob, 5)} × exp(${fmt(co)} × (${fmt(pb)} − ${fmt(p)})) = ${fmt(Bo, 5)} bbl/STB`, "Bo = Bob exp(co (pb − p))");
        c.result("rs", "Solution GOR at p (= Rsb above pb)", "gor", gorSI(Rsb), ["scfbbl", "sm3m3"], true);
        c.result("bo", "Oil FVF at p, bbl/STB", "ratio", Bo, ["x"], true);
        c.result("rho", "Oil density at p", "rho", rhoOf(Rsb, Bo), ["lbft3", "kgm3"]);
      } else c.warn("The pressure of interest is above the bubble point: enter the oil compressibility to get Bo there. Rs stays equal to Rsb above pb.");
    }
    if (TF < 100 || TF > 258 || api < 16.5 || api > 63.8 || gg < 0.59 || gg > 0.95 || Rsb < 20 || Rsb > 1425 || pb < 130 || pb > 7000)
      c.warn("Some inputs are outside the data Standing used (130–7,000 psia, 100–258 °F, 20–1,425 scf/STB, 16.5–63.8 °API, gas gravity 0.59–0.95). Use a PVT report where you have one.");
    return c.done();
  },
};

/* ------------------------------------------------------------ viscosity */

const viscInputs: SectionDef["inputs"] = [
  { id: "api", label: "Stock-tank oil API gravity", sym: "°API", family: "ratio", unit: "x", min: 5, max: 80 },
  { id: "t", label: "Temperature", sym: "T", family: "temp", unit: "f", min: 32, max: 400 },
  { id: "rs", label: "Solution GOR (0 for dead oil)", sym: "Rs", family: "gor", unit: "scfbbl", min: 0, max: 5000 },
  { id: "pb", label: "Bubble-point pressure (for p above pb)", sym: "pb", family: "pabs", unit: "psia", optional: true, min: 14.696 * PSI_KPA },
  { id: "p", label: "Pressure above the bubble point (optional)", sym: "p", family: "pabs", unit: "psia", optional: true, min: 14.696 * PSI_KPA },
];

const viscosity: SectionDef = {
  id: "viscosity",
  title: "Oil viscosity: dead, saturated, and undersaturated",
  question: "What is the oil viscosity at reservoir temperature, with its gas in solution, and above the bubble point?",
  formulas: [
    "Dead oil (Beggs-Robinson): μod = 10^x − 1,  x = 10^(3.0324 − 0.02023°API) × T^−1.163",
    "Live oil: μo = A μod^B,  A = 10.715 (Rs + 100)^−0.515,  B = 5.44 (Rs + 150)^−0.338",
    "Above pb (Vasquez-Beggs): μo = μob (p ÷ pb)^m,  m = 2.6 p^1.187 exp(−11.513 − 8.98×10⁻⁵ p)",
  ],
  inputs: viscInputs,
  example: { title: "35 °API oil at 200 °F with 600 scf/STB in solution, bubble point 2,800 psia, viewed at 4,000 psia.", values: { api: [35, "x"], t: [200, "f"], rs: [600, "scfbbl"], pb: [2800, "psia"], p: [4000, "psia"] } },
  refs: [OG.oilVisc],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("api", "t", "rs");
    if (miss.length) return c.missing(miss, labelsOf(viscInputs));
    const api = c.n("api"), TF = degF(c.n("t")), Rs = scfbbl(c.n("rs"));
    if (!(TF > 0)) return c.done("The dead-oil correlation needs a temperature above 0 °F.");
    const y = 10 ** (3.0324 - 0.02023 * api);
    const x = y * TF ** -1.163;
    const mod = 10 ** x - 1;
    c.step("Dead-oil viscosity", `y = 10^(3.0324 − 0.02023 × ${fmt(api)}) = ${fmt(y)};  x = ${fmt(y)} × ${fmt(TF)}^−1.163 = ${fmt(x, 5)};  μod = 10^${fmt(x, 5)} − 1 = ${fmt(mod)} cP`);
    const A = 10.715 * (Rs + 100) ** -0.515;
    const B = 5.44 * (Rs + 150) ** -0.338;
    const mob = A * mod ** B;
    c.step("Live-oil viscosity at Rs", `A = 10.715 × (${fmt(Rs)} + 100)^−0.515 = ${fmt(A, 5)};  B = 5.44 × (${fmt(Rs)} + 150)^−0.338 = ${fmt(B, 5)};  μo = ${fmt(A, 5)} × ${fmt(mod)}^${fmt(B, 5)} = ${fmt(mob)} cP`);
    c.result("mod", "Dead-oil viscosity", "visc", mod / 1000, ["cp"], true);
    c.result("mob", "Live-oil viscosity at Rs (saturated)", "visc", mob / 1000, ["cp"], true);
    if (v.p !== null && v.p !== undefined) {
      if (v.pb === null || v.pb === undefined) return c.done("Enter the bubble-point pressure to get the viscosity above it.");
      const p = psia(v.p), pb = psia(v.pb);
      if (p <= pb) c.warn("The pressure entered is not above the bubble point, so the saturated viscosity applies (enter the Rs at that pressure).");
      else {
        const m = 2.6 * p ** 1.187 * Math.exp(-11.513 - 8.98e-5 * p);
        const mo = mob * (p / pb) ** m;
        c.step("Undersaturated viscosity", `m = 2.6 × ${fmt(p)}^1.187 × exp(−11.513 − 8.98×10⁻⁵ × ${fmt(p)}) = ${fmt(m, 5)};  μo = ${fmt(mob)} × (${fmt(p)} ÷ ${fmt(pb)})^${fmt(m, 5)} = ${fmt(mo)} cP`);
        c.result("mo", "Oil viscosity at p (above pb)", "visc", mo / 1000, ["cp"], true);
      }
    }
    if (api < 16 || api > 58 || TF < 70 || TF > 295 || Rs > 2070) c.warn("Some inputs are outside the data Beggs and Robinson used (16–58 °API, 70–295 °F, Rs 20–2,070 scf/STB).");
    return c.done();
  },
};

export const crudeOil: UtilityDef = {
  slug: "crude-oil-pvt",
  name: "Crude Oil PVT Calculator",
  short: "Crude oil PVT",
  problem: "What is the bubble point, solution GOR, formation volume factor, and viscosity of this oil?",
  description: "Crude oil properties from API gravity, gas gravity, and temperature: specific gravity and density, Standing bubble-point pressure, solution GOR and oil formation volume factor, oil density at pressure, and Beggs-Robinson and Vasquez-Beggs oil viscosity, with every step shown.",
  keywords: "crude oil pvt api gravity specific gravity bubble point pressure solution gas oil ratio rs formation volume factor bo standing correlation oil viscosity beggs robinson vasquez beggs dead oil live oil",
  sheet: "Oil PVT",
  sections: [gravity, pvt, viscosity],
  notes: [
    "Black-oil correlations from the cited papers, in oilfield units (psia, °F, scf/STB). A laboratory PVT report for your fluid is always better; use these when you do not have one.",
    "Specific gravity is at 60/60 °F; water at 60 °F is 999.016 kg/m³ (IAPWS-IF97).",
  ],
};
