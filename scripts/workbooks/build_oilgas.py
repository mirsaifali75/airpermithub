"""
Excel formulas for the oil and gas calculators (src/lib/utilities/oilgas),
used by build_utilities.py when the spec's collection is "oil-gas".

Each section mirrors its compute() in TypeScript step for step, with the same
fixed iteration counts (DAK Newton 20 steps, Colebrook 8 steps, 6 average-
pressure passes, 12 rate passes, 40 nodal and 50 diameter bisection steps), so
the workbook and the website agree to rounding.

Iterations run along a row: cells from column H rightwards hold one step each,
and those columns are hidden. Column E of the row holds the step's result.
"""

import math

from openpyxl.utils import get_column_letter

PSI = 6.894757293168  # kPa per psi
FT = 0.3048
IN = 0.0254
LB = 0.45359237
GAL = 3.785411784e-3
BBL = 42 * GAL
LBFT3 = LB / FT**3
R = 8.314462618
G = 9.80665
MAIR_G = 28.9647
PSC = 101.325 / PSI  # 14.696 psia
TSC_R = 519.67
RHO_W60 = 999.016
RHO_AIR_SC = 101325 * (MAIR_G / 1000) / (R * (TSC_R / 1.8))
MD_M2 = 9.869233e-16
C_RADIAL = 1 / ((2 * math.pi * MD_M2 * 0.3048 * 6894.757293168) / 1e-3 / (BBL / 86400))
ROD_K = (math.pi / 4) * 1440 * IN**3 / BBL
PSI_FT_PER_PPG = (LB / GAL) * G * FT / 1000 / PSI
DAK = [0.3265, -1.07, -0.5339, 0.01569, -0.05165, 0.5475, -0.7361, 0.1844, 0.1056, 0.6134, 0.721]
DAK_ITER, NPASS, CB_ITER, GASLINE_ITER, NODAL_ITER, DIAM_ITER = 20, 6, 8, 12, 40, 50
CHOKES = [(10.0, 0.546, 1.89), (9.56, 0.546, 1.93), (17.4, 0.5, 2.0), (3.82, 0.65, 1.88)]

COMPONENTS = [
    ("n2", 28.0135, 126.192, 3395.8, False, False), ("co2", 44.0098, 304.1282, 7377.3, False, False), ("h2s", 34.0809, 373.1, 9000.0, False, False),
    ("c1", 16.0428, 190.564, 4599.2, False, False), ("c2", 30.069, 305.322, 4872.2, False, False), ("c3", 44.0956, 369.89, 4251.2, True, False),
    ("ic4", 58.1222, 407.81, 3629.0, True, False), ("nc4", 58.1222, 425.125, 3796.0, True, False), ("ic5", 72.1488, 460.35, 3378.0, True, False),
    ("nc5", 72.1488, 469.7, 3367.5, True, False), ("nc6", 86.1754, 507.82, 3044.1, True, True), ("bz", 78.1118, 562.02, 4906.3, True, True),
    ("tol", 92.1384, 591.75, 4126.3, True, True), ("eb", 106.165, 617.12, 3622.4, True, True), ("xyl", 106.165, 616.89, 3534.6, True, True),
    ("c7", 100.202, 540.13, 2736.0, True, False),
]

H = None  # build_utilities module, set by build_section
MAXCOL = {}


def n(x):
    return H.num(x)


def fac(fam, uid):
    u = H.unit(fam, uid)
    return u["factor"], u.get("offset", 0) or 0


def frm(fam, uid, si):
    """SI expression -> expression in unit uid."""
    f, o = fac(fam, uid)
    s = f"({si})/{n(f)}"
    return f"({s}-{n(o)})" if o else f"({s})"


def tosi(fam, uid, x):
    f, o = fac(fam, uid)
    return f"((({x})+{n(o)})*{n(f)})" if o else f"(({x})*{n(f)})"


def bl(x):
    return f'{x}=""'


def nz(x, d=0):
    return f'IF({x}="",{d},{x})'


def isn(*xs):
    return "AND(" + ",".join(f"ISNUMBER({x})" for x in xs) + ")" if len(xs) > 1 else f"ISNUMBER({xs[0]})"


class W:
    """Cells along the current row, from column H; each call returns the absolute address of a new cell."""

    def __init__(self, sec):
        self.sec, self.r, self.c = sec, sec.r, 8

    def __call__(self, f):
        self.sec.ws.cell(row=self.r, column=self.c, value=f"={f}")
        ref = f"${get_column_letter(self.c)}${self.r}"
        MAXCOL[self.sec.ws.title] = max(MAXCOL.get(self.sec.ws.title, 0), self.c)
        self.c += 1
        return ref


def calc(sec, *a, **k):
    return sec.calc(*a, **k)


def hcalc(sec, label, si, note="", family="ratio", uid=None):
    return sec.calc(label, si, family, uid, note, helper=True)


# ---------------------------------------------------------------- shared correlations
def dak(w, T, P):
    A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11 = (n(a) for a in DAK)
    C1 = w(f"{A1}+{A2}/{T}+{A3}/{T}^3+{A4}/{T}^4+{A5}/{T}^5")
    C2 = w(f"{A6}+{A7}/{T}+{A8}/{T}^2")
    C3 = w(f"{A9}*({A7}/{T}+{A8}/{T}^2)")
    r = w(f"0.27*{P}/{T}")
    for _ in range(DAK_ITER):
        F = f"(1+{C1}*{r}+{C2}*{r}^2-{C3}*{r}^5+{A10}*(1+{A11}*{r}^2)*({r}^2/{T}^3)*EXP(-{A11}*{r}^2)-0.27*{P}/({r}*{T}))"
        dF = f"({C1}+2*{C2}*{r}-5*{C3}*{r}^4+(2*{A10}*{r}/{T}^3)*(1+{A11}*{r}^2-{A11}^2*{r}^4)*EXP(-{A11}*{r}^2)+0.27*{P}/({r}^2*{T}))"
        nx = w(f"{r}-{F}/{dF}")
        r = w(f"IF(AND(ISNUMBER({nx}),{nx}>0),{nx},{r})")
    return w(f"0.27*{P}/({r}*{T})")


def lge(w, TR, rho_gcc, Mg):
    K = w(f"(9.4+0.02*{Mg})*{TR}^1.5/(209+19*{Mg}+{TR})")
    X = w(f"3.5+986/{TR}+0.01*{Mg}")
    Y = w(f"2.4-0.2*{X}")
    return w(f"0.0001*{K}*EXP({X}*{rho_gcc}^{Y})")


def gas_state(w, p_psia, TR, pc, Mg):
    """pc = (Tpc °R, Ppc psia). Returns z, rho (kg/m³), mu (cP), Tpr, Ppr."""
    Tpr = w(f"{TR}/{pc[0]}")
    Ppr = w(f"{p_psia}/{pc[1]}")
    z = dak(w, Tpr, Ppr)
    rho = w(f"{p_psia}*{n(PSI)}*1000*({Mg}/1000)/({z}*{n(R)}*({TR}/1.8))")
    mu = lge(w, TR, f"({rho}/1000)", Mg)
    return {"z": z, "rho": rho, "mu": mu, "Tpr": Tpr, "Ppr": Ppr}


def colebrook(w, Re, rr):
    f = w(f"0.25/LOG10({rr}/3.7+5.74/{Re}^0.9)^2")
    for _ in range(CB_ITER):
        f = w(f"(-2*LOG10({rr}/3.7+2.51/({Re}*SQRT({f}))))^(-2)")
    return w(f"IF({Re}<2300,64/{Re},{f})")


def pseudo(sec, gamma, co2=None, h2s=None):
    """Sutton pseudo-criticals with the Wichert-Aziz correction; helper rows. Returns (Tpc °R, Ppc psia)."""
    g = gamma
    T0 = hcalc(sec, "Sutton Tpc (°R)", f"169.2+349.5*{g}-74*{g}^2", "169.2 + 349.5γg − 74.0γg²")
    P0 = hcalc(sec, "Sutton Ppc (psia)", f"756.8-131.07*{g}-3.6*{g}^2", "756.8 − 131.07γg − 3.6γg²")
    if co2 is None and h2s is None:
        return T0, P0
    A = f"({nz(co2)}+{nz(h2s)})/100"
    B = f"{nz(h2s)}/100"
    eps = hcalc(sec, "Wichert-Aziz ε (°R)", f"120*(({A})^0.9-({A})^1.6)+15*(({B})^0.5-({B})^4)", "120(A^0.9 − A^1.6) + 15(B^0.5 − B^4)")
    T1 = hcalc(sec, "Corrected Tpc (°R)", f"{T0}-{eps}")
    P1 = hcalc(sec, "Corrected Ppc (psia)", f"{P0}*{T1}/({T0}+({B})*(1-({B}))*{eps})")
    return T1, P1


def gas_column(w, pTop, tTop, tBot, Hh, L, D, eps, nmol, pc, gamma):
    """Average T and Z gas column (core.ts gasColumn). pTop kPa, temperatures °C, lengths m, nmol mol/s."""
    M = w(f"{gamma}*{n(MAIR_G)}/1000")
    Mg = w(f"{gamma}*{n(MAIR_G)}")
    Tk = w(f"({tTop}+{tBot})/2+273.15")
    A = w(f"PI()*{D}^2/4")
    md = w(f"{nmol}*{M}")
    pT = w(f"{pTop}*1000")
    pB = pT
    out = {}
    for _ in range(NPASS):
        pbar = w(f"({pT}+{pB})/2")
        st = gas_state(w, f"({pbar}/1000/{n(PSI)})", f"({Tk}*1.8)", pc, Mg)
        s = w(f"2*{M}*{n(G)}/({st['z']}*{n(R)}*{Tk})*{Hh}")
        Re = w(f"IF({md}>0,4*{md}/(PI()*{D}*({st['mu']}/1000)),0)")
        f = colebrook(w, Re, f"({eps}/{D})")
        b = w(f"IF({md}>0,{f}*{md}^2*{st['z']}*{n(R)}*{Tk}/(2*{D}*{A}^2*{M}),0)")
        phi = w(f"IF(ABS({s})>1E-12,(EXP({s})-1)/{s},1)")
        pB = w(f"SQRT({pT}^2*EXP({s})+2*{b}*{L}*{phi})")
        out = {"z": st["z"], "mu": st["mu"], "s": s, "f": f, "Re": Re}
    out.update({"pB": w(f"{pB}/1000"), "A": A, "Tk": Tk})
    return out


def zcheck(sec, z, *need):
    sec.chk(f"AND({isn(*need)},NOT(AND(ISNUMBER({z}),{z}>0.05,{z}<3)))", "The Z-factor equation has no solution at these conditions. Check the pressure, temperature, and gravity.")


# ---------------------------------------------------------------- sections
def build_section(sec, mod):
    global H
    H = mod
    key = f"{sec.slug}/{sec.sec['id']}"
    fn = SECTIONS.get(key)
    if not fn:
        raise SystemExit(f"No workbook formulas for {key}")
    fn(sec, sec.E)


def s_composition(sec, E):
    ids = [c[0] for c in COMPONENTS]
    tot = hcalc(sec, "Total of the analysis, mole %", "+".join(nz(E[i]) for i in ids))
    sec.chk(f"AND({tot}>0,OR({tot}<90,{tot}>110))", "The components should add up to about 100 %. Check the analysis.")
    sec.chk(f"{tot}<=0", "Enter the mole % of at least one component.")
    x = {i: f"({nz(E[i])}/{tot})" for i in ids}
    M = calc(sec, "Molecular weight, g/mol", "+".join(f"{x[c[0]]}*{n(c[1])}" for c in COMPONENTS), note="M = Σ yᵢMᵢ (normalized)", out="M", key=True)
    calc(sec, "Specific gravity (air = 1)", f"{M}/{n(MAIR_G)}", note="γg = M ÷ 28.9647", out="gamma", key=True)
    wt = lambda flt: "(" + "+".join(f"{x[c[0]]}*{n(c[1])}" for c in COMPONENTS if flt(c)) + f")/{M}*100"
    calc(sec, "VOC, weight %", wt(lambda c: c[4]), "pct", "pct", "propane and heavier", out="voc", key=True)
    calc(sec, "HAP (hexane + BTEX), weight %", wt(lambda c: c[5]), "pct", "pct", "n-hexane, benzene, toluene, ethylbenzene, xylenes", out="hap", key=True)
    calc(sec, "N₂ + CO₂ + H₂S, weight %", wt(lambda c: c[0] in ("n2", "co2", "h2s")), "pct", "pct", out="inert")
    T0 = hcalc(sec, "Kay's rule Tpc (°R)", "(" + "+".join(f"{x[c[0]]}*{n(c[2])}" for c in COMPONENTS) + ")*1.8", "Σ yᵢTcᵢ")
    P0 = hcalc(sec, "Kay's rule Ppc (psia)", "(" + "+".join(f"{x[c[0]]}*{n(c[3])}" for c in COMPONENTS) + f")/{n(PSI)}", "Σ yᵢPcᵢ")
    A, B = f"({x['co2']}+{x['h2s']})", x["h2s"]
    eps = hcalc(sec, "Wichert-Aziz ε (°R)", f"120*({A}^0.9-{A}^1.6)+15*({B}^0.5-{B}^4)")
    Tpc = hcalc(sec, "Corrected Tpc (°R)", f"{T0}-{eps}")
    Ppc = hcalc(sec, "Corrected Ppc (psia)", f"{P0}*{Tpc}/({T0}+{B}*(1-{B})*{eps})")
    calc(sec, "Pseudo-critical temperature (corrected)", f"{Tpc}/1.8-273.15", "temp", "r", out="tpc")
    calc(sec, "Pseudo-critical pressure (corrected)", f"{Ppc}*{n(PSI)}", "pabs", "psia", out="ppc")
    calc(sec, "Density at 60 °F and 14.696 psia", f"101325*({M}/1000)/({n(R)}*{n(TSC_R / 1.8)})", "rho", "lbft3", out="rhosc")
    w = W(sec)
    st = gas_state(w, f"({E['p']}/{n(PSI)})", f"(({E['t']}+273.15)*1.8)", (Tpc, Ppc), M)
    z = calc(sec, "Z-factor at p and T", f'IF(OR({bl(E["p"])},{bl(E["t"])}),"",{st["z"]})', note="Dranchuk & Abou-Kassem, Newton's method (steps in hidden columns)", out="z", key=True)
    calc(sec, "Gas density at p and T", f'IF({bl(z)},"",{E["p"]}*1000*({M}/1000)/({z}*{n(R)}*({E["t"]}+273.15)))', "rho", "lbft3", "ρ = pM ÷ (ZRT)", out="rho")
    zcheck(sec, st["z"], E["p"], E["t"], M)


def s_zfactor(sec, E):
    Tin = f"(({E['tpc']}+273.15)*1.8)"
    Pin = f"({E['ppc']}/{n(PSI)})"
    Ts, Ps = pseudo(sec, E["gamma"], E["co2"], E["h2s"])
    use = f"AND(ISNUMBER({E['tpc']}),ISNUMBER({E['ppc']}))"
    Tpc = hcalc(sec, "Pseudo-critical temperature used (°R)", f"IF({use},{Tin},{Ts})", "entered, or Sutton + Wichert-Aziz")
    Ppc = hcalc(sec, "Pseudo-critical pressure used (psia)", f"IF({use},{Pin},{Ps})")
    Mg = calc(sec, "Molecular weight, g/mol", f"{E['gamma']}*{n(MAIR_G)}", out="M")
    TR = f"(({E['t']}+273.15)*1.8)"
    p = f"({E['p']}/{n(PSI)})"
    w = W(sec)
    st = gas_state(w, p, TR, (Tpc, Ppc), Mg)
    z = calc(sec, "Z-factor", st["z"], note="Dranchuk & Abou-Kassem (Newton steps in hidden columns)", out="z", key=True)
    zcheck(sec, st["z"], E["p"], E["t"], E["gamma"])
    calc(sec, "Tpr", st["Tpr"], out="tpr")
    calc(sec, "Ppr", st["Ppr"], out="ppr")
    rho = calc(sec, "Gas density", f"{E['p']}*1000*({Mg}/1000)/({z}*{n(R)}*({E['t']}+273.15))", "rho", "lbft3", "ρ = pM ÷ (ZRT)", out="rho", key=True)
    Bg = calc(sec, "Bg, reservoir ft³ per scf (= m³/m³ at 60 °F)", f"({n(PSC)}/{n(TSC_R)})*{z}*{TR}/{p}", note="Bg = (p_sc ÷ T_sc) Z T ÷ p", out="bg", key=True)
    calc(sec, "Bg, reservoir bbl per Mscf", f"{Bg}*1000/5.614583", out="bgbbl")
    calc(sec, "Expansion factor 1/Bg, scf per ft³", f"1/{Bg}", out="e")
    w = W(sec)
    mu = lge(w, TR, f"({rho}/1000)", Mg)
    calc(sec, "Gas viscosity", f"{mu}/1000", "visc", "cp", "Lee-Gonzalez-Eakin", out="mu", key=True)


def s_gravity(sec, E):
    sec.chk(f"AND({bl(E['api'])},{bl(E['sg'])})", "Enter API gravity or specific gravity.")
    api = calc(sec, "API gravity", f"IF({bl(E['api'])},141.5/{E['sg']}-131.5,{E['api']})", note="°API = 141.5 ÷ γo − 131.5", out="api", key=True)
    sg = calc(sec, "Specific gravity (60/60 °F)", f"IF({bl(E['sg'])},141.5/({E['api']}+131.5),{E['sg']})", note="γo = 141.5 ÷ (°API + 131.5)", out="sg", key=True)
    rho = calc(sec, "Density at 60 °F", f"{sg}*{n(RHO_W60)}", "rho", "lbft3", "ρo = γo × 999.016 kg/m³", out="rho", key=True)
    calc(sec, "Static gradient of dead oil", f"{rho}*{n(G)}/1000", "grad", "psift", "ρo g", out="grad", key=True)
    calc(sec, "Mass per barrel, lb/bbl", f"{rho}*{n(BBL)}/{n(LB)}", out="lbbbl")
    _ = api


def standing_pb(Rs, gg, api, TF):
    return f"18.2*(({Rs}/{gg})^0.83*10^(0.00091*{TF}-0.0125*{api})-1.4)"


def standing_rs(p, gg, api, TF):
    return f"{gg}*(({p}/18.2+1.4)*10^(0.0125*{api}-0.00091*{TF}))^1.2048"


def standing_bo(Rs, gg, go, TF):
    return f"0.9759+0.00012*({Rs}*SQRT({gg}/{go})+1.25*{TF})^1.2"


def s_bubble(sec, E):
    gf = fac("gor", "scfbbl")[0]
    api, gg = E["api"], E["gg"]
    TF = hcalc(sec, "Temperature (°F)", f"{E['t']}*1.8+32")
    go = hcalc(sec, "Oil specific gravity γo", f"141.5/({api}+131.5)")
    sec.chk(f"AND({bl(E['rsb'])},{bl(E['pb'])})", "Enter the solution GOR at the bubble point or the bubble-point pressure.")
    rsbIn = f"({E['rsb']}/{n(gf)})"
    pbIn = f"({E['pb']}/{n(PSI)})"
    pb = hcalc(sec, "Bubble-point pressure (psia)", f"IF({bl(E['pb'])},{standing_pb(rsbIn, gg, api, TF)},{pbIn})", "Standing, or as entered")
    Rsb = hcalc(sec, "Solution GOR at pb (scf/STB)", f"IF({bl(E['pb'])},{rsbIn},{standing_rs(pb, gg, api, TF)})", "as entered, or Standing's inverse")
    sec.chk(f"AND({bl(E['pb'])},ISNUMBER({pb}),{pb}<=14.696)", "This GOR is too low to give a bubble point above atmospheric pressure.")
    Bob = calc(sec, "Oil FVF at the bubble point, bbl/STB", standing_bo(Rsb, gg, go, TF), note="Standing", out="bob", key=True)
    rhoOf = lambda Rs, Bo: f"({go}*{n(RHO_W60)}+{Rs}*{n(gf)}*{gg}*{n(RHO_AIR_SC)})/{Bo}"
    calc(sec, "Bubble-point pressure", f"{pb}*{n(PSI)}", "pabs", "psia", out="pb", key=True)
    calc(sec, "Solution GOR at the bubble point", f"{Rsb}*{n(gf)}", "gor", "scfbbl", out="rsb", key=True)
    calc(sec, "Oil density at the bubble point", rhoOf(Rsb, Bob), "rho", "lbft3", "ρo = (γo ρw + Rs γg ρair) ÷ Bo", out="rhob")
    p = hcalc(sec, "Pressure of interest (psia)", f'IF({bl(E["p"])},"",{E["p"]}/{n(PSI)})')
    below = f"AND(ISNUMBER({p}),{p}<={pb})"
    above = f"AND(ISNUMBER({p}),{p}>{pb},ISNUMBER({E['co']}))"
    Rs = hcalc(sec, "Rs at p (scf/STB)", f'IF({below},{standing_rs(p, gg, api, TF)},IF({above},{Rsb},""))')
    Bo = hcalc(sec, "Bo at p", f'IF({below},{standing_bo(Rs, gg, go, TF)},IF({above},{Bob}*EXP({E["co"]}*{n(PSI)}*({pb}-{p})),""))', "below pb: Standing; above: Bob exp(co(pb − p))")
    calc(sec, "Solution GOR at p", f"{Rs}*{n(gf)}", "gor", "scfbbl", out="rs", key=True)
    calc(sec, "Oil FVF at p, bbl/STB", Bo, out="bo", key=True)
    calc(sec, "Oil density at p", rhoOf(Rs, Bo), "rho", "lbft3", out="rho")
    calc(sec, "Gas released from solution (Rsb − Rs)", f'IF({below},({Rsb}-{Rs})*{n(gf)},"")', "gor", "scfbbl", out="free")


def s_oilvisc(sec, E):
    gf = fac("gor", "scfbbl")[0]
    TF = hcalc(sec, "Temperature (°F)", f"{E['t']}*1.8+32")
    sec.chk(f"AND(ISNUMBER({TF}),{TF}<=0)", "The dead-oil correlation needs a temperature above 0 °F.")
    Rs = hcalc(sec, "Rs (scf/STB)", f"{E['rs']}/{n(gf)}")
    y = hcalc(sec, "y = 10^(3.0324 − 0.02023°API)", f"10^(3.0324-0.02023*{E['api']})")
    x = hcalc(sec, "x = y T^−1.163", f"{y}*{TF}^(-1.163)")
    mod = calc(sec, "Dead-oil viscosity", f"(10^{x}-1)/1000", "visc", "cp", "Beggs-Robinson: 10^x − 1", out="mod", key=True)
    A = hcalc(sec, "A = 10.715 (Rs + 100)^−0.515", f"10.715*({Rs}+100)^(-0.515)")
    B = hcalc(sec, "B = 5.44 (Rs + 150)^−0.338", f"5.44*({Rs}+150)^(-0.338)")
    mob = calc(sec, "Live-oil viscosity at Rs (saturated)", f"{A}*({mod}*1000)^{B}/1000", "visc", "cp", "A μod^B", out="mob", key=True)
    p, pb = f"({E['p']}/{n(PSI)})", f"({E['pb']}/{n(PSI)})"
    sec.chk(f"AND(ISNUMBER({E['p']}),{bl(E['pb'])})", "Enter the bubble-point pressure to get the viscosity above it.")
    m = hcalc(sec, "Vasquez-Beggs m", f"2.6*{p}^1.187*EXP(-11.513-0.0000898*{p})")
    calc(sec, "Oil viscosity at p (above pb)", f'IF(AND(ISNUMBER({E["p"]}),ISNUMBER({E["pb"]}),{E["p"]}>{E["pb"]}),{mob}*({p}/{pb})^{m},"")', "visc", "cp", "μob (p ÷ pb)^m", out="mo", key=True)


def s_darcy(sec, E):
    bpd = fac("vflow", "bpd")[0]
    blanks = f"({bl(E['q'])})+({bl(E['k'])})+({bl(E['s'])})+({bl(E['pwf'])})"
    sec.chk(f"{blanks}<>1", "Leave exactly one of oil rate, permeability, skin, or flowing pressure blank.")
    cst = hcalc(sec, "Shape constant", f"IF({E['mode']}=2,0,-0.75)", "−0.75 pseudo-steady, 0 steady")
    lnr = hcalc(sec, "ln(re ÷ rw)", f"LN({E['re']}/{E['rw']})")
    sec.chk(f"AND({isn(E['re'], E['rw'])},{E['re']}<={E['rw']})", "The drainage radius must be larger than the wellbore radius.")
    h = hcalc(sec, "h (ft)", f"{E['h']}/{n(FT)}")
    mu = hcalc(sec, "μo (cP)", f"{E['mu']}*1000")
    B, pr = E["bo"], hcalc(sec, "p̄ (psia)", f"{E['pr']}/{n(PSI)}")
    C = n(C_RADIAL)
    qi = f"({E['q']}/{n(bpd)})"
    pwfi = f"({E['pwf']}/{n(PSI)})"
    k, s = E["k"], E["s"]
    q = hcalc(sec, "Oil rate (bbl/d)", f"IF({bl(E['q'])},{k}*{h}*({pr}-{pwfi})/({C}*{B}*{mu}*({lnr}+{cst}+{s})),{qi})", f"q = kh(p̄ − pwf) ÷ ({C_RADIAL:.4f} Bo μ (ln(re/rw) + c + s))")
    kk = hcalc(sec, "Permeability (mD)", f"IF({bl(k)},{q}*{C}*{B}*{mu}*({lnr}+{cst}+{s})/({h}*({pr}-{pwfi})),{k})")
    ss = hcalc(sec, "Skin", f"IF({bl(s)},{kk}*{h}*({pr}-{pwfi})/({q}*{C}*{B}*{mu})-{lnr}-{cst},{s})")
    pwf = hcalc(sec, "pwf (psia)", f"IF({bl(E['pwf'])},{pr}-{q}*{C}*{B}*{mu}*({lnr}+{cst}+{ss})/({kk}*{h}),{pwfi})")
    sec.chk(f"AND({bl(E['q'])},ISNUMBER({lnr}),ISNUMBER({s}),{lnr}+{cst}+{s}<=0)", "ln(re/rw) − 0.75 + s must be positive. Check the skin and radii.")
    sec.chk(f"AND({bl(E['pwf'])},ISNUMBER({pwf}),{pwf}<=0)", "This rate needs more drawdown than the reservoir pressure allows.")
    sec.chk(f"AND(ISNUMBER({pwf}),ISNUMBER({pr}),{pwf}>={pr})", "Flowing pressure must be below reservoir pressure.")
    calc(sec, "Oil rate", f"{q}*{n(bpd)}", "vflow", "bpd", out="q", key=True)
    calc(sec, "Permeability", kk, "perm", "md", out="k")
    calc(sec, "Skin factor", ss, out="s")
    calc(sec, "Flowing bottomhole pressure", f"{pwf}*{n(PSI)}", "pabs", "psia", out="pwf")
    dp = hcalc(sec, "Drawdown (psi)", f"{pr}-{pwf}")
    calc(sec, "Productivity index", tosi("pindex", "bpdpsi", f"{q}/{dp}"), "pindex", "bpdpsi", "J = q ÷ (p̄ − pwf)", out="J", key=True)
    dps = calc(sec, "Pressure drop across the skin", f"{q}*{C}*{B}*{mu}*{ss}/({kk}*{h})*{n(PSI)}", "dp", "psi", "141.2 q Bo μ s ÷ (kh)", out="dps")
    calc(sec, "Flow efficiency (ideal drawdown ÷ actual)", f"({dp}-{dps}/{n(PSI)})/{dp}*100", "pct", "pct", out="fe")
    calc(sec, "Rate at the same drawdown with zero skin", f"{kk}*{h}/({C}*{B}*{mu}*({lnr}+{cst}))*{dp}*{n(bpd)}", "vflow", "bpd", out="q0")


def s_vogel(sec, E):
    bpd = fac("vflow", "bpd")[0]
    pr = hcalc(sec, "p̄ (psia)", f"{E['pr']}/{n(PSI)}")
    qt = hcalc(sec, "Test rate (bbl/d)", f"{E['qt']}/{n(bpd)}")
    pt = hcalc(sec, "Test pwf (psia)", f"{E['pt']}/{n(PSI)}")
    sec.chk(f"AND({isn(pr, pt)},{pt}>={pr})", "Test flowing pressure must be below reservoir pressure.")
    pb = hcalc(sec, "Bubble point used (psia)", f"IF({bl(E['pb'])},{pr},IF({E['pb']}/{n(PSI)}>={pr},{pr},{E['pb']}/{n(PSI)}))", "p̄ when blank or above p̄")
    vog = lambda xx: f"(1-0.2*({xx})-0.8*({xx})^2)"
    sat = f"{pb}>={pr}"
    J = hcalc(sec, "J (bbl/d per psi)", f"IF({sat},1.8*({qt}/{vog(f'{pt}/{pr}')})/{pr},IF({pt}>={pb},{qt}/({pr}-{pt}),{qt}/({pr}-{pb}+({pb}/1.8)*{vog(f'{pt}/{pb}')})))")
    qb = hcalc(sec, "q_b (bbl/d)", f"IF({sat},0,{J}*({pr}-{pb}))")
    qv = hcalc(sec, "J pb ÷ 1.8 (bbl/d)", f"IF({sat},{qt}/{vog(f'{pt}/{pr}')},{J}*{pb}/1.8)")
    qmax = calc(sec, "Maximum rate (pwf = 0), AOF", f"({qb}+{qv})*{n(bpd)}", "vflow", "bpd", "q_b + J pb ÷ 1.8", out="qmax", key=True)
    calc(sec, "Productivity index above pb", f'IF({sat},"",{tosi("pindex", "bpdpsi", J)})', "pindex", "bpdpsi", out="J")
    calc(sec, "Rate at the bubble point", f'IF({sat},"",{qb}*{n(bpd)})', "vflow", "bpd", out="qb")
    qOf = lambda pw: f"IF({pw}>={pb},{J}*({pr}-{pw}),{qb}+{qv}*{vog(f'{pw}/{pb}')})"
    pw = f"({E['pwf']}/{n(PSI)})"
    calc(sec, "Rate at the planned flowing pressure", f'IF(AND(ISNUMBER({E["pwf"]}),{pw}<{pr}),({qOf(pw)})*{n(bpd)},"")', "vflow", "bpd", out="q", key=True)
    qq = f"({E['q']}/{n(bpd)})"
    pOf = f"IF({qq}<={qb},{pr}-{qq}/{J},(-0.2+SQRT(0.04+3.2*(1-({qq}-{qb})/{qv})))/1.6*{pb})"
    calc(sec, "Flowing pressure needed for the target rate", f'IF(AND(ISNUMBER({E["q"]}),{E["q"]}<{qmax}),({pOf})*{n(PSI)},"")', "pabs", "psia", out="pwfq", key=True)
    for fr in (0.75, 0.5, 0.25):
        pwx = f"({n(fr)}*{pr})"
        calc(sec, f"IPR point: rate at pwf = {int(fr * 100)} % of p̄", f"({qOf(pwx)})*{n(bpd)}", "vflow", "bpd", out=f"q{int(fr * 100)}")


def s_backpressure(sec, E):
    mf = fac("gasflow", "mscfd")[0]
    pr = hcalc(sec, "p̄ (psia)", f"{E['pr']}/{n(PSI)}")
    q1 = hcalc(sec, "q₁ (Mscf/d)", f"{E['q1']}/{n(mf)}")
    p1 = hcalc(sec, "pwf₁ (psia)", f"{E['p1']}/{n(PSI)}")
    d1 = hcalc(sec, "Δ₁ = p̄² − pwf₁²", f"{pr}^2-{p1}^2")
    sec.chk(f"AND(ISNUMBER({d1}),{d1}<=0)", "Test flowing pressure must be below reservoir pressure.")
    two = f"AND(ISNUMBER({E['q2']}),ISNUMBER({E['p2']}))"
    d2 = hcalc(sec, "Δ₂ = p̄² − pwf₂²", f'IF({two},{pr}^2-({E["p2"]}/{n(PSI)})^2,"")')
    sec.chk(f"AND(NOT({two}),{bl(E['n'])})", "Enter a second test point, or the exponent n.")
    sec.chk(f"AND({two},OR({d2}<=0,ABS({d2}-{d1})<1E-9*{d1}))", "Test 2 must have a different rate and a flowing pressure below reservoir pressure.")
    nn = calc(sec, "Deliverability exponent n", f"IF({two},LOG10(({E['q2']}/{n(mf)})/{q1})/LOG10({d2}/{d1}),{E['n']})", note="n = log(q₂/q₁) ÷ log(Δ₂/Δ₁)", out="n", key=True)
    sec.chk(f"AND({two},ISNUMBER({nn}),{nn}<=0)", "The two tests give a negative exponent: the higher rate must have the lower flowing pressure.")
    C = calc(sec, "Flow coefficient C, Mscf/d per psia^(2n)", f"{q1}/{d1}^{nn}", note="C = q₁ ÷ Δ₁ⁿ", out="C", key=True)
    calc(sec, "Absolute open flow (AOF)", f"{C}*({pr}^2-{n(PSC)}^2)^{nn}*{n(mf)}", "gasflow", "mscfd", "C (p̄² − 14.696²)ⁿ", out="aof", key=True)
    pw = f"({E['pwf']}/{n(PSI)})"
    calc(sec, "Rate at the flowing pressure", f'IF(AND(ISNUMBER({E["pwf"]}),{pw}<{pr}),{C}*({pr}^2-{pw}^2)^{nn}*{n(mf)},"")', "gasflow", "mscfd", out="q", key=True)


def well_checks(sec, E):
    sec.chk(f"AND(ISNUMBER({E['md']}),ISNUMBER({E['tvd']}),{E['md']}<{E['tvd']}-1E-6)", "Measured depth cannot be less than true vertical depth.")
    return f"IF({bl(E['md'])},{E['tvd']},{E['md']})"


def s_static(sec, E):
    L = well_checks(sec, E)
    pc = pseudo(sec, E["gamma"], E["co2"], E["h2s"])
    w = W(sec)
    col = gas_column(w, E["pt"], E["tt"], E["tb"], E["tvd"], L, "0.05", "0", "0", pc, E["gamma"])
    pb = calc(sec, "Static bottomhole pressure", col["pB"], "pabs", "psia", "p_wh e^(s/2), Z̄ by repeated passes (hidden columns)", out="pbh", key=True)
    zcheck(sec, col["z"], E["pt"], E["tt"], E["tb"], E["gamma"])
    calc(sec, "Average gas gradient", f"({pb}-{E['pt']})/{E['tvd']}", "grad", "psift", out="grad", key=True)
    calc(sec, "Average Z-factor", col["z"], out="z")


def s_flowing(sec, E):
    L = well_checks(sec, E)
    pc = pseudo(sec, E["gamma"], E["co2"], E["h2s"])
    Mg = hcalc(sec, "Molecular weight, g/mol", f"{E['gamma']}*{n(MAIR_G)}")
    w = W(sec)
    col = gas_column(w, E["pt"], E["tt"], E["tb"], E["tvd"], L, E["d"], E["eps"], E["q"], pc, E["gamma"])
    pb = calc(sec, "Flowing bottomhole pressure", col["pB"], "pabs", "psia", "p_bh² = p_wh² eˢ + 2bL(eˢ − 1)/s (passes in hidden columns)", out="pbh", key=True)
    zcheck(sec, col["z"], E["pt"], E["tt"], E["tb"], E["gamma"])
    w = W(sec)
    stat = gas_column(w, E["pt"], E["tt"], E["tb"], E["tvd"], L, E["d"], "0", "0", pc, E["gamma"])
    sp = hcalc(sec, "Static bottomhole pressure, same well (kPa)", stat["pB"])
    calc(sec, "Pressure added by friction", f"{pb}-{sp}", "dp", "psi", out="dpf", key=True)

    def vel(label, p, tc, out):
        w = W(sec)
        st = gas_state(w, f"({p}/{n(PSI)})", f"(({tc}+273.15)*1.8)", pc, Mg)
        calc(sec, label, f"{E['q']}*{st['z']}*{n(R)}*({tc}+273.15)/({p}*1000)/{col['A']}", "vel", "fts", out=out)

    vel("Gas velocity at the wellhead", E["pt"], E["tt"], "vwh")
    vel("Gas velocity at the bottom", pb, E["tb"], "vbh")
    calc(sec, "Average Z-factor", col["z"], out="z")
    calc(sec, "Reynolds number", col["Re"], out="re")
    calc(sec, "Darcy friction factor", col["f"], out="f")


def s_nodal(sec, E):
    mf = fac("gasflow", "mscfd")[0]
    L = well_checks(sec, E)
    sec.chk(f"AND(ISNUMBER({E['C']}),{E['C']}<=0)", "C must be greater than zero.")
    pc = pseudo(sec, E["gamma"], E["co2"], E["h2s"])
    pr = hcalc(sec, "p̄ (psia)", f"{E['pr']}/{n(PSI)}")
    C, nn = E["C"], E["n"]
    aof = hcalc(sec, "AOF (Mscf/d)", f"{C}*({pr}^2-{n(PSC)}^2)^{nn}", "C (p̄² − 14.696²)ⁿ")
    ipr = lambda q: f"SQRT(MAX({pr}^2-({q}/{C})^(1/{nn}),0))"

    def tub(w, q):
        return gas_column(w, E["pt"], E["tt"], E["tb"], E["tvd"], L, E["d"], E["eps"], f"({q}*{n(mf)})", pc, E["gamma"])

    w = W(sec)
    st0 = tub(w, "0")
    static = hcalc(sec, "Tubing pressure at zero rate (psia)", f"{st0['pB']}/{n(PSI)}")
    sec.chk(f"AND(ISNUMBER({static}),ISNUMBER({pr}),{static}>={pr})", "The gas column in the tubing alone needs more pressure than the reservoir has: the well cannot flow against this wellhead pressure.")
    lo, hi = "0", aof
    for k in range(NODAL_ITER):
        w = W(sec)
        mid = w(f"({lo}+{hi})/2")
        col = tub(w, mid)
        tp = w(f"{col['pB']}/{n(PSI)}")
        ip = w(ipr(mid))
        nlo = w(f"IF({ip}>{tp},{mid},{lo})")
        nhi = w(f"IF({ip}>{tp},{hi},{mid})")
        hcalc(sec, f"Bisection step {k + 1}: trial rate (Mscf/d)", mid, "reservoir pwf vs tubing pwf (hidden columns)")
        lo, hi = nlo, nhi
    q = hcalc(sec, "Operating rate (Mscf/d)", f"({lo}+{hi})/2")
    calc(sec, "Operating gas rate", f"{q}*{n(mf)}", "gasflow", "mscfd", "where reservoir and tubing give the same pwf", out="q", key=True)
    calc(sec, "Flowing bottomhole pressure at that rate", f"{ipr(q)}*{n(PSI)}", "pabs", "psia", out="pwf", key=True)
    calc(sec, "Absolute open flow (AOF)", f"{aof}*{n(mf)}", "gasflow", "mscfd", out="aof")
    calc(sec, "Operating rate as % of AOF", f"{q}/{aof}*100", "pct", "pct", out="pct")


def s_loading(sec, E):
    pc = pseudo(sec, E["gamma"], E["co2"], E["h2s"])
    Mg = hcalc(sec, "Molecular weight, g/mol", f"{E['gamma']}*{n(MAIR_G)}")
    w = W(sec)
    st = gas_state(w, f"({E['p']}/{n(PSI)})", f"(({E['t']}+273.15)*1.8)", pc, Mg)
    z = calc(sec, "Z-factor", st["z"], out="z")
    zcheck(sec, st["z"], E["p"], E["t"], E["gamma"])
    rg = calc(sec, "Gas density", st["rho"], "rho", "lbft3", out="rhog")
    rl = E["rhol"]
    sec.chk(f"AND(ISNUMBER({rl}),ISNUMBER({rg}),{rl}<={rg})", "The liquid must be denser than the gas.")
    v0 = hcalc(sec, "Droplet terminal velocity (m/s)", f"(4*{n(G)}*30*({E['sigma']}/1000)*({rl}-{rg})/(3*0.44*{rg}^2))^0.25", "[4 g We σ (ρL − ρg) ÷ (3 Cd ρg²)]^¼, We 30, Cd 0.44", "vel", "fts")
    vt = calc(sec, "Critical (minimum) gas velocity", f"{v0}*IF({E['adj']}=2,1,1.2)", "vel", "fts", "× 1.2 as published", out="vt", key=True)
    nm = calc(sec, "Critical (minimum) gas rate to unload liquids", f"{vt}*PI()*{E['d']}^2/4*{E['p']}*1000/({z}*{n(R)}*({E['t']}+273.15))", "gasflow", "mscfd", "v A p ÷ (Z R T)", out="qc", key=True)
    calc(sec, "Current rate as % of critical", f'IF({bl(E["q"])},"",{E["q"]}/{nm}*100)', "pct", "pct", out="ratio", key=True)


def s_gilbert(sec, E):
    sec.chk(f"({bl(E['pwh'])})+({bl(E['q'])})+({bl(E['S'])})<>1", "Leave exactly one of wellhead pressure, liquid rate, or choke size blank.")
    st = E["set"]
    a = hcalc(sec, "a", "CHOOSE({0},{1})".format(st, ",".join(n(c[0]) for c in CHOKES)))
    b = hcalc(sec, "b", "CHOOSE({0},{1})".format(st, ",".join(n(c[1]) for c in CHOKES)))
    c = hcalc(sec, "c", "CHOOSE({0},{1})".format(st, ",".join(n(c[2]) for c in CHOKES)))
    Rr = hcalc(sec, "R (scf/bbl)", frm("gor", "scfbbl", E["glr"]))
    Rb = hcalc(sec, "R^b", f"{Rr}^{b}")
    pIn, qIn, SIn = frm("pabs", "psig", E["pwh"]), frm("vflow", "bpd", E["q"]), frm("diam", "in64", E["S"])
    sec.chk(f"AND(ISNUMBER({E['pwh']}),{pIn}<=0)", "Wellhead pressure must be above 0 psig.")
    p = hcalc(sec, "p_wh (psig)", f"IF({bl(E['pwh'])},{a}*{Rb}*{qIn}/{SIn}^{c},{pIn})", "a R^b q ÷ S^c")
    q = hcalc(sec, "q (bbl/d)", f"IF({bl(E['q'])},{p}*{SIn}^{c}/({a}*{Rb}),{qIn})")
    S = hcalc(sec, "S (64ths)", f"IF({bl(E['S'])},({a}*{Rb}*{q}/{p})^(1/{c}),{SIn})")
    calc(sec, "Wellhead pressure", tosi("pabs", "psig", p), "pabs", "psig", out="pwh", key=True)
    calc(sec, "Liquid rate", tosi("vflow", "bpd", q), "vflow", "bpd", out="q", key=True)
    calc(sec, "Choke size", tosi("diam", "in64", S), "diam", "in64", out="S", key=True)
    calc(sec, "Next standard size up, 64ths", f"ROUNDUP({S}-1E-9,0)", out="Sr")
    calc(sec, "Gas rate through the choke", tosi("gasflow", "scfd", f"{q}*{Rr}"), "gasflow", "mscfd", out="gas")
    calc(sec, "Downstream ÷ upstream pressure (absolute)", f'IF({bl(E["pdn"])},"",{E["pdn"]}/{tosi("pabs", "psig", p)})', out="ratio")


def s_gaschoke(sec, E):
    sec.chk(f"({bl(E['d'])})+({bl(E['q'])})<>1", "Leave either the choke size or the gas rate blank.")
    sec.chk(f"AND({isn(E['p1'], E['p2'])},{E['p2']}>={E['p1']})", "Downstream pressure must be below upstream pressure.")
    k = E["k"]
    M = hcalc(sec, "M (kg/mol)", f"{E['gamma']}*{n(MAIR_G)}/1000")
    pc = pseudo(sec, E["gamma"])
    w = W(sec)
    st = gas_state(w, f"({E['p1']}/{n(PSI)})", f"(({E['t1']}+273.15)*1.8)", pc, f"({M}*1000)")
    Z = calc(sec, "Upstream Z-factor", f"IF({bl(E['z'])},{st['z']},{E['z']})", note="entered, or DAK (hidden columns)", out="z")
    sec.chk(f"AND({bl(E['z'])},{isn(E['p1'], E['t1'], E['gamma'])},NOT(AND(ISNUMBER({st['z']}),{st['z']}>0.05,{st['z']}<3)))", "The Z-factor equation has no solution here. Enter Z.")
    rc = calc(sec, "Critical pressure ratio", f"(2/({k}+1))^({k}/({k}-1))", note="(2 ÷ (k + 1))^(k/(k−1))", out="rc")
    r0 = hcalc(sec, "p₂ ÷ p₁", f"{E['p2']}/{E['p1']}")
    calc(sec, "Flow is critical (1 = yes, 0 = no)", f"IF({r0}<={rc},1,0)", out="crit", key=True)
    r = hcalc(sec, "Pressure ratio used", f"IF({r0}<={rc},{rc},{r0})")
    Gf = hcalc(sec, "Mass flux per unit p₁ (s/m)", f"SQRT(2*{k}/({k}-1)*({M}/({Z}*{n(R)}*({E['t1']}+273.15)))*({r}^(2/{k})-{r}^(({k}+1)/{k})))", "√[2k/(k−1) × M/(ZRT) × (r^(2/k) − r^((k+1)/k))]")
    p1 = f"({E['p1']}*1000)"
    md = hcalc(sec, "Mass rate (kg/s)", f"IF({bl(E['q'])},{E['cd']}*PI()*{E['d']}^2/4*{p1}*{Gf},{E['q']}*{M})", "Cd A p₁ G")
    calc(sec, "Gas rate", f"{md}/{M}", "gasflow", "mscfd", out="q", key=True)
    calc(sec, "Choke size", f"SQRT(4*({md}/({E['cd']}*{p1}*{Gf}))/PI())", "diam", "in64", out="d", key=True)
    calc(sec, "Highest downstream pressure that keeps flow critical", f"{E['p1']}*{rc}", "pabs", "psia", out="p2max")


def p_avg(a, b):
    return f"(2/3)*({a}+{b}-{a}*{b}/({a}+{b}))"


def s_gasline(sec, E):
    sec.chk(f"({bl(E['q'])})+({bl(E['p2'])})+({bl(E['d'])})<>1", "Leave exactly one of gas rate, outlet pressure, or pipe diameter blank.")
    mode = hcalc(sec, "Solving for (1 rate, 2 outlet pressure, 3 diameter)", f"IF({bl(E['q'])},1,IF({bl(E['p2'])},2,IF({bl(E['d'])},3,0)))")
    M = hcalc(sec, "M (kg/mol)", f"{E['gamma']}*{n(MAIR_G)}/1000")
    Mg = f"({M}*1000)"
    T = hcalc(sec, "T (K)", f"{E['t']}+273.15")
    TR = f"({T}*1.8)"
    L, dz, eps = E["l"], f"({nz(E['dz'])})", E["eps"]
    Ef = hcalc(sec, "Efficiency E", f"{nz(E['e'], 100)}/100")
    p1 = hcalc(sec, "p₁ (Pa)", f"{E['p1']}*1000")
    pc = pseudo(sec, E["gamma"])
    sOf = lambda z: f"(2*{M}*{n(G)}*{dz}/({z}*{n(R)}*{T}))"
    psiF = lambda s: f"IF(ABS({s})>1E-12,(1-EXP(-{s}))/{s},1)"
    bOf = lambda f, md, D, z: f"({f}*{md}^2*{z}*{n(R)}*{T}/(2*{D}*(PI()*{D}^2/4)^2*{M}*{Ef}^2))"
    ReOf = lambda md, D, mu: f"(4*{md}/(PI()*{D}*({mu}/1000)))"
    st = lambda w, pPa: gas_state(w, f"({pPa}/1000/{n(PSI)})", TR, pc, Mg)

    # Outlet pressure: repeated passes at the average pressure.
    w = W(sec)
    md = w(f"{E['q']}*{M}")
    p2 = p1
    for _ in range(NPASS):
        pb = w(p_avg(p1, p2))
        g = st(w, pb)
        s = w(sOf(g["z"]))
        Re = w(ReOf(md, E["d"], g["mu"]))
        f = colebrook(w, Re, f"({eps}/{E['d']})")
        sq = w(f"{p1}^2*EXP(-{s})-2*{bOf(f, md, E['d'], g['z'])}*{L}*{psiF(s)}")
        p2 = w(f"SQRT({sq})")
    A2 = {"p2": hcalc(sec, "Outlet pressure, rate and diameter known (kPa)", f"{p2}/1000", "p₂² = p₁²e⁻ˢ − 2bLψ(s), passes in hidden columns"), "z": g["z"], "mu": g["mu"], "Re": Re, "f": f, "s": s}
    sec.chk(f"AND({mode}=2,{isn(E['q'], E['p1'], E['d'], E['l'], E['t'], E['gamma'])},NOT(ISNUMBER({A2['p2']})))", "The pipe cannot carry this rate from this inlet pressure: the outlet pressure would fall to zero. Use a larger pipe or a lower rate.")

    # Rate or diameter: properties at the average of the known pressures.
    w = W(sec)
    p2k = f"({E['p2']}*1000)"
    pb = w(p_avg(p1, p2k))
    g = st(w, pb)
    s = w(sOf(g["z"]))
    Bv = w(f"({p1}^2*EXP(-{s})-{p2k}^2)/(2*{L}*{psiF(s)})")
    zk = hcalc(sec, "Z̄ at the average pressure (outlet pressure known)", g["z"])
    sec.chk(f"AND(OR({mode}=1,{mode}=3),{isn(E['p1'], E['p2'])},{E['p2']}>={E['p1']},{dz}<=0)", "Outlet pressure must be below inlet pressure for flow.")
    sec.chk(f"AND(OR({mode}=1,{mode}=3),ISNUMBER({Bv}),{Bv}<=0)", "The elevation gain alone uses up the pressure difference: no flow.")
    w = W(sec)
    D = E["d"]
    f = "0.02"
    for _ in range(GASLINE_ITER):
        mdq = w(f"SQRT({Bv}*2*{D}*(PI()*{D}^2/4)^2*{M}*{Ef}^2/({f}*{zk}*{n(R)}*{T}))")
        Req = w(ReOf(mdq, D, g["mu"]))
        f = colebrook(w, Req, f"({eps}/{D})")
    qq = hcalc(sec, "Gas rate, pressures known (mol/s)", f"{mdq}/{M}", "12 passes with Colebrook (hidden columns)")
    A1 = {"q": qq, "Re": Req, "f": f}
    lo, hi = f"LN(0.005)", f"LN(2)"
    mdd = f"({E['q']}*{M})"
    for k in range(DIAM_ITER):
        w = W(sec)
        Dm = w(f"EXP(({lo}+{hi})/2)")
        Re = w(ReOf(mdd, Dm, g["mu"]))
        fd = colebrook(w, Re, f"({eps}/{Dm})")
        big = w(f"{bOf(fd, mdd, Dm, zk)}>{Bv}")
        nlo = w(f"IF({big},({lo}+{hi})/2,{lo})")
        nhi = w(f"IF({big},{hi},({lo}+{hi})/2)")
        hcalc(sec, f"Diameter bisection step {k + 1} (m)", Dm)
        lo, hi = nlo, nhi
    w = W(sec)
    Dd = w(f"EXP(({lo}+{hi})/2)")
    Red = w(ReOf(mdd, Dd, g["mu"]))
    fdd = colebrook(w, Red, f"({eps}/{Dd})")
    Dd = hcalc(sec, "Diameter, rate and pressures known (m)", Dd)
    sec.chk(f"AND({mode}=3,ISNUMBER({Dd}),{Dd}>1.99)", "Even a 2 m pipe cannot carry this rate with this pressure drop.")
    pick = lambda a, b, c: f"CHOOSE({mode},{a},{b},{c})"
    q = calc(sec, "Gas rate", pick(qq, E["q"], E["q"]), "gasflow", "mmscfd", out="q", key=True)
    P2 = calc(sec, "Outlet pressure", pick(E["p2"], A2["p2"], E["p2"]), "pabs", "psia", out="p2", key=True)
    DD = calc(sec, "Pipe inside diameter", pick(E["d"], E["d"], Dd), "diam", "in", out="d", key=True)
    calc(sec, "Pressure drop", f"{E['p1']}-{P2}", "dp", "psi", out="dp", key=True)
    A = hcalc(sec, "Flow area (m²)", f"PI()*{DD}^2/4")
    for label, pp, out in (("Gas velocity at the inlet", p1, "v1"), ("Gas velocity at the outlet", f"({P2}*1000)", "v2")):
        w = W(sec)
        gv = st(w, pp)
        calc(sec, label, f"{q}*{gv['z']}*{n(R)}*{T}/{pp}/{A}", "vel", "fts", out=out, key=out == "v2")
    calc(sec, "Average Z-factor", pick(zk, A2["z"], zk), out="z")
    calc(sec, "Reynolds number", pick(A1["Re"], A2["Re"], Red), out="re")
    calc(sec, "Darcy friction factor", pick(A1["f"], A2["f"], fdd), out="f")


def s_liquidline(sec, E):
    D, rho = E["d"], E["rho"]
    A = hcalc(sec, "Flow area (m²)", f"PI()*{D}^2/4")
    v = calc(sec, "Velocity", f"{E['q']}/{A}", "vel", "fts", "v = q ÷ A", out="v", key=True)
    Re = calc(sec, "Reynolds number", f"{rho}*{v}*{D}/{E['mu']}", note="ρvD ÷ μ", out="re")
    sec.chk(f"AND(ISNUMBER({E['q']}),{E['q']}<=0)", "Enter a flow above zero.")
    w = W(sec)
    f = calc(sec, "Darcy friction factor", colebrook(w, Re, f"({E['eps']}/{D})"), note="Colebrook, 8 steps (hidden columns)", out="f")
    dpf = calc(sec, "Friction pressure drop", f"{f}*({E['l']}/{D})*{rho}*{v}^2/2/1000", "dp", "psi", "f (L/D) ρv²/2", out="dpf")
    dpz = calc(sec, "Elevation pressure change", f"{rho}*{n(G)}*{nz(E['dz'])}/1000", "dp", "psi", "ρgΔz", out="dpz")
    calc(sec, "Total pressure drop", f"{dpf}+{dpz}", "dp", "psi", out="dp", key=True)
    calc(sec, "Friction loss per mile, psi", f'IF({E["l"]}>0,{dpf}/{n(PSI)}/({E["l"]}/1609.344),"")', out="dpmi")
    calc(sec, "Outlet pressure", f'IF({bl(E["p1"])},"",{E["p1"]}-{dpf}-{dpz})', "pabs", "psig", out="p2", key=True)


def s_erosional(sec, E):
    pc = pseudo(sec, E["gamma"])
    M = hcalc(sec, "M (kg/mol)", f"{E['gamma']}*{n(MAIR_G)}/1000")
    w = W(sec)
    st = gas_state(w, f"({E['p']}/{n(PSI)})", f"(({E['t']}+273.15)*1.8)", pc, f"({M}*1000)")
    z = calc(sec, "Gas Z-factor", st["z"], out="z")
    zcheck(sec, st["z"], E["p"], E["t"], E["gamma"])
    Vo, Vw = f"({nz(E['qo'])})", f"({nz(E['qw'])})"
    Vg = hcalc(sec, "Gas volume rate at p, T (m³/s)", f"{E['qg']}*{z}*{n(R)}*({E['t']}+273.15)/({E['p']}*1000)")
    Vt = hcalc(sec, "Total volume rate (m³/s)", f"{Vo}+{Vw}+{Vg}")
    rhom = calc(sec, "Mixture density (no slip)", f"({Vo}*{E['so']}+{Vw}*{nz(E['sw'], n(1000 * 0.999016))}+{E['qg']}*{M})/{Vt}", "rho", "lbft3", "total mass ÷ total volume", out="rhom")
    Ve = calc(sec, "Erosional velocity", f"{E['C']}/SQRT({rhom}/{n(LBFT3)})*{n(FT)}", "vel", "fts", "V_e = C ÷ √ρm (ft/s, lb/ft³)", out="ve", key=True)
    vm = calc(sec, "Mixture velocity in this pipe", f"{Vt}/(PI()*{E['d']}^2/4)", "vel", "fts", out="vm", key=True)
    calc(sec, "Mixture velocity as % of erosional", f"{vm}/{Ve}*100", "pct", "pct", out="pct", key=True)
    calc(sec, "Smallest inside diameter that stays at or below V_e", f"SQRT(4*({Vt}/{Ve})/PI())", "diam", "in", out="dmin", key=True)


def s_gascap(sec, E):
    sec.chk(f"({bl(E['q'])})+({bl(E['d'])})<>1", "Leave either the gas rate or the vessel diameter blank.")
    pc = pseudo(sec, E["gamma"])
    Mg = hcalc(sec, "Molecular weight, g/mol", f"{E['gamma']}*{n(MAIR_G)}")
    w = W(sec)
    st = gas_state(w, f"({E['p']}/{n(PSI)})", f"(({E['t']}+273.15)*1.8)", pc, Mg)
    z = calc(sec, "Z-factor", st["z"], out="z")
    zcheck(sec, st["z"], E["p"], E["t"], E["gamma"])
    rg = calc(sec, "Gas density", st["rho"], "rho", "lbft3", out="rhog")
    sec.chk(f"AND(ISNUMBER({E['rhol']}),ISNUMBER({rg}),{E['rhol']}<={rg})", "The liquid must be denser than the gas.")
    vmax = calc(sec, "Maximum gas velocity", f"{E['K']}*SQRT(({E['rhol']}-{rg})/{rg})", "vel", "fts", "K √((ρL − ρg) ÷ ρg)", out="vmax", key=True)
    per = hcalc(sec, "Actual m³ per mol at p, T", f"{z}*{n(R)}*({E['t']}+273.15)/({E['p']}*1000)")
    nmol = calc(sec, "Gas capacity", f"IF({bl(E['q'])},PI()*{E['d']}^2/4*{vmax}/{per},{E['q']})", "gasflow", "mmscfd", out="q", key=True)
    calc(sec, "Minimum vessel inside diameter", f"IF({bl(E['d'])},SQRT(4*({nmol}*{per}/{vmax})/PI()),{E['d']})", "diam", "in", out="d", key=True)
    calc(sec, "Actual gas flow at operating conditions", f"{nmol}*{per}", "vflow", "m3h", out="vact")


def s_retention(sec, E):
    V = calc(sec, "Liquid retention volume", f"({E['qo']}+{nz(E['qw'])})*{E['tr']}", "volume", "bbl", "(q_o + q_w) × t_r", out="v", key=True)
    calc(sec, "Liquid height above the outlet (vertical vessel)", f'IF(OR({bl(E["d"])},{E["d"]}=0),"",{V}/(PI()*{E["d"]}^2/4))', "length", "ft", out="h", key=True)


def tank_vol(shape, D, L, h):
    hh = f"MIN(MAX({h},0),{D})"
    Rr = f"({D}/2)"
    horiz = f"{L}*({Rr}^2*ACOS(({Rr}-{hh})/{Rr})-({Rr}-{hh})*SQRT(MAX(2*{Rr}*{hh}-{hh}^2,0)))"
    vert = f"PI()*{D}^2/4*MIN(MAX({h},0),{L})"
    return f"IF({shape}=2,{horiz},{vert})"


def s_tank(sec, E):
    sh, D, L = E["shape"], E["d"], E["l"]
    top = hcalc(sec, "Tank height for gauging (m)", f"IF({sh}=2,{D},{L})")
    sec.chk(f"AND(ISNUMBER({top}),OR(AND(ISNUMBER({E['h1']}),{E['h1']}>{top}+1E-9),AND(ISNUMBER({E['h2']}),{E['h2']}>{top}+1E-9)))", "A gauge cannot be higher than the tank.")
    V1 = calc(sec, "Volume at the opening gauge", tank_vol(sh, D, L, E["h1"]), "volume", "bbl", "vertical πD²h/4; horizontal L[R² acos((R−h)/R) − (R−h)√(2Rh − h²)]", out="v1", key=True)
    full = calc(sec, "Tank capacity (shell)", tank_vol(sh, D, L, top), "volume", "bbl", out="full")
    calc(sec, "Percent full", f"{V1}/{full}*100", "pct", "pct", out="pct")
    calc(sec, "Barrels per inch of gauge", f'IF({sh}=2,"",PI()*{D}^2/4*0.0254/{n(BBL)})', out="perin")
    V2 = calc(sec, "Volume at the closing gauge", f'IF({bl(E["h2"])},"",{tank_vol(sh, D, L, E["h2"])})', "volume", "bbl", out="v2")
    calc(sec, "Volume between the gauges (gross)", f'IF({bl(V2)},"",{V1}-{V2})', "volume", "bbl", out="run", key=True)


def s_rates(sec, E):
    bpd, scfd = fac("vflow", "bpd")[0], fac("gasflow", "scfd")[0]
    gf = fac("gor", "scfbbl")[0]
    qo = hcalc(sec, "q_o (bbl/d)", f"{E['qo']}/{n(bpd)}")
    qw = hcalc(sec, "q_w (bbl/d)", f"{nz(E['qw'])}/{n(bpd)}")
    ql = calc(sec, "Total liquid", f"({qo}+{qw})*{n(bpd)}", "vflow", "bpd", out="ql", key=True)
    sec.chk(f"AND(ISNUMBER({ql}),{ql}<=0)", "Enter an oil or water rate above zero.")
    qlb = f"({qo}+{qw})"
    calc(sec, "Water cut", f"{qw}/{qlb}*100", "pct", "pct", out="wc", key=True)
    calc(sec, "Water-oil ratio, bbl/bbl", f'IF({qo}>0,{qw}/{qo},"")', out="wor")
    scf = hcalc(sec, "Gas (scf/d)", f'IF({bl(E["qg"])},"",{E["qg"]}/{n(scfd)})')
    calc(sec, "Gas-oil ratio", f'IF(AND(ISNUMBER({scf}),{qo}>0),{scf}/{qo}*{n(gf)},"")', "gor", "scfbbl", out="gor", key=True)
    calc(sec, "Gas-liquid ratio", f'IF(ISNUMBER({scf}),{scf}/{qlb}*{n(gf)},"")', "gor", "scfbbl", out="glr", key=True)


def s_hydro(sec, E):
    sec.chk(f"({bl(E['mw'])})+({bl(E['tvd'])})+({bl(E['p'])})<>1", "Leave exactly one of mud weight, depth, or hydrostatic pressure blank.")
    sec.chk(f"AND({bl(E['mw'])},ISNUMBER({E['tvd']}),{E['tvd']}<=0)", "Depth must be greater than zero.")
    rho = calc(sec, "Mud weight", f"IF({bl(E['mw'])},{E['p']}*1000/({n(G)}*{E['tvd']}),{E['mw']})", "mudwt", "ppg", "P ÷ (g × TVD)", out="mw", key=True)
    h = calc(sec, "True vertical depth", f"IF({bl(E['tvd'])},{E['p']}*1000/({rho}*{n(G)}),{E['tvd']})", "length", "ft", out="tvd", key=True)
    P = calc(sec, "Hydrostatic pressure", f"IF({bl(E['p'])},{rho}*{n(G)}*{h}/1000,{E['p']})", "dp", "psi", f"ρ g TVD = {PSI_FT_PER_PPG:.6f} × MW(ppg) × TVD(ft)", out="p", key=True)
    calc(sec, "Mud gradient", f"{rho}*{n(G)}/1000", "grad", "psift", out="grad")
    bhp = calc(sec, "Bottomhole pressure (hydrostatic + surface)", f'IF(AND(ISNUMBER({E["ps"]}),{h}>0),{P}+{E["ps"]},"")', "dp", "psi", out="bhp", key=True)
    calc(sec, "Equivalent mud weight", f'IF({bl(bhp)},"",{bhp}*1000/({n(G)}*{h}))', "mudwt", "ppg", out="emw", key=True)


def s_kill(sec, E):
    omw, h, sidpp = E["omw"], E["tvd"], E["sidpp"]
    pf = calc(sec, "Formation pressure", f"{omw}*{n(G)}*{h}/1000+{sidpp}", "dp", "psi", "hydrostatic + SIDPP", out="pf", key=True)
    kmw = calc(sec, "Kill mud weight", f"{omw}+{sidpp}*1000/({n(G)}*{h})", "mudwt", "ppg", "OMW + SIDPP ÷ (0.052 × TVD)", out="kmw", key=True)
    calc(sec, "Kill mud weight rounded up to 0.1 ppg", f"ROUNDUP({frm('mudwt', 'ppg', kmw)}*10-1E-9,0)/10", out="kmwup")
    calc(sec, "Formation pressure as equivalent mud weight", kmw, "mudwt", "ppg", out="emwf")
    calc(sec, "Initial circulating pressure (ICP)", f'IF({bl(E["scr"])},"",{E["scr"]}+{sidpp})', "dp", "psi", "SCR + SIDPP", out="icp", key=True)
    calc(sec, "Final circulating pressure (FCP)", f'IF({bl(E["scr"])},"",{E["scr"]}*{kmw}/{omw})', "dp", "psi", "SCR × KMW ÷ OMW", out="fcp", key=True)
    shoe = f"AND(ISNUMBER({E['shoe']}),ISNUMBER({E['lot']}),{nz(E['shoe'])}<>0,{nz(E['lot'])}<>0)"
    calc(sec, "MAASP with the current mud", f'IF({shoe},({E["lot"]}-{omw})*{n(G)}*{E["shoe"]}/1000,"")', "dp", "psi", "(LOT − OMW) × 0.052 × TVD_shoe", out="maasp", key=True)
    calc(sec, "MAASP with kill mud in the annulus", f'IF({shoe},({E["lot"]}-{kmw})*{n(G)}*{E["shoe"]}/1000,"")', "dp", "psi", out="maaspk")
    inf = f"AND(ISNUMBER({E['sicp']}),ISNUMBER({E['gain']}),ISNUMBER({E['acap']}),{nz(E['gain'])}<>0,{nz(E['acap'])}<>0)"
    Hh = calc(sec, "Influx height", f'IF({inf},{E["gain"]}/{E["acap"]},"")', "length", "ft", "pit gain ÷ annular capacity", out="hinf")
    calc(sec, "Influx gradient", f'IF({inf},{omw}*{n(G)}/1000-({E["sicp"]}-{sidpp})/{Hh},"")', "grad", "psift", "mud gradient − (SICP − SIDPP) ÷ height", out="ginf", key=True)


def s_annular(sec, E):
    sec.chk(f"AND({isn(E['od'], E['dh'])},{E['od']}>={E['dh']})", "The pipe outside diameter must be smaller than the hole.")
    sec.chk(f"AND({isn(E['id'], E['od'])},{E['id']}>={E['od']})", "The pipe inside diameter must be smaller than its outside diameter.")
    ar = lambda d: f"(PI()*{d}^2/4)"
    ca = calc(sec, "Annular capacity", f"{ar(E['dh'])}-{ar(E['od'])}", "cap", "bblft", "(Dh² − OD²) ÷ 1,029.4 in bbl/ft", out="ca", key=True)
    cp = calc(sec, "Pipe capacity", ar(E["id"]), "cap", "bblft", "ID² ÷ 1,029.4", out="cp", key=True)
    calc(sec, "Steel displacement (open end)", f"{ar(E['od'])}-{ar(E['id'])}", "cap", "bblft", out="cs")
    Va = calc(sec, "Annular volume", f"{ca}*{E['md']}", "volume", "bbl", out="va", key=True)
    Vp = calc(sec, "String volume", f"{cp}*{E['md']}", "volume", "bbl", out="vp")
    qok = f"AND(ISNUMBER({E['q']}),{nz(E['q'])}<>0)"
    calc(sec, "Annular velocity", f'IF({qok},{E["q"]}/{ca},"")', "vel", "ftmin", out="av", key=True)
    calc(sec, "Bottoms-up time", f'IF({qok},{Va}/{E["q"]},"")', "time", "min", out="tbu", key=True)
    calc(sec, "Surface-to-bit time", f'IF({qok},{Vp}/{E["q"]},"")', "time", "min", out="tsb")
    pok = f"AND(ISNUMBER({E['po']}),{nz(E['po'])}<>0)"
    calc(sec, "Strokes for bottoms-up", f'IF({pok},{Va}/{E["po"]},"")', "count", "n", out="sbu", key=True)
    calc(sec, "Strokes surface to bit", f'IF({pok},{Vp}/{E["po"]},"")', "count", "n", out="ssb")


def s_rod(sec, E):
    bpd = fac("vflow", "bpd")[0]
    sec.chk(f"({bl(E['n'])})+({bl(E['q'])})<>1", "Leave either the pumping speed or the target rate blank.")
    ev = f"({E['ev']}/100)"
    K = calc(sec, "Pump constant, bbl/d per stroke/min", f"{n(ROD_K)}*({E['dp']}/{n(IN)})^2*({E['s']}/{n(IN)})", note=f"{ROD_K:.4f} × D² × S", out="k")
    PD = hcalc(sec, "Pump displacement (bbl/d)", f"IF({bl(E['q'])},{K}*{E['n']},{E['q']}/{n(bpd)}/{ev})")
    calc(sec, "Pump displacement", f"{PD}*{n(bpd)}", "vflow", "bpd", out="pd", key=True)
    calc(sec, "Expected production", f"{PD}*{ev}*{n(bpd)}", "vflow", "bpd", out="q", key=True)
    calc(sec, "Pumping speed, strokes/min", f"IF({bl(E['q'])},{E['n']},{PD}/{K})", out="n", key=True)


def s_esp(sec, E):
    rho, Hh = E["sg"], E["h"]
    L = f"IF({bl(E['md'])},{Hh},{E['md']})"
    sec.chk(f"AND(ISNUMBER({E['md']}),ISNUMBER({Hh}),{E['md']}<{Hh}-1E-6)", "Tubing length cannot be less than the pump TVD.")
    D = E["d"]
    v = hcalc(sec, "Velocity (m/s)", f"{E['q']}/(PI()*{D}^2/4)")
    Re = hcalc(sec, "Reynolds number", f"{rho}*{v}*{D}/{E['mu']}")
    w = W(sec)
    f = hcalc(sec, "Darcy friction factor", colebrook(w, Re, f"({E['eps']}/{D})"), "Colebrook (hidden columns)")
    hf = calc(sec, "Tubing friction head", f"{f}*({L}/{D})*{v}^2/(2*{n(G)})", "head", "ft", out="hf")
    hp = hcalc(sec, "Pressure head (p_wh − PIP) ÷ ρg (m)", f"({E['pwh']}-{E['pip']})*1000/({rho}*{n(G)})")
    tdh = calc(sec, "Total dynamic head", f"{Hh}+{hf}+{hp}", "head", "ft", "TDH = H + h_f + (p_wh − PIP) ÷ ρg", out="tdh", key=True)
    sec.chk(f"AND(ISNUMBER({tdh}),{tdh}<=0)", "The intake pressure alone lifts the fluid to surface: the well would flow without a pump at this rate.")
    hhp = calc(sec, "Hydraulic power", f"{rho}*{n(G)}*{E['q']}*{tdh}/1000", "power", "hp", "ρ g q TDH", out="hhp", key=True)
    fop = calc(sec, "Fluid column above the pump (gas-free)", f'IF({bl(E["chp"])},"",({E["pip"]}-{E["chp"]})*1000/({rho}*{n(G)}))', "length", "ft", out="fop")
    calc(sec, "Working fluid level from surface", f'IF({bl(fop)},"",{Hh}-{fop})', "length", "ft", out="fl")
    hs = f"AND(ISNUMBER({E['hs']}),{nz(E['hs'])}<>0)"
    st = calc(sec, "Pump stages", f'IF({hs},ROUNDUP({tdh}/{E["hs"]}-1E-9,0),"")', "count", "n", "TDH ÷ head per stage, rounded up", out="stages", key=True)
    ps = f"AND({hs},ISNUMBER({E['ps']}),{nz(E['ps'])}<>0)"
    bhp = calc(sec, "Pump brake horsepower", f'IF({ps},{st}*{E["ps"]}*({rho}/999.016),"")', "power", "hp", "stages × hp per stage × SG", out="bhp", key=True)
    calc(sec, "Implied pump efficiency", f'IF({bl(bhp)},"",{hhp}/{bhp}*100)', "pct", "pct", out="eff")


SECTIONS = {
    "natural-gas-properties/composition": s_composition,
    "natural-gas-properties/z-factor": s_zfactor,
    "crude-oil-pvt/gravity": s_gravity,
    "crude-oil-pvt/bubble-point": s_bubble,
    "crude-oil-pvt/viscosity": s_oilvisc,
    "well-inflow/darcy": s_darcy,
    "well-inflow/vogel": s_vogel,
    "well-inflow/backpressure": s_backpressure,
    "gas-well-deliverability/static": s_static,
    "gas-well-deliverability/flowing": s_flowing,
    "gas-well-deliverability/nodal": s_nodal,
    "gas-well-deliverability/loading": s_loading,
    "choke-calculator/gilbert": s_gilbert,
    "choke-calculator/gas-choke": s_gaschoke,
    "pipeline-flow/gas-line": s_gasline,
    "pipeline-flow/liquid-line": s_liquidline,
    "pipeline-flow/erosional": s_erosional,
    "separators-and-tanks/gas-capacity": s_gascap,
    "separators-and-tanks/retention": s_retention,
    "separators-and-tanks/tank-gauge": s_tank,
    "separators-and-tanks/rates": s_rates,
    "drilling-well-control/hydrostatic": s_hydro,
    "drilling-well-control/kill-sheet": s_kill,
    "drilling-well-control/annular": s_annular,
    "artificial-lift/rod-pump": s_rod,
    "artificial-lift/esp": s_esp,
}
