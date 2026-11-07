import { Calc, K, MPa, labelsOf, q } from "../helpers";
import { RangeError97, region1, satP, waterPT } from "../if97";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { fmt } from "../units";
import { REF } from "./refs";

/** Steam at p (kPa abs): saturated vapor when T is blank, superheated vapor at T (°C) otherwise. */
export function steamState(c: Calc, pKpa: number, tC: number | null, label = "Steam") {
  const sat = satP(MPa(pKpa));
  const tsatC = sat.T - 273.15;
  if (tC === null) {
    c.step(`${label}: saturated vapor at ${q(pKpa, "pabs", "kpaa")}`, `Tsat = ${fmt(tsatC)} °C, hg = ${fmt(sat.hg)} kJ/kg, vg = ${fmt(sat.vg)} m³/kg (IAPWS-IF97)`);
    return { h: sat.hg, v: sat.vg, s: sat.sg, sat, superheat: 0 };
  }
  if (tC < tsatC - 0.05) throw new RangeError97(`${label} temperature ${fmt(tC)} °C is below the saturation temperature ${fmt(tsatC)} °C at this pressure, so it would be liquid. Leave the temperature blank for saturated steam.`);
  const st = waterPT(MPa(pKpa), K(Math.max(tC, tsatC + 1e-6)));
  c.step(`${label}: superheated vapor at ${q(pKpa, "pabs", "kpaa")}, ${fmt(tC)} °C`, `superheat = ${fmt(tC - tsatC)} °C, h = ${fmt(st.h)} kJ/kg, v = ${fmt(st.v)} m³/kg (IAPWS-IF97 region 2)`);
  return { h: st.h, v: st.v, s: st.s, sat, superheat: tC - tsatC };
}

const P = (id: string, label: string, sym: string, extra: Partial<InputDef> = {}): InputDef => ({ id, label, sym, family: "pabs", unit: "barg", min: 0.611657, max: 16529, ...extra });

const props: SectionDef = {
  id: "properties",
  title: "Steam table lookup",
  question: "What are the saturation temperature, enthalpy, and specific volume at this pressure?",
  formulas: ["hfg = hg − hf", "Superheat = T − Tsat", "Properties from IAPWS-IF97 regions 1, 2, and 4"],
  inputs: [
    P("p", "Pressure", "P"),
    { id: "t", label: "Temperature (blank = saturated)", sym: "T", family: "temp", unit: "c", optional: true, min: 0, max: 800 },
  ],
  example: { title: "10 bar(g) saturated steam, the most common plant header.", values: { p: [10, "barg"] } },
  refs: [REF.if97],
  compute(v) {
    const c = new Calc(v);
    if (c.blank("p").length) return c.missing(["p"], labelsOf(props.inputs));
    try {
      const s = satP(MPa(c.n("p")));
      const tsatC = s.T - 273.15;
      c.step("Saturation temperature", `Tsat(${q(c.n("p"), "pabs", "kpaa")}) = ${fmt(tsatC)} °C`, "IF97 eq. (31)");
      c.step("Latent heat", `hfg = ${fmt(s.hg)} − ${fmt(s.hf)} = ${fmt(s.hfg)} kJ/kg`, "hfg = hg − hf");
      c.result("tsat", "Saturation temperature", "temp", tsatC, ["c", "f"], true);
      c.result("hf", "hf, saturated liquid enthalpy", "hspec", s.hf, ["kjkg", "btulb"]);
      c.result("hfg", "hfg, latent heat", "hspec", s.hfg, ["kjkg", "btulb"], true);
      c.result("hg", "hg, saturated vapor enthalpy", "hspec", s.hg, ["kjkg", "btulb"], true);
      c.result("vg", "vg, saturated vapor specific volume (m³/kg)", "ratio", s.vg, ["x"]);
      c.result("rhog", "Saturated vapor density", "rho", 1 / s.vg, ["kgm3", "lbft3"]);
      c.result("vf", "vf, saturated liquid specific volume (m³/kg)", "ratio", s.vf, ["x"]);
      c.result("sg", "sg, saturated vapor entropy (kJ/kg·K)", "ratio", s.sg, ["x"]);
      const t = v.t;
      if (t !== null && t !== undefined) {
        const st = waterPT(MPa(c.n("p")), K(t));
        const phase = st.region === 1 ? "compressed liquid" : "superheated vapor";
        c.step(`State at ${fmt(t)} °C`, `${phase}: h = ${fmt(st.h)} kJ/kg, v = ${fmt(st.v)} m³/kg, cp = ${fmt(st.cp)} kJ/kg·K`, `IF97 region ${st.region}`);
        c.result("h", `h at ${fmt(t)} °C (${phase})`, "hspec", st.h, ["kjkg", "btulb"], true);
        c.result("v", `v at ${fmt(t)} °C (m³/kg)`, "ratio", st.v, ["x"]);
        c.result("cp", `cp at ${fmt(t)} °C`, "cp", st.cp, ["kjkgk", "btulbf"]);
        if (st.region === 2) c.result("superheat", "Degrees of superheat", "dtemp", t - tsatC, ["k", "f"]);
      }
    } catch (e) {
      return c.done((e as Error).message);
    }
    return c.done();
  },
};

const heating: SectionDef = {
  id: "heating",
  title: "Steam for process heating or a reboiler",
  question: "How much steam does this heater, reboiler, or jacket need?",
  formulas: [
    "Q = ṁp × cp × (T₂ − T₁)   (or enter the duty Q directly)",
    "Q_steam = Q ÷ (1 − losses ÷ 100)",
    "ṁs = Q_steam ÷ (h_steam − h_condensate)",
  ],
  inputs: [
    { id: "Q", label: "Heat duty (blank = from process stream)", sym: "Q", family: "power", unit: "kw", optional: true, min: 0 },
    { id: "mp", label: "Process flow", sym: "ṁp", family: "mflow", unit: "kgh", optional: true, min: 0 },
    { id: "cp", label: "Process specific heat", sym: "cp", family: "cp", unit: "kjkgk", optional: true, min: 0, help: "From the fluid's data sheet. Water is about 4.18 kJ/kg·K." },
    { id: "t1", label: "Process inlet", sym: "T₁", family: "temp", unit: "c", optional: true },
    { id: "t2", label: "Process outlet", sym: "T₂", family: "temp", unit: "c", optional: true },
    P("ps", "Steam pressure at the heater", "Ps"),
    { id: "ts", label: "Steam temperature (blank = saturated)", sym: "Ts", family: "temp", unit: "c", optional: true },
    { id: "tc", label: "Condensate leaving (blank = saturated at steam pressure)", sym: "Tc", family: "temp", unit: "c", optional: true },
    { id: "loss", label: "Heat losses", sym: "L", family: "pct", unit: "pct", optional: true, min: 0, max: 99 },
    { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
  ],
  example: {
    title: "Heat 20,000 kg/h of water-like product from 30 °C to 90 °C with 4 bar(g) saturated steam and 5% losses.",
    values: { mp: [20000, "kgh"], cp: [4.18, "kjkgk"], t1: [30, "c"], t2: [90, "c"], ps: [4, "barg"], loss: [5, "pct"], hours: [8000, "h"] },
  },
  refs: [REF.if97, REF.doeSteam],
  compute(v) {
    const c = new Calc(v);
    const L = labelsOf(heating.inputs);
    if (c.blank("ps").length) return c.missing(["ps"], L);
    let Q: number;
    if (v.Q !== null && v.Q !== undefined) {
      Q = c.n("Q");
      c.step("Heat duty (entered)", `Q = ${q(Q, "power", "kw")}`);
    } else {
      const miss = c.blank("mp", "cp", "t1", "t2");
      if (miss.length) return c.done(`Enter the heat duty Q, or all of: ${miss.map((i) => L[i]).join(", ")}.`);
      Q = c.n("mp") * c.n("cp") * (c.n("t2") - c.n("t1"));
      c.step("Process heat duty", `Q = ${fmt(c.n("mp"))} kg/s × ${fmt(c.n("cp"))} kJ/kg·K × (${fmt(c.n("t2"))} − ${fmt(c.n("t1"))}) °C = ${q(Q, "power", "kw")}`, "Q = ṁp × cp × (T₂ − T₁)");
      if (Q <= 0) return c.done("The outlet must be hotter than the inlet for steam heating.");
    }
    const loss = v.loss ?? 0;
    const Qs = Q / (1 - loss / 100);
    if (loss) c.step("Allow for losses", `Q_steam = ${fmt(Q)} ÷ (1 − ${fmt(loss)}/100) = ${q(Qs, "power", "kw")}`, "Q_steam = Q ÷ (1 − L)");
    try {
      const s = steamState(c, c.n("ps"), v.ts ?? null);
      let hc = s.sat.hf;
      if (v.tc !== null && v.tc !== undefined) {
        const tsatC = s.sat.T - 273.15;
        if (v.tc > tsatC + 0.05) return c.done(`Condensate at ${fmt(v.tc)} °C is above the saturation temperature ${fmt(tsatC)} °C; it would be steam.`);
        hc = region1(MPa(c.n("ps")), K(v.tc)).h;
        c.step("Subcooled condensate", `h_c at ${fmt(v.tc)} °C = ${fmt(hc)} kJ/kg`);
      } else c.step("Condensate leaves saturated", `h_c = hf = ${fmt(hc)} kJ/kg`);
      const dh = s.h - hc;
      const ms = Qs / dh;
      c.step("Steam flow", `ṁs = ${fmt(Qs)} kW ÷ (${fmt(s.h)} − ${fmt(hc)}) kJ/kg = ${fmt(ms)} kg/s = ${q(ms, "mflow", "kgh")}`, "ṁs = Q_steam ÷ (h_steam − h_c)");
      c.result("Q", "Heat duty", "power", Q, ["kw", "mmbtuh", "btuh"]);
      c.result("Qs", "Heat from steam (with losses)", "power", Qs, ["kw", "mmbtuh"]);
      c.result("dh", "Heat given up per kg of steam", "hspec", dh, ["kjkg", "btulb"]);
      c.result("ms", "Steam required", "mflow", ms, ["kgh", "th", "lbh"], true);
      c.result("mc", "Condensate returned (same mass)", "mflow", ms, ["kgh", "lbh"]);
      if (v.hours) {
        const annual = ms * v.hours;
        c.step("Annual steam", `${fmt(ms * 3600)} kg/h × ${fmt(v.hours / 3600)} h = ${fmt(annual / 1000)} t/yr`);
        c.result("annual", "Annual steam (tonnes per year)", "ratio", annual / 1000, ["x"]);
      }
    } catch (e) {
      return c.done((e as Error).message);
    }
    return c.done();
  },
};

const boiler: SectionDef = {
  id: "boiler",
  title: "Boiler fuel, feedwater, and blowdown",
  question: "How much fuel, feedwater, and blowdown does this steam load need?",
  formulas: [
    "b = blowdown % ÷ 100   or   b = TDS_feed ÷ TDS_boiler",
    "ṁfw = ṁs ÷ (1 − b),  ṁbd = ṁfw × b",
    "Q_out = ṁs × (h_steam − h_fw) + ṁbd × (hf − h_fw)",
    "Fuel input = Q_out ÷ η,   fuel flow = fuel input ÷ HHV",
  ],
  inputs: [
    { id: "ms", label: "Steam generated", sym: "ṁs", family: "mflow", unit: "kgh", min: 0 },
    P("p", "Boiler drum pressure", "P"),
    { id: "ts", label: "Steam temperature (blank = saturated)", sym: "Ts", family: "temp", unit: "c", optional: true },
    { id: "tfw", label: "Feedwater temperature", sym: "Tfw", family: "temp", unit: "c", min: 0, max: 350 },
    { id: "bd", label: "Blowdown, % of feedwater", sym: "b", family: "pct", unit: "pct", optional: true, min: 0, max: 50 },
    { id: "tdsf", label: "Or: feedwater TDS", family: "ppm", unit: "ppm", optional: true, min: 0 },
    { id: "tdsb", label: "and: maximum boiler water TDS", family: "ppm", unit: "ppm", optional: true, min: 0 },
    { id: "eff", label: "Boiler efficiency (fuel to steam, HHV basis)", sym: "η", family: "pct", unit: "pct", min: 1, max: 100, help: "From your boiler test or the manufacturer. State whether it is HHV or LHV, and use the matching heating value." },
    { id: "hhv", label: "Fuel heating value", sym: "HHV", family: "hv", unit: "mjkg", optional: true, min: 0 },
    { id: "hours", label: "Operating hours per year", family: "time", unit: "h", optional: true, min: 0, max: 8784 * 3600 },
    { id: "price", label: "Fuel price", family: "fprice", unit: "mmbtu", optional: true, min: 0 },
  ],
  example: {
    title: "A 10 t/h saturated boiler at 10 bar(g), 105 °C feedwater, 4% blowdown, 82% efficiency on fuel with 50 MJ/kg HHV.",
    values: { ms: [10, "th"], p: [10, "barg"], tfw: [105, "c"], bd: [4, "pct"], eff: [82, "pct"], hhv: [50, "mjkg"], hours: [8000, "h"], price: [4, "mmbtu"] },
  },
  refs: [REF.if97, REF.doeSteam, REF.doeBlowdown],
  compute(v) {
    const c = new Calc(v);
    const L = labelsOf(boiler.inputs);
    const miss = c.blank("ms", "p", "tfw", "eff");
    if (miss.length) return c.missing(miss, L);
    let b = 0;
    if (v.bd !== null && v.bd !== undefined) {
      b = v.bd / 100;
      c.step("Blowdown fraction (entered)", `b = ${fmt(v.bd)} % ÷ 100 = ${fmt(b)}`);
    } else if (v.tdsf && v.tdsb) {
      if (v.tdsb <= v.tdsf) return c.done("Maximum boiler water TDS must be higher than the feedwater TDS.");
      b = v.tdsf / v.tdsb;
      c.step("Blowdown fraction from TDS balance", `b = ${fmt(v.tdsf)} ÷ ${fmt(v.tdsb)} = ${fmt(b)} (${fmt(b * 100)} % of feedwater)`, "b = TDS_feed ÷ TDS_boiler");
    } else c.warn("No blowdown entered, so blowdown is taken as zero. Enter a percentage or the two TDS values.");
    try {
      const s = steamState(c, c.n("p"), v.ts ?? null);
      const tsatC = s.sat.T - 273.15;
      if (c.n("tfw") >= tsatC) return c.done(`Feedwater at ${fmt(c.n("tfw"))} °C is at or above the drum saturation temperature ${fmt(tsatC)} °C.`);
      const hfw = region1(MPa(c.n("p")), K(c.n("tfw"))).h;
      c.step("Feedwater enthalpy", `h_fw at ${fmt(c.n("tfw"))} °C = ${fmt(hfw)} kJ/kg (IF97 region 1)`);
      const ms = c.n("ms");
      const mfw = ms / (1 - b);
      const mbd = mfw * b;
      c.step("Feedwater and blowdown", `ṁfw = ${fmt(ms * 3600)} ÷ (1 − ${fmt(b)}) = ${fmt(mfw * 3600)} kg/h;  ṁbd = ${fmt(mfw * 3600)} × ${fmt(b)} = ${fmt(mbd * 3600)} kg/h`, "ṁfw = ṁs ÷ (1 − b)");
      const Qs = ms * (s.h - hfw);
      const Qbd = mbd * (s.sat.hf - hfw);
      const Q = Qs + Qbd;
      c.step("Heat to water and steam", `Q_out = ${fmt(ms)} × (${fmt(s.h)} − ${fmt(hfw)}) + ${fmt(mbd)} × (${fmt(s.sat.hf)} − ${fmt(hfw)}) = ${fmt(Qs)} + ${fmt(Qbd)} = ${q(Q, "power", "kw")}`, "Q_out = ṁs(h_s − h_fw) + ṁbd(hf − h_fw)");
      const fuel = Q / (c.n("eff") / 100);
      c.step("Fuel input", `Fuel = ${fmt(Q)} kW ÷ ${fmt(c.n("eff") / 100)} = ${q(fuel, "power", "kw")} = ${q(fuel, "power", "mmbtuh")}`, "Fuel = Q_out ÷ η");
      c.result("mfw", "Feedwater", "mflow", mfw, ["kgh", "th", "lbh"]);
      c.result("mbd", "Blowdown", "mflow", mbd, ["kgh", "lbh"]);
      c.result("Qout", "Heat output", "power", Q, ["kw", "mw", "mmbtuh"]);
      c.result("Qbd", "Heat leaving in blowdown", "power", Qbd, ["kw", "mmbtuh"]);
      c.result("fuel", "Fuel input", "power", fuel, ["kw", "mw", "mmbtuh"], true);
      if (v.hhv) {
        const mf = fuel / v.hhv;
        c.step("Fuel flow", `ṁf = ${fmt(fuel)} kW ÷ ${fmt(v.hhv)} kJ/kg = ${fmt(mf * 3600)} kg/h`, "ṁf = Fuel ÷ HHV");
        c.result("mf", "Fuel flow", "mflow", mf, ["kgh", "lbh"], true);
        c.result("ratio", "Evaporation ratio (kg steam per kg fuel)", "ratio", ms / mf, ["x"]);
      }
      if (v.hours) {
        const gj = (fuel * v.hours) / 1e6;
        c.step("Annual fuel", `${fmt(fuel)} kW × ${fmt(v.hours / 3600)} h = ${fmt(gj)} GJ = ${fmt(gj / 1.05505585262)} MMBtu`);
        c.result("annualFuel", "Annual fuel", "energy", (fuel * v.hours) / 3600, ["gj", "mmbtu", "mwh"]);
        if (v.price) {
          const cost = gj * v.price;
          c.step("Annual fuel cost", `${fmt(gj)} GJ × $${fmt(v.price)}/GJ = $${fmt(cost)}`);
          c.result("cost", "Annual fuel cost", "money", cost, ["usd"], true);
        }
      }
    } catch (e) {
      return c.done((e as Error).message);
    }
    return c.done();
  },
};

const flash: SectionDef = {
  id: "flash",
  title: "Flash steam from condensate",
  question: "How much low-pressure steam flashes off when hot condensate drops to a lower pressure?",
  formulas: ["x = (hf at P₁ − hf at P₂) ÷ hfg at P₂", "Flash steam = x × ṁ condensate"],
  inputs: [
    { id: "mc", label: "Condensate flow", sym: "ṁc", family: "mflow", unit: "kgh", min: 0 },
    P("p1", "Condensate pressure (saturated, before the trap)", "P₁"),
    P("p2", "Flash vessel pressure", "P₂"),
  ],
  example: { title: "5,000 kg/h of 10 bar(g) condensate flashed to a 1 bar(g) low-pressure header.", values: { mc: [5000, "kgh"], p1: [10, "barg"], p2: [1, "barg"] } },
  refs: [REF.if97, REF.doeFlash],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("mc", "p1", "p2");
    if (miss.length) return c.missing(miss, labelsOf(flash.inputs));
    if (c.n("p2") >= c.n("p1")) return c.done("The flash vessel pressure must be lower than the condensate pressure.");
    try {
      const a = satP(MPa(c.n("p1")));
      const b = satP(MPa(c.n("p2")));
      c.step("Saturated liquid enthalpies", `hf(P₁) = ${fmt(a.hf)} kJ/kg,  hf(P₂) = ${fmt(b.hf)} kJ/kg,  hfg(P₂) = ${fmt(b.hfg)} kJ/kg`);
      const x = (a.hf - b.hf) / b.hfg;
      c.step("Flash fraction", `x = (${fmt(a.hf)} − ${fmt(b.hf)}) ÷ ${fmt(b.hfg)} = ${fmt(x)} (${fmt(x * 100)} %)`, "x = (hf₁ − hf₂) ÷ hfg₂");
      const mf = x * c.n("mc");
      c.step("Flash steam", `${fmt(c.n("mc") * 3600)} kg/h × ${fmt(x)} = ${fmt(mf * 3600)} kg/h`);
      c.result("x", "Flash fraction", "pct", x * 100, ["pct"], true);
      c.result("mf", "Flash steam", "mflow", mf, ["kgh", "lbh"], true);
      c.result("ml", "Condensate left after flashing", "mflow", c.n("mc") - mf, ["kgh", "lbh"]);
      c.result("Qf", "Heat in the flash steam (latent)", "power", mf * b.hfg, ["kw", "mmbtuh"]);
      c.result("t2", "Flash vessel temperature", "temp", b.T - 273.15, ["c", "f"]);
    } catch (e) {
      return c.done((e as Error).message);
    }
    return c.done();
  },
};

const pipe: SectionDef = {
  id: "pipe",
  title: "Steam line velocity and size",
  question: "Is this steam line too small, or what size do I need for a target velocity?",
  formulas: ["V̇ = ṁ × v (specific volume)", "u = V̇ ÷ (π D² ÷ 4)", "D = √(4 V̇ ÷ (π u))  when D is blank"],
  solveNote: "Enter the pipe inside diameter to get the velocity, or leave it blank and enter a target velocity to get the diameter.",
  inputs: [
    { id: "m", label: "Steam flow", sym: "ṁ", family: "mflow", unit: "kgh", min: 0 },
    P("p", "Steam pressure", "P"),
    { id: "t", label: "Steam temperature (blank = saturated)", sym: "T", family: "temp", unit: "c", optional: true },
    { id: "d", label: "Pipe inside diameter", sym: "D", family: "diam", unit: "mm", solvable: true, min: 0 },
    { id: "u", label: "Target velocity (to size the line)", sym: "u", family: "vel", unit: "ms", optional: true, min: 0, help: "Use your company's design standard for steam line velocity." },
  ],
  example: { title: "10 t/h of 10 bar(g) saturated steam in a line with 154 mm inside diameter.", values: { m: [10, "th"], p: [10, "barg"], d: [154.1, "mm"] } },
  refs: [REF.if97, REF.doeSteam],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("m", "p");
    if (miss.length) return c.missing(miss, labelsOf(pipe.inputs));
    try {
      const s = steamState(c, c.n("p"), v.t ?? null);
      const V = c.n("m") * s.v;
      c.step("Volumetric flow", `V̇ = ${fmt(c.n("m"))} kg/s × ${fmt(s.v)} m³/kg = ${fmt(V)} m³/s`, "V̇ = ṁ × v");
      c.result("V", "Actual volumetric flow", "vflow", V, ["m3h", "m3s"]);
      if (v.d) {
        const A = (Math.PI * v.d ** 2) / 4;
        const u = V / A;
        c.step("Velocity", `u = ${fmt(V)} ÷ (π × ${fmt(v.d)}² ÷ 4) = ${fmt(u)} m/s`, "u = V̇ ÷ A");
        c.result("u", "Velocity", "vel", u, ["ms", "fts", "ftmin"], true);
      } else if (v.u) {
        const D = Math.sqrt((4 * V) / (Math.PI * v.u));
        c.solved = "d";
        c.step("Diameter for the target velocity", `D = √(4 × ${fmt(V)} ÷ (π × ${fmt(v.u)})) = ${fmt(D * 1000)} mm`, "D = √(4V̇ ÷ πu)");
        c.result("d", "Minimum inside diameter", "diam", D, ["mm", "in"], true);
      } else return c.done("Enter the pipe inside diameter, or a target velocity to size the line.");
    } catch (e) {
      return c.done((e as Error).message);
    }
    return c.done();
  },
};

export const steam: UtilityDef = {
  slug: "steam",
  name: "Steam Calculator",
  short: "Steam",
  sheet: "Steam",
  problem: "How much steam does this heater need, what will the boiler burn, and how much flash steam can we recover?",
  description: "Steam tables (IAPWS-IF97), process heating and reboiler steam, boiler fuel with feedwater and blowdown, flash steam recovery, and steam line velocity, with every step shown.",
  keywords: "steam calculator steam table iapws if97 steam consumption reboiler steam boiler fuel calculation blowdown flash steam steam pipe velocity enthalpy latent heat kg/h lb/h",
  sections: [props, heating, boiler, flash, pipe],
  notes: [
    "Steam and water properties come from the IAPWS-IF97 equations (regions 1, 2, and 4), checked against the release's own test values.",
    "Gauge pressures use a standard atmosphere of 101.325 kPa. Use absolute units if your site is at altitude.",
    "Saturated properties are covered from the triple point up to 16.5 MPa (350 °C). The near-critical region is not covered.",
  ],
};
