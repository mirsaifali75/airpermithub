/**
 * Rule and guidance text the screening and design tools quote. Every entry is
 * copied word for word from the current eCFR or the named EPA document, and
 * every number a tool compares against appears in one of these quotes.
 * src/lib/tools/rule-text.test.ts checks the eCFR excerpts against the weekly
 * eCFR snapshot in data/ecfr, and the monthly source check
 * (scripts/verify-sources.mjs) checks all of them against the live sources.
 */

export interface RuleQuote {
  /** "40 CFR 60.4200(a)(2)" for eCFR text, or the document name for guidance. */
  cite: string;
  text: string;
  /** Set for quotes from documents other than eCFR. */
  url?: string;
}

const q = (cite: string, text: string, url?: string): RuleQuote => (url ? { cite, text, url } : { cite, text });

/** eCFR link for a "40 CFR 60.4200(a)(2)" citation, anchored to the paragraph. */
export function ecfrHref(cite: string) {
  const m = cite.match(/40 CFR (\d+\.\d+[a-zA-Z]*)((?:\([0-9a-zA-Z]+\))*)/);
  if (!m) return null;
  return `https://www.ecfr.gov/current/title-40/section-${m[1]}${m[2] ? `#p-${m[1]}${m[2]}` : ""}`;
}

export const quoteHref = (x: RuleQuote) => x.url ?? ecfrHref(x.cite);

export const EPA_PTE_1989 = {
  title: "EPA, Guidance on Limiting Potential to Emit in New Source Permitting (June 13, 1989)",
  url: "https://www.epa.gov/sites/default/files/2015-08/documents/lmitpotl.pdf",
};
export const EPA_PTE_1995 = {
  title: "EPA, Options for Limiting the Potential to Emit (PTE) of a Stationary Source Under Section 112 and Title V (January 25, 1995)",
  url: "https://www.epa.gov/sites/default/files/2015-07/documents/ptememo.pdf",
};
export const AP42_7_1 = {
  title: "EPA AP-42, Section 7.1, Organic Liquid Storage Tanks (6/2026)",
  url: "https://www.epa.gov/system/files/documents/2026-08/c7s1_2026.pdf",
};
export const AP42_13_5 = {
  title: "EPA AP-42, Section 13.5, Industrial Flares (02/18)",
  url: "https://www.epa.gov/sites/default/files/2020-10/documents/13.5_industrial_flares.pdf",
};
export const LEAK_PROTOCOL = {
  title: "EPA, 1995 Protocol for Equipment Leak Emission Estimates (EPA-453/R-95-017)",
  url: "https://www.epa.gov/sites/default/files/2020-09/documents/protocol_for_equipment_leak_emission_estimates.pdf",
};

export const RT = {
  // ---------- Major source definitions ----------
  hapMajor: q("40 CFR 63.2", "Major source means any stationary source or group of stationary sources located within a contiguous area and under common control that emits or has the potential to emit considering controls, in the aggregate, 10 tons per year or more of any hazardous air pollutant or 25 tons per year or more of any combination of hazardous air pollutants"),
  hapArea: q("40 CFR 63.2", "Area source means any stationary source of hazardous air pollutants that is not a major source as defined in this part."),
  hapSurfaceSite: q("40 CFR 63.6585(b)", "except that for oil and gas production facilities, a major source of HAP emissions is determined for each surface site."),
  tvMajor100: q("40 CFR 70.2", "A major stationary source of air pollutants, as defined in section 302 of the Act, that directly emits, or has the potential to emit, 100 tpy or more of any air pollutant subject to regulation"),
  tvOzone: q("40 CFR 70.2", "For ozone nonattainment areas, sources with the potential to emit 100 tpy or more of volatile organic compounds or oxides of nitrogen in areas classified or treated as classified as “Marginal” or “Moderate,” 50 tpy or more in areas classified or treated as classified as “Serious,” 25 tpy or more in areas classified or treated as classified as “Severe,” and 10 tpy or more in areas classified or treated as classified as “Extreme”"),
  tvHap: q("40 CFR 70.2", "emits or has the potential to emit, in the aggregate, 10 tons per year (tpy) or more of any hazardous air pollutant which has been listed pursuant to section 112(b) of the Act, 25 tpy or more of any combination of such hazardous air pollutants"),
  ptePart70: q("40 CFR 70.2", "Potential to emit means the maximum capacity of a stationary source to emit any air pollutant under its physical and operational design."),
  psdListed: q("40 CFR 52.21(b)(1)(i)(A)", "Any of the following stationary sources of air pollutants which emits, or has the potential to emit, 100 tons per year or more of any regulated NSR pollutant:"),
  psd250: q("40 CFR 52.21(b)(1)(i)(B)", "any stationary source which emits, or has the potential to emit, 250 tons per year or more of a regulated NSR pollutant"),

  // ---------- GHG reporting ----------
  ghgA3: q("40 CFR 98.2(a)(1)", "A facility that contains any source category that is listed in Table A-3 of this subpart."),
  ghgA4: q("40 CFR 98.2(a)(2)", "A facility that contains any source category that is listed in Table A-4 of this subpart and that emits 25,000 metric tons CO2e or more per year"),
  ghgHeat: q("40 CFR 98.2(a)(3)(ii)", "The aggregate maximum rated heat input capacity of the stationary fuel combustion units at the facility is 30 mmBtu/hr or greater."),
  ghgCombustion: q("40 CFR 98.2(a)(3)(iii)", "The facility emits 25,000 metric tons CO2e or more per year in combined emissions from all stationary fuel combustion sources."),

  // ---------- Engines ----------
  iiiiOrder: q("40 CFR 60.4200(a)", "For the purposes of this subpart, the date that construction commences is the date the engine is ordered by the owner or operator."),
  iiiiNew: q("40 CFR 60.4200(a)(2)", "Owners and operators of stationary CI ICE that commence construction after July 11, 2005, where the stationary CI ICE are:"),
  iiiiMfg: q("40 CFR 60.4200(a)(2)(i)", "Manufactured after April 1, 2006, and are not fire pump engines, or"),
  iiiiFire: q("40 CFR 60.4200(a)(2)(ii)", "Manufactured as a certified National Fire Protection Association (NFPA) fire pump engine after July 1, 2006."),
  iiiiMod: q("40 CFR 60.4200(a)(3)", "Owners and operators of any stationary CI ICE that are modified or reconstructed after July 11, 2005"),
  jjjjOrder: q("40 CFR 60.4230(a)", "For the purposes of this subpart, the date that construction commences is the date the engine is ordered by the owner or operator."),
  jjjjNew: q("40 CFR 60.4230(a)(4)", "Owners and operators of stationary SI ICE that commence construction after June 12, 2006, where the stationary SI ICE are manufactured:"),
  jjjjBig: q("40 CFR 60.4230(a)(4)(i)", "On or after July 1, 2007, for engines with a maximum engine power greater than or equal to 500 HP (except lean burn engines with a maximum engine power greater than or equal to 500 HP and less than 1,350 HP);"),
  jjjjLean: q("40 CFR 60.4230(a)(4)(ii)", "on or after January 1, 2008, for lean burn engines with a maximum engine power greater than or equal to 500 HP and less than 1,350 HP;"),
  jjjjSmall: q("40 CFR 60.4230(a)(4)(iii)", "on or after July 1, 2008, for engines with a maximum engine power less than 500 HP; or"),
  jjjjEmerg: q("40 CFR 60.4230(a)(4)(iv)", "on or after January 1, 2009, for emergency engines with a maximum engine power greater than 19 KW (25 HP)."),
  jjjjMod: q("40 CFR 60.4230(a)(5)", "Owners and operators of stationary SI ICE that are modified or reconstructed after June 12, 2006"),
  zzzzApplies: q("40 CFR 63.6585", "You are subject to this subpart if you own or operate a stationary RICE at a major or area source of HAP emissions, except if the stationary RICE is being tested at a stationary RICE test cell/stand."),
  zzzzExistBig: q("40 CFR 63.6590(a)(1)(i)", "For stationary RICE with a site rating of more than 500 brake horsepower (HP) located at a major source of HAP emissions, a stationary RICE is existing if you commenced construction or reconstruction of the stationary RICE before December 19, 2002."),
  zzzzExistSmall: q("40 CFR 63.6590(a)(1)(ii)", "For stationary RICE with a site rating of less than or equal to 500 brake HP located at a major source of HAP emissions, a stationary RICE is existing if you commenced construction or reconstruction of the stationary RICE before June 12, 2006."),
  zzzzExistArea: q("40 CFR 63.6590(a)(1)(iii)", "For stationary RICE located at an area source of HAP emissions, a stationary RICE is existing if you commenced construction or reconstruction of the stationary RICE before June 12, 2006."),
  zzzzLimited: q("40 CFR 63.6590(b)(1)(i)", "The stationary RICE is a new or reconstructed emergency stationary RICE with a site rating of more than 500 brake HP located at a major source of HAP emissions."),
  zzzzNone: q("40 CFR 63.6590(b)(3)", "The following stationary RICE do not have to meet the requirements of this subpart and of subpart A of this part, including initial notification requirements:"),
  zzzzNone2SLB: q("40 CFR 63.6590(b)(3)(i)", "Existing spark ignition 2 stroke lean burn (2SLB) stationary RICE with a site rating of more than 500 brake HP located at a major source of HAP emissions;"),
  zzzzNone4SLB: q("40 CFR 63.6590(b)(3)(ii)", "Existing spark ignition 4 stroke lean burn (4SLB) stationary RICE with a site rating of more than 500 brake HP located at a major source of HAP emissions;"),
  zzzzNoneEmerg: q("40 CFR 63.6590(b)(3)(iii)", "Existing emergency stationary RICE with a site rating of more than 500 brake HP located at a major source of HAP emissions."),
  zzzzViaNsps: q("40 CFR 63.6590(c)", "must meet the requirements of this part by meeting the requirements of 40 CFR part 60 subpart IIII, for compression ignition engines or 40 CFR part 60 subpart JJJJ, for spark ignition engines. No further requirements apply for such engines under this part."),
  zzzzViaArea: q("40 CFR 63.6590(c)(1)", "A new or reconstructed stationary RICE located at an area source;"),
  zzzzVia2SLB: q("40 CFR 63.6590(c)(2)", "A new or reconstructed 2SLB stationary RICE with a site rating of less than or equal to 500 brake HP located at a major source of HAP emissions;"),
  zzzzVia4SLB: q("40 CFR 63.6590(c)(3)", "A new or reconstructed 4SLB stationary RICE with a site rating of less than 250 brake HP located at a major source of HAP emissions;"),
  zzzzVia4SRB: q("40 CFR 63.6590(c)(4)", "A new or reconstructed spark ignition 4 stroke rich burn (4SRB) stationary RICE with a site rating of less than or equal to 500 brake HP located at a major source of HAP emissions;"),
  zzzzViaEmerg: q("40 CFR 63.6590(c)(6)", "A new or reconstructed emergency or limited use stationary RICE with a site rating of less than or equal to 500 brake HP located at a major source of HAP emissions;"),
  zzzzViaCI: q("40 CFR 63.6590(c)(7)", "A new or reconstructed compression ignition (CI) stationary RICE with a site rating of less than or equal to 500 brake HP located at a major source of HAP emissions."),
  zzzzAreaEmerg: q("40 CFR 63.6585(f)", "The emergency stationary RICE listed in paragraphs (f)(1) through (3) of this section are not subject to this subpart."),

  // ---------- Boilers and process heaters ----------
  db: q("40 CFR 60.40b(a)", "each steam generating unit that commences construction, modification, or reconstruction after June 19, 1984, and that has a heat input capacity from fuels combusted in the steam generating unit of greater than 29 megawatts (MW) (100 million British thermal units per hour (MMBtu/hr))."),
  dbTemp: q("40 CFR 60.40b(m)", "Temporary boilers are not subject to this subpart."),
  dc: q("40 CFR 60.40c(a)", "each steam generating unit for which construction, modification, or reconstruction is commenced after June 9, 1989 and that has a maximum design heat input capacity of 29 megawatts (MW) (100 million British thermal units per hour (MMBtu/h)) or less, but greater than or equal to 2.9 MW (10 MMBtu/h)."),
  dcTemp: q("40 CFR 60.40c(i)", "Temporary boilers are not subject to this subpart."),
  ddddd: q("40 CFR 63.7485", "You are subject to this subpart if you own or operate an industrial, commercial, or institutional boiler or process heater as defined in § 63.7575 that is located at, or is part of, a major source of HAP, except as specified in § 63.7491."),
  dddddNew: q("40 CFR 63.7490(b)", "A boiler or process heater is new if you commence construction of the boiler or process heater after June 4, 2010, and you meet the applicability criteria at the time you commence construction."),
  jjjjjj: q("40 CFR 63.11193", "You are subject to this subpart if you own or operate an industrial, commercial, or institutional boiler as defined in § 63.11237 that is located at, or is part of, an area source of hazardous air pollutants (HAP), as defined in § 63.2, except as specified in § 63.11195."),
  jjjjjjNew: q("40 CFR 63.11194(c)", "An affected source is a new source if you commenced construction of the affected source after June 4, 2010, and the boiler meets the applicability criteria at the time you commence construction."),
  jjjjjjGas: q("40 CFR 63.11195(e)", "A gas-fired boiler as defined in this subpart."),
  jjjjjjTemp: q("40 CFR 63.11195(h)", "Temporary boilers as defined in this subpart."),

  // ---------- Combustion turbines ----------
  gg: q("40 CFR 60.330(a)", "All stationary gas turbines with a heat input at peak load equal to or greater than 10.7 gigajoules (10 million Btu) per hour, based on the lower heating value of the fuel fired."),
  ggDate: q("40 CFR 60.330(b)", "Any facility under paragraph (a) of this section which commences construction, modification, or reconstruction after October 3, 1977, is subject to the requirements of this part"),
  ggNot: q("40 CFR 60.330(d)", "Stationary gas turbines subject to subpart Da, KKKK, or KKKKa of this part are not subject to this subpart."),
  kkkk: q("40 CFR 60.4305(a)", "If you are the owner or operator of a stationary combustion turbine with a heat input at peak load equal to or greater than 10.7 gigajoules (10 MMBtu) per hour, based on the higher heating value of the fuel, which commenced construction, modification, or reconstruction after February 18, 2005, your turbine is subject to this subpart."),
  kkkkNot: q("40 CFR 60.4305(c)", "Stationary combustion turbines subject to subpart KKKKa of this part are not subject to this subpart."),
  kkkka: q("40 CFR 60.4305a(a)", "you are subject to this subpart if you own or operate a stationary combustion turbine that commenced construction, modification, or reconstruction after December 13, 2024, and that has a base load rating equal to or greater than 10.7 gigajoules per hour (GJ/h) (10 million British thermal units per hour (MMBtu/h))."),
  kkkkaNot: q("40 CFR 60.4305a(b)", "A stationary combustion turbine subject to this subpart is not subject to subpart GG or KKKK of this part."),
  yyyy: q("40 CFR 63.6085", "You are subject to this subpart if you own or operate a stationary combustion turbine located at a major source of HAP emissions."),
  yyyyNew: q("40 CFR 63.6090(a)(2)", "A stationary combustion turbine is new if you commenced construction of the stationary combustion turbine after January 14, 2003."),
  yyyySmall: q("40 CFR 63.6090(b)(3)", "An existing, new, or reconstructed stationary combustion turbine with a rated peak power output of less than 1.0 megawatt (MW) at International Organization for Standardization (ISO) standard day conditions, which is located at a major source, does not have to meet the requirements of this subpart and of subpart A of this part."),
  yyyyExisting: q("40 CFR 63.6090(b)(4)", "Existing stationary combustion turbines in all subcategories do not have to meet the requirements of this subpart and of subpart A of this part."),
  yyyyEmerg: q("40 CFR 63.6090(b)(1)", "A new or reconstructed stationary combustion turbine located at a major source which meets either of the following criteria does not have to meet the requirements of this subpart and of subpart A of this part except for the initial notification requirements of § 63.6145(d):"),

  // ---------- Storage vessels (non-oil and gas) ----------
  kb: q("40 CFR 60.110b(a)", "each storage vessel with a capacity greater than or equal to 75 cubic meters (m³) that is used to store volatile organic liquids (VOL) for which construction, reconstruction, or modification is commenced after July 23, 1984, and on or before October 4, 2023."),
  kbVp: q("40 CFR 60.110b(b)", "This subpart does not apply to storage vessels with a capacity greater than or equal to 151 m³ storing a liquid with a maximum true vapor pressure less than 3.5 kilopascals (kPa) or with a capacity greater than or equal to 75 m³ but less than 151 m³ storing a liquid with a maximum true vapor pressure less than 15.0 kPa."),
  kbCustody: q("40 CFR 60.110b(d)(4)", "Vessels with a design capacity less than or equal to 1,589.874 m³ used for petroleum or condensate stored, processed, or treated prior to custody transfer."),
  kbBulk: q("40 CFR 60.110b(d)(5)", "Vessels located at bulk gasoline plants."),
  kbStation: q("40 CFR 60.110b(d)(6)", "Storage vessels located at gasoline service stations."),
  kc: q("40 CFR 60.110c(a)", "each storage vessel with a capacity greater than or equal to 20,000 gallons (gal) (75.7 cubic meters (m³)) that is used to store volatile organic liquids (VOL) for which construction, reconstruction, or modification is commenced after October 4, 2023."),
  kcCustody: q("40 CFR 60.110c(b)(4)", "Vessels with a design capacity less than or equal to 420,000 gal (1,589.874 m³) used for petroleum or condensate stored, processed, or treated prior to custody transfer;"),
  kcBulk: q("40 CFR 60.110c(b)(5)", "Vessels located at bulk gasoline plants as defined in 40 CFR 63.11100;"),
  kcStation: q("40 CFR 60.110c(b)(6)", "Vessels located at gasoline service stations;"),
  kcLowVp: q("40 CFR 60.110c(b)(8)", "Vessels that only store VOL with a maximum true vapor pressure less than 0.25 psia (1.7 kPa absolute)."),
  kcBig: q("40 CFR 60.110c(c)(1)", "Storage vessels with a capacity greater than or equal to 40,000 gal (151 m³) containing a VOL that, as stored, has a maximum true vapor pressure equal to or greater than 0.5 psia (3.4 kPa)."),
  kcSmall: q("40 CFR 60.110c(c)(2)", "Storage vessels with a capacity greater than or equal to 20,000 gal (75.7 m³) but less than 40,000 gal (151 m³) containing a VOL that, as stored, has a maximum true vapor pressure equal to or greater than 1.5 psia (10.3 kPa)."),
  kcOther: q("40 CFR 60.110c(f)", "Storage vessels that are affected facilities according to paragraph (a) of this section and do not meet the criteria in either paragraph (c)(1), (c)(2), (d)(1), or (d)(2) of this section are subject to the requirements in § 60.113c(d), if applicable, and § 60.115c(b)."),

  // ---------- Crude oil and natural gas (Quad O family, KKK, LLL) ----------
  o4Window: q("40 CFR 60.5365", "for which you commence construction, modification, or reconstruction after August 23, 2011, and on or before September 18, 2015."),
  o4aWindow: q("40 CFR 60.5365a", "for which you commence construction, modification, or reconstruction after September 18, 2015, and on or before December 6, 2022."),
  o4bWindow: q("40 CFR 60.5365b", "for which you commence construction, modification, or reconstruction after December 6, 2022."),
  o4cWindow: q("40 CFR 60.5386c", "for which you commence construction, modification, or reconstruction on or before December 6, 2022."),
  o4cPlan: q("40 CFR 60.5360c", "This subpart establishes emission guidelines and compliance schedules for the control of greenhouse gas (GHG) emissions from designated facilities in the crude oil and natural gas source category"),
  kkkWindow: q("40 CFR 60.630(b)", "Any affected facility under paragraph (a) of this section that commences construction, reconstruction, or modification after January 20, 1984, and on or before August 23, 2011, is subject to the requirements of this subpart."),
  kkkEquip: q("40 CFR 60.630(a)(3)", "The group of all equipment except compressors (definied in § 60.631) within a process unit is an affected facility."),
  kkkComp: q("40 CFR 60.630(a)(2)", "A compressor in VOC service or in wet gas service is an affected facility."),
  lllWindow: q("40 CFR 60.640(d)", "The provisions of this subpart apply to each affected facility identified in paragraph (a) of this section which commences construction or modification after January 20, 1984, and on or before August 23, 2011."),
  lllUnits: q("40 CFR 60.640(a)", "each sweetening unit, and each sweetening unit followed by a sulfur recovery unit."),

  o4Well: q("40 CFR 60.5365(a)", "Each gas well affected facility, which is a single natural gas well."),
  o4aWell: q("40 CFR 60.5365a(a)", "Each well affected facility, which is a single well that conducts a well completion operation following hydraulic fracturing or refracturing."),
  o4bWell: q("40 CFR 60.5365b(a)", "Each well affected facility, which is a single well drilled for the purpose of producing oil or natural gas."),
  o4cWell: q("40 CFR 60.5386c(a)", "Each well designated facility, which is a single well drilled for the purpose of producing oil or natural gas."),

  o4Cent: q("40 CFR 60.5365(b)", "Each centrifugal compressor affected facility, which is a single centrifugal compressor using wet seals that is located between the wellhead and the point of custody transfer to the natural gas transmission and storage segment. A centrifugal compressor located at a well site, or an adjacent well site and servicing more than one well site, is not an affected facility under this subpart."),
  o4aCent: q("40 CFR 60.5365a(b)", "Each centrifugal compressor affected facility, which is a single centrifugal compressor using wet seals. A centrifugal compressor located at a well site, or an adjacent well site and servicing more than one well site, is not an affected facility under this subpart."),
  o4bCent: q("40 CFR 60.5365b(b)", "Each centrifugal compressor affected facility, which is a single centrifugal compressor. A centrifugal compressor located at a well site is not an affected facility under this subpart."),
  o4cCent: q("40 CFR 60.5386c(b)", "Each centrifugal compressor designated facility, which is a single centrifugal compressor. A centrifugal compressor located at a well site is not a designated facility under this subpart."),

  o4Recip: q("40 CFR 60.5365(c)", "Each reciprocating compressor affected facility, which is a single reciprocating compressor located between the wellhead and the point of custody transfer to the natural gas transmission and storage segment. A reciprocating compressor located at a well site, or an adjacent well site and servicing more than one well site, is not an affected facility under this subpart."),
  o4aRecip: q("40 CFR 60.5365a(c)", "Each reciprocating compressor affected facility, which is a single reciprocating compressor. A reciprocating compressor located at a well site, or an adjacent well site and servicing more than one well site, is not an affected facility under this subpart."),
  o4bRecip: q("40 CFR 60.5365b(c)", "Each reciprocating compressor affected facility, which is a single reciprocating compressor. A reciprocating compressor located at a well site is not an affected facility under this subpart."),
  o4cRecip: q("40 CFR 60.5386c(c)", "Each reciprocating compressor designated facility, which is a single reciprocating compressor. A reciprocating compressor located at a well site is not a designated facility under this subpart."),

  o4Pneu: q("40 CFR 60.5365(d)(2)", "each pneumatic controller affected facility, which is a single continuous bleed natural gas-driven pneumatic controller operating at a natural gas bleed rate greater than 6 standard cubic feet per hour."),
  o4PneuPlant: q("40 CFR 60.5365(d)(3)", "For natural gas processing plants, each pneumatic controller affected facility, which is a single continuous bleed natural gas-driven pneumatic controller."),
  o4aPneu: q("40 CFR 60.5365a(d)(1)", "Each pneumatic controller affected facility not located at a natural gas processing plant, which is a single continuous bleed natural gas-driven pneumatic controller operating at a natural gas bleed rate greater than 6 scfh."),
  o4aPneuPlant: q("40 CFR 60.5365a(d)(2)", "Each pneumatic controller affected facility located at a natural gas processing plant, which is a single continuous bleed natural gas-driven pneumatic controller."),
  o4bPneu: q("40 CFR 60.5365b(d)", "Each process controller affected facility, which is the collection of natural gas-driven process controllers at a well site, centralized production facility, onshore natural gas processing plant, or a compressor station."),
  o4cPneu: q("40 CFR 60.5386c(d)", "Each process controller designated facility, which is the collection of natural gas-driven process controllers at a well site, centralized production facility, onshore natural gas processing plant, or a compressor station."),

  o4aPumpPlant: q("40 CFR 60.5365a(h)(1)", "For natural gas processing plants, each pneumatic pump affected facility, which is a single natural gas-driven diaphragm pump."),
  o4aPumpWell: q("40 CFR 60.5365a(h)(2)", "For well sites, each pneumatic pump affected facility, which is a single natural gas-driven diaphragm pump."),
  o4bPump: q("40 CFR 60.5365b(h)", "Each pump affected facility, which is the collection of natural gas-driven pumps at a well site, centralized production facility, onshore natural gas processing plant, or a compressor station."),
  o4cPump: q("40 CFR 60.5386c(g)", "Each pump designated facility, which is the collection of natural gas-driven diaphragm and piston pumps at a well site, centralized production facility, onshore natural gas processing plant, or a compressor station."),

  o4aFugWell: q("40 CFR 60.5365a(i)", "the collection of fugitive emissions components at a well site, as defined in § 60.5430a, is an affected facility."),
  o4aFugComp: q("40 CFR 60.5365a(j)", "The collection of fugitive emissions components at a compressor station, as defined in § 60.5430a, is an affected facility."),
  o4bFug: q("40 CFR 60.5365b(i)", "Each fugitive emissions components affected facility, which is the collection of fugitive emissions components at a well site, centralized production facility, or a compressor station."),
  o4cFug: q("40 CFR 60.5386c(h)", "Each fugitive emissions components designated facility, which is the collection of fugitive emissions components at a well site, centralized production facility, or a compressor station."),

  o4Equip: q("40 CFR 60.5365(f)", "The group of all equipment, except compressors, within a process unit is an affected facility."),
  o4aEquip: q("40 CFR 60.5365a(f)", "The group of all equipment within a process unit at an onshore natural gas processing plant is an affected facility."),
  o4bEquip: q("40 CFR 60.5365b(f)", "Each process unit equipment affected facility, which is the group of all equipment within a process unit at an onshore natural gas processing plant is an affected facility."),
  o4cEquip: q("40 CFR 60.5386c(f)", "Each process unit equipment designated facility, which is the group of all equipment within a process unit at an onshore natural gas processing plant is a designated facility."),

  o4Sweet: q("40 CFR 60.5365(g)", "Sweetening units located at onshore natural gas processing plants that process natural gas produced from either onshore or offshore wells."),
  o4aSweet: q("40 CFR 60.5365a(g)", "Sweetening units located at onshore natural gas processing plants that commenced construction, modification, or reconstruction after September 18, 2015, and on or before November 16, 2020, and sweetening units that commence construction, modification, or reconstruction after November 16, 2020."),
  o4bSweet: q("40 CFR 60.5365b(g)", "Each sweetening unit affected facility as defined by paragraphs (g)(1) and (2) of this section."),

  o4Tank: q("40 CFR 60.5365(e)", "Each storage vessel affected facility, which is a single storage vessel located in the oil and natural gas production segment, natural gas processing segment or natural gas transmission and storage segment, and has the potential for VOC emissions equal to or greater than 6 tons per year (tpy)"),
  o4aTank1: q("40 CFR 60.5365a(e)(1)", "A single storage vessel that commenced construction, reconstruction, or modification after September 18, 2015, and on or before November 16, 2020, is a storage vessel affected facility if its potential for VOC emissions is equal to or greater than 6 tons per year (tpy)"),
  o4aTank: q("40 CFR 60.5365a(e)(2)", "a single storage vessel that commenced construction, reconstruction or modification after November 16, 2020, is a storage vessel affected facility if the potential for VOC emissions is equal to or greater than 6 tpy"),
  o4bTank: q("40 CFR 60.5365b(e)", "Each storage vessel affected facility, which is a tank battery that has the potential for emissions as specified in either paragraph (e)(1)(i) or (ii) of this section."),
  o4bTankVoc: q("40 CFR 60.5365b(e)(1)(i)", "Potential for VOC emissions equal to or greater than 6 tons per year (tpy) as determined in paragraph (e)(2) of this section."),
  o4bTankCh4: q("40 CFR 60.5365b(e)(1)(ii)", "Potential for methane emissions equal to or greater than 20 tpy as determined in paragraph (e)(2) of this section."),
  o4cTank: q("40 CFR 60.5386c(e)(1)", "Each storage vessel designated facility, which is a tank battery that has the potential for methane emissions equal to or greater than 20 tpy as specified in paragraph (e)(2) of this section."),

  // Elements of a legally and practicably enforceable limit for a tank battery
  o4bLimit: q("40 CFR 60.5365b(e)(2)(i)", "a legally and practicably enforceable limit must include the elements provided in paragraphs (e)(2)(i)(A) through (F) of this section."),
  o4bLimitA: q("40 CFR 60.5365b(e)(2)(i)(A)", "A quantitative production limit and quantitative operational limit(s) for the equipment, or quantitative operational limits for the equipment;"),
  o4bLimitB: q("40 CFR 60.5365b(e)(2)(i)(B)", "An averaging time period for the production limit in (e)(2)(i)(A) of this section, if a production-based limit is used, that is equal to or less than 30 days;"),
  o4bLimitC: q("40 CFR 60.5365b(e)(2)(i)(C)", "Established parametric limits for the production and/or operational limit(s) in paragraph (e)(2)(i)(A) of this section, and where a control device is used to achieve an operational limit, an initial compliance demonstration (i.e., performance test) for the control device that establishes the parametric limits;"),
  o4bLimitD: q("40 CFR 60.5365b(e)(2)(i)(D)", "Ongoing monitoring of the parametric limits in (e)(2)(i)(C) of this section that demonstrates continuous compliance with the production and/or operational limit(s) in (e)(2)(i)(A) of this section;"),
  o4bLimitE: q("40 CFR 60.5365b(e)(2)(i)(E)", "Recordkeeping by the owner or operator that demonstrates continuous compliance with the limit(s) in (e)(2)(i)(A) through (D) of this section; and"),
  o4bLimitF: q("40 CFR 60.5365b(e)(2)(i)(F)", "Periodic reporting that demonstrates continuous compliance."),

  // ---------- Flares ----------
  flareVe: q("40 CFR 60.18(c)(1)", "Flares shall be designed for and operated with no visible emissions as determined by the methods specified in paragraph (f), except for periods not to exceed a total of 5 minutes during any 2 consecutive hours."),
  flarePilot: q("40 CFR 60.18(c)(2)", "Flares shall be operated with a flame present at all times, as determined by the methods specified in paragraph (f)."),

  // ---------- NSR netting ----------
  nsrTwoStep: q("40 CFR 52.21(a)(2)(iv)(A)", "If the project causes a significant emissions increase, then the project is a major modification only if it also results in a significant net emissions increase."),
  netDef: q("40 CFR 52.21(b)(3)(i)", "Net emissions increase means, with respect to any regulated NSR pollutant emitted by a major stationary source, the amount by which the sum of the following exceeds zero:"),
  netContemp: q("40 CFR 52.21(b)(3)(i)(B)", "Any other increases and decreases in actual emissions at the major stationary source that are contemporaneous with the particular change and are otherwise creditable."),
  netWindowA: q("40 CFR 52.21(b)(3)(ii)(A)", "The date five years before construction on the particular change commences; and"),
  netWindowB: q("40 CFR 52.21(b)(3)(ii)(B)", "The date that the increase from the particular change occurs."),
  netIncrease: q("40 CFR 52.21(b)(3)(v)", "An increase in actual emissions is creditable only to the extent that the new level of actual emissions exceeds the old level."),
  netDecrease: q("40 CFR 52.21(b)(3)(vi)(A)", "The old level of actual emissions or the old level of allowable emissions, whichever is lower, exceeds the new level of actual emissions;"),
  netDecreaseEnf: q("40 CFR 52.21(b)(3)(vi)(B)", "It is enforceable as a practical matter at and after the time that actual construction on the particular change begins."),
  sigIntro: q("40 CFR 52.21(b)(23)(i)", "Significant means, in reference to a net emissions increase or the potential of a source to emit any of the following pollutants, a rate of emissions that would equal or exceed any of the following rates:"),

  // ---------- Title V records and reports ----------
  tvRecordsWhat: q("40 CFR 70.6(a)(3)(ii)(A)", "Records of required monitoring information that include the following:"),
  tvRetention: q("40 CFR 70.6(a)(3)(ii)(B)", "Retention of records of all required monitoring data and support information for a period of at least 5 years from the date of the monitoring sample, measurement, report, or application."),
  tvSemiannual: q("40 CFR 70.6(a)(3)(iii)(A)", "Submittal of reports of any required monitoring at least every 6 months. All instances of deviations from permit requirements must be clearly identified in such reports."),
  tvPrompt: q("40 CFR 70.6(a)(3)(iii)(B)", "Prompt reporting of deviations from permit requirements, including those attributable to upset conditions as defined in the permit, the probable cause of such deviations, and any corrective actions or preventive measures taken."),
  tvCertFreq: q("40 CFR 70.6(c)(5)(i)", "The frequency (not less than annually or such more frequent periods as specified in the applicable requirement or by the permitting authority) of submissions of compliance certifications;"),
  tvCertDeviations: q("40 CFR 70.6(c)(5)(iii)(C)", "The certification shall identify each deviation and take it into account in the compliance certification."),

  // ---------- NSPS general provisions ----------
  nspsConstructionNotice: q("40 CFR 60.7(a)(1)", "A notification of the date construction (or reconstruction as defined under § 60.15) of an affected facility is commenced postmarked no later than 30 days after such date."),
  nspsStartupNotice: q("40 CFR 60.7(a)(3)", "A notification of the actual date of initial startup of an affected facility postmarked within 15 days after such date."),
  nspsSsm: q("40 CFR 60.7(b)", "maintain records of the occurrence and duration of any startup, shutdown, or malfunction in the operation of an affected facility; any malfunction of the air pollution control equipment; or any periods during which a continuous monitoring system or monitoring device is inoperative."),
  nspsExcess: q("40 CFR 60.7(c)", "Each owner or operator required to install a continuous monitoring device shall submit excess emissions and monitoring systems performance report"),
  nspsFile: q("40 CFR 60.7(f)", "The file shall be retained for at least two years following the date of such measurements, maintenance, reports, and records, except as follows:"),
  nspsTestRuns: q("40 CFR 60.8(f)", "Unless otherwise specified in the applicable subpart, each performance test shall consist of three separate runs using the applicable test method."),

  // ---------- NESHAP general provisions ----------
  neshapFiles: q("40 CFR 63.10(b)(1)", "The files shall be retained for at least 5 years following the date of each occurrence, measurement, maintenance, corrective action, report, or record. At a minimum, the most recent 2 years of data shall be retained on site."),
  neshapExcess: q("40 CFR 63.10(e)(3)(i)", "The owner or operator of an affected source required to install a CMS by a relevant standard shall submit an excess emissions and continuous monitoring system performance report and/or a summary report to the Administrator semiannually"),
  neshapNocs: q("40 CFR 63.9(h)(1)", "The requirements of paragraphs (h)(2) through (h)(4) of this section apply when an affected source becomes subject to a relevant standard."),

  // ---------- EPA guidance on limiting potential to emit ----------
  pte95Elements: q(EPA_PTE_1995.title, "enforceability for a source-specific permit means that the permit's provisions must specify: (1) A technically-accurate limitation and the portions of the source subject to the limitation; (2) the time period for the limitation (hourly, daily, monthly, and annual limits such as rolling annual limits); and (3) the method to determine compliance including appropriate monitoring, recordkeeping, and reporting.", EPA_PTE_1995.url),
  pte95Averaging: q(EPA_PTE_1995.title, "EPA policy expresses a preference toward short term limits, generally daily but not to exceed one month. However, EPA policy allows for rolling limits not to exceed 12 months or 365 days where the permitting authority finds that the limit provides an assurance that compliance can be readily determined and verified.", EPA_PTE_1995.url),
  pte95Parameters: q(EPA_PTE_1995.title, "Where monitoring cannot be used to determine emissions directly, limits on appropriate operating parameters must be established for the units or source, and monitoring must verify compliance with those limits.", EPA_PTE_1995.url),
  pte89TwoCriteria: q(EPA_PTE_1989.title, "1) it is federally enforceable as defined by 40 C.F.R. Sections 52.21(b) (17), 51.165(a) (1) (xiv), 51.166(b) (17), i.e., contained in a permit issued pursuant to an EPA-approved permitting program or a permit directly issued by EPA, or has been submitted to EPA as a revision to a State Implementation Plan and approved as such by EPA; and 2) it is enforceable as a practical matter.", EPA_PTE_1989.url),
  pte89Independent: q(EPA_PTE_1989.title, "Production and operational limits must be stated as conditions that can be enforced independently of one another.", EPA_PTE_1989.url),
  pte89Records: q(EPA_PTE_1989.title, "When permits contain production or operational limits, they should also have recordkeeping requirements that allow a permitting agency to verify a source's compliance with its limits.", EPA_PTE_1989.url),
  pte89Controls: q(EPA_PTE_1989.title, "permit writers should include, so that the operating efficiency condition is enforceable as a practical matter, those operating parameters and assumptions which the permitting agency depended upon to determine that the control equipment would have a given efficiency.", EPA_PTE_1989.url),
  pte89Month: q(EPA_PTE_1989.title, "the time over which they extend should be as short term as possible and should generally not exceed one month.", EPA_PTE_1989.url),
  pte89Rolling: q(EPA_PTE_1989.title, "However, the limit should not exceed an annual limit rolled on a monthly basis.", EPA_PTE_1989.url),

  // ---------- Emission estimation documents ----------
  ap42Total: q(AP42_7_1.title, "Total routine losses from fixed roof tanks are equal to the sum of the standing loss and working loss:", AP42_7_1.url),
  ap42Standing: q(AP42_7_1.title, "LS = 365 VVWVKEKS", AP42_7_1.url),
  ap42Kn: q(AP42_7_1.title, "for turnovers > 36, KN = (180 + N)/6N", AP42_7_1.url),
  ap42KnLow: q(AP42_7_1.title, "for turnovers £ 36, KN = 1", AP42_7_1.url),
  ap42Kp: q(AP42_7_1.title, "for crude oils, KP = 0.75;", AP42_7_1.url),
  ap42KpOther: q(AP42_7_1.title, "for all other organic liquids, KP = 1", AP42_7_1.url),
  ap42Vq: q(AP42_7_1.title, "5.614 = the conversion of barrels to cubic feet, ft3/bbl", AP42_7_1.url),
  ap42Kb: q(AP42_7_1.title, "for a vent setting range up to ± 0.03 psig, KB = 1", AP42_7_1.url),
  ap42Flash: q(AP42_7_1.title, "There are numerous methodologies available for estimating flashing losses and specific guidance regarding their application and use.", AP42_7_1.url),
  ap42FlareDre: q(AP42_13_5.title, "It is generally estimated that a combustion efficiency of 96.5 percent is equivalent to a destruction efficiency of 98 percent.", AP42_13_5.url),
  leakEquation: q(LEAK_PROTOCOL.title, "ETOC = FA × WFTOC × N", LEAK_PROTOCOL.url),
  leakPopulation: q(LEAK_PROTOCOL.title, "these factors are most valid for estimating emissions from a population of equipment.", LEAK_PROTOCOL.url),
} as const satisfies Record<string, RuleQuote>;

export type RuleTextKey = keyof typeof RT;

/** The federal significance table from 40 CFR 52.21(b)(23)(i), each row verbatim. */
export const psdSignificance: { pollutant: string; tpy: number; row: string }[] = [
  { pollutant: "Carbon monoxide", tpy: 100, row: "Carbon monoxide: 100 tons per year (tpy)" },
  { pollutant: "Nitrogen oxides", tpy: 40, row: "Nitrogen oxides: 40 tpy" },
  { pollutant: "Sulfur dioxide", tpy: 40, row: "Sulfur dioxide: 40 tpy" },
  { pollutant: "Particulate matter", tpy: 25, row: "Particulate matter: 25 tpy of particulate matter emissions" },
  { pollutant: "PM10", tpy: 15, row: "PM10: 15 tpy" },
  { pollutant: "PM2.5 (direct)", tpy: 10, row: "PM2.5: 10 tpy of direct PM2.5 emissions" },
  { pollutant: "Ozone (VOC or NOx)", tpy: 40, row: "Ozone: 40 tpy of volatile organic compounds or nitrogen oxides" },
  { pollutant: "Lead", tpy: 0.6, row: "Lead: 0.6 tpy" },
  { pollutant: "Fluorides", tpy: 3, row: "Fluorides: 3 tpy" },
  { pollutant: "Sulfuric acid mist", tpy: 7, row: "Sulfuric acid mist: 7 tpy" },
  { pollutant: "Hydrogen sulfide (H2S)", tpy: 10, row: "Hydrogen sulfide (H2S): 10 tpy" },
  { pollutant: "Total reduced sulfur (including H2S)", tpy: 10, row: "Total reduced sulfur (including H2S): 10 tpy" },
];
