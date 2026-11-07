/**
 * Unit families for the plant utility calculators. Every value is converted
 * to one SI base unit per family before a calculation, and back for display.
 * Conversion factors are exact definitions (NIST SP 811, Appendix B) unless
 * noted.
 */

export const P_ATM_KPA = 101.325; // standard atmosphere, kPa (exact by definition)
export const G = 9.80665; // standard gravity, m/s² (exact by definition)
export const R_UNIVERSAL = 8.314462618; // J/(mol·K), CODATA 2018 (exact since the 2019 SI)
const LB = 0.45359237; // kg, exact
const FT = 0.3048; // m, exact
const IN = 0.0254; // m, exact
const GAL = 3.785411784e-3; // m³, US gallon, exact
const BTU = 1.05505585262; // kJ, International Table Btu
const PSI = 6.894757293168; // kPa per lbf/in²
const HP = 0.745699872; // kW, mechanical horsepower (550 ft·lbf/s)
const TON_R = (12000 * BTU) / 3600; // kW, ton of refrigeration = 12,000 Btu/h
const BBL = 42 * GAL; // m³, oil barrel = 42 US gallons, exact
const DAY = 86400; // s
/** Petroleum standard conditions for gas: 60 °F and 14.696 psia (101.325 kPa). */
export const T_SC_K = (60 + 459.67) * (5 / 9);
/** Metric standard conditions for gas: 15 °C and 101.325 kPa. */
export const T_SC_METRIC_K = 288.15;
/** Millidarcy in m² (1 darcy = 9.869233e-13 m², API RP 27 definition as given in NIST SP 811). */
export const MD_M2 = 9.869233e-16;

export type Family =
  | "pabs" | "dp" | "temp" | "dtemp" | "mflow" | "vflow" | "gasflow" | "power" | "cp" | "hspec" | "rho" | "visc"
  | "length" | "diam" | "rough" | "area" | "volume" | "vel" | "time" | "pct" | "ratio" | "count" | "money" | "price" | "ppm" | "spower" | "energy" | "hv" | "head" | "uval" | "fprice"
  // Oil and gas families.
  | "grad" | "perm" | "gor" | "pindex" | "cap" | "mudwt" | "compress";

export interface Unit {
  id: string;
  label: string;
  /** SI value = (v + offset) × factor. */
  factor: number;
  offset?: number;
  /** Gas flow: reference state for standard volumes (T in K, p in kPa); base unit is mol/s. */
  std?: { T: number; p: number; perSeconds: number };
}

const u = (id: string, label: string, factor: number, offset = 0): Unit => ({ id, label, factor, offset });
const std = (id: string, label: string, T: number, p: number, perSeconds: number, m3: number): Unit => ({
  id, label, factor: (m3 * p * 1000) / (R_UNIVERSAL * T) / perSeconds, std: { T, p, perSeconds },
});

/** SI base in brackets. */
export const families: Record<Family, { base: string; units: Unit[] }> = {
  pabs: {
    base: "kPa abs",
    units: [
      u("bara", "bar(a)", 100), u("barg", "bar(g)", 100, P_ATM_KPA / 100), u("kpaa", "kPa(a)", 1), u("kpag", "kPa(g)", 1, P_ATM_KPA),
      u("mpaa", "MPa(a)", 1000), u("psia", "psia", PSI), u("psig", "psig", PSI, P_ATM_KPA / PSI),
      u("kgcm2g", "kg/cm²(g)", 98.0665, P_ATM_KPA / 98.0665),
    ],
  },
  dp: { base: "kPa", units: [u("kpa", "kPa", 1), u("bar", "bar", 100), u("psi", "psi", PSI), u("mbar", "mbar", 0.1), u("inwc", "in H₂O (60 °F)", 0.24884)] },
  temp: { base: "°C", units: [u("c", "°C", 1), u("f", "°F", 5 / 9, -32), u("k", "K", 1, -273.15), u("r", "°R", 5 / 9, -491.67)] },
  dtemp: { base: "K", units: [u("k", "°C (K)", 1), u("f", "°F", 5 / 9)] },
  mflow: { base: "kg/s", units: [u("kgh", "kg/h", 1 / 3600), u("kgs", "kg/s", 1), u("th", "t/h", 1000 / 3600), u("lbh", "lb/h", LB / 3600), u("klbh", "klb/h", (1000 * LB) / 3600)] },
  vflow: { base: "m³/s", units: [u("m3h", "m³/h", 1 / 3600), u("ls", "L/s", 1e-3), u("lmin", "L/min", 1e-3 / 60), u("gpm", "US gpm", GAL / 60), u("m3s", "m³/s", 1), u("m3d", "m³/day", 1 / 86400), u("bpd", "bbl/d", BBL / DAY), u("bph", "bbl/h", BBL / 3600)] },
  gasflow: {
    base: "mol/s",
    units: [
      std("nm3h", "Nm³/h (0 °C, 1 atm)", 273.15, P_ATM_KPA, 3600, 1),
      std("nm3min", "Nm³/min (0 °C, 1 atm)", 273.15, P_ATM_KPA, 60, 1),
      std("scfm", "scfm (60 °F, 14.696 psia)", 288.70556, P_ATM_KPA, 60, FT ** 3),
      std("scfm68", "scfm (68 °F, 14.7 psia)", 293.15, 14.7 * PSI, 60, FT ** 3),
      std("sm3h", "Sm³/h (15 °C, 1 atm)", 288.15, P_ATM_KPA, 3600, 1),
      u("kmolh", "kmol/h", 1000 / 3600),
      std("scfd", "scf/d (60 °F, 14.696 psia)", T_SC_K, P_ATM_KPA, DAY, FT ** 3),
      std("mscfd", "Mscf/d (60 °F, 14.696 psia)", T_SC_K, P_ATM_KPA, DAY, 1000 * FT ** 3),
      std("mmscfd", "MMscf/d (60 °F, 14.696 psia)", T_SC_K, P_ATM_KPA, DAY, 1e6 * FT ** 3),
      std("sm3d", "Sm³/d (15 °C, 1 atm)", T_SC_METRIC_K, P_ATM_KPA, DAY, 1),
      std("ksm3d", "10³ Sm³/d (15 °C, 1 atm)", T_SC_METRIC_K, P_ATM_KPA, DAY, 1000),
    ],
  },
  power: {
    base: "kW",
    units: [u("kw", "kW", 1), u("mw", "MW", 1000), u("w", "W", 1e-3), u("btuh", "Btu/h", BTU / 3600), u("mmbtuh", "MMBtu/h", (1e6 * BTU) / 3600), u("tr", "ton (refrig.)", TON_R), u("hp", "hp", HP), u("kcalh", "kcal/h", 4.1868 / 3600)],
  },
  cp: { base: "kJ/(kg·K)", units: [u("kjkgk", "kJ/kg·K", 1), u("btulbf", "Btu/lb·°F", 4.1868), u("kcalkgc", "kcal/kg·°C", 4.1868)] },
  hspec: { base: "kJ/kg", units: [u("kjkg", "kJ/kg", 1), u("btulb", "Btu/lb", 2.326)] },
  hv: { base: "kJ/kg", units: [u("mjkg", "MJ/kg", 1000), u("kjkg", "kJ/kg", 1), u("btulb", "Btu/lb", 2.326)] },
  rho: { base: "kg/m³", units: [u("kgm3", "kg/m³", 1), u("lbft3", "lb/ft³", LB / FT ** 3), u("sg", "specific gravity (water = 1000 kg/m³)", 1000), u("ppg", "lb/gal (ppg)", LB / GAL)] },
  visc: { base: "Pa·s", units: [u("cp", "cP (mPa·s)", 1e-3), u("pas", "Pa·s", 1)] },
  length: { base: "m", units: [u("m", "m", 1), u("ft", "ft", FT), u("km", "km", 1000), u("mi", "mi", 1609.344)] },
  head: { base: "m", units: [u("m", "m", 1), u("ft", "ft", FT)] },
  diam: { base: "m", units: [u("mm", "mm", 1e-3), u("in", "in", IN), u("m", "m", 1), u("in64", "1/64 in", IN / 64)] },
  rough: { base: "m", units: [u("mm", "mm", 1e-3), u("in", "in", IN), u("um", "µm", 1e-6)] },
  area: { base: "m²", units: [u("m2", "m²", 1), u("ft2", "ft²", FT ** 2), u("in2", "in²", IN ** 2)] },
  volume: { base: "m³", units: [u("m3", "m³", 1), u("l", "L", 1e-3), u("ft3", "ft³", FT ** 3), u("gal", "US gal", GAL), u("bbl", "bbl (42 US gal)", 42 * GAL)] },
  vel: { base: "m/s", units: [u("ms", "m/s", 1), u("fts", "ft/s", FT), u("ftmin", "ft/min", FT / 60)] },
  time: { base: "s", units: [u("s", "s", 1), u("min", "min", 60), u("h", "h", 3600)] },
  pct: { base: "%", units: [u("pct", "%", 1)] },
  ratio: { base: "", units: [u("x", "", 1)] },
  count: { base: "", units: [u("n", "", 1)] },
  money: { base: "$", units: [u("usd", "$", 1)] },
  price: { base: "$/kWh", units: [u("kwh", "$/kWh", 1)] },
  ppm: { base: "ppm", units: [u("ppm", "ppm (mg/L)", 1)] },
  spower: { base: "kW per m³/min", units: [u("kwm3min", "kW per m³/min", 1), u("kw100cfm", "kW per 100 cfm", 1 / (100 * FT ** 3))] },
  energy: { base: "kWh", units: [u("kwh", "kWh", 1), u("mwh", "MWh", 1000), u("mmbtu", "MMBtu", (1e6 * BTU) / 3600), u("gj", "GJ", 1000 / 3.6)] },
  fprice: { base: "$/GJ", units: [u("mmbtu", "$/MMBtu", 1 / 1.05505585262), u("gj", "$/GJ", 1), u("therm", "$/therm", 1 / 0.105505585262)] },
  grad: { base: "kPa/m", units: [u("psift", "psi/ft", PSI / FT), u("kpam", "kPa/m", 1), u("barm", "bar/m", 100)] },
  perm: { base: "mD", units: [u("md", "mD (millidarcy)", 1), u("d", "D (darcy)", 1000), u("um2", "µm²", 1e-12 / MD_M2)] },
  // Liquids by volume, gas at its standard state: 1 Sm³ (15 °C) holds T_SC_K/T_SC_METRIC_K more gas than 1 m³ at 60 °F.
  gor: { base: "Sm³/m³", units: [u("sm3m3", "Sm³/m³ (15 °C)", 1), u("scfbbl", "scf/bbl (60 °F)", (FT ** 3 / BBL) * (T_SC_METRIC_K / T_SC_K)), u("mscfbbl", "Mscf/bbl (60 °F)", ((1000 * FT ** 3) / BBL) * (T_SC_METRIC_K / T_SC_K))] },
  pindex: { base: "m³/(s·kPa)", units: [u("bpdpsi", "bbl/d per psi", BBL / DAY / PSI), u("m3dbar", "m³/d per bar", 1 / DAY / 100), u("m3dkpa", "m³/d per kPa", 1 / DAY)] },
  cap: { base: "m³/m", units: [u("bblft", "bbl/ft", BBL / FT), u("m3m", "m³/m", 1), u("lm", "L/m", 1e-3), u("galft", "US gal/ft", GAL / FT)] },
  compress: { base: "1/kPa", units: [u("perpsi", "1/psi", 1 / PSI), u("perbar", "1/bar", 1 / 100), u("perkpa", "1/kPa", 1)] },
  mudwt: { base: "kg/m³", units: [u("ppg", "lb/gal (ppg)", LB / GAL), u("sg", "SG (g/cm³)", 1000), u("kgm3", "kg/m³", 1), u("pcf", "lb/ft³", LB / FT ** 3)] },
  uval: { base: "W/(m²·K)", units: [u("wm2k", "W/m²·K", 1), u("btuhft2f", "Btu/h·ft²·°F", 5.678263)] },
};

export function unitOf(family: Family, id: string) {
  const f = families[family];
  return f.units.find((x) => x.id === id) ?? f.units[0];
}

export const toSI = (family: Family, unit: string, v: number) => {
  const x = unitOf(family, unit);
  return (v + (x.offset ?? 0)) * x.factor;
};

export const fromSI = (family: Family, unit: string, v: number) => {
  const x = unitOf(family, unit);
  return v / x.factor - (x.offset ?? 0);
};

/** Molar mass, kg/mol. Dry air: 28.9647 g/mol (U.S. Standard Atmosphere, 1976). N₂: 28.0134 g/mol (IUPAC). */
export const M_AIR = 0.0289647;
export const M_N2 = 0.0280134;

/** Formats a number for display: 4 significant figures, thousands separators, no exponent between 1e-4 and 1e9. */
export function fmt(v: number, sig = 4) {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a < 1e-4 || a >= 1e12) return v.toExponential(sig - 1);
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
  return v.toLocaleString("en-US", { maximumFractionDigits: Math.min(digits, 8), minimumFractionDigits: 0 });
}
