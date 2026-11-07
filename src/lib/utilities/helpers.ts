import type { Outcome, Result, Step, Values } from "./types";
import { fmt, fromSI, unitOf, type Family } from "./units";

/** "12.3 kg/h" from an SI value. */
export const q = (v: number, family: Family, unit: string, sig = 4) => {
  const u = unitOf(family, unit);
  return `${fmt(fromSI(family, unit, v), sig)}${u.label ? ` ${u.label}` : ""}`;
};

export class Calc {
  steps: Step[] = [];
  results: Result[] = [];
  warnings: string[] = [];
  solved?: string;
  constructor(public v: Values) {}
  step(label: string, work: string, formula?: string) {
    this.steps.push({ label, work, formula });
  }
  result(id: string, label: string, family: Family, value: number, show: string[], key = false) {
    if (Number.isFinite(value)) this.results.push({ id, label, family, value, show, key });
  }
  warn(w: string) {
    this.warnings.push(w);
  }
  /** Ids among `ids` that are blank. */
  blank(...ids: string[]) {
    return ids.filter((i) => this.v[i] === null || this.v[i] === undefined);
  }
  done(error?: string): Outcome {
    return { steps: this.steps, results: this.results, warnings: this.warnings, error, solved: this.solved };
  }
  /** Ends with an error naming the blank required inputs. */
  missing(ids: string[], labels: Record<string, string>) {
    return this.done(`Enter ${ids.map((i) => labels[i] ?? i).join(", ")}.`);
  }
  n(id: string) {
    return this.v[id] as number;
  }
}

export const labelsOf = (inputs: { id: string; label: string }[]) => Object.fromEntries(inputs.map((i) => [i.id, i.label]));

/** Pressure, kPa abs → MPa for IF97. */
export const MPa = (kPa: number) => kPa / 1000;
export const K = (c: number) => c + 273.15;
