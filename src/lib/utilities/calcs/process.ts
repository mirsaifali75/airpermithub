import { Calc, K, labelsOf, q } from "../helpers";
import { liquid } from "../if97";
import type { SectionDef, UtilityDef } from "../types";
import { G, fmt, toSI } from "../units";
import { REF } from "./refs";

/** Darcy friction factor: 64/Re when laminar, Colebrook-White solved by fixed-point iteration otherwise. */
export function frictionFactor(Re: number, relRough: number) {
  if (Re < 2300) return { f: 64 / Re, regime: "laminar" as const, iterations: 0 };
  // Swamee-Jain as the starting value, then Colebrook to convergence.
  let f = 0.25 / Math.log10(relRough / 3.7 + 5.74 / Re ** 0.9) ** 2;
  let i = 0;
  for (; i < 50; i++) {
    const next = (-2 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)))) ** -2;
    if (Math.abs(next - f) < 1e-12) {
      f = next;
      break;
    }
    f = next;
  }
  return { f, regime: Re < 4000 ? ("transitional" as const) : ("turbulent" as const), iterations: i + 1 };
}

const balanceInputs: SectionDef["inputs"] = [
  { id: "loss", label: "Losses (evaporation, leaks, spillage), % of consumption", sym: "L%", family: "pct", unit: "pct", optional: true, min: 0, max: 100 },
  { id: "margin", soft: true, label: "Design margin", family: "pct", unit: "pct", optional: true, min: 0, max: 200 },
  { id: "rec", label: "Treatment recovery (RO / DM / softener), % (blank = none)", sym: "r", family: "pct", unit: "pct", optional: true, min: 1, max: 100, help: "Product water ÷ feed water for the treatment train, from the vendor's design." },
];

const demand: SectionDef = {
  id: "demand",
  title: "Process water demand and makeup",
  question: "What is the plant's net water demand after recycle, and how much raw water does treatment need?",
  formulas: [
    "Consumption = Σ (flow × quantity)",
    "Recycle = Σ (flow × quantity × recycled %)",
    "Net makeup = Consumption − Recycle + Losses",
    "Design = Net × (1 + margin)",
    "Raw water = Design ÷ recovery,   reject = Raw − Design",
  ],
  inputs: balanceInputs,
  list: {
    id: "users",
    label: "Water users",
    maxRows: 60,
    columns: [
      { id: "name", label: "User", text: true },
      { id: "flow", label: "Flow each", family: "vflow", unit: "m3h" },
      { id: "qty", label: "Quantity" },
      { id: "rec", label: "Recycled or returned (%)" },
    ],
  },
  example: {
    title: "Four users with condensate and rinse recycle, 5 % losses, 10 % margin, 75 % RO recovery.",
    values: { loss: [5, "pct"], margin: [10, "pct"], rec: [75, "pct"] },
    lists: { users: [["Boiler feed makeup", 12, 1, 0], ["Cooling tower makeup", 8, 1, 0], ["Process wash", 3, 2, 60], ["Reactor jackets (once-through)", 2, 1, 90]] },
  },
  refs: [REF.doePump],
  compute(v, lists) {
    const c = new Calc(v);
    const rows = (lists.users ?? []).filter((r) => r[1] !== null && r[1] !== "" && Number.isFinite(Number(r[1])));
    if (!rows.length) return c.done("Add at least one water user with a flow.");
    let cons = 0, recy = 0;
    const parts: string[] = [];
    for (const r of rows) {
      const f = toSI("vflow", "m3h", Number(r[1]));
      const n = r[2] === null || r[2] === "" ? 1 : Number(r[2]);
      const p = r[3] === null || r[3] === "" ? 0 : Number(r[3]);
      if (p < 0 || p > 100) c.warn(`${r[0] || "A user"}: recycled % should be between 0 and 100.`);
      cons += f * n;
      recy += f * n * (Math.min(Math.max(p, 0), 100) / 100);
      parts.push(`${fmt(Number(r[1]))}×${fmt(n)}`);
    }
    c.step("Consumption", `Σ = ${parts.join(" + ")} = ${q(cons, "vflow", "m3h")}`, "Σ (flow × quantity)");
    c.step("Recycle", `Σ (flow × quantity × recycled %) = ${q(recy, "vflow", "m3h")}`);
    const lossPct = v.loss ?? 0;
    const losses = cons * (lossPct / 100);
    const net = cons - recy + losses;
    c.step("Net makeup", `${fmt(cons * 3600)} − ${fmt(recy * 3600)} + ${fmt(losses * 3600)} = ${q(net, "vflow", "m3h")}`, "Consumption − Recycle + Losses");
    const design = net * (1 + (v.margin ?? 0) / 100);
    if (v.margin) c.step("Design flow", `${fmt(net * 3600)} × (1 + ${fmt(v.margin)}/100) = ${q(design, "vflow", "m3h")}`);
    c.result("cons", "Total consumption", "vflow", cons, ["m3h", "gpm"]);
    c.result("recy", "Recycled or returned", "vflow", recy, ["m3h", "gpm"]);
    c.result("losses", "Losses", "vflow", losses, ["m3h", "gpm"]);
    c.result("net", "Net makeup", "vflow", net, ["m3h", "gpm", "m3d"], true);
    c.result("design", "Design makeup (with margin)", "vflow", design, ["m3h", "gpm", "m3d"], true);
    if (v.rec) {
      const raw = design / (v.rec / 100);
      c.step("Treatment feed", `Raw = ${fmt(design * 3600)} ÷ ${fmt(v.rec / 100)} = ${q(raw, "vflow", "m3h")};  reject = ${q(raw - design, "vflow", "m3h")}`, "Raw = Product ÷ recovery");
      c.result("raw", "Raw water to treatment", "vflow", raw, ["m3h", "gpm", "m3d"], true);
      c.result("reject", "Treatment reject / brine", "vflow", raw - design, ["m3h", "gpm"]);
    }
    return c.done();
  },
};

const pipeInputs: SectionDef["inputs"] = [
  { id: "V", label: "Flow", sym: "V̇", family: "vflow", unit: "m3h", min: 0 },
  { id: "d", label: "Pipe inside diameter", sym: "D", family: "diam", unit: "mm", min: 0 },
  { id: "len", label: "Straight pipe length", sym: "L", family: "length", unit: "m", min: 0 },
  { id: "eps", label: "Pipe absolute roughness", sym: "ε", family: "rough", unit: "mm", min: 0, help: "From the pipe maker or a published table for your material and condition (new commercial steel is often taken near 0.045 mm)." },
  { id: "K", label: "Sum of fitting and valve K values", sym: "ΣK", family: "ratio", unit: "x", optional: true, min: 0 },
  { id: "dz", label: "Elevation rise (end minus start)", sym: "Δz", family: "head", unit: "m", optional: true },
  { id: "dp", label: "Extra pressure needed at the end (end minus start)", sym: "ΔP_end", family: "dp", unit: "kpa", optional: true },
  { id: "t", label: "Water temperature", sym: "T", family: "temp", unit: "c", min: 0, max: 300 },
];

const pipe: SectionDef = {
  id: "pipe",
  title: "Pipe velocity, friction loss, and pump head",
  question: "Is this line sized right, and how much head must the pump supply?",
  formulas: [
    "u = V̇ ÷ (π D² ÷ 4),   Re = ρ u D ÷ μ",
    "1 ÷ √f = −2 log₁₀(ε/(3.7D) + 2.51/(Re √f))   (Colebrook; f = 64/Re if laminar)",
    "h_f = f (L/D) u²/(2g),   h_K = ΣK u²/(2g)",
    "H = h_f + h_K + Δz + ΔP_end ÷ (ρ g)",
  ],
  inputs: pipeInputs,
  example: { title: "50 m³/h of 25 °C water through 200 m of 102 mm ID steel pipe, fittings ΣK = 8, rising 15 m.", values: { V: [50, "m3h"], d: [102.3, "mm"], len: [200, "m"], eps: [0.045, "mm"], K: [8, "x"], dz: [15, "m"], dp: [100, "kpa"], t: [25, "c"] } },
  refs: [REF.doePump, REF.if97, REF.visc],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "d", "len", "eps", "t");
    if (miss.length) return c.missing(miss, labelsOf(pipeInputs));
    const w = liquid(K(c.n("t")));
    c.step("Water properties", `At ${fmt(c.n("t"))} °C: ρ = ${fmt(w.rho)} kg/m³, μ = ${fmt(w.mu * 1000)} mPa·s (IAPWS-IF97 and IAPWS 2008 viscosity)`);
    const D = c.n("d");
    const A = (Math.PI * D * D) / 4;
    const u = c.n("V") / A;
    c.step("Velocity", `u = ${fmt(c.n("V"))} ÷ (π × ${fmt(D)}² ÷ 4) = ${fmt(u)} m/s`, "u = V̇ ÷ A");
    const Re = (w.rho * u * D) / w.mu;
    c.step("Reynolds number", `Re = ${fmt(w.rho)} × ${fmt(u)} × ${fmt(D)} ÷ ${fmt(w.mu)} = ${fmt(Re)}`, "Re = ρuD ÷ μ");
    const rr = c.n("eps") / D;
    const ff = frictionFactor(Re, rr);
    c.step("Friction factor", ff.regime === "laminar" ? `Laminar: f = 64 ÷ ${fmt(Re)} = ${fmt(ff.f)}` : `ε/D = ${fmt(rr)}; Colebrook converged in ${ff.iterations} iterations: f = ${fmt(ff.f)}`, ff.regime === "laminar" ? "f = 64/Re" : "Colebrook-White");
    if (ff.regime === "transitional") c.warn("Re is between 2,300 and 4,000 (transitional). The friction factor is uncertain there.");
    const vh = (u * u) / (2 * G);
    const hf = ff.f * (c.n("len") / D) * vh;
    const hk = (v.K ?? 0) * vh;
    c.step("Friction and fitting losses", `u²/2g = ${fmt(vh)} m;  h_f = ${fmt(ff.f)} × (${fmt(c.n("len"))} ÷ ${fmt(D)}) × ${fmt(vh)} = ${fmt(hf)} m;  h_K = ${fmt(v.K ?? 0)} × ${fmt(vh)} = ${fmt(hk)} m`);
    const hp = ((v.dp ?? 0) * 1000) / (w.rho * G);
    const H = hf + hk + (v.dz ?? 0) + hp;
    c.step("Total head", `H = ${fmt(hf)} + ${fmt(hk)} + ${fmt(v.dz ?? 0)} + ${fmt(hp)} = ${fmt(H)} m`, "H = h_f + h_K + Δz + ΔP/(ρg)");
    c.result("u", "Velocity", "vel", u, ["ms", "fts"], true);
    c.result("Re", "Reynolds number", "ratio", Re, ["x"]);
    c.result("f", "Darcy friction factor", "ratio", ff.f, ["x"]);
    c.result("hf", "Pipe friction loss", "head", hf, ["m", "ft"]);
    c.result("dpf", "Friction pressure drop (pipe + fittings)", "dp", (hf + hk) * w.rho * G / 1000, ["kpa", "bar", "psi"], true);
    c.result("dp100", "Friction loss per 100 m of pipe", "dp", ((hf / c.n("len")) * 100 * w.rho * G) / 1000, ["kpa", "psi"]);
    c.result("H", "Total head the pump must add", "head", H, ["m", "ft"], true);
    return c.done();
  },
};

const pumpInputs: SectionDef["inputs"] = [
  { id: "V", label: "Flow", sym: "V̇", family: "vflow", unit: "m3h", min: 0 },
  { id: "H", label: "Total head", sym: "H", family: "head", unit: "m", min: 0 },
  { id: "rho", label: "Liquid density (blank = water at 20 °C)", sym: "ρ", family: "rho", unit: "kgm3", optional: true, min: 0 },
  { id: "ep", label: "Pump efficiency", sym: "ηp", family: "pct", unit: "pct", min: 1, max: 100, help: "From the pump curve at the duty point." },
  { id: "em", label: "Motor efficiency (blank = 100 %)", sym: "ηm", family: "pct", unit: "pct", optional: true, min: 1, max: 100 },
  { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  { id: "price", label: "Electricity price", family: "price", unit: "kwh", optional: true, min: 0 },
];

const pump: SectionDef = {
  id: "pump",
  title: "Pump power and energy cost",
  question: "What size motor does this pump need, and what does it cost to run?",
  formulas: ["P_hyd = ρ g V̇ H", "P_shaft = P_hyd ÷ ηp", "P_elec = P_shaft ÷ ηm"],
  inputs: pumpInputs,
  example: { title: "50 m³/h against 36 m of head, 72 % pump and 94 % motor efficiency, 8,000 h/yr at $0.10/kWh.", values: { V: [50, "m3h"], H: [36, "m"], ep: [72, "pct"], em: [94, "pct"], hours: [8000, "h"], price: [0.1, "kwh"] } },
  refs: [REF.doePump],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("V", "H", "ep");
    if (miss.length) return c.missing(miss, labelsOf(pumpInputs));
    let rho = v.rho ?? null;
    if (rho === null) {
      rho = liquid(K(20)).rho;
      c.step("Density", `Water at 20 °C: ρ = ${fmt(rho)} kg/m³ (IAPWS-IF97)`);
    }
    const Ph = (rho * G * c.n("V") * c.n("H")) / 1000;
    c.step("Hydraulic power", `P_hyd = ${fmt(rho)} × ${fmt(G)} × ${fmt(c.n("V"))} × ${fmt(c.n("H"))} ÷ 1000 = ${fmt(Ph)} kW`, "P_hyd = ρ g V̇ H");
    const Ps = Ph / (c.n("ep") / 100);
    c.step("Shaft power", `P_shaft = ${fmt(Ph)} ÷ ${fmt(c.n("ep") / 100)} = ${fmt(Ps)} kW = ${q(Ps, "power", "hp")}`, "P_shaft = P_hyd ÷ ηp");
    const em = (v.em ?? 100) / 100;
    const Pe = Ps / em;
    if (v.em) c.step("Electrical input", `P_elec = ${fmt(Ps)} ÷ ${fmt(em)} = ${fmt(Pe)} kW`, "P_elec = P_shaft ÷ ηm");
    c.result("Ph", "Hydraulic power", "power", Ph, ["kw", "hp"]);
    c.result("Ps", "Shaft (brake) power", "power", Ps, ["kw", "hp"], true);
    c.result("Pe", "Electrical input", "power", Pe, ["kw", "hp"], true);
    if (v.hours) {
      const kwh = Pe * (v.hours / 3600);
      c.step("Annual energy", `${fmt(Pe)} kW × ${fmt(v.hours / 3600)} h = ${fmt(kwh)} kWh`);
      c.result("kwh", "Annual electricity", "energy", kwh, ["kwh", "mwh"]);
      if (v.price) c.result("cost", "Annual electricity cost", "money", kwh * v.price, ["usd"], true);
    }
    return c.done();
  },
};

export const processWater: UtilityDef = {
  slug: "process-water",
  name: "Process Water Calculator",
  short: "Process water",
  sheet: "Process Water",
  problem: "What is our real water demand after recycle, will the pipe carry it, and what size pump do we need?",
  description: "Plant water balance from a list of users with recycle, losses, margin, and RO/DM recovery; pipe velocity, Reynolds number, Colebrook friction factor and head loss; pump hydraulic, shaft, and electrical power with annual cost.",
  keywords: "process water demand calculation water balance makeup water ro recovery dm water pipe sizing pressure drop darcy weisbach colebrook friction factor reynolds number pump head pump power kw energy cost",
  sections: [demand, pipe, pump],
  notes: [
    "Water density and viscosity come from IAPWS-IF97 and the IAPWS 2008 viscosity formulation at the temperature you enter.",
    "Friction uses Darcy-Weisbach with the Colebrook-White friction factor, solved to convergence (laminar flow uses 64/Re).",
    "Pump head from the pipe section can be carried straight into the pump power section.",
  ],
};
