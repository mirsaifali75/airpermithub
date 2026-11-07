"""
Builds public/workbooks/airpermithub-plant-utilities.xlsx: one sheet per
utility with live Excel formulas that mirror src/lib/utilities (same inputs,
same equations, same result keys), plus the IAPWS-IF97 coefficients and water
property tables the formulas use.

    npx tsx scripts/workbooks/export-utilities.ts > /tmp/util.json
    python3 -I scripts/workbooks/build_utilities.py /tmp/util.json public/workbooks
    python3 -I scripts/workbooks/build_utilities.py /tmp/util.json /tmp/check --verify

--verify fills every worked example into a copy, recalculates it in
LibreOffice, and compares each result with the website's (0.5 % tolerance).

Layout (also read by src/lib/utilities/xlsx.ts and workbook-layout.ts):
A label | B value (your units) | C unit | D formula / note | E value in SI | F key
"""

import json
import math
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.worksheet.datavalidation import DataValidation

SPEC_PATH, OUT = sys.argv[1], Path(sys.argv[2])
VERIFY = "--verify" in sys.argv
D = json.loads(Path(SPEC_PATH).read_text())
FAM = D["families"]
LIST_ROWS = D["listRows"]
VERSION = "1.0"
FNAME = "airpermithub-plant-utilities.xlsx"

NAVY = "0B2545"
F_TITLE = Font(bold=True, size=14, color=NAVY)
F_SEC = Font(bold=True, size=12, color="FFFFFF")
F_H = Font(bold=True, color=NAVY)
F_B = Font(bold=True)
F_SMALL = Font(size=9, color="555555")
F_KEY = Font(size=8, color="9AA5B1")
F_LINK = Font(color="1463D9", underline="single")
FILL_SEC = PatternFill("solid", fgColor=NAVY)
FILL_IN = PatternFill("solid", fgColor="FFF6D6")
FILL_CALC = PatternFill("solid", fgColor="EEF3FA")
FILL_KEY = PatternFill("solid", fgColor="DCEBFF")
FILL_HELP = PatternFill("solid", fgColor="F4F6F8")
THIN = Side(style="thin", color="C9D2DC")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")

R = 8.314462618
NM3 = R * 273.15 / 101325.0
M_AIR = 0.0289647
M_N2 = 0.0280134
G = 9.80665
TON = 12000 * 1.05505585262 / 3600

DISCLAIMER = (
    "AirPermitHub provides educational and engineering-support information. It is not professional engineering advice. "
    "Check every input, unit, and result, and have a qualified engineer approve designs."
)


# Families that cannot be zero or negative when entered (same list as POSITIVE in src/lib/utilities/index.ts).
POSITIVE = {"pabs", "mflow", "vflow", "gasflow", "cp", "hspec", "hv", "rho", "visc", "diam", "area", "volume", "uval"}


def unit(family, uid):
    for u in FAM[family]["units"]:
        if u["id"] == uid:
            return u
    return FAM[family]["units"][0]


def num(x):
    return repr(float(x)) if not float(x).is_integer() else str(int(x))


# ---------------------------------------------------------------- tables
SAT_FIRST, LIQ_FIRST = 6, 6


def tables_sheet(wb):
    ws = wb.create_sheet("Water Tables")
    ws["A1"] = "Water and steam property tables (IAPWS-IF97), used by the formulas on the other sheets"
    ws["A1"].font = F_TITLE
    ws["A2"] = "Generated from the IAPWS-IF97 equations by the website's code. Linear interpolation between rows. Do not edit."
    ws["A2"].font = F_SMALL
    hs = ["P (kPa abs)", "Tsat (°C)", "hf (kJ/kg)", "hg (kJ/kg)", "hfg (kJ/kg)", "vf (m³/kg)", "vg (m³/kg)", "sf (kJ/kg·K)", "sg (kJ/kg·K)"]
    ws.cell(row=4, column=1, value="Saturation, by pressure").font = F_H
    for j, h in enumerate(hs):
        c = ws.cell(row=5, column=1 + j, value=h)
        c.font = F_B
    for i, r in enumerate(D["tables"]["sat"]):
        for j, v in enumerate(r):
            ws.cell(row=SAT_FIRST + i, column=1 + j, value=v)
    hl = ["T (°C)", "ρ (kg/m³)", "cp (kJ/kg·K)", "μ (mPa·s)", "h (kJ/kg)", "Psat (kPa abs)", "hfg at T (kJ/kg)"]
    ws.cell(row=4, column=11, value="Liquid water at 1 atm (or just above saturation), by temperature").font = F_H
    for j, h in enumerate(hl):
        ws.cell(row=5, column=11 + j, value=h).font = F_B
    for i, r in enumerate(D["tables"]["liquid"]):
        for j, v in enumerate(r):
            ws.cell(row=LIQ_FIRST + i, column=11 + j, value=v)
    for col in "ABCDEFGHIKLMNOPQ":
        ws.column_dimensions[col].width = 14
    return len(D["tables"]["sat"]), len(D["tables"]["liquid"])


def col_range(sheet, col, first, n):
    return f"'{sheet}'!${col}${first}:${col}${first + n - 1}"


def interp(x, xr, yr):
    """Linear interpolation of yr against ascending xr at x (all A1 ranges/refs)."""
    i = f"MIN(MATCH({x},{xr},1),ROWS({xr})-1)"
    x0, x1 = f"INDEX({xr},{i})", f"INDEX({xr},{i}+1)"
    y0, y1 = f"INDEX({yr},{i})", f"INDEX({yr},{i}+1)"
    return f"({y0}+({x}-{x0})*({y1}-{y0})/({x1}-{x0}))"


def if97_sheet(wb):
    ws = wb.create_sheet("IF97")
    ws["A1"] = "IAPWS-IF97 coefficients (regions 1 and 2) used by the steam formulas"
    ws["A1"].font = F_TITLE
    ws["A2"] = "From the IAPWS Revised Release on IF97 (2007), Tables 2, 10, and 11. Do not edit."
    ws["A2"].font = F_SMALL
    r1, r20, r2r = D["if97"]["R1"], D["if97"]["R2_0"], D["if97"]["R2_R"]
    for j, h in enumerate(["I", "J", "n"]):
        ws.cell(row=4, column=1 + j, value=f"Region 1 {h}").font = F_B
        ws.cell(row=4, column=5 + j, value=f"Region 2 ideal {h}" if h != "I" else "").font = F_B
        ws.cell(row=4, column=9 + j, value=f"Region 2 residual {h}").font = F_B
    for i, (I, J, n) in enumerate(r1):
        ws.cell(row=5 + i, column=1, value=I)
        ws.cell(row=5 + i, column=2, value=J)
        ws.cell(row=5 + i, column=3, value=n)
    for i, (J, n) in enumerate(r20):
        ws.cell(row=5 + i, column=6, value=J)
        ws.cell(row=5 + i, column=7, value=n)
    for i, (I, J, n) in enumerate(r2r):
        ws.cell(row=5 + i, column=9, value=I)
        ws.cell(row=5 + i, column=10, value=J)
        ws.cell(row=5 + i, column=11, value=n)
    for col in "ABCDEFGHIJK":
        ws.column_dimensions[col].width = 16
    rng = lambda c, n: f"IF97!${c}$5:${c}${4 + n}"
    return {
        "I1": rng("A", len(r1)), "J1": rng("B", len(r1)), "n1": rng("C", len(r1)),
        "J0": rng("F", len(r20)), "n0": rng("G", len(r20)),
        "I2": rng("I", len(r2r)), "J2": rng("J", len(r2r)), "n2": rng("K", len(r2r)),
    }


# ---------------------------------------------------------------- locking
# Only the yellow input cells can be edited; every formula is locked. The sheets have no password, so an
# engineer who wants to change a formula can still use Review > Unprotect Sheet on purpose.
UNLOCKED = Protection(locked=False)
_NUMBER_DV = {}


def number_only(ws):
    """One data validation per sheet that accepts numbers only (blank allowed)."""
    if ws.title not in _NUMBER_DV:
        dv = DataValidation(type="decimal", operator="between", formula1="-1E+300", formula2="1E+300", allow_blank=True,
                            showErrorMessage=True, errorTitle="Numbers only", error="Type a number in the unit shown in column C, or leave the cell blank.")
        ws.add_data_validation(dv)
        _NUMBER_DV[ws.title] = dv
    return _NUMBER_DV[ws.title]


def lock(ws):
    ws.protection.sheet = True
    ws.protection.formatRows = False  # allowed: unhide the grey intermediate rows
    ws.protection.formatColumns = False
    ws.protection.selectLockedCells = False
    ws.protection.selectUnlockedCells = False


# ---------------------------------------------------------------- section builder
class Sec:
    def __init__(self, ws, row, util, sec):
        self.ws, self.r, self.util, self.sec = ws, row, util, sec
        self.E = {}
        self.inputs = {i["id"]: i for i in sec["inputs"]}
        self.outs = []
        self.checks = []
        self.check_row = None

    @property
    def slug(self):
        return self.util["slug"]

    def header(self):
        ws, s = self.ws, self.sec
        for c in range(1, 7):
            ws.cell(row=self.r, column=c).fill = FILL_SEC
        ws.cell(row=self.r, column=1, value=s["title"]).font = F_SEC
        self.r += 1
        ws.cell(row=self.r, column=1, value=s["question"]).font = Font(italic=True)
        self.r += 1
        for f in s["formulas"]:
            ws.cell(row=self.r, column=1, value=f).font = Font(name="Consolas", size=10, color=NAVY)
            self.r += 1
        if s["solveNote"]:
            ws.cell(row=self.r, column=1, value=s["solveNote"]).font = Font(bold=True, color="1463D9")
            self.r += 1
        refs = "; ".join(x["title"] for x in s["refs"])
        ws.cell(row=self.r, column=1, value=f"Sources: {refs}").font = F_SMALL
        self.r += 1
        for j, h in enumerate(["Input / result", "Value", "Unit", "Formula or note", "SI value", "Key (do not edit)"]):
            c = ws.cell(row=self.r, column=1 + j, value=h)
            c.font = F_H
            c.border = BOX
        self.r += 1

    def inputs_block(self):
        ws = self.ws
        for i in self.sec["inputs"]:
            r = self.r
            lab = i["label"] + (f" ({i['sym']})" if i["sym"] else "")
            ws.cell(row=r, column=1, value=lab).alignment = WRAP
            b = ws.cell(row=r, column=2)
            b.fill = FILL_IN
            b.border = BOX
            b.protection = UNLOCKED
            if i["choices"]:
                ws.cell(row=r, column=3, value="; ".join(f"{c['value']} = {c['label']}" for c in i["choices"]))
                b.value = i["choices"][0]["value"]
                dv = DataValidation(type="list", formula1='"' + ",".join(str(c["value"]) for c in i["choices"]) + '"', allow_blank=False)
                ws.add_data_validation(dv)
                dv.add(b)
                ws.cell(row=r, column=5, value=f"=B{r}")
            else:
                u = i["unit"]
                ws.cell(row=r, column=3, value=u["label"])
                number_only(ws).add(b)
                off, fac = u.get("offset", 0) or 0, u["factor"]
                conv = f"(B{r}{'+' + num(off) if off else ''})*{num(fac)}" if fac != 1 or off else f"B{r}"
                ws.cell(row=r, column=5, value=f'=IF(ISNUMBER(B{r}),{conv},"")')
            note = []
            if i["optional"]:
                note.append("optional")
            if i["solvable"]:
                note.append("leave blank to solve")
            if i["help"]:
                note.append(i["help"])
            ws.cell(row=r, column=4, value="; ".join(note)).font = F_SMALL
            ws.cell(row=r, column=4).alignment = WRAP
            ws.cell(row=r, column=6, value=f"in:{self.slug}.{self.sec['id']}.{i['id']}").font = F_KEY
            self.E[i["id"]] = f"$E${r}"
            self.r += 1

    def list_block(self, si_cols):
        """si_cols(r) -> {col_letter: formula} giving SI helper values for list row r."""
        ws, L = self.ws, self.sec["list"]
        ws.cell(row=self.r, column=1, value=L["label"]).font = F_H
        self.r += 1
        for j, c in enumerate(L["columns"]):
            lbl = c["label"] + (f" ({unit(c['family'], c['unit'])['label']})" if c.get("family") else "")
            ws.cell(row=self.r, column=1 + j, value=lbl).font = F_B
        self.r += 1
        first = self.r
        for k in range(LIST_ROWS):
            r = self.r
            for j, col in enumerate(L["columns"]):
                cell = ws.cell(row=r, column=1 + j)
                cell.fill = FILL_IN
                cell.border = BOX
                cell.protection = UNLOCKED
                if not col.get("text"):
                    number_only(ws).add(cell)
            for col, f in si_cols(r).items():
                ws[f"{col}{r}"] = f
            ws.cell(row=r, column=6, value=f"list:{self.slug}.{self.sec['id']}.{L['id']}.{k}").font = F_KEY
            self.r += 1
        return first, self.r - 1

    def calc(self, label, si, family="ratio", uid=None, note="", out=None, key=False, helper=False):
        ws, r = self.ws, self.r
        u = unit(family, uid or FAM[family]["units"][0]["id"])
        ws.cell(row=r, column=1, value=label).alignment = WRAP
        ws.cell(row=r, column=5, value=f'=IFERROR({si},"")')
        off, fac = u.get("offset", 0) or 0, u["factor"]
        disp = f"E{r}" if (fac == 1 and not off) else f"E{r}/{num(fac)}{'-' + num(off) if off else ''}"
        ws.cell(row=r, column=2, value=f'=IF(ISNUMBER(E{r}),{disp},"")')
        ws.cell(row=r, column=3, value="$" if family == "money" else u["label"])
        ws.cell(row=r, column=4, value=note).font = F_SMALL
        fill = FILL_KEY if key else (FILL_HELP if helper else FILL_CALC)
        for c in range(1, 4):
            ws.cell(row=r, column=c).fill = fill
        ws.cell(row=r, column=2).border = BOX
        ws.cell(row=r, column=2).number_format = "#,##0.0000" if not key else "#,##0.000"
        if key:
            ws.cell(row=r, column=1).font = F_B
            ws.cell(row=r, column=2).font = F_B
        if helper:
            ws.row_dimensions[r].outlineLevel = 1
            ws.cell(row=r, column=1).font = F_SMALL
        if out:
            ws.cell(row=r, column=6, value=f"out:{self.slug}.{self.sec['id']}.{out}").font = F_KEY
            self.outs.append(out)
        self.r += 1
        return f"$E${r}"

    def chk(self, cond, msg):
        """Adds an input check: when the Excel condition is TRUE, the section's check row shows msg."""
        self.checks.append((cond, msg))

    def reserve_check(self):
        """Keeps the row under the inputs for the input-check message, and adds the checks every section shares."""
        self.check_row = self.r
        self.r += 1
        for i in self.sec["inputs"]:
            e = self.E[i["id"]]
            if not i.get("soft") and not i["choices"] and (i.get("min") is not None or i.get("max") is not None):
                u = i["unit"]
                off, fac = u.get("offset", 0) or 0, u["factor"]
                shown = lambda x: f"{x / fac - off:.4g} {u['label']}".strip()
                conds, words = [], []
                if i.get("min") is not None:
                    conds.append(f"{e}<{num(i['min'])}-1E-9")
                if i.get("max") is not None:
                    conds.append(f"{e}>{num(i['max'])}+1E-9")
                if i.get("min") is not None and i.get("max") is not None:
                    rng = f"between {shown(i['min'])} and {shown(i['max'])}"
                else:
                    rng = f"at least {shown(i['min'])}" if i.get("min") is not None else f"no more than {shown(i['max'])}"
                self.chk(f"AND(ISNUMBER({e}),OR({','.join(conds)}))", f"{i['label']} must be {rng}.")
            if i["family"] == "pct" and "efficiency" in i["label"].lower():
                self.chk(f"AND(ISNUMBER({e}),OR({e}<=0,{e}>100))", f"{i['label']} must be more than 0 % and no more than 100 %.")
            elif i["family"] in POSITIVE and not i["optional"]:
                self.chk(f"AND(ISNUMBER({e}),{e}<=0)", f"{i['label']} must be greater than zero.")

    def write_check(self):
        ws, r = self.ws, self.check_row
        parts = "&".join(f'IF(IFERROR({c},FALSE),"{m} ","")' for c, m in self.checks) or '""'
        ws.cell(row=r, column=1, value="Input check").font = F_B
        ws.cell(row=r, column=7, value=f"={parts}")
        c = ws.cell(row=r, column=2, value=f'=IF(LEN(G{r})=0,"OK","CHECK: "&TRIM(G{r}))')
        c.font = Font(bold=True, color="B42318")
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        c.alignment = WRAP
        ws.cell(row=r, column=6, value=f"chk:{self.slug}.{self.sec['id']}").font = F_KEY

    def done(self):
        self.write_check()
        self.r += 1
        return self.r


# Helpers that read the water tables.
def sat(sec, pk, nsat, label="", want=("T", "hf", "hg", "hfg", "vg")):
    cols = {"T": "B", "hf": "C", "hg": "D", "hfg": "E", "vf": "F", "vg": "G", "sf": "H", "sg": "I"}
    xr = col_range("Water Tables", "A", SAT_FIRST, nsat)
    out = {}
    names = {"T": ("Saturation temperature", "temp", "c"), "hf": ("hf, saturated liquid enthalpy", "hspec", "kjkg"), "hg": ("hg, saturated vapor enthalpy", "hspec", "kjkg"),
             "hfg": ("hfg, latent heat", "hspec", "kjkg"), "vg": ("vg, saturated vapor specific volume (m³/kg)", "ratio", None), "vf": ("vf (m³/kg)", "ratio", None), "sg": ("sg (kJ/kg·K)", "ratio", None)}
    for k in want:
        nm, fam, u = names[k]
        out[k] = sec.calc(f"{label}{nm}", interp(pk, xr, col_range("Water Tables", cols[k], SAT_FIRST, nsat)), fam, u, "IF97 saturation table, interpolated", helper=True)
    return out


def liq(sec, tC, nliq, what, label=""):
    cols = {"rho": ("L", "Water density", "rho", "kgm3"), "cp": ("M", "Water specific heat", "cp", "kjkgk"), "mu": ("N", "Water viscosity (mPa·s)", "ratio", None), "hfg": ("Q", "Latent heat at T", "hspec", "kjkg")}
    xr = col_range("Water Tables", "K", LIQ_FIRST, nliq)
    c, nm, fam, u = cols[what]
    return sec.calc(f"{label}{nm}", interp(tC, xr, col_range("Water Tables", c, LIQ_FIRST, nliq)), fam, u, "IF97 liquid table, interpolated", helper=True)


def r1(sec, pk, tC, C, label, want_cp=False):
    """Region 1 h, v, cp at p (kPa abs ref) and T (°C ref)."""
    pi = sec.calc(f"{label} π = p/16.53 MPa", f"{pk}/1000/16.53", helper=True)
    tau = sec.calc(f"{label} τ = 1386 K/T", f"1386/({tC}+273.15)", helper=True)
    I, J, n = C["I1"], C["J1"], C["n1"]
    gt = f"SUMPRODUCT({n}*(7.1-{pi})^{I}*{J}*({tau}-1.222)^({J}-1))"
    gp = f"SUMPRODUCT(-{n}*{I}*(7.1-{pi})^({I}-1)*({tau}-1.222)^{J})"
    h = sec.calc(f"{label} h (IF97 region 1)", f"0.461526*({tC}+273.15)*{tau}*{gt}", "hspec", "kjkg", "h = RTτγτ", helper=True)
    v = sec.calc(f"{label} v (IF97 region 1, m³/kg)", f"0.461526*({tC}+273.15)/({pk})*{pi}*{gp}", "ratio", None, "v = RT/p πγπ", helper=True)
    if want_cp:
        gtt = f"SUMPRODUCT({n}*(7.1-{pi})^{I}*{J}*({J}-1)*({tau}-1.222)^({J}-2))"
        cp = sec.calc(f"{label} cp (IF97 region 1)", f"-0.461526*{tau}^2*{gtt}", "cp", "kjkgk", "cp = −Rτ²γττ", helper=True)
        return h, v, cp
    return h, v


def r2(sec, pk, tC, C, label, want_cp=False):
    pi = sec.calc(f"{label} π = p/1 MPa", f"{pk}/1000", helper=True)
    tau = sec.calc(f"{label} τ = 540 K/T", f"540/({tC}+273.15)", helper=True)
    J0, n0, I, J, n = C["J0"], C["n0"], C["I2"], C["J2"], C["n2"]
    g0t = f"SUMPRODUCT({n0}*{J0}*{tau}^({J0}-1))"
    grt = f"SUMPRODUCT({n}*{pi}^{I}*{J}*({tau}-0.5)^({J}-1))"
    grp = f"SUMPRODUCT({n}*{I}*{pi}^({I}-1)*({tau}-0.5)^{J})"
    h = sec.calc(f"{label} h (IF97 region 2)", f"0.461526*({tC}+273.15)*{tau}*({g0t}+{grt})", "hspec", "kjkg", "h = RTτ(γ⁰τ + γʳτ)", helper=True)
    v = sec.calc(f"{label} v (IF97 region 2, m³/kg)", f"0.461526*({tC}+273.15)/({pk})*{pi}*(1/{pi}+{grp})", "ratio", None, "v = RT/p π(γ⁰π + γʳπ)", helper=True)
    if want_cp:
        g0tt = f"SUMPRODUCT({n0}*{J0}*({J0}-1)*{tau}^({J0}-2))"
        grtt = f"SUMPRODUCT({n}*{pi}^{I}*{J}*({J}-1)*({tau}-0.5)^({J}-2))"
        cp = sec.calc(f"{label} cp (IF97 region 2)", f"-0.461526*{tau}^2*({g0tt}+{grtt})", "cp", "kjkgk", "cp = −Rτ²(γ⁰ττ + γʳττ)", helper=True)
        return h, v, cp
    return h, v


def blank(x):
    return f'{x}=""'


def nz(x, d=0):
    return f'IF({x}="",{d},{x})'


# ---------------------------------------------------------------- utilities
def build_section(sec, C, nsat, nliq):
    s, slug, sid, E = sec.sec, sec.slug, sec.sec["id"], sec.E
    key = f"{slug}/{sid}"

    if key == "steam/properties":
        st = sat(sec, E["p"], nsat, want=("T", "hf", "hg", "hfg", "vg", "vf", "sg"))
        sec.calc("Saturation temperature", st["T"], "temp", "c", out="tsat", key=True)
        sec.calc("hf, saturated liquid enthalpy", st["hf"], "hspec", "kjkg", out="hf")
        sec.calc("hfg, latent heat", st["hfg"], "hspec", "kjkg", "hfg = hg − hf", out="hfg", key=True)
        sec.calc("hg, saturated vapor enthalpy", st["hg"], "hspec", "kjkg", out="hg", key=True)
        sec.calc("vg, saturated vapor specific volume (m³/kg)", st["vg"], out="vg")
        sec.calc("Saturated vapor density", f"1/{st['vg']}", "rho", "kgm3", out="rhog")
        sec.calc("vf, saturated liquid specific volume (m³/kg)", st["vf"], out="vf")
        sec.calc("sg, saturated vapor entropy (kJ/kg·K)", st["sg"], out="sg")
        h1, v1, cp1 = r1(sec, E["p"], E["t"], C, "Liquid at T:", True)
        h2, v2, cp2 = r2(sec, E["p"], E["t"], C, "Vapor at T:", True)
        sup = f"{E['t']}>={st['T']}"
        sec.calc("h at the entered temperature", f'IF({blank(E["t"])},"",IF({sup},{h2},{h1}))', "hspec", "kjkg", "Region 2 above Tsat, region 1 below", out="h", key=True)
        sec.calc("v at the entered temperature (m³/kg)", f'IF({blank(E["t"])},"",IF({sup},{v2},{v1}))', out="v")
        sec.calc("cp at the entered temperature", f'IF({blank(E["t"])},"",IF({sup},{cp2},{cp1}))', "cp", "kjkgk", out="cp")
        sec.calc("Degrees of superheat", f'IF({blank(E["t"])},"",IF({sup},{E["t"]}-{st["T"]},""))', "dtemp", "k", out="superheat")

    elif key == "steam/heating":
        Q = sec.calc("Heat duty", f'IF({blank(E["Q"])},{E["mp"]}*{E["cp"]}*({E["t2"]}-{E["t1"]}),{E["Q"]})', "power", "kw", "Q entered, or ṁp × cp × (T₂ − T₁)", out="Q")
        Qs = sec.calc("Heat from steam (with losses)", f"{Q}/(1-{nz(E['loss'])}/100)", "power", "kw", "Q ÷ (1 − L)", out="Qs")
        st = sat(sec, E["ps"], nsat, "Steam: ")
        h2, _ = r2(sec, E["ps"], E["ts"], C, "Superheated steam:")
        hc1, _ = r1(sec, E["ps"], E["tc"], C, "Subcooled condensate:")
        sec.chk(f'AND({blank(E["Q"])},ISNUMBER({E["t2"]}),{E["t2"]}>={st["T"]})', "Steam condensing at this pressure cannot heat the product to the outlet temperature. Raise the steam pressure.")
        sec.chk(f'AND({blank(E["Q"])},ISNUMBER({E["t1"]}),ISNUMBER({E["t2"]}),{E["t2"]}<={E["t1"]})', "The process outlet must be hotter than the inlet.")
        sec.chk(f'AND(ISNUMBER({E["loss"]}),{E["loss"]}>=100)', "Heat losses must be below 100 %.")
        sec.chk(f'AND(ISNUMBER({E["tc"]}),{E["tc"]}>{st["T"]}+0.05)', "Condensate is above the saturation temperature; it would be steam.")
        sec.chk(f'AND(ISNUMBER({E["ts"]}),{E["ts"]}<{st["T"]}-0.05)', "Steam temperature is below saturation, so it would be liquid. Leave it blank for saturated steam.")
        hs = sec.calc("Steam enthalpy", f'IF({blank(E["ts"])},{st["hg"]},{h2})', "hspec", "kjkg", "hg if saturated, IF97 region 2 if superheated")
        hc = sec.calc("Condensate enthalpy", f'IF({blank(E["tc"])},{st["hf"]},{hc1})', "hspec", "kjkg", "hf if saturated")
        dh = sec.calc("Heat given up per kg of steam", f"{hs}-{hc}", "hspec", "kjkg", out="dh")
        ms = sec.calc("Steam required", f"{Qs}/{dh}", "mflow", "kgh", "ṁs = Q_steam ÷ (h_s − h_c)", out="ms", key=True)
        sec.calc("Condensate returned (same mass)", ms, "mflow", "kgh", out="mc")
        sec.calc("Annual steam (tonnes per year)", f'IF({blank(E["hours"])},"",{ms}*{E["hours"]}/1000)', out="annual")

    elif key == "steam/boiler":
        b = sec.calc("Blowdown fraction b", f'IF(ISNUMBER({E["bd"]}),{E["bd"]}/100,IF(AND(ISNUMBER({E["tdsf"]}),ISNUMBER({E["tdsb"]})),{E["tdsf"]}/{E["tdsb"]},0))', note="b = BD% ÷ 100, or TDS_feed ÷ TDS_boiler")
        st = sat(sec, E["p"], nsat, "Drum: ")
        h2, _ = r2(sec, E["p"], E["ts"], C, "Superheated steam:")
        hfw, _ = r1(sec, E["p"], E["tfw"], C, "Feedwater:")
        sec.chk(f'{E["tfw"]}>={st["T"]}', "Feedwater is at or above the drum saturation temperature.")
        sec.chk(f'AND(ISNUMBER({E["tdsf"]}),ISNUMBER({E["tdsb"]}),{E["tdsf"]}>={E["tdsb"]})', "Maximum boiler water TDS must be higher than the feedwater TDS.")
        sec.chk(f'AND(ISNUMBER({E["bd"]}),{E["bd"]}>=100)', "Blowdown must be below 100 %.")
        sec.chk(f'AND(ISNUMBER({E["ts"]}),{E["ts"]}<{st["T"]}-0.05)', "Steam temperature is below saturation, so it would be liquid.")
        hs = sec.calc("Steam enthalpy", f'IF({blank(E["ts"])},{st["hg"]},{h2})', "hspec", "kjkg")
        mfw = sec.calc("Feedwater", f"{E['ms']}/(1-{b})", "mflow", "kgh", "ṁfw = ṁs ÷ (1 − b)", out="mfw")
        mbd = sec.calc("Blowdown", f"{mfw}*{b}", "mflow", "kgh", out="mbd")
        Qbd = sec.calc("Heat leaving in blowdown", f"{mbd}*({st['hf']}-{hfw})", "power", "kw", out="Qbd")
        Q = sec.calc("Heat output", f"{E['ms']}*({hs}-{hfw})+{Qbd}", "power", "kw", "ṁs(h_s − h_fw) + ṁbd(hf − h_fw)", out="Qout")
        fuel = sec.calc("Fuel input", f"{Q}/({E['eff']}/100)", "power", "kw", "Q_out ÷ η", out="fuel", key=True)
        mf = sec.calc("Fuel flow", f'IF({blank(E["hhv"])},"",{fuel}/{E["hhv"]})', "mflow", "kgh", "Fuel ÷ HHV", out="mf", key=True)
        sec.calc("Evaporation ratio (kg steam per kg fuel)", f'IF({blank(E["hhv"])},"",{E["ms"]}/{mf})', out="ratio")
        sec.calc("Annual fuel", f'IF({blank(E["hours"])},"",{fuel}*{E["hours"]}/3600)', "energy", "gj", out="annualFuel")
        sec.calc("Annual fuel cost", f'IF(OR({blank(E["hours"])},{blank(E["price"])}),"",{fuel}*{E["hours"]}/1000000*{E["price"]})', "money", out="cost", key=True)

    elif key == "steam/flash":
        sec.chk(f'{E["p2"]}>={E["p1"]}', "The flash vessel pressure must be lower than the condensate pressure.")
        a = sat(sec, E["p1"], nsat, "At P₁: ", want=("hf",))
        b = sat(sec, E["p2"], nsat, "At P₂: ", want=("T", "hf", "hfg"))
        x = sec.calc("Flash fraction", f"({a['hf']}-{b['hf']})/{b['hfg']}*100", "pct", "pct", "x = (hf₁ − hf₂) ÷ hfg₂", out="x", key=True)
        mf = sec.calc("Flash steam", f"{x}/100*{E['mc']}", "mflow", "kgh", out="mf", key=True)
        sec.calc("Condensate left after flashing", f"{E['mc']}-{mf}", "mflow", "kgh", out="ml")
        sec.calc("Heat in the flash steam (latent)", f"{mf}*{b['hfg']}", "power", "kw", out="Qf")
        sec.calc("Flash vessel temperature", b["T"], "temp", "c", out="t2")

    elif key == "steam/pipe":
        st = sat(sec, E["p"], nsat, want=("vg",))
        _, v2 = r2(sec, E["p"], E["t"], C, "Superheated steam:")
        sec.chk(f'AND({blank(E["d"])},{blank(E["u"])})', "Enter the pipe inside diameter, or a target velocity to size the pipe.")
        v = sec.calc("Specific volume (m³/kg)", f'IF({blank(E["t"])},{st["vg"]},{v2})')
        V = sec.calc("Actual volumetric flow", f"{E['m']}*{v}", "vflow", "m3h", "V̇ = ṁ × v", out="V")
        sec.calc("Velocity", f'IF({blank(E["d"])},"",{V}/(PI()*{E["d"]}^2/4))', "vel", "ms", "u = V̇ ÷ A", out="u", key=True)
        sec.calc("Minimum inside diameter for the target velocity", f'IF(AND({blank(E["d"])},ISNUMBER({E["u"]})),SQRT(4*{V}/(PI()*{E["u"]})),"")', "diam", "mm", "D = √(4V̇ ÷ πu)", out="d", key=True)

    elif key in ("cooling-water/flow", "chilled-water/load", "hot-oil/circulation"):
        lo, hi = {"cooling-water/flow": ("tin", "tout"), "chilled-water/load": ("ts", "tr"), "hot-oil/circulation": ("tr", "ts")}[key]
        water = key != "hot-oil/circulation"
        L, H, Q, V = E[lo], E[hi], E["Q"], E["V"]
        tm = sec.calc("Starting mean temperature", f'IF(AND(ISNUMBER({L}),ISNUMBER({H})),({L}+{H})/2,IF({blank(L)},{H},{L}))', "temp", "c", helper=True)
        cp = rho = None
        for it in range(5):
            if water:
                cpw = liq(sec, tm, nliq, "cp", f"Iteration {it}: ")
                rhow = liq(sec, tm, nliq, "rho", f"Iteration {it}: ")
                cp = sec.calc(f"Iteration {it}: cp used", f'IF({blank(E["cp"])},{cpw},{E["cp"]})', "cp", "kjkgk", helper=True)
                rho = sec.calc(f"Iteration {it}: ρ used", f'IF({blank(E["rho"])},{rhow},{E["rho"]})', "rho", "kgm3", helper=True)
            else:
                cp, rho = E["cp"], E["rho"]
                break
            if it < 4:
                dT = f"{Q}/({rho}*{V}*{cp})"
                tm = sec.calc(f"Iteration {it}: next mean temperature", f'IF({blank(L)},{H}-({dT})/2,IF({blank(H)},{L}+({dT})/2,{tm}))', "temp", "c", helper=True)
        dT = sec.calc("Temperature difference ΔT", f'IF(OR({blank(L)},{blank(H)}),{Q}/({rho}*{V}*{cp}),{H}-{L})', "dtemp", "k", out="dT")
        sL = sec.calc(f"Solved: {sec.inputs[lo]['label']}", f'IF({blank(L)},{H}-{dT},"")', "temp", "c", out=lo, key=True)
        sH = sec.calc(f"Solved: {sec.inputs[hi]['label']}", f'IF({blank(H)},{L}+{dT},"")', "temp", "c", out=hi, key=True)
        nblank = f"({blank(Q)})+({blank(V)})+({blank(L)})+({blank(H)})"
        sec.chk(f"{nblank}>1", "Leave only one of heat load, flow, and the two temperatures blank.")
        sec.chk(f"AND(ISNUMBER({L}),ISNUMBER({H}),{H}<={L})", f"{sec.inputs[hi]['label']} must be higher than {sec.inputs[lo]['label']}.")
        sec.chk(f"AND({nblank}=0,ABS({rho}*{V}*{cp}*({H}-{L})-{Q})>0.01*{Q})", "The four entered values disagree by more than 1 %. Leave one blank to have it solved.")
        if water:
            sec.chk(f'AND(OR({blank(E["cp"])},{blank(E["rho"])}),OR(AND(ISNUMBER({sL}),{sL}<0),AND(ISNUMBER({sH}),{sH}>100)))', "The solved temperature is below 0 °C or above 100 °C, outside the range for plain water. Check the load and flow.")
        Qs = sec.calc({"cooling-water/flow": "Heat load", "chilled-water/load": "Cooling load", "hot-oil/circulation": "Heat duty"}[key], f'IF({blank(Q)},{rho}*{V}*{cp}*{dT},{Q})', "power", "kw", "Q = ρ V̇ cp ΔT", out="Q", key=True)
        m = sec.calc("Mass flow", f'IF({blank(V)},{Qs}/({cp}*{dT}),{rho}*{V})', "mflow", "kgs", "ṁ = Q ÷ (cp ΔT)", out="m", key=True)
        sec.calc("Volumetric flow", f'IF({blank(V)},{m}/{rho},{V})', "vflow", "m3h", "V̇ = ṁ ÷ ρ", out="V", key=True)
        if key == "chilled-water/load":
            sec.calc("Cooling load in tons", f"{Qs}/{num(TON)}", note="tons = kW ÷ 3.517")

    elif key == "cooling-water/tower":
        tm = sec.calc("Mean water temperature", f"({E['thot']}+{E['tcold']})/2", "temp", "c")
        rho, cp, hfg = liq(sec, tm, nliq, "rho"), liq(sec, tm, nliq, "cp"), liq(sec, tm, nliq, "hfg")
        sec.chk(f"{E['thot']}<={E['tcold']}", "Hot water (return) must be warmer than cold water (supply).")
        sec.chk(f"{E['C']}<=1", "Cycles of concentration must be greater than 1.")
        sec.chk(f"AND(ISNUMBER({E['twb']}),{E['tcold']}<={E['twb']})", "Cold water at or below the wet bulb is not possible for an evaporative tower.")
        rng = sec.calc("Range", f"{E['thot']}-{E['tcold']}", "dtemp", "k", out="range")
        mc = sec.calc("Circulating mass flow", f"{rho}*{E['V']}", "mflow", "kgs")
        Q = sec.calc("Heat rejected", f"{mc}*{cp}*{rng}", "power", "kw", "Q = ṁc cp Range", out="Q")
        Em = sec.calc("Evaporation (mass)", f"IF({blank(E['fevap'])},1,{E['fevap']}/100)*{Q}/{hfg}", "mflow", "kgs", "E = f Q ÷ hfg")
        Dm = sec.calc("Drift (mass)", f"{nz(E['drift'])}/100*{mc}", "mflow", "kgs")
        Bm = sec.calc("Blowdown (mass)", f"MAX({Em}/({E['C']}-1)-{Dm},0)", "mflow", "kgs", "B = E ÷ (C − 1) − D")
        Mm = sec.calc("Makeup (mass)", f"{Em}+{Bm}+{Dm}", "mflow", "kgs", "M = E + B + D")
        sec.calc("Evaporation", f"{Em}/{rho}", "vflow", "m3h", out="E", key=True)
        sec.calc("Blowdown", f"{Bm}/{rho}", "vflow", "m3h", out="B", key=True)
        sec.calc("Drift", f"{Dm}/{rho}", "vflow", "m3h", out="D")
        sec.calc("Makeup water", f"{Mm}/{rho}", "vflow", "m3h", out="M", key=True)
        sec.calc("Evaporation as % of circulation", f"100*{Em}/{mc}", "pct", "pct", out="Epct")
        ap = sec.calc("Approach", f'IF({blank(E["twb"])},"",{E["tcold"]}-{E["twb"]})', "dtemp", "k", "T_cold − T_wb", out="approach")
        sec.calc("Tower effectiveness", f'IF({blank(E["twb"])},"",100*{rng}/({rng}+{ap}))', "pct", "pct", out="eff")
        sec.calc("Annual makeup", f'IF({blank(E["hours"])},"",{Mm}/{rho}*{E["hours"]})', "volume", "m3", out="annual")

    elif key == "cooling-water/exchanger":
        cf = f"{E['flow']}=1"
        sec.chk(f"IF({cf},OR({E['thi']}<={E['tco']},{E['tho']}<={E['tci']}),OR({E['thi']}<={E['tci']},{E['tho']}<={E['tco']}))", "A temperature cross: the hot side must stay hotter than the cold side at both ends for this arrangement.")
        sec.chk(f"OR({E['thi']}<={E['tho']},{E['tco']}<={E['tci']})", "The hot side must cool down and the cold side must warm up.")
        sec.chk(f"({blank(E['Q'])})+({blank(E['U'])})+({blank(E['A'])})<>1", "Leave exactly one of duty, U, or area blank.")
        d1 = sec.calc("ΔT₁", f"IF({cf},{E['thi']}-{E['tco']},{E['thi']}-{E['tci']})", "dtemp", "k")
        d2 = sec.calc("ΔT₂", f"IF({cf},{E['tho']}-{E['tci']},{E['tho']}-{E['tco']})", "dtemp", "k")
        lm = sec.calc("LMTD", f"IF(ABS({d1}-{d2})<1E-9,{d1},({d1}-{d2})/LN({d1}/{d2}))", "dtemp", "k", "(ΔT₁ − ΔT₂) ÷ ln(ΔT₁/ΔT₂)", out="lmtd")
        F = f"IF({blank(E['F'])},1,{E['F']})"
        sec.calc("Required area", f'IF({blank(E["A"])},{E["Q"]}/({E["U"]}/1000*{F}*{lm}),"")', "area", "m2", "A = Q ÷ (U F LMTD)", out="A", key=True)
        sec.calc("Overall heat transfer coefficient", f'IF({blank(E["U"])},{E["Q"]}*1000/({E["A"]}*{F}*{lm}),"")', "uval", "wm2k", out="U", key=True)
        sec.calc("Duty", f'IF({blank(E["Q"])},{E["U"]}/1000*{E["A"]}*{F}*{lm},"")', "power", "kw", out="Q", key=True)

    elif key == "chilled-water/chiller":
        Q, W, k = E["Q"], E["W"], E["kwt"]
        sec.chk(f"({blank(Q)})+({blank(W)})+({blank(k)})<>1", "Enter two of load, input power, and kW/ton, and leave the third blank.")
        Qs = sec.calc("Cooling load", f"IF({blank(Q)},{W}/{k}*{num(TON)},{Q})", "power", "tr", out="Q", key=True)
        Ws = sec.calc("Chiller input power", f"IF({blank(W)},{Q}/{num(TON)}*{k},{W})", "power", "kw", "W = tons × kW/ton", out="W", key=True)
        ks = sec.calc("Efficiency (kW per ton)", f"IF({blank(k)},{W}/({Q}/{num(TON)}),{k})", note="kW/ton = W ÷ tons", out="kwt", key=True)
        sec.calc("COP", f"{Qs}/{Ws}", note="COP = Q ÷ W", out="cop", key=True)
        sec.calc("EER (Btu/W·h)", f"12/{ks}", out="eer")
        sec.calc("Heat rejected to condenser water", f"{Qs}+{Ws}", "power", "kw", "Q + W", out="rej")
        kwh = sec.calc("Annual electricity", f'IF({blank(E["hours"])},"",{Ws}*IF({blank(E["lf"])},1,{E["lf"]}/100)*{E["hours"]}/3600)', "energy", "kwh", out="kwh")
        sec.calc("Annual electricity cost", f'IF(OR({blank(E["hours"])},{blank(E["price"])}),"",{kwh}*{E["price"]})', "money", out="cost", key=True)

    elif key == "process-water/demand":
        fac = unit("vflow", "m3h")["factor"]
        first, last = sec.list_block(lambda r: {"E": f'=IF(ISNUMBER(B{r}),B{r}*{num(fac)}*IF(ISNUMBER(C{r}),C{r},1),0)', "G": f'=IF(ISNUMBER(B{r}),B{r}*{num(fac)}*IF(ISNUMBER(C{r}),C{r},1)*IF(ISNUMBER(D{r}),MIN(MAX(D{r},0),100),0)/100,0)'})
        cons = sec.calc("Total consumption", f"SUM($E${first}:$E${last})", "vflow", "m3h", "Σ flow × quantity", out="cons")
        recy = sec.calc("Recycled or returned", f"SUM($G${first}:$G${last})", "vflow", "m3h", out="recy")
        loss = sec.calc("Losses", f"{cons}*{nz(E['loss'])}/100", "vflow", "m3h", out="losses")
        net = sec.calc("Net makeup", f"{cons}-{recy}+{loss}", "vflow", "m3h", "Consumption − Recycle + Losses", out="net", key=True)
        des = sec.calc("Design makeup (with margin)", f"{net}*(1+{nz(E['margin'])}/100)", "vflow", "m3h", out="design", key=True)
        raw = sec.calc("Raw water to treatment", f'IF({blank(E["rec"])},"",{des}/({E["rec"]}/100))', "vflow", "m3h", "Raw = Product ÷ recovery", out="raw", key=True)
        sec.calc("Treatment reject / brine", f'IF({blank(E["rec"])},"",{raw}-{des})', "vflow", "m3h", out="reject")

    elif key == "process-water/pipe":
        rho, mu = liq(sec, E["t"], nliq, "rho"), liq(sec, E["t"], nliq, "mu")
        u = sec.calc("Velocity", f"{E['V']}/(PI()*{E['d']}^2/4)", "vel", "ms", "u = V̇ ÷ A", out="u", key=True)
        Re = sec.calc("Reynolds number", f"{rho}*{u}*{E['d']}/({mu}/1000)", note="Re = ρuD ÷ μ", out="Re")
        rr = sec.calc("Relative roughness ε/D", f"{E['eps']}/{E['d']}", helper=True)
        f = sec.calc("Swamee-Jain starting value", f"0.25/LOG10({rr}/3.7+5.74/{Re}^0.9)^2", helper=True)
        for k in range(8):
            f = sec.calc(f"Colebrook iteration {k + 1}", f"(-2*LOG10({rr}/3.7+2.51/({Re}*SQRT({f}))))^-2", helper=True)
        ff = sec.calc("Darcy friction factor", f"IF({Re}<2300,64/{Re},{f})", note="64/Re if laminar, Colebrook otherwise", out="f")
        vh = sec.calc("Velocity head u²/2g", f"{u}^2/(2*{num(G)})", "head", "m")
        hf = sec.calc("Pipe friction loss", f"{ff}*{E['len']}/{E['d']}*{vh}", "head", "m", "h_f = f (L/D) u²/2g", out="hf")
        hk = sec.calc("Fitting loss", f"{nz(E['K'])}*{vh}", "head", "m", "h_K = ΣK u²/2g")
        sec.calc("Friction pressure drop (pipe + fittings)", f"({hf}+{hk})*{rho}*{num(G)}/1000", "dp", "kpa", out="dpf", key=True)
        sec.calc("Friction loss per 100 m of pipe", f"{hf}/{E['len']}*100*{rho}*{num(G)}/1000", "dp", "kpa", out="dp100")
        sec.calc("Total head the pump must add", f"{hf}+{hk}+{nz(E['dz'])}+{nz(E['dp'])}*1000/({rho}*{num(G)})", "head", "m", "H = h_f + h_K + Δz + ΔP/ρg", out="H", key=True)

    elif key == "process-water/pump":
        rho20 = liq(sec, "20", nliq, "rho", "At 20 °C: ")
        rho = sec.calc("Density used", f"IF({blank(E['rho'])},{rho20},{E['rho']})", "rho", "kgm3")
        Ph = sec.calc("Hydraulic power", f"{rho}*{num(G)}*{E['V']}*{E['H']}/1000", "power", "kw", "ρ g V̇ H", out="Ph")
        Ps = sec.calc("Shaft (brake) power", f"{Ph}/({E['ep']}/100)", "power", "kw", "P_hyd ÷ ηp", out="Ps", key=True)
        Pe = sec.calc("Electrical input", f"{Ps}/IF({blank(E['em'])},1,{E['em']}/100)", "power", "kw", "P_shaft ÷ ηm", out="Pe", key=True)
        kwh = sec.calc("Annual electricity", f'IF({blank(E["hours"])},"",{Pe}*{E["hours"]}/3600)', "energy", "kwh", out="kwh")
        sec.calc("Annual electricity cost", f'IF(OR({blank(E["hours"])},{blank(E["price"])}),"",{kwh}*{E["price"]})', "money", out="cost", key=True)

    elif key == "compressed-air/demand":
        fac = unit("gasflow", "nm3h")["factor"]
        first, last = sec.list_block(lambda r: {"E": f'=IF(ISNUMBER(B{r}),B{r}*{num(fac)}*IF(ISNUMBER(C{r}),C{r},1)*IF(ISNUMBER(D{r}),D{r},100)/100,0)', "G": f'=IF(ISNUMBER(B{r}),B{r}*{num(fac)}*IF(ISNUMBER(C{r}),C{r},1),0)'})
        avg = sec.calc("Average demand", f"SUM($E${first}:$E${last})", "gasflow", "nm3h", "Σ flow × qty × use %", out="avg")
        sec.calc("Connected (all at once) demand", f"SUM($G${first}:$G${last})", "gasflow", "nm3h", out="peak")
        sec.calc("Design compressor capacity", f"{avg}*(1+{nz(E['leak'])}/100)*(1+{nz(E['margin'])}/100)", "gasflow", "nm3h", out="design", key=True)

    elif key == "compressed-air/compressor":
        sec.chk(f"{E['p2']}<={E['p1']}", "Discharge pressure must be above inlet pressure.")
        sec.chk(f"AND(ISNUMBER({E['k']}),{E['k']}<=1)", "k must be greater than 1.")
        k = sec.calc("k used", f"IF({blank(E['k'])},1.4,{E['k']})")
        r = sec.calc("Pressure ratio per stage", f"({E['p2']}/{E['p1']})^(1/{E['N']})", note="r = (P₂/P₁)^(1/N)")
        e = sec.calc("(k − 1)/k", f"({k}-1)/{k}", helper=True)
        T1 = f"({E['t1']}+273.15)"
        Ws = sec.calc("Isentropic power", f"{E['N']}*({k}/({k}-1))*{E['n']}*{num(R)}*{T1}*({r}^{e}-1)/1000", "power", "kw", "N k/(k−1) ṅRT₁ (r^((k−1)/k) − 1)")
        Psh = sec.calc("Shaft power", f"{Ws}/({E['eta']}/100)", "power", "kw", out="Psh", key=True)
        Pe = sec.calc("Electrical input", f"{Psh}/IF({blank(E['em'])},1,{E['em']}/100)", "power", "kw", out="Pe", key=True)
        sec.calc("Stage discharge temperature", f"{T1}*(1+({r}^{e}-1)/({E['eta']}/100))-273.15", "temp", "c", out="T2")
        fad = sec.calc("Inlet (actual) flow, m³/min", f"{E['n']}*{num(R)}*{T1}/({E['p1']}*1000)*60", out="fad")
        sec.calc("Specific power", f"{Pe}/{fad}", "spower", "kwm3min", out="spec", key=True)
        sec.calc("Air mass flow", f"{E['n']}*{num(M_AIR)}", "mflow", "kgh", out="mass")
        kwh = sec.calc("Annual electricity", f'IF({blank(E["hours"])},"",{Pe}*{E["hours"]}/3600)', "energy", "kwh", out="kwh")
        sec.calc("Annual electricity cost", f'IF(OR({blank(E["hours"])},{blank(E["price"])}),"",{kwh}*{E["price"]})', "money", out="cost", key=True)

    elif key == "compressed-air/leaks":
        sec.chk(f"OR({E['on']}<0,{E['off']}<0,{E['on']}+{E['off']}<=0)", "Enter the on and off times (not negative).")
        pct = sec.calc("Leakage, % of compressor capacity", f"{E['on']}*100/({E['on']}+{E['off']})", "pct", "pct", "T × 100 ÷ (T + t)", out="pct", key=True)
        sec.calc("Leak flow", f'IF({blank(E["cap"])},"",{E["cap"]}*{pct}/100)', "gasflow", "nm3h", out="flow", key=True)
        lkw = sec.calc("Power going to leaks", f'IF({blank(E["kw"])},"",{E["kw"]}*{pct}/100)', "power", "kw", out="lkw")
        kwh = sec.calc("Annual energy lost to leaks", f'IF(OR({blank(E["kw"])},{blank(E["hours"])}),"",{lkw}*{E["hours"]}/3600)', "energy", "kwh", out="kwh")
        sec.calc("Annual cost of leaks", f'IF(OR({blank(E["kw"])},{blank(E["hours"])},{blank(E["price"])}),"",{kwh}*{E["price"]})', "money", out="cost", key=True)

    elif key == "compressed-air/hole":
        P0 = sec.calc("Line pressure (Pa abs)", f"{E['p0']}*1000", helper=True)
        Pa = sec.calc("Ambient pressure (Pa abs)", f"IF({blank(E['pa'])},101.325,{E['pa']})*1000", helper=True)
        T0 = f"({E['t0']}+273.15)"
        A = sec.calc("Hole area (m²)", f"PI()*{E['d']}^2/4", helper=True)
        sec.chk(f"{P0}<={Pa}", "Line pressure must be above the ambient pressure.")
        sec.chk(f"OR({E['cd']}<=0,{E['cd']}>1)", "The discharge coefficient must be more than 0 and no more than 1.")
        choked = f"{P0}/{Pa}>=1.2^3.5"
        m_ch = f"{E['cd']}*{A}*{P0}*SQRT(1.4*{num(M_AIR)}/({num(R)}*{T0}))*(2/2.4)^(2.4/0.8)"
        m_sub = f"{E['cd']}*{A}*{P0}*SQRT(2*{num(M_AIR)}*1.4/(0.4*{num(R)}*{T0})*(({Pa}/{P0})^(2/1.4)-({Pa}/{P0})^(2.4/1.4)))"
        m = sec.calc("Air lost", f"IF({choked},{m_ch},{m_sub})", "mflow", "kgh", "Choked: Cd A P₀ √(kM/RT₀)(2/(k+1))^((k+1)/(2(k−1)))", out="m")
        n = sec.calc("Air lost as free air", f"{m}/{num(M_AIR)}", "gasflow", "nm3h", out="n", key=True)
        fad = sec.calc("Free air at 20 °C, 1 atm (m³/min)", f"{n}*{num(R)}*293.15/101325*60", helper=True)
        kw = sec.calc("Compressor power wasted", f'IF({blank(E["spec"])},"",{E["spec"]}*{fad})', "power", "kw", out="kw")
        kwh = sec.calc("Annual energy wasted", f'IF(OR({blank(E["spec"])},{blank(E["hours"])}),"",{kw}*{E["hours"]}/3600)', "energy", "kwh", out="kwh")
        sec.calc("Annual cost of this leak", f'IF(OR({blank(E["spec"])},{blank(E["hours"])},{blank(E["price"])}),"",{kwh}*{E["price"]})', "money", out="cost", key=True)

    elif key == "compressed-air/receiver":
        sec.chk(f"{E['p1']}<={E['p2']}", "Start pressure must be above the lowest acceptable pressure.")
        sec.chk(f"({blank(E['V'])})+({blank(E['t'])})<>1", "Leave either the volume or the duration blank.")
        dP = sec.calc("Pressure band ΔP (Pa)", f"({E['p1']}-{E['p2']})*1000", helper=True)
        RT = sec.calc("R × T (J/mol)", f"{num(R)}*({E['T']}+273.15)", helper=True)
        sec.calc("Receiver volume", f'IF({blank(E["V"])},{E["t"]}*{E["n"]}*{RT}/{dP},"")', "volume", "m3", "V = t ṅ R T ÷ ΔP", out="V", key=True)
        sec.calc("Time the receiver can supply", f'IF({blank(E["t"])},{E["V"]}*{dP}/({E["n"]}*{RT}),"")', "time", "min", "t = V ΔP ÷ (ṅ R T)", out="t", key=True)

    elif key == "nitrogen/pressurize":
        sec.chk(f"{E['p2']}<={E['p1']}", "Final pressure must be above the starting pressure.")
        n = sec.calc("Moles of nitrogen", f"{E['V']}*({E['p2']}-{E['p1']})*1000/({num(R)}*({E['T']}+273.15))", note="n = V ΔP ÷ RT (mol)")
        sec.calc("Nitrogen required (Nm³, 0 °C, 1 atm)", f"{n}*{num(NM3)}", out="nm3", key=True)
        sec.calc("Nitrogen mass (kg)", f"{n}*{num(M_N2)}", out="kg", key=True)
        sec.calc("Nitrogen required (scf, 60 °F, 14.696 psia)", f"{n}*{num(R)}*288.70556/101325/0.3048^3", out="scf")
        sec.calc("Fill time at the supply rate", f'IF({blank(E["rate"])},"",{n}/{E["rate"]})', "time", "min", out="t")

    elif key == "nitrogen/pressure-purge":
        cs = nz(E["cs"])
        sec.chk(f"{E['ph']}<={E['pl']}", "Pressurize-to pressure must be above the vent-down pressure.")
        sec.chk(f"OR({E['ct']}<={cs},{E['ct']}>={E['c0']})", "The target must be between the nitrogen supply's oxygen and the starting oxygen.")
        ratio = sec.calc("P_H ÷ P_L", f"{E['ph']}/{E['pl']}")
        jx = sec.calc("Cycles (exact)", f"LN(({E['c0']}-{cs})/({E['ct']}-{cs}))/LN({ratio})", note="ln(ΔC₀/ΔC) ÷ ln(P_H/P_L)")
        j = sec.calc("Cycles needed", f"ROUNDUP({jx}-1E-9,0)", "count", "n", out="j", key=True)
        sec.calc("Oxygen after the last cycle", f"{cs}+({E['c0']}-{cs})*(1/{ratio})^{j}", "pct", "pct", out="cf", key=True)
        nc = sec.calc("Nitrogen per cycle (mol)", f"{E['V']}*({E['ph']}-{E['pl']})*1000/({num(R)}*({E['T']}+273.15))")
        sec.calc("Total nitrogen (Nm³)", f"{nc}*{j}*{num(NM3)}", out="nm3", key=True)
        sec.calc("Total nitrogen (kg)", f"{nc}*{j}*{num(M_N2)}", out="kg")

    elif key == "nitrogen/sweep-purge":
        cs = nz(E["cs"])
        sec.chk(f"OR({E['ct']}<={cs},{E['ct']}>={E['c0']})", "The target must be between the nitrogen supply's oxygen and the starting oxygen.")
        sec.chk(f"AND(ISNUMBER({E['k']}),OR({E['k']}<=0,{E['k']}>1))", "The mixing factor K must be more than 0 and no more than 1.")
        vols = sec.calc("Vessel volumes of nitrogen", f"LN(({E['c0']}-{cs})/({E['ct']}-{cs}))/IF({blank(E['k'])},1,{E['k']})", note="(1/K) ln(ΔC₀/ΔC)", out="vols", key=True)
        n = sec.calc("Nitrogen (mol)", f"{vols}*{E['V']}*101325/({num(R)}*({nz(E['T'])}+273.15))")
        sec.calc("Nitrogen (Nm³)", f"{n}*{num(NM3)}", out="nm3", key=True)
        sec.calc("Purge time", f'IF({blank(E["rate"])},"",{n}/{E["rate"]})', "time", "min", out="t", key=True)

    elif key == "nitrogen/blanketing":
        n = sec.calc("Nitrogen for pump-out", f"{E['pump']}*{E['pb']}*1000/({num(R)}*({E['T']}+273.15))", "gasflow", "nm3h", "ṅ = V̇ P ÷ RT", out="pumpout")
        sec.calc("Peak regulator capacity", f"{n}+{nz(E['thermal'])}", "gasflow", "nm3h", out="peak", key=True)
        sec.calc("Annual pump-out nitrogen (Nm³)", f'IF({blank(E["hours"])},"",{n}*{E["hours"]}*{num(NM3)})', out="annual")

    elif key == "hot-oil/heater":
        fuel = sec.calc("Fuel input", f"{E['Q']}/({E['eff']}/100)", "power", "kw", "Q ÷ η", out="fuel", key=True)
        sec.calc("Fuel flow", f'IF({blank(E["hv"])},"",{fuel}/{E["hv"]})', "mflow", "kgh", out="mf", key=True)
        sec.calc("Annual fuel", f'IF({blank(E["hours"])},"",{fuel}*{E["hours"]}/3600)', "energy", "gj", out="annual")
        sec.calc("Annual fuel cost", f'IF(OR({blank(E["hours"])},{blank(E["price"])}),"",{fuel}*{E["hours"]}/1000000*{E["price"]})', "money", out="cost", key=True)
    else:
        raise SystemExit(f"No workbook formulas for {key}")


def build():
    _NUMBER_DV.clear()
    wb = Workbook()
    ws0 = wb.active
    ws0.title = "Read Me"
    nsat, nliq = 0, 0
    readme_rows = [
        ("AirPermitHub Plant Utility Calculations", F_TITLE),
        (f"Version {VERSION}, built {date.today().isoformat()}. Companion to airpermithub.com/tools/utility-calculators", F_SMALL),
        ("", None),
        ("How to use", F_H),
        ("1. Type your values in the yellow cells, in the units shown in column C. Leave optional cells blank.", None),
        ("2. Results are the blue rows; the most important ones are bold. Grey intermediate steps are hidden: select the rows around them, right-click, and choose Unhide to see them.", None),
        ("   Only the yellow cells accept typing, and only numbers. Every formula is locked so it cannot be overwritten by mistake. The 'Input check' row under each section's inputs says OK, or names the value to fix.", None),
        ("3. Where a section says 'leave blank to solve', leave exactly one of those cells blank and it is calculated.", None),
        ("4. Column E holds every value in SI units; the formulas work in SI so any unit conversion is visible.", None),
        ("5. Column F holds keys the website uses to import this workbook. Do not edit or move them.", None),
        ("6. To check your numbers, use Import Excel on the website: it reloads your inputs, recalculates, and lists any result that differs.", None),
        ("", None),
        ("Methods", F_H),
        ("Water and steam properties: IAPWS-IF97 (region 1 and 2 equations on the IF97 sheet; saturation and liquid tables on the Water Tables sheet).", None),
        ("Water viscosity: IAPWS 2008. Pipe friction: Darcy-Weisbach with the Colebrook-White friction factor (8 iterations from Swamee-Jain).", None),
        ("Gas amounts: ideal gas law with R = 8.314462618 J/mol·K; Nm³ at 0 °C and 101.325 kPa; scf at 60 °F and 14.696 psia.", None),
        ("No emission factors, regulatory limits, or vendor data are built in. Enter your own and record their sources.", None),
        ("", None),
        (DISCLAIMER, F_SMALL),
    ]
    for i, (t, f) in enumerate(readme_rows, start=1):
        c = ws0.cell(row=i, column=1, value=t)
        if f:
            c.font = f
        c.alignment = Alignment(wrap_text=True, vertical="top")
    ws0.column_dimensions["A"].width = 130
    sheets = []
    for u in D["utilities"]:
        ws = wb.create_sheet(u["sheet"])
        sheets.append((u, ws))
    nsat, nliq = tables_sheet(wb)
    C = if97_sheet(wb)
    contents_row = len(readme_rows) + 2
    ws0.cell(row=contents_row, column=1, value="Sheets").font = F_H
    for u, ws in sheets:
        contents_row += 1
        c = ws0.cell(row=contents_row, column=1, value=f"{u['sheet']}: " + ", ".join(s["title"] for s in u["sections"]))
        c.hyperlink = f"#'{u['sheet']}'!A1"
        c.font = F_LINK
        ws["A1"] = u["name"]
        ws["A1"].font = F_TITLE
        ws["A2"] = "Yellow = your inputs. Blue = results (bold = main answers). Grey = intermediate steps. Engineering aid; check every input and unit."
        ws["A2"].font = F_SMALL
        row = 4
        for s in u["sections"]:
            sec = Sec(ws, row, u, s)
            sec.header()
            sec.inputs_block()
            sec.reserve_check()
            build_section(sec, C, nsat, nliq)
            row = sec.done() + 1
        ws.column_dimensions["A"].width = 52
        ws.column_dimensions["B"].width = 16
        ws.column_dimensions["C"].width = 22
        ws.column_dimensions["D"].width = 48
        ws.column_dimensions["E"].width = 14
        ws.column_dimensions["F"].width = 34
        ws.column_dimensions["G"].hidden = True
        ws.sheet_properties.outlinePr.summaryBelow = False
        for r in range(1, ws.max_row + 1):
            if ws.row_dimensions[r].outlineLevel:
                ws.row_dimensions[r].hidden = True
        ws.freeze_panes = "A4"
    for ws in wb.worksheets:
        lock(ws)
    wb.calculation.fullCalcOnLoad = True
    return wb


def save(wb, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    print(f"wrote {path}")


def fill(path, out, cases):
    """cases: {(slug, section): (values, lists)}; values {id: {v, unit} | None}."""
    wb = load_workbook(path)
    for u in D["utilities"]:
        ws = wb[u["sheet"]]
        keys = {}
        for r in range(1, ws.max_row + 1):
            k = ws.cell(row=r, column=6).value
            if isinstance(k, str):
                keys[k] = r
        for s in u["sections"]:
            if (u["slug"], s["id"]) not in cases:
                continue
            values, lists = cases[(u["slug"], s["id"])]
            for i in s["inputs"]:
                ev = values.get(i["id"])
                cell = ws.cell(row=keys[f"in:{u['slug']}.{s['id']}.{i['id']}"], column=2)
                if ev is None:
                    cell.value = i["choices"][0]["value"] if i["choices"] else None
                    continue
                if i["choices"]:
                    cell.value = ev["v"]
                else:
                    off = ev["unit"].get("offset", 0) or 0
                    si = (ev["v"] + off) * ev["unit"]["factor"]
                    cell.value = si / i["unit"]["factor"] - (i["unit"].get("offset", 0) or 0)
            if s["list"] and lists:
                for n, row in enumerate(lists[s["list"]["id"]]):
                    r = keys[f"list:{u['slug']}.{s['id']}.{s['list']['id']}.{n}"]
                    for j, v in enumerate(row):
                        ws.cell(row=r, column=1 + j, value=v)
    wb.save(out)


def recalc_compare(path, cases, expected, tmp, tag, flagged=None):
    """flagged: {(slug, section): text expected in its input check}; other filled sections must read OK."""
    filled = tmp / f"{tag}.xlsx"
    fill(path, filled, cases)
    outdir = tmp / f"out-{tag}"
    outdir.mkdir()
    subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", str(outdir), str(filled)], check=True, capture_output=True, timeout=300)
    wb = load_workbook(outdir / f"{tag}.xlsx", data_only=True)
    bad, checked = 0, 0
    for u in D["utilities"]:
        ws = wb[u["sheet"]]
        got = {}
        for r in range(1, ws.max_row + 1):
            k = ws.cell(row=r, column=6).value
            if isinstance(k, str) and k.startswith("out:"):
                got[k] = ws.cell(row=r, column=5).value
            if isinstance(k, str) and k.startswith("chk:"):
                sk = tuple(k[4:].split(".", 1))
                msg = ws.cell(row=r, column=2).value
                want = (flagged or {}).get(sk)
                if sk in cases and want is None and msg != "OK":
                    print(f"  [{tag}] input check should be OK at {u['sheet']}!B{r}: {msg!r}")
                    bad += 1
                elif want is not None and (not isinstance(msg, str) or want not in msg):
                    print(f"  [{tag}] input check at {u['sheet']}!B{r} should contain {want!r}, got {msg!r}")
                    bad += 1
                elif want is not None:
                    checked += 1
            v = ws.cell(row=r, column=2).value
            if isinstance(v, str) and v.startswith("#"):
                print(f"  [{tag}] error value {v} at {u['sheet']}!B{r}")
                bad += 1
        for s in u["sections"]:
            exp_s = expected.get((u["slug"], s["id"]))
            if not exp_s:
                continue
            for rid, exp in exp_s.items():
                k = f"out:{u['slug']}.{s['id']}.{rid}"
                if k not in got:
                    print(f"  [{tag}] MISSING in workbook: {k}")
                    bad += 1
                    continue
                si = got[k]
                checked += 1
                if not isinstance(si, (int, float)):
                    print(f"  [{tag}] {k}: workbook gave {si!r}, site {exp['si']}")
                    bad += 1
                    continue
                diff = abs(si - exp["si"]) / max(abs(exp["si"]), 1e-9)
                if diff > 0.005 and abs(si - exp["si"]) > 1e-9:
                    print(f"  [{tag}] {k}: workbook {si:.6g} vs site {exp['si']:.6g} ({diff * 100:.3f} %)")
                    bad += 1
    return bad, checked


def verify(path):
    tmp = Path(tempfile.mkdtemp())
    ex_cases, ex_expected = {}, {}
    for u in D["utilities"]:
        for s in u["sections"]:
            ex_cases[(u["slug"], s["id"])] = (s["example"]["values"], s["example"]["lists"])
            ex_expected[(u["slug"], s["id"])] = s["exampleResults"]
    bad, checked = recalc_compare(path, ex_cases, ex_expected, tmp, "examples")
    # Variants: one per section per round.
    rounds = []
    for v in D["variants"]:
        k = (v["slug"], v["section"])
        for rd in rounds:
            if k not in rd:
                rd[k] = v
                break
        else:
            rounds.append({k: v})
    for n, rd in enumerate(rounds):
        cases = {k: (v["values"], None) for k, v in rd.items()}
        expected = {k: v["results"] for k, v in rd.items()}
        b, c = recalc_compare(path, cases, expected, tmp, f"variants{n}")
        bad += b
        checked += c
    # Impossible inputs: each must be named in that section's input check.
    def val(fam, uid, v):
        return {"v": v, "unit": unit(fam, uid)}
    bad_inputs = [
        ("cooling-water", "flow", {"Q": val("power", "kw", 50000), "V": val("vflow", "m3h", 100), "tin": val("temp", "c", 30)}, "above 100"),
        ("cooling-water", "flow", {"Q": val("power", "kw", 1200), "tin": val("temp", "c", 40), "tout": val("temp", "c", 30)}, "must be higher"),
        ("steam", "heating", {"mp": val("mflow", "kgh", 20000), "cp": val("cp", "kjkgk", 4.18), "t1": val("temp", "c", 30), "t2": val("temp", "c", 160), "ps": val("pabs", "barg", 4)}, "cannot heat"),
        ("steam", "flash", {"mc": val("mflow", "kgh", 5000), "p1": val("pabs", "barg", 1), "p2": val("pabs", "barg", 10)}, "must be lower"),
        ("cooling-water", "exchanger", {"thi": val("temp", "c", 80), "tho": val("temp", "c", 40), "tci": val("temp", "c", 30), "tco": val("temp", "c", 85), "flow": {"v": 1, "unit": None}, "Q": val("power", "kw", 1000), "U": val("uval", "wm2k", 500)}, "temperature cross"),
        ("process-water", "pump", {"V": val("vflow", "m3h", 50), "H": val("head", "m", 36), "ep": val("pct", "pct", 0)}, "more than 0 %"),
        ("process-water", "pipe", {"V": val("vflow", "m3h", 50), "d": val("diam", "mm", 0), "len": val("length", "m", 200), "eps": val("rough", "mm", 0.045), "t": val("temp", "c", 25)}, "greater than zero"),
        ("nitrogen", "pressure-purge", {"V": val("volume", "m3", 20), "ph": val("pabs", "barg", 4), "pl": val("pabs", "barg", 0.2), "T": val("temp", "c", 25), "c0": val("pct", "pct", 20.9), "ct": val("pct", "pct", 0.4), "cs": val("pct", "pct", 0.5)}, "between"),
        ("compressed-air", "receiver", {"n": val("gasflow", "nm3min", 10), "p1": val("pabs", "barg", 6), "p2": val("pabs", "barg", 7), "T": val("temp", "c", 30), "t": val("time", "min", 2)}, "Start pressure"),
        ("hot-oil", "heater", {"Q": val("power", "kw", 1500), "eff": val("pct", "pct", 120)}, "no more than 100"),
    ]
    for n, (sl, sid, vals, want) in enumerate(bad_inputs):
        b, c = recalc_compare(path, {(sl, sid): (vals, None)}, {}, tmp, f"bad{n}", {(sl, sid): want})
        bad += b
        checked += c
    print(f"verify: {checked} results and input checks compared, {bad} problems")
    shutil.rmtree(tmp, ignore_errors=True)
    return bad


if __name__ == "__main__":
    wb = build()
    target = OUT / FNAME
    save(wb, target)
    if VERIFY:
        sys.exit(1 if verify(target) else 0)
