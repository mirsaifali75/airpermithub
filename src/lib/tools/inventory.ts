import { toCsv } from "../csv";

/**
 * Annual emission inventory arithmetic. The user supplies activity, the
 * emission factor (in pounds per unit of activity) and its source; this module
 * multiplies, applies control, converts to tons, and totals. No factors are
 * built in.
 */

export const LB_PER_TON = 2000;
export const invPollutants = ["NOx", "CO", "VOC", "SO2", "PM10", "PM2.5", "PM", "HAP", "CO2", "CH4", "N2O", "Other"] as const;
export type InvPollutant = (typeof invPollutants)[number];

export interface InvRow {
  id: string;
  unit: string;
  description: string;
  pollutant: InvPollutant;
  /** HAP name, or the pollutant name when pollutant is "Other". */
  name: string;
  activity: number | null;
  activityUnits: string;
  /** Pounds of pollutant per unit of activity. */
  factor: number | null;
  factorSource: string;
  /** Percent. */
  control: number | null;
  /** The control operated as the factor or test assumes. */
  controlApplies: boolean;
  /** tpy from another method (CEMS, test, mass balance); used instead of the factor calculation when entered. */
  otherTpy: number | null;
  method: string;
}

const has = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });

export interface InvResult { tpy: number | null; steps: string; problems: string[] }

export function invRow(r: InvRow): InvResult {
  const problems: string[] = [];
  if (has(r.otherTpy) && r.otherTpy < 0) return { tpy: null, steps: "Emissions cannot be negative.", problems: ["The other-method value is negative, so the row is left out of the totals until it is corrected."] };
  if (has(r.otherTpy)) {
    if (has(r.factor)) problems.push("Both a factor and an other-method value are entered; the other-method value is used.");
    return { tpy: r.otherTpy, steps: `${fmt(r.otherTpy)} tpy by ${r.method.trim() || "another method"}`, problems };
  }
  if (!has(r.activity) || !has(r.factor)) return { tpy: null, steps: "Enter activity and an emission factor, or a value from another method.", problems };
  if (r.activity < 0 || r.factor < 0) return { tpy: null, steps: "Activity and factor cannot be negative.", problems: ["Activity or factor is negative, so the row is left out of the totals until it is corrected."] };
  let lb = r.activity * r.factor;
  const u = r.activityUnits.trim() || "units";
  let steps = `${fmt(r.activity)} ${u} × ${fmt(r.factor)} lb/${u.replace(/\/(yr|year)$/i, "")}`;
  if (has(r.control) && r.control !== 0) {
    if (r.control < 0 || r.control > 100) problems.push("Control efficiency must be between 0 and 100 percent.");
    else if (!r.controlApplies) problems.push("Control not marked as applying, so it is not taken.");
    else { lb *= 1 - r.control / 100; steps += ` × (1 − ${fmt(r.control)}%)`; }
  }
  const tpy = lb / LB_PER_TON;
  return { tpy, steps: `${steps} ÷ ${fmt(LB_PER_TON)} lb/ton = ${fmt(tpy)} tpy`, problems };
}

const label = (r: InvRow) => (r.pollutant === "HAP" ? `HAP: ${r.name.trim() || "unspeciated"}` : r.pollutant === "Other" ? r.name.trim() || "Other" : r.pollutant);
const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function invSummary(rows: InvRow[]) {
  const totals = new Map<string, { label: string; tpy: number; rows: number }>();
  const haps = new Map<string, { label: string; tpy: number }>();
  let hapTotal = 0;
  let incomplete = 0;
  for (const r of rows) {
    const x = invRow(r);
    if (x.tpy === null) { incomplete++; continue; }
    const name = r.pollutant === "HAP" ? "All HAP" : label(r);
    const k = key(name);
    const t = totals.get(k) ?? { label: name, tpy: 0, rows: 0 };
    t.tpy += x.tpy; t.rows++;
    totals.set(k, t);
    if (r.pollutant === "HAP") {
      hapTotal += x.tpy;
      const hk = key(r.name) || "(unspeciated)";
      const h = haps.get(hk) ?? { label: r.name.trim() || "Unspeciated", tpy: 0 };
      h.tpy += x.tpy;
      haps.set(hk, h);
    }
  }
  const order = (l: string) => { const i = invPollutants.indexOf(l as InvPollutant); return i < 0 ? 99 : i; };
  return {
    totals: [...totals.values()].sort((a, b) => order(a.label === "All HAP" ? "HAP" : a.label) - order(b.label === "All HAP" ? "HAP" : b.label)),
    haps: [...haps.values()].sort((a, b) => b.tpy - a.tpy),
    hapTotal,
    incomplete,
  };
}

export function invCsv(rows: InvRow[], facility: string, year: string): string {
  const s = invSummary(rows);
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  return toCsv("Emission Inventory (working template; submit on your agency's forms)", [
    ["Facility", facility],
    ["Inventory year", year],
    [],
    ["Unit", "Description", "Pollutant", "HAP / pollutant name", "Activity", "Activity units", "Emission factor (lb per activity unit)", "Factor source", "Control (%)", "Control applies", "Other-method value (tpy)", "Method", "Actual emissions (tpy)", "Calculation", "Problems"],
    ...rows.map((r) => {
      const x = invRow(r);
      return [r.unit, r.description, r.pollutant, r.name, r.activity ?? "", r.activityUnits, r.factor ?? "", r.factorSource, r.control ?? "", r.controlApplies ? "Yes" : "No", r.otherTpy ?? "", r.method, x.tpy === null ? "" : r4(x.tpy), x.steps, x.problems.join(" ")];
    }),
    [],
    ["Pollutant", "Total actual emissions (tpy)", "Rows"],
    ...s.totals.map((t) => [t.label, r4(t.tpy), t.rows]),
    [],
    ["HAP", "Total actual emissions (tpy)"],
    ...s.haps.map((h) => [h.label, r4(h.tpy)]),
  ]);
}
