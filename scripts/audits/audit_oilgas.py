"""
Independent accuracy audit of the oil and gas calculators.

Every website result is compared with a calculation that does not share the
website's code: CoolProp reference equations of state (GERG-2008 / NIST
REFPROP-equivalent) for gas density, viscosity and nozzle flow, numerical
integration of the pressure gradient for wells and pipelines, the `fluids`
package for friction factors, and hand formulas typed again from the papers.

    pip install CoolProp fluids
    python3 scripts/audits/audit_oilgas.py > /tmp/audit.md

Needs `npx tsx` (runs scripts/audits/run-cases.ts for the website's numbers).
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import CoolProp.CoolProp as CP
from CoolProp.CoolProp import AbstractState
from fluids.friction import Colebrook

ROOT = Path(__file__).resolve().parents[2]
PSI = 6.894757293168  # kPa
FT = 0.3048
IN = 0.0254
BBL = 0.158987294928
R = 8.314462618
G = 9.80665
MAIR = 28.9647
LBFT3 = 0.45359237 / FT**3

rows = []  # (area, check, site, reference, diff %, tolerance %, ok)


def site(cases):
    p = subprocess.run(["npx", "tsx", "scripts/audits/run-cases.ts"], input=json.dumps(cases), capture_output=True, text=True, cwd=ROOT, check=True)
    return json.loads(p.stdout)


def check(area, what, s, ref, tol):
    d = abs(s - ref) / max(abs(ref), 1e-12) * 100
    rows.append((area, what, s, ref, d, tol, d <= tol))


def F2C(f):
    return (f - 32) / 1.8


# ------------------------------------------------------------------ CoolProp gas helpers
LEAN = {"Methane": 0.90, "Ethane": 0.05, "Propane": 0.02, "n-Butane": 0.005, "IsoButane": 0.005, "Nitrogen": 0.01, "CarbonDioxide": 0.01}


def mix_state(comp):
    names = list(comp)
    st = AbstractState("HEOS", "&".join(names))
    tot = sum(comp.values())
    st.set_mole_fractions([comp[n] / tot for n in names])
    return st


def mw(comp):
    tot = sum(comp.values())
    return sum(CP.PropsSI("M", n) * 1000 * x / tot for n, x in comp.items())


def z_ref(comp, p_kpa, t_c):
    st = mix_state(comp)
    st.update(CP.PT_INPUTS, p_kpa * 1000, t_c + 273.15)
    return st.compressibility_factor(), st.rhomass()


# ------------------------------------------------------------------ 1. Z-factor vs GERG-2008
gamma = mw(LEAN) / MAIR
cases, refs = [], []
for p in (300, 1000, 2000, 3500, 5000):
    for t in (60, 150, 250):
        cases.append({"slug": "natural-gas-properties", "section": "z-factor", "values": {"p": [p, "psia"], "t": [t, "f"], "gamma": [gamma, "x"], "co2": [1, "pct"]}})
        refs.append(z_ref(LEAN, p * PSI, F2C(t)))
out = site(cases)
worst = 0
for c, o, (z, rho) in zip(cases, out, refs):
    worst = max(worst, abs(o["results"]["z"] - z) / z * 100)
    check("Gas properties", f"Z at {c['values']['p'][0]} psia, {c['values']['t'][0]} °F (Sutton + Wichert-Aziz + DAK vs GERG-2008)", o["results"]["z"], z, 3.0)
    check("Gas properties", f"Density at {c['values']['p'][0]} psia, {c['values']['t'][0]} °F", o["results"]["rho"], rho, 3.0)

# Composition route (Kay's rule) vs GERG-2008 for the same gas.
comp_in = {"n2": 1, "co2": 1, "c1": 90, "c2": 5, "c3": 2, "nc4": 0.5, "ic4": 0.5}
cc = [{"slug": "natural-gas-properties", "section": "composition", "values": {**{k: [v, "pct"] for k, v in comp_in.items()}, "p": [p, "psia"], "t": [t, "f"]}} for p, t in ((1000, 120), (3000, 200))]
for c, o in zip(cc, site(cc)):
    z, rho = z_ref(LEAN, c["values"]["p"][0] * PSI, F2C(c["values"]["t"][0]))
    check("Gas properties", f"Z from the analysis at {c['values']['p'][0]} psia (Kay + DAK vs GERG-2008)", o["results"]["z"], z, 3.0)
o = site(cc[:1])[0]["results"]
check("Gas properties", "Molecular weight of the analysis", o["M"], mw(LEAN), 0.05)
# VOC weight % by hand: propane and heavier.
masses = {"Methane": 90 * 16.0428, "Ethane": 5 * 30.069, "Propane": 2 * 44.0956, "n-Butane": 0.5 * 58.1222, "IsoButane": 0.5 * 58.1222, "Nitrogen": 1 * 28.0135, "CarbonDioxide": 1 * 44.0098}
check("Gas properties", "VOC weight % (C3+ mass fraction, hand)", o["voc"], (masses["Propane"] + masses["n-Butane"] + masses["IsoButane"]) / sum(masses.values()) * 100, 0.01)

# DAK solver vs Hall-Yarborough (an independent fit to the same Standing-Katz chart) over the whole range.
def hall_yarborough(tpr, ppr):
    t = 1 / tpr
    a = 0.06125 * t * math.exp(-1.2 * (1 - t) ** 2)
    b, c, d = t * (14.76 - 9.76 * t + 4.58 * t * t), t * (90.7 - 242.2 * t + 42.4 * t * t), 2.18 + 2.82 * t
    def f(y):
        return -a * ppr + (y + y * y + y**3 - y**4) / (1 - y) ** 3 - b * y * y + c * y**d
    lo, hi = 1e-9, 0.99  # f(lo) < 0, f rises to +inf as y -> 1; bisection cannot diverge
    for _ in range(200):
        y = (lo + hi) / 2
        lo, hi = (y, hi) if f(y) < 0 else (lo, y)
    return a * ppr / y


hy = []
grid = [(tpr, ppr) for tpr in (1.05, 1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0) for ppr in (0.5, 1, 2, 3, 5, 8, 12, 15)]
gc = [{"slug": "natural-gas-properties", "section": "z-factor", "values": {"p": [ppr * 700, "psia"], "t": [tpr * 400 - 459.67, "f"], "gamma": [0.7, "x"], "tpc": [400, "r"], "ppc": [700, "psia"]}} for tpr, ppr in grid]
dmax, where = 0, None
for (tpr, ppr), o in zip(grid, site(gc)):
    zr = hall_yarborough(tpr, ppr)
    d = abs(o["results"]["z"] - zr) / zr * 100
    if d > dmax:
        dmax, where = d, (tpr, ppr, o["results"]["z"], zr)
# Hall-Yarborough is a different fit to the same chart; the two fits differ by up to about 3 % near Tpr 1.05-1.1.
check("Gas properties", f"DAK vs Hall-Yarborough (a second fit of the chart), worst of {len(grid)} points (Tpr {where[0]}, Ppr {where[1]})", where[2], where[3], 3.0)


# The site's DAK solve vs an independent bracketed root solve of the same DAK equation (tests the solver itself).
def dak_ref(T, P):
    A = [0.3265, -1.0700, -0.5339, 0.01569, -0.05165, 0.5475, -0.7361, 0.1844, 0.1056, 0.6134, 0.7210]

    def f(r):
        z = 1 + (A[0] + A[1] / T + A[2] / T**3 + A[3] / T**4 + A[4] / T**5) * r + (A[5] + A[6] / T + A[7] / T**2) * r**2 - A[8] * (A[6] / T + A[7] / T**2) * r**5 + A[9] * (1 + A[10] * r**2) * (r**2 / T**3) * math.exp(-A[10] * r**2)
        return z - 0.27 * P / (r * T)
    lo, hi = 1e-9, 3.0
    for _ in range(200):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if f(m) < 0 else (lo, m)
    return 0.27 * P / (m * T)


dw, dwhere = 0, None
for (tpr, ppr), o in zip(grid, site(gc)):
    zr = dak_ref(tpr, ppr)
    d = abs(o["results"]["z"] - zr) / zr * 100
    if d >= dw:
        dw, dwhere = d, (tpr, ppr, o["results"]["z"], zr)
check("Gas properties", f"DAK Newton solve vs bracketed root of the same equation, worst of {len(grid)} points", dwhere[2], dwhere[3], 0.01)

# Gas viscosity, Lee-Gonzalez-Eakin vs CoolProp methane (gravity 0.5539).
gm = CP.PropsSI("M", "Methane") * 1000 / MAIR
vc = [{"slug": "natural-gas-properties", "section": "z-factor", "values": {"p": [p, "psia"], "t": [t, "f"], "gamma": [gm, "x"]}} for p in (500, 2000, 5000) for t in (100, 250)]
for c, o in zip(vc, site(vc)):
    mu = CP.PropsSI("V", "P", c["values"]["p"][0] * PSI * 1000, "T", F2C(c["values"]["t"][0]) + 273.15, "Methane")
    check("Gas properties", f"Viscosity at {c['values']['p'][0]} psia, {c['values']['t'][0]} °F (LGE vs CoolProp methane)", o["results"]["mu"], mu, 6.0)

# ------------------------------------------------------------------ 2. Wells: numerical integration with CoolProp
def integrate_well(comp, p_top_kpa, t_top_c, t_bot_c, H, L, D=None, eps=0, ndot=0.0, steps=4000):
    """Integrate dp/dl = ρ g sinθ + f ρ v²/(2D) downward from the wellhead, CoolProp density (and methane viscosity)."""
    st = mix_state(comp)
    M = mw(comp) / 1000
    mdot = ndot * M
    p = p_top_kpa * 1000
    dl = L / steps
    sin = H / L
    for i in range(steps):
        def grad(pp, li):
            t = t_top_c + (t_bot_c - t_top_c) * (li / L) + 273.15
            st.update(CP.PT_INPUTS, pp, t)
            rho = st.rhomass()
            g = rho * G * sin
            if mdot > 0:
                A = math.pi * D * D / 4
                v = mdot / (rho * A)
                mu = CP.PropsSI("V", "P", pp, "T", t, "Methane")
                Re = rho * v * D / mu
                f = Colebrook(Re, eps / D)
                g += f * rho * v * v / (2 * D)
            return g
        li = i * dl
        k1 = grad(p, li)
        k2 = grad(p + k1 * dl / 2, li + dl / 2)
        k3 = grad(p + k2 * dl / 2, li + dl / 2)
        k4 = grad(p + k3 * dl, li + dl)
        p += dl * (k1 + 2 * k2 + 2 * k3 + k4) / 6
    return p / 1000


METH = {"Methane": 1.0}
sc = {"slug": "gas-well-deliverability", "section": "static", "values": {"pt": [1800, "psia"], "tvd": [8000, "ft"], "tt": [80, "f"], "tb": [200, "f"], "gamma": [gamma, "x"], "co2": [1, "pct"]}}
o = site([sc])[0]["results"]
ref = integrate_well(LEAN, 1800 * PSI, F2C(80), F2C(200), 8000 * FT, 8000 * FT, steps=400)
check("Gas well", "Static BHP, 1,800 psia at 8,000 ft (avg T-Z vs integrated with GERG-2008)", o["pbh"], ref, 1.0)

def n_of_mscfd(q):
    return q * 1000 * FT**3 * 101325 / (R * 288.70556) / 86400


for q, ptop, d in ((3000, 600, 2.441), (1000, 300, 1.995), (6000, 1200, 2.992)):
    fc = {"slug": "gas-well-deliverability", "section": "flowing", "values": {"pt": [ptop, "psia"], "q": [q, "mscfd"], "d": [d, "in"], "eps": [0.0006, "in"], "tvd": [8000, "ft"], "tt": [100, "f"], "tb": [200, "f"], "gamma": [gm, "x"]}}
    o = site([fc])[0]["results"]
    ref = integrate_well(METH, ptop * PSI, F2C(100), F2C(200), 8000 * FT, 8000 * FT, d * IN, 0.0006 * IN, n_of_mscfd(q), steps=300)
    check("Gas well", f"Flowing BHP, {q} Mscf/d in {d} in tubing from {ptop} psia (vs integrated, CoolProp methane)", o["pbh"], ref, 1.5)

# Nodal: the operating rate must satisfy reservoir pwf = tubing pwf.
nv = {"pr": [2000, "psia"], "C": [0.0029, "x"], "n": [0.95, "x"], "pt": [600, "psia"], "d": [2.441, "in"], "eps": [0.0006, "in"], "tvd": [8000, "ft"], "tt": [100, "f"], "tb": [200, "f"], "gamma": [0.65, "x"]}
o = site([{"slug": "gas-well-deliverability", "section": "nodal", "values": nv}])[0]["results"]
q = o["q"] / n_of_mscfd(1)
fv = {k: nv[k] for k in ("pt", "d", "eps", "tvd", "tt", "tb", "gamma")}
fv["q"] = [q, "mscfd"]
tub = site([{"slug": "gas-well-deliverability", "section": "flowing", "values": fv}])[0]["results"]["pbh"]
ipr = math.sqrt(2000**2 - (q / 0.0029) ** (1 / 0.95)) * PSI
check("Gas well", f"Nodal point {q:.0f} Mscf/d: tubing pwf equals reservoir pwf", tub, ipr, 0.05)

# Turner: field-unit equation 1.912 σ^¼ (ρL − ρg)^¼ ÷ ρg^½ (ft/s, dyn/cm, lb/ft³).
lc = {"slug": "gas-well-deliverability", "section": "loading", "values": {"p": [300, "psia"], "t": [100, "f"], "d": [2.441, "in"], "rhol": [67, "lbft3"], "sigma": [60, "x"], "adj": [1, "n"], "gamma": [0.65, "x"]}}
o = site([lc])[0]["results"]
rg = o["rhog"] / LBFT3
check("Gas well", "Turner critical velocity vs the field equation 1.912 σ^¼ Δρ^¼ / ρg^½", o["vt"] / FT, 1.912 * 60**0.25 * (67 - rg) ** 0.25 / rg**0.5, 0.2)

# ------------------------------------------------------------------ 3. Inflow
C141 = 1 / (2 * math.pi * 9.869233e-16 * FT * PSI * 1000 / 1e-3 / (BBL / 86400))
check("Inflow", "Radial-flow constant (141.2)", C141, 141.2, 0.01)
dc = {"slug": "well-inflow", "section": "darcy", "values": {"mode": [1, "n"], "k": [50, "md"], "s": [3, "x"], "pwf": [2000, "psia"], "pr": [3000, "psia"], "h": [30, "ft"], "mu": [1.2, "cp"], "bo": [1.25, "x"], "re": [1490, "ft"], "rw": [0.328, "ft"]}}
o = site([dc])[0]["results"]
qref = 2 * math.pi * 50 * 9.869233e-16 * 30 * FT * 1000 * PSI * 1000 / (1.2e-3 * 1.25 * (math.log(1490 / 0.328) - 0.75 + 3))
check("Inflow", "Darcy rate, SI form 2πkhΔp/(μB(ln(re/rw) − 0.75 + s))", o["q"], qref, 0.01)
# Solve-for-skin round trip.
dc2 = json.loads(json.dumps(dc))
dc2["values"]["q"] = [o["q"] * 86400 / BBL, "bpd"]
del dc2["values"]["s"]
check("Inflow", "Skin solved back from the rate", site([dc2])[0]["results"]["s"], 3.0, 0.01)

vc = {"slug": "well-inflow", "section": "vogel", "values": {"pr": [3000, "psia"], "pb": [2400, "psia"], "qt": [400, "bpd"], "pt": [1800, "psia"], "pwf": [1000, "psia"]}}
o = site([vc])[0]["results"]
J = 400 / ((3000 - 2400) + 2400 / 1.8 * (1 - 0.2 * 0.75 - 0.8 * 0.75**2))
qb = J * 600
check("Inflow", "Composite IPR rate at 1,000 psia (hand)", o["q"] * 86400 / BBL, qb + J * 2400 / 1.8 * (1 - 0.2 * 1000 / 2400 - 0.8 * (1000 / 2400) ** 2), 0.01)
check("Inflow", "Composite IPR maximum rate (hand)", o["qmax"] * 86400 / BBL, qb + J * 2400 / 1.8, 0.01)
bp = {"slug": "well-inflow", "section": "backpressure", "values": {"pr": [2000, "psia"], "q1": [1500, "mscfd"], "p1": [1700, "psia"], "q2": [3000, "mscfd"], "p2": [1300, "psia"]}}
o = site([bp])[0]["results"]
n = math.log(2) / math.log((2000**2 - 1300**2) / (2000**2 - 1700**2))
check("Inflow", "Back-pressure exponent n (hand)", o["n"], n, 0.01)
check("Inflow", "AOF (hand)", o["aof"] / n_of_mscfd(1), 1500 / (2000**2 - 1700**2) ** n * (2000**2 - 14.696**2) ** n, 0.01)

# ------------------------------------------------------------------ 4. Oil PVT (typed again from the papers)
api, gg, TF, Rs = 35, 0.75, 200, 600
pb = 18.2 * ((Rs / gg) ** 0.83 * 10 ** (0.00091 * TF - 0.0125 * api) - 1.4)
go = 141.5 / (api + 131.5)
bob = 0.9759 + 0.00012 * (Rs * (gg / go) ** 0.5 + 1.25 * TF) ** 1.2
o = site([{"slug": "crude-oil-pvt", "section": "bubble-point", "values": {"api": [api, "x"], "gg": [gg, "x"], "t": [TF, "f"], "rsb": [Rs, "scfbbl"]}}])[0]["results"]
check("Oil PVT", "Standing bubble point (hand)", o["pb"], pb * PSI, 0.01)
check("Oil PVT", "Standing Bob (hand)", o["bob"], bob, 0.01)
o2 = site([{"slug": "crude-oil-pvt", "section": "bubble-point", "values": {"api": [api, "x"], "gg": [gg, "x"], "t": [TF, "f"], "pb": [pb, "psia"]}}])[0]["results"]
# Standing publishes the inverse exponent as 1.2048 (1/0.83 = 1.20482), so the round trip closes to about 0.01 %.
check("Oil PVT", "Rs solved back from pb (Standing's published inverse)", o2["rsb"], o["rsb"], 0.05)
rho_hand = (62.4 * go + 0.0136 * Rs * gg) / bob
check("Oil PVT", "Oil density at pb vs the textbook form (62.4γo + 0.0136Rsγg)/Bo", o["rhob"] / LBFT3, rho_hand, 0.3)
x = 10 ** (3.0324 - 0.02023 * api) * TF**-1.163
mod = 10**x - 1
mob = 10.715 * (Rs + 100) ** -0.515 * mod ** (5.44 * (Rs + 150) ** -0.338)
p = 4000
m = 2.6 * p**1.187 * math.exp(-11.513 - 8.98e-5 * p)
o = site([{"slug": "crude-oil-pvt", "section": "viscosity", "values": {"api": [api, "x"], "t": [TF, "f"], "rs": [Rs, "scfbbl"], "pb": [2800, "psia"], "p": [4000, "psia"]}}])[0]["results"]
check("Oil PVT", "Beggs-Robinson dead oil (hand)", o["mod"] * 1000, mod, 0.01)
check("Oil PVT", "Beggs-Robinson live oil (hand)", o["mob"] * 1000, mob, 0.01)
check("Oil PVT", "Vasquez-Beggs above pb (hand)", o["mo"] * 1000, mob * (4000 / 2800) ** m, 0.01)
o = site([{"slug": "crude-oil-pvt", "section": "gravity", "values": {"api": [35, "x"]}}])[0]["results"]
rw = CP.PropsSI("D", "T", 288.70556, "P", 101325, "Water")
check("Oil PVT", "35 °API density (141.5/(API+131.5) × water at 60 °F from CoolProp IAPWS-95)", o["rho"], 141.5 / 166.5 * rw, 0.01)

# ------------------------------------------------------------------ 5. Chokes
o = site([{"slug": "choke-calculator", "section": "gilbert", "values": {"set": [1, "n"], "q": [400, "bpd"], "S": [16, "in64"], "glr": [800, "scfbbl"]}}])[0]["results"]
check("Chokes", "Gilbert p_wh = 10.0 R^0.546 q / S^1.89 (hand, psig)", o["pwh"] / PSI - 14.696, 10.0 * 800**0.546 * 400 / 16**1.89, 0.01)

def real_nozzle(fluid, p1, t1, p2, d):
    """Isentropic real-gas nozzle with CoolProp: maximize ρ√(2Δh) over throat pressure ≥ p2."""
    h0 = CP.PropsSI("H", "P", p1, "T", t1, fluid)
    s0 = CP.PropsSI("S", "P", p1, "T", t1, fluid)
    best = 0
    for i in range(1, 400):
        pt = p1 * i / 400
        if pt < p2:
            continue
        h = CP.PropsSI("H", "P", pt, "S", s0, fluid)
        rho = CP.PropsSI("D", "P", pt, "S", s0, fluid)
        best = max(best, rho * math.sqrt(max(2 * (h0 - h), 0)))
    return best * math.pi * d * d / 4


for p1, p2 in ((1000, 400), (1000, 800)):
    t1 = F2C(100) + 273.15
    k = CP.PropsSI("CPMASS", "P", p1 * PSI * 1000, "T", t1, "Methane") / CP.PropsSI("CVMASS", "P", p1 * PSI * 1000, "T", t1, "Methane")
    o = site([{"slug": "choke-calculator", "section": "gas-choke", "values": {"p1": [p1, "psia"], "p2": [p2, "psia"], "t1": [100, "f"], "gamma": [gm, "x"], "k": [k, "x"], "cd": [1, "x"], "d": [24, "in64"]}}])[0]["results"]
    md = real_nozzle("Methane", p1 * PSI * 1000, t1, p2 * PSI * 1000, 24 / 64 * IN)
    check("Chokes", f"Gas through 24/64 in, {p1}→{p2} psia, Cd 1 (ideal-gas formula with Z vs CoolProp isentropic real-gas nozzle)", o["q"] * CP.PropsSI("M", "Methane"), md, 5.0)

# ------------------------------------------------------------------ 6. Pipelines
def integrate_line(comp, p1_kpa, t_c, L, D, eps, ndot, dz=0.0, steps=2000):
    st = mix_state(comp)
    M = mw(comp) / 1000
    mdot = ndot * M
    A = math.pi * D * D / 4
    p = p1_kpa * 1000
    dl = L / steps
    for _ in range(steps):
        st.update(CP.PT_INPUTS, p, t_c + 273.15)
        rho = st.rhomass()
        mu = CP.PropsSI("V", "P", p, "T", t_c + 273.15, "Methane")
        v = mdot / (rho * A)
        f = Colebrook(rho * v * D / mu, eps / D)
        p -= dl * (f * rho * v * v / (2 * D) + rho * G * dz / L)
    return p / 1000


gl = {"slug": "pipeline-flow", "section": "gas-line", "values": {"q": [5, "mmscfd"], "p1": [800, "psia"], "d": [6.065, "in"], "l": [10, "mi"], "eps": [0.0018, "in"], "t": [80, "f"], "gamma": [gm, "x"]}}
o = site([gl])[0]["results"]
ref = integrate_line(METH, 800 * PSI, F2C(80), 10 * 1609.344, 6.065 * IN, 0.0018 * IN, o["q"])
check("Pipelines", "Gas line outlet pressure, 5 MMscf/d, 10 mi of 6 in (vs integrated, CoolProp methane)", o["p2"], ref, 0.5)
gl2 = json.loads(json.dumps(gl))
gl2["values"].update({"q": [12, "mmscfd"], "l": [20, "mi"], "dz": [500, "ft"]})
o = site([gl2])[0]["results"]
ref = integrate_line(METH, 800 * PSI, F2C(80), 20 * 1609.344, 6.065 * IN, 0.0018 * IN, o["q"], 500 * FT)
check("Pipelines", "Gas line outlet, 12 MMscf/d, 20 mi uphill 500 ft (vs integrated)", o["p2"], ref, 1.0)
# Round trips: solve rate and diameter back from the outlet pressure.
p2 = o["p2"]
gq = json.loads(json.dumps(gl2))
del gq["values"]["q"]
gq["values"]["p2"] = [p2 / PSI, "psia"]
check("Pipelines", "Rate solved back from the outlet pressure", site([gq])[0]["results"]["q"], o["q"], 0.05)
gd = json.loads(json.dumps(gl2))
del gd["values"]["d"]
gd["values"]["p2"] = [p2 / PSI, "psia"]
check("Pipelines", "Diameter solved back from the outlet pressure", site([gd])[0]["results"]["d"], 6.065 * IN, 0.05)

ll = {"slug": "pipeline-flow", "section": "liquid-line", "values": {"q": [5000, "bpd"], "rho": [0.85, "sg"], "mu": [5, "cp"], "d": [4.026, "in"], "l": [10560, "ft"], "dz": [50, "ft"], "eps": [0.0018, "in"]}}
o = site([ll])[0]["results"]
q = 5000 * BBL / 86400
D = 4.026 * IN
v = q / (math.pi * D * D / 4)
rho = 850
f = Colebrook(rho * v * D / 5e-3, 0.0018 / 4.026)
check("Pipelines", "Liquid line pressure drop (Darcy-Weisbach with fluids.Colebrook)", o["dp"], (f * 10560 * FT / D * rho * v * v / 2 + rho * G * 50 * FT) / 1000, 0.05)

er = {"slug": "pipeline-flow", "section": "erosional", "values": {"qo": [2000, "bpd"], "qw": [500, "bpd"], "qg": [3, "mmscfd"], "p": [500, "psia"], "t": [100, "f"], "so": [0.85, "sg"], "sw": [1.0, "sg"], "gamma": [0.7, "x"], "d": [4.026, "in"], "C": [100, "x"]}}
o = site([er])[0]["results"]
Z = site([{"slug": "natural-gas-properties", "section": "z-factor", "values": {"p": [500, "psia"], "t": [100, "f"], "gamma": [0.7, "x"]}}])[0]["results"]["z"]
Rgl = 3e6 / 2500
S1 = (2000 * 0.85 + 500 * 1.0) / 2500
rho14e = (12409 * S1 * 500 + 2.7 * Rgl * 0.7 * 500) / (198.7 * 500 + Rgl * 559.67 * Z)
check("Pipelines", "Mixture density vs the API RP 14E field formula (12409 S₁P + 2.7RSP)/(198.7P + RTZ)", o["rhom"] / LBFT3, rho14e, 0.5)
check("Pipelines", "Erosional velocity C/√ρm", o["ve"] / FT, 100 / math.sqrt(o["rhom"] / LBFT3), 0.01)

# ------------------------------------------------------------------ 7. Separators and tanks
sp = {"slug": "separators-and-tanks", "section": "gas-capacity", "values": {"q": [10, "mmscfd"], "p": [1000, "psia"], "t": [100, "f"], "gamma": [gm, "x"], "rhol": [50, "lbft3"], "K": [0.35, "fts"]}}
o = site([sp])[0]["results"]
rg = CP.PropsSI("D", "P", 1000 * PSI * 1000, "T", F2C(100) + 273.15, "Methane")
vmax = 0.35 * FT * math.sqrt((50 * LBFT3 - rg) / rg)
Vdot = n_of_mscfd(10000) * CP.PropsSI("M", "Methane") / rg
check("Separators", "Vessel diameter (Souders-Brown with CoolProp gas density)", o["d"], math.sqrt(4 * Vdot / vmax / math.pi), 1.5)

def horiz_num(D, L, h, n=200000):
    Rr = D / 2
    s = 0
    for i in range(n):
        y = (i + 0.5) / n * h
        s += 2 * math.sqrt(max(Rr * Rr - (Rr - y) ** 2, 0)) * h / n
    return s * L


tk = {"slug": "separators-and-tanks", "section": "tank-gauge", "values": {"shape": [2, "n"], "d": [8, "ft"], "l": [20, "ft"], "h1": [3, "ft"]}}
o = site([tk])[0]["results"]
check("Separators", "Horizontal tank at 3 ft of 8 ft (vs numerical integration)", o["v1"], horiz_num(8 * FT, 20 * FT, 3 * FT), 0.01)

# ------------------------------------------------------------------ 8. Drilling
c052 = (0.45359237 / 3.785411784e-3) * G * FT / 1000 / PSI
check("Drilling", "Gradient constant 0.052 (psi/ft per ppg)", c052, 0.0519480, 0.001)
k = {"slug": "drilling-well-control", "section": "kill-sheet", "values": {"omw": [10, "ppg"], "sidpp": [400, "psi"], "tvd": [10000, "ft"], "scr": [500, "psi"], "sicp": [600, "psi"], "shoe": [5000, "ft"], "lot": [14.5, "ppg"]}}
o = site([k])[0]["results"]
ppgSI = 0.45359237 / 3.785411784e-3
check("Drilling", "Kill mud weight 10 + 400/(0.051948×10000)", o["kmw"] / ppgSI, 10 + 400 / (c052 * 10000), 0.001)
check("Drilling", "FCP = SCR × KMW/OMW", o["fcp"] / PSI, 500 * (10 + 400 / (c052 * 10000)) / 10, 0.001)
check("Drilling", "MAASP (14.5 − 10) × 0.051948 × 5000", o["maasp"] / PSI, 4.5 * c052 * 5000, 0.001)
a = {"slug": "drilling-well-control", "section": "annular", "values": {"dh": [8.5, "in"], "od": [5, "in"], "id": [4.276, "in"], "md": [10000, "ft"], "q": [400, "gpm"]}}
o = site([a])[0]["results"]
check("Drilling", "Annular capacity (8.5² − 5²)/1029.4 bbl/ft", o["ca"] * FT / BBL, (8.5**2 - 5**2) / 1029.4, 0.01)
check("Drilling", "Annular velocity 24.51 Q/(Dh² − OD²) ft/min", o["av"] / FT * 60, 24.51 * 400 / (8.5**2 - 25), 0.05)

# ------------------------------------------------------------------ 9. Artificial lift
o = site([{"slug": "artificial-lift", "section": "rod-pump", "values": {"dp": [1.75, "in"], "s": [100, "in"], "n": [8, "x"], "ev": [80, "pct"]}}])[0]["results"]
check("Artificial lift", "Rod pump displacement 0.1166 D²SN", o["pd"] * 86400 / BBL, 0.1166 * 1.75**2 * 100 * 8, 0.05)
e = {"slug": "artificial-lift", "section": "esp", "values": {"q": [1500, "bpd"], "h": [6000, "ft"], "pip": [600, "psig"], "pwh": [100, "psig"], "sg": [1.03, "sg"], "mu": [1, "cp"], "d": [2.441, "in"], "eps": [0.0006, "in"]}}
o = site([e])[0]["results"]
q = 1500 * BBL / 86400
D = 2.441 * IN
v = q / (math.pi * D * D / 4)
f = Colebrook(1030 * v * D / 1e-3, 0.0006 / 2.441)
tdh = 6000 * FT + f * 6000 * FT / D * v * v / (2 * G) + (100 - 600) * PSI * 1000 / (1030 * G)
check("Artificial lift", "ESP total dynamic head (hand, fluids.Colebrook)", o["tdh"], tdh, 0.05)

# ------------------------------------------------------------------ impossible inputs must give an error, never a number
bad = [
    ("well-inflow", "darcy", {**dc["values"], "pwf": [3500, "psia"]}),
    ("well-inflow", "vogel", {**vc["values"], "pt": [3100, "psia"]}),
    ("natural-gas-properties", "z-factor", {"p": [-5, "psia"], "t": [100, "f"], "gamma": [0.7, "x"]}),
    ("natural-gas-properties", "composition", {"c1": [50, "pct"]}),
    ("pipeline-flow", "gas-line", {**gl["values"], "q": [500, "mmscfd"]}),
    ("drilling-well-control", "annular", {**a["values"], "od": [9, "in"]}),
    ("gas-well-deliverability", "nodal", {**nv, "pt": [1900, "psia"]}),
    ("choke-calculator", "gas-choke", {"p1": [400, "psia"], "p2": [500, "psia"], "t1": [100, "f"], "gamma": [0.65, "x"], "k": [1.28, "x"], "cd": [0.85, "x"], "d": [24, "in64"]}),
    ("separators-and-tanks", "tank-gauge", {"shape": [2, "n"], "d": [8, "ft"], "l": [20, "ft"], "h1": [9, "ft"]}),
    ("artificial-lift", "rod-pump", {"dp": [1.75, "in"], "s": [100, "in"], "n": [8, "x"], "ev": [0, "pct"]}),
    ("crude-oil-pvt", "gravity", {"sg": [0, "x"]}),
]
res = site([{"slug": s, "section": sec, "values": v} for s, sec, v in bad])
impossible = [(f"{s}/{sec}", r["error"]) for (s, sec, _), r in zip(bad, res)]

# ------------------------------------------------------------------ report
fails = [r for r in rows if not r[6]]
print("# Oil and gas calculators: independent accuracy audit\n")
print(f"{len(rows)} checks, {len(rows) - len(fails)} within tolerance, {len(fails)} outside.\n")
area = None
for r in rows:
    if r[0] != area:
        area = r[0]
        print(f"\n## {area}\n\n| Check | Website | Reference | Difference | Tolerance | |\n|---|---:|---:|---:|---:|---|")
    print(f"| {r[1]} | {r[2]:.6g} | {r[3]:.6g} | {r[4]:.3f} % | {r[5]} % | {'OK' if r[6] else 'CHECK'} |")
print("\n## Impossible inputs (each must give an error message, not a number)\n\n| Case | Website message |\n|---|---|")
for k, e in impossible:
    print(f"| {k} | {e or 'NO ERROR (gave a number)'} |")
sys.exit(1 if fails or any(e is None for _, e in impossible) else 0)
