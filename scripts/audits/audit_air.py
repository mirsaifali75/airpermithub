"""
Independent accuracy audit of the air permit engineering calculators
(BACT cost-effectiveness, flare 40 CFR 60.18 / 63.11 check, Method 19).

Every website result is compared with a calculation typed again here from the
source documents, sharing no code with the website: the Cost Manual capital
recovery factor, a brute-force dominance test, the 60.18 velocity and heating
value rules written from the regulation text, and Method 19 Eq. 19-1 to 19-15
and 19-18. It also checks the constants against first principles: K of
60.18(f)(3), the Btu/scf to MJ/scm factor, and the Table 19-1 conversion
factors against molecular weight over the 20 °C molar volume.

    python3 scripts/audits/audit_air.py > /tmp/audit.md

Needs `npx tsx` (runs scripts/audits/run-cases.ts for the website's numbers).
"""
import json
import math
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Units, typed again (exact definitions where they exist).
LB = 0.45359237  # kg
FT = 0.3048  # m
SCF = FT**3  # m³
BTU_J = 1055.05585262  # J, International Table Btu
MMBTU_J = 1e6 * BTU_J
YEAR_S = 8760 * 3600
TON_KG = 2000 * LB
R = 8.314462618
T_STD, P_STD = 293.15, 101325.0  # 40 CFR 60.2: 20 °C, 760 mm Hg

TPY = TON_KG / YEAR_S  # kg/s per ton/yr
LBMMBTU = LB * 1e12 / MMBTU_J  # ng/J per lb/MMBtu
SCFMMBTU = SCF / MMBTU_J  # m³/J per scf/10⁶ Btu
LBSCF = LB / SCF  # kg/m³ per lb/scf
BTUSCF = (BTU_J / 1e6) / SCF  # MJ/m³ per Btu/scf
MMBTUH_KW = MMBTU_J / 3600 / 1000  # kW per MMBtu/h
LBH = LB / 3600  # kg/s per lb/h

rows = []  # (area, check, site, reference, diff %, tolerance %, ok)
logic = []  # (area, case, site, reference, ok)


def site(cases):
    p = subprocess.run(["npx", "tsx", "scripts/audits/run-cases.ts"], input=json.dumps(cases), capture_output=True, text=True, cwd=ROOT, check=True)
    return json.loads(p.stdout)


def check(area, what, s, ref, tol=1e-6):
    d = abs(s - ref) / max(abs(ref), 1e-30) * 100
    rows.append((area, what, s, ref, d, tol, d <= tol))


def same(area, what, s, ref):
    logic.append((area, what, s, ref, s == ref))


# ------------------------------------------------------------------ constants from first principles
VM20 = R * T_STD / P_STD  # m³/mol at 20 °C
check("Constants", "60.18(f)(3) K = 10⁻⁶ × (mol/scm at 20 °C) × 4.184×10⁻³ MJ/kcal vs printed 1.740×10⁻⁷", 1.740e-7, 1e-6 / VM20 * 4.184e-3, 0.05)
check("Constants", "Btu/scf to MJ/scm", BTUSCF, 1.05505585262e-3 / 0.028316846592, 1e-9)
check("Constants", "11.2 MJ/scm = 300 Btu/scf (60.18 quotes both)", 300 * BTUSCF, 11.2, 0.25)
check("Constants", "7.45 MJ/scm = 200 Btu/scf", 200 * BTUSCF, 7.45, 0.05)
check("Constants", "37.3 MJ/scm = 1,000 Btu/scf", 1000 * BTUSCF, 37.3, 0.2)
# Methane: net heat of combustion 191.76 kcal/g-mol (25 °C) through the 60.18 equation vs Table 12's 896 Btu/scf.
check("Constants", "Methane: 1.740×10⁻⁷ × 10⁶ ppm × 191.76 kcal/g-mol vs Table 12 896 Btu/scf", 896 * BTUSCF, 1.740e-7 * 1e6 * 191.76, 0.2)
# Table 19-1: lb/scf per ppm = MW × 10⁻⁶ / (scf per lb-mol at 20 °C).
scf_per_lbmol = VM20 * 1000 * LB / SCF
check("Constants", "Table 19-1 SO2 1.660×10⁻⁷ lb/scf per ppm vs 64.066 / 385.3 × 10⁻⁶", 1.66e-7, 64.066e-6 / scf_per_lbmol, 0.3)
check("Constants", "Table 19-1 NOx 1.194×10⁻⁷ lb/scf per ppm vs 46.0055 / 385.3 × 10⁻⁶", 1.194e-7, 46.0055e-6 / scf_per_lbmol, 0.3)

# ------------------------------------------------------------------ BACT cost
rnd = random.Random(20261116)


def crf(i, n):
    if i == 0:
        return 1 / n
    return i * (1 + i) ** n / ((1 + i) ** n - 1)


cases, refs = [], []
for _ in range(40):
    tci = rnd.uniform(1e5, 5e7)
    i = rnd.choice([0, rnd.uniform(1, 12)])
    n = rnd.randint(5, 40)
    dac, iac, rc = rnd.uniform(0, 2e6), rnd.uniform(0, 1e6), rnd.choice([0, rnd.uniform(0, 1e5)])
    cases.append({"slug": "bact-cost-effectiveness", "section": "annual-cost", "values": {"tci": [tci, "usd"], "i": [i, "pct"], "n": [n, "yr"], "dac": [dac, "usdyr"], "iac": [iac, "usdyr"], "rc": [rc, "usdyr"]}})
    f = crf(i / 100, n)
    refs.append({"crf": f, "crc": f * tci, "tac": dac + iac + f * tci - rc})
for k, r, ref in zip(cases, site(cases), refs):
    for key in ("crf", "crc", "tac"):
        check("BACT annual cost", f"{key}: TCI {k['values']['tci'][0]:,.0f}, i {k['values']['i'][0]:.2f} %, n {k['values']['n'][0]}", r["results"][key], ref[key], 1e-9)

cases, refs = [], []
for _ in range(30):
    tac, base = rnd.uniform(1e4, 5e6), rnd.uniform(10, 5000)
    if rnd.random() < 0.5:
        ce = rnd.uniform(5, 99.9)
        cases.append({"slug": "bact-cost-effectiveness", "section": "average", "values": {"tac": [tac, "usdyr"], "base": [base, "tpy"], "ce": [ce, "pct"]}})
        removed = base * ce / 100
    else:
        ctrl = rnd.uniform(0, base * 0.95)
        cases.append({"slug": "bact-cost-effectiveness", "section": "average", "values": {"tac": [tac, "usdyr"], "base": [base, "tpy"], "ctrl": [ctrl, "tpy"]}})
        removed = base - ctrl
    refs.append(tac / removed)
for k, r, ref in zip(cases, site(cases), refs):
    check("BACT average", f"$/ton, baseline {k['values']['base'][0]:,.1f} tpy", r["results"]["ace"], ref, 1e-9)


def dominant_ice(base, opts):
    """Brute force: an option is dominated when another removes at least as much for no more
    cost and is better in one (or is an identical earlier option). ICE between dominant
    options taken in order of tons removed."""
    rem = {k: base - e for k, (t, e) in opts.items()}
    dom = set()
    for a, (ta, _) in opts.items():
        for b, (tb, _) in opts.items():
            if a == b:
                continue
            if rem[b] >= rem[a] and tb <= ta and (rem[b] > rem[a] or tb < ta or b < a):
                dom.add(a)
                break
    keep = sorted((k for k in opts if k not in dom), key=lambda k: (rem[k], opts[k][0]))
    ice = {}
    for p, q in zip(keep, keep[1:]):
        ice[q] = (opts[q][0] - opts[p][0]) / (rem[q] - rem[p])
    return dom, ice


cases, refs = [], []
for _ in range(60):
    base = rnd.uniform(50, 2000)
    nopt = rnd.randint(2, 4)
    opts = {}
    for k in range(1, nopt + 1):
        opts[k] = (round(rnd.uniform(1e4, 2e6), -2), round(rnd.uniform(0, base * 0.95), 1))
    vals = {"base": [base, "tpy"]}
    for k, (t, e) in opts.items():
        vals[f"tac{k}"] = [t, "usdyr"]
        vals[f"e{k}"] = [e, "tpy"]
    cases.append({"slug": "bact-cost-effectiveness", "section": "incremental", "values": vals})
    refs.append((base, opts, *dominant_ice(base, opts)))
for k, r, (base, opts, dom, ice) in zip(cases, site(cases), refs):
    res = r["results"]
    same("BACT incremental", f"dominant options {sorted(set(opts) - dom)}, n={len(opts)}", res["ndom"], len(opts) - len(dom))
    for o in opts:
        check("BACT incremental", f"option {o} average $/ton", res[f"ace{o}"], opts[o][0] / (base - opts[o][1]), 1e-9)
        if o in ice:
            check("BACT incremental", f"option {o} incremental $/ton", res[f"ice{o}"], ice[o], 1e-9)
        same("BACT incremental", f"option {o} has incremental $/ton only when dominant and not the least stringent", f"ice{o}" in res, o in ice)

# ------------------------------------------------------------------ flare heating value
TABLE12 = {"c1": 896, "c2": 1595, "c3": 2281, "ic4": 2957, "nc4": 2968, "c5p": 3655, "c2h4": 1477, "c3h6": 2150, "cbut": 2830, "ibut": 2928, "tbut": 2826, "bd12": 2794, "bd13": 2690, "c2h2": 1404, "macet": 2088, "propd": 2066, "cprop": 2185, "bz": 3591, "h2": 1212, "co": 316, "h2s": 587, "co2": 0, "n2": 0, "o2": 0, "h2o": 0}
cases, refs = [], []
for _ in range(60):
    comps = rnd.sample(list(TABLE12), rnd.randint(2, 8))
    w = [rnd.random() for _ in comps]
    tot = sum(w)
    vals = {c: [100 * x / tot, "pct"] for c, x in zip(comps, w)}
    basis = rnd.choice([1, 2])
    typ = rnd.choice([1, 2, 3])
    vals["basis"], vals["type"] = [basis, "n"], [typ, "n"]
    nhv = sum(v[0] / 100 * (274 if (c == "h2" and basis == 1) else TABLE12[c]) for c, v in vals.items() if c in TABLE12)
    cases.append({"slug": "flare-60-18-check", "section": "net-heating-value", "values": vals})
    refs.append((nhv, basis, typ))
for k, r, (nhv, basis, typ) in zip(cases, site(cases), refs):
    check("Flare heating value", f"H_T MJ/scm, basis {basis}", r["results"]["nhv"], nhv * BTUSCF, 1e-9)
    if basis == 1:
        mn = 7.45 if typ == 3 else 11.2
        same("Flare heating value", f"type {typ}, {nhv:.1f} Btu/scf vs {mn} MJ/scm minimum", r["checks"][0]["pass"], nhv * BTUSCF >= mn)


# ------------------------------------------------------------------ flare velocity, typed from 60.18(c)(4), (c)(5), (f)(4)-(6) and 63.11(b)(7), (b)(8)
def velocity_ok(rule, typ, V, ht):
    if typ == 2:
        vmax = 8.706 + 0.7084 * ht if rule == 1 else 8.71 + 0.708 * ht
        return V < vmax
    if V < 18.3:
        return True
    if 18.3 <= V < 122 and ht > 37.3:
        return True
    return V < 10 ** ((ht + 28.8) / 31.7) and V < 122


cases, refs = [], []
for _ in range(300):
    rule, typ = rnd.choice([1, 2]), rnd.choice([1, 2, 3])
    ht_b = rnd.uniform(150, 2500)  # Btu/scf
    d_in = rnd.choice([2, 3, 4, 6, 8, 12, 16, 24, 36, 48])
    A = math.pi * (d_in * 0.0254) ** 2 / 4
    V_target = rnd.uniform(1, 160)
    q_scfh = V_target * A / SCF * 3600
    vals = {"rule": [rule, "n"], "type": [typ, "n"], "ht": [ht_b, "btuscf"], "q": [q_scfh, "scfh20"], "d": [d_in, "in"]}
    xh2 = None
    if typ == 3 and rnd.random() < 0.5:
        xh2 = rnd.uniform(0, 40)
        vals["xh2"] = [xh2, "pct"]
    cases.append({"slug": "flare-60-18-check", "section": "exit-velocity", "values": vals})
    # Exit velocity: scf at 20 °C, 760 mm Hg (Method 2 standard conditions), over tip area.
    V = q_scfh * SCF / 3600 / A
    refs.append((rule, typ, V, ht_b * BTUSCF, d_in, xh2))
for k, r, (rule, typ, V, ht, d_in, xh2) in zip(cases, site(cases), refs):
    check("Flare velocity", f"V m/s, d {d_in} in", r["results"]["v"], V, 1e-9)
    ch = {c["text"].split(" ")[0].rstrip(":"): c["pass"] for c in r["checks"]}
    same("Flare velocity", f"rule {rule}, type {typ}, V {V:.2f} m/s, H_T {ht:.2f}: velocity verdict", ch["Velocity"], velocity_ok(rule, typ, V, ht))
    same("Flare velocity", f"type {typ}, H_T {ht:.2f}: heating value verdict", ch["Heating"], ht >= (7.45 if typ == 3 else 11.2))
    if xh2 is not None:
        same("Flare velocity", f"hydrogen option: {d_in} in, {xh2:.1f} %, V {V:.2f}", ch["Hydrogen"], d_in >= 3 and xh2 >= 8.0 and V < 37.2 and V < (xh2 - 6.0) * 3.9)

# ------------------------------------------------------------------ Method 19
cases, refs = [], []
for _ in range(40):
    C, H, S, N, O = rnd.uniform(40, 88), rnd.uniform(2, 14), rnd.uniform(0, 5), rnd.uniform(0, 2), rnd.uniform(0, 15)
    W = rnd.choice([0, rnd.uniform(0, 30)])
    tot = C + H + S + N + O + W
    if tot > 98:  # keep a real analysis (the rest is ash): scale to 98 %
        C, H, S, N, O, W = (x * 98 / tot for x in (C, H, S, N, O, W))
    gcv = rnd.uniform(6000, 23000)
    gcvw = rnd.choice([None, gcv * rnd.uniform(0.7, 1)])
    vals = {"C": [C, "pct"], "H": [H, "pct"], "S": [S, "pct"], "N": [N, "pct"], "O": [O, "pct"], "W": [W, "pct"], "gcv": [gcv, "btulb"]}
    if gcvw:
        vals["gcvw"] = [gcvw, "btulb"]
    cases.append({"slug": "method-19-f-factor", "section": "f-factor", "values": vals})
    gw = gcvw or gcv
    refs.append({
        "fd": 1e6 * (3.64 * H + 1.53 * C + 0.57 * S + 0.14 * N - 0.46 * O) / gcv,  # Eq. 19-13
        "fw": 1e6 * (5.57 * H + 1.53 * C + 0.57 * S + 0.14 * N - 0.46 * O + 0.21 * W) / gw,  # Eq. 19-14
        "fc": 1e6 * 0.321 * C / gcv,  # Eq. 19-15
    })
for k, r, ref in zip(cases, site(cases), refs):
    for key in ("fd", "fw", "fc"):
        check("Method 19 F factors", f"{key}, GCV {k['values']['gcv'][0]:,.0f} Btu/lb", r["results"][key], ref[key] * SCFMMBTU, 1e-9)


def m19(eq, C, F, d, b):
    """Eq. 19-1 to 19-9 as printed in the 2023 method (C in lb/scf, F in scf/10⁶ Btu)."""
    return {
        1: C * F * 20.9 / (20.9 - d),
        2: C * F * 20.9 / (20.9 * (1 - b) - d),
        3: C * F * 20.9 / (20.9 * (1 - b) - d),
        4: C * F * 20.9 / ((1 - b) * (20.9 - d)),
        5: C * F * 20.9 / (20.9 - d / (1 - b)),
        6: C * F * 100 / d,
        7: C * F * 100 / d,
        8: C * F * 100 / (d * (1 - b)),
        9: C * F * 100 * (1 - b) / d,
    }[eq]


cases, refs = [], []
for _ in range(90):
    eq = rnd.randint(1, 9)
    pol = rnd.choice([1, 2])
    ppm = rnd.uniform(1, 2000)
    F = rnd.uniform(1500, 11000)
    d = rnd.uniform(1, 15) if eq <= 5 else rnd.uniform(3, 18)
    b = rnd.uniform(0.02, 0.2)
    vals = {"eq": [eq, "n"], "pol": [pol, "n"], "ppm": [ppm, "ppmv"], "F": [F, "scfmmbtu"], "dil": [d, "pct"]}
    if eq not in (1, 6):
        vals["b"] = [b, "x"]
    cases.append({"slug": "method-19-f-factor", "section": "emission-rate", "values": vals})
    C = ppm * (1.66e-7 if pol == 1 else 1.194e-7)  # Table 19-1
    refs.append((eq, m19(eq, C, F, d, b)))
for k, r, (eq, ref) in zip(cases, site(cases), refs):
    if r["error"]:
        rows.append(("Method 19 E", f"Eq. 19-{eq}: site error {r['error']}", 0, ref, 100, 0, False))
        continue
    check("Method 19 E", f"Eq. 19-{eq} lb/MMBtu", r["results"]["e"], ref * LBMMBTU, 1e-9)

cases, refs = [], []
for _ in range(20):
    x = [rnd.random() for _ in range(3)]
    t = sum(x)
    x = [100 * v / t for v in x]
    f = [rnd.uniform(1500, 11000) for _ in range(3)]
    cases.append({"slug": "method-19-f-factor", "section": "fuel-mix", "values": {f"x{i+1}": [x[i], "pct"] for i in range(3)} | {f"f{i+1}": [f[i], "scfmmbtu"] for i in range(3)}})
    refs.append(sum(a / 100 * b for a, b in zip(x, f)))  # Eq. 19-18
for k, r, ref in zip(cases, site(cases), refs):
    check("Method 19 mixed fuels", "F = Σ x_k F_k", r["results"]["f"], ref * SCFMMBTU, 1e-9)

cases, refs = [], []
for _ in range(20):
    e, hi, hrs = rnd.uniform(0.001, 2), rnd.uniform(1, 3000), rnd.uniform(100, 8760)
    cases.append({"slug": "method-19-f-factor", "section": "mass-rate", "values": {"e": [e, "lbmmbtu"], "hi": [hi, "mmbtuh"], "hrs": [hrs, "h"]}})
    refs.append((e * hi, e * hi * hrs / 2000))
for k, r, (lbh, tpy) in zip(cases, site(cases), refs):
    check("Method 19 mass rate", "lb/h", r["results"]["lbh"], lbh * LBH, 1e-9)
    check("Method 19 mass rate", "tons/yr", r["results"]["tpy"], tpy * TPY, 1e-9)

# ------------------------------------------------------------------ report
bad = [x for x in rows if not x[6]]
badl = [x for x in logic if not x[4]]
out = sys.stdout
out.write("# Air permit engineering calculators: independent accuracy audit\n\n")
out.write(f"{len(rows)} numeric comparisons, {len(bad)} outside tolerance. {len(logic)} pass/fail verdicts compared, {len(badl)} disagree.\n\n")
areas = sorted({x[0] for x in rows} | {x[0] for x in logic})
out.write("| Area | Numeric checks | Largest difference | Verdicts | Disagreements |\n|---|---|---|---|---|\n")
for a in areas:
    rs = [x for x in rows if x[0] == a]
    ls = [x for x in logic if x[0] == a]
    mx = max((x[4] for x in rs), default=0)
    out.write(f"| {a} | {len(rs)} | {mx:.2e} % | {len(ls)} | {sum(not x[4] for x in ls)} |\n")
out.write("\n## Constants against first principles\n\n| Check | Value | Reference | Difference |\n|---|---|---|---|\n")
for a, w, s, ref, d, tol, ok in rows:
    if a == "Constants":
        out.write(f"| {w} | {s:.6g} | {ref:.6g} | {d:.3f} % (limit {tol} %) {'' if ok else 'FAIL'} |\n")
if bad or badl:
    out.write("\n## Problems\n\n")
    for x in bad:
        out.write(f"- {x[0]}: {x[1]}: site {x[2]:.10g}, reference {x[3]:.10g} ({x[4]:.3g} %)\n")
    for x in badl:
        out.write(f"- {x[0]}: {x[1]}: site {x[2]}, reference {x[3]}\n")
sys.exit(1 if bad or badl else 0)
