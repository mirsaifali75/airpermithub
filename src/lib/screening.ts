import type { ApplicabilityStatus } from "./data/types";
import type { StateProfileSummary } from "./data/state-profiles";
import { csvLines } from "./csv";
import { RT, type RuleQuote } from "./tools/rule-text";

/**
 * Preliminary permit-path screening.
 *
 * This is deliberately conservative: it points users to programs worth
 * reviewing based on location, industry, and equipment. It never concludes
 * that a permit is required. Four outcomes:
 *
 * - "potentially-applicable": worth reviewing for the entered facility.
 * - "likely-not-applicable": the user's own answers fall outside the
 *   program's basic scope (always phrased "based on entered information").
 * - "more-info-needed" (Additional Review Required): depends on facts the
 *   user has but the screen can't evaluate, such as PTE against thresholds.
 * - "insufficient-info": a deciding fact was answered "don't know".
 */

export interface ScreeningInput {
  state: string; // state slug
  county?: string;
  industry: string;
  facilityType: string;
  equipment: string[];
  /** Operations step (optional; adds considerations, never conclusions). */
  project?: "new" | "modification" | "existing";
  existingAuthorization?: "yes" | "no" | "unsure";
  pteKnown?: "yes" | "no";
  controls?: string[];
  schedule?: "continuous" | "limited";
  /** Emissions step: pollutants the user expects at the site. */
  pollutants?: string[];
  /** Applicability step. */
  datesKnown?: "yes" | "no";
  attainment?: "all-attainment" | "some-nonattainment" | "unsure";
  hapStatus?: "major" | "area" | "unsure";
}

export interface ScreeningItem {
  title: string;
  program: string;
  citation?: string;
  status: ApplicabilityStatus;
  why: string;
  nextStep: string;
  href?: string;
  /** The official text: an eCFR subpart, or the agency page the program is described on. */
  sourceUrl?: string;
  /** Verbatim rule text behind the item, each with its own citation and link. */
  quotes?: RuleQuote[];
  /** Rule Library pages for each subpart the item names. */
  library?: { label: string; href: string }[];
  /** Shown above the quotes when they need context (e.g. federal text under a state program). */
  quoteNote?: string;
}

export interface ScreeningResult {
  pathways: ScreeningItem[];
  federalRules: ScreeningItem[];
  dataGaps: string[];
  considerations: { title: string; body: string }[];
}

/** General permitting concepts triggered by the operations answers. */
function considerationsFor(input: ScreeningInput): ScreeningResult["considerations"] {
  const out: ScreeningResult["considerations"] = [];
  if (input.project === "new") {
    out.push({ title: "Authorization before construction", body: "Preconstruction programs generally require authorization before construction begins. Confirm with the agency what activities count as beginning construction under its rules." });
  }
  if (input.project === "modification") {
    out.push({ title: "Modification rules decide the path", body: "For a change at an existing site, each program's own definition of modification (and any netting or aggregation provisions) decides which path applies. Start from the existing authorization and the cited rule text." });
  }
  if (input.project === "existing") {
    out.push({ title: "Review the current authorization", body: "For an existing facility, compare current equipment and operations against the authorization on file, and check renewal and reporting obligations in that permit." });
  }
  if (input.existingAuthorization === "yes") {
    out.push({ title: "Amend or replace?", body: "Check whether the existing authorization can be amended or registered against, or whether a new authorization is needed. Agencies set this in rule and guidance." });
  }
  if (input.existingAuthorization === "unsure") {
    out.push({ title: "Find existing authorizations first", body: "Search the agency's permit database or records for the site before choosing a path; an existing authorization can change the answer." });
  }
  if (input.controls && input.controls.length > 0 && !input.controls.includes("None")) {
    out.push({ title: "Controls and potential to emit", body: "Control devices lower potential to emit only when the reduction is enforceable, typically through a permit condition or rule. Document the control efficiency you claim and how it will be monitored." });
  }
  if (input.pollutants && input.pollutants.length > 0) {
    out.push({ title: "Pollutant by pollutant", body: `Applicability is usually decided separately for each pollutant. Calculate potential to emit for ${input.pollutants.join(", ")} and compare each against the criteria quoted on the state hub and in the rule text.` });
  }
  if (input.schedule === "limited") {
    out.push({ title: "Limited operating hours", body: "Using fewer than full-year operating hours in a potential-to-emit calculation generally requires an enforceable limit on hours or throughput." });
  }
  return out;
}

const OG_INDUSTRIES = new Set(["Oil & Gas", "Midstream"]);

/** eCFR page for a whole subpart. */
export const ecfrSubpart = (part: 60 | 63, subpart: string) => `https://www.ecfr.gov/current/title-40/part-${part}/subpart-${subpart}`;
const lib = (part: 60 | 63, subpart: string) => ({ label: `Subpart ${subpart}`, href: `/regulations/${part === 60 ? "nsps" : "neshap"}/subpart-${subpart.toLowerCase()}` });

/** Equipment → federal programs worth screening. Pointers only. */
function federalRulesFor(input: ScreeningInput): ScreeningItem[] {
  const { equipment, industry } = input;
  const og = OG_INDUSTRIES.has(industry);
  /** Date-driven subparts can't be screened when the user doesn't know the dates. */
  const dateStatus: ApplicabilityStatus = input.datesKnown === "no" ? "insufficient-info" : "more-info-needed";
  /** HAP major/area status decides the Part 63 subparts below. */
  const hapStatus: ApplicabilityStatus = input.hapStatus === "unsure" ? "insufficient-info" : "more-info-needed";
  const items = new Map<string, ScreeningItem>();
  const add = (key: string, item: Omit<ScreeningItem, "status" | "nextStep"> & { status?: ApplicabilityStatus; nextStep?: string }) => {
    if (items.has(key)) return;
    items.set(key, {
      ...item,
      status: item.status ?? "more-info-needed",
      nextStep: item.nextStep ?? "Compare construction/modification dates, capacity, and exemptions against the subpart's applicability section.",
    });
  };

  const has = (e: string) => equipment.includes(e);

  if (og && ["Storage Tanks", "Compressors", "Pneumatic Controllers", "Pneumatic Pumps", "Fugitives", "VRUs"].some(has)) {
    add("oooo", {
      title: "NSPS for crude oil and natural gas facilities",
      program: "NSPS",
      citation: "40 CFR Part 60, Subparts OOOO / OOOOa / OOOOb",
      why: "Selected equipment includes source types these subparts address. Which subpart, if any, depends on when each unit was constructed, modified, or reconstructed.",
      status: dateStatus,
      href: "/regulations/nsps",
      sourceUrl: ecfrSubpart(60, "OOOOb"),
      quotes: [RT.o4Window, RT.o4aWindow, RT.o4bWindow],
      library: [lib(60, "OOOO"), lib(60, "OOOOa"), lib(60, "OOOOb")],
    });
  }
  if (has("Storage Tanks")) {
    add("kb", {
      title: "NSPS for volatile organic liquid storage vessels",
      program: "NSPS",
      citation: "40 CFR Part 60, Subparts Kb and Kc",
      why: "Storage vessels were selected. These subparts have capacity, vapor pressure, date, and exemption criteria that need review.",
      status: dateStatus,
      href: "/regulations/nsps",
      sourceUrl: ecfrSubpart(60, "Kb"),
      quotes: [RT.kb, RT.kc],
      library: [lib(60, "Kb"), lib(60, "Kc")],
    });
  }
  if (["Engines", "Generators", "Compressors"].some(has)) {
    add("rice-nsps", {
      title: "NSPS for stationary internal combustion engines",
      program: "NSPS",
      citation: "40 CFR Part 60, Subparts IIII (CI) and JJJJ (SI)",
      why: "Engines or engine-driven equipment were selected. Applicability depends on engine type, manufacture/order dates, and size.",
      status: dateStatus,
      href: "/regulations/nsps",
      sourceUrl: ecfrSubpart(60, "JJJJ"),
      quotes: [RT.iiiiNew, RT.jjjjNew],
      library: [lib(60, "IIII"), lib(60, "JJJJ")],
    });
    add("zzzz", {
      title: "NESHAP for stationary RICE",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subpart ZZZZ",
      why: "Stationary reciprocating engines were selected. Requirements depend on major/area source status, engine type, and size.",
      status: hapStatus,
      href: "/regulations/neshap",
      sourceUrl: ecfrSubpart(63, "ZZZZ"),
      quotes: [RT.zzzzApplies],
      library: [lib(63, "ZZZZ")],
    });
  }
  if (og && has("Dehydrators")) {
    add("hh", {
      title: "NESHAP for oil and gas production / transmission and storage",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subparts HH and HHH",
      why: "Glycol dehydrators were selected. Applicability depends on facility segment, HAP source status, and throughput criteria in the rule.",
      status: hapStatus,
      href: "/regulations/neshap",
      sourceUrl: ecfrSubpart(63, "HH"),
      quotes: [RT.hh, RT.hhh],
      library: [lib(63, "HH"), lib(63, "HHH")],
    });
  }
  if (["Heaters", "Heater Treaters"].some(has)) {
    add("ddddd", {
      title: "NESHAP for boilers and process heaters at major sources",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subpart DDDDD",
      why: input.hapStatus === "area"
        ? "Heaters were selected, but you indicated the site is an area source of HAP. This subpart is limited to major sources of HAP."
        : "Heaters were selected. This subpart is limited to major sources of HAP; area-source status would change the answer.",
      status: input.hapStatus === "area" ? "likely-not-applicable" : hapStatus,
      nextStep: input.hapStatus === "area"
        ? "Keep the basis for area-source status on file, and recheck if HAP emissions or the site's equipment change."
        : undefined,
      href: "/regulations/neshap",
      sourceUrl: ecfrSubpart(63, "DDDDD"),
      quotes: [RT.ddddd, RT.hapMajor],
      library: [lib(63, "DDDDD")],
    });
  }
  if (has("Flares")) {
    add("flare", {
      title: "General control device requirements for flares",
      program: "NSPS / NESHAP General Provisions",
      citation: "40 CFR 60.18; 40 CFR 63.11",
      why: "Where a flare is used to comply with an NSPS or NESHAP, the general flare provisions may be referenced by the applicable subpart.",
      href: "/regulations/nsps",
      sourceUrl: "https://www.ecfr.gov/current/title-40/section-60.18",
      quotes: [RT.flareVe, RT.flarePilot],
      library: [lib(60, "A")],
    });
  }
  return [...items.values()];
}

const MAJOR_TYPES = new Set(["title-v", "psd", "nnsr"]);

/** The federal thresholds behind each major-source program, quoted from the rule. */
const majorQuotes: Record<string, RuleQuote[]> = {
  "title-v": [RT.tvMajor100, RT.tvHap],
  psd: [RT.psdListed, RT.psd250],
};

const FEDERAL_NOTE = "The 40 CFR text is the federal definition. The state's approved rule sets the version that applies; confirm against it.";

/** The state program's own source page and verbatim quote, when the hub has them. */
function stateQuotes(p: StateProfileSummary["permitTypes"][number], agency: string): RuleQuote[] {
  const own: RuleQuote[] = p.quote && p.quoteUrl ? [{ cite: p.citation ?? agency, text: p.quote, url: p.quoteUrl }] : [];
  return [...own, ...(majorQuotes[p.type] ?? [])];
}

/** Status for a major-source program from the user's PTE and attainment answers. */
function majorStatus(type: string, input: ScreeningInput): { status: ApplicabilityStatus; why?: string; nextStep?: string } {
  if (type === "nnsr" && input.attainment === "all-attainment") {
    return {
      status: "likely-not-applicable",
      why: "You indicated the county is in attainment for every pollutant. Nonattainment NSR covers areas designated nonattainment. Confirm the designations for each pollutant before relying on this.",
      nextStep: "Recheck if the county's designation changes for any pollutant the facility emits.",
    };
  }
  if (input.pteKnown === "no") return { status: "insufficient-info" };
  if ((type === "psd" || type === "nnsr") && input.attainment === "unsure") return { status: "insufficient-info" };
  return { status: "more-info-needed" };
}

function pathwaysFor(input: ScreeningInput, hub: StateProfileSummary | undefined): ScreeningItem[] {
  const out: ScreeningItem[] = [];

  if (hub) {
    for (const p of hub.permitTypes) {
      const isMajor = MAJOR_TYPES.has(p.type);
      const isExemption = p.type === "exemption";
      const major = isMajor ? majorStatus(p.type, input) : null;
      out.push({
        title: p.name,
        program: hub.agency,
        citation: p.citation,
        status: major ? major.status : isExemption ? "more-info-needed" : "potentially-applicable",
        why: major
          ? major.why ?? "Depends on the facility's potential to emit and the area's attainment status. Calculate PTE before drawing conclusions."
          : p.description,
        nextStep: major
          ? major.nextStep ?? "Complete an equipment-level PTE calculation, then compare against the program's applicability criteria."
          : isExemption
            ? "Confirm emissions meet every criterion in the cited rule, and keep the calculations on file."
            : "Review the rule's eligibility conditions for each selected equipment type.",
        href: `/states/${hub.slug}`,
        sourceUrl: p.url,
        quotes: stateQuotes(p, hub.agency),
        ...(majorQuotes[p.type] ? { quoteNote: FEDERAL_NOTE } : {}),
      });
    }
    const og = OG_INDUSTRIES.has(input.industry);
    for (const p of hub.oilAndGasPrograms) {
      out.push({
        title: p.name,
        program: `${hub.agency} · oil & gas`,
        citation: p.citation,
        status: !og ? "likely-not-applicable" : MAJOR_TYPES.has(p.type) ? majorStatus(p.type, input).status : "potentially-applicable",
        why: og ? p.description : `This is an oil and gas program, and you entered ${input.industry}. ${p.description}`,
        nextStep: og
          ? "Check this program's eligibility conditions against the selected equipment and site emissions."
          : "No action unless the site also has oil and gas operations.",
        href: `/states/${hub.slug}?tab=oil-gas`,
        sourceUrl: p.url,
        quotes: stateQuotes(p, hub.agency),
        ...(majorQuotes[p.type] ? { quoteNote: FEDERAL_NOTE } : {}),
      });
    }
    return out;
  }

  return [
    {
      title: "State minor source authorization",
      program: "State or local air agency",
      status: "potentially-applicable",
      why: "Most states require some form of preconstruction authorization for new emission units, even when a facility is not a major source.",
      nextStep: "Identify the state or local agency with jurisdiction and review its minor NSR options.",
      href: "/states",
    },
    {
      title: "Major NSR (PSD or Nonattainment NSR)",
      program: "Federal program, usually state-administered",
      status: majorStatus("psd", input).status,
      why: "Depends on potential to emit and the attainment status of the county for each pollutant.",
      nextStep: "Calculate PTE and confirm the county's attainment designations.",
      href: "/regulations/nsr",
      sourceUrl: "https://www.ecfr.gov/current/title-40/section-52.21",
      quotes: majorQuotes.psd,
    },
    {
      title: "Title V Operating Permit",
      program: "Federal program, usually state-administered",
      status: majorStatus("title-v", input).status,
      why: "Depends on potential to emit and other program criteria.",
      nextStep: "Calculate PTE and compare against the approved program's applicability criteria.",
      href: "/regulations/title-v",
      sourceUrl: "https://www.ecfr.gov/current/title-40/section-70.2",
      quotes: majorQuotes["title-v"],
    },
  ];
}

export function screen(input: ScreeningInput, profiles: StateProfileSummary[]): ScreeningResult {
  const hub = profiles.find((p) => p.slug === input.state);
  const dataGaps = [
    "Potential to emit for each pollutant (use the Emission Calculator).",
    "Construction, modification, or reconstruction dates for each unit.",
    "Attainment status of the county for each criteria pollutant.",
    "Any existing authorizations or enforceable limits at the site.",
  ];
  if (!hub) {
    dataGaps.unshift("State program details for this state are not yet in AirPermitHub.");
  }
  const replaceGap = (prefix: string, text: string | null) => {
    const i = dataGaps.findIndex((g) => g.startsWith(prefix));
    if (i < 0) return;
    if (text) dataGaps[i] = text;
    else dataGaps.splice(i, 1);
  };
  if (input.pteKnown === "yes") {
    replaceGap("Potential to emit", "Compare your potential-to-emit estimates against the applicability criteria quoted on the state hub and in the federal rule text.");
  }
  if (input.datesKnown === "yes") {
    replaceGap("Construction", "Compare each unit's construction, modification, or reconstruction date against the applicability dates in each flagged subpart.");
  }
  if (input.attainment === "all-attainment" || input.attainment === "some-nonattainment") {
    replaceGap("Attainment", "Confirm the county's designation for each pollutant in 40 CFR Part 81, since designations change.");
  }
  if (input.hapStatus === "unsure") {
    dataGaps.push("Whether the site is a major or area source of hazardous air pollutants (HAP).");
  }
  return { pathways: pathwaysFor(input, hub), federalRules: federalRulesFor(input), dataGaps, considerations: considerationsFor(input) };
}

// ---------- next steps, hand-off, and export ----------

/** Emission calculators for the selected equipment, so PTE can be estimated next. */
const calculatorFor: Record<string, { slug: string; name: string }> = {
  Engines: { slug: "engines", name: "Engines" },
  Generators: { slug: "engines", name: "Engines" },
  Heaters: { slug: "heaters", name: "Heaters & combustion" },
  "Heater Treaters": { slug: "heaters", name: "Heaters & combustion" },
  Flares: { slug: "flares", name: "Flares" },
  "Storage Tanks": { slug: "tanks", name: "Storage tanks" },
  Fugitives: { slug: "fugitives", name: "Fugitives" },
  Compressors: { slug: "compressors", name: "Compressors" },
  "Pneumatic Controllers": { slug: "pneumatics", name: "Pneumatic devices" },
  "Pneumatic Pumps": { slug: "pneumatics", name: "Pneumatic devices" },
};

export function calculatorsFor(equipment: string[]) {
  const seen = new Map<string, { href: string; name: string }>();
  for (const e of equipment) {
    const c = calculatorFor[e];
    if (c && !seen.has(c.slug)) seen.set(c.slug, { href: `/calculators/${c.slug}`, name: c.name });
  }
  return [...seen.values()];
}

/**
 * Permit Finder equipment that maps to exactly one Applicability Checker unit
 * type. Engines, generators, and compressors need a choice the Permit Finder
 * doesn't ask (diesel or spark ignition; centrifugal or reciprocating), so the
 * user adds those in the checker.
 */
export const checkerUnitFor: Record<string, string> = {
  "Storage Tanks": "tank",
  Heaters: "process-heater",
  "Heater Treaters": "process-heater",
  Flares: "flare",
  "Pneumatic Controllers": "pneumatic-controller",
  "Pneumatic Pumps": "pneumatic-pump",
  Fugitives: "fugitives",
};
const checkerSite: Record<string, string> = {
  "Well Site": "well-site",
  "Compressor Station": "compressor-station",
  "Gas Plant": "gas-plant",
  "Central Production Facility": "centralized-production",
};

/** Applicability Checker link that offers to bring in this facility and its equipment. */
export function applicabilityHandoff(input: ScreeningInput & { facilityName?: string }) {
  const p = new URLSearchParams({ from: "permit-finder" });
  if (input.facilityName) p.set("name", input.facilityName);
  if (input.state) p.set("state", input.state);
  if (input.hapStatus === "major" || input.hapStatus === "area") p.set("hap", input.hapStatus);
  if (OG_INDUSTRIES.has(input.industry)) p.set("og", "1");
  if (checkerSite[input.facilityType]) p.set("site", checkerSite[input.facilityType]);
  const units = input.equipment.filter((e) => checkerUnitFor[e]);
  if (units.length) p.set("units", units.join("|"));
  const other = input.equipment.filter((e) => ["Engines", "Generators", "Compressors"].includes(e));
  if (other.length) p.set("choose", other.join("|"));
  return `/applicability?${p.toString()}`;
}

const statusText: Record<ApplicabilityStatus, string> = {
  "potentially-applicable": "Potentially applicable",
  "more-info-needed": "Additional review required",
  "insufficient-info": "Insufficient information",
  "likely-not-applicable": "Likely not applicable",
};

/** CSV of the answers and every result, with the rule text and links behind each. */
export function permitFinderCsv(entries: [string, string][], result: ScreeningResult, today: string) {
  const rows: (string | number | undefined)[][] = [
    ["AirPermitHub Template: Permit Path Screening (not an agency form)"],
    ["Screening only. Not a permit determination. Results point to programs worth reviewing; confirm against the cited rule text and the agency."],
    ["Exported", today],
    [],
    ["Your answers"],
    ...entries,
    [],
    ["Group", "Program", "Status", "Citation", "Why it is listed", "Further review", "Official source", "Rule text (verbatim)"],
    ...([["Authorization options", result.pathways], ["Federal programs", result.federalRules]] as const).flatMap(([group, items]) =>
      items.map((it) => [
        group, it.title, statusText[it.status], it.citation, it.why, it.nextStep, it.sourceUrl,
        (it.quotes ?? []).map((q) => `${q.cite}: "${q.text}"`).join(" | "),
      ])),
    [],
    ["Information needed before conclusions"],
    ...result.dataGaps.map((g) => [g]),
  ];
  return csvLines(rows);
}
