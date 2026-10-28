import type { ApplicabilityStatus } from "./data/types";
import type { StateProfileSummary } from "./data/state-profiles";

/**
 * Preliminary permit-path screening.
 *
 * This is deliberately conservative: it points users to programs worth
 * reviewing based on location, industry, and equipment. It never concludes
 * that a permit is required. Anything that depends on potential to emit,
 * construction dates, or attainment status is "more-info-needed".
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
}

export interface ScreeningItem {
  title: string;
  program: string;
  citation?: string;
  status: ApplicabilityStatus;
  why: string;
  nextStep: string;
  href?: string;
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
  if (input.schedule === "limited") {
    out.push({ title: "Limited operating hours", body: "Using fewer than full-year operating hours in a potential-to-emit calculation generally requires an enforceable limit on hours or throughput." });
  }
  return out;
}

const OG_INDUSTRIES = new Set(["Oil & Gas", "Midstream"]);

/** Equipment → federal programs worth screening. Pointers only. */
function federalRulesFor(equipment: string[], industry: string): ScreeningItem[] {
  const og = OG_INDUSTRIES.has(industry);
  const items = new Map<string, ScreeningItem>();
  const add = (key: string, item: Omit<ScreeningItem, "status" | "nextStep"> & { nextStep?: string }) => {
    if (items.has(key)) return;
    items.set(key, {
      status: "more-info-needed",
      nextStep: "Compare construction/modification dates, capacity, and exemptions against the subpart's applicability section.",
      ...item,
    });
  };

  const has = (e: string) => equipment.includes(e);

  if (og && ["Storage Tanks", "Compressors", "Pneumatic Controllers", "Pneumatic Pumps", "Fugitives", "VRUs"].some(has)) {
    add("oooo", {
      title: "NSPS for crude oil and natural gas facilities",
      program: "NSPS",
      citation: "40 CFR Part 60, Subparts OOOO / OOOOa / OOOOb",
      why: "Selected equipment includes source types these subparts address. Which subpart, if any, depends on when each unit was constructed, modified, or reconstructed.",
      href: "/regulations/nsps",
    });
  }
  if (has("Storage Tanks")) {
    add("kb", {
      title: "NSPS for volatile organic liquid storage vessels",
      program: "NSPS",
      citation: "40 CFR Part 60, Subpart Kb",
      why: "Storage vessels were selected. This subpart has capacity, vapor pressure, and exemption criteria that need review.",
      href: "/regulations/nsps",
    });
  }
  if (["Engines", "Generators", "Compressors"].some(has)) {
    add("rice-nsps", {
      title: "NSPS for stationary internal combustion engines",
      program: "NSPS",
      citation: "40 CFR Part 60, Subparts IIII (CI) and JJJJ (SI)",
      why: "Engines or engine-driven equipment were selected. Applicability depends on engine type, manufacture/order dates, and size.",
      href: "/regulations/nsps",
    });
    add("zzzz", {
      title: "NESHAP for stationary RICE",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subpart ZZZZ",
      why: "Stationary reciprocating engines were selected. Requirements depend on major/area source status, engine type, and size.",
      href: "/regulations/neshap",
    });
  }
  if (og && has("Dehydrators")) {
    add("hh", {
      title: "NESHAP for oil and gas production / transmission and storage",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subparts HH and HHH",
      why: "Glycol dehydrators were selected. Applicability depends on facility segment, HAP source status, and throughput criteria in the rule.",
      href: "/regulations/neshap",
    });
  }
  if (["Heaters", "Heater Treaters"].some(has)) {
    add("ddddd", {
      title: "NESHAP for boilers and process heaters at major sources",
      program: "NESHAP",
      citation: "40 CFR Part 63, Subpart DDDDD",
      why: "Heaters were selected. This subpart is limited to major sources of HAP; area-source status would change the answer.",
      href: "/regulations/neshap",
    });
  }
  if (has("Flares")) {
    add("flare", {
      title: "General control device requirements for flares",
      program: "NSPS / NESHAP General Provisions",
      citation: "40 CFR 60.18; 40 CFR 63.11",
      why: "Where a flare is used to comply with an NSPS or NESHAP, the general flare provisions may be referenced by the applicable subpart.",
      href: "/regulations/nsps",
    });
  }
  return [...items.values()];
}

const MAJOR_TYPES = new Set(["title-v", "psd", "nnsr"]);

function pathwaysFor(input: ScreeningInput, hub: StateProfileSummary | undefined): ScreeningItem[] {
  const out: ScreeningItem[] = [];

  if (hub) {
    for (const p of hub.permitTypes) {
      const isMajor = MAJOR_TYPES.has(p.type);
      const isExemption = p.type === "exemption";
      out.push({
        title: p.name,
        program: hub.agency,
        citation: p.citation,
        status: isMajor || isExemption ? "more-info-needed" : "potentially-applicable",
        why: isMajor
          ? "Depends on the facility's potential to emit and the area's attainment status. Calculate PTE before drawing conclusions."
          : p.description,
        nextStep: isMajor
          ? "Complete an equipment-level PTE calculation, then compare against the program's applicability criteria."
          : isExemption
            ? "Confirm emissions meet every criterion in the cited rule, and keep the calculations on file."
            : "Review the rule's eligibility conditions for each selected equipment type.",
        href: `/states/${hub.slug}`,
      });
    }
    if (OG_INDUSTRIES.has(input.industry)) {
      for (const p of hub.oilAndGasPrograms) {
        out.push({
          title: p.name,
          program: `${hub.agency} · oil & gas`,
          citation: p.citation,
          status: MAJOR_TYPES.has(p.type) ? "more-info-needed" : "potentially-applicable",
          why: p.description,
          nextStep: "Check this program's eligibility conditions against the selected equipment and site emissions.",
          href: `/states/${hub.slug}#oil-gas`,
        });
      }
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
      status: "more-info-needed",
      why: "Depends on potential to emit and the attainment status of the county for each pollutant.",
      nextStep: "Calculate PTE and confirm the county's attainment designations.",
      href: "/regulations/nsr",
    },
    {
      title: "Title V Operating Permit",
      program: "Federal program, usually state-administered",
      status: "more-info-needed",
      why: "Depends on potential to emit and other program criteria.",
      nextStep: "Calculate PTE and compare against the approved program's applicability criteria.",
      href: "/regulations/title-v",
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
  if (input.pteKnown === "yes") {
    const i = dataGaps.findIndex((g) => g.startsWith("Potential to emit"));
    dataGaps[i] = "Compare your potential-to-emit estimates against the applicability criteria quoted on the state hub and in the federal rule text.";
  }
  return { pathways: pathwaysFor(input, hub), federalRules: federalRulesFor(input.equipment, input.industry), dataGaps, considerations: considerationsFor(input) };
}
