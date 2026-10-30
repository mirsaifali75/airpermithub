// Seed data types for AirPermitHub /states/[state] and /federal pages.
// Every link should point to an official agency (.gov or state register) source.
// Thresholds appear only when quoted from the cited source; see `quote` fields.

export type PermitType =
  | "exemption"     // de minimis / no permit required
  | "registration"  // notice of intent, registration, permit by rule claims
  | "pbr"           // permit by rule
  | "general"       // general construction / general operating permits
  | "standard"      // standard permits (e.g., Texas)
  | "minor-nsr"     // state minor source construction permit
  | "psd"           // Prevention of Significant Deterioration (major NSR, attainment)
  | "nnsr"          // Nonattainment New Source Review (major NSR, nonattainment)
  | "title-v"       // Part 70 operating permit
  | "state-operating" // non-Title V state operating permit (synthetic minor, FESOP, etc.)
  | "other";

export type Verification = "verified" | "partial" | "unverified";

export interface Link {
  name: string;
  url: string;
}

export interface PermitProgram {
  type: PermitType;
  name: string;
  description: string;
  citation?: string;
  url?: string;
  /** Verbatim threshold text from the source at `url` (or `quoteSource`), if any. */
  quote?: string;
  /** The document the quote comes from, when it is not the page at `url`. */
  quoteSource?: Link;
  /** Thresholds restated closely from the source at `url` (or `thresholdsSource`), not verbatim; confirm against the source. */
  thresholds?: string;
  /** The document the thresholds are restated from, when it is not the page at `url`. */
  thresholdsSource?: Link;
}

export interface LocalAgency {
  name: string;
  jurisdiction: string;
  url: string;
  notes?: string;
}

export interface StateAirPermitProfile {
  code: string;          // "TX"
  name: string;          // "Texas"
  slug: string;          // "texas"
  epaRegion: number;
  agency: { name: string; division?: string; url: string; permitsUrl?: string };
  localAgencies?: LocalAgency[];
  overview: string;
  permitTypes: PermitProgram[];
  oilAndGas?: { summary: string; programs: PermitProgram[] };
  regulations: { citation: string; title: string; url?: string }[];
  forms: Link[];
  guidance: Link[];
  ePermitting?: Link;
  fees?: Link;
  sources: Link[];
  lastReviewed: string;  // YYYY-MM-DD
  verification: Verification;
  notes?: string;
}

export interface FederalProgram {
  id: string;
  name: string;
  citation: string;
  description: string;
  url: string;
  ecfrUrl?: string;
}

export interface FederalData {
  programs: FederalProgram[];
  tools: Link[];
  sources: Link[];
  lastReviewed: string;
  verification: Verification;
}
