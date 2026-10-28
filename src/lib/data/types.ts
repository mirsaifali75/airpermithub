/**
 * Shared content types. Every regulatory record carries provenance so the UI
 * can always show where information came from and when it was last reviewed.
 */

/** Editorial status of a regulatory record. */
export type ContentStatus =
  | "official-source"
  | "aph-summary"
  | "needs-review"
  | "recently-updated"
  | "archived";

/** Screening outcome. Never a legal conclusion. */
export type ApplicabilityStatus = "potentially-applicable" | "likely-not-applicable" | "more-info-needed";

export type ComplianceStatus = "on-track" | "due-soon" | "overdue" | "completed" | "not-evaluated";

/** Distinguishes where a document came from in the permit library. */
export type DocumentOrigin = "official" | "aph-summary" | "user-upload" | "demo";

export interface SourceRef {
  agency: string;
  title: string;
  url: string;
  citation?: string;
  /** ISO date of the last AirPermitHub editorial review. Null until reviewed. */
  lastReviewed: string | null;
  effectiveDate?: string;
  version?: string;
}

export interface RegulationSection {
  /** Plain-language AirPermitHub summary, or null when not yet written. */
  summary: string | null;
  /** Specific provisions worth reading in the official source. */
  pointers?: { label: string; citation: string }[];
}

export interface Regulation {
  slug: string;
  shortName: string;
  name: string;
  citation: string;
  jurisdiction: "federal" | "state";
  agency: string;
  status: ContentStatus;
  tagline: string;
  summary: string;
  applicability: RegulationSection;
  requirements: RegulationSection;
  monitoring: RegulationSection;
  testing: RegulationSection;
  recordkeeping: RegulationSection;
  reporting: RegulationSection;
  definitions: RegulationSection;
  keySubparts?: { code: string; title: string }[];
  sources: SourceRef[];
  relatedRules: string[];
  relatedCalculators: string[];
}
