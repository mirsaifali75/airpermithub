/** Month arithmetic on "YYYY-MM" strings, and parsing of values pasted from a spreadsheet. */

export const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};

export const monthFromIndex = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

export const addMonths = (ym: string, n: number) => monthFromIndex(monthIndex(ym) + n);

export const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** The current month as "YYYY-MM" in local time. */
export const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const toNumber = (cell: string): number | null => {
  const s = cell.trim().replace(/[,\s$]/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Reads one value per line from text pasted out of Excel or Google Sheets.
 * When a line has several tab-separated cells, the last one is the value, so
 * a "month <tab> value" pair pastes cleanly. Blank cells become null (no
 * data); header lines before the first number are dropped, and so are blank
 * lines at the end.
 */
export function parsePastedColumn(text: string): (number | null)[] {
  const cells = text.replace(/\r/g, "").split("\n").map((line) => line.split("\t").at(-1) ?? "");
  const values = cells.map(toNumber);
  let start = 0;
  while (start < values.length && (values[start] === null || Number.isNaN(values[start]))) start++;
  let end = values.length;
  while (end > start && values[end - 1] === null) end--;
  return values.slice(start, end).map((v) => (v === null || Number.isNaN(v) ? null : v));
}

/**
 * Reads a pasted block with one row per month and one column per unit.
 * Leading non-numeric columns (such as a month label) are dropped when every
 * row has them; header rows before the first numeric row are dropped.
 */
export function parsePastedTable(text: string): (number | null)[][] {
  const rows = text.replace(/\r/g, "").split("\n").map((line) => line.split("\t"));
  const numericRow = (r: string[]) => r.some((c) => { const n = toNumber(c); return n !== null && !Number.isNaN(n); });
  let start = 0;
  while (start < rows.length && !numericRow(rows[start])) start++;
  let end = rows.length;
  while (end > start && rows[end - 1].every((c) => c.trim() === "")) end--;
  const body = rows.slice(start, end);
  if (body.length === 0) return [];
  // Drop label columns: a column is a label column if no row has a number in it.
  const width = Math.max(...body.map((r) => r.length));
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    if (body.some((r) => { const n = toNumber(r[c] ?? ""); return n !== null && !Number.isNaN(n); })) keep.push(c);
  }
  return body.map((r) => keep.map((c) => { const n = toNumber(r[c] ?? ""); return n === null || Number.isNaN(n) ? null : n; }));
}
