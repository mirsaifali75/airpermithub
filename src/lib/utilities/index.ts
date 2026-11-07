import { compressedAir } from "./calcs/air";
import { chilledWater } from "./calcs/chilled";
import { coolingWater } from "./calcs/cooling";
import { nitrogen } from "./calcs/nitrogen";
import { processWater } from "./calcs/process";
import { steam } from "./calcs/steam";
import { thermalFluid } from "./calcs/thermal";
import { oilGasCalcs } from "./oilgas";
import { OILGAS_WORKBOOK_PATH, WORKBOOK_PATH } from "./workbook-layout";
import type { InputDef, ListRows, Outcome, SectionDef, UtilityDef, Values } from "./types";
import { fmt, fromSI, toSI, unitOf, type Family } from "./units";

export const utilities: UtilityDef[] = [steam, coolingWater, chilledWater, processWater, compressedAir, nitrogen, thermalFluid];
export { oilGasCalcs };

export const UTIL_BASE = "/tools/utility-calculators";
export const OILGAS_BASE = "/tools/oil-gas-calculators";

/** A family of calculators that shares one hub page, one Excel workbook, and one unit preference. */
export interface Collection {
  id: "plant" | "oil-gas";
  name: string;
  base: string;
  workbook: string;
  /** Prefix for exported file names. */
  file: string;
  list: UtilityDef[];
  /** Units shown first: plant calculators start in metric, oil and gas in oilfield (US) units. */
  system: "metric" | "us";
}

export const COLLECTIONS: Collection[] = [
  { id: "plant", name: "Plant Utility Calculators", base: UTIL_BASE, workbook: WORKBOOK_PATH, file: "plant-utilities", list: utilities, system: "metric" },
  { id: "oil-gas", name: "Oil and Gas Engineering Calculators", base: OILGAS_BASE, workbook: OILGAS_WORKBOOK_PATH, file: "oil-gas-calculators", list: oilGasCalcs, system: "us" },
];

const ALL = COLLECTIONS.flatMap((c) => c.list);
export const getUtility = (slug: string) => ALL.find((u) => u.slug === slug);
export const collectionOf = (slug: string) => COLLECTIONS.find((c) => c.list.some((u) => u.slug === slug)) ?? COLLECTIONS[0];

/** One input as kept in the form: what was typed, as a number or null, and its unit. */
export interface Entry {
  v: number | null;
  u: string;
}
export interface SectionState {
  entries: Record<string, Entry>;
  lists: ListRows;
  example?: boolean;
}

export const blankSection = (s: SectionDef): SectionState => ({
  entries: Object.fromEntries(s.inputs.map((i) => [i.id, { v: i.choices ? i.choices[0].value : null, u: i.unit }])),
  lists: s.list ? { [s.list.id]: [s.list.columns.map(() => null)] } : {},
});

export const exampleSection = (s: SectionDef): SectionState => {
  const st = blankSection(s);
  for (const [id, val] of Object.entries(s.example.values)) {
    if (val && st.entries[id]) st.entries[id] = { v: val[0], u: val[1] };
  }
  return { entries: st.entries, lists: s.example.lists ? JSON.parse(JSON.stringify(s.example.lists)) : st.lists, example: true };
};

const POSITIVE = new Set<Family>(["pabs", "mflow", "vflow", "gasflow", "cp", "hspec", "hv", "rho", "visc", "diam", "area", "volume", "uval", "mudwt"]);

const bounds = (i: InputDef) => {
  const show = (x: number) => `${fmt(fromSI(i.family, i.unit, x), 4)}${unitOf(i.family, i.unit).label ? " " + unitOf(i.family, i.unit).label : ""}`;
  if (i.min !== undefined && i.max !== undefined) return `between ${show(i.min)} and ${show(i.max)}`;
  return i.min !== undefined ? `at least ${show(i.min)}` : `no more than ${show(i.max as number)}`;
};

/** Converts the form to SI and runs the section. Flags inputs outside their allowed range. */
export function runSection(s: SectionDef, st: SectionState): Outcome & { si: Values } {
  const si: Values = {};
  const range: InputDef[] = [];
  const hard: InputDef[] = [];
  for (const i of s.inputs) {
    const e = st.entries[i.id];
    if (!e || e.v === null || e.v === undefined || !Number.isFinite(e.v)) {
      si[i.id] = null;
      continue;
    }
    const x = i.choices ? e.v : toSI(i.family, e.u || i.unit, e.v);
    si[i.id] = x;
    if ((i.min !== undefined && x < i.min - 1e-12) || (i.max !== undefined && x > i.max + 1e-12)) (i.soft ? range : hard).push(i);
  }
  if (hard.length)
    return { steps: [], results: [], warnings: [], error: hard.map((i) => `${i.label} must be ${bounds(i)}.`).join(" ") + " Check the value and its unit.", si };
  // Quantities that cannot be zero or negative when entered.
  const positive = s.inputs.filter((i) => POSITIVE.has(i.family) && !i.optional && si[i.id] !== null && !((si[i.id] as number) > 0));
  if (positive.length) return { steps: [], results: [], warnings: [], error: `${positive.map((i) => i.label).join(", ")} must be greater than zero.`, si };
  const over = s.inputs.filter((i) => i.family === "pct" && /efficiency/i.test(i.label) && si[i.id] !== null && !((si[i.id] as number) > 0 && (si[i.id] as number) <= 100));
  if (over.length) return { steps: [], results: [], warnings: [], error: `${over.map((i) => i.label).join(", ")} must be more than 0 % and no more than 100 %.`, si };
  let out: Outcome;
  try {
    out = s.compute(si, st.lists ?? {});
  } catch (e) {
    out = { steps: [], results: [], warnings: [], error: (e as Error).message };
  }
  if (!out.error && out.results.length === 0) out = { ...out, error: "These inputs do not give a result. Check for a zero or out-of-range value." };
  if (range.length) out = { ...out, warnings: [`Outside the usual range: ${range.map((i) => `${i.label} (usually ${bounds(i)})`).join(", ")}. Check the value and its unit.`, ...out.warnings] };
  return { ...out, si };
}

/** Storage key for one utility's form. */
export const storageKey = (slug: string) => `aph.tools.utilities.${slug}.v1`;
