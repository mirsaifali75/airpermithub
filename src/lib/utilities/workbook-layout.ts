/**
 * How the plant utility workbook is laid out, shared by the site's Excel
 * import/export and by scripts/workbooks/build_utilities.py (which reads the
 * same rules from scripts/workbooks/utilities-spec.json).
 *
 * Every row the site reads or writes carries a key in column F:
 *   in:<utility>.<section>.<input>      value in B, unit label in C
 *   list:<utility>.<section>.<list>.<n> list row n (0-based), columns A–D
 *   out:<utility>.<section>.<result>    formula result in B, unit label in C
 */
export const WORKBOOK_PATH = "/workbooks/airpermithub-plant-utilities.xlsx";
export const OILGAS_WORKBOOK_PATH = "/workbooks/airpermithub-oil-gas-calculators.xlsx";
export const KEY_COL = 6;
export const LIST_ROWS = 25;

export type Key =
  | { kind: "in"; slug: string; section: string; id: string }
  | { kind: "list"; slug: string; section: string; id: string; row: number }
  | { kind: "out"; slug: string; section: string; id: string };

export const inKey = (slug: string, section: string, id: string) => `in:${slug}.${section}.${id}`;
export const outKey = (slug: string, section: string, id: string) => `out:${slug}.${section}.${id}`;
export const listKey = (slug: string, section: string, id: string, row: number) => `list:${slug}.${section}.${id}.${row}`;

export function parseKey(raw: unknown): Key | null {
  if (typeof raw !== "string") return null;
  const m = /^(in|out|list):([a-z0-9-]+)\.([a-z0-9-]+)\.([A-Za-z0-9_]+)(?:\.(\d+))?$/.exec(raw.trim());
  if (!m) return null;
  const [, kind, slug, section, id, row] = m;
  if (kind === "list") return row === undefined ? null : { kind, slug, section, id, row: Number(row) };
  if (row !== undefined) return null;
  return { kind: kind as "in" | "out", slug, section, id };
}
