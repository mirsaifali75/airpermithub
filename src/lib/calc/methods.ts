/**
 * Emission calculation methods.
 *
 * Methods define the math only. Emission factors are always supplied by the
 * user (or, in Phase 2, selected from the EmissionFactor table with full
 * provenance). No regulatory emission factors are hard-coded here.
 *
 * "Demo values" exist only so the interface can be explored. They are
 * illustrative numbers with no source and are flagged everywhere they appear.
 */

export const G_PER_LB = 453.592;
export const LB_PER_KG = 2.20462;

export interface NumberInput {
  key: string;
  label: string;
  unit: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  demo: number;
}

export interface FactorInput {
  key: string;
  label: string;
  unit: string;
  demo: number;
}

export interface CalcStep {
  label: string;
  expression: string;
  value: number;
  unit: string;
}

export interface MethodResult {
  lbPerHr: number;
  steps: CalcStep[];
}

export const calcCategories = ["Popular", "EPA Methods", "Oil & Gas", "Combustion", "Storage Tanks", "Fugitives", "Other"] as const;
export type CalcCategory = (typeof calcCategories)[number];

export type CalcIcon = "engine" | "combustion" | "flare" | "tank" | "fugitive" | "factor" | "vent" | "compressor" | "pneumatic" | "ghg";

export interface CalculatorMethod {
  slug: string;
  name: string;
  /** Card and page title, e.g. "Tank Emissions Calculator". */
  title: string;
  /** One-line card summary. */
  short: string;
  categories: CalcCategory[];
  icon: CalcIcon;
  equipmentCategory: string;
  description: string;
  keywords: string;
  formula: string;
  methodology: string;
  /** Where users typically find factors for this method. Guidance, not a factor. */
  factorGuidance: string;
  inputs: NumberInput[];
  factors: FactorInput[];
  compute(inputs: Record<string, number>, factors: Record<string, number>): MethodResult;
}

const round = (n: number, d = 4) => Number.isFinite(n) ? Number(n.toPrecision(d + 2)) : 0;


/** Volumetric gas release -> mass of a pollutant, shared by venting-type methods. */
function gasSteps(scfPerHr: number, i: Record<string, number>, lead: CalcStep[]): MethodResult {
  const lbMolPerHr = scfPerHr / i.molarVolume;
  const lbGasPerHr = lbMolPerHr * i.mw;
  const w = i.wt / 100;
  const lbPerHr = lbGasPerHr * w;
  return {
    lbPerHr,
    steps: [
      ...lead,
      { label: "Molar flow", expression: `${round(scfPerHr)} scf/hr ÷ ${i.molarVolume} scf/lb-mol`, value: round(lbMolPerHr), unit: "lb-mol/hr" },
      { label: "Gas mass rate", expression: `${round(lbMolPerHr)} lb-mol/hr × ${i.mw} lb/lb-mol`, value: round(lbGasPerHr), unit: "lb/hr" },
      { label: "Pollutant mass rate", expression: `${round(lbGasPerHr)} lb/hr × ${w}`, value: round(lbPerHr), unit: "lb/hr" },
    ],
  };
}

const gasInputs: NumberInput[] = [
  { key: "mw", label: "Gas molecular weight", unit: "lb/lb-mol", min: 0, step: 0.01, demo: 20, help: "From a representative gas analysis." },
  { key: "wt", label: "Pollutant weight fraction", unit: "%", min: 0, max: 100, step: 0.1, demo: 10, help: "Weight percent of the selected pollutant (e.g. VOC, CH4) in the gas." },
  { key: "molarVolume", label: "Molar volume at standard conditions", unit: "scf/lb-mol", min: 1, step: 0.1, demo: 379.3, help: "Use the value for the standard temperature and pressure your program or method specifies." },
];

export const calculatorMethods: CalculatorMethod[] = [
  {
    slug: "engines",
    title: "Engine Emissions Calculator",
    short: "Reciprocating engines driving compressors, pumps, generators.",
    categories: ["Popular", "Combustion", "Oil & Gas"],
    icon: "engine",
    name: "Engines",
    equipmentCategory: "Engines / Compressors",
    description: "Stationary reciprocating engines driving compressors, pumps, or generators.",
    keywords: "engine rice compressor generator nox co voc hcho g/hp-hr horsepower",
    formula: "E (lb/hr) = EF (g/hp-hr) × P (hp) × L ÷ 453.592 (g/lb)",
    methodology:
      "Power-based method. Multiplies a brake-specific emission factor by rated horsepower and load fraction, then converts grams to pounds.",
    factorGuidance:
      "Use a manufacturer guarantee, a permit limit, a source test result, or an EPA/agency factor. Record the document, revision, and table you took it from.",
    inputs: [
      { key: "hp", label: "Rated power", unit: "hp", min: 0, step: 1, demo: 1380 },
      { key: "load", label: "Load", unit: "%", min: 0, max: 110, step: 1, demo: 100, help: "Use 100% for potential-to-emit unless an enforceable limit applies." },
    ],
    factors: [{ key: "ef", label: "Emission factor", unit: "g/hp-hr", demo: 1.0 }],
    compute(i, f) {
      const loadFrac = (i.load ?? 100) / 100;
      const gPerHr = f.ef * i.hp * loadFrac;
      const lbPerHr = gPerHr / G_PER_LB;
      return {
        lbPerHr,
        steps: [
          { label: "Load fraction", expression: `${i.load}% ÷ 100`, value: round(loadFrac), unit: "—" },
          { label: "Mass rate", expression: `${f.ef} g/hp-hr × ${i.hp} hp × ${round(loadFrac)}`, value: round(gPerHr), unit: "g/hr" },
          { label: "Convert to lb/hr", expression: `${round(gPerHr)} g/hr ÷ ${G_PER_LB} g/lb`, value: round(lbPerHr), unit: "lb/hr" },
        ],
      };
    },
  },
  {
    slug: "heaters",
    title: "Combustion Sources Calculator",
    short: "Heaters, boilers, reboilers, heater treaters.",
    categories: ["Popular", "Combustion", "EPA Methods"],
    icon: "combustion",
    name: "Heaters & Combustion",
    equipmentCategory: "Heaters / Heater Treaters / Boilers",
    description: "Gas-fired heaters, heater treaters, reboilers, and other external combustion units.",
    keywords: "heater heater treater reboiler boiler combustion mmbtu natural gas lb/mmscf",
    formula: "E (lb/hr) = EF (lb/MMscf) × Q (MMBtu/hr) ÷ HHV (Btu/scf)",
    methodology:
      "Heat-input method. Converts firing rate to fuel volume using the fuel's higher heating value, then applies a volume-based factor. (Btu/scf is numerically equal to MMBtu/MMscf.)",
    factorGuidance:
      "Combustion factors are commonly expressed per million standard cubic feet of fuel. Cite the publication section and revision date, and use the heating value that factor assumes.",
    inputs: [
      { key: "q", label: "Heat input", unit: "MMBtu/hr", min: 0, step: 0.1, demo: 1.5 },
      { key: "hhv", label: "Fuel higher heating value", unit: "Btu/scf", min: 1, step: 1, demo: 1020 },
    ],
    factors: [{ key: "ef", label: "Emission factor", unit: "lb/MMscf", demo: 100 }],
    compute(i, f) {
      const mmscfPerHr = i.q / i.hhv;
      const lbPerHr = f.ef * mmscfPerHr;
      return {
        lbPerHr,
        steps: [
          { label: "Fuel rate", expression: `${i.q} MMBtu/hr ÷ ${i.hhv} MMBtu/MMscf`, value: round(mmscfPerHr), unit: "MMscf/hr" },
          { label: "Emission rate", expression: `${f.ef} lb/MMscf × ${round(mmscfPerHr)} MMscf/hr`, value: round(lbPerHr), unit: "lb/hr" },
        ],
      };
    },
  },
  {
    slug: "flares",
    title: "Flaring Calculator",
    short: "Routine and emergency flaring, enclosed combustors.",
    categories: ["Popular", "Combustion", "Oil & Gas"],
    icon: "flare",
    name: "Flares",
    equipmentCategory: "Flares / Combustors",
    description: "Combustion products from flares and enclosed combustors based on heat release.",
    keywords: "flare combustor enclosed combustion device heat release nox co",
    formula: "E (lb/hr) = EF (lb/MMBtu) × H (MMBtu/hr)",
    methodology:
      "Heat-release method for combustion products. Heat release is the waste-gas flow multiplied by its heating value. Uncombusted VOC from the controlled stream should be calculated separately from the stream's composition and the destruction efficiency you can support.",
    factorGuidance:
      "Use factors expressed per unit of heat release and document which fuel/flare type and revision they represent.",
    inputs: [
      { key: "flow", label: "Waste gas flow", unit: "Mscf/hr", min: 0, step: 0.1, demo: 10 },
      { key: "hv", label: "Gas heating value", unit: "Btu/scf", min: 1, step: 1, demo: 1500 },
    ],
    factors: [{ key: "ef", label: "Emission factor", unit: "lb/MMBtu", demo: 0.1 }],
    compute(i, f) {
      const heat = (i.flow * 1000 * i.hv) / 1e6;
      const lbPerHr = f.ef * heat;
      return {
        lbPerHr,
        steps: [
          { label: "Heat release", expression: `${i.flow} Mscf/hr × 1,000 × ${i.hv} Btu/scf ÷ 10⁶`, value: round(heat), unit: "MMBtu/hr" },
          { label: "Emission rate", expression: `${f.ef} lb/MMBtu × ${round(heat)} MMBtu/hr`, value: round(lbPerHr), unit: "lb/hr" },
        ],
      };
    },
  },
  {
    slug: "tanks",
    title: "Tank Emissions Calculator",
    short: "Throughput-based tank losses with a cited loss factor.",
    categories: ["Popular", "Storage Tanks", "Oil & Gas"],
    icon: "tank",
    name: "Storage Tanks",
    equipmentCategory: "Storage Tanks / Loading",
    description: "Throughput-based estimate using a site-specific or published loss factor.",
    keywords: "tank storage vessel voc flash working breathing throughput bbl loading",
    formula: "E (tpy) = EF (lb/bbl) × T (bbl/yr) ÷ 2,000 (lb/ton)",
    methodology:
      "Throughput method. Applies a per-barrel loss factor to annual throughput. Detailed tank calculations (working, breathing, and flash losses) depend on tank geometry, liquid properties, and process conditions; use this method only when you have a defensible per-barrel factor, such as one derived from a site-specific sample.",
    factorGuidance:
      "Per-barrel factors usually come from a site-specific flash analysis or an approved calculation for the same liquid and conditions. Note sample date and lab report.",
    inputs: [{ key: "throughput", label: "Annual throughput", unit: "bbl/yr", min: 0, step: 100, demo: 365000 }],
    factors: [{ key: "ef", label: "Loss factor", unit: "lb/bbl", demo: 0.05 }],
    compute(i, f, ) {
      const lbPerYr = f.ef * i.throughput;
      const hours = i.__hours || 8760;
      const lbPerHr = lbPerYr / hours;
      return {
        lbPerHr,
        steps: [
          { label: "Annual mass", expression: `${f.ef} lb/bbl × ${i.throughput.toLocaleString()} bbl/yr`, value: round(lbPerYr), unit: "lb/yr" },
          { label: "Average hourly rate", expression: `${round(lbPerYr)} lb/yr ÷ ${hours} hr/yr`, value: round(lbPerHr), unit: "lb/hr" },
        ],
      };
    },
  },
  {
    slug: "fugitives",
    title: "Fugitive Emissions Calculator",
    short: "Component counts and average emission factors (LDAR).",
    categories: ["Popular", "Fugitives", "Oil & Gas", "EPA Methods"],
    icon: "fugitive",
    name: "Fugitives",
    equipmentCategory: "Fugitives / Equipment Leaks",
    description: "Component-count method for equipment leaks.",
    keywords: "fugitive leaks ldar components valves connectors flanges seals voc methane",
    formula: "E (lb/hr) = Σ [ Nᵢ × EFᵢ (kg/hr/component) ] × 2.20462 (lb/kg) × W",
    methodology:
      "Average emission factor approach. Sums component counts multiplied by per-component factors for total hydrocarbon, converts to pounds, then applies the weight fraction of the pollutant in the stream.",
    factorGuidance:
      "Per-component factors depend on service type (gas, light liquid, heavy liquid) and industry segment. Cite the protocol and table used.",
    inputs: [
      { key: "valves", label: "Valves", unit: "count", min: 0, step: 1, demo: 120 },
      { key: "connectors", label: "Connectors", unit: "count", min: 0, step: 1, demo: 400 },
      { key: "flanges", label: "Flanges", unit: "count", min: 0, step: 1, demo: 80 },
      { key: "other", label: "Other components", unit: "count", min: 0, step: 1, demo: 20 },
      { key: "wt", label: "Pollutant weight fraction", unit: "%", min: 0, max: 100, step: 0.1, demo: 25, help: "Weight percent of the selected pollutant in the stream." },
    ],
    factors: [
      { key: "efValves", label: "Valve factor", unit: "kg/hr/comp", demo: 0.004 },
      { key: "efConnectors", label: "Connector factor", unit: "kg/hr/comp", demo: 0.0002 },
      { key: "efFlanges", label: "Flange factor", unit: "kg/hr/comp", demo: 0.0004 },
      { key: "efOther", label: "Other factor", unit: "kg/hr/comp", demo: 0.009 },
    ],
    compute(i, f) {
      const parts = [
        ["Valves", i.valves, f.efValves],
        ["Connectors", i.connectors, f.efConnectors],
        ["Flanges", i.flanges, f.efFlanges],
        ["Other", i.other, f.efOther],
      ] as const;
      const kgPerHr = parts.reduce((sum, [, n, ef]) => sum + n * ef, 0);
      const lbTotal = kgPerHr * LB_PER_KG;
      const w = i.wt / 100;
      const lbPerHr = lbTotal * w;
      return {
        lbPerHr,
        steps: [
          ...parts.map(([label, n, ef]) => ({ label: `${label}`, expression: `${n} × ${ef} kg/hr`, value: round(n * ef), unit: "kg/hr" })),
          { label: "Total hydrocarbon", expression: `${round(kgPerHr)} kg/hr × ${LB_PER_KG} lb/kg`, value: round(lbTotal), unit: "lb/hr" },
          { label: "Pollutant fraction", expression: `${round(lbTotal)} lb/hr × ${w}`, value: round(lbPerHr), unit: "lb/hr" },
        ],
      };
    },
  },
  {
    slug: "ap-42",
    name: "AP-42 Factor",
    title: "AP-42 Calculator",
    short: "Activity rate × a cited AP-42 emission factor.",
    categories: ["Popular", "EPA Methods"],
    icon: "factor",
    equipmentCategory: "Any source with an activity-based factor",
    description: "General activity-based calculation for any source category with a published per-unit emission factor.",
    keywords: "ap-42 ap42 emission factor activity rate generic lb/unit epa",
    formula: "E (lb/hr) = A (units/hr) × EF (lb/unit)",
    methodology:
      "Activity-based method. Multiplies an hourly activity rate (fuel burned, material processed, product made) by an emission factor expressed per unit of that activity. Units must match: the factor's denominator must be the activity unit.",
    factorGuidance:
      "Take the factor from the AP-42 chapter and section for your source category. Record the section number, table, revision date, and factor rating.",
    inputs: [{ key: "a", label: "Activity rate", unit: "units/hr", min: 0, step: 0.01, demo: 50, help: "In the same unit as the factor's denominator (e.g. tons/hr, MMscf/hr, 1,000 gal/hr)." }],
    factors: [{ key: "ef", label: "Emission factor", unit: "lb/unit", demo: 0.2 }],
    compute(i, f) {
      const lbPerHr = i.a * f.ef;
      return { lbPerHr, steps: [{ label: "Emission rate", expression: `${i.a} units/hr × ${f.ef} lb/unit`, value: round(lbPerHr), unit: "lb/hr" }] };
    },
  },
  {
    slug: "venting",
    name: "Venting",
    title: "Venting Calculator",
    short: "Pneumatics, pressure relief, blowdowns: vented gas to mass.",
    categories: ["Oil & Gas", "Other"],
    icon: "vent",
    equipmentCategory: "Vents / Blowdowns / Relief",
    description: "Converts a measured or engineered vented gas volume to pollutant mass using gas composition.",
    keywords: "venting vent blowdown relief pressure gas volume scf composition voc methane",
    formula: "E (lb/hr) = V (scf/hr) ÷ MV (scf/lb-mol) × MW (lb/lb-mol) × w",
    methodology:
      "Ideal-gas mass balance. Converts vented volume at standard conditions to moles with the molar volume, to mass with the gas molecular weight, then applies the pollutant's weight fraction from a gas analysis.",
    factorGuidance:
      "Vent volume comes from metering, engineering calculations (vessel volume and pressure for blowdowns), or a measured rate. Document the basis and the gas analysis date.",
    inputs: [{ key: "v", label: "Vented gas volume", unit: "scf/hr", min: 0, step: 1, demo: 500 }, ...gasInputs],
    factors: [],
    compute(i) {
      return gasSteps(i.v, i, []);
    },
  },
  {
    slug: "compressors",
    name: "Compressor",
    title: "Compressor Calculator",
    short: "Reciprocating rod packing and centrifugal seal venting.",
    categories: ["Oil & Gas", "Fugitives"],
    icon: "compressor",
    equipmentCategory: "Compressors (rod packing / wet seals)",
    description: "Per-compressor vent or leak rate from rod packing or seals, converted to pollutant mass.",
    keywords: "compressor reciprocating centrifugal rod packing wet seal vent leak scf methane voc",
    formula: "E (lb/hr) = N × R (scf/hr/unit) ÷ MV × MW × w",
    methodology:
      "Count-times-rate method. Multiplies the number of compressors (or packing cylinders / seals, matching your rate basis) by a per-unit vent rate, then converts the gas volume to pollutant mass.",
    factorGuidance:
      "Use a measured vent rate, a manufacturer value, or a rate from the reporting protocol or rule you follow. Cite the source and the unit basis (per compressor, per cylinder, or per seal).",
    inputs: [{ key: "n", label: "Number of units", unit: "count", min: 0, step: 1, demo: 2 }, ...gasInputs],
    factors: [{ key: "rate", label: "Vent / leak rate", unit: "scf/hr/unit", demo: 50 }],
    compute(i, f) {
      const scf = i.n * f.rate;
      return gasSteps(scf, i, [{ label: "Total vent rate", expression: `${i.n} × ${f.rate} scf/hr`, value: round(scf), unit: "scf/hr" }]);
    },
  },
  {
    slug: "pneumatics",
    name: "Pneumatic Devices",
    title: "Pneumatic Devices",
    short: "High/low bleed and intermittent controllers and pumps.",
    categories: ["Oil & Gas", "Fugitives"],
    icon: "pneumatic",
    equipmentCategory: "Pneumatic controllers / pumps",
    description: "Device count and bleed rate by type, converted from natural gas volume to pollutant mass.",
    keywords: "pneumatic controller pump high bleed low bleed intermittent natural gas methane voc",
    formula: "E (lb/hr) = Σ [Nᵢ × Bᵢ (scf/hr/device)] ÷ MV × MW × w",
    methodology:
      "Count-times-bleed-rate method by device type, summed, then converted from gas volume to pollutant mass with the gas composition.",
    factorGuidance:
      "Bleed rates come from manufacturer specifications, measurement, or the per-device rates in the reporting protocol you follow. Cite each source.",
    inputs: [
      { key: "nHigh", label: "High-bleed devices", unit: "count", min: 0, step: 1, demo: 2 },
      { key: "nLow", label: "Low-bleed devices", unit: "count", min: 0, step: 1, demo: 4 },
      { key: "nInt", label: "Intermittent devices", unit: "count", min: 0, step: 1, demo: 6 },
      ...gasInputs,
    ],
    factors: [
      { key: "bHigh", label: "High-bleed rate", unit: "scf/hr/device", demo: 30 },
      { key: "bLow", label: "Low-bleed rate", unit: "scf/hr/device", demo: 1 },
      { key: "bInt", label: "Intermittent rate", unit: "scf/hr/device", demo: 10 },
    ],
    compute(i, f) {
      const parts = [["High-bleed", i.nHigh, f.bHigh], ["Low-bleed", i.nLow, f.bLow], ["Intermittent", i.nInt, f.bInt]] as const;
      const scf = parts.reduce((t, [, n, b]) => t + n * b, 0);
      return gasSteps(scf, i, [
        ...parts.map(([l, n, b]) => ({ label: l, expression: `${n} × ${b} scf/hr`, value: round(n * b), unit: "scf/hr" })),
        { label: "Total gas", expression: "sum of device types", value: round(scf), unit: "scf/hr" },
      ]);
    },
  },
  {
    slug: "ghg",
    name: "Greenhouse Gases",
    title: "Greenhouse Gases",
    short: "CO₂, CH₄, N₂O from fuel combustion, with CO₂e.",
    categories: ["Popular", "Combustion", "EPA Methods"],
    icon: "ghg",
    equipmentCategory: "Stationary fuel combustion (GHG)",
    description: "Fuel heat input times a per-MMBtu greenhouse gas factor, with CO₂e from the GWP you enter.",
    keywords: "ghg greenhouse gas co2 ch4 n2o co2e gwp combustion kg/mmbtu part 98",
    formula: "E (lb/hr) = Q (MMBtu/hr) × EF (kg/MMBtu) × 2.20462 (lb/kg) × GWP",
    methodology:
      "Heat-input method for combustion greenhouse gases. Multiplies heat input by a per-MMBtu factor for the selected gas and converts kilograms to pounds. The result is multiplied by the global warming potential you enter: use 1 to report the mass of the gas itself, or the program's GWP for CH4 or N2O to report CO2e.",
    factorGuidance:
      "Use the fuel-specific factor and GWP values required by your reporting program, and cite the table and the version in effect for the reporting year.",
    inputs: [{ key: "q", label: "Heat input", unit: "MMBtu/hr", min: 0, step: 0.1, demo: 10 }],
    factors: [
      { key: "ef", label: "Emission factor", unit: "kg/MMBtu", demo: 50 },
      { key: "gwp", label: "Global warming potential (1 = mass of the gas)", unit: "—", demo: 1 },
    ],
    compute(i, f) {
      const kg = i.q * f.ef;
      const lbGas = kg * LB_PER_KG;
      const gwp = Number.isFinite(f.gwp) && f.gwp > 0 ? f.gwp : 1;
      const lbPerHr = lbGas * gwp;
      const steps: CalcStep[] = [
        { label: "Mass rate", expression: `${i.q} MMBtu/hr × ${f.ef} kg/MMBtu`, value: round(kg), unit: "kg/hr" },
        { label: "Convert to lb/hr", expression: `${round(kg)} kg/hr × ${LB_PER_KG} lb/kg`, value: round(lbGas), unit: "lb/hr" },
      ];
      if (gwp !== 1) steps.push({ label: "CO2e", expression: `${round(lbGas)} lb/hr × GWP ${gwp}`, value: round(lbPerHr), unit: "lb CO2e/hr" });
      return { lbPerHr, steps };
    },
  },
];

export function getMethod(slug: string) {
  return calculatorMethods.find((m) => m.slug === slug);
}

export interface AnnualizedResult {
  lbPerHr: number;
  lbPerDay: number;
  tpy: number;
  controlledLbPerHr: number;
  steps: CalcStep[];
}

/** Applies control efficiency and operating schedule to a method result. */
export function annualize(base: MethodResult, controlPct: number, hoursPerYear: number): AnnualizedResult {
  const ce = Math.min(Math.max(controlPct, 0), 100) / 100;
  const controlledLbPerHr = base.lbPerHr * (1 - ce);
  const lbPerDay = controlledLbPerHr * 24;
  const tpy = (controlledLbPerHr * hoursPerYear) / 2000;
  const steps: CalcStep[] = [...base.steps];
  if (ce > 0) {
    steps.push({ label: "Apply control", expression: `${round(base.lbPerHr)} lb/hr × (1 − ${ce})`, value: round(controlledLbPerHr), unit: "lb/hr" });
  }
  steps.push(
    { label: "Daily (24 hr)", expression: `${round(controlledLbPerHr)} lb/hr × 24 hr/day`, value: round(lbPerDay), unit: "lb/day" },
    { label: "Annual", expression: `${round(controlledLbPerHr)} lb/hr × ${hoursPerYear} hr/yr ÷ 2,000 lb/ton`, value: round(tpy), unit: "tons/yr" },
  );
  return { lbPerHr: base.lbPerHr, lbPerDay, tpy, controlledLbPerHr, steps };
}
