/** Shared option lists for wizards, calculators, and filters. */

export const permitFinderIndustries = [
  "Oil & Gas", "Midstream", "Refinery", "Chemical", "Manufacturing", "Power Generation", "Aggregates", "Waste", "Other Industrial",
] as const;

export const facilityTypesByIndustry: Record<string, string[]> = {
  "Oil & Gas": ["Tank Battery", "Well Site", "Compressor Station", "Gas Plant", "SWD", "Central Production Facility", "Pipeline Facility", "Processing Facility"],
  Midstream: ["Compressor Station", "Gas Plant", "Pipeline Facility", "Terminal", "Processing Facility"],
  Refinery: ["Petroleum Refinery", "Terminal", "Tank Farm"],
  Chemical: ["Chemical Plant", "Tank Farm", "Specialty Chemical Facility"],
  Manufacturing: ["Manufacturing Plant", "Coating Operation", "Assembly Facility"],
  "Power Generation": ["Combustion Turbine Plant", "Boiler Plant", "Engine Plant", "Backup Generation"],
  Aggregates: ["Quarry", "Crushing & Screening", "Concrete Batch Plant", "Hot Mix Asphalt"],
  Waste: ["Landfill", "Transfer Station", "Waste Processing"],
  "Other Industrial": ["Other"],
};

export const equipmentOptions = [
  "Storage Tanks", "Engines", "Compressors", "Heaters", "Heater Treaters", "Separators", "Flares", "VRUs", "Dehydrators",
  "Pneumatic Controllers", "Pneumatic Pumps", "Loading Operations", "Fugitives", "Generators",
] as const;

export type Equipment = (typeof equipmentOptions)[number];

export const pollutants = ["NOx", "CO", "VOC", "PM", "PM10", "PM2.5", "SO2", "HAPs", "CO2", "CH4", "N2O", "CO2e"] as const;
export type Pollutant = (typeof pollutants)[number];
