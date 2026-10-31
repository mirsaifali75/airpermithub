import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { StateAirPermitProfile } from "./state-profile-types";

/**
 * Server-only loader for researched state profiles. Each carries its own
 * verification level and last-reviewed date. Profiles come from
 * /data/states/*.json, or, when the build exported the content database
 * (.content/manifest.json exists), from the published versions in
 * .content/states. See src/lib/content/config.ts.
 */

const EXPORT = join(process.cwd(), ".content");
const DIR = existsSync(join(EXPORT, "manifest.json")) ? join(EXPORT, "states") : join(process.cwd(), "data", "states");

let cache: Map<string, StateAirPermitProfile> | null = null;

function load(): Map<string, StateAirPermitProfile> {
  if (cache) return cache;
  const map = new Map<string, StateAirPermitProfile>();
  if (existsSync(DIR)) {
    for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
      const profile = JSON.parse(readFileSync(join(DIR, file), "utf8")) as StateAirPermitProfile;
      map.set(profile.slug, profile);
    }
  }
  cache = map;
  return map;
}

export function getStateProfile(slug: string): StateAirPermitProfile | undefined {
  return load().get(slug);
}

export function listStateProfiles(): StateAirPermitProfile[] {
  return [...load().values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Compact shape passed to client components (Permit Finder, map). */
export interface StateProfileSummary {
  slug: string;
  name: string;
  agency: string;
  verification: StateAirPermitProfile["verification"];
  lastReviewed: string;
  permitTypes: ProgramSummary[];
  oilAndGasPrograms: ProgramSummary[];
}

/** A permit program as the Permit Finder shows it, with its official source and any verbatim quote. */
export interface ProgramSummary {
  type: string;
  name: string;
  description: string;
  citation?: string;
  url?: string;
  quote?: string;
  quoteUrl?: string;
}

const programSummary = ({ type, name, description, citation, url, quote, quoteSource }: StateAirPermitProfile["permitTypes"][number]): ProgramSummary => ({
  type, name, description, citation, url, ...(quote ? { quote, quoteUrl: quoteSource?.url ?? url } : {}),
});

export function stateProfileSummaries(): StateProfileSummary[] {
  return listStateProfiles().map((p) => ({
    slug: p.slug,
    name: p.name,
    agency: p.agency.name,
    verification: p.verification,
    lastReviewed: p.lastReviewed,
    permitTypes: p.permitTypes.map(programSummary),
    oilAndGasPrograms: (p.oilAndGas?.programs ?? []).map(programSummary),
  }));
}

/** Shape used by the interactive state map. */
export function stateMapProfiles() {
  return listStateProfiles().map((p) => ({
    slug: p.slug,
    code: p.code,
    name: p.name,
    agency: p.agency,
    verification: p.verification,
    lastReviewed: p.lastReviewed,
    forms: p.forms,
    guidance: p.guidance,
    programs: p.permitTypes.map((t) => ({ name: t.name, type: t.type, url: t.url })),
  }));
}

/** "Texas Commission on Environmental Quality (TCEQ)" -> "TCEQ". */
export function agencyShortName(name: string) {
  return name.match(/\(([A-Z][A-Za-z&. -]{1,13})\)/)?.[1] ?? name;
}
