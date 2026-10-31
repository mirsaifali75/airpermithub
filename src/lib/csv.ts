/**
 * One CSV format for every export: RFC 4180 quoting, CRLF line ends, and a
 * guard so text that starts like a spreadsheet formula opens as plain text.
 */

const plainNumber = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

export const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !plainNumber.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
};

export const csvLines = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

/** Today in the visitor's time zone, as YYYY-MM-DD. */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A worksheet export: template label, export date, then the rows. */
export const toCsv = (title: string, rows: unknown[][], exported = localDate()) =>
  csvLines([[`AirPermitHub Template: ${title} (not an agency form)`], ["Exported", exported], ...rows]);

/** airpermithub-<parts>-<date>.csv, with each part reduced to lowercase letters, digits, and dashes. */
export const csvFileName = (...parts: (string | undefined)[]) =>
  `airpermithub-${[...parts, localDate()].map((p) => (p ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean).join("-")}.csv`;
