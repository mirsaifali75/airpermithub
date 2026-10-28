import type { SceneKind } from "@/components/illustrations/Scene";
/**
 * Industry hubs. "potentialRules" are programs worth screening, never a
 * statement that a rule applies. Rule slugs map to /regulations/[slug].
 */

export type IndustryArt = "pumpjack" | "midstream" | "refinery" | "chemical" | "power" | "factory" | "aggregate" | "landfill" | "industrial";

export interface Industry {
  slug: string;
  name: string;
  short: string;
  art: IndustryArt;
  summary: string;
  commonSources: string[];
  equipment: string[];
  potentialRules: string[];
  calculators: string[];
}

export const industries: Industry[] = [
  {
    slug: "oil-gas",
    name: "Oil & Gas",
    short: "Upstream production, tank batteries, and well sites",
    art: "pumpjack",
    summary:
      "Production sites combine many small emission units, which makes equipment inventories and accurate potential-to-emit calculations central to choosing an authorization path.",
    commonSources: ["Storage tank flashing, working, and breathing losses", "Engine and heater combustion", "Flares and combustors", "Pneumatic devices", "Equipment leaks (fugitives)", "Truck loading"],
    equipment: ["Tank Batteries", "Separators", "Heater Treaters", "Compressors", "Engines", "Flares", "VRUs", "Pneumatics", "Dehydrators", "SWDs", "Loading", "Fugitives"],
    potentialRules: ["nsps", "neshap", "title-v", "nsr"],
    calculators: ["tanks", "engines", "flares", "heaters", "fugitives"],
  },
  {
    slug: "midstream",
    name: "Midstream",
    short: "Gathering, compression, and transmission",
    art: "midstream",
    summary: "Compressor stations and gathering systems are typically engine- and compressor-driven, with dehydration and fugitive emissions as common sources.",
    commonSources: ["Reciprocating and turbine engines", "Compressor venting and seals", "Glycol dehydrators", "Equipment leaks", "Blowdowns"],
    equipment: ["Compressors", "Engines", "Turbines", "Dehydrators", "Flares", "Pig launchers/receivers", "Fugitives"],
    potentialRules: ["nsps", "neshap", "title-v", "psd"],
    calculators: ["engines", "fugitives", "flares"],
  },
  {
    slug: "refining",
    name: "Refining",
    short: "Petroleum refining and terminals",
    art: "refinery",
    summary: "Refineries are complex major-source facilities with process heaters, flares, storage, and wastewater systems under many overlapping programs.",
    commonSources: ["Process heaters and boilers", "Flares", "Storage tanks", "Cooling towers", "Wastewater", "Equipment leaks"],
    equipment: ["Heaters", "Boilers", "Flares", "Storage Tanks", "FCCU", "Sulfur recovery", "Loading racks"],
    potentialRules: ["nsps", "neshap", "title-v", "psd", "nonattainment-nsr"],
    calculators: ["heaters", "flares", "tanks", "fugitives"],
  },
  {
    slug: "chemical",
    name: "Chemical",
    short: "Chemical manufacturing and processing",
    art: "chemical",
    summary: "Chemical plants often have HAP-focused requirements alongside combustion and storage sources.",
    commonSources: ["Process vents", "Storage tanks", "Equipment leaks", "Combustion units", "Wastewater"],
    equipment: ["Reactors", "Distillation", "Thermal oxidizers", "Storage Tanks", "Boilers"],
    potentialRules: ["neshap", "nsps", "title-v"],
    calculators: ["tanks", "heaters", "fugitives"],
  },
  {
    slug: "power-generation",
    name: "Power Generation",
    short: "Turbines, boilers, and generators",
    art: "power",
    summary: "Power generation permitting centers on combustion sources, with emissions driven by fuel type, capacity, and operating hours.",
    commonSources: ["Combustion turbines", "Boilers", "Reciprocating engines", "Cooling towers"],
    equipment: ["Turbines", "Boilers", "Engines", "Generators", "Emission controls"],
    potentialRules: ["nsps", "neshap", "title-v", "psd"],
    calculators: ["engines", "heaters"],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    short: "General and heavy manufacturing",
    art: "factory",
    summary: "Manufacturing facilities vary widely; coating, solvent use, and combustion are common sources.",
    commonSources: ["Surface coating", "Solvent use", "Boilers and heaters", "Material handling"],
    equipment: ["Paint booths", "Boilers", "Dust collectors", "Ovens"],
    potentialRules: ["neshap", "nsps", "title-v", "nsr"],
    calculators: ["heaters"],
  },
  {
    slug: "aggregates",
    name: "Mining & Aggregates",
    short: "Quarries, crushing, screening, and mineral processing",
    art: "aggregate",
    summary: "Aggregate operations are typically particulate-focused, with crushing, screening, conveying, and haul roads.",
    commonSources: ["Crushing and screening", "Conveyor transfer points", "Haul roads", "Stockpiles", "Engines"],
    equipment: ["Crushers", "Screens", "Conveyors", "Engines", "Generators"],
    potentialRules: ["nsps", "nsr"],
    calculators: ["engines"],
  },
  {
    slug: "landfills-waste",
    name: "Waste & Landfills",
    short: "Landfills and waste handling",
    art: "landfill",
    summary: "Landfill gas collection and control is a central air topic for waste facilities.",
    commonSources: ["Landfill gas", "Flares", "Engines burning landfill gas", "Haul roads"],
    equipment: ["Gas collection systems", "Flares", "Engines"],
    potentialRules: ["nsps", "neshap", "title-v"],
    calculators: ["flares", "engines"],
  },
  {
    slug: "other-industrial",
    name: "Other Industrial",
    short: "Facilities not listed above",
    art: "industrial",
    summary: "Start with an equipment inventory; most permitting decisions follow from the emission units on site.",
    commonSources: ["Combustion", "Storage", "Material handling"],
    equipment: ["Boilers", "Engines", "Tanks"],
    potentialRules: ["nsr", "title-v"],
    calculators: ["engines", "heaters", "tanks"],
  },
];

export function getIndustry(slug: string) {
  return industries.find((i) => i.slug === slug);
}

/** Oil & gas segments for the flagship industry page. */
export const oilGasSegments = [
  {
    name: "Upstream",
    description: "Well sites, tank batteries, and central production facilities.",
    equipment: ["Well sites", "Tank batteries", "Separators", "Heater treaters", "Pneumatics", "Flares", "Truck loading"],
  },
  {
    name: "Midstream",
    description: "Gathering, compression, and pipeline facilities.",
    equipment: ["Compressor stations", "Engines", "Dehydrators", "Pig launchers", "Fugitives"],
  },
  {
    name: "Processing",
    description: "Gas plants and processing facilities.",
    equipment: ["Amine units", "Cryogenic trains", "Heaters", "Flares", "Storage"],
  },
];

/** Illustration used for each industry on cards and banners. */
export const industryScene: Record<string, SceneKind> = {
  "oil-gas": "oil-gas",
  midstream: "midstream",
  refining: "refinery",
  chemical: "chemical",
  "power-generation": "power",
  manufacturing: "manufacturing",
  aggregates: "mining",
  "landfills-waste": "waste",
  "other-industrial": "industrial",
};

/** Display order used on the Industries page and home grid. */
export const industryOrder = ["oil-gas", "midstream", "refining", "power-generation", "chemical", "manufacturing", "aggregates", "landfills-waste", "other-industrial"];

export const orderedIndustries = () => industryOrder.map((slug) => industries.find((i) => i.slug === slug)!).filter(Boolean);
