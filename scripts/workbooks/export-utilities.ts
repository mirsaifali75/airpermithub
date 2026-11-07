/**
 * Writes the utility calculator definitions and IAPWS-IF97 property tables
 * as JSON for scripts/workbooks/build_utilities.py:
 *
 *   npx tsx scripts/workbooks/export-utilities.ts > /tmp/util.json
 *   python3 -I scripts/workbooks/build_utilities.py /tmp/util.json public/workbooks
 */
import { utilities, exampleSection, runSection } from "../../src/lib/utilities";
import { liquid, satP, satT, psat, P_SAT_MAX } from "../../src/lib/utilities/if97";
import { families, unitOf } from "../../src/lib/utilities/units";
import { R1, R2_0, R2_R } from "../../src/lib/utilities/if97";
import { LIST_ROWS } from "../../src/lib/utilities/workbook-layout";

const unit = (family: keyof typeof families, id: string) => {
  const u = unitOf(family, id);
  return { id: u.id, label: u.label, factor: u.factor, offset: u.offset ?? 0 };
};

const spec = utilities.map((u) => ({
  slug: u.slug,
  name: u.name,
  sheet: u.sheet,
  sections: u.sections.map((s) => {
    const ex = runSection(s, exampleSection(s));
    return {
      id: s.id,
      title: s.title,
      question: s.question,
      formulas: s.formulas,
      solveNote: s.solveNote ?? null,
      refs: s.refs,
      inputs: s.inputs.map((i) => ({ id: i.id, label: i.label, sym: i.sym ?? "", family: i.family, unit: unit(i.family, i.unit), optional: !!i.optional, solvable: !!i.solvable, choices: i.choices ?? null, help: i.help ?? "", min: i.min ?? null, max: i.max ?? null, soft: !!i.soft })),
      list: s.list ?? null,
      example: { title: s.example.title, values: Object.fromEntries(Object.entries(s.example.values).map(([k, v]) => [k, v ? { v: v[0], unit: unit(s.inputs.find((i) => i.id === k)!.family, v[1]) } : null])), lists: s.example.lists ?? null },
      exampleResults: Object.fromEntries(ex.results.map((r) => [r.id, { si: r.value, family: r.family, unit: unit(r.family, r.show[0]), label: r.label }])),
    };
  }),
}));

// Saturation table by pressure (kPa abs), log-spaced from 1 kPa to the region-4 limit.
const satRows: number[][] = [];
for (let i = 0; i <= 400; i++) {
  const p = Math.min(1 * Math.pow((P_SAT_MAX * 1000) / 1, i / 400), P_SAT_MAX * 1000);
  const s = satP(p / 1000);
  satRows.push([p, s.T - 273.15, s.hf, s.hg, s.hfg, s.vf, s.vg, s.sf, s.sg]);
}
// Liquid water at 1 atm (or just above saturation), 0–300 °C every 1 °C.
const liqRows: number[][] = [];
for (let t = 0; t <= 300; t++) {
  const w = liquid(t + 273.15, 0.101325);
  liqRows.push([t, w.rho, w.cp, w.mu * 1000, w.h, psat(t + 273.15) * 1000, satT(t + 273.15).hfg]);
}
// Extra cases for the workbook check: each overrides some example inputs (null = blank) to exercise other branches.
const VARIANTS: [string, string, Record<string, [number, string] | null>][] = [
  ["steam", "properties", { t: [250, "c"] }],
  ["steam", "properties", { p: [5, "bara"], t: [60, "c"] }],
  ["steam", "heating", { ts: [200, "c"], tc: [120, "c"], Q: [2, "mw"] }],
  ["steam", "boiler", { ts: [300, "c"], bd: null, tdsf: [150, "ppm"], tdsb: [3000, "ppm"] }],
  ["steam", "pipe", { d: null, u: [30, "ms"], t: [250, "c"] }],
  ["cooling-water", "flow", { Q: [1.2, "mw"], V: [100, "m3h"], tout: null }],
  ["cooling-water", "flow", { Q: null, V: [100, "m3h"], tout: [42, "c"] }],
  ["cooling-water", "flow", { Q: [1.2, "mw"], V: [100, "m3h"], tin: null, tout: [45, "c"] }],
  ["cooling-water", "tower", { fevap: [80, "pct"], drift: [0.002, "pct"], C: [3, "x"] }],
  ["cooling-water", "exchanger", { U: null, A: [60, "m2"], flow: [2, "n"], tci: [25, "c"], tco: [35, "c"], F: [0.9, "x"] }],
  ["cooling-water", "exchanger", { Q: null, A: [60, "m2"] }],
  ["chilled-water", "load", { Q: null, V: [100, "m3h"] }],
  ["chilled-water", "chiller", { Q: [500, "tr"], W: [320, "kw"], kwt: null }],
  ["chilled-water", "chiller", { Q: null, W: [320, "kw"], kwt: [0.55, "x"] }],
  ["process-water", "pipe", { V: [2, "m3h"], d: [50, "mm"], t: [80, "c"] }],
  ["process-water", "pump", { rho: [1100, "kgm3"], em: null }],
  ["compressed-air", "compressor", { N: [1, "n"], k: [1.39, "x"], p2: [125, "psig"] }],
  ["compressed-air", "hole", { p0: [0.5, "barg"] }],
  ["compressed-air", "receiver", { V: [10, "m3"], t: null }],
  ["nitrogen", "sweep-purge", { k: null, T: null, cs: [0.5, "pct"] }],
  ["hot-oil", "circulation", { Q: [1.5, "mw"], V: [80, "m3h"], tr: null }],
];
const variants = VARIANTS.map(([slug, sid, over]) => {
  const u = utilities.find((x) => x.slug === slug)!;
  const s = u.sections.find((x) => x.id === sid)!;
  const st = exampleSection(s);
  for (const [k, v] of Object.entries(over)) st.entries[k] = v ? { v: v[0], u: v[1] } : { v: null, u: s.inputs.find((i) => i.id === k)!.unit };
  const out = runSection(s, st);
  if (out.error) throw new Error(`variant ${slug}/${sid} failed: ${out.error}`);
  return {
    slug, section: sid,
    values: Object.fromEntries(Object.entries(st.entries).map(([k, e]) => [k, e.v === null ? null : { v: e.v, unit: unit(s.inputs.find((i) => i.id === k)!.family, e.u) }])),
    results: Object.fromEntries(out.results.map((r) => [r.id, { si: r.value }])),
  };
});

process.stdout.write(JSON.stringify({ variants, listRows: LIST_ROWS, utilities: spec, tables: { sat: satRows, liquid: liqRows }, families, if97: { R1, R2_0, R2_R } }));
