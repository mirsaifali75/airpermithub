import corrections from "../../../data/corrections.json";

/**
 * Public corrections log (data/corrections.json). Add an entry whenever a
 * published fact (quote, threshold, citation, agency name, deadline) is
 * corrected. Newest first. Link fixes and wording edits do not need an entry.
 */
export interface Correction {
  /** ISO date the correction went live. */
  date: string;
  /** Site path of the corrected page, e.g. "/states/texas". */
  page: string;
  /** What was wrong and what it says now. */
  summary: string;
  /** Official source that shows the correct information. */
  source: string;
  /** How it was found: the monthly check, a reader report, or our own review. */
  foundBy: "source check" | "reader report" | "editorial review";
}

export const correctionLog: Correction[] = (corrections as Correction[]).slice().sort((a, b) => b.date.localeCompare(a.date));
