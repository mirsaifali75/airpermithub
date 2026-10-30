import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Server-only loader for data/verification/status.json, the result of the last
 * source check (scripts/verify-sources.mjs, summarized by
 * scripts/verification-status.mjs). Nothing here changes site content; it only
 * reports what the check found.
 */

export type CheckStatus = "pass" | "fail" | "unchecked";
export interface ClaimCheck {
  s: CheckStatus;
  r: string;
  d?: string;
  by?: "hand";
  on?: string;
  note?: string;
}
export type Tally = Record<CheckStatus, number>;
export interface VerificationStatus {
  checkedOn: string;
  ecfrDate: string;
  totals: Record<string, Tally>;
  states: Record<string, Record<string, Tally>>;
  claims: Record<string, ClaimCheck>;
}

const FILE = join(process.cwd(), "data", "verification", "status.json");
let cache: VerificationStatus | null | undefined;

export function verificationStatus(): VerificationStatus | null {
  if (cache === undefined) cache = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as VerificationStatus) : null;
  return cache;
}

/** Result for one quote or threshold summary on a state page. */
export function programCheck(kind: "quote" | "threshold", code: string, group: "program" | "oil-gas", name: string): ClaimCheck | undefined {
  return verificationStatus()?.claims[`${kind}|state:${code}:${group}:${name}`];
}

export function stateTallies(code: string) {
  return verificationStatus()?.states[code];
}
