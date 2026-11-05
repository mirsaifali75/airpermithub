"""
Builds the AirPermitHub Excel workbooks in public/workbooks/.

Every threshold and rule quote in these workbooks comes from
src/lib/tools/rule-text.ts (verbatim eCFR / EPA text, checked by the snapshot
test and the monthly source check). Run after changing a quote:

    node scripts/workbooks/export-quotes.mjs > /tmp/rt.json
    python3 -I scripts/workbooks/build.py /tmp/rt.json public/workbooks

Requires openpyxl. No emission factors are written into any workbook.
"""

import json
import sys
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RT_PATH, OUT = sys.argv[1], Path(sys.argv[2])
D = json.loads(Path(RT_PATH).read_text())
RT, PSD = D["RT"], D["psd"]
VERSION = "1.1"
BUILT = date.today().isoformat()

NAVY = "0B2545"
F_TITLE = Font(bold=True, size=14, color=NAVY)
F_H = Font(bold=True, color="FFFFFF")
F_B = Font(bold=True)
F_SMALL = Font(size=9, color="555555")
F_LINK = Font(color="1463D9", underline="single")
FILL_H = PatternFill("solid", fgColor=NAVY)
FILL_IN = PatternFill("solid", fgColor="FFF6D6")  # inputs
FILL_CALC = PatternFill("solid", fgColor="EEF3FA")  # formulas
FILL_Q = PatternFill("solid", fgColor="F4F6F8")
THIN = Side(style="thin", color="C9D2DC")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
RED = PatternFill("solid", fgColor="FBD5D5")
AMBER = PatternFill("solid", fgColor="FDEBC8")
GREEN = PatternFill("solid", fgColor="D7F2E3")

DISCLAIMER = (
    "AirPermitHub provides educational, engineering, research, and compliance-support information. "
    "Information provided by the platform does not constitute legal advice and should not replace review of applicable "
    "regulations, permits, agency guidance, or consultation with qualified professionals."
)
LABEL = "AirPermitHub engineering aid (not an agency form). Screening and documentation aid, not a regulatory determination."


def ecfr(cite):
    import re
    m = re.match(r"40 CFR (\d+\.\d+[a-zA-Z]*)((?:\([0-9a-zA-Z]+\))*)", cite)
    if not m:
        return None
    sec, par = m.group(1), m.group(2)
    return f"https://www.ecfr.gov/current/title-40/section-{sec}" + (f"#p-{sec}{par}" if par else "")


def qurl(q):
    return q.get("url") or ecfr(q["cite"])


def widths(ws, ws_widths):
    for i, w in enumerate(ws_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def header(ws, row, labels, notes=None):
    for i, l in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=l)
        c.font, c.fill, c.alignment, c.border = F_H, FILL_H, Alignment(wrap_text=True, vertical="center"), BOX
        if notes and notes.get(i):
            c.comment = Comment(notes[i], "AirPermitHub")
    ws.row_dimensions[row].height = 32
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def area(ws, r1, r2, cols, fill):
    for r in range(r1, r2 + 1):
        for c in cols:
            cell = ws.cell(row=r, column=c)
            cell.fill, cell.border = fill, BOX


def dv_list(ws, items, rng, allow_blank=True):
    dv = DataValidation(type="list", formula1='"' + ",".join(items) + '"', allow_blank=allow_blank)
    ws.add_data_validation(dv)
    dv.add(rng)


def title(ws, text, sub=None):
    ws["A1"] = text
    ws["A1"].font = F_TITLE
    ws["A2"] = sub or LABEL
    ws["A2"].font = F_SMALL


def instructions(wb, name, purpose, steps, quotes, notes=()):
    ws = wb.active
    ws.title = "Instructions"
    widths(ws, [110])
    r = 1
    ws.cell(row=r, column=1, value=f"AirPermitHub: {name}").font = F_TITLE
    r += 1
    ws.cell(row=r, column=1, value=f"Version {VERSION}, built {BUILT}. {LABEL}").font = F_SMALL
    r += 2
    for head, body in [("Purpose", [purpose]), ("How to use", steps)]:
        ws.cell(row=r, column=1, value=head).font = F_B
        r += 1
        for b in body:
            ws.cell(row=r, column=1, value=b).alignment = WRAP
            r += 1
        r += 1
    ws.cell(row=r, column=1, value="Color key: yellow cells are your inputs; blue cells are formulas (do not overwrite). No emission factors or results are prefilled.").font = F_SMALL
    r += 2
    if notes:
        ws.cell(row=r, column=1, value="Notes").font = F_B
        r += 1
        for n in notes:
            ws.cell(row=r, column=1, value=n).alignment = WRAP
            r += 1
        r += 1
    ws.cell(row=r, column=1, value="Rule text this workbook follows (verbatim; follow the link for the current text)").font = F_B
    r += 1
    for q in quotes:
        c = ws.cell(row=r, column=1, value=f"“{q['text']}”")
        c.alignment, c.fill = WRAP, FILL_Q
        r += 1
        link = ws.cell(row=r, column=1, value=q["cite"] if len(q["cite"]) < 60 else q["cite"])
        u = qurl(q)
        if u:
            link.hyperlink, link.font = u, F_LINK
        r += 2
    ws.cell(row=r, column=1, value="Your state's SIP-approved rules may differ from the federal text. Confirm against the current eCFR, your permit, and your agency before relying on any result.").alignment = WRAP
    r += 2
    ws.cell(row=r, column=1, value="Disclaimer").font = F_B
    ws.cell(row=r + 1, column=1, value=DISCLAIMER).alignment = WRAP
    ws.cell(row=r + 3, column=1, value="Web version and updates: https://www.airpermithub.com/templates").font = F_SMALL
    return ws


def save(wb, fname):
    OUT.mkdir(parents=True, exist_ok=True)
    wb.properties.creator = "AirPermitHub"
    wb.properties.title = fname
    wb.save(OUT / fname)
    print("wrote", OUT / fname)


def status_formula(val, thr, margin):
    """AT OR ABOVE when val >= thr (the rules say 'or more'), NEAR inside the user's margin."""
    return f'=IF(OR({val}="",{thr}=""),"",IF({val}>={thr},"AT OR ABOVE",IF(AND(ISNUMBER({margin}),{margin}>0,{val}>={thr}*(1-{margin}/100)),"NEAR","UNDER")))'


def status_colors(ws, rng):
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"AT OR ABOVE"'], fill=RED))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"NEAR"'], fill=AMBER))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"UNDER"'], fill=GREEN))


CRITERIA = ["NOx", "CO", "VOC", "SO2", "PM10", "PM2.5", "PM"]
OZONE = ["Attainment or unclassifiable", "Marginal", "Moderate", "Serious", "Severe", "Extreme", "Not sure"]
OZ_TPY = {"Marginal": 100, "Moderate": 100, "Serious": 50, "Severe": 25, "Extreme": 10}


def settings_sheet(wb, with_psd=True):
    """Area settings and the Part 70 / PSD / HAP thresholds they select, each with its quote."""
    ws = wb.create_sheet("Thresholds")
    title(ws, "Area settings and federal major source thresholds")
    widths(ws, [44, 30, 16, 90])
    rows = [
        ("Ozone classification (VOC, NOx)", "Not sure", OZONE),
        ("Ozone transport region? (VOC)", "No", ["Yes", "No"]),
        ("Serious CO nonattainment area where stationary sources contribute significantly?", "No", ["Yes", "No"]),
        ("Serious PM-10 nonattainment area?", "No", ["Yes", "No"]),
        ("Listed PSD source category (40 CFR 52.21(b)(1)(i)(A))?", "Not sure", ["Yes", "No", "Not sure"]),
        ("Design margin (%) (your choice, not a rule value)", 10, None),
    ]
    ws["A4"], ws["B4"] = "Setting", "Your entry"
    header(ws, 4, ["Setting", "Your entry"])
    for i, (label, default, opts) in enumerate(rows, start=5):
        ws.cell(row=i, column=1, value=label).alignment = WRAP
        c = ws.cell(row=i, column=2, value=default)
        c.fill, c.border = FILL_IN, BOX
        if opts:
            dv_list(ws, opts, f"B{i}")
    # Ozone lookup
    ws["A13"] = "Ozone classification lookup (40 CFR 70.2)"
    ws["A13"].font = F_B
    for i, cl in enumerate(OZONE, start=14):
        ws.cell(row=i, column=1, value=cl)
        ws.cell(row=i, column=2, value=OZ_TPY.get(cl, 100))
    # Thresholds by pollutant
    r0 = 23
    header(ws, r0, ["Pollutant", "Title V threshold (tpy)", "PSD threshold (tpy)", "Basis (quoted below)"])
    ws.freeze_panes = None
    for i, p in enumerate(CRITERIA + ["Single HAP", "Combined HAP"], start=r0 + 1):
        ws.cell(row=i, column=1, value=p)
        oz = "VLOOKUP($B$5,$A$14:$B$20,2,FALSE)"
        if p == "NOx":
            tv = f"=MIN(100,{oz})"
        elif p == "VOC":
            tv = f'=MIN(100,{oz},IF($B$6="Yes",50,100))'
        elif p == "CO":
            tv = '=IF($B$7="Yes",50,100)'
        elif p == "PM10":
            tv = '=IF($B$8="Yes",70,100)'
        elif p == "Single HAP":
            tv = 10
        elif p == "Combined HAP":
            tv = 25
        else:
            tv = 100
        ws.cell(row=i, column=2, value=tv).fill = FILL_CALC
        if p in CRITERIA:
            ws.cell(row=i, column=3, value='=IF($B$9="No",250,100)').fill = FILL_CALC
        ws.cell(row=i, column=4, value={
            "NOx": "70.2: 100 tpy; lower in serious/severe/extreme ozone areas",
            "VOC": "70.2: 100 tpy; lower in serious/severe/extreme ozone areas and the ozone transport region",
            "CO": "70.2: 100 tpy; 50 tpy in serious CO areas as quoted",
            "PM10": "70.2: 100 tpy; 70 tpy in serious PM-10 areas",
            "Single HAP": "63.2 and 70.2: 10 tpy of any single HAP",
            "Combined HAP": "63.2 and 70.2: 25 tpy of any combination of HAP",
        }.get(p, "70.2: 100 tpy of any air pollutant subject to regulation")).alignment = WRAP
    ws.cell(row=r0 + 11, column=1, value='PSD column: 100 tpy for a listed category, 250 tpy otherwise; "Not sure" shows 100 so you see the lower value. PSD applies to pollutants for which the area is attainment or unclassifiable; for nonattainment pollutants check your state\'s nonattainment NSR rule.').alignment = WRAP
    ws.merge_cells(start_row=r0 + 11, start_column=1, end_row=r0 + 11, end_column=4)
    ws.row_dimensions[r0 + 11].height = 45
    r = r0 + 13
    ws.cell(row=r, column=1, value="Rule text (verbatim)").font = F_B
    for k in ["tvMajor100", "tvOzone", "tvOtr", "tvCoSerious", "tvPm10Serious", "tvHap", "hapMajor", "psdListed", "psd250"]:
        r += 1
        q = RT[k]
        c = ws.cell(row=r, column=4, value=f"“{q['text']}”")
        c.alignment, c.fill = WRAP, FILL_Q
        l = ws.cell(row=r, column=1, value=q["cite"])
        l.hyperlink, l.font = qurl(q), F_LINK
        ws.row_dimensions[r].height = max(30, 15 * (len(q["text"]) // 85 + 1))
    return ws


TV = {p: f"Thresholds!$B${24 + i}" for i, p in enumerate(CRITERIA + ["Single HAP", "Combined HAP"])}
PSDT = {p: f"Thresholds!$C${24 + i}" for i, p in enumerate(CRITERIA)}
MARGIN = "Thresholds!$B$10"


def hap_list(ws, r0, data_sheet, name_col, pol_col, val_col, unc_col=None, first=5, last=154, only_hap=True, n=20):
    """A list of HAP names the user types; each is summed across all rows of the data sheet."""
    ws.cell(row=r0, column=1, value="Each HAP, summed across all units (type each HAP name exactly as in the inventory)").font = F_B
    header(ws, r0 + 1, ["HAP name", "Site PTE (tpy)", "Threshold (tpy)", "Headroom (tpy)", "Status"])
    ws.freeze_panes = None
    rng = lambda col: f"'{data_sheet}'!${col}${first}:${col}${last}"
    for i in range(r0 + 2, r0 + 2 + n):
        ws.cell(row=i, column=1).fill = FILL_IN
        crit = f',{rng(pol_col)},"HAP"' if only_hap else ""
        ws.cell(row=i, column=2, value=f'=IF(A{i}="","",SUMIFS({rng(val_col)},{rng(name_col)},A{i}{crit}))').fill = FILL_CALC
        ws.cell(row=i, column=3, value=f'=IF(A{i}="","",{TV["Single HAP"]})').fill = FILL_CALC
        ws.cell(row=i, column=4, value=f'=IF(A{i}="","",C{i}-B{i})').fill = FILL_CALC
        ws.cell(row=i, column=5, value=status_formula(f"B{i}", f"C{i}", MARGIN)).fill = FILL_CALC
    end = r0 + 1 + n
    status_colors(ws, f"E{r0 + 2}:E{end}")
    crit_all = f',{rng(pol_col)},"HAP"' if only_hap else ""
    rows = [
        ("Highest single HAP (from the list)", f"=IF(COUNT(B{r0 + 2}:B{end})=0,\"\",MAX(B{r0 + 2}:B{end}))", TV["Single HAP"]),
        ("Unspeciated HAP (no name; counted in the combined total only)", f'=SUMIFS({rng(val_col)},{rng(name_col)},""{crit_all})', None),
        ("All HAP combined", f"=SUMIFS({rng(val_col)}{crit_all})" if only_hap else f"=SUM({rng(val_col)})", TV["Combined HAP"]),
    ]
    r = end + 2
    for label, f, thr in rows:
        ws.cell(row=r, column=1, value=label).font = F_B
        ws.cell(row=r, column=2, value=f).fill = FILL_CALC
        if thr:
            ws.cell(row=r, column=3, value=f"={thr}").fill = FILL_CALC
            ws.cell(row=r, column=4, value=f"=IF(B{r}=\"\",\"\",C{r}-B{r})").fill = FILL_CALC
            ws.cell(row=r, column=5, value=status_formula(f"B{r}", f"C{r}", MARGIN)).fill = FILL_CALC
            status_colors(ws, f"E{r}")
        r += 1
    check = r
    ws.cell(row=check, column=1, value="Check: named HAP not in the list above (tpy)").font = F_B
    ws.cell(row=check, column=2, value=f"=ROUND(B{end + 4}-B{end + 3}-SUM(B{r0 + 2}:B{end}),6)").fill = FILL_CALC
    ws.cell(row=check, column=3, value=f'=IF(B{check}>0,"Add every HAP name to the list, or the single-HAP check is incomplete","")')
    ws.conditional_formatting.add(f"B{check}", CellIsRule(operator="greaterThan", formula=["0"], fill=RED))
    return check


# ---------------------------------------------------------------- 1. Synthetic minor
def synthetic_minor():
    wb = Workbook()
    instructions(
        wb, "Synthetic Minor Limit Designer",
        "Design limits that keep a facility's potential to emit below the Title V, PSD, and HAP major source thresholds, and record what makes each limit enforceable. A design and documentation aid, not an applicability determination.",
        [
            "1. Thresholds: set the ozone classification and the other area questions. Thresholds update from the quoted 40 CFR 70.2, 52.21, and 63.2 text.",
            "2. Sources: one row per unit and pollutant. Enter uncontrolled PTE at full design capacity and 8,760 hr/yr from your own factors and method (column N).",
            "3. Control efficiency is a percent (95 means 95%). It reduces PTE only when column G is Yes (the control will be enforceable).",
            "4. Limit type: Hours = × hours/8,760. Throughput = × limit / full-capacity throughput (enter both, same units). Cap = the lower of the cap and the value before it. None = full capacity.",
            "5. Summary: totals by pollutant against Title V and PSD; each HAP summed by name against 10 tpy and all HAP against 25 tpy. A total equal to a threshold counts as AT OR ABOVE (the rules say 'or more').",
            "6. Documentation: record the condition, averaging period, monitoring, recordkeeping, and reporting for each limit, and work through the EPA guidance checklist.",
        ],
        [RT["ptePart70"], RT["pte95Elements"], RT["pte89TwoCriteria"]],
    )
    settings_sheet(wb)
    ws = wb.create_sheet("Sources")
    title(ws, "Emission units: uncontrolled PTE and proposed enforceable limits")
    widths(ws, [10, 22, 11, 16, 13, 11, 12, 12, 12, 11, 14, 14, 32, 30])
    header(ws, 4, ["Unit ID", "Description", "Pollutant", "HAP name (if HAP; blank = unspeciated)", "Uncontrolled PTE (tpy)", "Control efficiency (%)", "Control enforceable? (Yes/No)", "Limit type", "Limit value", "Limit units", "Full-capacity throughput (same units)", "Limited PTE (tpy)", "Check", "Emission factor / method (source)"])
    first, last = 5, 154
    area(ws, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14], FILL_IN)
    area(ws, first, last, [12, 13], FILL_CALC)
    dv_list(ws, CRITERIA + ["HAP"], f"C{first}:C{last}")
    dv_list(ws, ["Yes", "No"], f"G{first}:G{last}")
    dv_list(ws, ["None", "Hours", "Throughput", "Cap"], f"H{first}:H{last}")
    for r in range(first, last + 1):
        ctrl = f'E{r}*(1-IF(AND(G{r}="Yes",ISNUMBER(F{r})),F{r}/100,0))'
        ws.cell(row=r, column=12, value=(
            f'=IF(E{r}="","",IF(H{r}="Hours",IF(I{r}="","",{ctrl}*MIN(1,I{r}/8760)),'
            f'IF(H{r}="Throughput",IF(OR(I{r}="",K{r}="",K{r}=0),"",{ctrl}*MIN(1,I{r}/K{r})),'
            f'IF(H{r}="Cap",IF(I{r}="","",MIN(I{r},{ctrl})),{ctrl}))))'
        ))
        ws.cell(row=r, column=13, value=(
            f'=IF(E{r}="","",IF(AND(F{r}<>"",OR(F{r}<0,F{r}>100)),"Control % must be 0 to 100",'
            f'IF(AND(F{r}<>"",F{r}>0,G{r}<>"Yes"),"Control not enforceable: not applied",'
            f'IF(AND(H{r}="Throughput",OR(K{r}="",K{r}=0)),"Enter full-capacity throughput",'
            f'IF(AND(OR(H{r}="Hours",H{r}="Throughput",H{r}="Cap"),I{r}=""),"Enter the limit value",'
            f'IF(AND(C{r}="HAP",D{r}=""),"Unspeciated HAP: counts in total only",""))))))'
        ))
    ws.cell(row=last + 2, column=1, value="Limited PTE formulas: control = E × (1 − F/100) when G is Yes. Hours: control × MIN(1, I/8,760). Throughput: control × MIN(1, I/K). Cap: MIN(I, control). None: control.").font = F_SMALL

    sm = wb.create_sheet("Summary")
    title(sm, "Facility totals against federal major source thresholds")
    widths(sm, [34, 16, 16, 14, 14, 16, 14, 14, 16, 22])
    header(sm, 4, ["Pollutant", "Uncontrolled PTE (tpy)", "Limited PTE (tpy)", "Title V threshold", "Title V headroom", "Title V status", "PSD threshold", "PSD headroom", "PSD status", "Limits needed to stay under Title V?"])
    S = lambda col: f"Sources!${col}${first}:${col}${last}"
    for i, p in enumerate(CRITERIA, start=5):
        sm.cell(row=i, column=1, value=p)
        sm.cell(row=i, column=2, value=f'=SUMIFS({S("E")},{S("C")},A{i})')
        sm.cell(row=i, column=3, value=f'=SUMIFS({S("L")},{S("C")},A{i})')
        sm.cell(row=i, column=4, value=f"={TV[p]}")
        sm.cell(row=i, column=5, value=f"=D{i}-C{i}")
        sm.cell(row=i, column=6, value=status_formula(f"C{i}", f"D{i}", MARGIN))
        sm.cell(row=i, column=7, value=f"={PSDT[p]}")
        sm.cell(row=i, column=8, value=f"=G{i}-C{i}")
        sm.cell(row=i, column=9, value=status_formula(f"C{i}", f"G{i}", MARGIN))
        sm.cell(row=i, column=10, value=f'=IF(B{i}=0,"",IF(AND(B{i}>=D{i},C{i}<D{i}),"Yes: limits keep it under",IF(C{i}>=D{i},"Over even with limits","No")))')
    area(sm, 5, 11, range(2, 11), FILL_CALC)
    status_colors(sm, "F5:F11")
    status_colors(sm, "I5:I11")
    check = hap_list(sm, 14, "Sources", "D", "C", "L")
    sm.cell(row=check + 2, column=1, value="Overall").font = F_B
    sm.cell(row=check + 2, column=2, value=f'=IF(COUNTIF(F5:F11,"AT OR ABOVE")+COUNTIF(I5:I11,"AT OR ABOVE")+COUNTIF(E16:E{check - 1},"AT OR ABOVE")>0,"AT OR ABOVE a major source threshold",IF(COUNTIF(F5:F11,"NEAR")+COUNTIF(I5:I11,"NEAR")+COUNTIF(E16:E{check - 1},"NEAR")>0,"Under, but inside your design margin","Under every threshold compared"))')
    sm.cell(row=check + 3, column=1, value="Screening result only. Your state may have its own synthetic minor program, thresholds, and permit language.").font = F_SMALL

    doc = wb.create_sheet("Documentation")
    title(doc, "Enforceability record for each limit (for permit application support)")
    widths(doc, [10, 12, 44, 22, 28, 28, 28])
    header(doc, 4, ["Unit ID", "Pollutant", "Proposed enforceable condition", "Averaging period", "Monitoring", "Recordkeeping", "Reporting"])
    area(doc, 5, 44, range(1, 8), FILL_IN)
    r = 47
    doc.cell(row=r, column=1, value="Practical enforceability checklist (each item quotes EPA guidance)").font = F_B
    items = [
        ("Each limit states the limitation and units covered, the time period, and how compliance is determined", "pte95Elements"),
        ("Averaging period is as short as practical; any rolling period is justified", "pte95Averaging"),
        ("Where emissions are not measured directly, operating parameters are limited and monitored", "pte95Parameters"),
        ("Production and operational limits can each be enforced on their own", "pte89Independent"),
        ("Recordkeeping lets the agency verify compliance with each limit", "pte89Records"),
        ("Control efficiency claims carry the operating parameters and assumptions they rest on", "pte89Controls"),
        ("The limit will be federally enforceable and enforceable as a practical matter", "pte89TwoCriteria"),
    ]
    header(doc, r + 1, ["Done?", "Item", "", "EPA guidance text", "", "", "Source"])
    doc.freeze_panes = "A5"
    for i, (label, k) in enumerate(items, start=r + 2):
        doc.cell(row=i, column=1).fill = FILL_IN
        dv_list(doc, ["Yes", "No", "N/A"], f"A{i}")
        doc.cell(row=i, column=2, value=label).alignment = WRAP
        doc.merge_cells(start_row=i, start_column=2, end_row=i, end_column=3)
        c = doc.cell(row=i, column=4, value=f"“{RT[k]['text']}”")
        c.alignment, c.fill = WRAP, FILL_Q
        doc.merge_cells(start_row=i, start_column=4, end_row=i, end_column=6)
        l = doc.cell(row=i, column=7, value="1995 EPA memo" if "1995" in RT[k]["cite"] else "1989 EPA memo")
        l.hyperlink, l.font = RT[k]["url"], F_LINK
        doc.row_dimensions[i].height = max(45, 15 * (len(RT[k]["text"]) // 70 + 1))
    save(wb, "airpermithub-synthetic-minor-limit-designer.xlsx")


# ---------------------------------------------------------------- 2. HAP tracker
def hap_tracker():
    wb = Workbook()
    instructions(
        wb, "HAP Major Source Tracker",
        "Track potential to emit of each hazardous air pollutant (HAP), considering only enforceable controls, against the major source thresholds in 40 CFR 63.2, and document the basis for major or area source status.",
        [
            "1. HAP Inventory: one row per unit and HAP. Enter uncontrolled PTE (tpy) from your own factors and method, the control efficiency as a percent, and whether the control will be enforceable.",
            "2. Leave the HAP name blank only for unspeciated HAP; it counts in the combined total but cannot be checked against the single-HAP threshold.",
            "3. Summary: type each HAP name once in the list. Each is summed across all units and compared with 10 tpy; all HAP together with 25 tpy. The check row warns if a named HAP is missing from the list.",
            "4. The design margin on the Thresholds sheet only colors results near a threshold; it is your choice, not a rule value.",
        ],
        [RT["hapMajor"], RT["hapArea"], RT["tvHap"], RT["hapSurfaceSite"], RT["hhUpdate"]],
        notes=["Which units belong to the source is a separate question: 40 CFR 63.2 groups sources in a contiguous area under common control, and some subparts set their own aggregation (for oil and gas production, the surface site, as quoted below)."],
    )
    settings_sheet(wb)
    ws = wb.create_sheet("HAP Inventory")
    title(ws, "HAP emission units: uncontrolled PTE and PTE considering enforceable controls")
    widths(ws, [10, 24, 20, 12, 13, 12, 13, 15, 30, 30])
    header(ws, 4, ["Unit ID", "Description", "HAP name (blank = unspeciated)", "CAS No.", "Uncontrolled PTE (tpy)", "Control efficiency (%)", "Control enforceable? (Yes/No)", "PTE considering enforceable controls (tpy)", "Emission factor / method (source)", "Notes"])
    first, last = 5, 204
    area(ws, first, last, [1, 2, 3, 4, 5, 6, 7, 9, 10], FILL_IN)
    area(ws, first, last, [8], FILL_CALC)
    dv_list(ws, ["Yes", "No"], f"G{first}:G{last}")
    for r in range(first, last + 1):
        ws.cell(row=r, column=8, value=f'=IF(E{r}="","",E{r}*(1-IF(AND(G{r}="Yes",ISNUMBER(F{r}),F{r}>=0,F{r}<=100),F{r}/100,0)))')
    ws.conditional_formatting.add(f"F{first}:F{last}", FormulaRule(formula=[f'AND(F{first}<>"",OR(F{first}<0,F{first}>100))'], fill=RED))
    ws.cell(row=last + 2, column=1, value="Formula: H = E × (1 − F/100) when G is Yes and F is 0 to 100; otherwise H = E.").font = F_SMALL
    sm = wb.create_sheet("Summary")
    title(sm, "HAP major source status")
    widths(sm, [52, 16, 16, 16, 16])
    # A HAP-only inventory, so every row counts (no pollutant column).
    hap_list(sm, 4, "HAP Inventory", "C", None, "H", first=first, last=last, only_hap=False, n=30)
    save(wb, "airpermithub-hap-major-source-tracker.xlsx")


# ---------------------------------------------------------------- 3. Oil and gas
def oil_gas():
    wb = Workbook()
    instructions(
        wb, "Oil & Gas Applicability and PTE Workbook",
        "List oil and gas emission units (engines, tanks, flares, dehydrators, fugitives, and others), calculate PTE with enforceable controls, and compare facility totals with the federal major source thresholds. Record which rules each unit should be screened against.",
        [
            "1. Thresholds: set the area questions (ozone classification, transport region).",
            "2. Equipment PTE: one row per unit and pollutant. Enter uncontrolled PTE from your own factors, model, or measured data and name the source (column G).",
            "3. Control efficiency is a percent; it applies only when the control will be enforceable (column J = Yes).",
            "4. Column L: the rules to screen. Use the AirPermitHub Applicability Checker (airpermithub.com/applicability) for engines, tanks, compressors, pneumatics, fugitives, and dehydrators; it quotes each rule's applicability text.",
            "5. Facility Summary: totals by pollutant and each HAP by name against the quoted thresholds.",
        ],
        [RT["tvMajor100"], RT["hapMajor"], RT["hapSurfaceSite"], RT["o4bTankVoc"], RT["flareVe"]],
        notes=[
            "Rules commonly screened for oil and gas units (federal): NSPS Subparts OOOO, OOOOa, OOOOb (by construction, modification, or reconstruction date), and the OOOOc emission guidelines carried out through state plans; NSPS Subparts IIII and JJJJ (engines); NESHAP Subpart ZZZZ (engines); NESHAP Subpart HH (oil and natural gas production facilities, including glycol dehydrators); NESHAP Subpart HHH (transmission and storage); 40 CFR 60.18 (flares used to comply with Part 60 or 61 standards).",
            "State programs (for example Texas PBR and Standard Permits, New Mexico, Colorado Regulation 7) add their own requirements; see the state hub for your state on airpermithub.com.",
        ],
    )
    settings_sheet(wb)
    ws = wb.create_sheet("Equipment PTE")
    title(ws, "Oil and gas emission units: PTE calculation")
    widths(ws, [10, 14, 22, 14, 11, 16, 26, 13, 12, 13, 14, 26, 26])
    header(ws, 4, ["Unit ID", "Type", "Description", "Capacity / rating", "Pollutant", "HAP name (if HAP)", "Emission factor / method (source)", "Uncontrolled PTE (tpy)", "Control efficiency (%)", "Control enforceable? (Yes/No)", "Limited PTE (tpy)", "Rules to screen", "Notes"])
    first, last = 5, 154
    area(ws, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13], FILL_IN)
    area(ws, first, last, [11], FILL_CALC)
    dv_list(ws, ["Engine", "Turbine", "Heater / boiler", "Tank battery", "Flare", "Combustor", "Dehydrator", "Amine unit", "Compressor", "Pneumatics", "Fugitives", "Loading", "Other"], f"B{first}:B{last}")
    dv_list(ws, CRITERIA + ["HAP"], f"E{first}:E{last}")
    dv_list(ws, ["Yes", "No"], f"J{first}:J{last}")
    for r in range(first, last + 1):
        ws.cell(row=r, column=11, value=f'=IF(H{r}="","",H{r}*(1-IF(AND(J{r}="Yes",ISNUMBER(I{r}),I{r}>=0,I{r}<=100),I{r}/100,0)))')
    ws.cell(row=last + 2, column=1, value="Formula: K = H × (1 − I/100) when J is Yes and I is 0 to 100; otherwise K = H. Hours or throughput limits: use the Synthetic Minor Limit Designer workbook.").font = F_SMALL
    sm = wb.create_sheet("Facility Summary")
    title(sm, "Facility PTE against federal major source thresholds")
    widths(sm, [44, 16, 16, 14, 14, 16, 14, 16])
    header(sm, 4, ["Pollutant", "Limited PTE (tpy)", "Title V threshold", "Title V headroom", "Title V status", "PSD threshold", "PSD status", "Uncontrolled PTE (tpy)"])
    E = lambda col: f"'Equipment PTE'!${col}${first}:${col}${last}"
    for i, p in enumerate(CRITERIA, start=5):
        sm.cell(row=i, column=1, value=p)
        sm.cell(row=i, column=2, value=f'=SUMIFS({E("K")},{E("E")},A{i})')
        sm.cell(row=i, column=3, value=f"={TV[p]}")
        sm.cell(row=i, column=4, value=f"=C{i}-B{i}")
        sm.cell(row=i, column=5, value=status_formula(f"B{i}", f"C{i}", MARGIN))
        sm.cell(row=i, column=6, value=f"={PSDT[p]}")
        sm.cell(row=i, column=7, value=status_formula(f"B{i}", f"F{i}", MARGIN))
        sm.cell(row=i, column=8, value=f'=SUMIFS({E("H")},{E("E")},A{i})')
    area(sm, 5, 11, range(2, 9), FILL_CALC)
    status_colors(sm, "E5:E11")
    status_colors(sm, "G5:G11")
    hap_list(sm, 14, "Equipment PTE", "F", "E", "K", first=first, last=last)
    save(wb, "airpermithub-oil-gas-applicability-pte.xlsx")


# ---------------------------------------------------------------- 4. NSR
def nsr():
    wb = Workbook()
    nq = [
        {"cite": "40 CFR 52.21(b)(48)", "text": "Baseline actual emissions means the rate of emissions, in tons per year, of a regulated NSR pollutant"},
        {"cite": "40 CFR 52.21(b)(48)(i)", "text": "during any consecutive 24-month period selected by the owner or operator within the 5-year period"},
        {"cite": "40 CFR 52.21(b)(48)(ii)", "text": "within the 10-year period immediately preceding either the date the owner or operator begins actual construction"},
        {"cite": "40 CFR 52.21(b)(48)(ii)(D)", "text": "only one consecutive 24-month period must be used to determine the baseline actual emissions for"},
        {"cite": "40 CFR 52.21(b)(41)(ii)(C)", "text": "the unit's emissions following the project that an existing unit could have accommodated"},
        {"cite": "40 CFR 52.21(a)(2)(iv)(C)", "text": "A significant emissions increase of a regulated NSR pollutant is projected to occur if the sum of the difference"},
        RT["sigIntro"], RT["nsrTwoStep"],
    ]
    instructions(
        wb, "NSR Baseline and Project Emissions Increase Workbook",
        "Document baseline actual emissions for each unit in a project and calculate Step 1 of NSR project emissions accounting (the project's emissions increase) by pollutant, for the actual-to-projected-actual and hybrid tests. Step 2 (netting) decides whether a project with a significant emissions increase is a major modification.",
        [
            "1. Settings: enter the project date (the earlier of the date construction begins or the complete application, as your rule states) and whether decreases at project units count in Step 1 under the rule you follow.",
            "2. Baseline Data: one row per existing unit and pollutant. Enter the 24-month window and baseline actual emissions already adjusted as 52.21(b)(48) requires (for example, removing non-compliant emissions and emissions above limits that now apply). The window and lookback checks flag problems.",
            "3. Use one 24-month window for all units affected by the project for a given pollutant (quoted below).",
            "4. Project Increase: one row per unit and pollutant. New units have a baseline of zero. Excludable emissions (demand growth) apply only to existing units using projected actual emissions, never when PTE is used.",
            "5. Step 1 Summary: the increases are summed by pollutant and compared with the significance rate from the table. The table is verbatim from 52.21(b)(23)(i); your SIP-approved rule may differ.",
        ],
        nq,
    )
    st = wb.create_sheet("Settings")
    title(st, "Project settings")
    widths(st, [60, 22])
    st["A4"], st["B4"] = "Project date", None
    st["B4"].fill, st["B4"].number_format = FILL_IN, "yyyy-mm-dd"
    st["A5"], st["B5"] = "Count decreases at project units in Step 1? (Yes/No)", "No"
    st["B5"].fill = FILL_IN
    dv_list(st, ["Yes", "No"], "B5")
    st["A7"] = "Significance rates, 40 CFR 52.21(b)(23)(i) (verbatim rows)"
    st["A7"].font = F_B
    header(st, 8, ["Pollutant", "Rate (tpy)", "Rule text"])
    st.freeze_panes = None
    st.column_dimensions["C"].width = 70
    for i, row in enumerate(PSD, start=9):
        st.cell(row=i, column=1, value=row["pollutant"])
        st.cell(row=i, column=2, value=row["tpy"])
        st.cell(row=i, column=3, value=f"“{row['row']}”").fill = FILL_Q
    sig_last = 8 + len(PSD)
    l = st.cell(row=sig_last + 2, column=1, value="40 CFR 52.21(b)(23)(i) on eCFR")
    l.hyperlink, l.font = ecfr("40 CFR 52.21(b)(23)(i)"), F_LINK

    bd = wb.create_sheet("Baseline Data")
    title(bd, "Baseline actual emissions by unit and pollutant")
    widths(bd, [10, 22, 10, 13, 13, 11, 22, 16, 30])
    header(bd, 4, ["Unit ID", "Pollutant (as named in the significance table)", "EGU? (Yes/No)", "Window start", "Window end", "Window length (months)", "Window check", "Baseline actual emissions (tpy, adjusted per (b)(48))", "Data source / adjustments made"])
    first, last = 5, 104
    area(bd, first, last, [1, 2, 3, 4, 5, 8, 9], FILL_IN)
    area(bd, first, last, [6, 7], FILL_CALC)
    dv_list(bd, [r["pollutant"] for r in PSD][:8] + ["Other"], f"B{first}:B{last}")
    dv_list(bd, ["Yes", "No"], f"C{first}:C{last}")
    for r in range(first, last + 1):
        bd.cell(row=r, column=4).number_format = "yyyy-mm"
        bd.cell(row=r, column=5).number_format = "yyyy-mm"
        bd.cell(row=r, column=6, value=f'=IF(OR(D{r}="",E{r}=""),"",(YEAR(E{r})-YEAR(D{r}))*12+MONTH(E{r})-MONTH(D{r})+1)')
        bd.cell(row=r, column=7, value=(
            f'=IF(F{r}="","",IF(F{r}<>24,"Not 24 consecutive months",IF(Settings!$B$4="","Enter project date to check lookback",'
            f'IF(E{r}>=Settings!$B$4,"Ends on or after project date",IF(D{r}<EDATE(Settings!$B$4,IF(C{r}="Yes",-60,-120)),'
            f'IF(C{r}="Yes","Starts before the 5-year lookback","Starts before the 10-year lookback"),"OK")))))'
        ))
    bd.conditional_formatting.add(f"G{first}:G{last}", FormulaRule(formula=[f'AND(G{first}<>"",G{first}<>"OK")'], fill=AMBER))
    bd.cell(row=last + 2, column=1, value="Lookback: 5 years for electric utility steam generating units, 10 years for other existing units (quoted on Instructions). A state rule may allow a different period; adjust the check if so.").font = F_SMALL

    pi = wb.create_sheet("Project Increase")
    title(pi, "Step 1: project emissions increase by unit")
    widths(pi, [10, 22, 12, 14, 16, 14, 15, 15, 15])
    header(pi, 4, ["Unit ID", "Pollutant", "Unit (Existing/New)", "Baseline (tpy)", "Projected actual or PTE (tpy)", "Using PTE? (Yes/No)", "Excludable emissions (tpy)", "Difference (tpy)", "Counted in Step 1 (tpy)"])
    area(pi, first, last, [1, 2, 3, 5, 6, 7], FILL_IN)
    area(pi, first, last, [4, 8, 9], FILL_CALC)
    dv_list(pi, [r["pollutant"] for r in PSD][:8] + ["Other"], f"B{first}:B{last}")
    dv_list(pi, ["Existing", "New"], f"C{first}:C{last}")
    dv_list(pi, ["Yes", "No"], f"F{first}:F{last}")
    B = lambda col: f"'Baseline Data'!${col}${first}:${col}${last}"
    for r in range(first, last + 1):
        pi.cell(row=r, column=4, value=f'=IF(A{r}="","",IF(C{r}="New",0,SUMIFS({B("H")},{B("A")},A{r},{B("B")},B{r})))')
        pi.cell(row=r, column=8, value=f'=IF(OR(A{r}="",E{r}=""),"",E{r}-D{r}-IF(OR(C{r}="New",F{r}="Yes"),0,N(G{r})))')
        pi.cell(row=r, column=9, value=f'=IF(H{r}="","",IF(Settings!$B$5="Yes",H{r},MAX(0,H{r})))')
    pi.cell(row=last + 2, column=1, value="Formulas: D = baseline from Baseline Data (0 for new units). H = E − D − G (G ignored for new units and when PTE is used). I = H, or MAX(0, H) when decreases are not counted.").font = F_SMALL

    s1 = wb.create_sheet("Step 1 Summary")
    title(s1, "Step 1 result by pollutant")
    widths(s1, [34, 18, 18, 22, 60])
    header(s1, 4, ["Pollutant", "Project emissions increase (tpy)", "Significance rate (tpy)", "Significant emissions increase?", "Next step"])
    for i, row in enumerate(PSD, start=5):
        s1.cell(row=i, column=1, value=row["pollutant"])
        s1.cell(row=i, column=2, value=f"=SUMIFS('Project Increase'!$I${first}:$I${last},'Project Increase'!$B${first}:$B${last},A{i})")
        s1.cell(row=i, column=3, value=f"=VLOOKUP(A{i},Settings!$A$9:$B${sig_last},2,FALSE)")
        s1.cell(row=i, column=4, value=f'=IF(COUNTIF(\'Project Increase\'!$B${first}:$B${last},A{i})=0,"",IF(B{i}>=C{i},"YES","NO"))')
        s1.cell(row=i, column=5, value=f'=IF(D{i}="YES","Step 2: net emissions increase (contemporaneous increases and decreases) decides",IF(D{i}="NO","Not a significant emissions increase under Step 1",""))')
    area(s1, 5, 4 + len(PSD), range(2, 6), FILL_CALC)
    s1.conditional_formatting.add(f"D5:D{4 + len(PSD)}", CellIsRule(operator="equal", formula=['"YES"'], fill=RED))
    s1.cell(row=6 + len(PSD), column=1, value="A result equal to the rate counts as significant: the definition says “equal or exceed” (quoted on Instructions).").font = F_SMALL
    save(wb, "airpermithub-nsr-baseline-project-increase.xlsx")


# ---------------------------------------------------------------- 5. CAM
def cam():
    wb = Workbook()
    instructions(
        wb, "CAM Plan Builder (40 CFR Part 64)",
        "Screen pollutant-specific emissions units against the three CAM applicability criteria in 40 CFR 64.2(a), then document the monitoring approach that 64.4(a) asks for: indicators, indicator ranges, performance criteria, and how excursions are handled.",
        [
            "1. CAM applies only at a major source required to obtain a Part 70 or 71 permit (quoted below). Confirm that first.",
            "2. CAM Applicability: one row per unit and pollutant. Answer each 64.2(a) criterion and the 64.2(b)(1) exemption question. Pre-control PTE leaves out the control device's reduction.",
            "3. The major source amount for the pollutant is the Part 70 threshold for your area (for example 100 tpy, or lower in some nonattainment areas); enter it from the Synthetic Minor or Title V threshold sheet.",
            "4. CAM Plan Details: for each unit that meets all criteria, record the indicators, ranges, and performance criteria (64.3(b)), excursion definition, and response.",
        ],
        [RT["camApplies"], RT["camLimit"], RT["camControl"], RT["camPrecontrol"], RT["camPost1990"], RT["camContinuous"], RT["camIndicators"], RT["camRanges"], RT["camSubmit"], RT["camExcursion"], RT["camExceedance"]],
        notes=["Other 64.2(b) exemptions exist (stratospheric ozone, Acid Rain, emissions trading programs, certain emissions caps, and municipally owned backup utility units). Read 40 CFR 64.2(b) in full before relying on the screen."],
    )
    ws = wb.create_sheet("CAM Applicability")
    title(ws, "Pollutant-specific emissions units: 64.2(a) screen")
    widths(ws, [10, 12, 30, 16, 16, 16, 15, 15, 24, 30])
    header(ws, 4, ["Unit ID", "Pollutant", "Emission limitation or standard (citation)", "(a)(1) Subject to a non-exempt limit or standard? (Yes/No)", "Limit exempt under 64.2(b)(1)? (Yes/No)", "(a)(2) Uses a control device to comply? (Yes/No)", "(a)(3) Pre-control PTE (tpy)", "Major source amount (tpy)", "Screen result", "Notes"])
    first, last = 5, 64
    area(ws, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 10], FILL_IN)
    area(ws, first, last, [9], FILL_CALC)
    dv_list(ws, ["Yes", "No"], f"D{first}:F{last}")
    for r in range(first, last + 1):
        ws.cell(row=r, column=9, value=(
            f'=IF(OR(D{r}="",E{r}="",F{r}="",G{r}="",H{r}=""),"",IF(AND(D{r}="Yes",E{r}="No",F{r}="Yes",G{r}>=H{r}),'
            f'"Meets all 64.2(a) criteria","Does not meet all 64.2(a) criteria"))'
        ))
    ws.conditional_formatting.add(f"I{first}:I{last}", CellIsRule(operator="equal", formula=['"Meets all 64.2(a) criteria"'], fill=AMBER))
    ws.cell(row=last + 2, column=1, value="Result: all of (a)(1) Yes, not exempt, (a)(2) Yes, and pre-control PTE ≥ 100% of the major source amount. A screen only; the permitting authority decides.").font = F_SMALL
    pd = wb.create_sheet("CAM Plan Details")
    title(pd, "Monitoring approach for each unit that meets the criteria (64.3, 64.4(a))")
    widths(pd, [10, 11, 22, 24, 22, 22, 26, 18, 26, 28, 26])
    header(pd, 4, ["Unit ID", "Pollutant", "Control device", "Indicator(s) of performance (64.3(a)(1))", "Indicator range or designated condition (64.3(a)(2))", "Basis for the range (test data, design, history)", "Performance criteria: data representativeness, verification, QA/QC (64.3(b))", "Monitoring frequency and averaging period", "Excursion definition (departure from the range)", "Response to an excursion (corrective action, documentation)", "Records and reports"])
    area(pd, 5, 44, range(1, 12), FILL_IN)
    ck = wb.create_sheet("Checklist")
    title(ck, "CAM submittal checklist (40 CFR 64.4(a))")
    widths(ck, [10, 90])
    header(ck, 4, ["Done?", "Item"])
    items = [
        "The indicators to be monitored to satisfy § 64.3(a)(1)-(2);",
        "The ranges or designated conditions for such indicators, or the process by which such indicator ranges or designated conditions shall be established;",
        "The performance criteria for the monitoring to satisfy § 64.3(b); and",
        "If applicable, the indicator ranges and performance criteria for a CEMS, COMS or PEMS pursuant to § 64.3(d).",
    ]
    for i, t in enumerate(items, start=5):
        ck.cell(row=i, column=1).fill = FILL_IN
        dv_list(ck, ["Yes", "No", "N/A"], f"A{i}")
        ck.cell(row=i, column=2, value=f"“{t}” (40 CFR 64.4(a)({i - 4}))").alignment = WRAP
    l = ck.cell(row=11, column=2, value="40 CFR 64.4 on eCFR")
    l.hyperlink, l.font = ecfr("40 CFR 64.4"), F_LINK
    save(wb, "airpermithub-cam-plan-builder.xlsx")


# ---------------------------------------------------------------- 6. Deviations
def deviations():
    wb = Workbook()
    instructions(
        wb, "Deviation & Prompt Reporting Tracker",
        "Log deviations and excess emissions with cause and corrective action, and compute each prompt report deadline from the period your permit or state rule states.",
        [
            "1. Prompt Rules: enter each deadline exactly as your permit or rule states it: a name, the number, Hours or Days, counted from Discovery or Start, and where it is written. Nothing is prefilled: Part 70 leaves “prompt” to the permitting authority.",
            "2. Deviation Log: one row per deviation. Enter start, discovery (date and time if the rule is in hours), and pick the rule. The deadline and status calculate.",
            "3. Days are calendar days added to the date. Hours are added to the date and time. Business days or set reporting hours are not modeled: check those by hand.",
            "4. Status: Due, OVERDUE (today is past the deadline), On time, or Late (based on the date reported).",
        ],
        [RT["tvPrompt"], RT["tvSemiannual"], RT["tvCertDeviations"]],
    )
    pr = wb.create_sheet("Prompt Rules")
    title(pr, "Prompt reporting deadlines (from your permit or state rule)")
    widths(pr, [36, 12, 12, 16, 40])
    header(pr, 4, ["Rule name (as you will pick it in the log)", "Within", "Hours or Days", "Counted from (Discovery/Start)", "Where it is written (permit condition or rule citation)"])
    area(pr, 5, 24, range(1, 6), FILL_IN)
    dv_list(pr, ["Hours", "Days"], "C5:C24")
    dv_list(pr, ["Discovery", "Start"], "D5:D24")
    lg = wb.create_sheet("Deviation Log")
    title(lg, "Deviation and excess emission log")
    widths(lg, [6, 16, 16, 18, 10, 18, 10, 30, 26, 26, 14, 26, 18, 14, 14, 24])
    header(lg, 4, ["ID", "Start (date and time)", "End (date and time)", "Discovered (date and time)", "Unit ID", "Permit condition / requirement", "Pollutant", "What happened", "Probable cause", "Corrective action / preventive measures", "Date corrected", "Prompt reporting rule", "Prompt deadline", "Date reported", "Status", "Notes"])
    first, last = 5, 204
    area(lg, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16], FILL_IN)
    area(lg, first, last, [13, 15], FILL_CALC)
    dv = DataValidation(type="list", formula1="='Prompt Rules'!$A$5:$A$24", allow_blank=True)
    lg.add_data_validation(dv)
    dv.add(f"L{first}:L{last}")
    R = "'Prompt Rules'!$A$5:$D$24"
    for r in range(first, last + 1):
        for c in (2, 3, 4):
            lg.cell(row=r, column=c).number_format = "yyyy-mm-dd hh:mm"
        lg.cell(row=r, column=11).number_format = "yyyy-mm-dd"
        lg.cell(row=r, column=14).number_format = "yyyy-mm-dd"
        lg.cell(row=r, column=13).number_format = "yyyy-mm-dd hh:mm"
        base = f'IF(VLOOKUP(L{r},{R},4,FALSE)="Start",B{r},D{r})'
        lg.cell(row=r, column=13, value=(
            f'=IF(L{r}="","",IFERROR(IF({base}="","",IF(VLOOKUP(L{r},{R},3,FALSE)="Hours",{base}+VLOOKUP(L{r},{R},2,FALSE)/24,'
            f'INT({base})+VLOOKUP(L{r},{R},2,FALSE))),"Check rule"))'
        ))
        lg.cell(row=r, column=15, value=f'=IF(OR(M{r}="",M{r}="Check rule"),"",IF(N{r}<>"",IF(INT(N{r})<=INT(M{r}),"On time","Late"),IF(TODAY()>INT(M{r}),"OVERDUE","Due")))')
    lg.conditional_formatting.add(f"O{first}:O{last}", CellIsRule(operator="equal", formula=['"OVERDUE"'], fill=RED))
    lg.conditional_formatting.add(f"O{first}:O{last}", CellIsRule(operator="equal", formula=['"Late"'], fill=RED))
    lg.conditional_formatting.add(f"O{first}:O{last}", CellIsRule(operator="equal", formula=['"Due"'], fill=AMBER))
    lg.conditional_formatting.add(f"O{first}:O{last}", CellIsRule(operator="equal", formula=['"On time"'], fill=GREEN))
    lg.cell(row=last + 2, column=1, value="Deadline: Hours rules add hours to the date and time; Days rules add calendar days to the date. On time compares dates. Check business-day or fixed-hour rules by hand.").font = F_SMALL
    save(wb, "airpermithub-deviation-prompt-reporting-tracker.xlsx")


# ---------------------------------------------------------------- 7. Emission inventory
def inventory():
    wb = Workbook()
    instructions(
        wb, "Emission Inventory Template",
        "Facility-wide annual actual emissions by unit and pollutant, with the activity data, emission factor, control, and source for each line. A working template: submit inventories on your agency's own forms, system, and methods.",
        [
            "1. Inventory: one row per unit and pollutant. Enter the annual activity (fuel, throughput, hours) and the emission factor in pounds per unit of that activity, with its source.",
            "2. Control efficiency is a percent and applies only when the control operated as the factor or test assumes (column K = Yes).",
            "3. Actual emissions (tpy) = activity × factor (lb per activity unit) × (1 − control/100) ÷ 2,000 lb/ton. Factors in other units: convert to lb per activity unit first, or enter tpy from another method in column N and leave the factor blank.",
            "4. Summary: totals by pollutant and each HAP by name.",
        ],
        [],
        notes=["States set their own inventory pollutants, thresholds, and methods (for example TCEQ, NMED, CDPHE); this template does not reproduce any state form. No emission factors are included."],
    )
    ws = wb.create_sheet("Inventory")
    title(ws, "Annual emission inventory (actual emissions)")
    widths(ws, [10, 22, 10, 16, 14, 14, 16, 26, 12, 13, 12, 14, 14, 14, 24])
    header(ws, 4, ["Unit ID", "Description", "Pollutant", "HAP name (if HAP)", "Annual activity", "Activity units", "Emission factor (lb per activity unit)", "Factor source / citation", "Control efficiency (%)", "Control applies? (Yes/No)", "Calc check", "Calculated (tpy)", "Method (factor, CEMS, test, mass balance)", "Other-method value (tpy)", "Notes"])
    first, last = 5, 304
    area(ws, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15], FILL_IN)
    area(ws, first, last, [11, 12], FILL_CALC)
    dv_list(ws, CRITERIA + ["HAP", "CO2", "CH4", "Other"], f"C{first}:C{last}")
    dv_list(ws, ["Yes", "No"], f"J{first}:J{last}")
    for r in range(first, last + 1):
        ws.cell(row=r, column=12, value=f'=IF(N{r}<>"",N{r},IF(OR(E{r}="",G{r}=""),"",E{r}*G{r}*(1-IF(AND(J{r}="Yes",ISNUMBER(I{r})),I{r}/100,0))/2000))')
        ws.cell(row=r, column=11, value=f'=IF(AND(N{r}<>"",G{r}<>""),"Both a factor and an other-method value: other-method value used",IF(AND(I{r}<>"",OR(I{r}<0,I{r}>100)),"Control % must be 0 to 100",""))')
    ws.cell(row=last + 2, column=1, value="Formula: L = N if entered; otherwise E × G × (1 − I/100 when J is Yes) ÷ 2,000.").font = F_SMALL
    sm = wb.create_sheet("Summary")
    title(sm, "Facility total actual emissions")
    widths(sm, [40, 20, 40])
    header(sm, 4, ["Pollutant", "Total actual emissions (tpy)", "Notes"])
    I = lambda col: f"Inventory!${col}${first}:${col}${last}"
    for i, p in enumerate(CRITERIA + ["CO2", "CH4"], start=5):
        sm.cell(row=i, column=1, value=p)
        sm.cell(row=i, column=2, value=f'=SUMIFS({I("L")},{I("C")},A{i})').fill = FILL_CALC
    r0 = 17
    sm.cell(row=r0, column=1, value="HAP by name (type each HAP once)").font = F_B
    header(sm, r0 + 1, ["HAP name", "Total actual (tpy)"])
    sm.freeze_panes = None
    for i in range(r0 + 2, r0 + 32):
        sm.cell(row=i, column=1).fill = FILL_IN
        sm.cell(row=i, column=2, value=f'=IF(A{i}="","",SUMIFS({I("L")},{I("C")},"HAP",{I("D")},A{i}))').fill = FILL_CALC
    sm.cell(row=r0 + 33, column=1, value="All HAP combined").font = F_B
    sm.cell(row=r0 + 33, column=2, value=f'=SUMIFS({I("L")},{I("C")},"HAP")').fill = FILL_CALC
    save(wb, "airpermithub-emission-inventory-template.xlsx")


# ---------------------------------------------------------------- 8. NSPS / NESHAP matrix
REF = [
    ("NSPS IIII", "Stationary compression ignition engines", "60", "IIII", ["iiiiNew", "iiiiMfg", "iiiiMod"]),
    ("NSPS JJJJ", "Stationary spark ignition engines", "60", "JJJJ", ["jjjjNew", "jjjjBig", "jjjjLean", "jjjjSmall", "jjjjEmerg", "jjjjMod"]),
    ("NESHAP ZZZZ", "Stationary RICE (major and area sources)", "63", "ZZZZ", ["zzzzApplies", "zzzzExistArea"]),
    ("NSPS Db", "Steam generating units > 100 MMBtu/hr", "60", "Db", ["db"]),
    ("NSPS Dc", "Small steam generating units", "60", "Dc", ["dc"]),
    ("NESHAP DDDDD", "Boilers and process heaters at major sources", "63", "DDDDD", ["ddddd"]),
    ("NESHAP JJJJJJ", "Boilers at area sources", "63", "JJJJJJ", ["jjjjjj", "jjjjjjGas"]),
    ("NSPS GG", "Stationary gas turbines", "60", "GG", ["gg", "ggDate"]),
    ("NSPS KKKK", "Stationary combustion turbines", "60", "KKKK", ["kkkk"]),
    ("NSPS KKKKa", "Stationary combustion turbines (newer)", "60", "KKKKa", ["kkkka"]),
    ("NESHAP YYYY", "Stationary combustion turbines at major sources", "63", "YYYY", ["yyyy"]),
    ("NSPS Kb", "Volatile organic liquid storage vessels", "60", "Kb", ["kb", "kbCustody"]),
    ("NSPS Kc", "Volatile organic liquid storage vessels (newer)", "60", "Kc", ["kc", "kcCustody"]),
    ("NSPS OOOO", "Crude oil and natural gas (2011 to 2015 sources)", "60", "OOOO", ["o4Window"]),
    ("NSPS OOOOa", "Crude oil and natural gas (2015 to 2022 sources)", "60", "OOOOa", ["o4aWindow"]),
    ("NSPS OOOOb", "Crude oil and natural gas (after December 6, 2022)", "60", "OOOOb", ["o4bWindow", "o4bTank", "o4bTankVoc", "o4bTankCh4"]),
    ("EG OOOOc", "Existing oil and gas sources (state plans)", "60", "OOOOc", ["o4cWindow", "o4cPlan"]),
    ("NESHAP HH", "Oil and natural gas production facilities", "63", "HH", ["hh", "hhAreaTeg"]),
    ("NESHAP HHH", "Natural gas transmission and storage", "63", "HHH", ["hhh"]),
    ("60.18 flares", "General control device and work practice requirements (flares)", "60", None, ["flareVe", "flarePilot"]),
]


def matrix():
    wb = Workbook()
    instructions(
        wb, "NSPS / NESHAP Applicability Matrix",
        "Record, for each unit, which NSPS and NESHAP subparts were screened, the applicability text each rests on, the result, and what remains to confirm. The Rule Reference sheet quotes each subpart's applicability text from eCFR.",
        [
            "1. Matrix: one row per unit and rule screened. Enter the date that matters for the rule (construction, modification, or reconstruction; for engines, the order date) and its type.",
            "2. Pick the rule. The applicability text and eCFR link fill from the Rule Reference sheet. Compare your unit with the quoted dates and sizes.",
            "3. Record the result as Potentially applicable, Likely not applicable, or More information needed, and what would settle it. The workbook does not decide applicability.",
            "4. For a guided screen that compares your entries with each rule's dates and sizes, use the AirPermitHub Applicability Checker at airpermithub.com/applicability.",
        ],
        [],
        notes=["The Rule Reference quotes the main applicability paragraphs only. Exemptions, subcategories, and later amendments are in the full subpart; follow the link."],
    )
    rf = wb.create_sheet("Rule Reference")
    title(rf, "Applicability text by rule (verbatim from eCFR)")
    widths(rf, [16, 40, 110, 60])
    header(rf, 4, ["Rule", "Covers", "Applicability text (verbatim, with citation)", "eCFR link"])
    for i, (key, cover, part, sub, ks) in enumerate(REF, start=5):
        rf.cell(row=i, column=1, value=key).font = F_B
        rf.cell(row=i, column=2, value=cover).alignment = WRAP
        text = "\n".join(f"{RT[k]['cite']}: “{RT[k]['text']}”" for k in ks)
        c = rf.cell(row=i, column=3, value=text)
        c.alignment, c.fill = WRAP, FILL_Q
        url = f"https://www.ecfr.gov/current/title-40/part-{part}/subpart-{sub}" if sub else ecfr("40 CFR 60.18")
        l = rf.cell(row=i, column=4, value=url)
        l.hyperlink, l.font = url, F_LINK
        rf.row_dimensions[i].height = min(400, 15 * (len(text) // 100 + len(ks) + 1))
    ref_last = 4 + len(REF)
    mx = wb.create_sheet("Matrix")
    title(mx, "Equipment applicability screening record")
    widths(mx, [10, 22, 13, 15, 12, 12, 16, 16, 60, 22, 34, 40])
    header(mx, 4, ["Unit ID", "Equipment type", "Key date", "Date type", "Capacity / rating", "Units", "Fuel / material", "Rule screened", "Applicability text (from Rule Reference)", "Result", "What to confirm", "eCFR link"])
    first, last = 5, 154
    area(mx, first, last, [1, 2, 3, 4, 5, 6, 7, 8, 10, 11], FILL_IN)
    area(mx, first, last, [9, 12], FILL_CALC)
    dv_list(mx, ["Construction", "Modification", "Reconstruction", "Engine order date", "Manufacture date"], f"D{first}:D{last}")
    dv = DataValidation(type="list", formula1=f"='Rule Reference'!$A$5:$A${ref_last}", allow_blank=True)
    mx.add_data_validation(dv)
    dv.add(f"H{first}:H{last}")
    dv_list(mx, ["Potentially applicable", "Likely not applicable", "More information needed"], f"J{first}:J{last}")
    for r in range(first, last + 1):
        mx.cell(row=r, column=3).number_format = "yyyy-mm-dd"
        mx.cell(row=r, column=9, value=f"=IF(H{r}=\"\",\"\",IFERROR(VLOOKUP(H{r},'Rule Reference'!$A$5:$D${ref_last},3,FALSE),\"\"))").alignment = WRAP
        mx.cell(row=r, column=12, value=f"=IF(H{r}=\"\",\"\",IFERROR(VLOOKUP(H{r},'Rule Reference'!$A$5:$D${ref_last},4,FALSE),\"\"))")
    save(wb, "airpermithub-nsps-neshap-applicability-matrix.xlsx")


for fn in [synthetic_minor, hap_tracker, oil_gas, nsr, cam, deviations, inventory, matrix]:
    fn()
