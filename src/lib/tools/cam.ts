import { toCsv } from "../csv";
import { RT, type RuleQuote } from "./rule-text";

/**
 * CAM (40 CFR Part 64) applicability screen and plan record. The three
 * criteria and the exemption question come from 64.2 (quoted in
 * rule-text.ts). The user answers each one; this module only combines the
 * answers and never decides that a limit is exempt.
 */

export type Answer = "yes" | "no" | "unknown";

export interface CamUnit {
  id: string;
  unit: string;
  pollutant: string;
  /** Emission limitation or standard, with its citation. */
  limit: string;
  subjectToLimit: Answer;
  /** The limit is one of the 64.2(b)(1) exempt kinds. */
  exempt: Answer;
  usesControl: Answer;
  /** Potential pre-control device emissions, tpy. */
  precontrol: number | null;
  /** The tpy needed for a source to be classified as major, for this pollutant. */
  majorAmount: number | null;
  controlDevice: string;
  indicators: string;
  range: string;
  rangeBasis: string;
  performance: string;
  frequency: string;
  excursion: string;
  response: string;
  records: string;
}

export type CamStatus = "meets" | "does-not-meet" | "more-info" | "not-major";

export interface CamResult { status: CamStatus; reasons: string[]; basis: RuleQuote[] }

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

export function camScreen(u: CamUnit, majorPart70: Answer): CamResult {
  const basis = [RT.camApplies, RT.camLimit, RT.camControl, RT.camPrecontrol];
  if (majorPart70 === "no") return { status: "not-major", reasons: ["The source is not a major source required to obtain a Part 70 or 71 permit."], basis: [RT.camApplies] };
  const fails: string[] = [];
  const unknown: string[] = [];
  if (u.subjectToLimit === "no") fails.push("(a)(1): not subject to an emission limitation or standard for this pollutant.");
  if (u.subjectToLimit === "unknown") unknown.push("(a)(1): whether the unit is subject to an emission limitation or standard.");
  if (u.exempt === "yes") fails.push("(a)(1): the limitation or standard is exempt under 64.2(b)(1).");
  if (u.exempt === "unknown") unknown.push("64.2(b)(1): whether the limitation or standard is exempt.");
  if (u.usesControl === "no") fails.push("(a)(2): no control device is used to comply.");
  if (u.usesControl === "unknown") unknown.push("(a)(2): whether a control device is used to comply.");
  if (has(u.precontrol) && has(u.majorAmount)) {
    if (u.precontrol < u.majorAmount) fails.push(`(a)(3): pre-control PTE ${u.precontrol} tpy is below ${u.majorAmount} tpy (100 percent of the major source amount).`);
  } else unknown.push("(a)(3): pre-control PTE and the major source amount for this pollutant.");
  if (majorPart70 === "unknown") unknown.push("Whether the source is a major source required to obtain a Part 70 or 71 permit.");
  if (fails.length) return { status: "does-not-meet", reasons: fails, basis: [...basis, ...(u.exempt === "yes" ? [RT.camPost1990, RT.camContinuous] : [])] };
  if (unknown.length) return { status: "more-info", reasons: unknown, basis };
  return { status: "meets", reasons: ["Each 64.2(a) criterion is answered yes, and pre-control PTE is at or above 100 percent of the major source amount."], basis };
}

export const camLabels: Record<CamStatus, string> = {
  meets: "Meets all 64.2(a) criteria",
  "does-not-meet": "Does not meet all 64.2(a) criteria",
  "more-info": "More information needed",
  "not-major": "Part 64 does not reach this source",
};

/** Plan fields 64.4(a) asks for; a unit that meets the criteria needs each one. */
export const planFields: { key: keyof CamUnit; label: string; quote?: RuleQuote }[] = [
  { key: "controlDevice", label: "Control device" },
  { key: "indicators", label: "Indicator(s) of performance", quote: RT.camSubmitIndicators },
  { key: "range", label: "Indicator range or designated condition", quote: RT.camSubmitRanges },
  { key: "rangeBasis", label: "Basis for the range (test data, design, history)" },
  { key: "performance", label: "Performance criteria (64.3(b))", quote: RT.camSubmitPerformance },
  { key: "frequency", label: "Monitoring frequency and averaging period" },
  { key: "excursion", label: "Excursion definition", quote: RT.camExcursion },
  { key: "response", label: "Response to an excursion" },
  { key: "records", label: "Records and reports" },
];

export const missingPlan = (u: CamUnit) => planFields.filter((f) => !String(u[f.key] ?? "").trim()).map((f) => f.label);

export function camCsv(units: CamUnit[], majorPart70: Answer, facility: string): string {
  return toCsv("CAM Plan Builder (screening and documentation aid, not a determination)", [
    ["Facility", facility],
    ["Major source required to obtain a Part 70 or 71 permit", majorPart70],
    [],
    ["Unit", "Pollutant", "Emission limitation or standard", "(a)(1) Subject to limit", "Exempt under 64.2(b)(1)", "(a)(2) Uses control device", "(a)(3) Pre-control PTE (tpy)", "Major source amount (tpy)", "Screen result", "Reasons", ...planFields.map((f) => f.label), "Plan items missing"],
    ...units.map((u) => {
      const r = camScreen(u, majorPart70);
      return [u.unit, u.pollutant, u.limit, u.subjectToLimit, u.exempt, u.usesControl, u.precontrol ?? "", u.majorAmount ?? "", camLabels[r.status], r.reasons.join(" "), ...planFields.map((f) => u[f.key] as string), r.status === "meets" ? missingPlan(u).join("; ") : ""];
    }),
  ]);
}
