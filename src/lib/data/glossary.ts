/**
 * Air permitting glossary. Definitions are AirPermitHub plain-language
 * explanations, not regulatory text; each one links to the provision that
 * defines or governs the term, and states no numeric thresholds. Where the
 * same term is defined differently by different programs, the entry says so.
 */

export const glossaryCategories = ["New Source Review", "Title V", "NSPS & NESHAP", "Emissions", "Monitoring & Testing", "Air Quality Planning", "State Programs"] as const;
export type GlossaryCategory = (typeof glossaryCategories)[number];

export interface GlossaryTerm {
  slug: string;
  term: string;
  abbr?: string;
  category: GlossaryCategory;
  definition: string;
  cites: { label: string; url: string }[];
  related?: string[];
  links?: { label: string; href: string }[];
}

const s = (section: string, para?: string) => ({
  label: `40 CFR ${section}${para ?? ""}`,
  url: `https://www.ecfr.gov/current/title-40/section-${section}${para ? `#p-${section}${para}` : ""}`,
});
const part = (n: number, label?: string) => ({ label: label ?? `40 CFR Part ${n}`, url: `https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-${n}` });
const usc = (section: number, label: string) => ({ label, url: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section${section}&num=0&edition=prelim` });

export const glossary: GlossaryTerm[] = [
  {
    slug: "actual-emissions", term: "Actual emissions", category: "Emissions",
    definition: "What a unit actually emitted over a period, based on its real operating hours, production, and materials. In PSD, actual emissions is a defined term with its own averaging rules, and it is different from both allowable emissions and potential to emit.",
    cites: [s("52.21", "(b)(21)")], related: ["potential-to-emit", "allowable-emissions", "baseline-actual-emissions"],
  },
  {
    slug: "affected-facility", term: "Affected facility", category: "NSPS & NESHAP",
    definition: "In the NSPS program, the specific apparatus a standard applies to, such as a single engine, tank, or process unit. Each subpart defines its own affected facility, and the construction, modification, or reconstruction date of that facility decides whether the subpart applies.",
    cites: [s("60.2")], related: ["nsps", "modification-nsps", "reconstruction"],
  },
  {
    slug: "allowable-emissions", term: "Allowable emissions", category: "Emissions",
    definition: "The emission rate a unit is allowed by its enforceable limits and applicable standards, calculated at maximum rated capacity unless an enforceable limit restricts operation.",
    cites: [s("52.21", "(b)(16)")], related: ["actual-emissions", "potential-to-emit"],
  },
  {
    slug: "annual-compliance-certification", term: "Annual compliance certification", category: "Title V",
    definition: "The Title V report in which the responsible official certifies the facility's compliance status with each permit term over the period, identifies the methods used to determine it, and notes any deviations. The permit sets the frequency and due date.",
    cites: [s("70.6", "(c)(5)")], related: ["responsible-official", "deviation", "semiannual-monitoring-report"],
    links: [{ label: "Title V Deviation Log", href: "/tools/deviation-log" }],
  },
  {
    slug: "applicable-requirement", term: "Applicable requirement", category: "Title V",
    definition: "Any requirement that applies to the source under the Clean Air Act and its implementing rules, such as SIP rules, preconstruction permit terms, NSPS, and NESHAP. A Title V permit compiles the applicable requirements into one document.",
    cites: [s("70.2")], related: ["title-v", "permit-shield"],
  },
  {
    slug: "area-source", term: "Area source", category: "NSPS & NESHAP",
    definition: "For hazardous air pollutants, a stationary source that is not a major source of HAP. Many Part 63 subparts have separate requirements for area sources, often generally available control technology (GACT) or work practices.",
    cites: [s("63.2"), usc(7412, "Clean Air Act §112(a)")], related: ["major-source-hap", "hap", "gact"],
  },
  {
    slug: "attainment-area", term: "Attainment and nonattainment areas", category: "Air Quality Planning",
    definition: "Areas EPA designates, pollutant by pollutant, as meeting or not meeting a national ambient air quality standard. The designation decides whether a major source project goes through PSD (attainment or unclassifiable) or Nonattainment NSR.",
    cites: [part(81, "40 CFR Part 81 (designations)"), usc(7407, "Clean Air Act §107(d)")], related: ["naaqs", "psd", "nnsr"],
    links: [{ label: "Permit Finder", href: "/permit-finder" }],
  },
  {
    slug: "bact", term: "Best available control technology", abbr: "BACT", category: "New Source Review",
    definition: "The emission limitation required for PSD projects, decided case by case for each pollutant subject to review, taking into account energy, environmental, and economic impacts and other costs. BACT can be no less stringent than any applicable NSPS or NESHAP.",
    cites: [s("52.21", "(b)(12)")], related: ["psd", "laer"],
  },
  {
    slug: "baseline-actual-emissions", term: "Baseline actual emissions", category: "New Source Review",
    definition: "The average annual emission rate of an existing unit over a consecutive period the owner selects within a lookback set by the rule, adjusted as the rule requires. It is the starting point for calculating a project's emissions increase.",
    cites: [s("52.21", "(b)(48)")], related: ["projected-actual-emissions", "major-modification"],
    links: [{ label: "NSR Baseline Calculator", href: "/tools/nsr-baseline-calculator" }],
  },
  {
    slug: "begin-actual-construction", term: "Begin actual construction", category: "New Source Review",
    definition: "Initiation of physical on-site construction activities of a permanent nature on an emissions unit, such as installing building supports and foundations or laying underground pipework. Preconstruction permits generally must be in hand first; the defined term matters when planning site work.",
    cites: [s("52.21", "(b)(11)")], related: ["commence-construction"],
  },
  {
    slug: "cam", term: "Compliance assurance monitoring", abbr: "CAM", category: "Monitoring & Testing",
    definition: "Monitoring required at Title V sources for certain units that use a control device to meet an emission limit. The owner proposes indicators of control device performance, ranges for them, and how excursions are handled.",
    cites: [part(64, "40 CFR Part 64")], related: ["excursion", "title-v"],
  },
  {
    slug: "cems", term: "Continuous emission monitoring system", abbr: "CEMS", category: "Monitoring & Testing",
    definition: "Equipment that samples and analyzes stack gas continuously to measure a pollutant or diluent concentration, with data recording. Performance specifications and quality assurance procedures for many CEMS are in 40 CFR Part 60, Appendices B and F.",
    cites: [s("60.13"), part(60, "40 CFR Part 60 (Appendices B and F)")], related: ["cam", "performance-test"],
  },
  {
    slug: "commence-construction", term: "Commence construction", category: "New Source Review",
    definition: "In PSD, having all necessary preconstruction approvals and either beginning actual construction or entering binding agreements that cannot be cancelled without substantial loss. NSPS uses its own definition of commenced to set applicability dates.",
    cites: [s("52.21", "(b)(9)"), s("60.2")], related: ["begin-actual-construction", "affected-facility"],
  },
  {
    slug: "criteria-pollutants", term: "Criteria pollutants", category: "Air Quality Planning",
    definition: "The pollutants with national ambient air quality standards: carbon monoxide, lead, nitrogen dioxide, ozone, particulate matter (PM10 and PM2.5), and sulfur dioxide. Ozone is controlled largely through its precursors, NOx and VOC.",
    cites: [part(50, "40 CFR Part 50")], related: ["naaqs", "voc"],
  },
  {
    slug: "deviation", term: "Deviation", category: "Title V",
    definition: "Any instance in which a source fails to meet a permit term or applicable requirement, including emission limits, operating limits, and monitoring or recordkeeping obligations. Part 63 defines the term; Title V permits require prompt reporting of deviations and identification of all of them in periodic reports.",
    cites: [s("63.2"), s("70.6", "(a)(3)(iii)")], related: ["semiannual-monitoring-report", "annual-compliance-certification", "excursion"],
    links: [{ label: "Title V Deviation Log", href: "/tools/deviation-log" }],
  },
  {
    slug: "emissions-unit", term: "Emissions unit", category: "Emissions",
    definition: "Any part of a stationary source that emits or would have the potential to emit a regulated pollutant. PSD distinguishes new and existing emissions units, and Title V uses a similar definition.",
    cites: [s("52.21", "(b)(7)"), s("70.2")], related: ["stationary-source"],
  },
  {
    slug: "excursion", term: "Excursion", category: "Monitoring & Testing",
    definition: "Under CAM, a departure from an indicator range established for monitoring, consistent with any averaging period in the applicable requirement. An excursion is not automatically a violation, but it triggers response and reporting obligations.",
    cites: [s("64.1")], related: ["cam", "deviation"],
  },
  {
    slug: "federally-enforceable", term: "Federally enforceable", category: "New Source Review",
    definition: "Limitations and conditions enforceable by EPA, such as those in NSPS, NESHAP, approved SIPs, and permits issued under approved programs. Whether a limit is enforceable decides whether it can lower potential to emit.",
    cites: [s("52.21", "(b)(17)")], related: ["potential-to-emit", "synthetic-minor"],
  },
  {
    slug: "fugitive-emissions", term: "Fugitive emissions", category: "Emissions",
    definition: "Emissions that could not reasonably pass through a stack, chimney, vent, or other functionally equivalent opening, such as equipment leaks and haul road dust. Whether fugitives count toward major source status depends on the source category and the program.",
    cites: [s("52.21", "(b)(20)"), s("70.2")], related: ["ldar", "major-source-title-v"],
  },
  {
    slug: "gact", term: "Generally available control technology", abbr: "GACT", category: "NSPS & NESHAP",
    definition: "Standards EPA may set for area sources of hazardous air pollutants in place of MACT, based on generally available control technologies or management practices.",
    cites: [usc(7412, "Clean Air Act §112(d)(5)")], related: ["area-source", "mact"],
  },
  {
    slug: "ghgrp", term: "Greenhouse Gas Reporting Program", abbr: "GHGRP", category: "Emissions",
    definition: "EPA's annual greenhouse gas reporting requirement for covered facilities and suppliers. It is a reporting program, separate from permitting, with its own applicability tests by source category.",
    cites: [part(98, "40 CFR Part 98")],
    links: [{ label: "Federal Air Rule Tracker (Part 98)", href: "/regulatory-updates" }],
  },
  {
    slug: "hap", term: "Hazardous air pollutant", abbr: "HAP", category: "NSPS & NESHAP",
    definition: "A pollutant on the Clean Air Act section 112(b) list, as amended. HAP are regulated by NESHAP under Parts 61 and 63 rather than through ambient air quality standards.",
    cites: [usc(7412, "Clean Air Act §112(b)"), s("63.2")], related: ["major-source-hap", "area-source", "neshap"],
  },
  {
    slug: "insignificant-activities", term: "Insignificant activities", category: "Title V",
    definition: "Activities and emission levels a Title V program allows applicants to list without detailed emissions information. Each state program defines its own list, and the activities remain subject to any applicable requirements.",
    cites: [s("70.5", "(c)")], related: ["title-v"],
  },
  {
    slug: "laer", term: "Lowest achievable emission rate", abbr: "LAER", category: "New Source Review",
    definition: "The emission limit required for Nonattainment NSR projects: the most stringent limit in any SIP or achieved in practice for the source category, without the cost considerations that apply to BACT.",
    cites: [s("51.165", "(a)(1)(xiii)")], related: ["nnsr", "bact", "offsets"],
  },
  {
    slug: "ldar", term: "Leak detection and repair", abbr: "LDAR", category: "Monitoring & Testing",
    definition: "Programs that monitor equipment such as valves, connectors, pumps, and compressors for leaks and repair them within set timeframes. Method 21 and optical gas imaging are common monitoring methods; the governing subpart or permit sets frequencies and leak definitions.",
    cites: [part(60, "40 CFR Part 60 (Method 21 and equipment leak subparts)")], related: ["fugitive-emissions"],
  },
  {
    slug: "mact", term: "Maximum achievable control technology", abbr: "MACT", category: "NSPS & NESHAP",
    definition: "The technology-based standards EPA sets under Clean Air Act section 112(d) for major sources of hazardous air pollutants, codified as Part 63 subparts. MACT floors are based on the performance of the best-controlled existing sources.",
    cites: [usc(7412, "Clean Air Act §112(d)"), part(63, "40 CFR Part 63")], related: ["neshap", "major-source-hap", "gact"],
  },
  {
    slug: "major-modification", term: "Major modification", category: "New Source Review",
    definition: "A physical change or change in the method of operation of a major stationary source that would result in both a significant emissions increase and a significant net emissions increase of a regulated NSR pollutant. Both steps are calculated as the rule describes.",
    cites: [s("52.21", "(b)(2)"), s("52.21", "(a)(2)(iv)")], related: ["baseline-actual-emissions", "projected-actual-emissions", "net-emissions-increase", "significant"],
    links: [{ label: "NSR Baseline Calculator", href: "/tools/nsr-baseline-calculator" }],
  },
  {
    slug: "major-source-hap", term: "Major source (HAP)", category: "NSPS & NESHAP",
    definition: "A stationary source, or group of sources at a contiguous site under common control, with the potential to emit hazardous air pollutants at or above the levels in Clean Air Act section 112(a)(1), for any single HAP or all HAP combined.",
    cites: [s("63.2"), usc(7412, "Clean Air Act §112(a)(1)")], related: ["area-source", "potential-to-emit", "hap"],
  },
  {
    slug: "major-source-title-v", term: "Major source (Title V)", category: "Title V",
    definition: "A source that is major under section 112 (HAP), under section 302 or Part D of the Clean Air Act for criteria pollutants, with lower levels in some nonattainment areas. The Title V definition covers all of these for operating permit applicability.",
    cites: [s("70.2")], related: ["title-v", "potential-to-emit", "synthetic-minor"],
  },
  {
    slug: "major-stationary-source", term: "Major stationary source (PSD)", category: "New Source Review",
    definition: "For PSD, a stationary source in one of the listed source categories with potential to emit at or above the lower threshold in the rule, or any other stationary source at or above the higher threshold, for a regulated NSR pollutant.",
    cites: [s("52.21", "(b)(1)")], related: ["psd", "potential-to-emit", "stationary-source"],
  },
  {
    slug: "malfunction", term: "Malfunction", category: "NSPS & NESHAP",
    definition: "A sudden, infrequent, and not reasonably preventable failure of air pollution control or process equipment, or of a process to operate in a normal or usual manner. Failures caused in part by poor maintenance or careless operation are not malfunctions.",
    cites: [s("60.2"), s("63.2")], related: ["startup-shutdown", "deviation"],
  },
  {
    slug: "modification-nsps", term: "Modification (NSPS)", category: "NSPS & NESHAP",
    definition: "Under NSPS, a physical or operational change to an existing facility that increases the hourly emission rate of a pollutant to which a standard applies, or results in emission of a new one. The rule lists changes that are not modifications.",
    cites: [s("60.2"), s("60.14")], related: ["affected-facility", "reconstruction", "major-modification"],
  },
  {
    slug: "naaqs", term: "National Ambient Air Quality Standards", abbr: "NAAQS", category: "Air Quality Planning",
    definition: "Health-based (primary) and welfare-based (secondary) standards for outdoor air concentrations of the criteria pollutants. Area designations and PSD air quality analyses are measured against them.",
    cites: [part(50, "40 CFR Part 50")], related: ["criteria-pollutants", "attainment-area"],
  },
  {
    slug: "net-emissions-increase", term: "Net emissions increase", category: "New Source Review",
    definition: "The project's emissions increase plus other creditable increases and decreases at the source during the contemporaneous period. This netting step (Step 2) follows the project emissions increase calculation (Step 1).",
    cites: [s("52.21", "(b)(3)")], related: ["major-modification", "significant"],
  },
  {
    slug: "neshap", term: "National Emission Standards for Hazardous Air Pollutants", abbr: "NESHAP", category: "NSPS & NESHAP",
    definition: "Federal standards for hazardous air pollutants: the original pollutant-specific standards in Part 61 and the source-category (MACT and GACT) standards in Part 63.",
    cites: [part(61, "40 CFR Part 61"), part(63, "40 CFR Part 63")], related: ["mact", "gact", "hap"],
    links: [{ label: "NESHAP overview", href: "/regulations/neshap" }],
  },
  {
    slug: "nnsr", term: "Nonattainment New Source Review", abbr: "NNSR", category: "New Source Review",
    definition: "Preconstruction review for new major sources and major modifications in nonattainment areas, for the pollutants for which the area is nonattainment. It requires LAER, emission offsets, and other demonstrations.",
    cites: [s("51.165"), part(51, "40 CFR Part 51, Appendix S")], related: ["laer", "offsets", "psd", "attainment-area"],
    links: [{ label: "Nonattainment NSR overview", href: "/regulations/nonattainment-nsr" }],
  },
  {
    slug: "nsps", term: "New Source Performance Standards", abbr: "NSPS", category: "NSPS & NESHAP",
    definition: "Technology-based standards under Clean Air Act section 111 for new, modified, and reconstructed facilities in listed source categories, codified as Part 60 subparts. They apply on their own terms, whatever permit path a facility takes.",
    cites: [part(60, "40 CFR Part 60")], related: ["affected-facility", "modification-nsps"],
    links: [{ label: "NSPS overview", href: "/regulations/nsps" }],
  },
  {
    slug: "offsets", term: "Emission offsets", category: "New Source Review",
    definition: "Enforceable emission reductions from existing sources that a Nonattainment NSR project must obtain to balance its new emissions. The rule and the state program set the ratio and what reductions qualify.",
    cites: [s("51.165", "(a)(3)")], related: ["nnsr", "laer"],
  },
  {
    slug: "opacity", term: "Opacity", category: "Monitoring & Testing",
    definition: "The degree to which emissions reduce the transmission of light and obscure the view of an object in the background, expressed as a percent. It is measured by trained observers with Method 9 or by a continuous opacity monitor.",
    cites: [s("60.2")], related: ["performance-test", "cems"],
  },
  {
    slug: "pal", term: "Plantwide applicability limitation", abbr: "PAL", category: "New Source Review",
    definition: "An optional emission cap for an existing major stationary source. Changes that keep the source under the PAL are not major modifications for that pollutant, in exchange for monitoring and recordkeeping of the whole cap.",
    cites: [s("52.21", "(aa)")], related: ["major-modification", "baseline-actual-emissions"],
  },
  {
    slug: "pbr", term: "Permit by rule", abbr: "PBR", category: "State Programs",
    definition: "A state authorization in which a facility qualifies by meeting conditions written in rule, often with registration or notice, instead of applying for a case-by-case permit. Texas, for example, sets out its permits by rule in 30 TAC Chapter 106.",
    cites: [{ label: "30 TAC Chapter 106 (Texas Secretary of State)", url: "https://texreg.sos.state.tx.us/public/readtac$ext.ViewTAC?tac_view=4&ti=30&pt=1&ch=106" }], related: ["minor-nsr"],
    links: [{ label: "Texas air permits", href: "/states/texas" }],
  },
  {
    slug: "performance-test", term: "Performance test", category: "Monitoring & Testing",
    definition: "A stack test, using the reference methods a standard specifies, to show compliance with an emission limit. NSPS and NESHAP general provisions set notification, test plan, operating condition, and reporting requirements, and the subpart adds its own.",
    cites: [s("60.8"), s("63.7")], related: ["opacity", "cems"],
    links: [{ label: "O2 Correction Calculator", href: "/tools/o2-correction" }, { label: "ppm to lb/hr Converter", href: "/tools/ppm-to-lb-hr" }],
  },
  {
    slug: "permit-shield", term: "Permit shield", category: "Title V",
    definition: "A Title V provision, where the permitting authority grants it, that treats compliance with the permit as compliance with the applicable requirements it identifies, or records that specific requirements do not apply.",
    cites: [s("70.6", "(f)")], related: ["applicable-requirement", "title-v"],
  },
  {
    slug: "minor-nsr", term: "Minor New Source Review", category: "New Source Review",
    definition: "State preconstruction review of new and modified sources that are not major. Federal rules require states to have such a program but leave its design to them, so exemptions, permits by rule, general permits, and case-by-case permits vary by state.",
    cites: [s("51.160"), s("51.164")], related: ["pbr", "psd"],
    links: [{ label: "State Explorer", href: "/states" }],
  },
  {
    slug: "potential-to-emit", term: "Potential to emit", abbr: "PTE", category: "Emissions",
    definition: "The maximum capacity of a source to emit a pollutant under its physical and operational design. Limits on operation, such as hours, throughput, or control equipment, count only if they are enforceable. PSD, Title V, and Part 63 each define PTE.",
    cites: [s("52.21", "(b)(4)"), s("70.2"), s("63.2")], related: ["synthetic-minor", "federally-enforceable", "actual-emissions"],
    links: [{ label: "Guide: potential to emit", href: "/resources/potential-to-emit-explained" }, { label: "Emission Calculators", href: "/calculators" }],
  },
  {
    slug: "projected-actual-emissions", term: "Projected actual emissions", category: "New Source Review",
    definition: "The maximum annual rate an existing unit is projected to emit after a project, over the period the rule specifies, considering all relevant information. The owner may exclude emissions the unit could have accommodated during the baseline period that are unrelated to the project, or elect to use potential to emit instead.",
    cites: [s("52.21", "(b)(41)")], related: ["baseline-actual-emissions", "major-modification"],
    links: [{ label: "NSR Baseline Calculator", href: "/tools/nsr-baseline-calculator" }],
  },
  {
    slug: "psd", term: "Prevention of Significant Deterioration", abbr: "PSD", category: "New Source Review",
    definition: "Preconstruction review for new major sources and major modifications in attainment or unclassifiable areas. It requires BACT, an air quality analysis against the NAAQS and increments, an additional impacts analysis, and public participation.",
    cites: [s("52.21"), s("51.166")], related: ["bact", "nnsr", "major-stationary-source", "major-modification"],
    links: [{ label: "PSD overview", href: "/regulations/psd" }, { label: "Guide: PSD vs. NNSR vs. minor NSR", href: "/resources/psd-vs-minor-nsr" }],
  },
  {
    slug: "reconstruction", term: "Reconstruction", category: "NSPS & NESHAP",
    definition: "Replacement of components of an existing facility to such an extent that the fixed capital cost of the new components exceeds the share of the cost of a comparable new facility set in the rule. A reconstructed facility can become subject to NSPS or NESHAP as if it were new.",
    cites: [s("60.15"), s("63.2")], related: ["modification-nsps", "affected-facility"],
  },
  {
    slug: "regulated-nsr-pollutant", term: "Regulated NSR pollutant", category: "New Source Review",
    definition: "The pollutants NSR reviews: those with a NAAQS (and their precursors as the rule specifies), pollutants subject to NSPS, certain other Clean Air Act pollutants, and pollutants otherwise subject to regulation. HAP listed under section 112 are generally excluded.",
    cites: [s("52.21", "(b)(50)")], related: ["significant", "psd"],
  },
  {
    slug: "responsible-official", term: "Responsible official", category: "Title V",
    definition: "The person defined in the Title V rules who signs and certifies applications, reports, and compliance certifications, typically a corporate officer or a delegated plant manager meeting the rule's criteria.",
    cites: [s("70.2")], related: ["annual-compliance-certification", "title-v"],
  },
  {
    slug: "semiannual-monitoring-report", term: "Semiannual monitoring report", category: "Title V",
    definition: "The periodic Title V report of required monitoring, in which all deviations from permit requirements must be clearly identified. The permit sets the reporting periods and due dates.",
    cites: [s("70.6", "(a)(3)(iii)(A)")], related: ["deviation", "annual-compliance-certification"],
    links: [{ label: "Title V Deviation Log", href: "/tools/deviation-log" }],
  },
  {
    slug: "significant", term: "Significant (emission rate)", category: "New Source Review",
    definition: "The pollutant-specific emission rates the PSD rule lists for deciding whether an increase is significant, plus any emission rate for a source near a Class I area that the rule specifies. States may set their own values in their approved programs.",
    cites: [s("52.21", "(b)(23)")], related: ["major-modification", "net-emissions-increase"],
  },
  {
    slug: "sip", term: "State Implementation Plan", abbr: "SIP", category: "Air Quality Planning",
    definition: "A state's plan for attaining and maintaining the NAAQS, including its air rules and permitting programs. Once EPA approves a SIP rule, it becomes federally enforceable; approvals are codified by state in 40 CFR Part 52.",
    cites: [part(52, "40 CFR Part 52"), usc(7410, "Clean Air Act §110")], related: ["naaqs", "federally-enforceable"],
    links: [{ label: "Federal Air Rule Tracker (SIP actions)", href: "/regulatory-updates" }],
  },
  {
    slug: "startup-shutdown", term: "Startup and shutdown", category: "NSPS & NESHAP",
    definition: "The setting in operation, and the cessation of operation, of an affected source or unit, as each program defines them. Many current standards apply at all times, including startup and shutdown, or specify alternative work practices for those periods.",
    cites: [s("60.2"), s("63.2")], related: ["malfunction"],
  },
  {
    slug: "stationary-source", term: "Stationary source", category: "New Source Review",
    definition: "Any building, structure, facility, or installation that emits or may emit a regulated NSR pollutant. Activities are one source when they belong to the same industrial grouping, are on contiguous or adjacent properties, and are under common control.",
    cites: [s("52.21", "(b)(5)"), s("52.21", "(b)(6)")], related: ["emissions-unit", "major-stationary-source"],
  },
  {
    slug: "synthetic-minor", term: "Synthetic minor", category: "Emissions",
    definition: "A term of practice for a source whose uncontrolled potential to emit would make it major, but which takes enforceable limits (such as on hours, throughput, or control efficiency) that keep its potential to emit below major source levels. The limits need monitoring and records that prove compliance.",
    cites: [s("52.21", "(b)(4)"), s("70.2")], related: ["potential-to-emit", "federally-enforceable", "major-source-title-v"],
    links: [{ label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" }],
  },
  {
    slug: "title-v", term: "Title V operating permit", category: "Title V",
    definition: "The operating permit required for major sources and certain other sources under Title V of the Clean Air Act. It compiles every applicable requirement in one document and adds monitoring, recordkeeping, reporting, and certification.",
    cites: [part(70, "40 CFR Part 70"), part(71, "40 CFR Part 71")], related: ["applicable-requirement", "major-source-title-v", "deviation"],
    links: [{ label: "Guide: Title V basics", href: "/resources/title-v-basics" }, { label: "Compliance Matrix Builder", href: "/tools/compliance-matrix-builder" }],
  },
  {
    slug: "voc", term: "Volatile organic compounds", abbr: "VOC", category: "Emissions",
    definition: "Compounds of carbon that participate in atmospheric photochemical reactions, excluding the compounds EPA lists as having negligible photochemical reactivity (such as methane and ethane). VOC is regulated mainly as an ozone precursor.",
    cites: [s("51.100", "(s)")], related: ["criteria-pollutants"],
  },
];

export const getTerm = (slug: string) => glossary.find((g) => g.slug === slug);
