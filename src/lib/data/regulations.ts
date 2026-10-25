import type { Regulation, RegulationSection } from "./types";

/**
 * Federal regulatory program records.
 *
 * Content rules:
 *  - Summaries describe program structure only. No thresholds, deadlines, or
 *    emission limits are stated here; those must come from the official text.
 *  - Every record is "aph-summary" until an editor verifies it against the
 *    official source and sets `lastReviewed`.
 *  - Sections we have not written yet are null and render as "not yet reviewed".
 */

const EPA = "U.S. Environmental Protection Agency";
const ecfr = (part: number) => `https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-${part}`;
const pending: RegulationSection = { summary: null };

export const federalRegulations: Regulation[] = [
  {
    slug: "nsps",
    shortName: "NSPS",
    name: "New Source Performance Standards",
    citation: "40 CFR Part 60",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Performance standards for new, modified, and reconstructed sources.",
    summary:
      "NSPS set technology-based performance standards for specific categories of stationary sources. Part 60 is organized into subparts, each covering a source category. Subpart A contains General Provisions that apply across subparts unless a subpart says otherwise.",
    applicability: {
      summary:
        "Each subpart defines its own affected facility and applicability dates. Applicability generally depends on the source category and on when construction, modification, or reconstruction commenced relative to the dates in that subpart. Read the applicability section of each candidate subpart.",
      pointers: [{ label: "General Provisions applicability", citation: "40 CFR 60.1" }],
    },
    requirements: {
      summary: "Emission standards, work practices, and control requirements are set subpart by subpart.",
    },
    monitoring: {
      summary: "Subpart A sets general monitoring requirements; individual subparts add source-specific monitoring.",
      pointers: [{ label: "Monitoring requirements", citation: "40 CFR 60.13" }],
    },
    testing: {
      summary: "Subpart A sets general performance-test provisions; subparts specify methods and frequency.",
      pointers: [{ label: "Performance tests", citation: "40 CFR 60.8" }],
    },
    recordkeeping: {
      summary: "Subpart A sets general notification and recordkeeping provisions; subparts add specific records.",
      pointers: [{ label: "Notification and record keeping", citation: "40 CFR 60.7" }],
    },
    reporting: {
      summary: "Notifications and periodic reports are set by Subpart A and by each subpart.",
      pointers: [{ label: "Notification and record keeping", citation: "40 CFR 60.7" }],
    },
    definitions: {
      summary: "General definitions are in Subpart A. Many subparts add their own definitions.",
      pointers: [{ label: "Definitions", citation: "40 CFR 60.2" }],
    },
    keySubparts: [
      { code: "Subpart A", title: "General Provisions" },
      { code: "Subpart Kb", title: "Volatile organic liquid storage vessels" },
      { code: "Subpart IIII", title: "Stationary compression ignition internal combustion engines" },
      { code: "Subpart JJJJ", title: "Stationary spark ignition internal combustion engines" },
      { code: "Subpart OOOO", title: "Crude oil and natural gas production, transmission and distribution" },
      { code: "Subpart OOOOa", title: "Crude oil and natural gas facilities (later applicability window)" },
      { code: "Subpart OOOOb", title: "Crude oil and natural gas facilities (most recent applicability window)" },
    ],
    sources: [
      { agency: EPA, title: "40 CFR Part 60 (eCFR)", url: ecfr(60), citation: "40 CFR Part 60", lastReviewed: null },
    ],
    relatedRules: ["neshap", "title-v"],
    relatedCalculators: ["engines", "tanks", "fugitives"],
  },
  {
    slug: "neshap",
    shortName: "NESHAP",
    name: "National Emission Standards for Hazardous Air Pollutants",
    citation: "40 CFR Parts 61 and 63",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Hazardous air pollutant standards, including MACT and GACT source categories.",
    summary:
      "Part 61 contains the original pollutant-specific NESHAP. Part 63 contains source-category standards, often called MACT standards for major sources and GACT standards for certain area sources. Both parts have General Provisions in Subpart A.",
    applicability: {
      summary:
        "Part 63 applicability usually turns on the source category and on whether the facility is a major source or an area source of HAP, as those terms are defined in the rule. Each subpart states which units are affected.",
      pointers: [
        { label: "Part 63 applicability", citation: "40 CFR 63.1" },
        { label: "Part 63 definitions (major / area source)", citation: "40 CFR 63.2" },
      ],
    },
    requirements: { summary: "Emission limits, operating limits, and work practice standards are set subpart by subpart." },
    monitoring: {
      summary: "Part 63 Subpart A sets general monitoring requirements.",
      pointers: [{ label: "Monitoring requirements", citation: "40 CFR 63.8" }],
    },
    testing: {
      summary: "Part 63 Subpart A sets general performance-testing requirements.",
      pointers: [{ label: "Performance testing requirements", citation: "40 CFR 63.7" }],
    },
    recordkeeping: {
      summary: "Part 63 Subpart A sets general recordkeeping and reporting requirements.",
      pointers: [{ label: "Recordkeeping and reporting", citation: "40 CFR 63.10" }],
    },
    reporting: {
      summary: "Initial notifications, notifications of compliance status, and periodic reports are addressed in Subpart A and each subpart.",
      pointers: [
        { label: "Notification requirements", citation: "40 CFR 63.9" },
        { label: "Recordkeeping and reporting", citation: "40 CFR 63.10" },
      ],
    },
    definitions: {
      summary: "General definitions are in Subpart A of each part.",
      pointers: [{ label: "Part 63 definitions", citation: "40 CFR 63.2" }],
    },
    keySubparts: [
      { code: "Part 63 Subpart A", title: "General Provisions" },
      { code: "Part 63 Subpart HH", title: "Oil and natural gas production facilities" },
      { code: "Part 63 Subpart HHH", title: "Natural gas transmission and storage facilities" },
      { code: "Part 63 Subpart ZZZZ", title: "Stationary reciprocating internal combustion engines (RICE)" },
      { code: "Part 63 Subpart DDDDD", title: "Industrial, commercial, and institutional boilers and process heaters (major sources)" },
      { code: "Part 63 Subpart JJJJJJ", title: "Industrial, commercial, and institutional boilers (area sources)" },
    ],
    sources: [
      { agency: EPA, title: "40 CFR Part 61 (eCFR)", url: ecfr(61), citation: "40 CFR Part 61", lastReviewed: null },
      { agency: EPA, title: "40 CFR Part 63 (eCFR)", url: ecfr(63), citation: "40 CFR Part 63", lastReviewed: null },
    ],
    relatedRules: ["nsps", "title-v"],
    relatedCalculators: ["engines", "heaters"],
  },
  {
    slug: "title-v",
    shortName: "Title V",
    name: "Title V Operating Permits",
    citation: "40 CFR Parts 70 and 71",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Operating permits that consolidate a source's applicable requirements.",
    summary:
      "Title V operating permits compile the air requirements that apply to a source into one permit. Part 70 sets the minimum elements for state and local programs. Part 71 is the federal program EPA administers where no approved program applies, such as many tribal lands.",
    applicability: {
      summary:
        "Applicability depends on the source's potential to emit and on other criteria defined in the program rules, which can vary by area. Confirm against the approved program for your jurisdiction.",
      pointers: [
        { label: "Part 70 applicability", citation: "40 CFR 70.3" },
        { label: "Part 70 definitions", citation: "40 CFR 70.2" },
      ],
    },
    requirements: {
      summary: "Permits must contain the applicable requirements, with monitoring, recordkeeping, reporting, and compliance certification terms.",
      pointers: [{ label: "Permit content", citation: "40 CFR 70.6" }],
    },
    monitoring: {
      summary: "Permits include monitoring sufficient to assure compliance with permit terms.",
      pointers: [{ label: "Monitoring and related recordkeeping and reporting", citation: "40 CFR 70.6(a)(3)" }],
    },
    testing: pending,
    recordkeeping: {
      summary: "Permit terms include recordkeeping requirements tied to monitoring.",
      pointers: [{ label: "Permit content", citation: "40 CFR 70.6(a)(3)(ii)" }],
    },
    reporting: {
      summary: "Permits include periodic monitoring reports, prompt deviation reporting, and compliance certifications.",
      pointers: [
        { label: "Reporting requirements", citation: "40 CFR 70.6(a)(3)(iii)" },
        { label: "Compliance certification", citation: "40 CFR 70.6(c)(5)" },
      ],
    },
    definitions: { summary: "Definitions are in 40 CFR 70.2 and 71.2.", pointers: [{ label: "Definitions", citation: "40 CFR 70.2" }] },
    sources: [
      { agency: EPA, title: "40 CFR Part 70 (eCFR)", url: ecfr(70), citation: "40 CFR Part 70", lastReviewed: null },
      { agency: EPA, title: "40 CFR Part 71 (eCFR)", url: ecfr(71), citation: "40 CFR Part 71", lastReviewed: null },
    ],
    relatedRules: ["nsr", "psd", "nsps", "neshap"],
    relatedCalculators: ["engines", "heaters", "flares", "tanks", "fugitives"],
  },
  {
    slug: "nsr",
    shortName: "NSR",
    name: "New Source Review",
    citation: "40 CFR 51.160–51.166; 40 CFR 52.21",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Preconstruction permitting for new and modified sources.",
    summary:
      "New Source Review is the preconstruction permitting program. Major NSR covers Prevention of Significant Deterioration (PSD) in attainment and unclassifiable areas and Nonattainment NSR in nonattainment areas. Minor NSR covers sources and modifications that are not major and is administered under state implementation plans.",
    applicability: {
      summary:
        "Which NSR program applies depends on the area's attainment status for each pollutant, the source's potential to emit, and whether a project is a major modification as defined in the rules.",
      pointers: [
        { label: "Minor NSR (SIP requirements)", citation: "40 CFR 51.160–51.164" },
        { label: "Nonattainment NSR (SIP requirements)", citation: "40 CFR 51.165" },
        { label: "PSD (SIP requirements)", citation: "40 CFR 51.166" },
        { label: "PSD (federal program)", citation: "40 CFR 52.21" },
      ],
    },
    requirements: pending,
    monitoring: pending,
    testing: pending,
    recordkeeping: pending,
    reporting: pending,
    definitions: pending,
    sources: [
      { agency: EPA, title: "40 CFR Part 51 (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-51", citation: "40 CFR Part 51", lastReviewed: null },
      { agency: EPA, title: "40 CFR Part 52 (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-52", citation: "40 CFR Part 52", lastReviewed: null },
    ],
    relatedRules: ["psd", "nonattainment-nsr", "title-v"],
    relatedCalculators: ["engines", "heaters", "flares", "tanks"],
  },
  {
    slug: "psd",
    shortName: "PSD",
    name: "Prevention of Significant Deterioration",
    citation: "40 CFR 52.21; 40 CFR 51.166",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Major NSR for attainment and unclassifiable areas.",
    summary:
      "PSD applies to new major stationary sources and major modifications in areas that meet the national ambient air quality standards. PSD permits generally involve a best available control technology (BACT) determination and air quality analyses.",
    applicability: {
      summary: "Applicability depends on source classification, potential to emit, and project emissions increases as defined in the rule.",
      pointers: [{ label: "Applicability procedures", citation: "40 CFR 52.21(a)(2)" }],
    },
    requirements: {
      summary: "Key elements include BACT, source impact analysis, and additional impact analyses.",
      pointers: [
        { label: "Control technology review (BACT)", citation: "40 CFR 52.21(j)" },
        { label: "Source impact analysis", citation: "40 CFR 52.21(k)" },
        { label: "Additional impact analyses", citation: "40 CFR 52.21(o)" },
      ],
    },
    monitoring: pending,
    testing: pending,
    recordkeeping: pending,
    reporting: pending,
    definitions: { summary: "Definitions are in 40 CFR 52.21(b).", pointers: [{ label: "Definitions", citation: "40 CFR 52.21(b)" }] },
    sources: [
      { agency: EPA, title: "40 CFR Part 52 (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-52", citation: "40 CFR 52.21", lastReviewed: null },
    ],
    relatedRules: ["nsr", "nonattainment-nsr", "title-v"],
    relatedCalculators: ["engines", "heaters", "flares"],
  },
  {
    slug: "nonattainment-nsr",
    shortName: "NNSR",
    name: "Nonattainment New Source Review",
    citation: "40 CFR 51.165",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "Major NSR for areas that do not meet air quality standards.",
    summary:
      "Nonattainment NSR applies to major sources and major modifications in areas designated nonattainment for a pollutant. Key elements include the lowest achievable emission rate (LAER) and emission offsets.",
    applicability: {
      summary: "Applicability depends on the area's nonattainment classification and the definitions in the approved state program.",
      pointers: [{ label: "Permit requirements", citation: "40 CFR 51.165" }],
    },
    requirements: pending,
    monitoring: pending,
    testing: pending,
    recordkeeping: pending,
    reporting: pending,
    definitions: { summary: "Definitions are in 40 CFR 51.165(a)(1).", pointers: [{ label: "Definitions", citation: "40 CFR 51.165(a)(1)" }] },
    sources: [
      { agency: EPA, title: "40 CFR Part 51 (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-51", citation: "40 CFR 51.165", lastReviewed: null },
    ],
    relatedRules: ["nsr", "psd"],
    relatedCalculators: [],
  },
  {
    slug: "ap-42",
    shortName: "AP-42",
    name: "Compilation of Air Pollutant Emission Factors",
    citation: "EPA AP-42",
    jurisdiction: "federal",
    agency: EPA,
    status: "aph-summary",
    tagline: "EPA's primary compilation of emission factors for stationary sources.",
    summary:
      "AP-42 is EPA's compilation of emission factor information, organized by source category chapters and sections. Sections are revised individually, so the revision date of each section matters. AirPermitHub will store each factor with its section, revision date, and rating.",
    applicability: { summary: "AP-42 is guidance, not a regulation. Permits and rules may require or allow other methods." },
    requirements: pending,
    monitoring: pending,
    testing: pending,
    recordkeeping: pending,
    reporting: pending,
    definitions: pending,
    sources: [
      {
        agency: EPA,
        title: "AP-42: Compilation of Air Emissions Factors",
        url: "https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors-stationary-sources",
        lastReviewed: null,
      },
    ],
    relatedRules: ["nsps", "title-v"],
    relatedCalculators: ["engines", "heaters", "flares", "tanks", "fugitives"],
  },
];

export function getRegulation(slug: string) {
  return federalRegulations.find((r) => r.slug === slug);
}

/** Library categories shown on /regulations. */
export const regulationCategories = [
  { title: "NSPS", href: "/regulations/nsps", blurb: "New Source Performance Standards, 40 CFR Part 60" },
  { title: "NESHAP", href: "/regulations/neshap", blurb: "Hazardous air pollutant standards, 40 CFR Parts 61 and 63" },
  { title: "Title V", href: "/regulations/title-v", blurb: "Operating permits, 40 CFR Parts 70 and 71" },
  { title: "NSR", href: "/regulations/nsr", blurb: "Preconstruction permitting programs" },
  { title: "PSD", href: "/regulations/psd", blurb: "Major NSR in attainment areas" },
  { title: "Nonattainment NSR", href: "/regulations/nonattainment-nsr", blurb: "Major NSR in nonattainment areas" },
  { title: "Emission Factors", href: "/regulations/ap-42", blurb: "AP-42 and factor provenance" },
  { title: "Regulatory Guidance", href: "/resources?category=federal-regulations", blurb: "Guidance indexes (in development)" },
];
