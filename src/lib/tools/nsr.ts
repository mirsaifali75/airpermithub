/**
 * NSR project emissions accounting math, following the structure of the
 * federal PSD rule (40 CFR 52.21). The rule sets the averaging window, the
 * lookback, and the significance levels; the user enters the values from the
 * rule that applies (federal or the state's SIP-approved version), and this
 * module only does the arithmetic and shows its work.
 */

/** Verbatim excerpts used by the worksheet, with the government source they came from. */
export const nsrRuleText = {
  // Quotes checked word for word against the current eCFR text; the 2020 print
  // edition has the same wording with lowercase letters, e.g. (b)(48)(ii)(d).
  source: { title: "40 CFR 52.21 (current eCFR)", url: "https://www.ecfr.gov/current/title-40/section-52.21" },
  printEdition: {
    title: "40 CFR 52.21 (2020 edition, govinfo.gov)",
    url: "https://www.govinfo.gov/content/pkg/CFR-2020-title40-vol3/pdf/CFR-2020-title40-vol3-sec52-21.pdf",
  },
  current: { title: "40 CFR 52.21 (current eCFR)", url: "https://www.ecfr.gov/current/title-40/section-52.21" },
  quotes: [
    { cite: "40 CFR 52.21(b)(48)", text: "Baseline actual emissions means the rate of emissions, in tons per year, of a regulated NSR pollutant" },
    { cite: "40 CFR 52.21(b)(48)(i)", text: "during any consecutive 24-month period selected by the owner or operator within the 5-year period" },
    { cite: "40 CFR 52.21(b)(48)(ii)", text: "within the 10-year period immediately preceding either the date the owner or operator begins actual construction" },
    { cite: "40 CFR 52.21(b)(48)(ii)(D)", text: "only one consecutive 24-month period must be used to determine the baseline actual emissions for" },
    { cite: "40 CFR 52.21(b)(48)(ii)(D)", text: "A different consecutive 24-month period can be used" },
    { cite: "40 CFR 52.21(b)(48)(ii)(E)", text: "The average rate shall not be based on any consecutive 24-month period for which there is inadequate information" },
    { cite: "40 CFR 52.21(b)(41)(ii)(C)", text: "the unit's emissions following the project that an existing unit could have accommodated" },
    { cite: "40 CFR 52.21(a)(2)(iv)(C)", text: "A significant emissions increase of a regulated NSR pollutant is projected to occur if the sum of the difference" },
  ],
} as const;

export interface BaselineOptions {
  /** Averaging window in months. */
  window: number;
  /** Month index (see months.ts) of the first month allowed in the window, inclusive. */
  firstEligible: number;
  /** Month index of the last month allowed in the window, inclusive. */
  lastEligible: number;
  /** Month index of values[0]. */
  dataStart: number;
}

export interface BaselineWindow {
  /** Month index of the first month in the window. */
  start: number;
  /** Average annual rate per unit, tons per year. */
  perUnit: number[];
  /** Sum of the unit rates. */
  total: number;
}

/**
 * Every eligible consecutive window, oldest first. Units share one window, as
 * the rule requires for units changed by the same project. `units[u][m]` is
 * tons emitted by unit u in month m; null marks a month without adequate data,
 * and any window containing one is skipped.
 */
export function baselineWindows(units: (number | null)[][], o: BaselineOptions): BaselineWindow[] {
  if (units.length === 0 || o.window < 1) return [];
  const months = Math.max(...units.map((u) => u.length));
  const out: BaselineWindow[] = [];
  for (let s = 0; s + o.window <= months; s++) {
    const startIdx = o.dataStart + s;
    const endIdx = startIdx + o.window - 1;
    if (startIdx < o.firstEligible || endIdx > o.lastEligible) continue;
    const perUnit: number[] = [];
    let ok = true;
    for (const u of units) {
      const slice = u.slice(s, s + o.window);
      if (slice.length < o.window || slice.some((v) => v === null)) { ok = false; break; }
      perUnit.push(((slice as number[]).reduce((a, v) => a + v, 0) * 12) / o.window);
    }
    if (ok) out.push({ start: startIdx, perUnit, total: perUnit.reduce((a, v) => a + v, 0) });
  }
  return out;
}

/** The window with the highest combined rate (the latest one on a tie), or null. */
export function bestBaseline(windows: BaselineWindow[]): BaselineWindow | null {
  return windows.reduce<BaselineWindow | null>((best, w) => (!best || w.total >= best.total ? w : best), null);
}

export interface ProjectUnit {
  name: string;
  kind: "existing" | "new";
  /** Baseline actual emissions, tpy. Ignored for new units (zero for the emissions increase). */
  baseline: number;
  /** Projected actual emissions, tpy; for a new unit, its potential to emit. */
  projected: number;
  /** True when the owner elects potential to emit in place of projected actual emissions. */
  usesPte: boolean;
  /** Emissions the unit could have accommodated during the baseline period and that are unrelated to the project, tpy. */
  excluded: number;
}

export interface ProjectResult {
  perUnit: { name: string; increase: number; steps: string }[];
  /** Sum used for the comparison. */
  total: number;
  /** Whether total equals or exceeds the significance value entered. Null when none was entered. */
  significant: boolean | null;
}

const f = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

/**
 * Step 1 of project emissions accounting: the sum, over the units in the
 * project, of projected (or potential) minus baseline, less any excluded
 * emissions. New units have a baseline of zero. When `countDecreases` is
 * false, a unit whose difference is negative contributes zero.
 */
export function projectIncrease(units: ProjectUnit[], significance: number | null, countDecreases: boolean): ProjectResult {
  const perUnit = units.map((u) => {
    const base = u.kind === "new" ? 0 : u.baseline;
    const excl = u.kind === "new" || u.usesPte ? 0 : u.excluded;
    const raw = u.projected - base - excl;
    const increase = countDecreases ? raw : Math.max(0, raw);
    const steps = `${f(u.projected)} − ${f(base)}${excl ? ` − ${f(excl)}` : ""} = ${f(raw)} tpy${!countDecreases && raw < 0 ? " (counted as 0)" : ""}`;
    return { name: u.name, increase, steps };
  });
  const total = perUnit.reduce((a, u) => a + u.increase, 0);
  return { perUnit, total, significant: significance === null ? null : total >= significance };
}
