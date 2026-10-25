import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { StateAirPermitProfile } from "./state-profile-types";

/**
 * Server-only loader for researched state profiles in /data/states/*.json.
 * Profiles come from the AirPermitHub state research dataset; each carries
 * its own verification level and last-reviewed date. Adding a JSON file adds
 * a state hub, no code change needed. Phase 2 swaps this for a Prisma query.
 */

const DIR = join(process.cwd(), "data", "states");

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
  permitTypes: { type: string; name: string; description: string; citation?: string }[];
  oilAndGasPrograms: { type: string; name: string; description: string; citation?: string }[];
}

export function stateProfileSummaries(): StateProfileSummary[] {
  return listStateProfiles().map((p) => ({
    slug: p.slug,
    name: p.name,
    agency: p.agency.name,
    verification: p.verification,
    lastReviewed: p.lastReviewed,
    permitTypes: p.permitTypes.map(({ type, name, description, citation }) => ({ type, name, description, citation })),
    oilAndGasPrograms: (p.oilAndGas?.programs ?? []).map(({ type, name, description, citation }) => ({ type, name, description, citation })),
  }));
}

/** Shape used by the interactive state map. */
export function stateMapProfiles() {
  return listStateProfiles().map((p) => ({
    slug: p.slug,
    name: p.name,
    agency: p.agency,
    verification: p.verification,
    lastReviewed: p.lastReviewed,
    forms: p.forms,
    guidance: p.guidance,
    programs: p.permitTypes.map((t) => t.name),
  }));
}
