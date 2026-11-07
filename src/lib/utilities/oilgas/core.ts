/**
 * Shared oil and gas property routines. The published correlations are
 * written in oilfield units (psia, °R, ft, lb/ft³, cP), so these functions
 * take and return those units; the calculators convert from SI at the edge.
 *
 * Every constant below is either an exact unit conversion (NIST SP 811) or a
 * coefficient printed in the cited paper.
 */
import { G, M_AIR, P_ATM_KPA, R_UNIVERSAL, T_SC_K } from "../units";

export const PSI_KPA = 6.894757293168; // kPa per psi (exact from lbf and in)
export const FT_M = 0.3048;
export const IN_M = 0.0254;
export const LB_KG = 0.45359237;
export const BBL_M3 = 42 * 3.785411784e-3;
export const FT3_M3 = FT_M ** 3;
export const LBFT3 = LB_KG / FT3_M3; // kg/m³ per lb/ft³
export const P_SC_PSIA = P_ATM_KPA / PSI_KPA; // 14.696 psia
export const T_SC_R = 519.67; // 60 °F in °R
export const M_AIR_G = M_AIR * 1000; // 28.9647 g/mol

export const psia = (kPa: number) => kPa / PSI_KPA;
export const kPa = (psi: number) => psi * PSI_KPA;
export const degR = (c: number) => (c + 273.15) * 1.8;
export const degF = (c: number) => c * 1.8 + 32;
export const ft = (m: number) => m / FT_M;
export const inch = (m: number) => m / IN_M;

/** Hydrostatic gradient of a fluid, psi/ft per lb/gal (the "0.052" in drilling), from g and exact unit definitions. */
export const PSI_FT_PER_PPG = (LB_KG / 3.785411784e-3) * G * FT_M / 1000 / PSI_KPA;

/* ------------------------------------------------------------ pseudo-critical properties */

/** Sutton (1985) pseudo-critical temperature (°R) and pressure (psia) from gas specific gravity. */
export function sutton(gamma: number) {
  return { Tpc: 169.2 + 349.5 * gamma - 74.0 * gamma ** 2, Ppc: 756.8 - 131.07 * gamma - 3.6 * gamma ** 2 };
}

/** Wichert and Aziz (1972) correction for CO₂ and H₂S (mole fractions). Returns ε (°R) and corrected Tpc, Ppc. */
export function wichertAziz(Tpc: number, Ppc: number, yCO2: number, yH2S: number) {
  const A = yCO2 + yH2S;
  const B = yH2S;
  const eps = 120 * (A ** 0.9 - A ** 1.6) + 15 * (B ** 0.5 - B ** 4);
  const Tc = Tpc - eps;
  const Pc = (Ppc * Tc) / (Tpc + B * (1 - B) * eps);
  return { eps, Tpc: Tc, Ppc: Pc };
}

/* ------------------------------------------------------------ Z-factor */

/** Dranchuk and Abou-Kassem (1975) constants A1–A11. */
export const DAK = [0.3265, -1.07, -0.5339, 0.01569, -0.05165, 0.5475, -0.7361, 0.1844, 0.1056, 0.6134, 0.721] as const;
export const DAK_ITER = 20;

/**
 * DAK Z-factor: Newton's method on the reduced density, starting from the
 * ideal-gas value ρr = 0.27 Ppr/Tpr. A fixed number of steps (the Excel
 * workbook repeats the same steps row by row); converged well before the end
 * in the correlation's range.
 */
export function dak(Tpr: number, Ppr: number) {
  const [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11] = DAK;
  const T = Tpr;
  const C1 = A1 + A2 / T + A3 / T ** 3 + A4 / T ** 4 + A5 / T ** 5;
  const C2 = A6 + A7 / T + A8 / T ** 2;
  const C3 = A9 * (A7 / T + A8 / T ** 2);
  const zOf = (r: number) => 1 + C1 * r + C2 * r ** 2 - C3 * r ** 5 + A10 * (1 + A11 * r ** 2) * (r ** 2 / T ** 3) * Math.exp(-A11 * r ** 2);
  let r = (0.27 * Ppr) / Tpr;
  let converged = false;
  for (let i = 0; i < DAK_ITER; i++) {
    const F = zOf(r) - (0.27 * Ppr) / (r * T);
    const dF = C1 + 2 * C2 * r - 5 * C3 * r ** 4 + ((2 * A10 * r) / T ** 3) * (1 + A11 * r ** 2 - A11 ** 2 * r ** 4) * Math.exp(-A11 * r ** 2) + (0.27 * Ppr) / (r ** 2 * T);
    const next = r - F / dF;
    if (!(next > 0) || !Number.isFinite(next)) break;
    converged = Math.abs(next - r) < 1e-12 * Math.max(1, r);
    r = next;
  }
  const z = (0.27 * Ppr) / (r * Tpr);
  return { z, rhoR: r, ok: Number.isFinite(z) && z > 0.05 && z < 3 && (converged || Math.abs(zOf(r) - z) < 1e-9) };
}

/** Ranges the DAK fit was made over. */
export const dakRange = (Tpr: number, Ppr: number) => Tpr >= 1.0 && Tpr <= 3.0 && Ppr >= 0.2 && Ppr <= 30;

/* ------------------------------------------------------------ viscosity */

/** Lee, Gonzalez and Eakin (1966) gas viscosity, cP. T in °R, density in g/cm³, M in g/mol. */
export function lge(TR: number, rhoGcc: number, M: number) {
  const K = ((9.4 + 0.02 * M) * TR ** 1.5) / (209 + 19 * M + TR);
  const X = 3.5 + 986 / TR + 0.01 * M;
  const Y = 2.4 - 0.2 * X;
  return { mu: 1e-4 * K * Math.exp(X * rhoGcc ** Y), K, X, Y };
}

/* ------------------------------------------------------------ gas state */

export interface GasSpec {
  gamma: number;
  yCO2?: number;
  yH2S?: number;
  /** Pseudo-critical overrides (°R, psia), e.g. from a composition. Already corrected for CO₂/H₂S. */
  Tpc?: number;
  Ppc?: number;
}

/** Pseudo-criticals: given values, or Sutton from gravity with the Wichert-Aziz correction. */
export function pseudo(g: GasSpec) {
  if (g.Tpc && g.Ppc) return { Tpc: g.Tpc, Ppc: g.Ppc, eps: 0, from: "entered" as const };
  const s = sutton(g.gamma);
  const yc = g.yCO2 ?? 0, yh = g.yH2S ?? 0;
  if (yc + yh > 0) {
    const w = wichertAziz(s.Tpc, s.Ppc, yc, yh);
    return { Tpc: w.Tpc, Ppc: w.Ppc, eps: w.eps, from: "sutton+wa" as const, raw: s };
  }
  return { ...s, eps: 0, from: "sutton" as const, raw: s };
}

/** Z, density (lb/ft³), viscosity (cP) and Bg at p (psia) and T (°R). */
export function gasState(p: number, TR: number, g: GasSpec) {
  const pc = pseudo(g);
  const Tpr = TR / pc.Tpc, Ppr = p / pc.Ppc;
  const d = dak(Tpr, Ppr);
  const M = g.gamma * M_AIR_G;
  // ρ = pM/(ZRT) in SI, then lb/ft³.
  const rhoSI = (kPa(p) * 1000 * (M / 1000)) / (d.z * R_UNIVERSAL * (TR / 1.8));
  const rho = rhoSI / LBFT3;
  const v = lge(TR, rhoSI / 1000, M);
  // Bg = (p_sc/T_sc) Z T / p, reservoir volume per standard volume.
  const Bg = ((P_SC_PSIA / T_SC_R) * d.z * TR) / p;
  return { ...pc, Tpr, Ppr, z: d.z, ok: d.ok, inRange: dakRange(Tpr, Ppr), M, rho, rhoSI, mu: v.mu, Bg };
}

/** Standard-condition molar volume check: mol/s for a standard gas rate is handled by the gasflow units (60 °F, 14.696 psia). */
export const STD = { T: T_SC_K, p: P_ATM_KPA };

/* ------------------------------------------------------------ pipe friction */

/** Colebrook-White, 8 fixed-point steps from Swamee-Jain (same steps as the workbook); 64/Re when laminar. */
export function colebrook(Re: number, relRough: number) {
  if (Re < 2300) return 64 / Re;
  let f = 0.25 / Math.log10(relRough / 3.7 + 5.74 / Re ** 0.9) ** 2;
  for (let i = 0; i < 8; i++) f = (-2 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)))) ** -2;
  return f;
}

/* ------------------------------------------------------------ gas column in a well */

/** Passes of the average-pressure loop (the workbook repeats the same passes). */
export const NPASS = 6;

export interface ColumnIn {
  /** Pressure at the top, kPa abs. */
  pTop: number;
  /** Temperatures at top and bottom, °C. */
  tTop: number;
  tBot: number;
  /** True vertical depth and measured length, m. */
  H: number;
  L: number;
  /** Inside diameter and roughness, m (only used when flowing). */
  D: number;
  eps: number;
  /** Gas rate, mol/s (0 = static). */
  n: number;
  gas: GasSpec;
}

/**
 * Bottom pressure of a gas column by the average temperature and Z method:
 * along the pipe, ½ d(p²)/dℓ = a p² + b with a = M g sinθ ÷ (Z R T) and
 * b = f ṁ² Z R T ÷ (2 D A² M), which integrates to
 * p_bot² = p_top² eˢ + 2 b L (eˢ − 1) ÷ s,  s = 2 M g H ÷ (Z R T).
 * Z, μ and f are taken at the average pressure and temperature, repeated NPASS times.
 */
export function gasColumn(o: ColumnIn) {
  const M = (o.gas.gamma * M_AIR_G) / 1000;
  const Tk = (o.tTop + o.tBot) / 2 + 273.15;
  const A = (Math.PI * o.D ** 2) / 4;
  const mdot = o.n * M;
  const pT = o.pTop * 1000;
  let pB = pT;
  let st = gasState(psia(o.pTop), Tk * 1.8, o.gas);
  let s = 0, f = 0, Re = 0, b = 0;
  for (let i = 0; i < NPASS; i++) {
    const pbar = (pT + pB) / 2;
    st = gasState(psia(pbar / 1000), Tk * 1.8, o.gas);
    const a = (M * G) / (st.z * R_UNIVERSAL * Tk);
    s = 2 * a * o.H;
    if (mdot > 0) {
      Re = (4 * mdot) / (Math.PI * o.D * (st.mu / 1000));
      f = colebrook(Re, o.eps / o.D);
      b = (f * mdot ** 2 * st.z * R_UNIVERSAL * Tk) / (2 * o.D * A ** 2 * M);
    }
    const phi = Math.abs(s) > 1e-12 ? (Math.exp(s) - 1) / s : 1;
    pB = Math.sqrt(pT ** 2 * Math.exp(s) + 2 * b * o.L * phi);
  }
  return { pBot: pB / 1000, z: st.z, mu: st.mu, ok: st.ok, inRange: st.inRange, Tk, s, f, Re, b, M, mdot, A };
}
