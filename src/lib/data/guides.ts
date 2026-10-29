import type { SceneKind } from "@/components/illustrations/Scene";
import { practitionerGuides } from "./practitioner-guides";

/**
 * Published AirPermitHub guides.
 *
 * Editorial rules: guides explain how programs fit together and point to the
 * governing text. They state no numeric thresholds, limits, or deadlines;
 * readers are sent to the cited provision or the state hub's quoted source.
 */

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  category: string;
  scene: SceneKind;
  readMinutes: number;
  published: string;
  sections: GuideSection[];
  sources: { title: string; url: string }[];
  related: { label: string; href: string }[];
}

const ecfr = (part: number, section?: string) =>
  `https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-${part}${section ? `/section-${section}` : ""}`;

const foundationGuides: Guide[] = [
  {
    slug: "where-to-start-air-permit",
    title: "Which air permit do I need? Where to start",
    summary: "A practical sequence for any new or changing facility: jurisdiction, inventory, potential to emit, authorization options, federal standards, and operating permits.",
    category: "Air Permitting",
    scene: "refinery",
    readMinutes: 8,
    published: "2026-10-28",
    sections: [
      {
        heading: "Start with jurisdiction",
        paragraphs: [
          "Air permits are issued by the agency with jurisdiction over the site. In most places that is the state air agency, but some counties and cities run their own air programs, and EPA or a tribe may issue permits on tribal lands. Confirm the agency before reading any rule, because the same equipment can follow different paths in different jurisdictions.",
          "Every AirPermitHub state hub lists the state agency and, where they exist, local agencies with their own permitting authority.",
        ],
      },
      {
        heading: "Inventory every emission unit",
        paragraphs: [
          "Permitting decisions are made unit by unit and then added up for the site. List every piece of equipment that emits or could emit an air pollutant, with its make, model, capacity, fuel or material, and construction or modification date. Dates matter because many federal standards apply only to units built or changed after a specific date.",
        ],
        list: ["Combustion: engines, turbines, heaters, boilers, flares", "Storage and loading: tanks, truck and railcar loading", "Process vents, dehydrators, and controls", "Equipment leaks (fugitive components)"],
      },
      {
        heading: "Estimate potential to emit",
        paragraphs: [
          "Most applicability questions are answered by comparing the facility's potential to emit (PTE) with the criteria in a rule. PTE is based on maximum capacity under the facility's physical and operational design, not on typical operations. Limits on hours, throughput, or control devices count only when they are enforceable.",
          "Calculate PTE per unit and per pollutant, cite each emission factor, and keep the calculations. The Emission Calculators show every step so a reviewer can reproduce the result.",
        ],
      },
      {
        heading: "Look for an existing authorization",
        paragraphs: [
          "An existing permit, registration, or permit-by-rule claim at the site can change the answer. A change may be handled as an amendment, a new registration, or a new permit, depending on the agency's rules. Search the agency's permit records for the site before choosing a path.",
        ],
      },
      {
        heading: "Screen the state authorization options",
        paragraphs: [
          "States offer a ladder of options, from exemptions and de minimis levels, through permits by rule, registrations, standard or general permits, to case-by-case construction permits. Each option has eligibility conditions in rule. If the facility is a major source, or a change is a major modification, federal major New Source Review (PSD or Nonattainment NSR) applies through the state's program.",
        ],
      },
      {
        heading: "Screen federal standards separately",
        paragraphs: [
          "New Source Performance Standards (40 CFR Part 60) and National Emission Standards for Hazardous Air Pollutants (40 CFR Parts 61 and 63) apply on their own terms, whatever permit path the facility takes. A unit can be exempt from a state permit and still be subject to an NSPS or NESHAP. Check each candidate subpart's applicability section against the unit's type, size, and dates.",
        ],
      },
      {
        heading: "Check operating permit requirements",
        paragraphs: [
          "Construction authorization and operating permits are separate questions. Major sources, and some other sources, need a Title V operating permit. Many states also issue state operating permits, including synthetic minor permits that take enforceable limits to stay below major source status.",
        ],
      },
      {
        heading: "Confirm with the agency",
        paragraphs: [
          "Many agencies offer pre-application meetings or technical assistance. Bring the inventory, PTE calculations, and the path you think applies. The agency's interpretation governs; AirPermitHub screening results are a starting point, not a determination.",
        ],
      },
    ],
    sources: [
      { title: "EPA: New Source Review (NSR) Permitting", url: "https://www.epa.gov/nsr" },
      { title: "EPA: Title V Operating Permits", url: "https://www.epa.gov/title-v-operating-permits" },
      { title: "40 CFR Part 60 (eCFR)", url: ecfr(60) },
      { title: "40 CFR Part 63 (eCFR)", url: ecfr(63) },
    ],
    related: [
      { label: "Permit Finder", href: "/permit-finder" },
      { label: "Emission Calculators", href: "/calculators" },
      { label: "State Explorer", href: "/states" },
      { label: "Air Permit Application Checklist (CSV)", href: "/api/v1/templates/air-permit-checklist" },
    ],
  },
  {
    slug: "potential-to-emit-explained",
    title: "Potential to emit, explained for engineers",
    summary: "What PTE is, how it differs from actual emissions, why enforceable limits matter, and how to document the calculation.",
    category: "Emission Calculations",
    scene: "power",
    readMinutes: 9,
    published: "2026-10-28",
    sections: [
      {
        heading: "The definition",
        paragraphs: [
          "Federal rules define potential to emit as the maximum capacity of a stationary source to emit a pollutant under its physical and operational design. Physical or operational limitations, such as control equipment or restrictions on hours of operation or on the type or amount of material combusted, stored, or processed, count as part of that design only if they are enforceable.",
          "The PSD definition is at 40 CFR 52.21(b)(4), and the Title V definition is at 40 CFR 70.2. State rules usually adopt the same concept; read the definition in the program you are applying under.",
        ],
      },
      {
        heading: "Potential versus actual emissions",
        paragraphs: [
          "Actual emissions describe what a unit emitted in a period. PTE describes what it could emit at maximum design capacity with only enforceable limits applied. A facility that runs half the year still has a PTE based on year-round operation unless an enforceable limit says otherwise.",
        ],
      },
      {
        heading: "When limits count",
        paragraphs: [
          "A control device, an hours limit, or a throughput cap lowers PTE only when it is enforceable, typically as a permit condition or rule requirement with monitoring, recordkeeping, and reporting that show compliance. Taking such limits to stay below major source thresholds is often called becoming a synthetic minor source.",
        ],
        list: ["Write the limit so it can be measured (hours, throughput, fuel use)", "Pair it with monitoring and records that prove compliance", "Make sure the control efficiency you claim matches what you can demonstrate"],
      },
      {
        heading: "Fugitive emissions",
        paragraphs: [
          "Whether fugitive emissions count toward major source status depends on the source category and the program. The PSD and Title V rules each say when fugitives are included. Check the major source definition that applies before adding or excluding them.",
        ],
      },
      {
        heading: "Documenting the calculation",
        paragraphs: [
          "A defensible PTE calculation shows, for each unit and pollutant: the capacity basis, the emission factor with its source document, section, and revision date, operating hours, any control efficiency and the enforceable requirement behind it, and the arithmetic. AirPermitHub calculators record each of these and export the full calculation set.",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 52.21 (eCFR)", url: ecfr(52, "52.21") },
      { title: "40 CFR 70.2 (eCFR)", url: ecfr(70, "70.2") },
      { title: "EPA: AP-42 Compilation of Air Emissions Factors", url: "https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors-stationary-sources" },
    ],
    related: [
      { label: "Emission Calculators", href: "/calculators" },
      { label: "Emission Calculation Workbook (CSV)", href: "/api/v1/templates/emission-calculation-workbook" },
      { label: "Title V overview", href: "/regulations/title-v" },
    ],
  },
  {
    slug: "psd-vs-minor-nsr",
    title: "PSD vs. Nonattainment NSR vs. minor NSR",
    summary: "How the three preconstruction programs divide the work, what each one requires, and how area designations decide which applies.",
    category: "Federal Regulations",
    scene: "chemical",
    readMinutes: 8,
    published: "2026-10-28",
    sections: [
      {
        heading: "One program, three parts",
        paragraphs: [
          "New Source Review (NSR) is the Clean Air Act's preconstruction permitting program. It has three parts: Prevention of Significant Deterioration (PSD) for major sources in areas that meet the national ambient air quality standards, Nonattainment NSR for major sources in areas that do not, and minor NSR for everything else.",
          "Most states run all three through their own approved programs. Where a state does not have an approved PSD program, the federal rule at 40 CFR 52.21 applies.",
        ],
      },
      {
        heading: "Area designations decide PSD or Nonattainment NSR",
        paragraphs: [
          "Designations are made pollutant by pollutant. The same county can be in attainment for one pollutant and nonattainment for another, so a single project can trigger PSD for some pollutants and Nonattainment NSR for others. EPA's Green Book lists current nonattainment areas.",
        ],
      },
      {
        heading: "What PSD requires",
        paragraphs: ["A PSD permit generally requires:"],
        list: [
          "Best Available Control Technology (BACT), determined case by case",
          "An air quality analysis showing the project will not cause or contribute to a violation of the standards or allowable increments",
          "Additional impacts analysis (for example soils, vegetation, and visibility), including review for nearby Class I areas",
          "Public notice and comment",
        ],
      },
      {
        heading: "What Nonattainment NSR requires",
        paragraphs: ["A Nonattainment NSR permit generally requires:"],
        list: [
          "Lowest Achievable Emission Rate (LAER)",
          "Emission offsets from other sources in the area",
          "Certification that the owner's other major sources in the state comply with applicable requirements",
          "An alternatives analysis showing benefits outweigh costs",
        ],
      },
      {
        heading: "Minor NSR",
        paragraphs: [
          "Federal rules at 40 CFR 51.160 through 51.164 require states to review new and modified sources that are not major, but leave the design to each state. That is why minor NSR looks so different from state to state: exemptions, permits by rule, general and standard permits, registrations, and case-by-case permits are all forms of minor NSR.",
        ],
      },
      {
        heading: "Major modifications",
        paragraphs: [
          "For existing major sources, the question is whether a change is a major modification. That turns on the emissions increase from the project and, in some cases, the net change at the source, using the calculation tests in the rule. Read the definitions and the applicability procedures in the program that applies before calculating.",
        ],
      },
    ],
    sources: [
      { title: "EPA: New Source Review (NSR) Permitting", url: "https://www.epa.gov/nsr" },
      { title: "40 CFR 52.21 (eCFR)", url: ecfr(52, "52.21") },
      { title: "40 CFR 51.165 (eCFR)", url: ecfr(51, "51.165") },
      { title: "EPA Green Book: Nonattainment Areas", url: "https://www.epa.gov/green-book" },
    ],
    related: [
      { label: "PSD overview", href: "/regulations/psd" },
      { label: "Nonattainment NSR overview", href: "/regulations/nonattainment-nsr" },
      { label: "State minor NSR programs", href: "/regulations?tab=programs" },
    ],
  },
  {
    slug: "title-v-basics",
    title: "Title V operating permits: what they require",
    summary: "Who needs a Title V permit, what goes in it, and the monitoring, reporting, and certification obligations that follow.",
    category: "Compliance",
    scene: "midstream",
    readMinutes: 9,
    published: "2026-10-28",
    sections: [
      {
        heading: "What Title V is",
        paragraphs: [
          "Title V of the Clean Air Act requires operating permits for major sources and certain other sources. States run approved programs under 40 CFR Part 70; EPA issues permits under 40 CFR Part 71 where it administers the program.",
          "A Title V permit generally does not create new emission limits. It gathers every applicable requirement for the facility, from construction permits, state rules, NSPS, NESHAP, and other programs, into one enforceable document, and adds the monitoring, recordkeeping, and reporting needed to show compliance.",
        ],
      },
      {
        heading: "Who needs one",
        paragraphs: [
          "Applicability is set at 40 CFR 70.3 and in each state's approved program. Major sources are the core group; other sources can be covered, for example some sources subject to NSPS or NESHAP, unless the rule exempts or defers them. The definition of major source is at 40 CFR 70.2.",
        ],
      },
      {
        heading: "What is in the permit",
        paragraphs: ["Permit content is set at 40 CFR 70.6. Expect:"],
        list: [
          "Emission limits and standards, each tied to its underlying requirement",
          "Monitoring, including periodic monitoring where the underlying rule has none",
          "Recordkeeping and reporting requirements",
          "A fixed permit term (see 40 CFR 70.6(a)(2)) and renewal requirements",
          "A permit shield, where the agency grants one",
        ],
      },
      {
        heading: "Ongoing obligations",
        paragraphs: [
          "Title V permittees submit periodic monitoring reports and an annual compliance certification signed by a responsible official, and report deviations promptly as the permit defines. Frequencies and due dates come from the permit and 40 CFR 70.6; put each one on a compliance calendar with an owner.",
        ],
      },
      {
        heading: "Getting organized",
        paragraphs: [
          "Most Title V problems are tracking problems. Break the permit into individual conditions, assign each an owner and a due date, and keep the evidence. The Permit Condition Tracker template and the Compliance Calendar are built for this.",
        ],
      },
    ],
    sources: [
      { title: "EPA: Title V Operating Permits", url: "https://www.epa.gov/title-v-operating-permits" },
      { title: "40 CFR Part 70 (eCFR)", url: ecfr(70) },
      { title: "40 CFR Part 71 (eCFR)", url: ecfr(71) },
    ],
    related: [
      { label: "Title V overview", href: "/regulations/title-v" },
      { label: "Compliance Calendar", href: "/compliance" },
      { label: "Permit Condition Tracker (CSV)", href: "/api/v1/templates/permit-condition-tracker" },
    ],
  },
];

/** Newest first: practitioner guides, then the foundation guides. */
export const guides: Guide[] = [...practitionerGuides, ...foundationGuides];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}

export const faqs: { q: string; a: string }[] = [
  { q: "Is AirPermitHub legal or regulatory advice?", a: "No. AirPermitHub provides educational, engineering, and research information. Screening results point to programs worth reviewing; the agency's rules and interpretations govern, and a qualified professional should confirm decisions." },
  { q: "Where does the state information come from?", a: "Each state hub is researched from the state air agency's own website and rules. Every hub shows its sources, its last-reviewed date, and whether it is verified or partially verified." },
  { q: "Why don't the calculators include emission factors?", a: "Emission factors change and depend on the source, fuel, and revision. Until the versioned factor library launches, you enter the factor and its source so every result is traceable. Demo values exist only to explore the interface and are flagged." },
  { q: "Does the Permit Finder tell me which permit I need?", a: "It screens for potentially applicable programs and lists what information is still needed. It never concludes that a permit is or is not required." },
  { q: "Are the templates official government forms?", a: "No. AirPermitHub templates are our own working files. Use the agency's official forms, linked in the Permit Library, for any submittal." },
  { q: "Are the job listings and permit records real?", a: "Not yet. Job listings, companies, and permit records shown today are labeled demo data that preview features launching with accounts." },
  { q: "How do I report an error?", a: "Use the Contact page and include the page address and the source that shows the correct information. Corrections are reviewed against the official source." },
];
