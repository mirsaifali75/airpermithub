import type { Family } from "./units";

/** One input of a calculation. Values reach `compute` in the family's SI base unit. */
export interface InputDef {
  id: string;
  label: string;
  /** Symbol used in the formulas, e.g. "ṁ" or "T₁". */
  sym?: string;
  family: Family;
  /** Unit shown first, and the unit the Excel workbook uses for this cell. */
  unit: string;
  /** Leave blank to solve for it (only where the section says so). */
  solvable?: boolean;
  optional?: boolean;
  help?: string;
  /** A pick list instead of a number box; the value is the option's number. */
  choices?: { value: number; label: string }[];
  /** Allowed range in SI base units; outside it the input is flagged. */
  min?: number;
  max?: number;
}

/** A table input, e.g. a list of water users. */
export interface ListDef {
  id: string;
  label: string;
  columns: { id: string; label: string; family?: Family; unit?: string; text?: boolean }[];
  maxRows: number;
}

export interface Step {
  label: string;
  /** The formula in symbols. */
  formula?: string;
  /** The formula with numbers substituted, ending in the result. */
  work: string;
}

export interface Result {
  id: string;
  label: string;
  family: Family;
  /** SI base value. */
  value: number;
  /** Units to show, first is the main one. */
  show: string[];
  /** Marks the answer the section exists for. */
  key?: boolean;
}

export interface Outcome {
  steps: Step[];
  results: Result[];
  warnings: string[];
  /** Set when the inputs cannot produce a result; steps/results may be partial. */
  error?: string;
  /** Which input was solved for, when the section solves for a blank. */
  solved?: string;
}

export type Values = Record<string, number | null>;
export type ListRows = Record<string, (string | number | null)[][]>;

export interface Example {
  /** What the example shows, one sentence. */
  title: string;
  /** Values in the stated units. Missing ids stay blank. */
  values: Record<string, [number, string] | null>;
  lists?: ListRows;
}

export interface SectionDef {
  id: string;
  title: string;
  /** What question it answers. */
  question: string;
  /** Formulas shown above the inputs. */
  formulas: string[];
  inputs: InputDef[];
  list?: ListDef;
  /** "Leave one of these blank" note, when the section solves for a blank. */
  solveNote?: string;
  example: Example;
  compute: (v: Values, lists: ListRows) => Outcome;
  /** References for this section (title and URL). */
  refs: { title: string; url: string }[];
}

export interface UtilityDef {
  slug: string;
  name: string;
  short: string;
  /** The everyday question. */
  problem: string;
  description: string;
  keywords: string;
  sections: SectionDef[];
  /** Sheet name in the Excel workbook. */
  sheet: string;
  notes: string[];
}
