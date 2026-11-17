"""
Excel formulas for the air permit engineering calculators
(src/lib/utilities/airtools), used by build_utilities.py when the spec's
collection is "air".

Each section mirrors its compute() in TypeScript step for step: the same
inputs (column E holds SI values), the same equations, and the same result
keys, so the workbook and the website agree to rounding. Pass/fail lines
against the quoted 40 CFR 60.18 and 63.11 limits are written as "MEETS" or
"DOES NOT MEET" rows.
"""

from openpyxl.styles import Font

H = None  # build_utilities module, set by build_section

R = 8.314462618
P_ATM = 101325.0
T_STD = 293.15  # 40 CFR 60.2 standard temperature, K
VM = R * T_STD / P_ATM  # m³/mol at 20 °C and 760 mm Hg
TABLE12 = [  # (input id, NHV Btu/scf), Table 12 to subpart CC of part 63
    ("c1", 896), ("c2", 1595), ("c3", 2281), ("ic4", 2957), ("nc4", 2968), ("c5p", 3655), ("c2h4", 1477), ("c3h6", 2150),
    ("cbut", 2830), ("ibut", 2928), ("tbut", 2826), ("bd12", 2794), ("bd13", 2690), ("c2h2", 1404), ("macet", 2088),
    ("propd", 2066), ("cprop", 2185), ("bz", 3591), ("h2", None), ("co", 316), ("h2s", 587), ("co2", 0), ("n2", 0), ("o2", 0), ("h2o", 0),
]
M19 = {"hd": 3.64, "hw": 5.57, "c": 1.53, "s": 0.57, "n": 0.14, "o": 0.46, "w": 0.21, "cc": 0.321}
OPTIONS = 4

README = [
    ("AirPermitHub Air Permit Engineering Calculations", None),
    ("", None),
    ("How to use", "H"),
    ("1. Type your values in the yellow cells, in the units shown in column C. Leave optional cells blank. Pick-list cells take the number shown in column C.", None),
    ("2. Results are the blue rows; the most important ones are bold. Grey intermediate steps are hidden: select the rows around them, right-click, and choose Unhide to see them.", None),
    ("   Only the yellow cells accept typing, and only numbers. Every formula is locked so it cannot be overwritten by mistake. The 'Input check' row under each section's inputs says OK, or names the value to fix.", None),
    ("3. Flare rows marked MEETS or DOES NOT MEET compare your numbers with the 40 CFR 60.18(c) or 63.11(b) limits; the rule text is quoted on the website beside each section.", None),
    ("4. Column E holds every value in SI units; the formulas work in SI so any unit conversion is visible.", None),
    ("5. Column F holds keys the website uses to import this workbook. Do not edit or move them.", None),
    ("6. To check your numbers, use Import Excel on the website: it reloads your inputs, recalculates, and lists any result that differs.", None),
    ("", None),
    ("Methods and sources", "H"),
    ("BACT Cost: EPA Air Pollution Control Cost Manual, 7th ed., Section 1, Chapter 2 (capital recovery factor, total annual cost); EPA NSR Workshop Manual, Chapter B (average and incremental cost-effectiveness, dominant options).", None),
    ("Flare 60.18: 40 CFR 60.18(c) and (f), 40 CFR 63.11(b); component net heating values from Table 12 to subpart CC of part 63 (hydrogen at its theoretical 274 Btu/scf unless the subpart CC basis is picked).", None),
    ("Method 19: 40 CFR Part 60, Appendix A-7, Method 19, equations 19-1 to 19-9 and 19-13 to 19-18, Table 19-1. Standard conditions 20 °C and 760 mm Hg (40 CFR 60.2).", None),
    ("No interest rate, F factor, emission factor, or cost threshold is built in. Enter your own and record their sources.", None),
]


def n(x):
    return H.num(x)


def fac(fam, uid):
    return H.unit(fam, uid)["factor"]


def bl(x):
    return f'{x}=""'


def nz(x, d=0):
    return f'IF({x}="",{d},{x})'


def isn(*xs):
    return "AND(" + ",".join(f"ISNUMBER({x})" for x in xs) + ")" if len(xs) > 1 else f"ISNUMBER({xs[0]})"


def calc(sec, *a, **k):
    return sec.calc(*a, **k)


def hcalc(sec, label, si, note="", family="ratio", uid=None):
    return sec.calc(label, si, family, uid, note, helper=True)


def verdict(sec, label, active, ok, note=""):
    """A MEETS / DOES NOT MEET row, blank until `active` is TRUE."""
    ws, r = sec.ws, sec.r
    ws.cell(row=r, column=1, value=label).font = Font(bold=True)
    c = ws.cell(row=r, column=2, value=f'=IF(NOT(IFERROR({active},FALSE)),"",IF(IFERROR({ok},FALSE),"MEETS","DOES NOT MEET"))')
    c.font = Font(bold=True, color="0B2545")
    ws.cell(row=r, column=4, value=note).font = H.F_SMALL
    sec.r += 1


# ---------------------------------------------------------------- BACT cost
def s_annual(sec, E):
    i = hcalc(sec, "Interest rate as a fraction", f"{E['i']}/100")
    f = calc(sec, "Capital recovery factor (CRF)", f"IF({i}=0,1/{E['n']},{i}*(1+{i})^{E['n']}/((1+{i})^{E['n']}-1))", note="i(1 + i)ⁿ ÷ ((1 + i)ⁿ − 1)", out="crf")
    crc = calc(sec, "Capital recovery cost (CRC)", f"{E['tci']}*{f}", "costyr", "usdyr", "TCI × CRF", out="crc", key=True)
    calc(sec, "Total annual cost (TAC)", f"{E['dac']}+{nz(E['iac'])}+{crc}-{nz(E['rc'])}", "costyr", "usdyr", "DAC + IAC + CRC − RC", out="tac", key=True)


def s_average(sec, E):
    T = n(fac("erate", "tpy"))
    sec.chk(f"({bl(E['ctrl'])})+({bl(E['ce'])})<>1", "Enter either the controlled emissions or the control efficiency, not both.")
    sec.chk(f"AND({isn(E['ctrl'], E['base'])},{bl(E['ce'])},{E['ctrl']}>{E['base']})", "Controlled emissions cannot be higher than the baseline.")
    rem = calc(sec, "Emissions removed", f"IF({bl(E['ce'])},{E['base']}-{E['ctrl']},{E['base']}*{E['ce']}/100)", "erate", "tpy", "E_base − E_ctrl, or E_base × CE ÷ 100", out="removed", key=True)
    sec.chk(f"AND(ISNUMBER({rem}),{rem}<=0)", "The option removes nothing, so cost per ton is undefined.")
    calc(sec, "Average cost-effectiveness", f"{E['tac']}/({rem}/{T})", "costton", "usdton", "TAC ÷ tons removed", out="ace", key=True)
    calc(sec, "Controlled emissions", f"{E['base']}-{rem}", "erate", "tpy", out="ctrl")
    calc(sec, "Control efficiency", f"{rem}/{E['base']}*100", "pct", "pct", out="pct")


def s_incremental(sec, E):
    T = n(fac("erate", "tpy"))
    base = E["base"]
    ks = range(1, OPTIONS + 1)
    valid = {k: f"{isn(E[f'tac{k}'], E[f'e{k}'])}" for k in ks}
    for k in ks:
        sec.chk(f"ISNUMBER({E[f'tac{k}']})<>ISNUMBER({E[f'e{k}']})", f"Option {k} needs both its total annual cost and its controlled emissions.")
        sec.chk(f"AND({valid[k]},ISNUMBER({base}),{E[f'e{k}']}>{base}+1E-12)", f"Option {k}: controlled emissions cannot be higher than the baseline.")
        sec.chk(f"AND({valid[k]},ISNUMBER({base}),{E[f'e{k}']}>={base})", f"Option {k} removes nothing, so its cost per ton is undefined.")
    sec.chk(f"({'+'.join(f'IF({valid[k]},1,0)' for k in ks)})<2", "Enter at least two options, each with its total annual cost and controlled emissions.")
    red, tac = {}, {}
    for k in ks:
        red[k] = hcalc(sec, f"Option {k}: tons removed per year", f'IF({valid[k]},({base}-{E[f"e{k}"]})/{T},"")')
        tac[k] = E[f"tac{k}"]
    for k in ks:
        calc(sec, f"Option {k}: average cost-effectiveness", f'IF({valid[k]},{tac[k]}/{red[k]},"")', "costton", "usdton", "TAC ÷ tons removed", out=f"ace{k}", key=True)
        calc(sec, f"Option {k}: tons removed", f'IF({valid[k]},{red[k]}*{T},"")', "erate", "tpy", out=f"red{k}")
    dom = {}
    for k in ks:
        terms = []
        for j in ks:
            if j == k:
                continue
            tie = "TRUE" if j < k else "FALSE"
            terms.append(f"IF({valid[j]},AND({red[j]}>={red[k]},{tac[j]}<={tac[k]},OR({red[j]}>{red[k]},{tac[j]}<{tac[k]},{tie})),FALSE)")
        dom[k] = hcalc(sec, f"Option {k} dominated (1 = yes)", f'IF({valid[k]},IF(OR({",".join(terms)}),1,0),"")', "another option removes at least as much for no more cost")
    n_dom = []
    for k in ks:
        live = lambda j: f"AND({valid[j]},{dom[j]}=0)"
        prev = hcalc(sec, f"Option {k}: tons removed by the next less stringent dominant option", "MAX(" + ",".join(f"IF({live(j)},IF({red[j]}<{red[k]},{red[j]},-1),-1)" for j in ks if j != k) + ")")
        ptac = hcalc(sec, f"Option {k}: that option's annual cost ($/yr)", "SUM(" + ",".join(f"IF({live(j)},IF({red[j]}={prev},{tac[j]},0),0)" for j in ks if j != k) + ")")
        calc(sec, f"Option {k}: incremental cost-effectiveness", f'IF(AND({live(k)},{prev}>=0),({tac[k]}-{ptac})/({red[k]}-{prev}),"")', "costton", "usdton", "ΔTAC ÷ Δtons removed vs the next less stringent dominant option", out=f"ice{k}", key=True)
        n_dom.append(f"IF({live(k)},1,0)")
    calc(sec, "Dominant options (least-cost envelope)", "+".join(n_dom), "count", "n", out="ndom")


# ---------------------------------------------------------------- Flare 60.18
def s_nhv(sec, E):
    btu = n(fac("vhv", "btuscf"))
    cc = f"{E['basis']}=2"
    terms = []
    for cid, nhv in TABLE12:
        val = f"IF({cc},1212,274)" if cid == "h2" else n(nhv)
        if nhv == 0:
            continue
        terms.append(f"{nz(E[cid])}/100*{val}")
    for k in (1, 2):
        terms.append(f"{nz(E[f'ox{k}'])}/100*{nz(E[f'hx{k}'])}/{btu}")
        sec.chk(f"ISNUMBER({E[f'ox{k}']})<>ISNUMBER({E[f'hx{k}']})", f"Other component {'A' if k == 1 else 'B'} needs both its percent and its net heating value.")
    pct_ids = [c for c, _ in TABLE12] + ["ox1", "ox2"]
    total = calc(sec, "Components entered (total)", "+".join(nz(E[c]) for c in pct_ids), "pct", "pct", out="total")
    sec.chk(f"COUNT({','.join(E[c] for c in pct_ids)})=0", "Enter the gas analysis: the mole percent of each component present.")
    sec.chk(f"{total}>100.5", "The components add up to more than 100 %. Check the analysis.")
    s = hcalc(sec, "Σ xᵢ NHVᵢ (Btu/scf)", "+".join(terms), "hydrogen at 274 Btu/scf, or 1,212 with the subpart CC basis")
    calc(sec, "Net heating value of the gas, H_T", f"{s}*{btu}", "vhv", "btuscf", "Σ xᵢ NHVᵢ; MJ/scm = Btu/scf × 0.0372589", out="nhv", key=True)
    ht = hcalc(sec, "H_T (MJ/scm)", f"{s}*{btu}")
    mn = calc(sec, "Minimum net heating value for this flare type", f'IF({cc},"",IF({E["type"]}=3,7.45,11.2))', "vhv", "mjscm", "60.18(c)(3)(ii): 11.2 MJ/scm (300 Btu/scf) steam- or air-assisted; 7.45 MJ/scm (200 Btu/scf) nonassisted", out="min")
    verdict(sec, "Heating value, 60.18(c)(3)(ii) and 63.11(b)(6)(ii)", f"AND(NOT({cc}),{total}>0,{total}<=100.5)", f"{ht}>={mn}", "Subpart CC basis: no limit checked here (63.670(e) uses the combustion zone value).")


def s_velocity(sec, E):
    ht, typ, rule = E["ht"], E["type"], E["rule"]
    sec.chk(f"AND({bl(E['d'])},{bl(E['area'])})", "Enter the flare tip diameter or its unobstructed area.")
    A = hcalc(sec, "Unobstructed tip area (m²)", f"IF(ISNUMBER({E['area']}),{E['area']},PI()*{E['d']}^2/4)")
    sec.chk(f"AND(ISNUMBER({A}),{A}<=0)", "The tip area must be greater than zero.")
    Q = hcalc(sec, "Flow at 20 °C and 760 mm Hg (m³/s)", f"{E['q']}*{n(VM)}")
    V = calc(sec, "Exit velocity", f"{Q}/{A}", "vel", "ms", "V = Q ÷ A", out="v", key=True)
    f5 = hcalc(sec, "V_max by 60.18(f)(5) (m/s)", f"10^(({ht}+28.8)/31.7)")
    fair = hcalc(sec, "V_max for air-assisted flares (m/s)", f"IF({rule}=2,8.71+0.708*{ht},8.706+0.7084*{ht})")
    calc(sec, "Maximum permitted velocity, V_max", f"IF({typ}=2,{fair},{f5})", "vel", "ms", "air-assisted: 8.706 + 0.7084 H_T (63.11: 8.71 + 0.708 H_T); others: log₁₀ V_max = (H_T + 28.8) ÷ 31.7", out="vmax", key=True)
    active = isn(V, ht)
    verdict(sec, "Heating value, 60.18(c)(3)(ii) / 63.11(b)(6)(ii)", active, f"{ht}>=IF({typ}=3,7.45,11.2)")
    ok = f"IF({typ}=2,{V}<{fair},OR({V}<18.3,AND({V}>=18.3,{V}<122,{ht}>37.3),AND({V}<{f5},{V}<122)))"
    verdict(sec, "Exit velocity, 60.18(c)(4)-(5) / 63.11(b)(7)-(8)", active, ok, "steam/nonassisted: < 18.3 m/s; or < 122 m/s with H_T > 37.3 MJ/scm; or < V_max and < 122 m/s. Air-assisted: < V_max.")
    x = E["xh2"]
    h2on = f"AND({typ}=3,ISNUMBER({x}))"
    vmh = calc(sec, "Hydrogen option V_max", f'IF({h2on},MAX(({x}-6)*3.9,0),"")', "vel", "ms", "(X_H2 − 6.0) × 3.9", out="vmaxh2")
    din = hcalc(sec, "Tip diameter for the hydrogen option (in)", f"IF(ISNUMBER({E['d']}),{E['d']},SQRT(4*{A}/PI()))/0.0254")
    verdict(sec, "Hydrogen option, 60.18(c)(3)(i) / 63.11(b)(6)(i)", f"AND({h2on},{active})", f"AND({din}>=3,{x}>=8,{V}<37.2,{V}<({x}-6)*3.9)", "nonassisted only: tip ≥ 3 in, H2 ≥ 8.0 %, V < 37.2 m/s and < V_max")
    _ = vmh


# ---------------------------------------------------------------- Method 19
def s_ffactor(sec, E):
    K = {k: n(v) for k, v in M19.items()}
    btulb = n(fac("hv", "btulb"))
    sff = n(fac("ffac", "scfmmbtu"))
    C, Hh, S, N, O, W = E["C"], E["H"], E["S"], E["N"], E["O"], nz(E["W"])
    tot = calc(sec, "Analysis total (ash and other make up the rest)", f"{C}+{Hh}+{S}+{N}+{O}+{W}", "pct", "pct", out="total")
    sec.chk(f"AND(ISNUMBER({tot}),{tot}>100.5)", "The analysis adds up to more than 100 %.")
    g = hcalc(sec, "GCV (Btu/lb)", f"{E['gcv']}/{btulb}")
    gw = hcalc(sec, "GCV for F_w (Btu/lb)", f"IF(ISNUMBER({E['gcvw']}),{E['gcvw']}/{btulb},{g})")
    nd = hcalc(sec, "3.64 %H + 1.53 %C + 0.57 %S + 0.14 %N − 0.46 %O", f"{K['hd']}*{Hh}+{K['c']}*{C}+{K['s']}*{S}+{K['n']}*{N}-{K['o']}*{O}")
    nw = hcalc(sec, "5.57 %H + 1.53 %C + 0.57 %S + 0.14 %N − 0.46 %O + 0.21 %H₂O", f"{K['hw']}*{Hh}+{K['c']}*{C}+{K['s']}*{S}+{K['n']}*{N}-{K['o']}*{O}+{K['w']}*{W}")
    calc(sec, "Dry F factor, F_d", f"1E6*{nd}/{g}*{sff}", "ffac", "scfmmbtu", "Eq. 19-13", out="fd", key=True)
    calc(sec, "Wet F factor, F_w", f"1E6*{nw}/{gw}*{sff}", "ffac", "scfmmbtu", "Eq. 19-14", out="fw", key=True)
    calc(sec, "Carbon F factor, F_c", f"1E6*{K['cc']}*{C}/{g}*{sff}", "ffac", "scfmmbtu", "Eq. 19-15", out="fc", key=True)


def s_rate(sec, E):
    lbscf = n(fac("conc", "lbscf"))
    eq, pol, d, b = E["eq"], E["pol"], E["dil"], nz(E["b"])
    sec.chk(f"ISNUMBER({E['ppm']})+ISNUMBER({E['cm']})<>1", "Enter the pollutant concentration either in ppm or as a mass concentration.")
    sec.chk(f"AND(ISNUMBER({E['ppm']}),{pol}=3,{bl(E['mw'])})", "Enter the molecular weight of the pollutant.")
    sec.chk(f"AND(OR({eq}=2,{eq}=3,{eq}=4,{eq}=5,{eq}=8,{eq}=9),{bl(E['b'])})", "This equation needs the moisture fraction B_ws or B_wa.")
    sec.chk(f"AND({eq}<=5,ISNUMBER({d}),{d}>=20.9)", "O₂ must be below 20.9 %.")
    sec.chk(f"AND({eq}>=6,ISNUMBER({d}),{d}<=0)", "CO₂ must be greater than zero.")
    C = calc(sec, "Pollutant concentration", f"IF(ISNUMBER({E['ppm']}),IF({pol}=3,{E['ppm']}*1E-6*{E['mw']}*1E-3/{n(VM)},{E['ppm']}*IF({pol}=1,1.66E-7,1.194E-7)*{lbscf}),{E['cm']})", "conc", "lbscf", "Table 19-1 (SO₂, NOx) or ppm × MW ÷ molar volume at 20 °C", out="c")
    k = calc(sec, "Diluent correction term", f"CHOOSE({eq},20.9/(20.9-{d}),20.9/(20.9*(1-{b})-{d}),20.9/(20.9*(1-{b})-{d}),20.9/((1-{b})*(20.9-{d})),20.9/(20.9-{d}/(1-{b})),100/{d},100/{d},100/((1-{b})*{d}),(1-{b})*100/{d})", note="Eq. 19-1 to 19-9", out="k")
    sec.chk(f"AND(ISNUMBER({k}),{k}<=0)", "The diluent term is zero or negative for these O₂ and moisture values.")
    calc(sec, "Emission rate, E", f"{C}*{E['F']}*{k}*1E12", "ef", "lbmmbtu", "E = C × F × diluent term", out="e", key=True)


def s_combo(sec, E):
    ks = (1, 2, 3)
    for k in ks:
        sec.chk(f"ISNUMBER({E[f'x{k}']})<>ISNUMBER({E[f'f{k}']})", f"Fuel {k} needs both its heat input share and its F factor.")
    cnt = "+".join(f"IF({isn(E[f'x{k}'], E[f'f{k}'])},1,0)" for k in ks)
    sec.chk(f"({cnt})<2", "Enter at least two fuels.")
    sx = hcalc(sec, "Sum of heat input shares (%)", "+".join(nz(E[f"x{k}"]) for k in ks))
    sec.chk(f"AND(({cnt})>=2,ABS({sx}-100)>0.5)", "The heat input shares must add to 100 %.")
    calc(sec, "Combined F factor", "+".join(f"{nz(E[f'x{k}'])}/100*{nz(E[f'f{k}'])}" for k in ks), "ffac", "scfmmbtu", "Σ Xₖ Fₖ (Eq. 19-16 to 19-18)", out="f", key=True)


def s_mass(sec, E):
    lbh = hcalc(sec, "lb/h", f"{E['e']}/{n(fac('ef', 'lbmmbtu'))}*{E['hi']}/{n(fac('power', 'mmbtuh'))}")
    calc(sec, "Mass emission rate", f"{lbh}*{n(fac('erate', 'lbh'))}", "erate", "lbh", "E × heat input", out="lbh", key=True)
    calc(sec, "Annual emissions at these hours", f'IF(ISNUMBER({E["hrs"]}),{lbh}*{E["hrs"]}/3600*{n(fac("erate", "lbyr"))},"")', "erate", "tpy", "lb/h × hours ÷ 2,000", out="tpy", key=True)


SECTIONS = {
    "bact-cost-effectiveness/annual-cost": s_annual,
    "bact-cost-effectiveness/average": s_average,
    "bact-cost-effectiveness/incremental": s_incremental,
    "flare-60-18-check/net-heating-value": s_nhv,
    "flare-60-18-check/exit-velocity": s_velocity,
    "method-19-f-factor/f-factor": s_ffactor,
    "method-19-f-factor/emission-rate": s_rate,
    "method-19-f-factor/fuel-mix": s_combo,
    "method-19-f-factor/mass-rate": s_mass,
}


def build_section(sec, host):
    global H
    H = host
    SECTIONS[f"{sec.slug}/{sec.sec['id']}"](sec, sec.E)


def BAD(val, D):
    """Impossible inputs, each from the worked example with some values changed; the input check must name them."""
    def ex(slug, sid, over, want):
        u = next(x for x in D["utilities"] if x["slug"] == slug)
        s = next(x for x in u["sections"] if x["id"] == sid)
        vals = dict(s["example"]["values"])
        for k, v in over.items():
            vals[k] = None if v is None else val(next(i for i in s["inputs"] if i["id"] == k)["family"], v[1], v[0])
        return (slug, sid, vals, want)
    return [
        ex("bact-cost-effectiveness", "annual-cost", {"i": (60, "pct")}, "between"),
        ex("bact-cost-effectiveness", "average", {"ctrl": (20, "tpy")}, "not both"),
        ex("bact-cost-effectiveness", "average", {"ce": None, "ctrl": (300, "tpy")}, "higher than the baseline"),
        ex("bact-cost-effectiveness", "incremental", {"e1": (300, "tpy")}, "higher than the baseline"),
        ex("bact-cost-effectiveness", "incremental", {"e1": None}, "needs both"),
        ex("flare-60-18-check", "net-heating-value", {"c1": (95, "pct")}, "more than 100"),
        ex("flare-60-18-check", "net-heating-value", {"ox1": (2, "pct")}, "needs both"),
        ex("flare-60-18-check", "exit-velocity", {"d": None}, "diameter or its unobstructed area"),
        ex("method-19-f-factor", "f-factor", {"C": (95, "pct")}, "more than 100"),
        ex("method-19-f-factor", "emission-rate", {"eq": (3, "n")}, "moisture fraction"),
        ex("method-19-f-factor", "emission-rate", {"dil": (21, "pct")}, "below 20.9"),
        ex("method-19-f-factor", "emission-rate", {"cm": (0.01, "grscf")}, "either in ppm"),
        ex("method-19-f-factor", "fuel-mix", {"x1": (60, "pct")}, "add to 100"),
    ]
