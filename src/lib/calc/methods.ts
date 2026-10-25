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

export interface CalculatorMethod {
  slug: string;
  name: string;
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

export const calculatorMethods: CalculatorMethod[] = [
  {
    slug: "engines",
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
