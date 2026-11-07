import { compressedAir } from "./calcs/air";
import { chilledWater } from "./calcs/chilled";
import { coolingWater } from "./calcs/cooling";
import { nitrogen } from "./calcs/nitrogen";
import { processWater } from "./calcs/process";
import { steam } from "./calcs/steam";
import { thermalFluid } from "./calcs/thermal";
import type { ListRows, Outcome, SectionDef, UtilityDef, Values } from "./types";
import { toSI } from "./units";

export const utilities: UtilityDef[] = [steam, coolingWater, chilledWater, processWater, compressedAir, nitrogen, thermalFluid];

export const getUtility = (slug: string) => utilities.find((u) => u.slug === slug);

export const UTIL_BASE = "/tools/utility-calculators";

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

/** Converts the form to SI and runs the section. Flags inputs outside their allowed range. */
export function runSection(s: SectionDef, st: SectionState): Outcome & { si: Values } {
  const si: Values = {};
  const range: string[] = [];
  for (const i of s.inputs) {
    const e = st.entries[i.id];
    if (!e || e.v === null || e.v === undefined || !Number.isFinite(e.v)) {
      si[i.id] = null;
      continue;
    }
    const x = i.choices ? e.v : toSI(i.family, e.u || i.unit, e.v);
    si[i.id] = x;
    if ((i.min !== undefined && x < i.min - 1e-12) || (i.max !== undefined && x > i.max + 1e-12)) range.push(i.label);
  }
  let out: Outcome;
  try {
    out = s.compute(si, st.lists ?? {});
  } catch (e) {
    out = { steps: [], results: [], warnings: [], error: (e as Error).message };
  }
  if (range.length) out = { ...out, warnings: [`Outside the expected range: ${range.join(", ")}. Check the value and its unit.`, ...out.warnings] };
  return { ...out, si };
}

/** Storage key for one utility's form. */
export const storageKey = (slug: string) => `aph.tools.utilities.${slug}.v1`;
