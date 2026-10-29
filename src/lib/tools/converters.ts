/**
 * Air-quality unit converters. Each one is plain engineering arithmetic
 * (ideal gas law, oxygen correction, unit factors) with every step shown.
 * Converters never supply regulatory values: reference O2 levels, F-factors,
 * standard conditions, and limits come from the user's permit or rule.
 */

export interface ConvField {
  key: string;
  label: string;
  unit?: string;
  /** Default value; null leaves the field blank so the user must supply it. */
  default: number | null;
  help?: string;
  /** Only shown in these modes. */
  modes?: string[];
}

export interface ConvOutput {
  results: { label: string; value: number; unit: string }[];
  steps: string[];
  error?: string;
}

export interface Converter {
  slug: string;
  /** Short name used in lists. */
  name: string;
  /** H1 and SEO title. */
  title: string;
  description: string;
  intro: string;
  modes?: { key: string; label: string }[];
  fields: ConvField[];
  /** Quick-fill buttons for a field. */
  presets?: { field: string; label: string; options: { label: string; value: number }[] }[];
  compute: (v: Record<string, number | null>, mode: string) => ConvOutput;
  formula: string[];
  notes: string[];
  faqs: { q: string; a: string }[];
  sources: { title: string; url: string }[];
  related: string[];
  keywords: string;
}

/** R in psia·ft³/(lb-mol·°R). */
const R_PSIA = 10.7316;
/** psi per inch of mercury (at 32 °F). */
const PSI_PER_INHG = 0.4911541;
/** L·atm/(mol·K). */
const R_LATM = 0.0820574;
const LB_PER_G = 1 / 453.59237;

/** Molar volume in scf per lb-mol at a temperature (°F) and pressure (inHg). */
export const molarVolumeScf = (tF: number, pInHg: number) => (R_PSIA * (tF + 459.67)) / (pInHg * PSI_PER_INHG);

/** Molar volume in liters per mol at a temperature (°C) and pressure (atm). */
export const molarVolumeL = (tC: number, pAtm: number) => (R_LATM * (tC + 273.15)) / pAtm;

export const fmt = (n: number, digits = 5) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumSignificantDigits: digits }) : "—";

/** Molecular weights from standard atomic weights. */
export const molecularWeights = [
  { label: "NOx (as NO2)", value: 46.006 },
  { label: "NO", value: 30.006 },
  { label: "CO", value: 28.010 },
  { label: "SO2", value: 64.058 },
  { label: "CO2", value: 44.009 },
  { label: "CH4", value: 16.043 },
  { label: "NH3", value: 17.031 },
  { label: "H2S", value: 34.076 },
  { label: "HCl", value: 36.458 },
  { label: "Formaldehyde", value: 30.026 },
  { label: "Propane", value: 44.097 },
];

const mwPreset = { field: "mw", label: "Pollutant", options: molecularWeights };
const stdTempPreset = { field: "tF", label: "Standard temperature", options: [{ label: "68 °F", value: 68 }, { label: "60 °F", value: 60 }, { label: "70 °F", value: 70 }] };

const need = (v: Record<string, number | null>, keys: string[]): string | null => {
  const missing = keys.filter((k) => v[k] === null || v[k] === undefined || !Number.isFinite(v[k] as number));
  return missing.length ? "Fill in every field to see the result." : null;
};
const fail = (error: string): ConvOutput => ({ results: [], steps: [], error });

const ecfr = (section: string) => `https://www.ecfr.gov/current/title-40/section-${section}`;
const part60AppA = "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-60";

const sharedNotes = {
  basis: "Concentration and flow must be on the same basis. Dry concentrations (ppmvd) go with dry standard flow (dscfm); wet with wet.",
  std: "Standard conditions differ between rules and programs. Use the temperature and pressure your permit, rule, or test method defines.",
  nox: "Many rules express NOx as NO2 when converting to mass. Check the rule that applies.",
};

export const converters: Converter[] = [
  {
    slug: "ppm-to-lb-hr",
    name: "ppm to lb/hr",
    title: "ppm to lb/hr Converter (Stack Concentration to Mass Rate)",
    description: "Convert a stack gas concentration in ppmv to a mass emission rate in lb/hr, or back, using stack flow and molecular weight. Shows every step.",
    intro: "Stack tests and CEMS report concentrations in parts per million by volume; permits usually limit pounds per hour. This converter uses the ideal gas law at the standard conditions you choose.",
    modes: [{ key: "fwd", label: "ppm → lb/hr" }, { key: "rev", label: "lb/hr → ppm" }],
    fields: [
      { key: "ppm", label: "Concentration", unit: "ppmv", default: 50, modes: ["fwd"] },
      { key: "lbhr", label: "Mass rate", unit: "lb/hr", default: 1, modes: ["rev"] },
      { key: "mw", label: "Molecular weight", unit: "lb/lb-mol", default: 46.006 },
      { key: "flow", label: "Stack flow", unit: "scfm (standard ft³/min)", default: 5000, help: "Same basis as the concentration (dry or wet)." },
      { key: "tF", label: "Standard temperature", unit: "°F", default: 68 },
      { key: "pIn", label: "Standard pressure", unit: "inHg", default: 29.92 },
    ],
    presets: [mwPreset, stdTempPreset],
    compute: (v, mode) => {
      const err = need(v, mode === "rev" ? ["lbhr", "mw", "flow", "tF", "pIn"] : ["ppm", "mw", "flow", "tF", "pIn"]);
      if (err) return fail(err);
      const mw = v.mw!, flow = v.flow!, tF = v.tF!, p = v.pIn!;
      if (flow <= 0 || mw <= 0 || p <= 0) return fail("Flow, molecular weight, and pressure must be greater than zero.");
      const vm = molarVolumeScf(tF, p);
      const steps = [`Molar volume = ${R_PSIA} × (${fmt(tF)} + 459.67) ÷ (${fmt(p)} × ${PSI_PER_INHG}) = ${fmt(vm)} scf/lb-mol`];
      if (mode === "rev") {
        const ppm = (v.lbhr! * vm * 1e6) / (mw * flow * 60);
        steps.push(`ppm = lb/hr × molar volume × 10⁶ ÷ (MW × flow × 60) = ${fmt(v.lbhr!)} × ${fmt(vm)} × 10⁶ ÷ (${fmt(mw)} × ${fmt(flow)} × 60) = ${fmt(ppm)} ppmv`);
        return { results: [{ label: "Concentration", value: ppm, unit: "ppmv" }], steps };
      }
      const lbhr = (v.ppm! * 1e-6 * mw * flow * 60) / vm;
      steps.push(`lb/hr = ppm × 10⁻⁶ × MW × flow × 60 ÷ molar volume = ${fmt(v.ppm!)} × 10⁻⁶ × ${fmt(mw)} × ${fmt(flow)} × 60 ÷ ${fmt(vm)} = ${fmt(lbhr)} lb/hr`);
      return { results: [{ label: "Mass rate", value: lbhr, unit: "lb/hr" }, { label: "At 8,760 hr/yr", value: (lbhr * 8760) / 2000, unit: "tons/yr" }], steps };
    },
    formula: ["lb/hr = ppmv × 10⁻⁶ × MW × Q(scfm) × 60 ÷ V̂", "V̂ (scf/lb-mol) = R × T(°R) ÷ P(psia), with R = 10.7316 psia·ft³/(lb-mol·°R)"],
    notes: [sharedNotes.basis, sharedNotes.std, sharedNotes.nox],
    faqs: [
      { q: "Why does the standard temperature change the answer?", a: "A pound-mole of gas occupies more volume at a higher temperature, so the same ppm in the same standard flow represents a slightly different mass. Use the standard conditions your rule or test method defines, and keep the flow on the same standard." },
      { q: "Can I use actual (acfm) flow?", a: "Not directly. Convert actual flow to standard flow with the stack temperature, pressure, and (for a dry basis) moisture first. The concentration and flow must share the same basis." },
      { q: "What molecular weight do I use for VOC?", a: "It depends on how the rule expresses VOC, for example as carbon, as propane, or as the compound measured. Check the rule and the test method." },
    ],
    sources: [{ title: "40 CFR Part 60, Appendix A (test methods)", url: part60AppA }],
    related: ["o2-correction", "lb-hr-to-tpy", "wet-to-dry", "ppm-to-lb-mmbtu"],
    keywords: "ppm to lb/hr ppmv to pounds per hour stack concentration mass emission rate dscfm molar volume 385",
  },
  {
    slug: "o2-correction",
    name: "O2 correction",
    title: "O2 Correction Calculator (Correct ppm to a Reference Oxygen Level)",
    description: "Correct a measured concentration to a reference oxygen level such as 3%, 7%, or 15% O2 using the 20.9 correction. Shows the formula and steps.",
    intro: "Emission limits for combustion sources are often written at a reference oxygen level so diluted exhaust can't look cleaner than it is. Enter the measured concentration and O2 (dry basis) and the reference O2 from your permit or rule.",
    fields: [
      { key: "c", label: "Measured concentration", unit: "ppmvd (or any unit)", default: 25 },
      { key: "o2m", label: "Measured O2", unit: "% dry", default: 10 },
      { key: "o2r", label: "Reference O2", unit: "% dry", default: 15, help: "Use the reference O2 your permit or rule specifies." },
    ],
    presets: [{ field: "o2r", label: "Reference O2", options: [{ label: "3%", value: 3 }, { label: "7%", value: 7 }, { label: "15%", value: 15 }] }],
    compute: (v) => {
      const err = need(v, ["c", "o2m", "o2r"]);
      if (err) return fail(err);
      const { c, o2m, o2r } = v as Record<string, number>;
      if (o2m >= 20.9) return fail("Measured O2 must be below 20.9%.");
      if (o2r >= 20.9 || o2r < 0 || o2m < 0) return fail("O2 values must be between 0 and 20.9%.");
      const factor = (20.9 - o2r) / (20.9 - o2m);
      const out = c * factor;
      return {
        results: [{ label: `Corrected to ${fmt(o2r)}% O2`, value: out, unit: "same unit as measured" }, { label: "Correction factor", value: factor, unit: "×" }],
        steps: [`Factor = (20.9 − ${fmt(o2r)}) ÷ (20.9 − ${fmt(o2m)}) = ${fmt(20.9 - o2r)} ÷ ${fmt(20.9 - o2m)} = ${fmt(factor)}`, `Corrected = ${fmt(c)} × ${fmt(factor)} = ${fmt(out)}`],
      };
    },
    formula: ["C(ref) = C(measured) × (20.9 − O2(ref)) ÷ (20.9 − O2(measured))", "Both O2 values in percent, dry basis"],
    notes: ["The 20.9 correction assumes the measured concentration and O2 are both on a dry basis.", "Check whether your rule specifies a different correction (for example a CO2-based correction) before using this one."],
    faqs: [
      { q: "Why correct to a reference O2?", a: "Adding excess air dilutes the exhaust and lowers the measured ppm without lowering mass emissions. Correcting every result to the same oxygen level makes results comparable to the limit." },
      { q: "Which reference O2 should I use?", a: "The one written in your permit condition or the rule's emission standard. Different source categories use different reference levels." },
      { q: "Can I correct a wet concentration?", a: "Convert it to a dry basis first (see the wet-to-dry converter) and use O2 on a dry basis." },
    ],
    sources: [{ title: "40 CFR Part 60, Appendix A (Method 19 and other test methods)", url: part60AppA }],
    related: ["ppm-to-lb-mmbtu", "ppm-to-lb-hr", "wet-to-dry"],
    keywords: "o2 correction 15% o2 3% o2 7% o2 corrected ppm ppmvd at 15 percent oxygen 20.9 correction formula",
  },
  {
    slug: "ppm-to-lb-mmbtu",
    name: "ppm to lb/MMBtu",
    title: "ppm to lb/MMBtu Converter (F-Factor Method)",
    description: "Convert ppmvd at a measured O2 to lb/MMBtu with an oxygen-based F-factor (Fd), or back. Formula, steps, and Method 19 reference shown.",
    intro: "Heat-input-based limits (lb/MMBtu) are compared with stack concentrations using a fuel-specific F-factor. Enter the Fd value for your fuel from EPA Method 19 or the value your permit specifies.",
    modes: [{ key: "fwd", label: "ppm → lb/MMBtu" }, { key: "rev", label: "lb/MMBtu → ppm" }],
    fields: [
      { key: "ppm", label: "Concentration", unit: "ppmvd", default: 9, modes: ["fwd"] },
      { key: "e", label: "Emission rate", unit: "lb/MMBtu", default: null, modes: ["rev"] },
      { key: "o2", label: "O2 at which the concentration is expressed", unit: "% dry", default: 15 },
      { key: "mw", label: "Molecular weight", unit: "lb/lb-mol", default: 46.006 },
      { key: "fd", label: "Oxygen-based F-factor, Fd", unit: "dscf/MMBtu", default: null, help: "From Method 19 (40 CFR Part 60, Appendix A-7) or your permit." },
      { key: "tF", label: "Standard temperature", unit: "°F", default: 68, help: "Use the standard conditions the F-factor is expressed at." },
      { key: "pIn", label: "Standard pressure", unit: "inHg", default: 29.92 },
    ],
    presets: [mwPreset],
    compute: (v, mode) => {
      const err = need(v, [mode === "rev" ? "e" : "ppm", "o2", "mw", "fd", "tF", "pIn"]);
      if (err) return fail(err);
      const o2 = v.o2!, mw = v.mw!, fd = v.fd!;
      if (o2 >= 20.9 || o2 < 0) return fail("O2 must be between 0 and 20.9%.");
      if (fd <= 0 || mw <= 0) return fail("F-factor and molecular weight must be greater than zero.");
      const vm = molarVolumeScf(v.tF!, v.pIn!);
      const perPpm = (1e-6 * mw) / vm;
      const dil = 20.9 / (20.9 - o2);
      const steps = [
        `Molar volume = ${fmt(vm)} scf/lb-mol`,
        `lb/dscf per ppm = 10⁻⁶ × ${fmt(mw)} ÷ ${fmt(vm)} = ${perPpm.toExponential(4)}`,
        `O2 term = 20.9 ÷ (20.9 − ${fmt(o2)}) = ${fmt(dil)}`,
      ];
      if (mode === "rev") {
        const ppm = v.e! / (perPpm * fd * dil);
        steps.push(`ppm = E ÷ (lb/dscf per ppm × Fd × O2 term) = ${fmt(v.e!)} ÷ (${perPpm.toExponential(4)} × ${fmt(fd)} × ${fmt(dil)}) = ${fmt(ppm)} ppmvd`);
        return { results: [{ label: `Concentration at ${fmt(o2)}% O2`, value: ppm, unit: "ppmvd" }], steps };
      }
      const e = v.ppm! * perPpm * fd * dil;
      steps.push(`E = ${fmt(v.ppm!)} × ${perPpm.toExponential(4)} × ${fmt(fd)} × ${fmt(dil)} = ${fmt(e)} lb/MMBtu`);
      return { results: [{ label: "Emission rate", value: e, unit: "lb/MMBtu" }], steps };
    },
    formula: ["E (lb/MMBtu) = C(lb/dscf) × Fd × 20.9 ÷ (20.9 − %O2d)", "C(lb/dscf) = ppmvd × 10⁻⁶ × MW ÷ V̂"],
    notes: ["Fd is fuel specific. AirPermitHub does not prefill it; take it from Method 19 or your permit so the source is on record.", "The O2 entered is the O2 level the concentration is expressed at: the measured O2 for a raw result, or the reference O2 for a corrected one.", sharedNotes.nox],
    faqs: [
      { q: "Where do F-factors come from?", a: "EPA Method 19 (40 CFR Part 60, Appendix A-7) tabulates F-factors by fuel type and explains how to calculate them from a fuel analysis. Some permits specify the value to use." },
      { q: "Does it matter if my ppm is already corrected to 15% O2?", a: "Use the O2 level the concentration is expressed at. A value corrected to 15% O2 uses 15 in the O2 term; a raw value uses the measured O2. Both give the same lb/MMBtu." },
    ],
    sources: [{ title: "40 CFR Part 60, Appendix A-7 (Method 19)", url: part60AppA }],
    related: ["o2-correction", "ppm-to-lb-hr", "lb-mmbtu-to-lb-hr"],
    keywords: "ppm to lb/mmbtu f factor fd method 19 nox lb per million btu heat input emission rate conversion",
  },
  {
    slug: "lb-mmbtu-to-lb-hr",
    name: "lb/MMBtu to lb/hr",
    title: "lb/MMBtu to lb/hr Converter (Heat Input Basis)",
    description: "Convert a heat-input emission factor in lb/MMBtu to lb/hr and tons/yr from firing rate, or from fuel use and heating value.",
    intro: "Burner, heater, and boiler factors are often in lb/MMBtu. Multiply by heat input to get a mass rate. Enter heat input directly, or fuel flow and heating value.",
    modes: [{ key: "heat", label: "From heat input" }, { key: "fuel", label: "From fuel flow and heating value" }],
    fields: [
      { key: "ef", label: "Emission factor", unit: "lb/MMBtu", default: null },
      { key: "q", label: "Heat input", unit: "MMBtu/hr", default: 10, modes: ["heat"] },
      { key: "fuel", label: "Fuel flow", unit: "scf/hr", default: 10000, modes: ["fuel"] },
      { key: "hv", label: "Heating value", unit: "Btu/scf", default: null, modes: ["fuel"], help: "HHV or LHV, matching the basis of the emission factor." },
      { key: "hrs", label: "Operating hours", unit: "hr/yr", default: 8760 },
    ],
    compute: (v, mode) => {
      const err = need(v, mode === "fuel" ? ["ef", "fuel", "hv", "hrs"] : ["ef", "q", "hrs"]);
      if (err) return fail(err);
      const steps: string[] = [];
      let q = v.q!;
      if (mode === "fuel") {
        q = (v.fuel! * v.hv!) / 1e6;
        steps.push(`Heat input = ${fmt(v.fuel!)} scf/hr × ${fmt(v.hv!)} Btu/scf ÷ 10⁶ = ${fmt(q)} MMBtu/hr`);
      }
      const lbhr = v.ef! * q;
      const tpy = (lbhr * v.hrs!) / 2000;
      steps.push(`lb/hr = ${fmt(v.ef!)} × ${fmt(q)} = ${fmt(lbhr)}`, `tons/yr = ${fmt(lbhr)} × ${fmt(v.hrs!)} ÷ 2,000 = ${fmt(tpy)}`);
      return { results: [{ label: "Mass rate", value: lbhr, unit: "lb/hr" }, { label: "Annual", value: tpy, unit: "tons/yr" }], steps };
    },
    formula: ["lb/hr = EF (lb/MMBtu) × heat input (MMBtu/hr)", "Heat input = fuel flow × heating value ÷ 10⁶", "tons/yr = lb/hr × hr/yr ÷ 2,000"],
    notes: ["Match the heating value basis (HHV or LHV) to the basis of the emission factor.", "For potential to emit, use maximum heat input and the hours your enforceable limits allow."],
    faqs: [
      { q: "HHV or LHV?", a: "Use the basis the emission factor is written on; the factor's source document states it. Mixing bases shifts the result by the HHV/LHV ratio." },
    ],
    sources: [{ title: "EPA: AP-42 Compilation of Air Emissions Factors", url: "https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors-stationary-sources" }],
    related: ["ppm-to-lb-mmbtu", "lb-hr-to-tpy"],
    keywords: "lb/mmbtu to lb/hr heat input emission factor heater boiler burner mmbtu/hr fuel flow heating value hhv",
  },
  {
    slug: "g-hp-hr-to-lb-hr",
    name: "g/hp-hr to lb/hr",
    title: "g/hp-hr to lb/hr Converter (Engine Emissions)",
    description: "Convert engine emission factors between g/bhp-hr and lb/hr, with tons per year at the hours you enter.",
    intro: "Engine standards and manufacturer data are often in grams per brake horsepower-hour. Permits and inventories need pounds per hour and tons per year.",
    modes: [{ key: "fwd", label: "g/hp-hr → lb/hr" }, { key: "rev", label: "lb/hr → g/hp-hr" }],
    fields: [
      { key: "g", label: "Emission factor", unit: "g/bhp-hr", default: 1, modes: ["fwd"] },
      { key: "lbhr", label: "Mass rate", unit: "lb/hr", default: 1, modes: ["rev"] },
      { key: "hp", label: "Engine power", unit: "bhp", default: 1000 },
      { key: "hrs", label: "Operating hours", unit: "hr/yr", default: 8760 },
    ],
    compute: (v, mode) => {
      const err = need(v, [mode === "rev" ? "lbhr" : "g", "hp", "hrs"]);
      if (err) return fail(err);
      if (v.hp! <= 0) return fail("Engine power must be greater than zero.");
      if (mode === "rev") {
        const g = (v.lbhr! * 453.59237) / v.hp!;
        return { results: [{ label: "Emission factor", value: g, unit: "g/bhp-hr" }], steps: [`g/bhp-hr = ${fmt(v.lbhr!)} × 453.59237 ÷ ${fmt(v.hp!)} = ${fmt(g)}`] };
      }
      const lbhr = v.g! * v.hp! * LB_PER_G;
      const tpy = (lbhr * v.hrs!) / 2000;
      return {
        results: [{ label: "Mass rate", value: lbhr, unit: "lb/hr" }, { label: "Annual", value: tpy, unit: "tons/yr" }],
        steps: [`lb/hr = ${fmt(v.g!)} g/bhp-hr × ${fmt(v.hp!)} bhp ÷ 453.59237 g/lb = ${fmt(lbhr)}`, `tons/yr = ${fmt(lbhr)} × ${fmt(v.hrs!)} ÷ 2,000 = ${fmt(tpy)}`],
      };
    },
    formula: ["lb/hr = g/bhp-hr × bhp ÷ 453.59237", "tons/yr = lb/hr × hr/yr ÷ 2,000"],
    notes: ["Use the power rating the factor or standard is based on (for example site-rated or nameplate bhp).", "For potential to emit, use the hours your enforceable limits allow, or full-year operation if there is none."],
    faqs: [
      { q: "Where does 453.59237 come from?", a: "It is the exact number of grams in one avoirdupois pound." },
    ],
    sources: [{ title: "40 CFR 60.4233 (NSPS JJJJ emission standards, expressed in g/HP-hr)", url: ecfr("60.4233") }],
    related: ["lb-hr-to-tpy", "ppm-to-lb-hr"],
    keywords: "g/hp-hr to lb/hr grams per horsepower hour engine emissions nox co voc bhp tons per year compressor engine",
  },
  {
    slug: "lb-hr-to-tpy",
    name: "lb/hr to tons/yr",
    title: "lb/hr to Tons per Year Converter",
    description: "Convert an hourly emission rate to tons per year at the operating hours you enter, or back from tons per year to lb/hr.",
    intro: "Short-term limits are in lb/hr; annual limits and major source comparisons are in tons per year. The conversion depends only on the hours of operation.",
    modes: [{ key: "fwd", label: "lb/hr → tons/yr" }, { key: "rev", label: "tons/yr → lb/hr" }],
    fields: [
      { key: "lbhr", label: "Hourly rate", unit: "lb/hr", default: 1, modes: ["fwd"] },
      { key: "tpy", label: "Annual rate", unit: "tons/yr", default: 1, modes: ["rev"] },
      { key: "hrs", label: "Operating hours", unit: "hr/yr", default: 8760, help: "8,760 is every hour of a 365-day year." },
    ],
    compute: (v, mode) => {
      const err = need(v, [mode === "rev" ? "tpy" : "lbhr", "hrs"]);
      if (err) return fail(err);
      if (v.hrs! <= 0) return fail("Hours must be greater than zero.");
      if (mode === "rev") {
        const lbhr = (v.tpy! * 2000) / v.hrs!;
        return { results: [{ label: "Hourly rate", value: lbhr, unit: "lb/hr" }], steps: [`lb/hr = ${fmt(v.tpy!)} × 2,000 ÷ ${fmt(v.hrs!)} = ${fmt(lbhr)}`] };
      }
      const tpy = (v.lbhr! * v.hrs!) / 2000;
      return { results: [{ label: "Annual rate", value: tpy, unit: "tons/yr" }, { label: "Daily (24 hr)", value: v.lbhr! * 24, unit: "lb/day" }], steps: [`tons/yr = ${fmt(v.lbhr!)} × ${fmt(v.hrs!)} ÷ 2,000 = ${fmt(tpy)}`] };
    },
    formula: ["tons/yr = lb/hr × hr/yr ÷ 2,000", "lb/hr = tons/yr × 2,000 ÷ hr/yr"],
    notes: ["A short ton is 2,000 lb. Some inventories ask for metric tonnes (2,204.62 lb).", "For potential to emit, use the hours your enforceable limits allow, or full-year operation if there is none."],
    faqs: [{ q: "Why 8,760 hours?", a: "It is 24 hours × 365 days, the default for full-time operation. Use the hours an enforceable limit allows if one applies." }],
    sources: [{ title: "40 CFR 52.21(b)(4) (potential to emit)", url: `${ecfr("52.21")}#p-52.21(b)(4)` }],
    related: ["g-hp-hr-to-lb-hr", "ppm-to-lb-hr", "lb-mmbtu-to-lb-hr"],
    keywords: "lb/hr to tpy pounds per hour to tons per year 8760 hours annual emissions conversion",
  },
  {
    slug: "ppm-to-mg-m3",
    name: "ppm to mg/m³",
    title: "ppm to mg/m³ Converter",
    description: "Convert gas concentrations between ppmv and mg/m³ at the temperature and pressure you choose.",
    intro: "Ambient, workplace, and some stack standards use mg/m³ or µg/m³ instead of ppm. The conversion uses the molar volume at the stated conditions.",
    modes: [{ key: "fwd", label: "ppm → mg/m³" }, { key: "rev", label: "mg/m³ → ppm" }],
    fields: [
      { key: "ppm", label: "Concentration", unit: "ppmv", default: 1, modes: ["fwd"] },
      { key: "mg", label: "Concentration", unit: "mg/m³", default: 1, modes: ["rev"] },
      { key: "mw", label: "Molecular weight", unit: "g/mol", default: 64.058 },
      { key: "tC", label: "Temperature", unit: "°C", default: 25 },
      { key: "pAtm", label: "Pressure", unit: "atm", default: 1 },
    ],
    presets: [mwPreset, { field: "tC", label: "Temperature", options: [{ label: "0 °C", value: 0 }, { label: "20 °C", value: 20 }, { label: "25 °C", value: 25 }] }],
    compute: (v, mode) => {
      const err = need(v, [mode === "rev" ? "mg" : "ppm", "mw", "tC", "pAtm"]);
      if (err) return fail(err);
      if (v.pAtm! <= 0 || v.mw! <= 0) return fail("Pressure and molecular weight must be greater than zero.");
      const vm = molarVolumeL(v.tC!, v.pAtm!);
      const steps = [`Molar volume = 0.0820574 × (${fmt(v.tC!)} + 273.15) ÷ ${fmt(v.pAtm!)} = ${fmt(vm)} L/mol`];
      if (mode === "rev") {
        const ppm = (v.mg! * vm) / v.mw!;
        steps.push(`ppm = ${fmt(v.mg!)} × ${fmt(vm)} ÷ ${fmt(v.mw!)} = ${fmt(ppm)}`);
        return { results: [{ label: "Concentration", value: ppm, unit: "ppmv" }], steps };
      }
      const mg = (v.ppm! * v.mw!) / vm;
      steps.push(`mg/m³ = ${fmt(v.ppm!)} × ${fmt(v.mw!)} ÷ ${fmt(vm)} = ${fmt(mg)}`);
      return { results: [{ label: "Concentration", value: mg, unit: "mg/m³" }, { label: "Concentration", value: mg * 1000, unit: "µg/m³" }], steps };
    },
    formula: ["mg/m³ = ppmv × MW ÷ V̂", "V̂ (L/mol) = 0.0820574 × T(K) ÷ P(atm)"],
    notes: ["Reference conditions differ between programs. Use the temperature and pressure the standard you are comparing against specifies."],
    faqs: [{ q: "Why does 24.45 appear in many formulas?", a: "It is the molar volume in liters per mole at 25 °C and 1 atm. At other conditions the value changes, which is why this converter asks for temperature and pressure." }],
    sources: [{ title: "40 CFR Part 50 (National Ambient Air Quality Standards)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-50" }],
    related: ["ppm-to-lb-hr", "o2-correction"],
    keywords: "ppm to mg/m3 mg per cubic meter ug/m3 micrograms ppmv conversion 24.45 molar volume",
  },
  {
    slug: "wet-to-dry",
    name: "Wet to dry basis",
    title: "Wet to Dry Basis Converter (Stack Moisture Correction)",
    description: "Convert a stack concentration between wet and dry basis using the moisture fraction (Bws).",
    intro: "Some analyzers measure on a wet basis; most limits are on a dry basis. The correction uses the stack gas moisture fraction from a moisture determination such as EPA Method 4.",
    modes: [{ key: "fwd", label: "Wet → dry" }, { key: "rev", label: "Dry → wet" }],
    fields: [
      { key: "c", label: "Concentration", unit: "ppmv (or any unit)", default: 40 },
      { key: "bws", label: "Moisture content", unit: "% by volume", default: 12, help: "Bws × 100. For example 12 for 12% moisture." },
    ],
    compute: (v, mode) => {
      const err = need(v, ["c", "bws"]);
      if (err) return fail(err);
      const b = v.bws! / 100;
      if (b < 0 || b >= 1) return fail("Moisture must be at least 0% and below 100%.");
      const out = mode === "rev" ? v.c! * (1 - b) : v.c! / (1 - b);
      return {
        results: [{ label: mode === "rev" ? "Wet basis" : "Dry basis", value: out, unit: "same unit as entered" }],
        steps: [mode === "rev" ? `C(wet) = ${fmt(v.c!)} × (1 − ${fmt(b)}) = ${fmt(out)}` : `C(dry) = ${fmt(v.c!)} ÷ (1 − ${fmt(b)}) = ${fmt(out)}`],
      };
    },
    formula: ["C(dry) = C(wet) ÷ (1 − Bws)", "C(wet) = C(dry) × (1 − Bws)"],
    notes: ["Bws is the water vapor fraction of the stack gas by volume, as a decimal."],
    faqs: [{ q: "Where does Bws come from?", a: "From a moisture determination during the test, such as EPA Method 4, or from a moisture monitor. Use the value measured at the same time as the concentration." }],
    sources: [{ title: "40 CFR Part 60, Appendix A-3 (Method 4)", url: part60AppA }],
    related: ["o2-correction", "ppm-to-lb-hr"],
    keywords: "wet to dry basis moisture correction bws method 4 ppmvd ppmvw stack moisture",
  },
];

export const getConverter = (slug: string) => converters.find((c) => c.slug === slug);

/** Default values for a converter, keyed by field. */
export const converterDefaults = (c: Converter) => Object.fromEntries(c.fields.map((f) => [f.key, f.default]));
