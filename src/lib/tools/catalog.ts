import { converters } from "./converters";

/**
 * Practitioner tools, each framed by the everyday problem it answers. Used by
 * the tools hub, the home page, search, and the sitemap.
 */

export type ToolIcon = "rolling" | "nsr" | "matrix" | "deviation" | "convert" | "updates" | "glossary" | "finder" | "calc" | "applicability";

export interface ToolEntry {
  slug: string;
  href: string;
  name: string;
  /** The question a practitioner is asking when they need this tool. */
  problem: string;
  /** One-sentence summary; also the meta description. */
  description: string;
  icon: ToolIcon;
  keywords: string;
}

export const coreTools: ToolEntry[] = [
  {
    slug: "applicability-checker",
    href: "/applicability",
    name: "Applicability Checker",
    problem: "Which NSPS, NESHAP, and permit thresholds could apply to this engine, tank, or site, and why?",
    description: "Screen a facility and its equipment against NSPS, NESHAP, Title V, PSD, and GHG reporting thresholds. Each result shows the reason, the rule text it rests on, and what to confirm.",
    icon: "applicability",
    keywords: "applicability screening threshold title v threshold nsps neshap iiii jjjj zzzz db dc ddddd jjjjjj kb kc kkkk oooo oooob ooooc engine boiler tank turbine major source area source psd ghg reporting",
  },
  {
    slug: "rolling-12-month-tracker",
    href: "/tools/rolling-12-month-tracker",
    name: "Rolling 12-Month Limit Tracker",
    problem: "Are we going to bust a 12-month rolling limit, and how much room is left next month?",
    description: "Track any 12-month rolling sum or average against a permit limit. See every window, the months that drive it, next month's headroom, and when a forecast crosses the limit.",
    icon: "rolling",
    keywords: "12 month rolling total calculator rolling sum average synthetic minor limit tpy throughput headroom forecast",
  },
  {
    slug: "nsr-baseline-calculator",
    href: "/tools/nsr-baseline-calculator",
    name: "NSR Baseline & Project Emissions Calculator",
    problem: "Is this project a major modification? Which 24-month baseline period helps us most?",
    description: "Find the highest eligible consecutive 24-month baseline across all units in a project, then run the actual-to-projected-actual and hybrid tests against the significance value you enter.",
    icon: "nsr",
    keywords: "nsr baseline actual emissions 24 month lookback projected actual emissions major modification psd significant emissions increase demand growth exclusion hybrid test",
  },
  {
    slug: "compliance-matrix-builder",
    href: "/tools/compliance-matrix-builder",
    name: "Permit Compliance Matrix Builder",
    problem: "How do I turn a 150-page operating permit into tracked tasks with owners?",
    description: "Paste permit conditions. Get a compliance matrix with suggested requirement types, frequencies, citations, and deadline phrases, then export it or send dates to the Compliance Calendar.",
    icon: "matrix",
    keywords: "compliance matrix title v permit conditions tracker monitoring recordkeeping reporting requirements spreadsheet",
  },
  {
    slug: "deviation-log",
    href: "/tools/deviation-log",
    name: "Title V Deviation Log",
    problem: "What deviated this reporting period, why, and did we report it?",
    description: "Log deviations as they happen with cause, corrective action, and prompt-report dates. Entries group by your permit's reporting periods and export for the semiannual report.",
    icon: "deviation",
    keywords: "deviation log title v deviation report semiannual monitoring report excess emissions corrective action annual compliance certification",
  },
  {
    slug: "converters",
    href: "/tools#converters",
    name: "Stack Test & Unit Converters",
    problem: "The test report is in ppm at measured O2. The permit limit is in lb/hr or lb/MMBtu.",
    description: "ppm to lb/hr, O2 correction, ppm to lb/MMBtu with F-factors, g/hp-hr, tons per year, mg/m³, and wet to dry, with every step shown.",
    icon: "convert",
    keywords: "unit converter ppm lb/hr o2 correction lb/mmbtu f factor stack test",
  },
  {
    slug: "regulatory-updates",
    href: "/regulatory-updates",
    name: "Federal Air Rule Tracker",
    problem: "What did EPA publish this week, and which comment periods are closing?",
    description: "New EPA final and proposed rules for NSPS, NESHAP, SIPs, Title V, GHG reporting, and NAAQS, pulled from the Federal Register with comment deadlines.",
    icon: "updates",
    keywords: "federal register epa air rules proposed rule final rule comment period sip approval nsps neshap update tracker",
  },
  {
    slug: "glossary",
    href: "/glossary",
    name: "Air Permitting Glossary",
    problem: "What exactly does “potential to emit” or “major modification” mean, and where is it defined?",
    description: "Plain-language definitions of air permitting terms, each linked to the regulation that defines it.",
    icon: "glossary",
    keywords: "glossary definitions air permitting terms acronyms pte bact laer psd title v",
  },
];

export const converterTools: ToolEntry[] = converters.map((c) => ({
  slug: c.slug,
  href: `/tools/${c.slug}`,
  name: c.name,
  problem: c.intro,
  description: c.description,
  icon: "convert",
  keywords: c.keywords,
}));

/** Every tool with its own page (converters individually, not the hub anchor). */
export const allToolPages = [...coreTools.filter((t) => t.slug !== "converters"), ...converterTools];
