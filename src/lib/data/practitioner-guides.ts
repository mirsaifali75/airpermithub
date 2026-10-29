import type { Guide } from "./guides";

/**
 * Practitioner guides: the recurring, hard parts of air permitting work.
 * Same editorial rules as guides.ts: no restated thresholds, limits, or
 * deadlines. Where a rule's wording matters, it is quoted verbatim from a
 * government source listed in `sources`.
 */

const ecfr = (section: string, para?: string) => `https://www.ecfr.gov/current/title-40/section-${section}${para ? `#p-${section}${para}` : ""}`;
const govinfo5221 = "https://www.govinfo.gov/content/pkg/CFR-2020-title40-vol3/pdf/CFR-2020-title40-vol3-sec52-21.pdf";

export const practitionerGuides: Guide[] = [
  {
    slug: "tracking-rolling-12-month-limits",
    title: "Tracking a 12-month rolling limit without surprises",
    summary: "How to read a rolling limit, build the monthly calculation once, and watch next month's headroom so a synthetic minor limit never catches you late.",
    category: "Compliance",
    scene: "midstream",
    readMinutes: 7,
    published: "2026-10-29",
    sections: [
      {
        heading: "Why rolling limits trip people up",
        paragraphs: [
          "A rolling limit is checked every month, not once a year. Each new month enters the total and the oldest month drops out, so a single high month stays in the number for the full window. A facility can look fine in December and be over in March without any one month looking unusual.",
          "Many synthetic minor limits take this form. Going over one can be a permit violation and can also put the source's minor status in question, which is a much bigger problem than a single exceedance.",
        ],
      },
      {
        heading: "Read the condition word by word",
        paragraphs: ["Before building anything, pull these answers out of the permit condition and its monitoring and recordkeeping terms:"],
        list: [
          "What is limited: emissions of a pollutant, throughput, fuel use, or operating hours",
          "Whether the limit is a rolling sum or a rolling average, and the length of the window",
          "Whether the window is calendar months or a rolling number of days",
          "The calculation method the permit requires: emission factors, CEMS data, mass balance, or a site-specific equation",
          "When each month's calculation must be completed and recorded, and how long records are kept",
          "Whether the limit applies at all times, including startup, shutdown, and malfunction",
        ],
      },
      {
        heading: "Build the calculation once",
        paragraphs: [
          "Set up one workbook or system in which monthly inputs (metered gas, fuel, production, hours) flow into monthly emissions using the permit's method, and monthly emissions flow into the rolling total. Keep each emission factor next to its source document and revision. Lock the formulas, and avoid re-typing numbers between files; most rolling-limit errors are transcription errors.",
          "When the permit requires a specific method, use it even if a better estimate exists. The record has to show compliance the way the permit defines it.",
        ],
      },
      {
        heading: "Watch the headroom, not just the total",
        paragraphs: [
          "The most useful number each month is how much the next month can be. For a rolling sum, that is the limit minus the months that will still be in next month's window. For a rolling average, multiply the limit by the window length first.",
          "Send that number to operations before the month starts. Operators can manage to a monthly budget; they can't manage to a rolling total they never see.",
        ],
      },
      {
        heading: "Forecast before it matters",
        paragraphs: [
          "Plug planned production, new wells or equipment, and scheduled maintenance into the coming months and see where the window lands. If a forecast crosses the limit, there is still time to change the plan, or to talk to the agency about an amendment before construction or operation that would need one.",
        ],
      },
      {
        heading: "When a month is missing or wrong",
        paragraphs: [
          "Follow the permit's substitute data or missing data provisions if it has them, and document what was used and why. When a past month is corrected, keep the original and the revision with dates rather than overwriting the record. If a correction pushes a past window over the limit, that is a deviation to evaluate and report as the permit requires.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 70.6: permit content, monitoring, and recordkeeping (eCFR)", url: ecfr("70.6") },
      { title: "40 CFR 52.21(b)(4): potential to emit (eCFR)", url: ecfr("52.21", "(b)(4)") },
    ],
    related: [
      { label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" },
      { label: "Potential to emit, explained", href: "/resources/potential-to-emit-explained" },
      { label: "lb/hr to tons/yr converter", href: "/tools/lb-hr-to-tpy" },
    ],
  },
  {
    slug: "choosing-an-nsr-baseline-period",
    title: "Choosing a baseline period for NSR project emissions accounting",
    summary: "How baseline actual emissions work, the rules on which months you can use, and how to pick and document the period before calculating a project's emissions increase.",
    category: "Federal Regulations",
    scene: "refinery",
    readMinutes: 9,
    published: "2026-10-29",
    sections: [
      {
        heading: "What the baseline does",
        paragraphs: [
          "For a project at an existing major source, Step 1 of the major modification test compares each unit's emissions after the project with its baseline actual emissions. A higher baseline means a smaller calculated increase, which is why the rule's choices about the baseline period matter so much.",
          "The federal PSD rule defines baseline actual emissions at 40 CFR 52.21(b)(48). Most states use the same structure in their SIP-approved rules, but read the version that applies to your project.",
        ],
      },
      {
        heading: "The window and the lookback",
        paragraphs: [
          "The baseline is an average annual rate over a window of consecutive months that the owner chooses, inside a lookback before the project. The federal rule describes it as an average rate “during any consecutive 24-month period selected by the owner or operator”, and the lookback differs for electric utility steam generating units and other existing units (40 CFR 52.21(b)(48)(i) and (ii)).",
          "For units other than electric utility steam generating units, the lookback runs back from a defined date: the rule refers to the period “immediately preceding either the date the owner or operator begins actual construction” or the date a complete application is received, whichever is earlier. Settle that date first; it fixes which months are eligible.",
        ],
      },
      {
        heading: "One window for all units, one per pollutant",
        paragraphs: [
          "When a project changes several units, the rule says “only one consecutive 24-month period must be used to determine the baseline actual emissions for” the units being changed. You can't pick each unit's best period separately. You can, however, use a different period for each pollutant: “A different consecutive 24-month period can be used” for each regulated NSR pollutant.",
          "So the real question is which single window gives the highest combined baseline for the units in the project, pollutant by pollutant. Scanning every eligible window answers it; the NSR Baseline Calculator does that scan.",
        ],
      },
      {
        heading: "Adjust the numbers before averaging",
        paragraphs: ["Read the adjustment provisions in (b)(48) for your unit type. For other existing units, the federal rule:"],
        list: [
          "Includes fugitive emissions to the extent quantifiable, and emissions from startups, shutdowns, and malfunctions",
          "Excludes emissions that were not in compliance with legally enforceable limits during the period",
          "Adjusts downward for emissions that would exceed limits the unit must currently meet, such as a newer standard",
          "Does not allow a period “for which there is inadequate information” for determining annual emissions",
        ],
      },
      {
        heading: "Projected actual emissions and the exclusion",
        paragraphs: [
          "On the other side of the comparison, projected actual emissions are the highest annual rate the unit is projected to emit in the period after the project that the rule specifies, based on all relevant information. The owner may exclude the part of “the unit's emissions following the project that an existing unit could have accommodated” during the baseline period and that is unrelated to the project, such as growth in demand (40 CFR 52.21(b)(41)(ii)(c)). Electing potential to emit instead removes that exclusion.",
          "Write down the basis for both numbers: data sources, business projections, and why any excluded emissions are unrelated to the project. That record is what an agency reviews.",
        ],
      },
      {
        heading: "Keep the record after the decision",
        paragraphs: [
          "Projects that rely on projected actual emissions can carry recordkeeping and, in some cases, reporting obligations for years after the change (see 40 CFR 52.21(r) and your state's rule). Put them on the compliance calendar the day the project is approved.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 52.21, 2020 edition (govinfo.gov), source of the quoted text", url: govinfo5221 },
      { title: "40 CFR 52.21, current text (eCFR)", url: ecfr("52.21") },
      { title: "EPA: New Source Review (NSR) Permitting", url: "https://www.epa.gov/nsr" },
    ],
    related: [
      { label: "NSR Baseline & Project Emissions Calculator", href: "/tools/nsr-baseline-calculator" },
      { label: "PSD vs. Nonattainment NSR vs. minor NSR", href: "/resources/psd-vs-minor-nsr" },
      { label: "Glossary: major modification", href: "/glossary#major-modification" },
    ],
  },
  {
    slug: "building-a-title-v-compliance-matrix",
    title: "Building a Title V compliance matrix that holds up in an inspection",
    summary: "Break the permit into individual requirements, give each one an owner, a frequency, and a record, and keep the matrix current through every permit revision.",
    category: "Compliance",
    scene: "chemical",
    readMinutes: 8,
    published: "2026-10-29",
    sections: [
      {
        heading: "Why a matrix",
        paragraphs: [
          "A Title V permit gathers every applicable requirement for a facility into one document, and most compliance problems are tracking problems: a monthly calculation nobody owned, a quarterly observation that moved with a staff change, a report that depended on a record nobody kept. A compliance matrix turns the permit into a list of tasks you can assign, check, and certify.",
        ],
      },
      {
        heading: "Break conditions into single requirements",
        paragraphs: [
          "One permit condition often holds several requirements: a limit, the monitoring that shows compliance, the record, and the report. Give each its own row. A row should be one thing a person can do and prove.",
        ],
        list: [
          "The requirement, in the permit's words",
          "The condition number and the underlying rule citation",
          "How compliance is demonstrated (calculation, monitoring, inspection, test)",
          "Frequency and the due date rule (for example, the permit's deadline after period end)",
          "Owner and backup",
          "The record that proves it, and where it is kept",
        ],
      },
      {
        heading: "Expand the requirements incorporated by reference",
        paragraphs: [
          "Permits often say a unit must comply with an NSPS or NESHAP subpart and stop there. The subpart and its general provisions bring their own monitoring, testing, notification, recordkeeping, and reporting requirements. Add rows for them; they are as enforceable as the permit's own text.",
        ],
      },
      {
        heading: "Connect it to reports and certifications",
        paragraphs: [
          "Periodic monitoring reports must identify every deviation in the period (40 CFR 70.6(a)(3)(iii)(A)), and the annual compliance certification asks for the method used to determine compliance with each term (40 CFR 70.6(c)(5)). If each row already names its method and record, both reports become an exercise in reading the matrix.",
        ],
      },
      {
        heading: "Keep it current",
        paragraphs: [
          "Update the matrix at every permit action: administrative amendments, minor and significant modifications, renewals, and new underlying rules. Date each version. An out-of-date matrix is worse than none, because people trust it.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 70.6: permit content (eCFR)", url: ecfr("70.6") },
      { title: "40 CFR 70.7: permit issuance, renewal, and revisions (eCFR)", url: ecfr("70.7") },
      { title: "EPA: Title V Operating Permits", url: "https://www.epa.gov/title-v-operating-permits" },
    ],
    related: [
      { label: "Permit Compliance Matrix Builder", href: "/tools/compliance-matrix-builder" },
      { label: "Title V operating permits: what they require", href: "/resources/title-v-basics" },
      { label: "Compliance Calendar", href: "/compliance" },
    ],
  },
  {
    slug: "deviation-reporting-what-to-capture",
    title: "Deviation reporting: what to capture while it's fresh",
    summary: "What counts as a deviation, how prompt and periodic reporting fit together, and the details to record on the day so the report writes itself.",
    category: "Compliance",
    scene: "oil-gas",
    readMinutes: 7,
    published: "2026-10-29",
    sections: [
      {
        heading: "Deviations are broader than exceedances",
        paragraphs: [
          "A deviation is any failure to meet a permit term or applicable requirement, not just an emission limit exceedance. Missed monitoring, a late record, a control device operating outside its parameter range, or a skipped inspection can all be deviations. Part 63 defines the term at 40 CFR 63.2, and your permit may define it too.",
        ],
      },
      {
        heading: "Prompt reporting and periodic reporting",
        paragraphs: [
          "Title V permits require prompt reporting of deviations, including the probable cause and any corrective actions or preventive measures taken (40 CFR 70.6(a)(3)(iii)(B)). The permit defines what “prompt” means, often differently for different kinds of deviations. The periodic monitoring report must then identify all deviations in the period, and the annual compliance certification reflects them.",
          "State upset, malfunction, or excess emissions rules can add separate notification and reporting requirements with their own timelines. Check them alongside the permit.",
        ],
      },
      {
        heading: "Record these on the day",
        paragraphs: ["Details fade fast. Capture them while operators still remember:"],
        list: [
          "Start and end date and time, and how the deviation was discovered",
          "The emission unit and the exact permit condition or rule affected",
          "What happened, in plain words, and what operators observed",
          "Probable cause, and whether it could recur",
          "Corrective actions and preventive measures, with dates",
          "Pollutants involved and an excess emissions estimate with its basis",
          "Who was notified, how, and when, including any prompt report",
        ],
      },
      {
        heading: "Close the loop",
        paragraphs: [
          "Track each deviation until the corrective action is complete, and look across the period for repeats. The same cause showing up twice is a maintenance or procedure problem to fix, and agencies notice repeat deviations.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 70.6: permit content (eCFR)", url: ecfr("70.6") },
      { title: "40 CFR 63.2: definitions (eCFR)", url: ecfr("63.2") },
    ],
    related: [
      { label: "Title V Deviation Log", href: "/tools/deviation-log" },
      { label: "Building a Title V compliance matrix", href: "/resources/building-a-title-v-compliance-matrix" },
      { label: "Glossary: deviation", href: "/glossary#deviation" },
    ],
  },
  {
    slug: "stack-test-results-o2-correction-and-units",
    title: "Stack test results: correcting to reference O2 and converting units",
    summary: "How to put test results on the same basis as the permit limit: dry versus wet, oxygen correction, mass rates, and lb/MMBtu with F-factors.",
    category: "Emission Calculations",
    scene: "power",
    readMinutes: 8,
    published: "2026-10-29",
    sections: [
      {
        heading: "Start from the basis of the limit",
        paragraphs: [
          "A limit can be written as a concentration at a reference oxygen level, a mass rate, a heat input rate, or an output-based rate such as g/hp-hr. Before comparing a result, write the limit's basis down exactly, including dry or wet basis, reference O2, averaging time, and the standard conditions the rule uses.",
        ],
      },
      {
        heading: "Dry and wet basis",
        paragraphs: [
          "Most limits are on a dry basis. If an analyzer measured on a wet basis, divide by one minus the stack gas moisture fraction (Bws), using moisture measured during the same run. Keep concentration and flow on the same basis whenever you multiply them.",
        ],
      },
      {
        heading: "Oxygen correction",
        paragraphs: [
          "Correcting to a reference O2 removes the effect of dilution air. The usual form multiplies the measured concentration by (20.9 minus reference O2) divided by (20.9 minus measured O2), with both O2 values on a dry basis. Use the reference O2 written in your limit, and check whether the rule specifies a different correction.",
        ],
      },
      {
        heading: "Concentration to mass rate",
        paragraphs: [
          "Mass rate is concentration times molecular weight times flow, divided by the molar volume at standard conditions. The molar volume depends on the standard temperature and pressure, so use the conditions the rule or test method defines. Many rules express NOx as NO2 for this step.",
        ],
      },
      {
        heading: "lb/MMBtu with F-factors",
        paragraphs: [
          "Heat input based limits are compared with stack concentrations through a fuel-specific F-factor, the volume of combustion gas per unit of heat input. EPA Method 19 (40 CFR Part 60, Appendix A-7) tabulates F-factors and explains how to calculate them from fuel analysis. Use the O2 level the concentration is expressed at in the oxygen term.",
        ],
      },
      {
        heading: "Common mistakes",
        paragraphs: ["The errors that come up most in test report reviews:"],
        list: [
          "Correcting a wet concentration with dry O2, or the reverse",
          "Using actual flow (acfm) in a standard-condition formula",
          "Mixing standard temperatures between the flow and the molar volume",
          "Reporting NOx mass as NO when the rule expresses it as NO2",
          "Averaging runs differently from what the subpart specifies",
        ],
      },
    ],
    sources: [
      { title: "40 CFR Part 60, Appendix A (test methods, including Methods 4 and 19)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-60" },
      { title: "40 CFR 60.8: performance tests (eCFR)", url: ecfr("60.8") },
      { title: "EPA: Emission Measurement Center", url: "https://www.epa.gov/emc" },
    ],
    related: [
      { label: "O2 Correction Calculator", href: "/tools/o2-correction" },
      { label: "ppm to lb/hr Converter", href: "/tools/ppm-to-lb-hr" },
      { label: "ppm to lb/MMBtu Converter", href: "/tools/ppm-to-lb-mmbtu" },
      { label: "Wet to dry basis converter", href: "/tools/wet-to-dry" },
    ],
  },
  {
    slug: "preparing-for-a-performance-test",
    title: "Preparing for a performance test: a practitioner's checklist",
    summary: "Notifications, test plans, operating conditions, sampling access, and what to do when a run fails, with the general provisions to read for each step.",
    category: "Compliance",
    scene: "industrial",
    readMinutes: 8,
    published: "2026-10-29",
    sections: [
      {
        heading: "Read three layers of requirements",
        paragraphs: [
          "Test requirements come from the subpart's testing section, the general provisions (40 CFR 60.8 for NSPS, 40 CFR 63.7 for Part 63), and the permit. The subpart usually controls methods, number of runs, and operating conditions; the general provisions control notifications, plans, and reports unless the subpart overrides them. Read all three before scheduling.",
        ],
      },
      {
        heading: "Notifications and test plans",
        paragraphs: [
          "Both sets of general provisions require advance notice of a performance test to the agency, and Part 63 also requires a site-specific test plan when requested (40 CFR 63.7(b) and (c)). The lead times are in those sections, the subpart, and the permit, and some states add their own. Put the notification due date on the calendar before you book the testing company.",
        ],
      },
      {
        heading: "Operating conditions",
        paragraphs: [
          "Tests must be run at the operating conditions the rule specifies, often representative or maximum operation (40 CFR 60.8(c) and 63.7(e)). Plan production so the unit can run there for the whole test, record the operating data during each run, and know that the conditions tested can become limits on future operation in some programs.",
        ],
      },
      {
        heading: "Access and facilities",
        paragraphs: [
          "The owner provides sampling ports, safe sampling platforms, access, and utilities for the test (40 CFR 60.8(e)). Check port location and condition early; a port that fails the method's location criteria can delay the test.",
        ],
      },
      {
        heading: "Before test day",
        paragraphs: ["A short checklist that prevents most failed or repeated tests:"],
        list: [
          "Methods, runs, and run length confirmed against the subpart",
          "Notification and test plan sent, and any agency observer scheduled",
          "Unit able to hold the required load; process data logging ready",
          "Control device inspected and operating within its parameter ranges",
          "Fuel or material sampling arranged if the method needs it",
          "Units and basis of each limit written out for the tester (dry, O2 reference, standard conditions)",
        ],
      },
      {
        heading: "If a run fails or the test is interrupted",
        paragraphs: [
          "Document what happened during the run. The general provisions and the subpart address when runs may be discarded or repeated and what must be reported. Do not drop a run from the average without a basis in the rule, and report results as the subpart requires, including any electronic reporting it specifies.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 60.8: performance tests (eCFR)", url: ecfr("60.8") },
      { title: "40 CFR 63.7: performance testing requirements (eCFR)", url: ecfr("63.7") },
      { title: "EPA: Emission Measurement Center", url: "https://www.epa.gov/emc" },
    ],
    related: [
      { label: "Stack test results: O2 correction and units", href: "/resources/stack-test-results-o2-correction-and-units" },
      { label: "Compliance Calendar", href: "/compliance" },
      { label: "Glossary: performance test", href: "/glossary#performance-test" },
    ],
  },
];
