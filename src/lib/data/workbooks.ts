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
  },
  {
    slug: "cam-plan-builder",
    title: "CAM Plan Builder",
    file: "airpermithub-cam-plan-builder.xlsx",
    description: "Screen each pollutant-specific emissions unit against the three 40 CFR 64.2(a) criteria, then record indicators, ranges, performance criteria, and excursion response, with the 64.4(a) submittal checklist.",
    sheets: ["CAM Applicability", "CAM Plan Details", "Checklist"],
    cites: ["40 CFR 64.1", "40 CFR 64.2", "40 CFR 64.3(a)", "40 CFR 64.4(a)"],
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
