import { RT } from "../../tools/rule-text";
import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { P_ATM_KPA, R_UNIVERSAL, fmt, fromSI, toSI } from "../units";
import { AIR } from "./refs";

/**
 * Net heating values (Btu/scf, 20 °C standard volume) copied from Table 12 to
 * subpart CC of part 63 ("Individual Component Properties"). Hydrogen is listed
 * there as 1,212 Btu/scf for subpart CC, with the footnote that its
 * theoretical value is 274 Btu/scf; the 60.18 / 63.11 calculation uses 274.
 */
export const TABLE12: { id: string; name: string; nhv: number }[] = [
  { id: "c1", name: "Methane", nhv: 896 },
  { id: "c2", name: "Ethane", nhv: 1595 },
  { id: "c3", name: "Propane", nhv: 2281 },
  { id: "ic4", name: "iso-Butane", nhv: 2957 },
  { id: "nc4", name: "n-Butane", nhv: 2968 },
  { id: "c5p", name: "Pentane+ (C5+)", nhv: 3655 },
  { id: "c2h4", name: "Ethylene", nhv: 1477 },
  { id: "c3h6", name: "Propylene", nhv: 2150 },
  { id: "cbut", name: "cis-Butene", nhv: 2830 },
  { id: "ibut", name: "iso-Butene", nhv: 2928 },
  { id: "tbut", name: "trans-Butene", nhv: 2826 },
  { id: "bd12", name: "1,2-Butadiene", nhv: 2794 },
  { id: "bd13", name: "1,3-Butadiene", nhv: 2690 },
  { id: "c2h2", name: "Acetylene", nhv: 1404 },
  { id: "macet", name: "Methyl-Acetylene", nhv: 2088 },
  { id: "propd", name: "Propadiene", nhv: 2066 },
  { id: "cprop", name: "Cyclopropane", nhv: 2185 },
  { id: "bz", name: "Benzene", nhv: 3591 },
  { id: "h2", name: "Hydrogen", nhv: 1212 },
  { id: "co", name: "Carbon Monoxide", nhv: 316 },
  { id: "h2s", name: "Hydrogen Sulfide", nhv: 587 },
  { id: "co2", name: "Carbon Dioxide", nhv: 0 },
  { id: "n2", name: "Nitrogen", nhv: 0 },
  { id: "o2", name: "Oxygen", nhv: 0 },
  { id: "h2o", name: "Water", nhv: 0 },
];
export const H2_THEORETICAL = 274;

/** 60.18(f)(3) constant K, (1/ppm)(g mole/scm)(MJ/kcal), printed as a picture in eCFR (annual CFR 2023, page 87). */
export const K_6018 = 1.74e-7;
/** MJ/scm per Btu/scf (Btu IT, exact ft³). */
export const MJSCM_PER_BTUSCF = toSI("vhv", "btuscf", 1);

const RULES = [
  { value: 1, label: "40 CFR 60.18 (NSPS, part 60 and 61 subparts)" },
  { value: 2, label: "40 CFR 63.11(b) (NESHAP, part 63 subparts)" },
];
const TYPES = [
  { value: 1, label: "Steam-assisted" },
  { value: 2, label: "Air-assisted" },
  { value: 3, label: "Nonassisted" },
];

const nhvIn: InputDef[] = [
  { id: "basis", label: "Hydrogen net heating value to use", family: "count", unit: "n", choices: [{ value: 1, label: "274 Btu/scf, theoretical (60.18 and 63.11)" }, { value: 2, label: "1,212 Btu/scf (refinery flares, 63.670 subpart CC)" }] },
  { id: "type", label: "Flare type", family: "count", unit: "n", choices: TYPES },
  ...TABLE12.map((c): InputDef => ({ id: c.id, label: `${c.name}${c.nhv ? "" : " (inert)"}`, family: "pct", unit: "pct", optional: true, min: 0, max: 100, help: c.id === "h2" ? "Table 12 NHV: 1,212 (subpart CC), theoretical 274." : `Table 12 NHV: ${fmt(c.nhv)} Btu/scf` })),
  { id: "ox1", label: "Other component A", family: "pct", unit: "pct", optional: true, min: 0, max: 100, help: "A component not in Table 12." },
  { id: "hx1", label: "Other component A: net heating value", family: "vhv", unit: "btuscf", optional: true, min: 0, max: toSI("vhv", "btuscf", 10000), help: "Published net heat of combustion at 25 °C, volume at 20 °C." },
  { id: "ox2", label: "Other component B", family: "pct", unit: "pct", optional: true, min: 0, max: 100 },
  { id: "hx2", label: "Other component B: net heating value", family: "vhv", unit: "btuscf", optional: true, min: 0, max: toSI("vhv", "btuscf", 10000) },
];

/** Minimum net heating value of 60.18(c)(3)(ii) / 63.11(b)(6)(ii), MJ/scm. */
export const minNhv = (type: number) => (type === 3 ? 7.45 : 11.2);

const nhv: SectionDef = {
  id: "net-heating-value",
  title: "Net heating value of the gas combusted",
  question: "From a gas analysis, what is the net heating value of the flare gas, and does it meet the 300 or 200 Btu/scf minimum?",
  formulas: [
    "40 CFR 60.18(f)(3): H_T = K Σ Cᵢ Hᵢ,  K = 1.740 × 10⁻⁷ (1/ppm)(g mole/scm)(MJ/kcal)",
    "Same sum per scf: NHV = Σ xᵢ NHVᵢ (Btu/scf), with NHVᵢ from Table 12 to subpart CC",
    "H_T (MJ/scm) = NHV (Btu/scf) × 0.0372589",
  ],
  inputs: nhvIn,
  solveNote: "Enter the analysis in mole (volume) percent on a wet basis. Leave components that are not present blank.",
  example: {
    title: "A steam-assisted flare burning 60 % methane, 10 % ethane, 5 % propane, 2 % n-butane, 8 % hydrogen, 10 % nitrogen and 5 % CO2.",
    values: { basis: [1, "n"], type: [1, "n"], c1: [60, "pct"], c2: [10, "pct"], c3: [5, "pct"], nc4: [2, "pct"], h2: [8, "pct"], n2: [10, "pct"], co2: [5, "pct"] },
  },
  refs: [AIR.ecfr6018, AIR.cfr6018Pdf, AIR.ecfr6311, AIR.ccTable12],
  quotes: [RT.flareNhv, RT.flareHt, RT.flareCi, RT.flareHi, RT.ccNhvi, RT.ccH2],
  compute(v) {
    const c = new Calc(v);
    const cc = v.basis === 2;
    const terms: { name: string; x: number; nhv: number }[] = [];
    for (const comp of TABLE12) {
      const x = v[comp.id];
      if (x === null || x === undefined) continue;
      terms.push({ name: comp.name, x, nhv: comp.id === "h2" && !cc ? H2_THEORETICAL : comp.nhv });
    }
    for (const k of [1, 2]) {
      const x = v[`ox${k}`], h = v[`hx${k}`];
      if ((x === null || x === undefined) !== (h === null || h === undefined)) return c.done(`Other component ${k === 1 ? "A" : "B"} needs both its percent and its net heating value.`);
      if (x !== null && x !== undefined && h !== null && h !== undefined) terms.push({ name: `Other component ${k === 1 ? "A" : "B"}`, x, nhv: fromSI("vhv", "btuscf", h) });
    }
    if (!terms.length) return c.done("Enter the gas analysis: the mole percent of each component present.");
    const total = terms.reduce((a, t) => a + t.x, 0);
    if (total > 100.5) return c.done(`The components add up to ${fmt(total)} %, more than 100 %. Check the analysis.`);
    const sum = terms.reduce((a, t) => a + (t.x / 100) * t.nhv, 0);
    c.step("Sum of xᵢ × NHVᵢ", terms.filter((t) => t.nhv > 0).map((t) => `${fmt(t.x / 100, 4)} × ${fmt(t.nhv)}`).join(" + ") + ` = ${fmt(sum, 5)} Btu/scf`, "NHV = Σ xᵢ NHVᵢ");
    const ht = sum * MJSCM_PER_BTUSCF;
    c.step("In the units of 60.18", `H_T = ${fmt(sum, 5)} Btu/scf × ${fmt(MJSCM_PER_BTUSCF, 6)} = ${fmt(ht, 5)} MJ/scm`);
    const type = v.type ?? 1;
    c.result("nhv", "Net heating value of the gas, H_T", "vhv", toSI("vhv", "btuscf", sum), ["btuscf", "mjscm"], true);
    c.result("total", "Components entered (total)", "pct", total, ["pct"]);
    if (Math.abs(total - 100) > 1) c.warn(`The analysis adds up to ${fmt(total)} %. Each concentration is used as entered (not normalized); add the missing components or check the analysis.`);
    if (cc) {
      c.warn("Subpart CC refinery flares are judged on the combustion zone net heating value (63.670(e)), which also counts steam, assist gas, and premix air. This section gives NHV_vg of the vent gas only and does not check a limit.");
      return c.done();
    }
    const min = minNhv(type);
    c.result("min", "Minimum net heating value for this flare type", "vhv", min, ["mjscm", "btuscf"]);
    c.check(ht >= min, `${TYPES[type - 1].label}: H_T ${fmt(ht, 4)} MJ/scm ${ht >= min ? "is at least" : "is below"} the ${fmt(min)} MJ/scm (${type === 3 ? 200 : 300} Btu/scf) minimum of 60.18(c)(3)(ii) and 63.11(b)(6)(ii).`);
    if (v.h2 && v.h2 > 0) c.warn("Hydrogen is counted at its theoretical 274 Btu/scf, the published value; subpart CC uses 1,212 Btu/scf only for its own flare requirements.");
    return c.done();
  },
};

const velIn: InputDef[] = [
  { id: "rule", label: "Rule", family: "count", unit: "n", choices: RULES },
  { id: "type", label: "Flare type", family: "count", unit: "n", choices: TYPES },
  { id: "ht", label: "Net heating value of the gas, H_T", sym: "H_T", family: "vhv", unit: "btuscf", min: 0, max: toSI("vhv", "btuscf", 5000), help: "From section 1 or a calorimeter." },
  { id: "q", label: "Gas flow to the flare at standard conditions", sym: "Q", family: "gasflow", unit: "scfh20", min: 0, help: "Vent gas plus any fuel gas burned through the tip; not steam or assist air." },
  { id: "d", label: "Flare tip inside diameter", sym: "D", family: "diam", unit: "in", optional: true, min: 0.0001, max: 5 },
  { id: "area", label: "Unobstructed (free) tip area, if not the full circle", sym: "A", family: "area", unit: "ft2", optional: true, min: 0, help: "Overrides the diameter. Subtract center steam tubes or other obstructions." },
  { id: "xh2", label: "Hydrogen in the gas (optional, for the hydrogen option)", sym: "X_H2", family: "pct", unit: "pct", optional: true, min: 0, max: 100, help: "Volume percent, wet basis. Only nonassisted flares can use 60.18(c)(3)(i)." },
];

/** Paragraph names in each rule. */
const P = {
  1: { nhv: "60.18(c)(3)(ii)", v60: "60.18(c)(4)(i)", v400: "60.18(c)(4)(ii)", vmax: "60.18(c)(4)(iii)", air: "60.18(c)(5)", h2: "60.18(c)(3)(i)" },
  2: { nhv: "63.11(b)(6)(ii)", v60: "63.11(b)(7)(i)", v400: "63.11(b)(7)(ii)", vmax: "63.11(b)(7)(iii)", air: "63.11(b)(8)", h2: "63.11(b)(6)(i)" },
} as const;

/** Exit velocity limits of 60.18(c) / 63.11(b). V and H_T in m/s and MJ/scm. */
export function flareVelocity(rule: 1 | 2, type: number, V: number, ht: number) {
  const vmaxF5 = Math.pow(10, (ht + 28.8) / 31.7);
  const vmaxAir = rule === 1 ? 8.706 + 0.7084 * ht : 8.71 + 0.708 * ht;
  if (type === 2) return { vmaxF5, vmaxAir, pass: V < vmaxAir, via: V < vmaxAir ? "air" : null };
  const a = V < 18.3;
  const b = V >= 18.3 && V < 122 && ht > 37.3;
  const c = V < vmaxF5 && V < 122;
  return { vmaxF5, vmaxAir, pass: a || b || c, via: a ? "v60" : b ? "v400" : c ? "vmax" : null };
}

const velocity: SectionDef = {
  id: "exit-velocity",
  title: "Exit velocity and maximum permitted velocity",
  question: "What is the flare tip exit velocity, and is it within the 60.18(c)(4) or (c)(5) limit for this heating value?",
  formulas: [
    "V = Q (standard conditions) ÷ A (unobstructed tip area)",
    "Steam-assisted and nonassisted: V < 18.3 m/s; or V < 122 m/s with H_T > 37.3 MJ/scm; or V < V_max and < 122 m/s, log₁₀(V_max) = (H_T + 28.8) ÷ 31.7",
    "Air-assisted: V < V_max = 8.706 + 0.7084 H_T (60.18) or 8.71 + 0.708 H_T (63.11)",
    "Hydrogen option, nonassisted: D ≥ 3 in, X_H2 ≥ 8.0 %, V < 37.2 m/s and V < (X_H2 − 6.0) × 3.9",
  ],
  solveNote: "Enter the tip diameter or the unobstructed area.",
  inputs: velIn,
  example: {
    title: "A steam-assisted flare with a 24 in tip burning 1.2 million scf/h of 892 Btu/scf gas, checked against 60.18.",
    values: { rule: [1, "n"], type: [1, "n"], ht: [892.4, "btuscf"], q: [1_200_000, "scfh20"], d: [24, "in"] },
  },
  refs: [AIR.ecfr6018, AIR.ecfr6311, AIR.ecfr602],
  quotes: [RT.flareChoice, RT.flareNhv, RT.flareV60, RT.flareV400, RT.flareVmaxAllowed, RT.flareVmaxF5, RT.flareAir, RT.flareVmaxF6, RT.flare63Vmax, RT.flareExitV, RT.flare63ExitV, RT.flareH2, RT.flareH2Vmax, RT.flareH2K1, RT.flareH2K2],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("ht", "q");
    if (miss.length) return c.missing(miss, labelsOf(velIn));
    if (c.blank("d", "area").length === 2) return c.done("Enter the flare tip diameter or its unobstructed area.");
    const rule = (v.rule === 2 ? 2 : 1) as 1 | 2;
    const type = v.type ?? 1;
    const p = P[rule];
    const ht = c.n("ht");
    const A = v.area !== null && v.area !== undefined ? v.area : (Math.PI * (v.d as number) ** 2) / 4;
    if (!(A > 0)) return c.done("The tip area must be greater than zero.");
    // Standard volume at 293.15 K and 101.325 kPa (40 CFR 60.2).
    const Vstd = (c.n("q") * R_UNIVERSAL * 293.15) / (P_ATM_KPA * 1000);
    const V = Vstd / A;
    c.step("Tip area", v.area !== null && v.area !== undefined ? `A = ${fmt(fromSI("area", "ft2", A))} ft² (entered)` : `A = π × ${fmt((v.d as number) / 0.0254)}² ÷ 4 in² = ${fmt(fromSI("area", "ft2", A))} ft² = ${fmt(A, 5)} m²`);
    c.step("Exit velocity", `Q = ${fmt(Vstd, 5)} m³/s at 20 °C and 760 mm Hg;  V = ${fmt(Vstd, 5)} ÷ ${fmt(A, 5)} = ${fmt(V)} m/s = ${fmt(V / 0.3048)} ft/s`, "V = Q ÷ A");
    c.result("v", "Exit velocity", "vel", V, ["ms", "fts"], true);
    const r = flareVelocity(rule, type, V, ht);
    const nhvMin = minNhv(type);
    const nhvOk = c.check(ht >= nhvMin, `Heating value (${p.nhv}): H_T ${fmt(ht, 4)} MJ/scm ${ht >= nhvMin ? "is at least" : "is below"} the ${fmt(nhvMin)} MJ/scm minimum for a ${TYPES[type - 1].label.toLowerCase()} flare.`);
    if (type === 2) {
      c.step("Maximum permitted velocity, air-assisted", rule === 1 ? `V_max = 8.706 + 0.7084 × ${fmt(ht, 5)} = ${fmt(r.vmaxAir)} m/s` : `V_max = 8.71 + 0.708 × ${fmt(ht, 5)} = ${fmt(r.vmaxAir)} m/s`);
      c.result("vmax", "Maximum permitted velocity, V_max", "vel", r.vmaxAir, ["ms", "fts"], true);
      c.check(r.pass, `Velocity (${p.air}): ${fmt(V)} m/s ${r.pass ? "is less than" : "is not less than"} V_max ${fmt(r.vmaxAir)} m/s.`);
    } else {
      c.step("Maximum permitted velocity from the heating value", `log₁₀(V_max) = (${fmt(ht, 5)} + 28.8) ÷ 31.7 = ${fmt((ht + 28.8) / 31.7, 5)};  V_max = ${fmt(r.vmaxF5)} m/s`, "60.18(f)(5)");
      c.result("vmax", "Maximum permitted velocity, V_max (f)(5)", "vel", r.vmaxF5, ["ms", "fts"], true);
      const how =
        r.via === "v60" ? `is less than 18.3 m/s (${p.v60})` :
        r.via === "v400" ? `is at least 18.3 but less than 122 m/s with H_T above 37.3 MJ/scm (${p.v400})` :
        r.via === "vmax" ? `is less than V_max ${fmt(r.vmaxF5)} m/s and less than 122 m/s (${p.vmax})` :
        `is not below 18.3 m/s, ${ht > 37.3 ? "is not below 122 m/s" : "H_T is not above 37.3 MJ/scm"}, and is not below both V_max ${fmt(r.vmaxF5)} m/s and 122 m/s`;
      c.check(r.pass, `Velocity: ${fmt(V)} m/s ${how}.`);
    }
    if (type === 3 && v.xh2 !== null && v.xh2 !== undefined) {
      const x = v.xh2;
      const vmaxH = (x - 6.0) * 3.9;
      const dIn = v.d !== null && v.d !== undefined ? v.d / 0.0254 : Math.sqrt((4 * A) / Math.PI) / 0.0254;
      c.step("Hydrogen option", `V_max = (${fmt(x)} − 6.0) × 3.9 = ${fmt(vmaxH)} m/s; tip ${fmt(dIn)} in${v.d === null || v.d === undefined ? " (diameter of a circle with the entered area)" : ""}`, "(X_H2 − K₁) × K₂");
      c.result("vmaxh2", "Hydrogen option V_max", "vel", Math.max(vmaxH, 0), ["ms", "fts"]);
      const ok = dIn >= 3 && x >= 8.0 && V < 37.2 && V < vmaxH;
      c.check(ok, `Hydrogen option (${p.h2}): ${ok ? "met" : "not met"}. Tip ${fmt(dIn)} in (needs ≥ 3), hydrogen ${fmt(x)} % (needs ≥ 8.0), velocity ${fmt(V)} m/s (needs < 37.2 and < ${fmt(vmaxH)}).`);
    }
    if (!nhvOk && type !== 3) c.warn("Below the minimum heating value, the velocity limits of (c)(4) and (c)(5) do not make the flare compliant: both the heat content and the velocity requirement apply together.");
    c.warn("This checks the design specifications of 60.18(c)(3) to (c)(5) only. The subpart that sends the gas to the flare sets monitoring, and visible emissions (Method 22) and pilot flame requirements still apply.");
    return c.done();
  },
};

export const flare6018: UtilityDef = {
  slug: "flare-60-18-check",
  name: "Flare Net Heating Value & Exit Velocity Check (40 CFR 60.18 / 63.11)",
  short: "Flare 60.18 check",
  problem: "Does my flare gas have enough heating value, and is the tip velocity within the 60.18 limit?",
  description: "Check a flare against the 40 CFR 60.18(c) and 63.11(b) design specifications: net heating value from a gas analysis using the Table 12 component heating values, exit velocity from flow and tip size, the maximum permitted velocity for steam-assisted, air-assisted and nonassisted flares, and the hydrogen option, with the rule text quoted word for word.",
  keywords: "flare 60.18 63.11 net heating value 300 btu/scf 200 btu/scf exit velocity tip velocity vmax maximum permitted velocity steam-assisted air-assisted nonassisted flare hydrogen flare compliance nsps neshap flare gas heating value table 12 subpart cc nhv",
  sheet: "Flare 60.18",
  sections: [nhv, velocity],
  notes: [
    "Equations and limits are those of 40 CFR 60.18(c) and (f), and 63.11(b), quoted word for word below each section.",
    "Component heating values are Table 12 to subpart CC of part 63, an EPA-published table at the 20 °C standard volume 60.18 uses.",
    "Velocity is compared in m/s, the units the rule states first; ft/s values in the rule are rounded conversions.",
    "Refinery flares under subpart CC (63.670) have combustion zone limits that this tool does not check.",
  ],
};
