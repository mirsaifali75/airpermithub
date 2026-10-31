import { quadOListing, quadOMeta, type EquipmentInput, type EquipmentType, type QuadOSubpart, type Site } from "./applicability";
import { RT, type RuleQuote } from "./rule-text";

/**
 * Oil and gas site calculations. Every equation follows the EPA document it
 * cites (AP-42 Section 7.1 for fixed roof tanks, AP-42 Section 13.5 for flare
 * destruction efficiency, the 1995 Protocol for Equipment Leak Emission
 * Estimates for fugitives). The tool never supplies an emission factor or a
 * property value: the user enters each one with its source.
 */

/** 1 lb = 0.45359237 kg exactly (international avoirdupois pound). */
export const KG_PER_LB = 0.45359237;
export const G_PER_LB = 453.59237;
export const LB_PER_TON = 2000;

const has = (n?: number | null): n is number => typeof n === "number" && Number.isFinite(n);
const r = (n: number, d = 3) => Number(n.toPrecision(d + 2));
const f = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

// ---------- Quad O matrix ----------

export const matrixTypes: { type: EquipmentType; label: string }[] = [
  { type: "well", label: "Wells" },
  { type: "centrifugal-compressor", label: "Centrifugal compressors" },
  { type: "reciprocating-compressor", label: "Reciprocating compressors" },
  { type: "pneumatic-controller", label: "Pneumatic controllers" },
  { type: "pneumatic-pump", label: "Pneumatic pumps" },
  { type: "tank", label: "Storage vessels / tank batteries" },
  { type: "fugitives", label: "Fugitive emissions components" },
  { type: "gas-plant-equipment", label: "Process unit equipment at gas plants" },
  { type: "sweetening-unit", label: "Sweetening units" },
];
export const matrixSubparts: QuadOSubpart[] = ["KKK", "LLL", "OOOO", "OOOOa", "OOOOb", "OOOOc"];

export interface MatrixCell { listed: boolean; atSite: boolean | null; note: string; quote?: RuleQuote }

/**
 * Whether each subpart lists each facility type, and whether the listing
 * reaches the chosen site type. Details the listing depends on (wet seals,
 * gas-driven, bleed rate, tank emissions) are assumed to match, so the
 * matrix shows the listing itself; the Applicability Checker screens a unit.
 */
export function quadOMatrix(site: Site): { type: EquipmentType; label: string; cells: Record<QuadOSubpart, MatrixCell> }[] {
  return matrixTypes.map(({ type, label }) => {
    const cells = {} as Record<QuadOSubpart, MatrixCell>;
    for (const s of matrixSubparts) {
      const e: EquipmentInput = { id: "m", type, name: "", date: s === "OOOOa" ? "2021-01-01" : "", dateKind: "construction", site, wetSeals: true, gasDriven: true, continuousBleed: true, bleedScfh: 7, vocTpy: 6, ch4Tpy: 20 };
      const l = quadOListing(e, s);
      cells[s] = l ? { listed: true, atSite: l.ok, note: l.note, quote: l.quote } : { listed: false, atSite: null, note: "Not listed in this subpart" };
    }
    return { type, label, cells };
  });
}
export { quadOMeta };

// ---------- AP-42 Section 7.1 fixed roof tanks ----------

export interface TankInput {
  id: string;
  name: string;
  /** Standing loss inputs (AP-42 Equation 1-2). */
  vv: number | null;
  wv: number | null;
  ke: number | null;
  ks: number | null;
  /** Annual net throughput, bbl/yr. */
  q: number | null;
  /** Turnovers: entered, or from tank geometry (AP-42 Equations 1-38 and 1-39, vertical tanks). */
  nMode: "enter" | "geometry";
  n: number | null;
  d: number | null;
  hlx: number | null;
  hln: number | null;
  product: "crude" | "other";
  kb: number | null;
  flashing: boolean;
  /** Flash emissions from a site-specific method, lb/yr, and how they were found. */
  flashLbYr: number | null;
  flashMethod: string;
  /** Control efficiency applied to all losses, percent. */
  controlPct: number | null;
  /** VOC weight fraction of the vapor, to report VOC. */
  vocFraction: number | null;
  source: string;
}

export interface TankResult {
  ls: number | null;
  vq: number | null;
  n: number | null;
  kn: number | null;
  kp: number;
  lw: number | null;
  lt: number | null;
  flash: number;
  uncontrolledLb: number | null;
  controlledLb: number | null;
  controlledTpy: number | null;
  vocTpy: number | null;
  steps: string[];
  missing: string[];
  basis: RuleQuote[];
}

export const blankTank = (id: string): TankInput => ({
  id, name: "", vv: null, wv: null, ke: null, ks: null, q: null, nMode: "enter", n: null, d: null, hlx: null, hln: null,
  product: "other", kb: 1, flashing: false, flashLbYr: null, flashMethod: "", controlPct: null, vocFraction: null, source: "",
});

export function tankCalc(t: TankInput): TankResult {
  const steps: string[] = [];
  const missing: string[] = [];
  const basis: RuleQuote[] = [RT.ap42Total, RT.ap42LtSum, RT.ap42Standing, RT.ap42Days];

  let ls: number | null = null;
  if (has(t.vv) && has(t.wv) && has(t.ke) && has(t.ks)) {
    ls = 365 * t.vv * t.wv * t.ke * t.ks;
    steps.push(`LS = 365 × VV × WV × KE × KS = 365 × ${f(t.vv)} × ${f(t.wv)} × ${f(t.ke)} × ${f(t.ks)} = ${f(r(ls))} lb/yr`);
  } else missing.push("Standing loss inputs: VV, WV, KE, and KS");

  const vq = has(t.q) ? 5.614 * t.q : null;
  if (vq !== null) { steps.push(`VQ = 5.614 × Q = 5.614 × ${f(t.q as number)} = ${f(r(vq))} ft³/yr`); basis.push(RT.ap42VqQ, RT.ap42QDef); }
  else missing.push("Annual net throughput Q");

  let n: number | null = null;
  if (t.nMode === "enter") n = has(t.n) ? t.n : null;
  else if (has(t.q) && has(t.d) && has(t.hlx) && has(t.hln) && t.hlx > t.hln && t.d > 0) {
    const hqi = (5.614 * t.q) / ((Math.PI / 4) * t.d * t.d);
    n = hqi / (t.hlx - t.hln);
    steps.push(`ΣHQI = 5.614 × Q ÷ ((π/4) × D²) = 5.614 × ${f(t.q)} ÷ ((π/4) × ${f(t.d)}²) = ${f(r(hqi))} ft`);
    steps.push(`N = ΣHQI ÷ (HLX − HLN) = ${f(r(hqi))} ÷ (${f(t.hlx)} − ${f(t.hln)}) = ${f(r(n))} turnovers/yr`);
    basis.push(RT.ap42HqiExample, RT.ap42NExample);
  }
  if (n === null && !t.flashing) missing.push(t.nMode === "enter" ? "Turnovers per year N" : "Diameter and maximum and minimum liquid heights");

  let kn: number | null = null;
  if (t.flashing) { kn = 1; steps.push("KN = 1 (flashing occurs in this tank)"); basis.push(RT.ap42KnFlash); }
  else if (n !== null) {
    kn = n > 36 ? (180 + n) / (6 * n) : 1;
    steps.push(n > 36 ? `KN = (180 + N) ÷ 6N = (180 + ${f(r(n))}) ÷ (6 × ${f(r(n))}) = ${f(r(kn))}` : `KN = 1 (N = ${f(r(n))}, 36 or fewer turnovers)`);
    basis.push(n > 36 ? RT.ap42Kn : RT.ap42KnLow);
  }
  const kp = t.product === "crude" ? 0.75 : 1;
  basis.push(t.product === "crude" ? RT.ap42Kp : RT.ap42KpOther);
  if (!has(t.kb)) missing.push("Vent setting correction factor KB");
  else if (t.kb === 1) basis.push(RT.ap42Kb);

  let lw: number | null = null;
  if (vq !== null && kn !== null && has(t.wv) && has(t.kb)) {
    lw = vq * kn * kp * t.wv * t.kb;
    steps.push(`LW = VQ × KN × KP × WV × KB = ${f(r(vq))} × ${f(r(kn))} × ${kp} × ${f(t.wv)} × ${f(t.kb)} = ${f(r(lw))} lb/yr`);
    basis.push(RT.ap42LwDef);
  }
  const lt = ls !== null && lw !== null ? ls + lw : null;
  if (lt !== null) steps.push(`LT = LS + LW = ${f(r(ls as number))} + ${f(r(lw as number))} = ${f(r(lt))} lb/yr`);

  let flash = 0;
  if (t.flashing) {
    basis.push(RT.ap42FlashWhere, RT.ap42Flash);
    if (has(t.flashLbYr)) { flash = t.flashLbYr; steps.push(`Flash = ${f(flash)} lb/yr (entered${t.flashMethod ? `: ${t.flashMethod}` : ""})`); }
    else missing.push("Flash emissions from a site-specific sample or process simulation");
  }
  const uncontrolledLb = lt !== null ? lt + flash : null;
  if (uncontrolledLb !== null && t.flashing) steps.push(`Uncontrolled = LT + flash = ${f(r(lt as number))} + ${f(flash)} = ${f(r(uncontrolledLb))} lb/yr`);
  const ce = has(t.controlPct) ? Math.min(Math.max(t.controlPct, 0), 100) : 0;
  const controlledLb = uncontrolledLb !== null ? uncontrolledLb * (1 - ce / 100) : null;
  if (controlledLb !== null && ce > 0) { steps.push(`Controlled = ${f(r(uncontrolledLb as number))} × (1 − ${f(ce)}/100) = ${f(r(controlledLb))} lb/yr`); basis.push(RT.ap42FlashControl); }
  const controlledTpy = controlledLb !== null ? controlledLb / LB_PER_TON : null;
  if (controlledTpy !== null) steps.push(`= ${f(r(controlledLb as number))} ÷ 2,000 = ${f(r(controlledTpy))} tpy of vapor`);
  const vocTpy = controlledTpy !== null && has(t.vocFraction) ? controlledTpy * t.vocFraction : null;
  if (vocTpy !== null) steps.push(`VOC = ${f(r(controlledTpy as number))} × ${f(t.vocFraction as number)} (VOC weight fraction) = ${f(r(vocTpy))} tpy`);
  return { ls, vq, n, kn, kp, lw, lt, flash, uncontrolledLb, controlledLb, controlledTpy, vocTpy, steps, missing, basis };
}

/** Inputs from AP-42 Section 7.1's fixed roof tank worked example, for the labeled demo. */
export const ap42ExampleTank = (id: string): TankInput => ({
  ...blankTank(id), name: "AP-42 Section 7.1 worked example (demo data)", vv: 169.6, wv: 0.0143, ke: 0.108, ks: 0.888, q: 201.2,
  nMode: "geometry", d: 6, hlx: 11.5, hln: 4.5, product: "other", kb: 1, source: "AP-42 Section 7.1 worked example, Steps 2 to 6",
});

// ---------- Flares ----------

export interface FactorRow { pollutant: string; value: number | null; source: string }

export interface FlareInput {
  id: string;
  name: string;
  /** VOC routed to the flare, tpy. */
  vocIn: number | null;
  /** Destruction efficiency, percent. */
  dre: number | null;
  /** Gas burned, scf/yr, and its higher heating value, Btu/scf. */
  scfYr: number | null;
  hhv: number | null;
  /** Combustion factors, lb/MMBtu, each with its source. */
  factors: FactorRow[];
}

export const blankFlare = (id: string): FlareInput => ({ id, name: "", vocIn: null, dre: null, scfYr: null, hhv: null, factors: [{ pollutant: "NOx", value: null, source: "" }, { pollutant: "CO", value: null, source: "" }] });

export function flareCalc(x: FlareInput) {
  const steps: string[] = [];
  const out: Record<string, number> = {};
  if (has(x.vocIn) && has(x.dre)) {
    out.VOC = x.vocIn * (1 - x.dre / 100);
    steps.push(`VOC = ${f(x.vocIn)} tpy × (1 − ${f(x.dre)}/100) = ${f(r(out.VOC))} tpy`);
  }
  const mmbtu = has(x.scfYr) && has(x.hhv) ? (x.scfYr * x.hhv) / 1e6 : null;
  if (mmbtu !== null) steps.push(`Heat input = ${f(x.scfYr as number)} scf/yr × ${f(x.hhv as number)} Btu/scf ÷ 1,000,000 = ${f(r(mmbtu))} MMBtu/yr`);
  for (const row of x.factors) {
    if (mmbtu === null || !has(row.value) || !row.pollutant.trim()) continue;
    const tpy = (row.value * mmbtu) / LB_PER_TON;
    out[row.pollutant.trim()] = (out[row.pollutant.trim()] ?? 0) + tpy;
    steps.push(`${row.pollutant} = ${f(row.value)} lb/MMBtu × ${f(r(mmbtu))} MMBtu/yr ÷ 2,000 = ${f(r(tpy))} tpy${row.source ? ` (factor: ${row.source})` : ""}`);
  }
  return { tpy: out, mmbtu, steps };
}

// ---------- Equipment leaks (1995 Protocol, average emission factor approach) ----------

export interface LeakRow {
  id: string;
  component: string;
  service: string;
  count: number | null;
  /** Average emission factor, kg/hr/source, with its source table. */
  factor: number | null;
  factorSource: string;
  wfToc: number | null;
  wfVoc: number | null;
  hours: number | null;
}

export const blankLeak = (id: string): LeakRow => ({ id, component: "", service: "", count: null, factor: null, factorSource: "", wfToc: null, wfVoc: null, hours: 8760 });

export function leakCalc(x: LeakRow) {
  if (!has(x.count) || !has(x.factor) || !has(x.wfToc) || !has(x.hours)) return null;
  const etoc = x.factor * x.wfToc * x.count;
  const tocTpy = (etoc * x.hours) / KG_PER_LB / LB_PER_TON;
  const vocTpy = has(x.wfVoc) && x.wfToc > 0 ? tocTpy * (x.wfVoc / x.wfToc) : null;
  const steps = [
    `ETOC = FA × WFTOC × N = ${f(x.factor)} × ${f(x.wfToc)} × ${f(x.count)} = ${f(r(etoc))} kg/hr`,
    `TOC = ${f(r(etoc))} kg/hr × ${f(x.hours)} hr/yr ÷ 0.45359237 kg/lb ÷ 2,000 = ${f(r(tocTpy))} tpy`,
    ...(vocTpy !== null ? [`VOC = TOC × (WFVOC ÷ WFTOC) = ${f(r(tocTpy))} × (${f(x.wfVoc as number)} ÷ ${f(x.wfToc)}) = ${f(r(vocTpy))} tpy`] : []),
  ];
  return { etoc, tocTpy, vocTpy, steps };
}

// ---------- Engines ----------

export interface EngineRow {
  id: string;
  name: string;
  hp: number | null;
  hours: number | null;
  /** g/hp-hr, each with its source (permit, manufacturer data, or the standard it meets). */
  factors: FactorRow[];
}

export const blankEngine = (id: string): EngineRow => ({ id, name: "", hp: null, hours: 8760, factors: [{ pollutant: "NOx", value: null, source: "" }, { pollutant: "CO", value: null, source: "" }, { pollutant: "VOC", value: null, source: "" }] });

export function engineCalc(x: EngineRow) {
  const steps: string[] = [];
  const out: Record<string, number> = {};
  if (!has(x.hp) || !has(x.hours)) return { tpy: out, steps };
  for (const row of x.factors) {
    if (!has(row.value) || !row.pollutant.trim()) continue;
    const lbHr = (row.value * x.hp) / G_PER_LB;
    const tpy = (lbHr * x.hours) / LB_PER_TON;
    out[row.pollutant.trim()] = (out[row.pollutant.trim()] ?? 0) + tpy;
    steps.push(`${row.pollutant} = ${f(row.value)} g/hp-hr × ${f(x.hp)} hp ÷ 453.59237 g/lb = ${f(r(lbHr))} lb/hr; × ${f(x.hours)} hr/yr ÷ 2,000 = ${f(r(tpy))} tpy${row.source ? ` (factor: ${row.source})` : ""}`);
  }
  return { tpy: out, steps };
}

// ---------- Site roll-up ----------

export interface SiteInventory { tanks: TankInput[]; flares: FlareInput[]; leaks: LeakRow[]; engines: EngineRow[] }

export interface RollupRow { group: string; source: string; pollutant: string; tpy: number }

export function rollup(s: SiteInventory): { rows: RollupRow[]; totals: Record<string, number> } {
  const rows: RollupRow[] = [];
  for (const t of s.tanks) {
    const c = tankCalc(t);
    if (c.vocTpy !== null) rows.push({ group: "Tanks", source: t.name || "Tank", pollutant: "VOC", tpy: c.vocTpy });
    else if (c.controlledTpy !== null) rows.push({ group: "Tanks", source: t.name || "Tank", pollutant: "Tank vapor (VOC fraction not entered)", tpy: c.controlledTpy });
  }
  for (const x of s.flares) for (const [p, v] of Object.entries(flareCalc(x).tpy)) rows.push({ group: "Flares", source: x.name || "Flare", pollutant: p, tpy: v });
  for (const x of s.leaks) {
    const c = leakCalc(x);
    if (!c) continue;
    const src = [x.component, x.service].filter(Boolean).join(", ") || "Components";
    if (c.vocTpy !== null) rows.push({ group: "Fugitives", source: src, pollutant: "VOC", tpy: c.vocTpy });
    rows.push({ group: "Fugitives", source: src, pollutant: "TOC", tpy: c.tocTpy });
  }
  for (const x of s.engines) for (const [p, v] of Object.entries(engineCalc(x).tpy)) rows.push({ group: "Engines", source: x.name || "Engine", pollutant: p, tpy: v });
  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.pollutant] = (totals[row.pollutant] ?? 0) + row.tpy;
  return { rows, totals };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with the roll-up and every calculation step, so the math travels with the numbers. */
export function inventoryCsv(siteName: string, s: SiteInventory, today: string): string {
  const { rows, totals } = rollup(s);
  const out: unknown[][] = [
    ["Screening estimate for planning. Not a permit application or a regulatory determination. Every factor and property was entered by the user; check each against its source."],
    ["Site", siteName || "(not named)", "Prepared", today],
    [],
    ["Group", "Source", "Pollutant", "tpy"],
    ...rows.map((x) => [x.group, x.source, x.pollutant, Number(x.tpy.toPrecision(4))]),
    [],
    ["Site total", "", "Pollutant", "tpy"],
    ...Object.entries(totals).map(([p, v]) => ["Total", "", p, Number(v.toPrecision(4))]),
    [],
    ["Calculation steps"],
  ];
  for (const t of s.tanks) for (const step of tankCalc(t).steps) out.push(["Tank", t.name, step]);
  for (const x of s.flares) for (const step of flareCalc(x).steps) out.push(["Flare", x.name, step]);
  for (const x of s.leaks) for (const step of leakCalc(x)?.steps ?? []) out.push(["Fugitives", [x.component, x.service].filter(Boolean).join(", "), step, x.factorSource ? `factor: ${x.factorSource}` : ""]);
  for (const x of s.engines) for (const step of engineCalc(x).steps) out.push(["Engine", x.name, step]);
  return ["AirPermitHub Template: Oil and Gas Site Emissions Workbook (not an agency form)", ...out.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
