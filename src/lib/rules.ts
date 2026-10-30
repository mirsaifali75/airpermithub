/**
 * Federal rule library: NSPS, NESHAP, and GHG reporting subparts.
 *
 * Rule text, headings, and amendment dates come only from the eCFR snapshot in
 * data/ecfr (scripts/sync-ecfr.mjs, refreshed weekly and reviewed before it is
 * merged). This file holds what AirPermitHub adds: how subparts are grouped,
 * the names practitioners use for them, and links to related tools. It never
 * says whether a rule applies to anyone.
 */

export type RulePart = 60 | 63 | 98;
export type RuleCategory = "oil-gas" | "engines" | "turbines" | "boilers" | "storage" | "refining" | "ghg" | "general";

export interface EcfrSection {
  id: string | null;
  heading: string;
  group: string | null;
  kind: "section" | "reserved" | "table";
  lastAmended: string | null;
}

export interface EcfrQuote {
  id: string;
  heading: string;
  paragraphs: string[];
  cita: string | null;
}

/** One subpart as written by scripts/sync-ecfr.mjs. */
export interface EcfrSubpart {
  title: number;
  part: RulePart;
  subpart: string;
  url: string;
  ecfrDate: string;
  retrievedOn: string;
  latestAmendment: string | null;
  hash: string;
  heading: string;
  fullHeading: string;
  source: string | null;
  sections: EcfrSection[];
  quotes: EcfrQuote[];
  amendmentDates: string[];
}

export interface RuleMeta {
  part: RulePart;
  subpart: string;
  category: RuleCategory;
  /** Other library groups this subpart is listed under. */
  also?: RuleCategory[];
  /** Names practitioners commonly use for the subpart. */
  aka?: string[];
}

export const ruleCategories: { key: RuleCategory; label: string; description: string }[] = [
  { key: "oil-gas", label: "Oil and natural gas", description: "Production, gathering, processing, transmission, and storage." },
  { key: "engines", label: "Stationary engines", description: "Reciprocating internal combustion engines, spark and compression ignition." },
  { key: "turbines", label: "Combustion turbines", description: "Stationary gas and combustion turbines." },
  { key: "boilers", label: "Boilers and process heaters", description: "Steam generating units, boilers, and process heaters." },
  { key: "storage", label: "Storage tanks and liquid transfer", description: "Volatile organic liquid storage vessels and organic liquids distribution." },
  { key: "refining", label: "Petroleum refineries", description: "Refinery process units and related equipment." },
  { key: "ghg", label: "Greenhouse gas reporting", description: "40 CFR Part 98 reporting requirements." },
  { key: "general", label: "General provisions", description: "Provisions that apply across a part unless a subpart says otherwise." },
];

export const ruleMeta: RuleMeta[] = [
  { part: 60, subpart: "OOOOb", category: "oil-gas", aka: ["Quad Ob"] },
  { part: 60, subpart: "OOOOc", category: "oil-gas", aka: ["Quad Oc"] },
  { part: 60, subpart: "OOOOa", category: "oil-gas", aka: ["Quad Oa"] },
  { part: 60, subpart: "OOOO", category: "oil-gas", aka: ["Quad O"] },
  { part: 60, subpart: "KKK", category: "oil-gas" },
  { part: 60, subpart: "LLL", category: "oil-gas" },
  { part: 63, subpart: "HH", category: "oil-gas" },
  { part: 63, subpart: "HHH", category: "oil-gas" },
  { part: 60, subpart: "JJJJ", category: "engines", aka: ["Quad J"] },
  { part: 60, subpart: "IIII", category: "engines", aka: ["Quad I"] },
  { part: 63, subpart: "ZZZZ", category: "engines", aka: ["RICE NESHAP", "RICE MACT", "Quad Z"] },
  { part: 60, subpart: "KKKK", category: "turbines", aka: ["Quad K"] },
  { part: 60, subpart: "GG", category: "turbines" },
  { part: 63, subpart: "YYYY", category: "turbines", aka: ["Turbine MACT"] },
  { part: 60, subpart: "Db", category: "boilers" },
  { part: 60, subpart: "Dc", category: "boilers" },
  { part: 63, subpart: "DDDDD", category: "boilers", aka: ["Boiler MACT", "5D"] },
  { part: 63, subpart: "JJJJJJ", category: "boilers", aka: ["Area source boiler rule", "6J"] },
  { part: 60, subpart: "Kb", category: "storage", also: ["oil-gas"] },
  { part: 60, subpart: "Kc", category: "storage" },
  { part: 63, subpart: "EEEE", category: "storage", aka: ["OLD MACT"] },
  { part: 63, subpart: "CC", category: "refining", aka: ["Refinery MACT 1"] },
  { part: 98, subpart: "W", category: "ghg", also: ["oil-gas"], aka: ["GHGRP Subpart W"] },
  { part: 98, subpart: "C", category: "ghg", aka: ["GHGRP Subpart C"] },
  { part: 98, subpart: "A", category: "ghg", also: ["general"] },
  { part: 60, subpart: "A", category: "general" },
  { part: 63, subpart: "A", category: "general" },
];

export const programForPart: Record<RulePart, string> = { 60: "nsps", 63: "neshap", 98: "ghg-reporting" };
export const programLabel: Record<RulePart, string> = { 60: "NSPS", 63: "NESHAP", 98: "GHGRP" };

export const ruleSlug = (subpart: string) => `subpart-${subpart.toLowerCase()}`;
export const ruleHref = (r: { part: RulePart; subpart: string }) => `/regulations/${programForPart[r.part]}/${ruleSlug(r.subpart)}`;
export const ruleName = (r: { part: RulePart; subpart: string }) => `${programLabel[r.part]} Subpart ${r.subpart}`;
export const ruleCitation = (r: { part: RulePart; subpart: string }) => `40 CFR Part ${r.part}, Subpart ${r.subpart}`;
export const ecfrSectionUrl = (id: string) => `https://www.ecfr.gov/current/title-40/section-${id}`;
export const getRuleMeta = (part: number, subpart: string) => ruleMeta.find((m) => m.part === part && m.subpart.toLowerCase() === subpart.toLowerCase());

/** Finds the library entry for a key-subpart label such as "Subpart JJJJ" or "Part 63 Subpart ZZZZ". */
export function metaForCode(part: number, code: string) {
  const m = code.match(/(?:Part\s+(\d+)\s+)?Subpart\s+(\S+)/i);
  return m ? getRuleMeta(m[1] ? Number(m[1]) : part, m[2]) : undefined;
}

const prefixes = [
  /^Standards of Performance for\s+/i,
  /^Emissions? Guidelines for\s+/i,
  /^National Emissions? Standards for Hazardous Air Pollutants(?:\s+for|\s+From|:)\s+/i,
];
/** eCFR heading without the boilerplate opening, for titles and cards. */
export function shortHeading(heading: string) {
  let h = heading;
  for (const p of prefixes) h = h.replace(p, "");
  h = h.replace(/^General Provision$/i, "General Provisions");
  return h.charAt(0).toUpperCase() + h.slice(1);
}

export type SectionTopic = "applicability" | "dates" | "standards" | "compliance" | "monitoring" | "testing" | "records" | "definitions" | "changes" | "enforcement" | "plans" | "general";
export const sectionTopics: { key: SectionTopic; label: string; re: RegExp }[] = [
  { key: "applicability", label: "Who is covered", re: /am i (subject|affected)|applicab|purpose (of|and scope)|what is the affected source|what parts of my|who must report|source category|reporting threshold|does this subpart (apply|directly affect)|designation of affected|not subject to this subpart|exempt from|are .+ covered by|what designated facilities|pollutants are regulated/i },
  { key: "dates", label: "Compliance dates", re: /when (must|do) i (have to )?comply|by what date|deadline/i },
  { key: "standards", label: "Standards and limits", re: /standards?\b(?! of performance)|emission limit|operating limit|work practice|control (equipment|device) requirements|requirements for certain flares|requirements for flare|(?<!general |mobile source |performance track )provisions|fuel requirements|emissions averaging|subcategor/i },
  { key: "compliance", label: "Showing compliance", re: /compl(y|ian)|demonstrat/i },
  { key: "monitoring", label: "Monitoring", re: /monitor|continuous emission|\bCEMS\b|\bCMS\b|parameter|how often must i determine/i },
  { key: "testing", label: "Tests, methods, and calculations", re: /\btest|methods?\b|procedures?|calculat|how do i determine/i },
  { key: "records", label: "Notifications, reports, records", re: /notif|(?<!who must )report(?!ing threshold)|record/i },
  { key: "definitions", label: "Definitions", re: /definitions|abbreviation|acronym/i },
  { key: "changes", label: "Modification and reconstruction", re: /modification|reconstruction/i },
  { key: "enforcement", label: "Who implements it", re: /implements and enforces|implementation and enforcement|delegat|state authority/i },
  { key: "plans", label: "State and Tribal plans", re: /state or tribal plan|model rule|negative declaration/i },
  { key: "general", label: "General provisions", re: /general provisions/i },
];

/** Topics a section heading falls under, matched on the eCFR heading words alone. */
export function topicsFor(heading: string): SectionTopic[] {
  return sectionTopics.filter((t) => t.re.test(heading)).map((t) => t.key);
}

const ROMAN = /^\((i{1,3}|iv|vi{0,3}|ix|xi{0,3}|xiv|xvi{0,3}|xix|xx)\)/;

/**
 * Nesting depth of each regulatory paragraph from its marker:
 * (a) → 0, (1) → 1, (i) → 2, (A) → 3. A letter that is also a roman numeral
 * counts as roman when it follows a numbered or roman paragraph.
 */
export function paragraphLevels(paragraphs: string[]): number[] {
  let prev = 0;
  let lastLetter = "";
  return paragraphs.map((p, i) => {
    let level = prev;
    const letter = p.match(/^\(([a-z]{1,2})\)/)?.[1];
    if (/^\(\d+\)/.test(p)) level = 1;
    else if (/^\([A-Z]\)/.test(p)) level = 3;
    else if (letter) {
      const nextLetter = lastLetter ? String.fromCharCode(lastLetter.charCodeAt(0) + 1) : "a";
      // "(i)" after "(h)(2)." is the letter i; after a lead-in ending in a colon it starts a roman list.
      const continuesLetters = letter === nextLetter && !/[:—]\s*$/.test(paragraphs[i - 1] ?? "");
      if (ROMAN.test(p) && prev >= 1 && !continuesLetters) level = 2;
      else {
        level = 0;
        lastLetter = letter;
      }
    }
    prev = level;
    return level;
  });
}
