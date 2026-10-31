/**
 * Emission factor records.
 *
 * Every factor in the planned AirPermitHub factor library will take this
 * shape. The library starts empty on purpose: a factor is added only after it
 * has been copied from its official source and approved through the review
 * pipeline (detect, flag, human review, approve, version, publish). Until
 * then users cite their own factors, and can keep the ones they reuse in this
 * browser as "My factors", in the same shape so they carry over to accounts.
 */

import { csvLines } from "../csv";

export interface FactorVersion {
  version: number;
  date: string;
  change: string;
}

export interface EmissionFactorRecord {
  id: string;
  origin: "library" | "user";
  /** Calculator method and factor field the value fits, e.g. "engines" / "ef". */
  method: string;
  factorKey: string;
  sourceCategory: string;
  pollutant: string;
  value: number;
  units: string;
  referenceDocument: string;
  sectionTable: string;
  revisionDate: string;
  url: string;
  rating: string;
  notes: string;
  /** Review history for library records; empty for factors a user saved. */
  versions: FactorVersion[];
}

/** Field labels, in the order the library and exports show them. */
export const factorRecordFields: { key: keyof EmissionFactorRecord; label: string }[] = [
  { key: "sourceCategory", label: "Source category" },
  { key: "pollutant", label: "Pollutant" },
  { key: "value", label: "Factor value" },
  { key: "units", label: "Units" },
  { key: "referenceDocument", label: "Reference document" },
  { key: "sectionTable", label: "Section / table" },
  { key: "revisionDate", label: "Publication or revision date" },
  { key: "url", label: "Official URL" },
  { key: "rating", label: "Rating / quality" },
  { key: "notes", label: "Notes" },
  { key: "versions", label: "Version history" },
];

/** Reviewed factors. Empty until factors pass the review pipeline; nothing here is invented. */
export const factorLibrary: EmissionFactorRecord[] = [];

/** Factors the user saved, kept in this browser until accounts launch. */
export const MY_FACTORS_STORE = "aph.calc.factors.v1";

/** Saved and library factors that fit one factor field of one calculator. */
export function factorsFor(records: EmissionFactorRecord[], method: string, factorKey: string, units: string) {
  return records.filter((r) => r.method === method && r.factorKey === factorKey && r.units === units);
}

/** Two records describe the same factor when value, units, pollutant, and reference all match. */
export const sameFactor = (a: EmissionFactorRecord, b: EmissionFactorRecord) =>
  a.method === b.method && a.factorKey === b.factorKey && a.value === b.value && a.units === b.units && a.pollutant === b.pollutant
  && a.referenceDocument.trim() === b.referenceDocument.trim() && a.sectionTable.trim() === b.sectionTable.trim();

export function factorsCsv(records: EmissionFactorRecord[]) {
  const head = ["Calculator", ...factorRecordFields.map((f) => f.label), "Origin"];
  const rows = records.map((r) => [
    r.method,
    ...factorRecordFields.map((f) => (f.key === "versions" ? r.versions.map((v) => `v${v.version} ${v.date}: ${v.change}`).join("; ") : r[f.key])),
    r.origin === "library" ? "AirPermitHub library" : "Saved by you",
  ]);
  return csvLines([head, ...rows]);
}
