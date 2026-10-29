/**
 * Splits permit text into conditions and suggests a type, frequency, and
 * citations for each one, for a compliance matrix. Everything here is a
 * keyword suggestion for a person to confirm; it never decides what a
 * condition requires.
 */

export const conditionTypes = ["Limit", "Monitoring", "Testing", "Recordkeeping", "Reporting", "Certification", "LDAR", "Inspection", "Work practice"] as const;
export type ConditionType = (typeof conditionTypes)[number];

export const frequencies = [
  "12-month rolling", "Continuous", "Daily", "Weekly", "Monthly", "Quarterly", "Semiannual", "Annual", "Multi-year", "Event-driven", "One-time", "Not stated",
] as const;
export type Frequency = (typeof frequencies)[number];

export interface ParsedCondition {
  /** Condition number as written, or a sequence number when none was found. */
  ref: string;
  text: string;
  types: ConditionType[];
  frequencies: Frequency[];
  citations: string[];
  /** Deadline phrases quoted from the condition, such as "within 30 days". */
  deadlines: string[];
}

const typeRules: [ConditionType, RegExp][] = [
  ["Limit", /\b(shall not exceed|not to exceed|shall be limited|limited to|no more than|shall not emit|emission limits?|lbs?\/hr|tons? per year|tpy|ppmv?d?|lb\/MMBtu|g\/b?hp-hr|opacity)\b/i],
  ["Monitoring", /\b(monitor(s|ed|ing)?|CEMS|COMS|CPMS|PEMS|continuous(ly)? (measure|record|monitor)|meter(ed|s)?|parametric|visible emissions?|opacity observations?|Method (9|22))\b/i],
  ["Testing", /\b(performance test(s|ing)?|stack test(s|ing)?|source test(s|ing)?|compliance test(s|ing)?|initial test|retest|(EPA |Reference )?Method (?!9\b|22\b)\d+[A-Z]?)\b/i],
  ["Recordkeeping", /\b(record(s|ed|keeping)?|logs?|logbook|retain(ed)?|maintain(ed)? (a |the )?(file|copy))\b/i],
  ["Reporting", /\b(report(s|ed|ing)?|submit(s|ted|tal)?|notif(y|ied|ication|ications))\b/i],
  ["Certification", /\b(certif(y|ied|ies|ication|ications)|responsible official)\b/i],
  ["LDAR", /\b(LDAR|leak detection|leaks?|fugitive emissions? (components?|monitoring|surveys?)|Method 21|optical gas imaging|OGI)\b/i],
  ["Inspection", /\b(inspect(s|ed|ion|ions)?|AVO|audio,? visual,? (and|or) olfactory)\b/i],
  ["Work practice", /\b(operated? and maintained|good (air pollution control|engineering) practices?|work practices?|manufacturer'?s? (recommend\w*|instructions?|specifications?|written)|shall (be )?(install(ed)?|equip(ped)?))\b/i],
];

const freqRules: [Frequency, RegExp][] = [
  ["12-month rolling", /\b(12|twelve)[- ]month rolling|rolling (12|twelve)[- ]month\b/i],
  ["Continuous", /\bcontinuous(ly)?\b/i],
  ["Daily", /\b(daily|each (operating )?day|every day|once per day)\b/i],
  ["Weekly", /\b(weekly|each week|every week|once per week)\b/i],
  ["Monthly", /\b(monthly|each (calendar )?month|every month|once per month)\b/i],
  ["Quarterly", /\b(quarterly|each (calendar )?quarter|every quarter|once per quarter)\b/i],
  ["Semiannual", /\b(semi-?annual(ly)?|every six months|six-month|twice (per|a|each) (calendar )?year)\b/i],
  ["Annual", /\b(annual(ly)?|each (calendar )?year|every year|yearly|once per (calendar )?year)\b/i],
  ["Multi-year", /\bevery (\d+|two|three|four|five|eight|ten) years\b/i],
  ["One-time", /\b(initial (performance )?test|one[- ]time|within \d+ days (after|of) (startup|initial startup|issuance))\b/i],
  ["Event-driven", /\b(within \d+ (business |calendar |working )?(hours?|days?)|upon (discovery|detection|request|startup)|each time|whenever|prior to|in the event)\b/i],
];

const citationRe = [
  /\b40\s*C\.?F\.?R\.?\s*(?:Part\s*)?\d+(?:\.\d+[a-z]*)?(?:\s*\([a-z0-9]+\))*/gi,
  /§+\s*\d+\.\d+[a-z]*(?:\([a-z0-9]+\))*/g,
  /\bSubparts?\s+[A-Z]{1,5}a?\b/g,
  /\b30\s*TAC\s*(?:§+\s*)?(?:Chapter\s*)?\d+(?:\.\d+)?/gi,
  /\b20\.2\.\d+(?:\.\d+)?\s*NMAC\b/gi,
];

const deadlineRe = /\b(within \d+ (business |calendar |working )?(hours?|days?|months?)( (after|of|following|from) [^,.;]{3,60})?|no later than [^,.;]{3,60}|postmarked by [^,.;]{3,40})/gi;

// A condition starts with a number such as "1.", "3.1.2", "A.", "B.2", "(a)", or "Condition 5".
const startRe = [
  /^((?:Special |General |Permit )?Condition\s+(?:No\.\s*)?[A-Z0-9][\w.-]*)[.:)]?\s+/i,
  /^([1-9]\d{0,2}(?:\.\d{1,3}){1,4}\.?)\s+/,
  /^([1-9]\d{0,2}[.)])\s+/,
  /^([A-Z](?:\.\d{1,3}){1,4}\.?)\s+/,
  /^([A-Z][.)])\s+/,
];
const subRe = /^(\((?:[a-z]{1,4}|\d{1,3}|[A-Z])\))\s+/;
const noiseRe = /^(page \d+( of \d+)?|\d+ of \d+|-\s*\d+\s*-)$/i;

const unique = <T,>(xs: T[]) => [...new Set(xs)];

export function classify(text: string): Pick<ParsedCondition, "types" | "frequencies" | "citations" | "deadlines"> {
  const types = typeRules.filter(([, re]) => re.test(text)).map(([t]) => t);
  const freqs = freqRules.filter(([, re]) => re.test(text)).map(([f]) => f);
  const citations = unique(citationRe.flatMap((re) => text.match(re) ?? []).map((c) => c.replace(/\s+/g, " ").trim()));
  const deadlines = unique((text.match(deadlineRe) ?? []).map((d) => d.trim()));
  return { types, frequencies: freqs.length ? freqs : ["Not stated"], citations, deadlines };
}

/**
 * Splits pasted permit text into conditions. Lines that do not start a new
 * condition are joined to the one before. With `splitSubitems`, "(a)" style
 * sub-items become their own rows, numbered under their parent.
 */
export function parsePermitText(raw: string, { splitSubitems = false } = {}): ParsedCondition[] {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && !noiseRe.test(l));
  const rows: { ref: string; parts: string[] }[] = [];
  let parent = "";
  for (const line of lines) {
    const top = startRe.map((re) => line.match(re)).find(Boolean);
    const sub = !top && splitSubitems ? line.match(subRe) : null;
    if (top) {
      parent = top[1].replace(/[.:)]$/, "");
      rows.push({ ref: parent, parts: [line.slice(top[0].length)] });
    } else if (sub) {
      rows.push({ ref: `${parent || rows.length + 1}${sub[1]}`, parts: [line.slice(sub[0].length)] });
    } else if (rows.length) {
      rows[rows.length - 1].parts.push(line);
    } else {
      rows.push({ ref: "Preamble", parts: [line] });
    }
  }
  return rows.map((r, i) => {
    const text = r.parts.join(" ").trim();
    return { ref: r.ref || String(i + 1), text, ...classify(text) };
  });
}

/** Short title for a calendar task: the condition number and its first words. */
export function conditionTitle(c: Pick<ParsedCondition, "ref" | "text">, max = 70) {
  const first = c.text.split(/(?<=[.;:])\s/)[0];
  const short = first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
  return `${c.ref}: ${short}`;
}

/** How many occurrences in the next 12 months a frequency produces, and the month step between them. */
export function recurrence(f: Frequency): { count: number; stepMonths: number } | null {
  switch (f) {
    case "Monthly":
    case "12-month rolling":
      return { count: 12, stepMonths: 1 };
    case "Quarterly":
      return { count: 4, stepMonths: 3 };
    case "Semiannual":
      return { count: 2, stepMonths: 6 };
    case "Annual":
    case "Multi-year":
    case "Event-driven":
    case "One-time":
    case "Not stated":
      return { count: 1, stepMonths: 12 };
    default:
      return null; // continuous, daily, weekly: too frequent for calendar entries
  }
}

/** Adds whole months to a YYYY-MM-DD date, clamping to the last day of the month. */
export function addMonthsToDate(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

/** Compliance-calendar category for a condition's types. */
export function calendarCategory(types: ConditionType[]): "Testing" | "Reporting" | "Certification" | "LDAR" | "Inspection" | "Monitoring" | "Recordkeeping" {
  const order = ["Testing", "Certification", "Reporting", "LDAR", "Inspection", "Monitoring", "Recordkeeping"] as const;
  return order.find((t) => types.includes(t)) ?? "Recordkeeping";
}
