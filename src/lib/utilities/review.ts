/**
 * Reviews any spreadsheet's formulas: error values, broken references,
 * formulas that read blank cells, numbers stored as text, and hard-coded
 * constants (with what the common engineering ones mean and when they stop
 * being valid). Works on a plain cell list so it can be tested without a
 * spreadsheet library; src/lib/utilities/xlsx.ts builds the list from a file.
 */

export interface CellModel {
  sheet: string;
  /** A1-style address. */
  address: string;
  /** The cell's value, or for a formula its last calculated result. */
  value: string | number | boolean | null;
  formula?: string;
  /** Error value such as #DIV/0!, from the cell or its cached result. */
  error?: string;
}

export type IssueKind = "error" | "broken-ref" | "blank-ref" | "constant" | "hardcoded" | "text-number";

export interface Issue {
  kind: IssueKind;
  sheet: string;
  address: string;
  /** The row's label (first text cell to the left), to say what the cell is. */
  label?: string;
  formula?: string;
  message: string;
  severity: "high" | "medium" | "info";
}

export interface ReviewReport {
  sheets: { name: string; cells: number; formulas: number }[];
  issues: Issue[];
  counts: Record<IssueKind, number>;
}

interface Known {
  values: number[];
  meaning: string;
  caution?: string;
}

/** Engineering constants people type into utility spreadsheets, with what they assume. */
export const KNOWN_CONSTANTS: Known[] = [
  { values: [500], meaning: "the US water shortcut Btu/h = 500 × gpm × ΔT (°F), from 8.33 lb/gal × 60 min/h × 1 Btu/lb·°F", caution: "It holds for water near 60–70 °F only. Hot water, glycol, or brine need density × specific heat at the actual temperature." },
  { values: [24], meaning: "either hours per day, or the chilled water shortcut tons = gpm × ΔT (°F) ÷ 24", caution: "The ÷ 24 shortcut is for plain water; glycol needs a correction." },
  { values: [12000, 12], meaning: "Btu/h per ton of refrigeration (12,000 Btu/h = 3.517 kW)" },
  { values: [3.517, 3.516, 3.5168, 3.51685, 0.2843], meaning: "kW per ton of refrigeration (or tons per kW)" },
  { values: [4.18, 4.186, 4.187, 4.1868, 4.184, 4.19, 4.2], meaning: "water's specific heat in kJ/kg·K (or the calorie conversion 4.1868)", caution: "Water's cp runs from about 4.22 at 0 °C to 4.18 at 30–40 °C and 4.22 again near 100 °C. Fine for cooling water; check it for hot water or other fluids." },
  { values: [1, 0.999, 0.998], meaning: "possibly water's specific heat in Btu/lb·°F or kcal/kg·°C, or specific gravity" },
  { values: [1.08, 1.1], meaning: "the air sensible heat shortcut Btu/h = 1.08 × cfm × ΔT (°F) for standard air", caution: "Only for air at standard density; correct for altitude and temperature." },
  { values: [4.5, 4.45], meaning: "the air enthalpy shortcut Btu/h = 4.5 × cfm × Δh (Btu/lb), standard air" },
  { values: [0.00085, 0.0008, 0.0009, 0.001], meaning: "a cooling tower evaporation rule of thumb (fraction of circulation per °F of range)", caution: "It assumes nearly all heat leaves by evaporation. An energy balance with latent heat at the water temperature is more defensible." },
  { values: [8.33, 8.34, 8.345], meaning: "pounds per US gallon of water", caution: "Changes with temperature (8.24 lb/gal at 140 °F)." },
  { values: [62.4, 62.37, 62.43], meaning: "water density in lb/ft³", caution: "Changes with temperature." },
  { values: [1000, 998, 997], meaning: "water density in kg/m³, or a unit scale factor (k, m)", caution: "If it is density, it changes with temperature (983 kg/m³ at 60 °C)." },
  { values: [2000], meaning: "pounds per short ton" },
  { values: [2204.62, 2.20462, 2.2046, 0.453592, 0.4536], meaning: "pound / kilogram conversion" },
  { values: [8760, 8784], meaning: "hours in a year (8,784 in a leap year)" },
  { values: [3412, 3412.14, 3.412, 3.41214, 0.293071], meaning: "Btu per kWh (or kWh per kBtu)" },
  { values: [0.746, 0.7457, 745.7, 1.341], meaning: "horsepower / kilowatt conversion" },
  { values: [1.8, 32, 0.5556, 0.555556], meaning: "a °C / °F conversion", caution: "Use 1.8 alone for temperature differences; the + 32 applies to temperatures only." },
  { values: [273.15, 459.67], meaning: "absolute temperature offset (K or °R)" },
  { values: [273, 460], meaning: "a rounded absolute temperature offset", caution: "Exact values are 273.15 and 459.67." },
  { values: [101.325, 14.696, 14.7, 1.01325, 1.013, 760, 29.92], meaning: "atmospheric pressure", caution: "A gauge/absolute conversion. Sites at altitude have lower atmospheric pressure." },
  { values: [22.414, 22.4, 22.41, 23.64, 24.04, 24.45], meaning: "molar volume of an ideal gas in L/mol at a reference state", caution: "The value depends on the reference temperature and pressure (22.414 at 0 °C, 24.04 at 20 °C, 24.45 at 25 °C). Make sure it matches the state behind your Nm³ or Sm³." },
  { values: [379.5, 379.3, 379.49, 385.3, 385.0, 359], meaning: "molar volume in scf/lb-mol at a reference state (379.5 at 60 °F, 385.3 at 68 °F, 359 at 32 °F)", caution: "Must match the scf definition you use." },
  { values: [8.314, 8.3145, 8.31446, 0.08206, 0.082057, 10.73, 10.7316, 1545, 1545.35, 0.287, 287, 53.35], meaning: "a gas constant (universal, or specific to air)" },
  { values: [9.81, 9.807, 9.80665, 32.174, 32.2], meaning: "standard gravity" },
  { values: [3600, 60, 86400, 1440], meaning: "a time conversion" },
  { values: [0.3048, 3.281, 3.2808, 0.0254, 25.4, 0.0283168, 0.02832, 35.3147, 35.31, 28.317], meaning: "a length or volume conversion (ft, in, ft³)" },
  { values: [3.785, 3.7854, 3.78541, 0.264172, 264.17, 0.06309, 15.85, 4.403, 0.2271], meaning: "a US gallon or gpm conversion" },
  { values: [6.895, 6.89476, 0.145, 0.0145, 14.5038, 27.68, 2.31, 0.433, 10.2], meaning: "a pressure or head conversion (psi, kPa, bar, ft of water)", caution: "2.31 ft/psi and 0.433 psi/ft are for water at about 60 °F; divide by specific gravity for other liquids." },
  { values: [1.4, 1.41, 1.3], meaning: "a ratio of specific heats k (1.4 for dry air near ambient)" },
  { values: [28.96, 28.97, 28.9647, 29, 28.01, 28.0134, 28, 18.015, 18.02, 18], meaning: "a molar mass (air, nitrogen, or water)" },
  { values: [2257, 2256, 2256.4, 970, 970.3, 1000, 2260], meaning: "water's latent heat at atmospheric pressure (kJ/kg or Btu/lb)", caution: "Latent heat falls with pressure (about 2,000 kJ/kg at 10 bar(g)). Use steam tables at your steam pressure." },
  { values: [0.61, 0.62, 0.6, 0.65], meaning: "possibly an orifice discharge coefficient", caution: "Depends on the hole or orifice geometry; cite where it came from." },
  { values: [3960, 3956], meaning: "the water horsepower constant: hp = gpm × head (ft) × SG ÷ 3,960", caution: "Make sure head is in feet of the pumped liquid and specific gravity is included for liquids other than water." },
  { values: [1714, 1715], meaning: "the hydraulic horsepower constant: hp = gpm × psi ÷ 1,714" },
  { values: [367, 367.2, 102, 101.97], meaning: "a metric pump power constant: kW = m³/h × m × SG ÷ 367 (or L/s × m × SG ÷ 102)" },
  { values: [33000, 550], meaning: "ft·lbf per minute (or per second) in one horsepower" },
  { values: [64, 2300, 4000], meaning: "laminar flow friction (f = 64/Re) or a Reynolds number regime limit" },
  { values: [0.25, 5.74, 3.7, 2.51, 0.9], meaning: "possibly a constant in the Swamee-Jain or Colebrook friction factor equation" },
];

/** Numbers that are rarely worth a comment on their own. */
const TRIVIAL = new Set([0, 1, 2, 3, 4, 5, 10, 100, 0.5, 60, 3600, 1000]);

const ERROR_RE = /^#(DIV\/0!|REF!|N\/A|VALUE!|NAME\?|NUM!|NULL!|SPILL!|CALC!)/;

const errorMeaning: Record<string, string> = {
  "#DIV/0!": "a division by zero or by a blank cell",
  "#REF!": "a reference to a cell that was deleted",
  "#N/A": "a lookup that found no match",
  "#VALUE!": "text where a number was expected, or the wrong type of argument",
  "#NAME?": "a misspelled function or a name that is not defined",
  "#NUM!": "a number that is invalid for the function (for example the square root or log of a negative number)",
  "#NULL!": "a range intersection that is empty",
};

/** Column letters to number (A=1). */
const colNum = (s: string) => s.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
const colName = (n: number) => {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
export const splitAddr = (a: string) => {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(a);
  return m ? { col: colNum(m[1]), row: Number(m[2]) } : null;
};

/** Removes string literals and sheet-qualified references so only this sheet's refs and literals remain. */
function stripFormula(f: string) {
  return f
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/('(?:[^']|'')+'|[A-Za-z0-9_.]+)!\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/g, " ");
}

/** Single-cell references on the same sheet (ranges are skipped). */
export function sameSheetRefs(formula: string) {
  const f = stripFormula(formula).replace(/\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+/g, " ");
  const out = new Set<string>();
  for (const m of f.matchAll(/(?<![A-Za-z0-9_.])\$?([A-Z]{1,3})\$?(\d+)(?![A-Za-z0-9_(])/g)) out.add(`${m[1]}${m[2]}`);
  return [...out];
}

/** Numeric literals typed into a formula (not part of a cell reference or a name). */
export function formulaLiterals(formula: string) {
  const f = stripFormula(formula).replace(/\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/g, " ");
  const out: number[] = [];
  for (const m of f.matchAll(/(?<![A-Za-z0-9_.])(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)(?![A-Za-z0-9_(])/g)) out.push(Number(m[1]));
  return out;
}

export function matchConstant(n: number): Known | undefined {
  return KNOWN_CONSTANTS.find((k) => k.values.some((v) => Math.abs(v - n) <= Math.abs(v) * 1e-9));
}

export function reviewCells(cells: CellModel[]): ReviewReport {
  const bySheet = new Map<string, Map<string, CellModel>>();
  for (const c of cells) {
    if (!bySheet.has(c.sheet)) bySheet.set(c.sheet, new Map());
    bySheet.get(c.sheet)!.set(c.address, c);
  }
  const issues: Issue[] = [];
  const labelFor = (c: CellModel) => {
    const p = splitAddr(c.address);
    const sheet = bySheet.get(c.sheet);
    if (!p || !sheet) return undefined;
    for (let col = 1; col < p.col; col++) {
      const x = sheet.get(`${colName(col)}${p.row}`);
      if (x && typeof x.value === "string" && x.value.trim() && !x.formula && Number.isNaN(Number(x.value))) return x.value.trim().slice(0, 80);
    }
    return undefined;
  };
  const isBlank = (sheet: string, addr: string) => {
    const x = bySheet.get(sheet)?.get(addr);
    return !x || (x.value === null || x.value === "") && !x.formula;
  };

  for (const c of cells) {
    const label = labelFor(c);
    const base = { sheet: c.sheet, address: c.address, label, formula: c.formula };
    const err = c.error ?? (typeof c.value === "string" && ERROR_RE.test(c.value) ? c.value : undefined);
    if (err) {
      const code = Object.keys(errorMeaning).find((k) => err.startsWith(k));
      issues.push({ ...base, kind: "error", severity: "high", message: `Shows ${err}${code ? `: ${errorMeaning[code]}` : ""}.` });
    }
    if (c.formula) {
      if (/#REF!/i.test(c.formula)) issues.push({ ...base, kind: "broken-ref", severity: "high", message: "The formula points at a deleted cell (#REF!). Rebuild the reference." });
      const guarded = (a: string) => new RegExp(`(ISNUMBER|ISBLANK|ISTEXT|N)\\(\\$?${a.replace(/\d/, (d) => `\\$?${d}`)}\\)|\\$?${a.replace(/\d/, (d) => `\\$?${d}`)}\\s*(=|<>)\\s*""`, "i").test(c.formula!);
      const blanks = sameSheetRefs(c.formula).filter((a) => isBlank(c.sheet, a) && !guarded(a));
      if (blanks.length) issues.push({ ...base, kind: "blank-ref", severity: "medium", message: `Reads ${blanks.length > 1 ? "blank cells" : "a blank cell"} ${blanks.slice(0, 6).join(", ")}${blanks.length > 6 ? "…" : ""}. A blank counts as zero, so the result may be wrong without any error showing.` });
      const lits = [...new Set(formulaLiterals(c.formula))];
      const known = lits.map((n) => [n, matchConstant(n)] as const).filter(([, k]) => k);
      for (const [n, k] of known) {
        if (TRIVIAL.has(n)) continue;
        issues.push({ ...base, kind: "constant", severity: k!.caution ? "medium" : "info", message: `Uses ${n}: ${k!.meaning}.${k!.caution ? ` ${k!.caution}` : ""}` });
      }
      const unknown = lits.filter((n) => !matchConstant(n) && !TRIVIAL.has(n));
      if (unknown.length) issues.push({ ...base, kind: "hardcoded", severity: "info", message: `Has ${unknown.length > 1 ? "numbers" : "a number"} typed into the formula (${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}). Put ${unknown.length > 1 ? "them" : "it"} in a labeled input cell with a unit and a source so a reviewer can see and change ${unknown.length > 1 ? "them" : "it"}.` });
    } else if (typeof c.value === "string" && /^\s*[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?\s*$/.test(c.value)) {
      issues.push({ ...base, kind: "text-number", severity: "medium", message: `"${c.value.trim()}" is stored as text, so formulas may skip it or treat it as zero.` });
    }
  }

  const sev = { high: 0, medium: 1, info: 2 };
  issues.sort((a, b) => sev[a.severity] - sev[b.severity] || a.sheet.localeCompare(b.sheet) || (splitAddr(a.address)?.row ?? 0) - (splitAddr(b.address)?.row ?? 0) || (splitAddr(a.address)?.col ?? 0) - (splitAddr(b.address)?.col ?? 0));
  const counts = { error: 0, "broken-ref": 0, "blank-ref": 0, constant: 0, hardcoded: 0, "text-number": 0 } as Record<IssueKind, number>;
  for (const i of issues) counts[i.kind]++;
  const sheets = [...bySheet.entries()].map(([name, m]) => ({ name, cells: m.size, formulas: [...m.values()].filter((x) => x.formula).length }));
  return { sheets, issues, counts };
}
