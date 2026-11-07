/**
 * Writes the utility calculator definitions and IAPWS-IF97 property tables
 * as JSON for scripts/workbooks/build_utilities.py:
 *
 *   npx tsx scripts/workbooks/export-utilities.ts > /tmp/util.json
 *   python3 -I scripts/workbooks/build_utilities.py /tmp/util.json public/workbooks
 *
 * With "oil-gas" as the argument it writes the oil and gas calculators instead
 * (no water tables; build_utilities.py then names the file airpermithub-oil-gas-calculators.xlsx).
 */
import { utilities as plant, oilGasCalcs, exampleSection, runSection } from "../../src/lib/utilities";
import { liquid, satP, satT, psat, P_SAT_MAX } from "../../src/lib/utilities/if97";
import { families, unitOf } from "../../src/lib/utilities/units";
import { R1, R2_0, R2_R } from "../../src/lib/utilities/if97";
import { LIST_ROWS } from "../../src/lib/utilities/workbook-layout";

const unit = (family: keyof typeof families, id: string) => {
  const u = unitOf(family, id);
  return { id: u.id, label: u.label, factor: u.factor, offset: u.offset ?? 0 };
};

const COLLECTION = process.argv[2] === "oil-gas" ? "oil-gas" : "plant";
const utilities = COLLECTION === "oil-gas" ? oilGasCalcs : plant;

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
// Oil and gas: each overrides some example inputs (null = blank) to reach the other branches and solve modes.
const OG_VARIANTS: typeof VARIANTS = [
  ["natural-gas-properties", "composition", { h2s: [3, "pct"], p: [2500, "psia"], t: [180, "f"] }],
  ["natural-gas-properties", "composition", { p: null, t: null }],
  ["natural-gas-properties", "z-factor", { h2s: [5, "pct"], p: [4000, "psia"] }],
  ["natural-gas-properties", "z-factor", { tpc: [380, "r"], ppc: [670, "psia"], co2: null }],
  ["crude-oil-pvt", "gravity", { api: null, sg: [0.9, "x"] }],
  ["crude-oil-pvt", "bubble-point", { rsb: null, pb: [2500, "psia"] }],
  ["crude-oil-pvt", "bubble-point", { p: [4000, "psia"], co: [1.2e-5, "perpsi"] }],
  ["crude-oil-pvt", "viscosity", { p: null }],
  ["well-inflow", "darcy", { k: null, q: [650, "bpd"] }],
  ["well-inflow", "darcy", { s: null, q: [500, "bpd"] }],
  ["well-inflow", "darcy", { pwf: null, q: [500, "bpd"], mode: [2, "n"] }],
  ["well-inflow", "vogel", { pb: null }],
  ["well-inflow", "vogel", { pt: [2600, "psia"], q: [300, "bpd"] }],
  ["well-inflow", "backpressure", { q2: null, p2: null, n: [0.8, "x"] }],
  ["gas-well-deliverability", "static", { md: [9000, "ft"], co2: [3, "pct"], h2s: [1, "pct"] }],
  ["gas-well-deliverability", "flowing", { md: [9000, "ft"], q: [1500, "mscfd"], co2: [2, "pct"] }],
  ["gas-well-deliverability", "nodal", { pt: [300, "psia"], md: [8500, "ft"] }],
  ["gas-well-deliverability", "loading", { adj: [2, "n"], q: null, co2: [4, "pct"] }],
  ["choke-calculator", "gilbert", { set: [2, "n"], q: null, pwh: [800, "psig"] }],
  ["choke-calculator", "gilbert", { set: [4, "n"], S: null, pwh: [800, "psig"] }],
  ["choke-calculator", "gilbert", { set: [3, "n"], pdn: null }],
  ["choke-calculator", "gas-choke", { d: null, q: [5000, "mscfd"] }],
  ["choke-calculator", "gas-choke", { p2: [800, "psia"], z: [0.9, "x"] }],
  ["pipeline-flow", "gas-line", { q: null, p2: [700, "psia"] }],
  ["pipeline-flow", "gas-line", { d: null, p2: [700, "psia"] }],
  ["pipeline-flow", "gas-line", { dz: [300, "ft"], e: [92, "pct"] }],
  ["pipeline-flow", "liquid-line", { mu: [200, "cp"], q: [200, "bpd"] }],
  ["pipeline-flow", "liquid-line", { p1: null, dz: null }],
  ["pipeline-flow", "erosional", { qo: null, sw: [1.05, "sg"] }],
  ["separators-and-tanks", "gas-capacity", { q: null, d: [36, "in"] }],
  ["separators-and-tanks", "retention", { qw: null, d: null }],
  ["separators-and-tanks", "tank-gauge", { shape: [2, "n"], d: [10, "ft"], l: [30, "ft"], h1: [7, "ft"], h2: [2, "ft"] }],
  ["separators-and-tanks", "rates", { qw: null }],
  ["separators-and-tanks", "rates", { qg: null }],
  ["drilling-well-control", "hydrostatic", { mw: null, p: [5500, "psi"] }],
  ["drilling-well-control", "hydrostatic", { tvd: null, p: [5500, "psi"], ps: null }],
  ["drilling-well-control", "kill-sheet", { scr: null, shoe: null, lot: null }],
  ["drilling-well-control", "annular", { q: null, po: null }],
  ["artificial-lift", "rod-pump", { n: null, q: [200, "bpd"] }],
  ["artificial-lift", "esp", { md: [6500, "ft"], hs: null }],
  ["artificial-lift", "esp", { chp: null, ps: null }],
];

const variants = (COLLECTION === "oil-gas" ? OG_VARIANTS : VARIANTS).map(([slug, sid, over]) => {
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

process.stdout.write(JSON.stringify({ collection: COLLECTION, variants, listRows: LIST_ROWS, utilities: spec, tables: { sat: satRows, liquid: liqRows }, families, if97: { R1, R2_0, R2_R } }));
