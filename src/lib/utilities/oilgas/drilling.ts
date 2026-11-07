import { Calc, labelsOf } from "../helpers";
import type { InputDef, SectionDef, UtilityDef } from "../types";
import { G, fmt, fromSI } from "../units";
import { BBL_M3, FT_M, PSI_FT_PER_PPG, PSI_KPA } from "./core";
import { OG } from "./refs";

const ppg = (si: number) => fromSI("mudwt", "ppg", si);
const psi = (kPa: number) => kPa / PSI_KPA;
const ftOf = (m: number) => m / FT_M;
const K052 = fmt(PSI_FT_PER_PPG, 6);

const hydIn: InputDef[] = [
  { id: "mw", label: "Mud weight", sym: "MW", family: "mudwt", unit: "ppg", solvable: true, min: 500, max: 3000 },
  { id: "tvd", label: "True vertical depth", sym: "TVD", family: "length", unit: "ft", solvable: true, min: 0 },
  { id: "p", label: "Hydrostatic pressure", sym: "P", family: "dp", unit: "psi", solvable: true, min: 0 },
  { id: "ps", label: "Surface (casing or standpipe) pressure, optional", sym: "P_s", family: "dp", unit: "psi", optional: true, min: 0 },
];

const hydro: SectionDef = {
  id: "hydrostatic",
  title: "Hydrostatic pressure and equivalent mud weight",
  question: "What pressure does this mud column exert, or what mud weight balances this pressure?",
  formulas: [
    "P = ρ g TVD;  in oilfield units P (psi) = 0.051948 × MW (ppg) × TVD (ft)",
    "0.051948 = (1 lb/gal) × g × (1 ft) in psi, from exact unit definitions",
    "EMW = (P + P_s) ÷ (0.051948 × TVD)",
  ],
  solveNote: "Leave one of mud weight, depth, or hydrostatic pressure blank.",
  inputs: hydIn,
  example: { title: "10.5 ppg mud at 10,000 ft TVD, with 300 psi held at surface.", values: { mw: [10.5, "ppg"], tvd: [10000, "ft"], ps: [300, "psi"] } },
  refs: [OG.bseeWells, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const b = c.blank("mw", "tvd", "p");
    if (b.length !== 1) return c.done("Leave exactly one of mud weight, depth, or hydrostatic pressure blank.");
    let rho = v.mw ?? NaN, h = v.tvd ?? NaN, P = v.p ?? NaN;
    c.solved = b[0];
    c.step("Gradient constant", `1 lb/gal × ${G} m/s² × 1 ft = ${K052} psi/ft per ppg`);
    if (b[0] === "p") {
      P = (rho * G * h) / 1000;
      c.step("Hydrostatic pressure", `P = ${K052} × ${fmt(ppg(rho))} × ${fmt(ftOf(h))} = ${fmt(psi(P))} psi`);
    } else if (b[0] === "mw") {
      if (!(h > 0)) return c.done("Depth must be greater than zero.");
      rho = (P * 1000) / (G * h);
      c.step("Mud weight", `MW = ${fmt(psi(P))} ÷ (${K052} × ${fmt(ftOf(h))}) = ${fmt(ppg(rho))} ppg`);
    } else {
      if (!(rho > 0)) return c.done("Mud weight must be greater than zero.");
      h = (P * 1000) / (rho * G);
      c.step("Depth", `TVD = ${fmt(psi(P))} ÷ (${K052} × ${fmt(ppg(rho))}) = ${fmt(ftOf(h))} ft`);
    }
    c.result("p", "Hydrostatic pressure", "dp", P, ["psi", "bar", "kpa"], b[0] === "p");
    c.result("mw", "Mud weight", "mudwt", rho, ["ppg", "sg", "kgm3"], b[0] === "mw");
    c.result("tvd", "True vertical depth", "length", h, ["ft", "m"], b[0] === "tvd");
    c.result("grad", "Mud gradient", "grad", (rho * G) / 1000, ["psift", "kpam"]);
    if (v.ps !== null && v.ps !== undefined && h > 0) {
      const bhp = P + v.ps;
      const emw = (bhp * 1000) / (G * h);
      c.step("With surface pressure", `BHP = ${fmt(psi(P))} + ${fmt(psi(v.ps))} = ${fmt(psi(bhp))} psi;  EMW = ${fmt(psi(bhp))} ÷ (${K052} × ${fmt(ftOf(h))}) = ${fmt(ppg(emw))} ppg`);
      c.result("bhp", "Bottomhole pressure (hydrostatic + surface)", "dp", bhp, ["psi", "bar"], true);
      c.result("emw", "Equivalent mud weight", "mudwt", emw, ["ppg", "sg"], true);
    }
    return c.done();
  },
};

const killIn: InputDef[] = [
  { id: "omw", label: "Original (current) mud weight", sym: "OMW", family: "mudwt", unit: "ppg", min: 500, max: 3000 },
  { id: "sidpp", label: "Shut-in drill pipe pressure", sym: "SIDPP", family: "dp", unit: "psi", min: 0 },
  { id: "tvd", label: "True vertical depth of the bit", sym: "TVD", family: "length", unit: "ft", min: 1 },
  { id: "scr", label: "Slow circulating rate pressure at the kill rate", sym: "SCR", family: "dp", unit: "psi", optional: true, min: 0 },
  { id: "sicp", label: "Shut-in casing pressure (optional)", sym: "SICP", family: "dp", unit: "psi", optional: true, min: 0 },
  { id: "shoe", label: "Casing shoe TVD (optional)", sym: "TVD_shoe", family: "length", unit: "ft", optional: true, min: 1 },
  { id: "lot", label: "Leak-off or FIT equivalent mud weight at the shoe (optional)", sym: "LOT", family: "mudwt", unit: "ppg", optional: true, min: 500, max: 3000 },
  { id: "gain", label: "Pit gain (optional)", sym: "V_pit", family: "volume", unit: "bbl", optional: true, min: 0 },
  { id: "acap", label: "Annular capacity around the BHA (optional)", sym: "C_a", family: "cap", unit: "bblft", optional: true, min: 0 },
];

const kill: SectionDef = {
  id: "kill-sheet",
  title: "Kill sheet: kill mud weight, ICP, FCP, MAASP, and influx gradient",
  question: "After a kick, what mud weight kills the well, what are the circulating pressures, and how much casing pressure can the shoe take?",
  formulas: [
    "Formation pressure = 0.051948 × OMW × TVD + SIDPP",
    "KMW = OMW + SIDPP ÷ (0.051948 × TVD)",
    "ICP = SCR + SIDPP,   FCP = SCR × KMW ÷ OMW",
    "MAASP = (LOT EMW − MW) × 0.051948 × TVD_shoe",
    "Influx height = pit gain ÷ annular capacity;   gradient = 0.051948 × OMW − (SICP − SIDPP) ÷ height",
  ],
  inputs: killIn,
  example: { title: "Kick at 10,000 ft TVD with 10.0 ppg mud: SIDPP 400 psi, SICP 600 psi, 20 bbl gain, SCR 500 psi, shoe at 5,000 ft with a 14.5 ppg leak-off.", values: { omw: [10, "ppg"], sidpp: [400, "psi"], tvd: [10000, "ft"], scr: [500, "psi"], sicp: [600, "psi"], shoe: [5000, "ft"], lot: [14.5, "ppg"], gain: [20, "bbl"], acap: [0.0291, "bblft"] } },
  refs: [OG.bseeWells, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("omw", "sidpp", "tvd");
    if (miss.length) return c.missing(miss, labelsOf(killIn));
    const omw = c.n("omw"), h = c.n("tvd"), sidpp = c.n("sidpp");
    const hyd = (omw * G * h) / 1000;
    const pf = hyd + sidpp;
    c.step("Formation pressure", `${K052} × ${fmt(ppg(omw))} × ${fmt(ftOf(h))} + ${fmt(psi(sidpp))} = ${fmt(psi(hyd))} + ${fmt(psi(sidpp))} = ${fmt(psi(pf))} psi`);
    const kmw = omw + (sidpp * 1000) / (G * h);
    const kmwUp = Math.ceil(ppg(kmw) * 10 - 1e-9) / 10;
    c.step("Kill mud weight", `KMW = ${fmt(ppg(omw))} + ${fmt(psi(sidpp))} ÷ (${K052} × ${fmt(ftOf(h))}) = ${fmt(ppg(kmw), 5)} ppg (round up: ${fmt(kmwUp)} ppg)`);
    c.result("pf", "Formation pressure", "dp", pf, ["psi", "bar"], true);
    c.result("kmw", "Kill mud weight", "mudwt", kmw, ["ppg", "sg", "kgm3"], true);
    c.result("kmwup", "Kill mud weight rounded up to 0.1 ppg", "ratio", kmwUp, ["x"]);
    c.result("emwf", "Formation pressure as equivalent mud weight", "mudwt", kmw, ["ppg", "sg"]);
    if (v.scr !== null && v.scr !== undefined) {
      const icp = v.scr + sidpp, fcp = (v.scr * kmw) / omw;
      c.step("Circulating pressures", `ICP = ${fmt(psi(v.scr))} + ${fmt(psi(sidpp))} = ${fmt(psi(icp))} psi;  FCP = ${fmt(psi(v.scr))} × ${fmt(ppg(kmw), 5)} ÷ ${fmt(ppg(omw))} = ${fmt(psi(fcp))} psi`);
      c.result("icp", "Initial circulating pressure (ICP)", "dp", icp, ["psi", "bar"], true);
      c.result("fcp", "Final circulating pressure (FCP)", "dp", fcp, ["psi", "bar"], true);
    }
    if (v.shoe && v.lot) {
      if (v.shoe > h) c.warn("The shoe is deeper than the bit TVD entered. Check the depths.");
      const ma = ((v.lot - omw) * G * v.shoe) / 1000;
      const mk = ((v.lot - kmw) * G * v.shoe) / 1000;
      c.step("MAASP", `(${fmt(ppg(v.lot))} − ${fmt(ppg(omw))}) × ${K052} × ${fmt(ftOf(v.shoe))} = ${fmt(psi(ma))} psi with the current mud;  with kill mud ${fmt(psi(mk))} psi`);
      c.result("maasp", "MAASP with the current mud", "dp", ma, ["psi", "bar"], true);
      c.result("maaspk", "MAASP with kill mud in the annulus", "dp", mk, ["psi", "bar"]);
      if (ma < 0) c.warn("The current mud already exceeds the shoe's leak-off equivalent.");
      if (v.sicp !== null && v.sicp !== undefined && v.sicp > ma) c.warn("Shut-in casing pressure is above MAASP: the shoe may break down.");
    }
    if (v.sicp !== null && v.sicp !== undefined && v.gain && v.acap) {
      const H = v.gain / v.acap;
      const g = (omw * G) / 1000 - (v.sicp - sidpp) / H;
      c.step("Influx gradient", `height = ${fmt(v.gain / BBL_M3)} bbl ÷ ${fmt(fromSI("cap", "bblft", v.acap), 5)} bbl/ft = ${fmt(ftOf(H))} ft;  gradient = ${fmt(fromSI("grad", "psift", (omw * G) / 1000), 5)} − (${fmt(psi(v.sicp))} − ${fmt(psi(sidpp))}) ÷ ${fmt(ftOf(H))} = ${fmt(fromSI("grad", "psift", g), 4)} psi/ft`);
      c.result("hinf", "Influx height", "length", H, ["ft", "m"]);
      c.result("ginf", "Influx gradient", "grad", g, ["psift", "kpam"], true);
      if (g < 0) c.warn("A negative influx gradient means the inputs are inconsistent (often the pit gain or annular capacity).");
    }
    c.warn("Engineering aid only. Follow your rig's well control procedures and the approved kill sheet.");
    return c.done();
  },
};

const annIn: InputDef[] = [
  { id: "dh", label: "Hole or casing inside diameter", sym: "D_h", family: "diam", unit: "in", min: 0.01, max: 1.5 },
  { id: "od", label: "Drill pipe outside diameter", sym: "OD", family: "diam", unit: "in", min: 0.005, max: 1.5 },
  { id: "id", label: "Drill pipe inside diameter", sym: "ID", family: "diam", unit: "in", min: 0.002, max: 1.5 },
  { id: "md", label: "Measured depth of the section", sym: "L", family: "length", unit: "ft", min: 0 },
  { id: "q", label: "Pump rate (optional)", sym: "Q", family: "vflow", unit: "gpm", optional: true, min: 0 },
  { id: "po", label: "Pump output per stroke (optional)", sym: "PO", family: "volume", unit: "bbl", optional: true, min: 0 },
];

const annular: SectionDef = {
  id: "annular",
  title: "Capacities, annular velocity, and bottoms-up",
  question: "What are the pipe and annular capacities, how fast is the mud moving up the annulus, and how long is bottoms-up?",
  formulas: [
    "Capacity = π D² ÷ 4 per foot;  in oilfield units bbl/ft = D² ÷ 1,029.4 (D in inches)",
    "Annular capacity = (D_h² − OD²) ÷ 1,029.4;   steel displacement (open end) = (OD² − ID²) ÷ 1,029.4",
    "AV = Q ÷ annular area;   bottoms-up time = annular volume ÷ Q;   strokes = volume ÷ pump output",
  ],
  inputs: annIn,
  example: { title: "5 in drill pipe (4.276 in ID) in an 8.5 in hole to 10,000 ft at 400 gpm, 0.1 bbl per stroke.", values: { dh: [8.5, "in"], od: [5, "in"], id: [4.276, "in"], md: [10000, "ft"], q: [400, "gpm"], po: [0.1, "bbl"] } },
  refs: [OG.bseeWells, OG.nist811],
  compute(v) {
    const c = new Calc(v);
    const miss = c.blank("dh", "od", "id", "md");
    if (miss.length) return c.missing(miss, labelsOf(annIn));
    const dh = c.n("dh"), od = c.n("od"), id = c.n("id"), L = c.n("md");
    if (!(od < dh)) return c.done("The pipe outside diameter must be smaller than the hole.");
    if (!(id < od)) return c.done("The pipe inside diameter must be smaller than its outside diameter.");
    const area = (d: number) => (Math.PI * d * d) / 4;
    c.step("Oilfield constant", `1 in² × π/4 per ft in bbl/ft → bbl/ft = D² ÷ ${fmt(1 / ((Math.PI / 4) * 0.0254 ** 2 * FT_M / BBL_M3), 6)}`);
    const ca = area(dh) - area(od), cp = area(id), cs = area(od) - area(id);
    const bf = (m2: number) => (m2 * FT_M) / BBL_M3;
    c.step("Capacities", `annulus = ${fmt(bf(ca), 5)} bbl/ft;  pipe = ${fmt(bf(cp), 5)} bbl/ft;  steel = ${fmt(bf(cs), 5)} bbl/ft`);
    const Va = ca * L, Vp = cp * L;
    c.step("Volumes", `annulus = ${fmt(bf(ca), 5)} × ${fmt(ftOf(L))} = ${fmt(Va / BBL_M3)} bbl;  string = ${fmt(Vp / BBL_M3)} bbl`);
    c.result("ca", "Annular capacity", "cap", ca, ["bblft", "m3m"], true);
    c.result("cp", "Pipe capacity", "cap", cp, ["bblft", "m3m"], true);
    c.result("cs", "Steel displacement (open end)", "cap", cs, ["bblft", "m3m"]);
    c.result("va", "Annular volume", "volume", Va, ["bbl", "m3"], true);
    c.result("vp", "String volume", "volume", Vp, ["bbl", "m3"]);
    if (v.q) {
      const av = v.q / ca;
      const tbu = Va / v.q;
      c.step("Annular velocity and bottoms-up", `AV = ${fmt(fromSI("vflow", "gpm", v.q))} gpm ÷ annular area = ${fmt(fromSI("vel", "ftmin", av))} ft/min;  bottoms-up = ${fmt(Va / BBL_M3)} bbl ÷ ${fmt((v.q * 60) / BBL_M3, 5)} bbl/min = ${fmt(tbu / 60)} min`);
      c.result("av", "Annular velocity", "vel", av, ["ftmin", "ms"], true);
      c.result("tbu", "Bottoms-up time", "time", tbu, ["min", "h"], true);
      c.result("tsb", "Surface-to-bit time", "time", Vp / v.q, ["min"]);
    }
    if (v.po) {
      c.step("Strokes", `bottoms-up = ${fmt(Va / BBL_M3)} ÷ ${fmt(v.po / BBL_M3, 4)} = ${fmt(Va / v.po)} strokes;  surface to bit = ${fmt(Vp / v.po)} strokes`);
      c.result("sbu", "Strokes for bottoms-up", "count", Va / v.po, ["n"], true);
      c.result("ssb", "Strokes surface to bit", "count", Vp / v.po, ["n"]);
    }
    c.warn("Uniform hole and pipe over the whole length. For washouts, heavy-weight pipe, or collars, add each section separately.");
    return c.done();
  },
};

export const drilling: UtilityDef = {
  slug: "drilling-well-control",
  name: "Drilling & Well Control Calculator",
  short: "Drilling and well control",
  problem: "What mud weight kills this kick, what are ICP, FCP, and MAASP, and how long is bottoms-up?",
  description: "Drilling and well control calculations: hydrostatic pressure and equivalent mud weight, a kill sheet (formation pressure, kill mud weight, ICP, FCP, MAASP, influx gradient), and pipe and annular capacities, annular velocity, bottoms-up time and strokes, with every step shown.",
  keywords: "kill mud weight kill sheet icp fcp maasp sidpp sicp hydrostatic pressure 0.052 equivalent mud weight emw leak off test annular velocity bottoms up strokes pipe capacity annular capacity 1029.4 well control",
  sheet: "Drilling",
  sections: [hydro, kill, annular],
  notes: ["The 0.052 and 1,029.4 constants are computed from g and exact unit definitions, not typed in.", "Engineering aid for planning and training; the rig's approved procedures govern."],
};

void PSI_FT_PER_PPG;
