import { toCsv } from "../csv";
import { HAP_SINGLE, HAP_TOTAL, PSD_LISTED, PSD_OTHER, TV_MAJOR, TV_OZONE, type OzoneClass } from "./applicability";
import { RT, type RuleQuote } from "./rule-text";

/**
 * Synthetic minor limit design math. The user enters each unit's potential to
 * emit at full design capacity and the limits they propose; this module
 * applies each limit, sums the facility, and compares the result with the
 * federal major source thresholds quoted in rule-text.ts. Every number it
 * compares against comes from those quotes (see applicability.ts constants).
 * It never decides that a limit is enforceable: the user records that, and
 * the result is labeled a design screen, not a determination.
 */

export const smPollutants = ["NOx", "CO", "VOC", "SO2", "PM10", "PM2.5", "PM"] as const;
export type SmPollutant = (typeof smPollutants)[number];

export type LimitType = "none" | "hours" | "throughput" | "cap";
export const limitTypeLabels: Record<LimitType, string> = {
  none: "No limit (full capacity)",
  hours: "Operating hours limit",
  throughput: "Throughput or fuel limit",
  cap: "Emission cap (tpy)",
};

/** Hours in a year: the full-capacity basis for an hours limit. */
export const HOURS_PER_YEAR = 8760;

export interface SmRow {
  id: string;
  unit: string;
  description: string;
  /** A criteria pollutant, or "HAP" with the HAP named in hapName (blank = unspeciated HAP). */
  pollutant: SmPollutant | "HAP";
  hapName: string;
  /** Potential to emit at full design capacity, 8,760 hr/yr, before controls, tpy. */
  uncontrolled: number | null;
  /** Control efficiency, percent (0-100). */
  control: number | null;
  /** The control will be required by an enforceable condition (only then does it reduce PTE). */
  controlEnforceable: boolean;
  limitType: LimitType;
  /** Hours per year, throughput per year, or tpy for a cap. */
  limitValue: number | null;
  limitUnits: string;
  /** Throughput limits: the annual throughput at full design capacity, in the same units. */
  capacity: number | null;
  /** Emission factor or method behind the uncontrolled PTE. */
  basis: string;
  /** Enforceability record. */
  condition: string;
  averaging: string;
  monitoring: string;
  records: string;
  reporting: string;
}

export interface SmSettings {
  ozone: OzoneClass;
  /** One of the source categories listed in 40 CFR 52.21(b)(1)(i)(A). */
  listed: "yes" | "no" | "unknown";
  /** Warn when limited PTE is within this percent of a threshold. A design margin the user picks, not a rule value. */
  marginPct: number | null;
  /** Crude oil and natural gas production (HAP status by surface site). */
  oilGas: boolean;
  /** Ozone transport region (VOC). */
  otr?: boolean;
  /** Serious CO nonattainment area where stationary sources contribute significantly. */
  coSerious?: boolean;
  /** Serious PM-10 nonattainment area. */
  pm10Serious?: boolean;
}

/** Lower Part 70 major source thresholds in some areas, each from the 40 CFR 70.2 text quoted beside it. */
export const TV_OTR_VOC = 50;
export const TV_CO_SERIOUS = 50;
export const TV_PM10_SERIOUS = 70;

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
export const fmt = (n: number, d = 3) => n.toLocaleString("en-US", { maximumFractionDigits: d });

export interface RowResult {
  /** Uncontrolled PTE, or null when not entered. */
  uncontrolled: number | null;
  /** PTE with the enforceable controls and limits applied. */
  limited: number | null;
  /** The arithmetic, written out. */
  steps: string;
  /** Problems that stop or weaken the calculation. */
  problems: string[];
}

/** Applies one row's control and limit to its uncontrolled PTE, and writes out the arithmetic. */
export function limitRow(r: SmRow): RowResult {
  const problems: string[] = [];
  if (!has(r.uncontrolled)) return { uncontrolled: null, limited: null, steps: "Enter the uncontrolled potential to emit.", problems };
  if (r.uncontrolled < 0) problems.push("Uncontrolled PTE is negative.");
  let value = r.uncontrolled;
  let steps = `${fmt(r.uncontrolled)} tpy`;

  if (has(r.control) && r.control !== 0) {
    if (r.control < 0 || r.control > 100) {
      problems.push("Control efficiency must be between 0 and 100 percent.");
    } else if (!r.controlEnforceable) {
      problems.push("The control is not marked enforceable, so it does not reduce potential to emit here.");
    } else {
      value *= 1 - r.control / 100;
      steps += ` × (1 − ${fmt(r.control)}%)`;
    }
  }

  if (r.limitType === "hours") {
    if (!has(r.limitValue)) problems.push("Enter the hours limit.");
    else if (r.limitValue < 0) problems.push("Hours limit is negative.");
    else {
      const ratio = Math.min(1, r.limitValue / HOURS_PER_YEAR);
      if (r.limitValue > HOURS_PER_YEAR) problems.push(`An hours limit above ${fmt(HOURS_PER_YEAR)} hr/yr does not restrict anything.`);
      value *= ratio;
      steps += ` × (${fmt(Math.min(r.limitValue, HOURS_PER_YEAR))} ÷ ${fmt(HOURS_PER_YEAR)} hr/yr)`;
    }
  } else if (r.limitType === "throughput") {
    const u = r.limitUnits.trim() || "units/yr";
    if (!has(r.limitValue)) problems.push("Enter the throughput or fuel limit.");
    else if (!has(r.capacity) || r.capacity <= 0) problems.push("Enter the annual throughput at full design capacity, in the same units as the limit.");
    else if (r.limitValue < 0) problems.push("Throughput limit is negative.");
    else {
      if (r.limitValue > r.capacity) problems.push("The limit is above full design capacity, so it does not restrict anything.");
      const lim = Math.min(r.limitValue, r.capacity);
      value *= lim / r.capacity;
      steps += ` × (${fmt(lim)} ÷ ${fmt(r.capacity)} ${u})`;
    }
  } else if (r.limitType === "cap") {
    if (!has(r.limitValue)) problems.push("Enter the emission cap in tpy.");
    else if (r.limitValue < 0) problems.push("Emission cap is negative.");
    else if (r.limitValue < value) {
      steps = `lower of (${steps.includes("×") ? `${steps} = ${fmt(value)} tpy` : steps}) and the cap of ${fmt(r.limitValue)} tpy = ${fmt(r.limitValue)} tpy`;
      return { uncontrolled: r.uncontrolled, limited: r.limitValue, steps, problems };
    } else {
      problems.push("The cap is at or above the unlimited value, so it does not restrict anything.");
    }
  }
  return { uncontrolled: r.uncontrolled, limited: value, steps: steps.includes("×") ? `${steps} = ${fmt(value)} tpy` : steps, problems };
}

export type ThresholdStatus = "at-or-above" | "near" | "below";

export interface Comparison {
  program: "Title V" | "PSD" | "HAP major source";
  /** What the threshold applies to, in words. */
  basis: string;
  tpy: number;
  /** Rule text the threshold is quoted from. */
  quotes: RuleQuote[];
  status: ThresholdStatus;
  /** Uncontrolled PTE is at or above the threshold (limits are what keep the source under it). */
  limitsNeeded: boolean;
  headroom: number;
  note?: string;
}

export interface PollutantSummary {
  pollutant: string;
  uncontrolled: number;
  limited: number;
  comparisons: Comparison[];
}

function compare(program: Comparison["program"], basis: string, tpy: number, quotes: RuleQuote[], uncontrolled: number, limited: number, margin: number | null, note?: string): Comparison {
  const near = has(margin) && margin > 0 ? tpy * (1 - margin / 100) : Infinity;
  const status: ThresholdStatus = limited >= tpy ? "at-or-above" : limited >= near ? "near" : "below";
  return { program, basis, tpy, quotes, status, limitsNeeded: uncontrolled >= tpy, headroom: tpy - limited, note };
}

const ozoneTv = (o: OzoneClass) => (o === "none" || o === "unknown" ? null : TV_OZONE[o]);

/** Normalized HAP name for grouping ("Formaldehyde" and " formaldehyde " are one HAP). */
const hapKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export interface SmSummary {
  pollutants: PollutantSummary[];
  /** Each named HAP, summed across units. */
  haps: { name: string; uncontrolled: number; limited: number; comparison: Comparison }[];
  /** HAP rows with no HAP named: counted in the total only. */
  unspeciated: { uncontrolled: number; limited: number };
  hapTotal: PollutantSummary | null;
  /** Rows whose calculation is incomplete or has a problem. */
  rowProblems: { row: SmRow; problems: string[] }[];
  overall: "major" | "near" | "under" | "incomplete";
}

export function summarize(rows: SmRow[], s: SmSettings): SmSummary {
  const results = rows.map((r) => ({ row: r, res: limitRow(r) }));
  const rowProblems = results.filter((x) => x.res.problems.length || x.res.limited === null).map((x) => ({ row: x.row, problems: x.res.limited === null && !x.res.problems.length ? ["Uncontrolled PTE not entered."] : x.res.problems }));
  const done = results.filter((x) => x.res.limited !== null) as { row: SmRow; res: RowResult & { limited: number; uncontrolled: number } }[];

  const pollutants: PollutantSummary[] = [];
  for (const p of smPollutants) {
    const these = done.filter((x) => x.row.pollutant === p);
    if (!these.length) continue;
    const unc = these.reduce((a, x) => a + x.res.uncontrolled, 0);
    const lim = these.reduce((a, x) => a + x.res.limited, 0);
    const comps: Comparison[] = [];
    // The lowest Part 70 threshold that applies to this pollutant in this area.
    const tv: { tpy: number; basis: string; quotes: RuleQuote[] }[] = [{ tpy: TV_MAJOR, basis: "Any air pollutant subject to regulation", quotes: [RT.tvMajor100] }];
    const oz = ozoneTv(s.ozone);
    if ((p === "VOC" || p === "NOx") && oz !== null) tv.push({ tpy: oz, basis: `${p} in a ${s.ozone} ozone nonattainment area`, quotes: [RT.tvOzone] });
    if (p === "VOC" && s.otr) tv.push({ tpy: TV_OTR_VOC, basis: "VOC in the ozone transport region", quotes: [RT.tvOtr] });
    if (p === "CO" && s.coSerious) tv.push({ tpy: TV_CO_SERIOUS, basis: "CO in a serious CO nonattainment area where stationary sources contribute significantly", quotes: [RT.tvCoSerious] });
    if (p === "PM10" && s.pm10Serious) tv.push({ tpy: TV_PM10_SERIOUS, basis: "PM10 in a serious PM-10 nonattainment area", quotes: [RT.tvPm10Serious] });
    const lowest = tv.reduce((a, b) => (b.tpy < a.tpy ? b : a));
    comps.push(compare("Title V", lowest.basis, lowest.tpy, lowest.quotes, unc, lim, s.marginPct,
      (p === "VOC" || p === "NOx") && s.ozone === "unknown" ? "Ozone classification not set: a lower threshold applies in serious, severe, and extreme ozone nonattainment areas." : undefined));
    if (s.listed === "yes") comps.push(compare("PSD", "Listed source category", PSD_LISTED, [RT.psdListed], unc, lim, s.marginPct));
    else comps.push(compare("PSD", s.listed === "no" ? "Source not in a listed category" : "Category not set: shown at the listed-category value", s.listed === "no" ? PSD_OTHER : PSD_LISTED, s.listed === "no" ? [RT.psd250] : [RT.psdListed, RT.psd250], unc, lim, s.marginPct,
      s.listed === "unknown" ? `If the source is not in a listed category the threshold is ${PSD_OTHER} tpy.` : undefined));
    pollutants.push({ pollutant: p, uncontrolled: unc, limited: lim, comparisons: comps });
  }

  const hapRows = done.filter((x) => x.row.pollutant === "HAP");
  const byName = new Map<string, { name: string; uncontrolled: number; limited: number }>();
  const unspeciated = { uncontrolled: 0, limited: 0 };
  for (const x of hapRows) {
    const k = hapKey(x.row.hapName);
    if (!k) { unspeciated.uncontrolled += x.res.uncontrolled; unspeciated.limited += x.res.limited; continue; }
    const g = byName.get(k) ?? { name: x.row.hapName.trim(), uncontrolled: 0, limited: 0 };
    g.uncontrolled += x.res.uncontrolled;
    g.limited += x.res.limited;
    byName.set(k, g);
  }
  const hapQuotes = [RT.hapMajor, RT.tvHap, ...(s.oilGas ? [RT.hapSurfaceSite] : [])];
  const haps = [...byName.values()]
    .sort((a, b) => b.limited - a.limited)
    .map((h) => ({ ...h, comparison: compare("HAP major source", "Any single HAP", HAP_SINGLE, hapQuotes, h.uncontrolled, h.limited, s.marginPct) }));
  const hapTotal: PollutantSummary | null = hapRows.length
    ? (() => {
        const unc = hapRows.reduce((a, x) => a + x.res.uncontrolled, 0);
        const lim = hapRows.reduce((a, x) => a + x.res.limited, 0);
        return { pollutant: "Total HAP", uncontrolled: unc, limited: lim, comparisons: [compare("HAP major source", "Any combination of HAP", HAP_TOTAL, hapQuotes, unc, lim, s.marginPct)] };
      })()
    : null;

  const all = [...pollutants.flatMap((p) => p.comparisons), ...haps.map((h) => h.comparison), ...(hapTotal?.comparisons ?? [])];
  const overall: SmSummary["overall"] = !all.length ? "incomplete" : all.some((c) => c.status === "at-or-above") ? "major" : all.some((c) => c.status === "near") ? "near" : "under";
  return { pollutants, haps, unspeciated, hapTotal, rowProblems, overall };
}

export const statusLabel: Record<ThresholdStatus, string> = {
  "at-or-above": "At or above threshold",
  near: "Under, inside your margin",
  below: "Under threshold",
};

/** Worksheet export: settings, the unit table with each step, the facility comparison, and the enforceability record. */
export function smCsv(rows: SmRow[], s: SmSettings, facility: string): string {
  const sum = summarize(rows, s);
  const out: unknown[][] = [
    ["Facility", facility],
    ["Ozone classification", s.ozone],
    ["PSD listed source category", s.listed],
    ["Design margin (%) (user choice, not a rule value)", s.marginPct ?? ""],
    [],
    ["Unit", "Description", "Pollutant", "HAP name", "Uncontrolled PTE (tpy)", "Control (%)", "Control enforceable", "Limit type", "Limit value", "Limit units", "Full-capacity throughput", "Limited PTE (tpy)", "Calculation", "Basis / method", "Problems"],
    ...rows.map((r) => {
      const x = limitRow(r);
      return [r.unit, r.description, r.pollutant, r.hapName, r.uncontrolled ?? "", r.control ?? "", r.controlEnforceable ? "Yes" : "No", limitTypeLabels[r.limitType], r.limitValue ?? "", r.limitUnits, r.capacity ?? "", x.limited ?? "", x.steps, r.basis, x.problems.join(" ")];
    }),
    [],
    ["Pollutant", "Uncontrolled PTE (tpy)", "Limited PTE (tpy)", "Program", "Threshold basis", "Threshold (tpy)", "Headroom (tpy)", "Status", "Limits needed to stay under", "Citation"],
    ...[...sum.pollutants, ...sum.haps.map((h) => ({ pollutant: `HAP: ${h.name}`, uncontrolled: h.uncontrolled, limited: h.limited, comparisons: [h.comparison] })), ...(sum.hapTotal ? [sum.hapTotal] : [])].flatMap((p) =>
      p.comparisons.map((c) => [p.pollutant, round(p.uncontrolled), round(p.limited), c.program, c.basis, c.tpy, round(c.headroom), statusLabel[c.status], c.limitsNeeded ? "Yes" : "No", [...new Set(c.quotes.map((q) => q.cite))].join("; ")]),
    ),
    ...(sum.unspeciated.uncontrolled ? [["Unspeciated HAP (counted in total only)", round(sum.unspeciated.uncontrolled), round(sum.unspeciated.limited)]] : []),
    [],
    ["Unit", "Pollutant", "Proposed enforceable condition", "Averaging period", "Monitoring", "Recordkeeping", "Reporting"],
    ...rows.filter((r) => r.limitType !== "none" || (has(r.control) && r.control > 0)).map((r) => [r.unit, r.pollutant === "HAP" ? `HAP: ${r.hapName || "unspeciated"}` : r.pollutant, r.condition, r.averaging, r.monitoring, r.records, r.reporting]),
  ];
  return toCsv("Synthetic Minor Limit Designer (screening aid, not a determination)", out);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

// ---------- HAP Major Source Tracker ----------

export interface HapRow {
  id: string;
  unit: string;
  description: string;
  /** Blank = unspeciated HAP (counted in the total only). */
  hapName: string;
  cas: string;
  /** Potential to emit before controls, tpy. */
  uncontrolled: number | null;
  /** Control efficiency, percent. */
  control: number | null;
  controlEnforceable: boolean;
  basis: string;
}

export const hapToSm = (h: HapRow): SmRow => ({
  id: h.id, unit: h.unit, description: h.description, pollutant: "HAP", hapName: h.hapName, uncontrolled: h.uncontrolled, control: h.control,
  controlEnforceable: h.controlEnforceable, limitType: "none", limitValue: null, limitUnits: "", capacity: null, basis: h.basis,
  condition: "", averaging: "", monitoring: "", records: "", reporting: "",
});

/** Site HAP status from the rows: major if any comparison is at or above its threshold. */
export function hapSummary(rows: HapRow[], marginPct: number | null, oilGas: boolean) {
  const s = summarize(rows.map(hapToSm), { ozone: "none", listed: "no", marginPct, oilGas });
  const status: "major" | "area" | "incomplete" = s.overall === "incomplete" ? "incomplete" : s.overall === "major" ? "major" : "area";
  return { ...s, status };
}

export function hapCsv(rows: HapRow[], marginPct: number | null, oilGas: boolean, facility: string): string {
  const s = hapSummary(rows, marginPct, oilGas);
  return toCsv("HAP Major Source Tracker (screening aid, not a determination)", [
    ["Facility", facility],
    ["Oil and gas production (surface site basis)", oilGas ? "Yes" : "No"],
    [],
    ["Unit", "Description", "HAP", "CAS No.", "Uncontrolled PTE (tpy)", "Control (%)", "Control enforceable", "PTE considering enforceable controls (tpy)", "Calculation", "Basis / method", "Problems"],
    ...rows.map((h) => {
      const x = limitRow(hapToSm(h));
      return [h.unit, h.description, h.hapName || "Unspeciated", h.cas, h.uncontrolled ?? "", h.control ?? "", h.controlEnforceable ? "Yes" : "No", x.limited ?? "", x.steps, h.basis, x.problems.join(" ")];
    }),
    [],
    ["HAP", "Site PTE (tpy)", "Threshold (tpy)", "Headroom (tpy)", "Status", "Citation"],
    ...s.haps.map((h) => [h.name, round(h.limited), h.comparison.tpy, round(h.comparison.headroom), statusLabel[h.comparison.status], "40 CFR 63.2"]),
    ...(s.unspeciated.uncontrolled ? [["Unspeciated HAP (total only)", round(s.unspeciated.limited)]] : []),
    ...(s.hapTotal ? [["All HAP combined", round(s.hapTotal.limited), s.hapTotal.comparisons[0].tpy, round(s.hapTotal.comparisons[0].headroom), statusLabel[s.hapTotal.comparisons[0].status], "40 CFR 63.2"]] : []),
    [],
    ["Screening result", s.status === "major" ? "At or above a HAP major source threshold" : s.status === "area" ? "Below both HAP major source thresholds" : "Incomplete"],
  ]);
}
