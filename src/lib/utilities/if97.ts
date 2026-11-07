/**
 * Water and steam properties from IAPWS-IF97 (The International Association
 * for the Properties of Water and Steam, "Revised Release on the IAPWS
 * Industrial Formulation 1997 for the Thermodynamic Properties of Water and
 * Steam", 2007): region 1 (compressed liquid), region 2 (vapor), region 4
 * (saturation line) and the B23 boundary. Coefficients are the release's
 * Tables 2, 10, 11, 34 and 1. Viscosity is the IAPWS 2008 formulation for the
 * industrial use case (no critical enhancement, μ2 = 1).
 *
 * Units here: p in MPa, T in K, h in kJ/kg, s in kJ/(kg·K), v in m³/kg,
 * cp in kJ/(kg·K), viscosity in Pa·s.
 */

export const R_WATER = 0.461526; // kJ/(kg·K), IF97 eq. (1)

export const R1: [number, number, number][] = [
  [0, -2, 0.14632971213167], [0, -1, -0.84548187169114], [0, 0, -0.3756360367204e1], [0, 1, 0.33855169168385e1],
  [0, 2, -0.95791963387872], [0, 3, 0.15772038513228], [0, 4, -0.16616417199501e-1], [0, 5, 0.81214629983568e-3],
  [1, -9, 0.28319080123804e-3], [1, -7, -0.60706301565874e-3], [1, -1, -0.18990068218419e-1], [1, 0, -0.32529748770505e-1],
  [1, 1, -0.21841717175414e-1], [1, 3, -0.5283835796993e-4], [2, -3, -0.47184321073267e-3], [2, 0, -0.30001780793026e-3],
  [2, 1, 0.47661393906987e-4], [2, 3, -0.44141845330846e-5], [2, 17, -0.72694996297594e-15], [3, -4, -0.31679644845054e-4],
  [3, 0, -0.28270797985312e-5], [3, 6, -0.85205128120103e-9], [4, -5, -0.22425281908e-5], [4, -2, -0.65171222895601e-6],
  [4, 10, -0.14341729937924e-12], [5, -8, -0.40516996860117e-6], [8, -11, -0.12734301741641e-8], [8, -6, -0.17424871230634e-9],
  [21, -29, -0.68762131295531e-18], [23, -31, 0.14478307828521e-19], [29, -38, 0.26335781662795e-22], [30, -39, -0.11947622640071e-22],
  [31, -40, 0.18228094581404e-23], [32, -41, -0.93537087292458e-25],
];

export const R2_0: [number, number][] = [
  [0, -0.96927686500217e1], [1, 0.10086655968018e2], [-5, -0.5608791128302e-2], [-4, 0.71452738081455e-1], [-3, -0.40710498223928],
  [-2, 0.14240819171444e1], [-1, -0.4383951131945e1], [2, -0.28408632460772], [3, 0.21268463753307e-1],
];

export const R2_R: [number, number, number][] = [
  [1, 0, -0.17731742473213e-2], [1, 1, -0.17834862292358e-1], [1, 2, -0.45996013696365e-1], [1, 3, -0.57581259083432e-1],
  [1, 6, -0.5032527872793e-1], [2, 1, -0.33032641670203e-4], [2, 2, -0.18948987516315e-3], [2, 4, -0.39392777243355e-2],
  [2, 7, -0.43797295650573e-1], [2, 36, -0.26674547914087e-4], [3, 0, 0.20481737692309e-7], [3, 1, 0.43870667284435e-6],
  [3, 3, -0.3227767723857e-4], [3, 6, -0.15033924542148e-2], [3, 35, -0.40668253562649e-1], [4, 1, -0.78847309559367e-9],
  [4, 2, 0.12790717852285e-7], [4, 3, 0.48225372718507e-6], [5, 7, 0.22922076337661e-5], [6, 3, -0.16714766451061e-10],
  [6, 16, -0.21171472321355e-2], [6, 35, -0.23895741934104e2], [7, 0, -0.5905956432427e-17], [7, 11, -0.12621808899101e-5],
  [7, 25, -0.38946842435739e-1], [8, 8, 0.11256211360459e-10], [8, 36, -0.82311340897998e1], [9, 13, 0.19809712802088e-7],
  [10, 4, 0.10406965210174e-18], [10, 10, -0.10234747095929e-12], [10, 14, -0.10018179379511e-8], [16, 29, -0.80882908646985e-10],
  [16, 50, 0.10693031879409], [18, 57, -0.33662250574171], [20, 20, 0.89185845355421e-24], [20, 35, 0.30629316876232e-12],
  [20, 48, -0.42002467698208e-5], [21, 21, -0.59056029685639e-25], [22, 53, 0.37826947613457e-5], [23, 39, -0.12768608934681e-14],
  [24, 26, 0.73087610595061e-28], [24, 40, 0.55414715350778e-16], [24, 58, -0.9436970724121e-6],
];

const N4 = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.1202082470247e5, -0.32325550322333e7,
  0.1491510861353e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3,
];

export interface WaterState {
  /** Pressure, MPa absolute. */
  p: number;
  /** Temperature, K. */
  T: number;
  h: number;
  s: number;
  v: number;
  cp: number;
  region: 1 | 2;
}

export const T_MIN = 273.15;
export const T_CRIT_LIMIT = 623.15; // top of region 1 and of the region 4 range used here
export const P_SAT_MAX = 16.529164253; // psat at 623.15 K, MPa
export const P_MAX = 100;
export const T_MAX = 1073.15;

/** Saturation pressure (MPa) at T (K), IF97 eq. (30). Valid 273.15 K to 647.096 K. */
export function psat(T: number) {
  const th = T + N4[8] / (T - N4[9]);
  const A = th * th + N4[0] * th + N4[1];
  const B = N4[2] * th * th + N4[3] * th + N4[4];
  const C = N4[5] * th * th + N4[6] * th + N4[7];
  return Math.pow((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}

/** Saturation temperature (K) at p (MPa), IF97 eq. (31). Valid 611.213 Pa to 22.064 MPa. */
export function tsat(p: number) {
  const b = Math.pow(p, 0.25);
  const E = b * b + N4[2] * b + N4[5];
  const F = N4[0] * b * b + N4[3] * b + N4[6];
  const G = N4[1] * b * b + N4[4] * b + N4[7];
  const D = (2 * G) / (-F - Math.sqrt(F * F - 4 * E * G));
  return (N4[9] + D - Math.sqrt((N4[9] + D) ** 2 - 4 * (N4[8] + N4[9] * D))) / 2;
}

/** B23 boundary pressure (MPa) at T (K), IF97 eq. (5). */
export function pB23(T: number) {
  return 0.34805185628969e3 - 0.11671859879975e1 * T + 0.10192970039326e-2 * T * T;
}

/** Region 1 (liquid) properties. */
export function region1(p: number, T: number): WaterState {
  const pi = p / 16.53;
  const tau = 1386 / T;
  let g = 0, gp = 0, gt = 0, gtt = 0;
  for (const [I, J, n] of R1) {
    const a = 7.1 - pi;
    const b = tau - 1.222;
    g += n * a ** I * b ** J;
    gp += -n * I * a ** (I - 1) * b ** J;
    gt += n * a ** I * J * b ** (J - 1);
    gtt += n * a ** I * J * (J - 1) * b ** (J - 2);
  }
  return {
    p, T, region: 1,
    h: R_WATER * T * tau * gt,
    s: R_WATER * (tau * gt - g),
    v: ((R_WATER * T) / (p * 1000)) * pi * gp,
    cp: -R_WATER * tau * tau * gtt,
  };
}

/** Region 2 (vapor) properties. */
export function region2(p: number, T: number): WaterState {
  const pi = p;
  const tau = 540 / T;
  let g0 = Math.log(pi), g0t = 0, g0tt = 0;
  for (const [J, n] of R2_0) {
    g0 += n * tau ** J;
    g0t += n * J * tau ** (J - 1);
    g0tt += n * J * (J - 1) * tau ** (J - 2);
  }
  let gr = 0, grp = 0, grt = 0, grtt = 0;
  for (const [I, J, n] of R2_R) {
    const b = tau - 0.5;
    gr += n * pi ** I * b ** J;
    grp += n * I * pi ** (I - 1) * b ** J;
    grt += n * pi ** I * J * b ** (J - 1);
    grtt += n * pi ** I * J * (J - 1) * b ** (J - 2);
  }
  return {
    p, T, region: 2,
    h: R_WATER * T * tau * (g0t + grt),
    s: R_WATER * (tau * (g0t + grt) - (g0 + gr)),
    v: ((R_WATER * T) / (p * 1000)) * pi * (1 / pi + grp),
    cp: -R_WATER * tau * tau * (g0tt + grtt),
  };
}

export class RangeError97 extends Error {}

/**
 * Single-phase state at (p, T). Picks region 1 below the saturation line and
 * region 2 above it. Throws RangeError97 outside the regions implemented
 * here (region 3 near the critical point and region 5 above 800 °C).
 */
export function waterPT(p: number, T: number): WaterState {
  if (!(p > 0) || !(T >= T_MIN)) throw new RangeError97("Pressure must be above zero and temperature at or above 0 °C.");
  if (p > P_MAX) throw new RangeError97("Pressure above 100 MPa is outside IAPWS-IF97.");
  if (T > T_MAX) throw new RangeError97("Temperature above 800 °C is outside the range covered here.");
  if (T <= T_CRIT_LIMIT) {
    const ps = psat(T);
    if (p >= ps) return region1(p, T);
    return region2(p, T);
  }
  if (p <= pB23(T)) return region2(p, T);
  throw new RangeError97("This point is in the near-critical region (IF97 region 3), which these calculators do not cover.");
}

export interface Saturation {
  p: number;
  T: number;
  hf: number;
  hg: number;
  hfg: number;
  sf: number;
  sg: number;
  vf: number;
  vg: number;
}

/** Saturated liquid and vapor at p (MPa). Valid from the triple point to 16.53 MPa (350 °C). */
export function satP(p: number): Saturation {
  if (!(p >= 0.000611657)) throw new RangeError97("Pressure is below the triple point (0.6117 kPa abs).");
  if (p > P_SAT_MAX) throw new RangeError97("Saturation properties are covered up to 16.5 MPa abs (350 °C).");
  return sat(p, tsat(p));
}

/** Saturated liquid and vapor at T (K). */
export function satT(T: number): Saturation {
  if (!(T >= T_MIN)) throw new RangeError97("Temperature is below 0 °C.");
  if (T > T_CRIT_LIMIT) throw new RangeError97("Saturation properties are covered up to 350 °C.");
  return sat(psat(T), T);
}

function sat(p: number, T: number): Saturation {
  const f = region1(p, T);
  const g = region2(p, T);
  return { p, T, hf: f.h, hg: g.h, hfg: g.h - f.h, sf: f.s, sg: g.s, vf: f.v, vg: g.v };
}

/**
 * Compressed liquid at T (K) and a pressure high enough to stay liquid: the
 * larger of p (MPa) and psat(T) + 0.1 MPa. Used for cooling, chilled, and
 * process water where the line pressure barely changes the result.
 */
export function liquid(T: number, p = 0.101325) {
  if (!(T >= T_MIN) || T > T_CRIT_LIMIT) throw new RangeError97("Liquid water properties are covered from 0 °C to 350 °C.");
  const pp = Math.max(p, psat(T) + 0.1);
  const st = region1(pp, T);
  return { ...st, rho: 1 / st.v, mu: viscosity(T, 1 / st.v) };
}

const H0 = [1.67752, 2.20462, 0.6366564, -0.241605];
const H1: number[][] = [
  [5.20094e-1, 2.22531e-1, -2.81378e-1, 1.61913e-1, -3.25372e-2, 0, 0],
  [8.50895e-2, 9.99115e-1, -9.06851e-1, 2.57399e-1, 0, 0, 0],
  [-1.08374, 1.88797, -7.72479e-1, 0, 0, 0, 0],
  [-2.89555e-1, 1.26613, -4.89837e-1, 0, 6.98452e-2, 0, -4.35673e-3],
  [0, 0, -2.5704e-1, 0, 0, 8.72102e-3, 0],
  [0, 1.20573e-1, 0, 0, 0, 0, -5.93264e-4],
];

/** Dynamic viscosity (Pa·s) at T (K) and density (kg/m³): IAPWS 2008, eqs. (11) and (12), μ2 = 1. */
export function viscosity(T: number, rho: number) {
  const Tb = T / 647.096;
  const rb = rho / 322;
  let d0 = 0;
  for (let i = 0; i < 4; i++) d0 += H0[i] / Tb ** i;
  const mu0 = (100 * Math.sqrt(Tb)) / d0;
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    let inner = 0;
    for (let j = 0; j < 7; j++) inner += H1[i][j] * (rb - 1) ** j;
    sum += (1 / Tb - 1) ** i * inner;
  }
  const mu1 = Math.exp(rb * sum);
  return mu0 * mu1 * 1e-6;
}
