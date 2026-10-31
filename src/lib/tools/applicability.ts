import { RT, type RuleQuote } from "./rule-text";
import { csvLines } from "../csv";

/**
 * Applicability screening for common equipment and facility-wide programs.
 * Each check compares what the user entered with the dates and sizes in the
 * rule text it quotes (src/lib/tools/rule-text.ts), and says why. It never
 * concludes that a rule applies: results are "potentially applicable",
 * "likely not applicable", or "more information needed", and every one lists
 * what would settle the question.
 */

export type ScreenStatus = "potentially-applicable" | "likely-not-applicable" | "more-info-needed";

export interface Finding {
  /** Stable key, such as "nsps-iiii". */
  key: string;
  /** "NSPS Subpart IIII". */
  rule: string;
  /** "40 CFR Part 60, Subpart IIII". */
  citation: string;
  title: string;
  status: ScreenStatus;
  /** One-line reason in plain words, based on the user's entries. */
  why: string;
  /** Rule text the reason rests on. */
  basis: RuleQuote[];
  /** What the user would need to confirm. */
  needed: string[];
  href: string;
  /** AirPermitHub Rule Library page, when there is one. */
  library?: string;
}

export type DateKind = "construction" | "modification" | "reconstruction";
export type HapStatus = "major" | "area" | "unknown";

export const equipmentTypes = [
  { value: "ci-engine", label: "Stationary engine, compression ignition (diesel)" },
  { value: "si-engine", label: "Stationary engine, spark ignition (gas, LPG, gasoline)" },
  { value: "boiler", label: "Boiler (steam or hot water)" },
  { value: "process-heater", label: "Process heater or heater treater" },
  { value: "turbine", label: "Stationary combustion turbine" },
  { value: "tank", label: "Storage tank or tank battery" },
  { value: "well", label: "Oil or gas well" },
  { value: "centrifugal-compressor", label: "Centrifugal compressor" },
  { value: "reciprocating-compressor", label: "Reciprocating compressor" },
  { value: "pneumatic-controller", label: "Pneumatic controllers" },
  { value: "pneumatic-pump", label: "Pneumatic pumps" },
  { value: "fugitives", label: "Fugitive emissions components (site)" },
  { value: "gas-plant-equipment", label: "Process unit equipment at a gas plant" },
  { value: "sweetening-unit", label: "Sweetening unit (acid gas removal)" },
  { value: "flare", label: "Flare" },
] as const;
export type EquipmentType = (typeof equipmentTypes)[number]["value"];

export const oilGasTypes: EquipmentType[] = ["well", "centrifugal-compressor", "reciprocating-compressor", "pneumatic-controller", "pneumatic-pump", "fugitives", "gas-plant-equipment", "sweetening-unit"];

export type Site = "well-site" | "centralized-production" | "compressor-station" | "gas-plant" | "transmission-storage" | "other";
export const siteLabels: Record<Site, string> = {
  "well-site": "Well site",
  "centralized-production": "Centralized production facility",
  "compressor-station": "Compressor station",
  "gas-plant": "Onshore natural gas processing plant",
  "transmission-storage": "Transmission and storage",
  other: "Other or not sure",
};

export interface EquipmentInput {
  id: string;
  type: EquipmentType;
  name: string;
  /** YYYY-MM-DD the construction, modification, or reconstruction commenced (for engines, the order date). */
  date: string;
  dateKind: DateKind;
  /** Engines: maximum engine power or site rating, hp. */
  hp?: number | null;
  /** Engines: YYYY-MM-DD manufactured. */
  manufactured?: string;
  emergency?: boolean;
  firePump?: boolean;
  /** Spark ignition engine design. */
  burn?: "4SRB" | "4SLB" | "2SLB" | "unknown";
  /** Boilers, heaters, turbines: heat input, MMBtu/hr. */
  mmbtu?: number | null;
  /** Boilers and heaters. */
  fuel?: "gas" | "liquid" | "solid" | "other";
  temporary?: boolean;
  /** Turbines: rated peak power output, MW. */
  mw?: number | null;
  /** Tanks: capacity, gallons. */
  gallons?: number | null;
  /** Tanks: maximum true vapor pressure of the stored liquid, psia. */
  tvp?: number | null;
  /** Tanks: what is stored. */
  liquid?: "crude-condensate" | "vol" | "not-vol";
  /** Tanks: petroleum or condensate stored, processed, or treated before custody transfer. */
  beforeCustody?: boolean;
  tankSite?: "none" | "bulk-gasoline-plant" | "service-station";
  /** Oil and gas tank batteries: potential VOC and methane, tpy. */
  vocTpy?: number | null;
  ch4Tpy?: number | null;
  /** Oil and gas equipment location. */
  site?: Site;
  /** Centrifugal compressors: wet seals. */
  wetSeals?: boolean;
  /** Pneumatic controllers and pumps: natural gas-driven. */
  gasDriven?: boolean;
  /** Pneumatic controllers: continuous bleed and bleed rate, scfh. */
  continuousBleed?: boolean;
  bleedScfh?: number | null;
}

export type OzoneClass = "none" | "marginal" | "moderate" | "serious" | "severe" | "extreme" | "unknown";

export interface FacilityInput {
  name: string;
  /** State slug for the state hub link. */
  state: string;
  hap: HapStatus;
  /** Potential HAP, tpy (optional; used when HAP status is not sure). */
  hapSingle: number | null;
  hapTotal: number | null;
  /** Facility potential to emit, tpy. */
  pte: Record<PtePollutant, number | null>;
  /** One of the source categories in 40 CFR 52.21(b)(1)(i)(A). */
  listedCategory: "yes" | "no" | "unknown";
  ozone: OzoneClass;
  /** Crude oil and natural gas source category. */
  oilGas: boolean;
  /** GHG reporting inputs. */
  ghgListed: "a3" | "a4" | "no" | "unknown";
  ghgCo2e: number | null;
  combustionMmbtu: number | null;
}

export const ptePollutants = ["NOx", "CO", "VOC", "SO2", "PM10", "PM2.5", "PM"] as const;
export type PtePollutant = (typeof ptePollutants)[number];

// ---------- thresholds, each from the rule text named beside it ----------

/** 40 CFR 63.2 major source: RT.hapMajor */
export const HAP_SINGLE = 10;
export const HAP_TOTAL = 25;
/** 40 CFR 70.2 major source: RT.tvMajor100, RT.tvOzone */
export const TV_MAJOR = 100;
export const TV_OZONE: Record<"marginal" | "moderate" | "serious" | "severe" | "extreme", number> = { marginal: 100, moderate: 100, serious: 50, severe: 25, extreme: 10 };
/** 40 CFR 52.21(b)(1)(i): RT.psdListed, RT.psd250 */
export const PSD_LISTED = 100;
export const PSD_OTHER = 250;
/** 40 CFR 98.2(a)(3): RT.ghgHeat, RT.ghgCombustion */
export const GHG_HEAT = 30;
export const GHG_CO2E = 25000;

/** Unit conversions for comparing entries with metric thresholds (exact or NIST values). */
export const GAL_PER_M3 = 264.172;
export const KPA_PER_PSI = 6.894757;

const sub = (part: string, subpart: string) => `https://www.ecfr.gov/current/title-40/part-${part}/subpart-${subpart}`;
const lib = (program: "nsps" | "neshap" | "ghg-reporting", subpart: string) => `/regulations/${program}/subpart-${subpart.toLowerCase()}`;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
const human = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};
const isDate = (d?: string): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
const has = (n?: number | null): n is number => typeof n === "number" && Number.isFinite(n);

/** The facility's HAP status, from the selection or from the potential HAP entered. */
export function hapStatus(f: FacilityInput): HapStatus {
  if (f.hap !== "unknown") return f.hap;
  if ((has(f.hapSingle) && f.hapSingle >= HAP_SINGLE) || (has(f.hapTotal) && f.hapTotal >= HAP_TOTAL)) return "major";
  if (has(f.hapSingle) && has(f.hapTotal)) return "area";
  return "unknown";
}

function finding(p: Omit<Finding, "needed" | "basis"> & { basis?: RuleQuote[]; needed?: string[] }): Finding {
  return { ...p, basis: p.basis ?? [], needed: p.needed ?? [] };
}

// ---------- facility-wide ----------

export function screenFacility(f: FacilityInput): Finding[] {
  const out: Finding[] = [];
  const hap = hapStatus(f);
  const entered = ptePollutants.filter((p) => has(f.pte[p]));
  const maxPte = entered.length ? Math.max(...entered.map((p) => f.pte[p] as number)) : null;
  const maxName = entered.find((p) => f.pte[p] === maxPte);

  // HAP major or area source
  out.push(finding({
    key: "hap-status", rule: "HAP major or area source", citation: "40 CFR 63.2", title: "Major or area source of hazardous air pollutants",
    status: hap === "unknown" ? "more-info-needed" : "potentially-applicable",
    why: hap === "major"
      ? f.hap === "major" ? "You selected major source. NESHAP for major sources may apply to units at the site." : `The potential HAP you entered meets ${HAP_SINGLE} tpy of a single HAP or ${HAP_TOTAL} tpy combined.`
      : hap === "area"
        ? f.hap === "area" ? "You selected area source. Area source NESHAP (GACT) may apply instead of major source MACT." : `The potential HAP you entered is below ${HAP_SINGLE} tpy single and ${HAP_TOTAL} tpy combined.`
        : "HAP status decides which NESHAP apply. Select it, or enter potential single and combined HAP.",
    basis: [RT.hapMajor, RT.hapArea, ...(f.oilGas ? [RT.hapSurfaceSite] : [])],
    needed: ["Potential to emit for each HAP, considering only controls that are enforceable", "Which sources are within the contiguous area and under common control", ...(f.oilGas ? ["For oil and gas production, the surface site boundary"] : [])],
    href: "https://www.ecfr.gov/current/title-40/section-63.2",
  }));

  // Title V
  const tvHits: string[] = [];
  if (maxPte !== null && maxPte >= TV_MAJOR) tvHits.push(`${maxName} potential ${fmt(maxPte)} tpy is at or above ${TV_MAJOR} tpy`);
  if (f.ozone !== "none" && f.ozone !== "unknown") {
    const t = TV_OZONE[f.ozone];
    for (const p of ["VOC", "NOx"] as const) if (has(f.pte[p]) && (f.pte[p] as number) >= t) tvHits.push(`${p} potential ${fmt(f.pte[p] as number)} tpy is at or above ${t} tpy for a ${f.ozone} ozone nonattainment area`);
  }
  if (hap === "major") tvHits.push("the site is a major source of HAP");
  const tvKnown = entered.length >= 3 && f.ozone !== "unknown" && hap !== "unknown";
  out.push(finding({
    key: "title-v", rule: "Title V operating permit", citation: "40 CFR Part 70", title: "Title V major source screen",
    status: tvHits.length ? "potentially-applicable" : tvKnown ? "likely-not-applicable" : "more-info-needed",
    why: tvHits.length ? `Major source screen: ${tvHits.join("; ")}.` : tvKnown ? "The potential to emit you entered is below the Part 70 major source thresholds. Part 70 also lists other kinds of sources that need a permit (40 CFR 70.3(a)), and your state's program may be broader." : "Enter potential to emit for the main pollutants, the ozone classification, and HAP status to screen against the major source thresholds.",
    basis: [RT.tvMajor100, RT.tvOzone, RT.tvHap, RT.ptePart70],
    needed: ["Potential to emit for every regulated pollutant, including fugitives where the definition requires them", "Your area's attainment status and classification", "Other reasons Part 70 lists for needing a permit, in 40 CFR 70.3(a)"],
    href: "https://www.ecfr.gov/current/title-40/part-70",
    library: "/resources/title-v-basics",
  }));

  // PSD major stationary source
  let psdStatus: ScreenStatus = "more-info-needed";
  let psdWhy = "Enter potential to emit to compare with the PSD major source thresholds.";
  if (maxPte !== null) {
    if (maxPte >= PSD_OTHER) { psdStatus = "potentially-applicable"; psdWhy = `${maxName} potential ${fmt(maxPte)} tpy is at or above ${PSD_OTHER} tpy.`; }
    else if (maxPte >= PSD_LISTED && f.listedCategory === "yes") { psdStatus = "potentially-applicable"; psdWhy = `${maxName} potential ${fmt(maxPte)} tpy is at or above ${PSD_LISTED} tpy for a listed source category.`; }
    else if (maxPte >= PSD_LISTED && f.listedCategory === "unknown") { psdWhy = `${maxName} potential ${fmt(maxPte)} tpy is between ${PSD_LISTED} and ${PSD_OTHER} tpy. Whether the source is in a listed category decides the threshold.`; }
    else if (entered.length >= 3) { psdStatus = "likely-not-applicable"; psdWhy = `The potential to emit you entered is below ${f.listedCategory === "yes" ? PSD_LISTED : PSD_OTHER} tpy for each pollutant entered.`; }
  }
  out.push(finding({
    key: "psd-major", rule: "PSD major stationary source", citation: "40 CFR 52.21(b)(1)", title: "New Source Review: major stationary source screen",
    status: psdStatus, why: psdWhy, basis: [RT.psdListed, RT.psd250],
    needed: ["Whether the area is attainment or nonattainment for each pollutant (nonattainment NSR thresholds are set in the state's rule)", "Whether the source is one of the categories listed in 40 CFR 52.21(b)(1)(i)(A)", "Your state's SIP-approved NSR rule, which may differ from 40 CFR 52.21"],
    href: "https://www.ecfr.gov/current/title-40/section-52.21#p-52.21(b)(1)",
    library: "/tools/nsr-baseline-calculator",
  }));

  // GHG reporting
  let ghgStatus: ScreenStatus = "more-info-needed";
  let ghgWhy = "Answer whether the facility has a Part 98 source category, and enter combustion capacity and CO2e, to screen.";
  if (f.ghgListed === "a3") { ghgStatus = "potentially-applicable"; ghgWhy = "You indicated a source category listed in Table A-3, which does not depend on an emissions threshold."; }
  else if (f.ghgListed === "a4" && has(f.ghgCo2e)) { ghgStatus = f.ghgCo2e >= GHG_CO2E ? "potentially-applicable" : "likely-not-applicable"; ghgWhy = `You indicated a Table A-4 category and ${fmt(f.ghgCo2e)} metric tons CO2e per year, ${f.ghgCo2e >= GHG_CO2E ? "at or above" : "below"} ${fmt(GHG_CO2E)}.`; }
  else if (f.ghgListed === "no" && has(f.combustionMmbtu) && has(f.ghgCo2e)) {
    const hit = f.combustionMmbtu >= GHG_HEAT && f.ghgCo2e >= GHG_CO2E;
    ghgStatus = hit ? "potentially-applicable" : "likely-not-applicable";
    ghgWhy = `Combustion capacity ${fmt(f.combustionMmbtu)} MMBtu/hr and ${fmt(f.ghgCo2e)} metric tons CO2e from combustion ${hit ? "meet" : "do not meet"} both conditions in 40 CFR 98.2(a)(3).`;
  }
  out.push(finding({
    key: "ghgrp", rule: "GHG Reporting Program", citation: "40 CFR 98.2", title: "Greenhouse Gas Reporting Program screen",
    status: ghgStatus, why: ghgWhy, basis: [RT.ghgA3, RT.ghgA4, RT.ghgHeat, RT.ghgCombustion],
    needed: ["Tables A-3 and A-4 of Part 98, to see whether a listed source category is present", "Annual CO2e calculated with the Part 98 methods (98.2(b))"],
    href: "https://www.ecfr.gov/current/title-40/section-98.2",
    library: lib("ghg-reporting", "A"),
  }));
  return out;
}

// ---------- engines ----------

function iiii(e: EquipmentInput): Finding {
  const base = { key: "nsps-iiii", rule: "NSPS Subpart IIII", citation: "40 CFR Part 60, Subpart IIII", title: "Stationary compression ignition engines", href: sub("60", "IIII"), library: lib("nsps", "IIII") };
  const needed = ["The order date (the rule treats it as the date construction commences)", "Manufacture date from the engine nameplate or emission certificate", "Whether the engine is a certified NFPA fire pump engine"];
  if (!isDate(e.date)) return finding({ ...base, status: "more-info-needed", why: "Enter the order, modification, or reconstruction date.", basis: [RT.iiiiOrder, RT.iiiiNew, RT.iiiiMod], needed });
  if (e.dateKind !== "construction") {
    const hit = e.date > "2005-07-11";
    return finding({ ...base, status: hit ? "potentially-applicable" : "likely-not-applicable", why: `${e.dateKind === "modification" ? "Modified" : "Reconstructed"} ${human(e.date)}, ${hit ? "after" : "on or before"} July 11, 2005.`, basis: [RT.iiiiMod], needed: ["Whether the change meets the definition of modification (40 CFR 60.14) or reconstruction (40 CFR 60.15)"] });
  }
  if (e.date <= "2005-07-11") return finding({ ...base, status: "likely-not-applicable", why: `Ordered ${human(e.date)}, on or before July 11, 2005.`, basis: [RT.iiiiOrder, RT.iiiiNew], needed: ["Any later modification or reconstruction"] });
  if (!isDate(e.manufactured)) return finding({ ...base, status: "more-info-needed", why: `Ordered ${human(e.date)}, after July 11, 2005. The manufacture date decides the rest.`, basis: [RT.iiiiOrder, RT.iiiiNew, RT.iiiiMfg, RT.iiiiFire], needed });
  const cut = e.firePump ? "2006-07-01" : "2006-04-01";
  const hit = e.manufactured > cut;
  return finding({
    ...base, status: hit ? "potentially-applicable" : "likely-not-applicable",
    why: `Ordered after July 11, 2005 and manufactured ${human(e.manufactured)}, ${hit ? "after" : "on or before"} ${e.firePump ? "July 1, 2006 (fire pump engine)" : "April 1, 2006"}.`,
    basis: [RT.iiiiOrder, RT.iiiiNew, e.firePump ? RT.iiiiFire : RT.iiiiMfg], needed: hit ? ["Model year and displacement per cylinder, which set the emission standards", "Emergency or non-emergency use"] : needed,
  });
}

function jjjj(e: EquipmentInput): Finding {
  const base = { key: "nsps-jjjj", rule: "NSPS Subpart JJJJ", citation: "40 CFR Part 60, Subpart JJJJ", title: "Stationary spark ignition engines", href: sub("60", "JJJJ"), library: lib("nsps", "JJJJ") };
  const needed = ["The order date (the rule treats it as the date construction commences)", "Manufacture date", "Maximum engine power (hp)", "Lean burn or rich burn", "Emergency or non-emergency use"];
  if (!isDate(e.date)) return finding({ ...base, status: "more-info-needed", why: "Enter the order, modification, or reconstruction date.", basis: [RT.jjjjOrder, RT.jjjjNew, RT.jjjjMod], needed });
  if (e.dateKind !== "construction") {
    const hit = e.date > "2006-06-12";
    return finding({ ...base, status: hit ? "potentially-applicable" : "likely-not-applicable", why: `${e.dateKind === "modification" ? "Modified" : "Reconstructed"} ${human(e.date)}, ${hit ? "after" : "on or before"} June 12, 2006.`, basis: [RT.jjjjMod], needed: ["Whether the change meets the definition of modification (40 CFR 60.14) or reconstruction (40 CFR 60.15)"] });
  }
  if (e.date <= "2006-06-12") return finding({ ...base, status: "likely-not-applicable", why: `Ordered ${human(e.date)}, on or before June 12, 2006.`, basis: [RT.jjjjOrder, RT.jjjjNew], needed: ["Any later modification or reconstruction"] });
  if (!has(e.hp)) return finding({ ...base, status: "more-info-needed", why: "Ordered after June 12, 2006. The manufacture date cutoff depends on engine power.", basis: [RT.jjjjNew, RT.jjjjBig, RT.jjjjLean, RT.jjjjSmall, RT.jjjjEmerg], needed });
  let cut: string, q: RuleQuote, label: string;
  if (e.emergency) {
    if (e.hp <= 25) return finding({ ...base, status: "more-info-needed", why: "Paragraph (a)(4)(iv) covers emergency engines above 25 hp; check how the subpart treats smaller emergency engines.", basis: [RT.jjjjNew, RT.jjjjEmerg], needed });
    cut = "2009-01-01"; q = RT.jjjjEmerg; label = "January 1, 2009 (emergency engines above 25 hp)";
  } else if (e.hp >= 500) {
    const lean = e.burn === "4SLB" || e.burn === "2SLB";
    if (e.hp < 1350 && (!e.burn || e.burn === "unknown")) return finding({ ...base, status: "more-info-needed", why: "For 500 to 1,350 hp the cutoff differs for lean burn engines. Select lean or rich burn.", basis: [RT.jjjjBig, RT.jjjjLean], needed });
    if (lean && e.hp < 1350) { cut = "2008-01-01"; q = RT.jjjjLean; label = "January 1, 2008 (lean burn, 500 to 1,350 hp)"; }
    else { cut = "2007-07-01"; q = RT.jjjjBig; label = "July 1, 2007 (500 hp or more)"; }
  } else { cut = "2008-07-01"; q = RT.jjjjSmall; label = "July 1, 2008 (under 500 hp)"; }
  if (!isDate(e.manufactured)) return finding({ ...base, status: "more-info-needed", why: `Ordered after June 12, 2006. The manufacture date must be on or after ${label}.`, basis: [RT.jjjjOrder, RT.jjjjNew, q], needed });
  const hit = e.manufactured >= cut;
  return finding({ ...base, status: hit ? "potentially-applicable" : "likely-not-applicable", why: `Ordered after June 12, 2006 and manufactured ${human(e.manufactured)}, ${hit ? "on or after" : "before"} ${label}.`, basis: [RT.jjjjOrder, RT.jjjjNew, q], needed: hit ? ["Fuel and engine power, which set the emission standards", "Whether the engine is certified by the manufacturer"] : ["Any later modification or reconstruction"] });
}

function zzzz(e: EquipmentInput, f: FacilityInput): Finding {
  const base = { key: "neshap-zzzz", rule: "NESHAP Subpart ZZZZ", citation: "40 CFR Part 63, Subpart ZZZZ", title: "Stationary reciprocating internal combustion engines (RICE)", href: sub("63", "ZZZZ"), library: lib("neshap", "ZZZZ") };
  const hap = hapStatus(f);
  const ci = e.type === "ci-engine";
  const needed = ["Major or area source of HAP", "Site rating (brake hp)", "Date construction or reconstruction commenced", "Emergency, limited use, or non-emergency"];
  if (hap === "unknown") return finding({ ...base, status: "potentially-applicable", why: "The subpart covers stationary RICE at both major and area sources; HAP status decides which provisions apply.", basis: [RT.zzzzApplies], needed });
  if (!isDate(e.date) || e.dateKind === "modification") return finding({ ...base, status: "potentially-applicable", why: "The subpart covers stationary RICE at major and area sources. Whether the engine is new or existing depends on the construction or reconstruction date.", basis: [RT.zzzzApplies], needed });
  const big = has(e.hp) && e.hp > 500;
  if (hap === "major" && !has(e.hp)) return finding({ ...base, status: "potentially-applicable", why: "At a major source the new or existing cutoff depends on whether the site rating is above 500 hp.", basis: [RT.zzzzApplies, RT.zzzzExistBig, RT.zzzzExistSmall], needed });
  const cut = hap === "major" && big ? "2002-12-19" : "2006-06-12";
  const existingQ = hap === "area" ? RT.zzzzExistArea : big ? RT.zzzzExistBig : RT.zzzzExistSmall;
  const existing = e.date < cut;
  const age = `${existing ? "existing" : e.dateKind === "reconstruction" ? "reconstructed" : "new"} (${e.dateKind === "reconstruction" ? "reconstructed" : "construction commenced"} ${human(e.date)}, ${existing ? "before" : "on or after"} ${human(cut)})`;
  const basis: RuleQuote[] = [RT.zzzzApplies, existingQ];
  let why = `Potentially subject as ${age} at ${hap === "major" ? "a major" : "an area"} source.`;
  if (!existing) {
    const via = hap === "area" ? RT.zzzzViaArea
      : !big && ci ? RT.zzzzViaCI
      : !big && e.emergency ? RT.zzzzViaEmerg
      : !big && e.burn === "2SLB" ? RT.zzzzVia2SLB
      : !big && e.burn === "4SRB" ? RT.zzzzVia4SRB
      : e.burn === "4SLB" && has(e.hp) && e.hp < 250 ? RT.zzzzVia4SLB : null;
    if (via) { basis.push(RT.zzzzViaNsps, via); why += ` It may meet this subpart by meeting ${ci ? "NSPS IIII" : "NSPS JJJJ"} (63.6590(c)).`; }
    else if (hap === "major" && big && e.emergency) { basis.push(RT.zzzzLimited); why += " A new emergency engine above 500 hp at a major source has limited requirements (63.6590(b)(1))."; }
  } else if (hap === "major" && big) {
    const none = e.emergency ? RT.zzzzNoneEmerg : e.burn === "2SLB" ? RT.zzzzNone2SLB : e.burn === "4SLB" ? RT.zzzzNone4SLB : null;
    if (none) { basis.push(RT.zzzzNone, none); why += " This type is listed in 63.6590(b)(3) as not having to meet the subpart's requirements."; }
  } else if (hap === "area" && e.emergency) {
    basis.push(RT.zzzzAreaEmerg); why += " Some existing residential, commercial, and institutional emergency engines at area sources are not subject (63.6585(f)).";
  }
  return finding({ ...base, status: "potentially-applicable", why, basis, needed: ["Emergency engine operating limits in 63.6640(f), if claimed", "Engine subcategory (63.6675 definitions)", ...(hap === "area" && e.emergency ? ["Whether the engine is residential, commercial, or institutional"] : [])] });
}

// ---------- boilers and heaters ----------

function steamUnit(e: EquipmentInput, which: "db" | "dc"): Finding {
  const db = which === "db";
  const base = { key: `nsps-${which}`, rule: db ? "NSPS Subpart Db" : "NSPS Subpart Dc", citation: `40 CFR Part 60, Subpart ${db ? "Db" : "Dc"}`, title: db ? "Industrial-commercial-institutional steam generating units over 100 MMBtu/hr" : "Small industrial-commercial-institutional steam generating units (10 to 100 MMBtu/hr)", href: sub("60", db ? "Db" : "Dc"), library: lib("nsps", db ? "Db" : "Dc") };
  const q = db ? RT.db : RT.dc;
  const cutDate = db ? "1984-06-19" : "1989-06-09";
  const needed = ["Maximum design heat input capacity", "Date construction, modification, or reconstruction commenced", `Whether the unit meets the definition of steam generating unit (40 CFR ${db ? "60.41b" : "60.41c"})`];
  if (e.temporary && e.type === "boiler") return finding({ ...base, status: "likely-not-applicable", why: "You marked the boiler as temporary.", basis: [q, db ? RT.dbTemp : RT.dcTemp], needed: [`The definition of temporary boiler in 40 CFR ${db ? "60.41b" : "60.41c"}`] });
  if (!has(e.mmbtu)) return finding({ ...base, status: "more-info-needed", why: "Enter the heat input capacity.", basis: [q], needed });
  const inSize = db ? e.mmbtu > 100 : e.mmbtu >= 10 && e.mmbtu <= 100;
  if (!inSize) return finding({ ...base, status: "likely-not-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr is ${db ? "not greater than 100" : "outside 10 to 100"} MMBtu/hr.`, basis: [q], needed: ["Confirm the rated heat input"] });
  if (!isDate(e.date)) return finding({ ...base, status: "more-info-needed", why: `${fmt(e.mmbtu)} MMBtu/hr is in the size range. The commence date decides the rest.`, basis: [q], needed });
  const hit = e.date > cutDate;
  const heaterNote = e.type === "process-heater" ? " Process heaters are covered only if they meet the subpart's definition of steam generating unit." : "";
  return finding({ ...base, status: !hit ? "likely-not-applicable" : e.type === "process-heater" ? "more-info-needed" : "potentially-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr; ${e.dateKind} commenced ${human(e.date)}, ${hit ? "after" : "on or before"} ${human(cutDate)}.${hit ? heaterNote : ""}`, basis: [q], needed });
}

function boilerMact(e: EquipmentInput, f: FacilityInput): Finding[] {
  const hap = hapStatus(f);
  const out: Finding[] = [];
  const d5 = { key: "neshap-ddddd", rule: "NESHAP Subpart DDDDD", citation: "40 CFR Part 63, Subpart DDDDD", title: "Boilers and process heaters at major sources (Boiler MACT)", href: sub("63", "DDDDD"), library: lib("neshap", "DDDDD") };
  const age = isDate(e.date) && e.dateKind === "construction" ? ` New if construction commenced after June 4, 2010 (${e.date > "2010-06-04" ? "this unit: new" : "this unit: existing"}).` : "";
  out.push(hap === "major"
    ? finding({ ...d5, status: "potentially-applicable", why: `Boiler or process heater at a major source of HAP.${age}`, basis: [RT.ddddd, RT.dddddNew], needed: ["Subcategory (fuel and design) under 63.7575", "Exclusions listed in 63.7491"] })
    : finding({ ...d5, status: hap === "area" ? "likely-not-applicable" : "more-info-needed", why: hap === "area" ? "The subpart covers units at major sources of HAP; you entered an area source." : "Applies only at major sources of HAP. Select HAP status.", basis: [RT.ddddd], needed: ["HAP status of the facility"] }));
  const j6 = { key: "neshap-jjjjjj", rule: "NESHAP Subpart JJJJJJ", citation: "40 CFR Part 63, Subpart JJJJJJ", title: "Boilers at area sources", href: sub("63", "JJJJJJ"), library: lib("neshap", "JJJJJJ") };
  if (e.type === "process-heater") out.push(finding({ ...j6, status: "likely-not-applicable", why: "The subpart covers boilers; process heaters are not named in 63.11193.", basis: [RT.jjjjjj], needed: ["Whether the unit meets the definition of boiler in 63.11237"] }));
  else if (hap === "major") out.push(finding({ ...j6, status: "likely-not-applicable", why: "The subpart covers boilers at area sources; you entered a major source.", basis: [RT.jjjjjj] }));
  else if (hap === "unknown") out.push(finding({ ...j6, status: "more-info-needed", why: "Applies to boilers at area sources of HAP. Select HAP status.", basis: [RT.jjjjjj], needed: ["HAP status of the facility"] }));
  else if (e.temporary) out.push(finding({ ...j6, status: "likely-not-applicable", why: "Temporary boilers as defined in the subpart are not subject.", basis: [RT.jjjjjj, RT.jjjjjjTemp], needed: ["The definition of temporary boiler in 63.11237"] }));
  else if (e.fuel === "gas") out.push(finding({ ...j6, status: "likely-not-applicable", why: "Gas-fired boilers as defined in the subpart are not subject.", basis: [RT.jjjjjj, RT.jjjjjjGas], needed: ["Whether the boiler meets the definition of gas-fired boiler in 63.11237, including any limits on burning liquid fuel"] }));
  else out.push(finding({ ...j6, status: "potentially-applicable", why: `Boiler at an area source${e.fuel ? ` burning ${e.fuel === "liquid" ? "liquid fuel" : e.fuel === "solid" ? "solid fuel" : "other fuel"}` : ""}.${isDate(e.date) && e.dateKind === "construction" ? ` ${e.date > "2010-06-04" ? "New" : "Existing"} (construction commenced ${e.date > "2010-06-04" ? "after" : "on or before"} June 4, 2010).` : ""}`, basis: [RT.jjjjjj, RT.jjjjjjNew], needed: ["Subcategory under 63.11200", "Other exclusions in 63.11195"] }));
  return out;
}

// ---------- turbines ----------

function turbine(e: EquipmentInput, f: FacilityInput): Finding[] {
  const out: Finding[] = [];
  const gg = { key: "nsps-gg", rule: "NSPS Subpart GG", citation: "40 CFR Part 60, Subpart GG", title: "Stationary gas turbines", href: sub("60", "GG"), library: lib("nsps", "GG") };
  const k4 = { key: "nsps-kkkk", rule: "NSPS Subpart KKKK", citation: "40 CFR Part 60, Subpart KKKK", title: "Stationary combustion turbines (after February 18, 2005)", href: sub("60", "KKKK"), library: lib("nsps", "KKKK") };
  const k4a = { key: "nsps-kkkka", rule: "NSPS Subpart KKKKa", citation: "40 CFR Part 60, Subpart KKKKa", title: "Stationary combustion turbines (after December 13, 2024)", href: sub("60", "KKKKa") };
  const needed = ["Heat input at peak load (GG: lower heating value; KKKK: higher heating value) or base load rating (KKKKa)", "Date construction, modification, or reconstruction commenced"];
  if (!has(e.mmbtu) || !isDate(e.date)) {
    const basis = [RT.gg, RT.kkkk, RT.kkkka];
    out.push(finding({ ...k4, status: "more-info-needed", why: "Enter heat input and the commence date to place the turbine in GG, KKKK, or KKKKa.", basis, needed }));
  } else if (e.mmbtu < 10) {
    for (const b of [gg, k4, k4a]) out.push(finding({ ...b, status: "likely-not-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr is below 10 MMBtu/hr.`, basis: [b === gg ? RT.gg : b === k4 ? RT.kkkk : RT.kkkka], needed: ["Confirm the heating value basis the subpart uses"] }));
  } else if (e.date > "2024-12-13") {
    out.push(finding({ ...k4a, status: "potentially-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr; ${e.dateKind} commenced ${human(e.date)}, after December 13, 2024. A turbine subject to KKKKa is not subject to GG or KKKK.`, basis: [RT.kkkka, RT.kkkkaNot], needed: ["Base load rating as defined in 60.4420a", "Exemptions in 60.4310a"] }));
  } else if (e.date > "2005-02-18") {
    out.push(finding({ ...k4, status: "potentially-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr; ${e.dateKind} commenced ${human(e.date)}, after February 18, 2005 and on or before December 13, 2024. Turbines subject to KKKK are not subject to GG.`, basis: [RT.kkkk, RT.kkkkNot, RT.ggNot], needed: ["Heat input on a higher heating value basis", "Whether a later modification or reconstruction moves the turbine to KKKKa"] }));
  } else if (e.date > "1977-10-03") {
    out.push(finding({ ...gg, status: "potentially-applicable", why: `${fmt(e.mmbtu)} MMBtu/hr; ${e.dateKind} commenced ${human(e.date)}, after October 3, 1977 and on or before February 18, 2005.`, basis: [RT.gg, RT.ggDate], needed: ["Heat input on a lower heating value basis", "Whether a later modification or reconstruction moves the turbine to KKKK or KKKKa"] }));
  } else {
    out.push(finding({ ...gg, status: "likely-not-applicable", why: `${e.dateKind === "construction" ? "Construction" : e.dateKind === "modification" ? "Modification" : "Reconstruction"} commenced ${human(e.date)}, on or before October 3, 1977.`, basis: [RT.ggDate], needed: ["Any later modification or reconstruction"] }));
  }
  const y = { key: "neshap-yyyy", rule: "NESHAP Subpart YYYY", citation: "40 CFR Part 63, Subpart YYYY", title: "Stationary combustion turbines at major sources", href: sub("63", "YYYY"), library: lib("neshap", "YYYY") };
  const hap = hapStatus(f);
  if (hap !== "major") out.push(finding({ ...y, status: hap === "area" ? "likely-not-applicable" : "more-info-needed", why: hap === "area" ? "The subpart covers turbines at major sources of HAP; you entered an area source." : "Applies only at major sources of HAP. Select HAP status.", basis: [RT.yyyy] }));
  else if (has(e.mw) && e.mw < 1) out.push(finding({ ...y, status: "likely-not-applicable", why: `Rated peak power output ${fmt(e.mw)} MW is less than 1.0 MW.`, basis: [RT.yyyy, RT.yyyySmall], needed: ["Rating at ISO standard day conditions"] }));
  else if (isDate(e.date) && e.dateKind === "construction" && e.date <= "2003-01-14") out.push(finding({ ...y, status: "likely-not-applicable", why: `Existing turbine (construction commenced ${human(e.date)}, on or before January 14, 2003). Existing turbines do not have to meet the subpart's requirements.`, basis: [RT.yyyy, RT.yyyyExisting], needed: ["Any reconstruction after January 14, 2003"] }));
  else out.push(finding({ ...y, status: "potentially-applicable", why: `Turbine at a major source${isDate(e.date) && e.date > "2003-01-14" ? `; construction or reconstruction after January 14, 2003` : ""}.${e.emergency ? " New emergency turbines have only the initial notification requirement (63.6090(b)(1))." : ""}`, basis: [RT.yyyy, RT.yyyyNew, ...(e.emergency ? [RT.yyyyEmerg] : [])], needed: ["Subcategory (lean premix, diffusion flame, emergency, limited use)", "Rated peak power output"] }));
  return out;
}

// ---------- storage tanks ----------

function tanks(e: EquipmentInput, f: FacilityInput): Finding[] {
  const out: Finding[] = [];
  const kbB = { key: "nsps-kb", rule: "NSPS Subpart Kb", citation: "40 CFR Part 60, Subpart Kb", title: "Volatile organic liquid storage vessels (July 23, 1984 to October 4, 2023)", href: sub("60", "Kb"), library: lib("nsps", "Kb") };
  const kcB = { key: "nsps-kc", rule: "NSPS Subpart Kc", citation: "40 CFR Part 60, Subpart Kc", title: "Volatile organic liquid storage vessels (after October 4, 2023)", href: sub("60", "Kc"), library: lib("nsps", "Kc") };
  const needed = ["Tank capacity", "Maximum true vapor pressure of the stored liquid", "Date construction, reconstruction, or modification commenced", "Whether petroleum or condensate is stored before custody transfer"];
  if (e.liquid === "not-vol") {
    out.push(finding({ ...kbB, status: "likely-not-applicable", why: "You indicated the tank does not store a volatile organic liquid.", basis: [RT.kb], needed: ["The definition of volatile organic liquid in 60.111b"] }));
    out.push(finding({ ...kcB, status: "likely-not-applicable", why: "You indicated the tank does not store a volatile organic liquid.", basis: [RT.kc], needed: ["The definition of volatile organic liquid in 60.111c"] }));
  } else if (!has(e.gallons) || !isDate(e.date)) {
    out.push(finding({ ...kbB, status: "more-info-needed", why: "Enter capacity and the commence date.", basis: [RT.kb, RT.kbVp], needed }));
    out.push(finding({ ...kcB, status: "more-info-needed", why: "Enter capacity and the commence date.", basis: [RT.kc], needed }));
  } else {
    const m3 = e.gallons / GAL_PER_M3;
    const conv = `${fmt(e.gallons)} gal = ${fmt(Math.round(m3 * 10) / 10)} m³`;
    const custody = e.beforeCustody && e.liquid === "crude-condensate";
    // Kb
    if (e.date <= "1984-07-23" || e.date > "2023-10-04") out.push(finding({ ...kbB, status: "likely-not-applicable", why: `Commenced ${human(e.date)}, outside the Kb window (after July 23, 1984 and on or before October 4, 2023).`, basis: [RT.kb] }));
    else if (m3 < 75) out.push(finding({ ...kbB, status: "likely-not-applicable", why: `${conv}, below 75 m³.`, basis: [RT.kb] }));
    else if (custody && m3 <= 1589.874) out.push(finding({ ...kbB, status: "likely-not-applicable", why: `${conv}, at or below 1,589.874 m³, storing petroleum or condensate before custody transfer.`, basis: [RT.kb, RT.kbCustody], needed: ["Where custody transfer occurs (definition in 60.111b)"] }));
    else if (e.tankSite === "bulk-gasoline-plant" || e.tankSite === "service-station") out.push(finding({ ...kbB, status: "likely-not-applicable", why: "Vessels at bulk gasoline plants and gasoline service stations are excluded.", basis: [RT.kb, e.tankSite === "bulk-gasoline-plant" ? RT.kbBulk : RT.kbStation] }));
    else if (!has(e.tvp)) out.push(finding({ ...kbB, status: "more-info-needed", why: `${conv} in the Kb window. The vapor pressure exemption in 60.110b(b) depends on the maximum true vapor pressure.`, basis: [RT.kb, RT.kbVp], needed }));
    else {
      const kpa = e.tvp * KPA_PER_PSI;
      const limit = m3 >= 151 ? 3.5 : 15.0;
      const exempt = kpa < limit;
      out.push(finding({ ...kbB, status: exempt ? "likely-not-applicable" : "potentially-applicable", why: `${conv}; maximum true vapor pressure ${fmt(e.tvp)} psia = ${fmt(Math.round(kpa * 100) / 100)} kPa, ${exempt ? "below" : "at or above"} ${limit} kPa for this size.`, basis: [RT.kb, RT.kbVp], needed: exempt ? ["Vapor pressure at the highest calendar-month average storage temperature"] : ["Control requirements in 60.112b depend on capacity and vapor pressure"] }));
    }
    // Kc
    if (e.date <= "2023-10-04") out.push(finding({ ...kcB, status: "likely-not-applicable", why: `Commenced ${human(e.date)}, on or before October 4, 2023.`, basis: [RT.kc], needed: ["A modification after October 4, 2023 can bring an existing vessel under Kc (60.110c(d))"] }));
    else if (e.gallons < 20000) out.push(finding({ ...kcB, status: "likely-not-applicable", why: `${fmt(e.gallons)} gal is below 20,000 gal.`, basis: [RT.kc] }));
    else if (custody && e.gallons <= 420000) out.push(finding({ ...kcB, status: "likely-not-applicable", why: `${fmt(e.gallons)} gal, at or below 420,000 gal, storing petroleum or condensate before custody transfer.`, basis: [RT.kc, RT.kcCustody] }));
    else if (e.tankSite === "bulk-gasoline-plant" || e.tankSite === "service-station") out.push(finding({ ...kcB, status: "likely-not-applicable", why: "Vessels at bulk gasoline plants and gasoline service stations are excluded.", basis: [RT.kc, e.tankSite === "bulk-gasoline-plant" ? RT.kcBulk : RT.kcStation] }));
    else if (!has(e.tvp)) out.push(finding({ ...kcB, status: "more-info-needed", why: `${fmt(e.gallons)} gal after October 4, 2023. Requirements depend on the maximum true vapor pressure.`, basis: [RT.kc, RT.kcLowVp, RT.kcBig, RT.kcSmall], needed }));
    else if (e.tvp < 0.25) out.push(finding({ ...kcB, status: "likely-not-applicable", why: `Maximum true vapor pressure ${fmt(e.tvp)} psia is below 0.25 psia.`, basis: [RT.kc, RT.kcLowVp], needed: ["Confirm the vessel only ever stores liquids below 0.25 psia"] }));
    else {
      const controlled = (e.gallons >= 40000 && e.tvp >= 0.5) || (e.gallons < 40000 && e.tvp >= 1.5);
      out.push(finding({ ...kcB, status: "potentially-applicable", why: `${fmt(e.gallons)} gal at ${fmt(e.tvp)} psia: ${controlled ? `meets the ${e.gallons >= 40000 ? "40,000 gal and 0.5 psia" : "20,000 gal and 1.5 psia"} criteria for the standards in 60.112c` : "below the control criteria, so the recordkeeping in 60.115c(b) and 60.113c(d) apply (60.110c(f))"}.`, basis: [RT.kc, controlled ? (e.gallons >= 40000 ? RT.kcBig : RT.kcSmall) : RT.kcOther], needed: ["Vapor pressure of every liquid the vessel stores"] }));
    }
  }
  if (f.oilGas) out.push(...quadO({ ...e, type: "tank" }));
  return out;
}

// ---------- crude oil and natural gas ----------

export type QuadOSubpart = "KKK" | "LLL" | "OOOO" | "OOOOa" | "OOOOb" | "OOOOc";
export const quadOMeta: Record<QuadOSubpart, { title: string; window: RuleQuote; href: string; library?: string }> = {
  KKK: { title: "Equipment leaks at onshore gas plants (January 20, 1984 to August 23, 2011)", window: RT.kkkWindow, href: sub("60", "KKK"), library: lib("nsps", "KKK") },
  LLL: { title: "SO2 from onshore gas processing (January 20, 1984 to August 23, 2011)", window: RT.lllWindow, href: sub("60", "LLL"), library: lib("nsps", "LLL") },
  OOOO: { title: "Crude oil and natural gas (August 23, 2011 to September 18, 2015)", window: RT.o4Window, href: sub("60", "OOOO"), library: lib("nsps", "OOOO") },
  OOOOa: { title: "Crude oil and natural gas (September 18, 2015 to December 6, 2022)", window: RT.o4aWindow, href: sub("60", "OOOOa"), library: lib("nsps", "OOOOa") },
  OOOOb: { title: "Crude oil and natural gas (after December 6, 2022)", window: RT.o4bWindow, href: sub("60", "OOOOb"), library: lib("nsps", "OOOOb") },
  OOOOc: { title: "Emission guidelines for existing crude oil and natural gas facilities (on or before December 6, 2022), through state or federal plans", window: RT.o4cWindow, href: sub("60", "OOOOc"), library: lib("nsps", "OOOOc") },
};

/** Which date windows a commence date falls in. OOOOc covers everything on or before December 6, 2022. */
export function quadOWindows(date: string): QuadOSubpart[] {
  const out: QuadOSubpart[] = [];
  if (date > "1984-01-20" && date <= "2011-08-23") out.push("KKK", "LLL");
  if (date > "2011-08-23" && date <= "2015-09-18") out.push("OOOO");
  if (date > "2015-09-18" && date <= "2022-12-06") out.push("OOOOa");
  if (date > "2022-12-06") out.push("OOOOb");
  else out.push("OOOOc");
  return out;
}

interface Listing { quote: RuleQuote; ok: boolean | null; note: string }

/** Whether the equipment type is listed as an affected (or designated) facility in a subpart, and on what condition. */
export function quadOListing(e: EquipmentInput, s: QuadOSubpart): Listing | null {
  const atWell = e.site === "well-site";
  const plant = e.site === "gas-plant";
  const siteUnknown = !e.site || e.site === "other";
  switch (e.type) {
    case "well":
      return s === "OOOO" ? { quote: RT.o4Well, ok: true, note: "Gas wells" } : s === "OOOOa" ? { quote: RT.o4aWell, ok: true, note: "Wells completed after hydraulic fracturing or refracturing" } : s === "OOOOb" ? { quote: RT.o4bWell, ok: true, note: "Wells drilled to produce oil or gas" } : s === "OOOOc" ? { quote: RT.o4cWell, ok: true, note: "Wells drilled to produce oil or gas" } : null;
    case "centrifugal-compressor": {
      if (s === "KKK") return { quote: RT.kkkComp, ok: plant ? true : siteUnknown ? null : false, note: "Compressors in VOC or wet gas service at gas plants" };
      const q = { OOOO: RT.o4Cent, OOOOa: RT.o4aCent, OOOOb: RT.o4bCent, OOOOc: RT.o4cCent }[s as "OOOO"];
      if (!q) return null;
      const seals = s === "OOOO" || s === "OOOOa";
      const ok = atWell ? false : siteUnknown ? null : seals ? (e.wetSeals === undefined ? null : e.wetSeals) : true;
      return { quote: q, ok, note: `${seals ? "Wet seal compressors; " : ""}not at a well site` };
    }
    case "reciprocating-compressor": {
      if (s === "KKK") return { quote: RT.kkkComp, ok: plant ? true : siteUnknown ? null : false, note: "Compressors in VOC or wet gas service at gas plants" };
      const q = { OOOO: RT.o4Recip, OOOOa: RT.o4aRecip, OOOOb: RT.o4bRecip, OOOOc: RT.o4cRecip }[s as "OOOO"];
      if (!q) return null;
      return { quote: q, ok: atWell ? false : siteUnknown ? null : true, note: "Not at a well site" };
    }
    case "pneumatic-controller": {
      if (s === "OOOOb" || s === "OOOOc") return { quote: s === "OOOOb" ? RT.o4bPneu : RT.o4cPneu, ok: e.gasDriven === false ? false : e.gasDriven ? true : null, note: "The collection of natural gas-driven process controllers at the site" };
      if (s !== "OOOO" && s !== "OOOOa") return null;
      if (plant) return { quote: s === "OOOO" ? RT.o4PneuPlant : RT.o4aPneuPlant, ok: e.gasDriven === false || e.continuousBleed === false ? false : e.gasDriven && e.continuousBleed ? true : null, note: "Each continuous bleed natural gas-driven controller at a gas plant" };
      const ok = e.gasDriven === false || e.continuousBleed === false ? false : has(e.bleedScfh) && e.gasDriven && e.continuousBleed ? e.bleedScfh > 6 : null;
      return { quote: s === "OOOO" ? RT.o4Pneu : RT.o4aPneu, ok, note: "Each continuous bleed natural gas-driven controller above 6 scfh" };
    }
    case "pneumatic-pump":
      if (s === "OOOOa") return plant ? { quote: RT.o4aPumpPlant, ok: e.gasDriven === false ? false : e.gasDriven ? true : null, note: "Each natural gas-driven diaphragm pump at a gas plant" } : atWell ? { quote: RT.o4aPumpWell, ok: e.gasDriven === false ? false : e.gasDriven ? true : null, note: "Each natural gas-driven diaphragm pump at a well site" } : { quote: RT.o4aPumpWell, ok: siteUnknown ? null : false, note: "OOOOa lists pumps at gas plants and well sites only" };
      if (s === "OOOOb") return { quote: RT.o4bPump, ok: e.gasDriven === false ? false : e.gasDriven ? true : null, note: "The collection of natural gas-driven pumps at the site" };
      if (s === "OOOOc") return { quote: RT.o4cPump, ok: e.gasDriven === false ? false : e.gasDriven ? true : null, note: "The collection of natural gas-driven diaphragm and piston pumps at the site" };
      return null;
    case "fugitives":
      if (s === "OOOOa") return atWell ? { quote: RT.o4aFugWell, ok: true, note: "Fugitive components at a well site" } : e.site === "compressor-station" ? { quote: RT.o4aFugComp, ok: true, note: "Fugitive components at a compressor station" } : { quote: RT.o4aFugWell, ok: siteUnknown ? null : false, note: "OOOOa lists well sites and compressor stations" };
      if (s === "OOOOb" || s === "OOOOc") {
        const ok = atWell || e.site === "centralized-production" || e.site === "compressor-station" ? true : siteUnknown ? null : false;
        return { quote: s === "OOOOb" ? RT.o4bFug : RT.o4cFug, ok, note: "Well sites, centralized production facilities, and compressor stations" };
      }
      return null;
    case "gas-plant-equipment": {
      const q = { KKK: RT.kkkEquip, OOOO: RT.o4Equip, OOOOa: RT.o4aEquip, OOOOb: RT.o4bEquip, OOOOc: RT.o4cEquip }[s as "KKK"];
      return q ? { quote: q, ok: plant ? true : siteUnknown ? null : false, note: "Equipment in a process unit at an onshore gas plant" } : null;
    }
    case "sweetening-unit": {
      const q = { LLL: RT.lllUnits, OOOO: RT.o4Sweet, OOOOa: RT.o4aSweet, OOOOb: RT.o4bSweet }[s as "LLL"];
      return q ? { quote: q, ok: plant ? true : siteUnknown ? null : false, note: "Sweetening units at onshore gas plants" } : null;
    }
    case "tank": {
      const v = e.vocTpy, m = e.ch4Tpy;
      if (s === "OOOO") return { quote: RT.o4Tank, ok: has(v) ? v >= 6 : null, note: "Single storage vessel, potential VOC 6 tpy or more" };
      if (s === "OOOOa") return { quote: e.date > "2020-11-16" ? RT.o4aTank : RT.o4aTank1, ok: has(v) ? v >= 6 : null, note: "Single storage vessel, potential VOC 6 tpy or more" };
      if (s === "OOOOb") return { quote: RT.o4bTank, ok: (has(v) && v >= 6) || (has(m) && m >= 20) ? true : has(v) && has(m) ? false : null, note: "Tank battery, potential VOC 6 tpy or methane 20 tpy or more" };
      if (s === "OOOOc") return { quote: RT.o4cTank, ok: has(m) ? m >= 20 : null, note: "Tank battery, potential methane 20 tpy or more" };
      return null;
    }
    default:
      return null;
  }
}

export function quadO(e: EquipmentInput): Finding[] {
  if (!isDate(e.date)) {
    return [finding({ key: "quad-o", rule: "NSPS OOOO family", citation: "40 CFR Part 60, Subparts OOOO, OOOOa, OOOOb, OOOOc", title: "Crude oil and natural gas facilities", status: "more-info-needed", why: "Enter the date construction, modification, or reconstruction commenced to place this in a subpart window.", basis: [RT.o4Window, RT.o4aWindow, RT.o4bWindow, RT.o4cWindow], needed: ["Commence date", "Site type"], href: sub("60", "OOOOb") })];
  }
  const out: Finding[] = [];
  for (const s of quadOWindows(e.date)) {
    const listing = quadOListing(e, s);
    if (!listing) continue;
    const meta = quadOMeta[s];
    const prefix = s === "OOOOc" ? "Emission guidelines" : "NSPS";
    const status: ScreenStatus = listing.ok === true ? "potentially-applicable" : listing.ok === false ? "likely-not-applicable" : "more-info-needed";
    const tankEntries = e.type === "tank" && (has(e.vocTpy) || has(e.ch4Tpy)) ? ` You entered ${[has(e.vocTpy) ? `${fmt(e.vocTpy)} tpy VOC` : "", has(e.ch4Tpy) ? `${fmt(e.ch4Tpy)} tpy methane` : ""].filter(Boolean).join(" and ")}.` : "";
    const why = `${e.dateKind === "construction" ? "Construction" : e.dateKind === "modification" ? "Modification" : "Reconstruction"} commenced ${human(e.date)}, in the ${s} window. Listed: ${listing.note}.${tankEntries}${listing.ok === null ? " Enter the details marked below to compare." : listing.ok === false ? " Your entries do not match this listing." : ""}${s === "OOOOc" ? " OOOOc applies through an approved state, Tribal, or federal plan." : ""}`;
    out.push(finding({
      key: `quad-o-${s.toLowerCase()}`, rule: `${prefix} Subpart ${s}`, citation: `40 CFR Part 60, Subpart ${s}`, title: meta.title, status, why,
      basis: [meta.window, listing.quote, ...(s === "OOOOb" && e.type === "tank" ? [RT.o4bTankVoc, RT.o4bTankCh4] : []), ...(s === "OOOOc" ? [RT.o4cPlan] : [])],
      needed: ["Whether the site is in the Crude Oil and Natural Gas source category as defined in the subpart", "The subpart's definitions of modification and reconstruction for this facility type", ...(e.type === "tank" ? ["Potential VOC and methane emissions calculated as the subpart requires"] : [])],
      href: meta.href, library: meta.library,
    }));
  }
  if (!out.length) {
    const ws = quadOWindows(e.date);
    out.push(finding({
      key: "quad-o", rule: "NSPS OOOO family", citation: `40 CFR Part 60, Subpart${ws.length > 1 ? "s" : ""} ${ws.join(", ")}`, title: "Crude oil and natural gas facilities", status: "likely-not-applicable",
      why: `${e.dateKind === "construction" ? "Construction" : e.dateKind === "modification" ? "Modification" : "Reconstruction"} commenced ${human(e.date)}. The subparts for that date (${ws.join(", ")}) do not list this equipment type as an affected or designated facility.`,
      basis: ws.map((s) => quadOMeta[s].window),
      needed: ["Whether a later modification or reconstruction moves it into a newer subpart", "Other subparts that may cover this equipment"],
      href: quadOMeta[ws[0]].href, library: quadOMeta[ws[0]].library,
    }));
  }
  return out;
}

// ---------- flares ----------

function flare(): Finding[] {
  return [finding({
    key: "flare-60-18", rule: "40 CFR 60.18", citation: "40 CFR 60.18", title: "General control device requirements for flares",
    status: "more-info-needed",
    why: "No NSPS covers a flare by itself. When a subpart requires or allows a flare to control emissions, that subpart and the general flare requirements it references apply.",
    basis: [RT.flareVe, RT.flarePilot],
    needed: ["Which subparts route vent gas to this flare", "Whether those subparts reference 60.18, 63.11, or their own flare requirements"],
    href: "https://www.ecfr.gov/current/title-40/section-60.18",
  })];
}

/** Screens one piece of equipment. */
export function screenEquipment(e: EquipmentInput, f: FacilityInput): Finding[] {
  switch (e.type) {
    case "ci-engine": return [iiii(e), zzzz(e, f)];
    case "si-engine": return [jjjj(e), zzzz(e, f)];
    case "boiler":
    case "process-heater": return [steamUnit(e, "db"), steamUnit(e, "dc"), ...boilerMact(e, f)];
    case "turbine": return turbine(e, f);
    case "tank": return tanks(e, f);
    case "flare": return flare();
    default: return quadO(e);
  }
}

export const statusRank: Record<ScreenStatus, number> = { "potentially-applicable": 0, "more-info-needed": 1, "likely-not-applicable": 2 };

export interface EquipmentResult { equipment: EquipmentInput; findings: Finding[] }

const byStatus = (a: Finding, b: Finding) => statusRank[a.status] - statusRank[b.status];

/** Facility-wide findings and per-equipment findings, each list ordered potentially applicable first. */
export function screenAll(f: FacilityInput, equipment: EquipmentInput[]) {
  return {
    facility: screenFacility(f).sort(byStatus),
    equipment: equipment.map((e): EquipmentResult => ({ equipment: e, findings: screenEquipment(e, f).sort(byStatus) })),
  };
}

export const statusLabel: Record<ScreenStatus, string> = {
  "potentially-applicable": "Potentially applicable",
  "likely-not-applicable": "Likely not applicable based on entered information",
  "more-info-needed": "Additional review required",
};

export const equipmentLabel = (t: EquipmentType) => equipmentTypes.find((x) => x.value === t)?.label ?? t;

/** CSV of every finding with its reason, the rule text it rests on, and what to confirm. */
export function applicabilityCsv(f: FacilityInput, equipment: EquipmentInput[], today: string): string {
  const { facility, equipment: eq } = screenAll(f, equipment);
  const rows: unknown[][] = [
    ["Screening only. Not an applicability determination. Confirm against the current rule text, your permit, and your state's rules."],
    ["Facility", f.name || "(not named)", "Screened on", today],
    [],
    ["Scope", "Equipment", "Rule", "Citation", "Status", "Why (from your entries)", "Rule text relied on", "To confirm", "Official text"],
  ];
  const quoteCell = (x: Finding) => x.basis.map((b) => `${b.cite}: "${b.text}"`).join("\n");
  for (const x of facility) rows.push(["Facility-wide", "", x.rule, x.citation, statusLabel[x.status], x.why, quoteCell(x), x.needed.join("; "), x.href]);
  for (const r of eq) {
    const name = `${r.equipment.name || "(unnamed)"} (${equipmentLabel(r.equipment.type)})`;
    for (const x of r.findings) rows.push(["Equipment", name, x.rule, x.citation, statusLabel[x.status], x.why, quoteCell(x), x.needed.join("; "), x.href]);
  }
  return csvLines([["AirPermitHub Template: Applicability Screening (not an agency form)"], ...rows]);
}
