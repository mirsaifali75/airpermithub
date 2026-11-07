import { Calc, K, labelsOf, q } from "../helpers";
import type { SectionDef, UtilityDef } from "../types";
import { M_AIR, P_ATM_KPA, R_UNIVERSAL, fmt, toSI } from "../units";
import { REF } from "./refs";

const K_AIR = 1.4; // ratio of specific heats for dry air near ambient temperature

/** mol/s → actual m³/min at p (kPa abs) and T (°C). */
const actualM3min = (n: number, pKpa: number, tC: number) => ((n * R_UNIVERSAL * K(tC)) / (pKpa * 1000)) * 60;

const compInputs: SectionDef["inputs"] = [
  { id: "n", label: "Free air delivered", sym: "FAD", family: "gasflow", unit: "nm3h", min: 0 },
  { id: "p1", label: "Inlet pressure", sym: "P₁", family: "pabs", unit: "bara", min: 1 },
  { id: "t1", label: "Inlet temperature", sym: "T₁", family: "temp", unit: "c" },
  { id: "p2", label: "Discharge pressure", sym: "P₂", family: "pabs", unit: "barg", min: 1 },
  { id: "N", label: "Compression stages (intercooled to inlet temperature)", sym: "N", family: "count", unit: "n", choices: [1, 2, 3, 4].map((x) => ({ value: x, label: String(x) })) },
  { id: "k", label: "Ratio of specific heats k (blank = 1.4 for dry air)", sym: "k", family: "ratio", unit: "x", optional: true, min: 1.01, max: 1.7 },
  { id: "eta", label: "Isentropic (adiabatic) efficiency", sym: "ηs", family: "pct", unit: "pct", min: 1, max: 100, help: "From the compressor data sheet or test." },
  { id: "em", label: "Motor and drive efficiency (blank = 100 %)", sym: "ηm", family: "pct", unit: "pct", optional: true, min: 1, max: 100 },
  { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "price", label: "Electricity price", family: "price", unit: "kwh", optional: true, min: 0 },
];

const comp: SectionDef = {
  id: "compressor",
  title: "Compressor power and discharge temperature",
  question: "How much power does it take to make this much air at this pressure?",
  formulas: [
    "r = (P₂ ÷ P₁)^(1/N) per stage",
    "W_s = N × (k ÷ (k − 1)) × ṅ R T₁ × (r^((k−1)/k) − 1)",
    "P_shaft = W_s ÷ ηs,   P_elec = P_shaft ÷ ηm",
    "T₂ = T₁ × (1 + (r^((k−1)/k) − 1) ÷ ηs)",
  ],
  inputs: compInputs,
  example: { title: "1,000 Nm³/h of free air at 1.013 bar(a) and 30 °C, compressed to 7 bar(g) in two stages at 80 % efficiency, 95 % motor.", values: { n: [1000, "nm3h"], p1: [1.013, "bara"], t1: [30, "c"], p2: [7, "barg"], N: [2, "n"], eta: [80, "pct"], em: [95, "pct"], hours: [8000, "h"], price: [0.1, "kwh"] } },
  refs: [REF.doeAir, REF.nistR],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("n", "p1", "t1", "p2", "eta");
    if (miss.length) return c.missing(miss, labelsOf(compInputs));
    const N = Math.max(1, Math.round(v.N ?? 1));
    const k = v.k ?? K_AIR;
    const ratio = c.n("p2") / c.n("p1");
    if (ratio <= 1) return c.done("Discharge pressure must be above inlet pressure.");
    const r = ratio ** (1 / N);
    const T1 = K(c.n("t1"));
    const e = (k - 1) / k;
    c.step("Pressure ratio", `Overall ${fmt(c.n("p2"))} ÷ ${fmt(c.n("p1"))} = ${fmt(ratio)};  per stage r = ${fmt(ratio)}^(1/${N}) = ${fmt(r)}`);
    const n = c.n("n");
    const Ws = (N * (k / (k - 1)) * n * R_UNIVERSAL * T1 * (r ** e - 1)) / 1000;
    c.step("Isentropic power", `W_s = ${N} × ${fmt(k / (k - 1))} × ${fmt(n)} mol/s × ${fmt(R_UNIVERSAL)} × ${fmt(T1)} K × (${fmt(r)}^${fmt(e)} − 1) ÷ 1000 = ${fmt(Ws)} kW`, "W_s = N k/(k−1) ṅRT₁ (r^((k−1)/k) − 1)");
    const Psh = Ws / (c.n("eta") / 100);
    const em = (v.em ?? 100) / 100;
    const Pe = Psh / em;
    c.step("Shaft and electrical power", `P_shaft = ${fmt(Ws)} ÷ ${fmt(c.n("eta") / 100)} = ${fmt(Psh)} kW;  P_elec = ${fmt(Psh)} ÷ ${fmt(em)} = ${fmt(Pe)} kW`);
    const T2 = T1 * (1 + (r ** e - 1) / (c.n("eta") / 100));
    c.step("Discharge temperature (each stage, no cooling inside the stage)", `T₂ = ${fmt(T1)} × (1 + (${fmt(r)}^${fmt(e)} − 1) ÷ ${fmt(c.n("eta") / 100)}) = ${fmt(T2)} K = ${fmt(T2 - 273.15)} °C`);
    const fad = actualM3min(n, c.n("p1"), c.n("t1"));
    const spec = Pe / fad;
    c.step("Specific power", `Inlet volume = ${fmt(fad)} m³/min;  ${fmt(Pe)} kW ÷ ${fmt(fad)} = ${fmt(spec)} kW per m³/min = ${q(spec, "spower", "kw100cfm")}`);
    c.result("Psh", "Shaft power", "power", Psh, ["kw", "hp"], true);
    c.result("Pe", "Electrical input", "power", Pe, ["kw", "hp"], true);
    c.result("T2", "Stage discharge temperature", "temp", T2 - 273.15, ["c", "f"]);
    c.result("fad", "Inlet (actual) flow, m³/min", "ratio", fad, ["x"]);
    c.result("spec", "Specific power", "spower", spec, ["kwm3min", "kw100cfm"], true);
    c.result("mass", "Air mass flow", "mflow", n * M_AIR, ["kgh", "lbh"]);
    if (v.hours) {
      const kwh = Pe * (v.hours / 3600);
      c.result("kwh", "Annual electricity", "energy", kwh, ["kwh", "mwh"]);
      if (v.price) c.result("cost", "Annual electricity cost", "money", kwh * v.price, ["usd"], true);
      c.step("Annual energy", `${fmt(Pe)} kW × ${fmt(v.hours / 3600)} h = ${fmt(kwh)} kWh${v.price ? `;  × $${fmt(v.price)} = $${fmt(kwh * v.price)}` : ""}`);
    }
    return c.done();
  },
};

const leakInputs: SectionDef["inputs"] = [
  { id: "on", label: "Average time loaded (on)", sym: "T", family: "time", unit: "s", min: 0 },
  { id: "off", label: "Average time unloaded (off)", sym: "t", family: "time", unit: "s", min: 0 },
  { id: "cap", label: "Compressor capacity", sym: "C", family: "gasflow", unit: "nm3h", optional: true, min: 0 },
  { id: "kw", label: "Compressor power when loaded", family: "power", unit: "kw", optional: true, min: 0 },
  { id: "hours", label: "Hours per year the system is pressurized", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "price", label: "Electricity price", family: "price", unit: "kwh", optional: true, min: 0 },
];

const leakTest: SectionDef = {
  id: "leaks",
  title: "Leak load from a no-demand on/off test",
  question: "With production stopped, how much of the compressor's output is going to leaks?",
  formulas: ["Leakage % = T × 100 ÷ (T + t)", "Leak flow = Leakage % × capacity", "Leak cost ≈ Leakage % × loaded kW × hours × price"],
  inputs: leakInputs,
  example: { title: "With the plant idle, the compressor loads for 40 s and unloads for 110 s; 1,500 Nm³/h, 160 kW, 8,000 h/yr.", values: { on: [40, "s"], off: [110, "s"], cap: [1500, "nm3h"], kw: [160, "kw"], hours: [8000, "h"], price: [0.1, "kwh"] } },
  refs: [REF.doeLeaks, REF.doeAir],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("on", "off");
    if (miss.length) return c.missing(miss, labelsOf(leakInputs));
    const tot = c.n("on") + c.n("off");
    if (!(tot > 0)) return c.done("Enter the on and off times.");
    const pct = (c.n("on") * 100) / tot;
    c.step("Leakage", `${fmt(c.n("on"))} × 100 ÷ (${fmt(c.n("on"))} + ${fmt(c.n("off"))}) = ${fmt(pct)} %`, "Leakage % = T × 100 ÷ (T + t)");
    c.result("pct", "Leakage, % of compressor capacity", "pct", pct, ["pct"], true);
    if (v.cap) {
      c.step("Leak flow", `${fmt(pct)} % × ${q(v.cap, "gasflow", "nm3h")} = ${q((v.cap * pct) / 100, "gasflow", "nm3h")}`);
      c.result("flow", "Leak flow", "gasflow", (v.cap * pct) / 100, ["nm3h", "scfm"], true);
    }
    if (v.kw) {
      const lkw = (v.kw * pct) / 100;
      c.result("lkw", "Power going to leaks", "power", lkw, ["kw", "hp"]);
      if (v.hours) {
        const kwh = lkw * (v.hours / 3600);
        c.step("Leak energy", `${fmt(lkw)} kW × ${fmt(v.hours / 3600)} h = ${fmt(kwh)} kWh${v.price ? ` × $${fmt(v.price)} = $${fmt(kwh * v.price)}` : ""}`);
        c.result("kwh", "Annual energy lost to leaks", "energy", kwh, ["kwh", "mwh"]);
        if (v.price) c.result("cost", "Annual cost of leaks", "money", kwh * v.price, ["usd"], true);
      }
    }
    if (pct > 20) c.warn("Leakage above about 20 % of capacity is high for a well-maintained system; a leak survey usually pays back quickly.");
    return c.done();
  },
};

const holeInputs: SectionDef["inputs"] = [
  { id: "d", label: "Hole (orifice) diameter", sym: "d", family: "diam", unit: "mm", min: 0 },
  { id: "p0", label: "Line pressure", sym: "P₀", family: "pabs", unit: "barg", min: 0 },
  { id: "t0", label: "Air temperature in the line", sym: "T₀", family: "temp", unit: "c" },
  { id: "cd", label: "Discharge coefficient", sym: "Cd", family: "ratio", unit: "x", min: 0.1, max: 1, help: "Depends on the hole shape. A sharp-edged hole is lower than a rounded one; use a value you can source for your case." },
  { id: "pa", label: "Ambient pressure (blank = 1 atm)", sym: "Pa", family: "pabs", unit: "kpaa", optional: true, min: 1 },
  { id: "spec", label: "Specific power of your compressors", family: "spower", unit: "kwm3min", optional: true, min: 0, help: "From the compressor section or your metered data, per m³/min of free air." },
  { id: "hours", label: "Hours per year pressurized", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "price", label: "Electricity price", family: "price", unit: "kwh", optional: true, min: 0 },
];

const hole: SectionDef = {
  id: "hole",
  title: "Air lost through a single leak or open hole",
  question: "How much air and money does one 3 mm leak waste?",
  formulas: [
    "Choked when P₀ ÷ Pa ≥ ((k + 1) ÷ 2)^(k/(k−1)) ≈ 1.893",
    "Choked: ṁ = Cd A P₀ √(k M ÷ (R T₀)) × (2 ÷ (k + 1))^((k+1)/(2(k−1)))",
    "Otherwise: ṁ = Cd A P₀ √(2 M k/((k−1) R T₀) × ((Pa/P₀)^(2/k) − (Pa/P₀)^((k+1)/k)))",
  ],
  inputs: holeInputs,
  example: { title: "A 3 mm hole in a 7 bar(g) line at 25 °C with an assumed Cd of 0.65 and 6.5 kW per m³/min of free air.", values: { d: [3, "mm"], p0: [7, "barg"], t0: [25, "c"], cd: [0.65, "x"], spec: [6.5, "kwm3min"], hours: [8000, "h"], price: [0.1, "kwh"] } },
  refs: [REF.doeLeaks, REF.nistR],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("d", "p0", "t0", "cd");
    if (miss.length) return c.missing(miss, labelsOf(holeInputs));
    const k = K_AIR;
    const P0 = c.n("p0") * 1000;
    const Pa = (v.pa ?? P_ATM_KPA) * 1000;
    if (P0 <= Pa) return c.done("Line pressure must be above ambient pressure.");
    const T0 = K(c.n("t0"));
    const A = (Math.PI * c.n("d") ** 2) / 4;
    const crit = ((k + 1) / 2) ** (k / (k - 1));
    const choked = P0 / Pa >= crit;
    let m: number;
    if (choked) {
      m = c.n("cd") * A * P0 * Math.sqrt((k * M_AIR) / (R_UNIVERSAL * T0)) * (2 / (k + 1)) ** ((k + 1) / (2 * (k - 1)));
      c.step("Choked (sonic) flow", `P₀/Pa = ${fmt(P0 / Pa)} ≥ ${fmt(crit)};  ṁ = ${fmt(c.n("cd"))} × ${fmt(A)} m² × ${fmt(P0)} Pa × √(${k} × ${M_AIR} ÷ (${fmt(R_UNIVERSAL)} × ${fmt(T0)})) × ${fmt((2 / (k + 1)) ** ((k + 1) / (2 * (k - 1))))} = ${fmt(m)} kg/s`);
    } else {
      const x = Pa / P0;
      m = c.n("cd") * A * P0 * Math.sqrt(((2 * M_AIR * k) / ((k - 1) * R_UNIVERSAL * T0)) * (x ** (2 / k) - x ** ((k + 1) / k)));
      c.step("Subsonic flow", `P₀/Pa = ${fmt(P0 / Pa)} < ${fmt(crit)};  ṁ = ${fmt(m)} kg/s`);
    }
    const n = m / M_AIR;
    c.result("m", "Air lost", "mflow", m, ["kgh", "lbh"]);
    c.result("n", "Air lost as free air", "gasflow", n, ["nm3h", "scfm"], true);
    const fadM3min = actualM3min(n, P_ATM_KPA, 20);
    if (v.spec) {
      const kw = v.spec * fadM3min;
      c.step("Compressor power to feed the leak", `${fmt(fadM3min)} m³/min (free air at 20 °C, 1 atm) × ${fmt(v.spec)} kW per m³/min = ${fmt(kw)} kW`);
      c.result("kw", "Compressor power wasted", "power", kw, ["kw", "hp"]);
      if (v.hours) {
        const kwh = kw * (v.hours / 3600);
        c.result("kwh", "Annual energy wasted", "energy", kwh, ["kwh", "mwh"]);
        if (v.price) c.result("cost", "Annual cost of this leak", "money", kwh * v.price, ["usd"], true);
      }
    }
    return c.done();
  },
};

const recInputs: SectionDef["inputs"] = [
  { id: "V", label: "Receiver volume", sym: "V", family: "volume", unit: "m3", solvable: true, min: 0 },
  { id: "t", label: "Duration of the event", sym: "t", family: "time", unit: "min", solvable: true, min: 0 },
  { id: "n", label: "Air demand during the event, not met by compressors", sym: "C", family: "gasflow", unit: "nm3min", min: 0 },
  { id: "p1", label: "Receiver pressure at the start", sym: "P₁", family: "pabs", unit: "barg" },
  { id: "p2", label: "Lowest acceptable pressure", sym: "P₂", family: "pabs", unit: "barg" },
  { id: "T", label: "Receiver temperature", sym: "T", family: "temp", unit: "c" },
];

const receiver: SectionDef = {
  id: "receiver",
  title: "Air receiver sizing",
  question: "How big a receiver do I need to ride through a demand peak, or how long will mine last?",
  formulas: ["V = t × ṅ × R × T ÷ (P₁ − P₂)   (ideal gas, isothermal)", "Same as the sourcebook form V = t × C × Pa ÷ (P₁ − P₂) with C in free air at receiver temperature"],
  solveNote: "Leave the volume blank to size a receiver, or the duration blank to see how long a receiver lasts.",
  inputs: recInputs,
  example: { title: "Ride through a 2-minute, 10 Nm³/min shortfall while pressure falls from 7 to 6 bar(g) at 30 °C.", values: { t: [2, "min"], n: [10, "nm3min"], p1: [7, "barg"], p2: [6, "barg"], T: [30, "c"] } },
  refs: [REF.doeAir],
  compute(v) {
    const c = new Calc(v);
    const L = labelsOf(recInputs);
    const miss = c.blank("n", "p1", "p2", "T");
    if (miss.length) return c.missing(miss, L);
    const dP = (c.n("p1") - c.n("p2")) * 1000;
    if (!(dP > 0)) return c.done("Start pressure must be above the lowest acceptable pressure.");
    const RT = R_UNIVERSAL * K(c.n("T"));
    const unk = c.blank("V", "t");
    if (unk.length !== 1) return c.done(unk.length ? "Enter either the receiver volume or the event duration." : "Leave the volume or the duration blank to solve it.");
    c.solved = unk[0];
    if (unk[0] === "V") {
      const V = (c.n("t") * c.n("n") * RT) / dP;
      c.step("Receiver volume", `V = ${fmt(c.n("t"))} s × ${fmt(c.n("n"))} mol/s × ${fmt(RT)} J/mol ÷ ${fmt(dP)} Pa = ${fmt(V)} m³ = ${q(V, "volume", "gal")}`, "V = t ṅ R T ÷ ΔP");
      c.result("V", "Receiver volume", "volume", V, ["m3", "gal", "ft3"], true);
    } else {
      const t = (c.n("V") * dP) / (c.n("n") * RT);
      c.step("Ride-through time", `t = ${fmt(c.n("V"))} × ${fmt(dP)} ÷ (${fmt(c.n("n"))} × ${fmt(RT)}) = ${fmt(t)} s`, "t = V ΔP ÷ (ṅ R T)");
      c.result("t", "Time the receiver can supply", "time", t, ["min", "s"], true);
    }
    return c.done();
  },
};

const demandInputs: SectionDef["inputs"] = [
  { id: "leak", label: "Leak allowance", family: "pct", unit: "pct", optional: true, min: 0, max: 100 },
  { id: "margin", label: "Future growth margin", family: "pct", unit: "pct", optional: true, min: 0, max: 200 },
];

const demand: SectionDef = {
  id: "demand",
  title: "Compressed air demand build-up",
  question: "How much air does the plant need, so we size compressors right?",
  formulas: ["Average = Σ (flow × quantity × use %)", "Peak = Σ (flow × quantity)", "Design = Average × (1 + leak %) × (1 + margin %)"],
  inputs: demandInputs,
  list: {
    id: "users",
    label: "Air users",
    maxRows: 60,
    columns: [
      { id: "name", label: "User", text: true },
      { id: "flow", label: "Flow each", family: "gasflow", unit: "nm3h" },
      { id: "qty", label: "Quantity" },
      { id: "use", label: "Use (% of time)" },
    ],
  },
  example: {
    title: "Instrument air, a bag filter pulse system, and tools, with 10 % leaks and 20 % growth.",
    values: { leak: [10, "pct"], margin: [20, "pct"] },
    lists: { users: [["Instrument air (control valves)", 2, 40, 100], ["Bag filter pulse cleaning", 30, 2, 50], ["Air tools", 40, 4, 25], ["Packaging line", 60, 1, 80]] },
  },
  refs: [REF.doeAir],
  compute(v, lists) {
    const c = new Calc(v);
    const rows = (lists.users ?? []).filter((r) => r[1] !== null && r[1] !== "" && Number.isFinite(Number(r[1])));
    if (!rows.length) return c.done("Add at least one air user with a flow.");
    let avg = 0, peak = 0;
    for (const r of rows) {
      const f = toSI("gasflow", "nm3h", Number(r[1]));
      const n = r[2] === null || r[2] === "" ? 1 : Number(r[2]);
      const u = r[3] === null || r[3] === "" ? 100 : Number(r[3]);
      peak += f * n;
      avg += f * n * (u / 100);
    }
    c.step("Average and connected demand", `Average = ${q(avg, "gasflow", "nm3h")};  all users at once = ${q(peak, "gasflow", "nm3h")}`, "Σ flow × qty × use %");
    const design = avg * (1 + (v.leak ?? 0) / 100) * (1 + (v.margin ?? 0) / 100);
    c.step("Design capacity", `${q(avg, "gasflow", "nm3h")} × (1 + ${fmt(v.leak ?? 0)}%) × (1 + ${fmt(v.margin ?? 0)}%) = ${q(design, "gasflow", "nm3h")}`);
    c.result("avg", "Average demand", "gasflow", avg, ["nm3h", "scfm"]);
    c.result("peak", "Connected (all at once) demand", "gasflow", peak, ["nm3h", "scfm"]);
    c.result("design", "Design compressor capacity", "gasflow", design, ["nm3h", "nm3min", "scfm"], true);
    return c.done();
  },
};

export const compressedAir: UtilityDef = {
  slug: "compressed-air",
  name: "Compressed Air Calculator",
  short: "Compressed air",
  sheet: "Compressed Air",
  problem: "How much air do we need, what does it cost to make, and how much are leaks wasting?",
  description: "Plant air demand build-up, multi-stage compressor power and discharge temperature, specific power, leak load from a no-demand test, air lost through a hole (choked flow), and receiver sizing.",
  keywords: "compressed air calculation compressor power kw scfm nm3/h free air delivered specific power kw/100 cfm compressed air leak cost leak test receiver sizing air demand instrument air discharge temperature",
  sections: [demand, comp, leakTest, hole, receiver],
  notes: [
    "Standard volumes are converted with the ideal gas law at the reference state named in each unit (Nm³ at 0 °C and 1 atm; scfm at 60 °F, 14.696 psia, or 68 °F, 14.7 psia).",
    "Compressor power assumes ideal intercooling back to inlet temperature and equal pressure ratio per stage.",
    "Dry air: molar mass 28.9647 g/mol, k = 1.4 unless you enter another k.",
  ],
};
