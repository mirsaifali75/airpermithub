/**
 * AirPermitHub Excel workbooks (public/workbooks/), built by
 * scripts/workbooks/build.py from the verbatim rule quotes in
 * src/lib/tools/rule-text.ts. Engineering aids, not agency forms: no emission
 * factors, and every threshold sits beside the rule text it comes from.
 */

export interface Workbook {
  slug: string;
  title: string;
  file: string;
  description: string;
  sheets: string[];
  /** Rules the workbook quotes. */
  cites: string[];
  /** Web version on this site, when there is one. */
  web?: { label: string; href: string };
}

export const WORKBOOK_VERSION = "1.1";

export const workbooks: Workbook[] = [
  {
    slug: "plant-utilities",
    title: "Plant Utility Calculations (steam, water, air, nitrogen, hot oil)",
    file: "airpermithub-plant-utilities.xlsx",
    description: "24 live-formula calculations: steam tables and steam loads, boiler fuel and blowdown, flash steam, cooling water and tower makeup, exchanger area, chilled water and chillers, water balance, pipe friction and pump power, compressed air power, leaks and receivers, nitrogen purging and blanketing, and hot oil. Steam properties use the IAPWS-IF97 equations inside Excel.",
    sheets: ["Steam", "Cooling Water", "Chilled Water", "Process Water", "Compressed Air", "Nitrogen", "Hot Oil", "Water Tables", "IF97"],
    cites: ["IAPWS-IF97", "IAPWS 2008 viscosity", "U.S. DOE steam, compressed air, and pumping sourcebooks"],
    web: { label: "Plant Utility Calculators", href: "/tools/utility-calculators" },
  },
  {
    slug: "oil-gas-calculators",
    title: "Oil and Gas Engineering Calculations (gas and oil properties, wells, chokes, pipelines, well control, lift)",
    file: "airpermithub-oil-gas-calculators.xlsx",
    description: "26 live-formula calculations in oilfield units: gas analysis to VOC and HAP weight %, Z-factor, Bg and viscosity, Standing bubble point and Bo, oil viscosity, productivity index and Vogel IPR, back-pressure AOF, static and flowing bottomhole pressure, gas well nodal analysis, Turner critical rate, Gilbert and gas chokes, gas and liquid line pressure drop, erosional velocity, separator sizing, tank gauging, kill sheet, annular velocity, rod pump and ESP sizing. Formulas are locked; only the yellow input cells accept entries.",
    sheets: ["Gas Properties", "Oil PVT", "Inflow (IPR)", "Gas Well", "Chokes", "Pipelines", "Separators and Tanks", "Drilling", "Artificial Lift"],
    cites: ["Dranchuk & Abou-Kassem (1975)", "Standing (1947)", "Vogel (1968)", "Rawlins & Schellhardt (USBM Monograph 7)", "Turner et al. (1969)", "Gilbert (1954)", "Colebrook (1939)", "40 CFR 51.100(s)"],
    web: { label: "Oil & Gas Engineering Calculators", href: "/tools/oil-gas-calculators" },
  },
  {
    slug: "synthetic-minor-limit-designer",
    title: "Synthetic Minor Limit Designer",
    file: "airpermithub-synthetic-minor-limit-designer.xlsx",
    description: "Uncontrolled and limited PTE by unit (enforceable controls, hours, throughput, caps), facility totals against Title V, PSD, and HAP thresholds for your area, and an enforceability record with an EPA-guidance checklist.",
    sheets: ["Thresholds", "Sources", "Summary", "Documentation"],
    cites: ["40 CFR 70.2", "40 CFR 52.21(b)(1)", "40 CFR 63.2", "EPA PTE guidance (1989, 1995)"],
    web: { label: "Synthetic Minor Limit Designer", href: "/tools/synthetic-minor-limit-designer" },
  },
  {
    slug: "hap-major-source-tracker",
    title: "HAP Major Source Tracker",
    file: "airpermithub-hap-major-source-tracker.xlsx",
    description: "HAP potential to emit by unit with enforceable controls. Each HAP is summed across the site against the single-HAP threshold, and all HAP against the combined threshold.",
    sheets: ["HAP Inventory", "Summary", "Thresholds"],
    cites: ["40 CFR 63.2", "40 CFR 70.2", "40 CFR 63.760(c)"],
    web: { label: "HAP Major Source Tracker", href: "/tools/hap-major-source-tracker" },
  },
  {
    slug: "nsr-baseline-project-increase",
    title: "NSR Baseline & Project Emissions Increase",
    file: "airpermithub-nsr-baseline-project-increase.xlsx",
    description: "24-month baseline windows with length and lookback checks, Step 1 project emissions increase by unit (new and existing, PTE election, excludable emissions), and the sum by pollutant against the significance table.",
    sheets: ["Settings", "Baseline Data", "Project Increase", "Step 1 Summary"],
    cites: ["40 CFR 52.21(a)(2)(iv)", "40 CFR 52.21(b)(23)(i)", "40 CFR 52.21(b)(41)", "40 CFR 52.21(b)(48)"],
    web: { label: "NSR Baseline Calculator", href: "/tools/nsr-baseline-calculator" },
  },
  {
    slug: "oil-gas-applicability-pte",
    title: "Oil & Gas Applicability and PTE Workbook",
    file: "airpermithub-oil-gas-applicability-pte.xlsx",
    description: "Engines, tanks, flares, dehydrators, fugitives, and other units with controlled PTE, the rules to screen for each, and facility totals and HAP by name against the federal major source thresholds.",
    sheets: ["Equipment PTE", "Facility Summary", "Thresholds"],
    cites: ["40 CFR 70.2", "40 CFR 63.2", "40 CFR 63.6585(b)", "40 CFR 60.5365b(e)", "40 CFR 60.18"],
    web: { label: "Applicability Checker", href: "/applicability" },
  },
  {
    slug: "deviation-prompt-reporting-tracker",
    title: "Deviation & Prompt Reporting Tracker",
    file: "airpermithub-deviation-prompt-reporting-tracker.xlsx",
    description: "Deviation log with cause and corrective action. Prompt report deadlines are calculated from the periods you enter from your permit (hours or days, from discovery or start), with due, overdue, on-time, and late status.",
    sheets: ["Prompt Rules", "Deviation Log"],
    cites: ["40 CFR 70.6(a)(3)(iii)", "40 CFR 70.6(c)(5)"],
    web: { label: "Deviation & Prompt Reporting Tracker", href: "/tools/deviation-log" },
  },
  {
    slug: "emission-inventory-template",
    title: "Emission Inventory Template",
    file: "airpermithub-emission-inventory-template.xlsx",
    description: "Annual actual emissions by unit and pollutant from activity, emission factor (lb per activity unit), and control, or from another method you name. Totals by pollutant and HAP by name.",
    sheets: ["Inventory", "Summary"],
    cites: [],
    web: { label: "Emission Inventory Builder", href: "/tools/emission-inventory" },
  },
  {
    slug: "cam-plan-builder",
    title: "CAM Plan Builder",
    file: "airpermithub-cam-plan-builder.xlsx",
    description: "Screen each pollutant-specific emissions unit against the three 40 CFR 64.2(a) criteria, then record indicators, ranges, performance criteria, and excursion response, with the 64.4(a) submittal checklist.",
    sheets: ["CAM Applicability", "CAM Plan Details", "Checklist"],
    cites: ["40 CFR 64.1", "40 CFR 64.2", "40 CFR 64.3(a)", "40 CFR 64.4(a)"],
    web: { label: "CAM Plan Builder", href: "/tools/cam-plan-builder" },
  },
  {
    slug: "nsps-neshap-applicability-matrix",
    title: "NSPS / NESHAP Applicability Matrix",
    file: "airpermithub-nsps-neshap-applicability-matrix.xlsx",
    description: "A record of which subparts were screened for each unit and why. Twenty rules' applicability text is quoted from eCFR on the Rule Reference sheet and fills in beside each row.",
    sheets: ["Matrix", "Rule Reference"],
    cites: ["40 CFR Parts 60 and 63 (20 subparts)"],
    web: { label: "Applicability Checker", href: "/applicability" },
  },
];
