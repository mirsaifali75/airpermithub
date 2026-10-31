import { AP42_7_1, EPA_PTE_1989, EPA_PTE_1995, RT } from "@/lib/tools/rule-text";
import type { Guide } from "./guides";

/**
 * Rule guides: the applicability and estimating questions that come up on
 * almost every project. Same editorial rules as guides.ts. The prose explains
 * how the pieces fit; every threshold, date, and limit appears only in the
 * quoted text (`quotes`), taken from rule-text.ts so it is checked against the
 * eCFR snapshot and the monthly source check.
 */

const ecfr = (section: string, para?: string) => `https://www.ecfr.gov/current/title-40/section-${section}${para ? `#p-${section}${para}` : ""}`;

export const ruleGuides: Guide[] = [
  {
    slug: "writing-a-synthetic-minor-limit",
    title: "Writing a synthetic minor limit that holds up",
    summary: "What EPA guidance says an enforceable limit on potential to emit has to contain, how to choose the averaging period and the parameter you limit, and the records that keep a synthetic minor source minor.",
    category: "Air Permitting",
    scene: "midstream",
    readMinutes: 10,
    published: "2026-10-31",
    sections: [
      {
        heading: "What the limit has to do",
        paragraphs: [
          "A synthetic minor source could emit above a major source threshold at full design capacity, and takes limits that keep its potential to emit below it. The limit works only if it changes potential to emit, and it changes potential to emit only if it can be enforced.",
          "The definition starts from design capacity. Anything that brings the number down, whether an hours cap, a throughput cap, or a control device, counts only when it is written into an enforceable requirement. Read the definition in the program you are applying under; the PSD definition is at 40 CFR 52.21(b)(4) and the Title V definition at 40 CFR 70.2.",
        ],
        quotes: [RT.ptePart70],
      },
      {
        heading: "The two tests in EPA's guidance",
        paragraphs: [
          "EPA's 1989 guidance on limiting potential to emit in new source permitting gives two criteria. The first is about the legal vehicle: the permit or plan the limit sits in. The second, enforceable as a practical matter, is about the wording: whether someone outside the facility can tell from the permit and the records whether the source complied.",
          "The second test is where drafting matters. A limit can sit in a valid permit and still fail it, for example an annual emission cap with no stated way to calculate emissions.",
        ],
        quotes: [RT.pte89TwoCriteria],
      },
      {
        heading: "Three things each condition must say",
        paragraphs: ["EPA's 1995 memo on options for limiting potential to emit lists what a source-specific permit has to specify. Use it as a drafting checklist for each limit:"],
        list: [
          "What is limited, stated precisely, and which units or parts of the source it covers",
          "The time period the limit applies over",
          "How compliance is determined: the monitoring, the calculation, the records, and the reports",
        ],
        quotes: [RT.pte95Elements],
      },
      {
        heading: "Choose the averaging period on purpose",
        paragraphs: [
          "A long averaging period gives operations room, but it also lets a source run at full capacity for part of the period. EPA guidance prefers short-term limits and allows rolling limits where the permitting authority accepts that compliance can be readily determined. Look at what your agency has accepted for similar sources, and raise it early if you need a longer period.",
          "A rolling limit is checked every period, not once a year. The Rolling 12-Month Limit Tracker sets up the monthly check and shows next month's headroom.",
        ],
        quotes: [RT.pte89Month, RT.pte89Rolling, RT.pte95Averaging],
      },
      {
        heading: "Limit something you can measure",
        paragraphs: [
          "Few minor sources measure emissions directly. The usual approach limits an operating parameter that drives emissions, such as fuel burned, throughput, or hours, and ties it to emissions with a stated factor or equation. Each limit should stand on its own: if the permit caps both throughput and hours, each is a separate condition that can be checked.",
          "Keep the emission factor behind the limit in the permit record, with its source document and revision, so the basis stays clear if the factor is later revised.",
        ],
        quotes: [RT.pte95Parameters, RT.pte89Independent],
      },
      {
        heading: "When a control device does the work",
        paragraphs: [
          "If the limit relies on a control device, its efficiency alone is not enough. The permit needs the operating conditions the efficiency depends on, such as a minimum operating temperature, a pilot flame, or a closed vent system that stays closed, with monitoring of each.",
          "Claim only the efficiency you can support: a performance test, a value the applicable rule allows, or a manufacturer guarantee the agency accepts.",
        ],
        quotes: [RT.pte89Controls],
      },
      {
        heading: "Records that keep the source minor",
        paragraphs: [
          "The records are the proof. Plan them with the limit: what is metered or logged and how often, who calculates the total and when, where the factor comes from, and how long records are kept. A month without records is a month the source can't show it complied.",
          "Date each calculation, and keep the original when a month is corrected, so the file shows both.",
        ],
        quotes: [RT.pte89Records],
      },
      {
        heading: "Some federal rules set their own list",
        paragraphs: [
          "A few rules say what a limit must contain before it can lower potential emissions for that rule's applicability. NSPS Subpart OOOOb does this for tank batteries. If a limit is meant to keep equipment out of a rule like this, check it against that rule's list as well as the general guidance.",
        ],
        quotes: [RT.o4bLimit, RT.o4bLimitA, RT.o4bLimitB, RT.o4bLimitC, RT.o4bLimitD, RT.o4bLimitE, RT.o4bLimitF],
      },
      {
        heading: "Before you submit",
        paragraphs: ["Check the draft conditions against this list:"],
        list: [
          "Potential to emit without the limit is calculated first, so the limit's effect is visible",
          "Each limit names the units it covers, the limited quantity, and the averaging period",
          "The calculation from the monitored parameter to emissions is written out, with the factor's source",
          "Monitoring, records, and reports are specific enough for an inspector to check",
          "Control device conditions match the basis of the claimed efficiency",
          "Any rule-specific list, such as OOOOb's for tank batteries, is met",
          "Operations knows the limit and gets a monthly budget against it",
        ],
      },
    ],
    sources: [
      { title: EPA_PTE_1989.title, url: EPA_PTE_1989.url },
      { title: EPA_PTE_1995.title, url: EPA_PTE_1995.url },
      { title: "40 CFR 70.2: definitions, including potential to emit (eCFR)", url: ecfr("70.2") },
      { title: "40 CFR 52.21(b)(4): potential to emit (eCFR)", url: ecfr("52.21", "(b)(4)") },
      { title: "40 CFR 60.5365b: OOOOb applicability, including tank battery limits (eCFR)", url: ecfr("60.5365b", "(e)(2)(i)") },
    ],
    related: [
      { label: "Potential to emit, explained", href: "/resources/potential-to-emit-explained" },
      { label: "Tracking a 12-month rolling limit", href: "/resources/tracking-rolling-12-month-limits" },
      { label: "Rolling 12-Month Limit Tracker", href: "/tools/rolling-12-month-tracker" },
      { label: "Emission Calculators", href: "/calculators" },
    ],
  },
  {
    slug: "engine-rules-iiii-jjjj-zzzz",
    title: "Engines: sorting out NSPS IIII, NSPS JJJJ, and NESHAP ZZZZ",
    summary: "Which federal rules to read for a stationary engine, the dates that decide them, and why the site's HAP status matters as much as the engine.",
    category: "Federal Regulations",
    scene: "oil-gas",
    readMinutes: 9,
    published: "2026-10-31",
    sections: [
      {
        heading: "Three rules, one engine",
        paragraphs: [
          "A stationary reciprocating engine can fall under three federal rules at once. NSPS Subpart IIII covers compression ignition (CI) engines and NSPS Subpart JJJJ covers spark ignition (SI) engines; both turn on construction, modification, or reconstruction dates. NESHAP Subpart ZZZZ covers stationary engines at major and area sources of HAP alike, so every stationary engine needs a ZZZZ check.",
          "Work in this order: engine type, then the dates, then the site's HAP status.",
        ],
        quotes: [RT.zzzzApplies],
      },
      {
        heading: "The order date is the construction date",
        paragraphs: [
          "For both NSPS rules, construction commences when the engine is ordered, not when it is delivered, set, or started. Find the purchase order. Then find the manufacture date on the nameplate or in the manufacturer's records; the rules use both dates.",
        ],
        quotes: [RT.iiiiOrder, RT.jjjjOrder],
      },
      {
        heading: "Compression ignition engines: Subpart IIII",
        paragraphs: [
          "For a CI engine, Subpart IIII looks at the order date and the manufacture date, with a separate manufacture date for certified fire pump engines. Modified and reconstructed engines have their own date. Read 40 CFR 60.4200 in full for the manufacturer and other owner cases not quoted here.",
        ],
        quotes: [RT.iiiiNew, RT.iiiiMfg, RT.iiiiFire, RT.iiiiMod],
      },
      {
        heading: "Spark ignition engines: Subpart JJJJ",
        paragraphs: [
          "Subpart JJJJ works the same way, but the manufacture date that matters depends on the engine's maximum engine power and type. Know the power rating, whether the engine is lean burn, and whether it is an emergency engine before reading the dates. Read 40 CFR 60.4230 in full for the other cases.",
        ],
        quotes: [RT.jjjjNew, RT.jjjjBig, RT.jjjjLean, RT.jjjjSmall, RT.jjjjEmerg, RT.jjjjMod],
      },
      {
        heading: "Subpart ZZZZ: settle the site's HAP status first",
        paragraphs: [
          "Under ZZZZ, whether an engine is new or existing depends on the site's HAP status and, at major sources, on the engine's site rating. Determine major or area status before anything else; the guide on major and area sources covers how. At oil and gas production facilities, ZZZZ makes that determination for each surface site.",
        ],
        quotes: [RT.hapSurfaceSite, RT.zzzzExistBig, RT.zzzzExistSmall, RT.zzzzExistArea],
      },
      {
        heading: "When meeting the NSPS meets ZZZZ",
        paragraphs: [
          "For many new or reconstructed engines, ZZZZ is met by meeting Subpart IIII or JJJJ, and nothing further applies under ZZZZ. New and reconstructed engines at area sources are one of the listed cases. For engines at major sources the list depends on engine type and site rating, so read all of 40 CFR 63.6590(c).",
        ],
        quotes: [RT.zzzzViaNsps, RT.zzzzViaArea],
      },
      {
        heading: "Exclusions to check",
        paragraphs: [
          "Some engines don't have to meet ZZZZ at all, or only part of it: certain existing engines at major sources, and certain existing emergency engines at area sources. Each exclusion depends on the rule's definitions, including what counts as an emergency engine and how it may operate, so read the definition before relying on one.",
        ],
        quotes: [RT.zzzzNone, RT.zzzzAreaEmerg],
      },
      {
        heading: "What to collect for each engine",
        paragraphs: ["With these in hand, the Applicability Checker walks each engine through the quoted rule text and lists what is still missing."],
        list: [
          "Make, model, serial number, and a photo of the nameplate",
          "Order date and manufacture date, with the documents that show them",
          "CI or SI; for SI, rich burn or lean burn, and two-stroke or four-stroke",
          "Maximum engine power and site rating",
          "Fuel, and whether the engine is certified by the manufacturer",
          "Emergency, limited use, or non-emergency service, and how hours are recorded",
          "Any modification or reconstruction, with dates and costs",
          "The site's major or area status for HAP, and the basis for it",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 60.4200: Subpart IIII applicability (eCFR)", url: ecfr("60.4200") },
      { title: "40 CFR 60.4230: Subpart JJJJ applicability (eCFR)", url: ecfr("60.4230") },
      { title: "40 CFR 63.6585: Subpart ZZZZ applicability (eCFR)", url: ecfr("63.6585") },
      { title: "40 CFR 63.6590: Subpart ZZZZ affected sources (eCFR)", url: ecfr("63.6590") },
    ],
    related: [
      { label: "Applicability Checker", href: "/applicability" },
      { label: "NSPS IIII in the Rule Library", href: "/regulations/nsps/subpart-iiii" },
      { label: "NSPS JJJJ in the Rule Library", href: "/regulations/nsps/subpart-jjjj" },
      { label: "NESHAP ZZZZ in the Rule Library", href: "/regulations/neshap/subpart-zzzz" },
      { label: "Engine emissions calculator", href: "/calculators/engines" },
    ],
  },
  {
    slug: "major-or-area-source-of-hap",
    title: "Major or area source of HAP: the first NESHAP question",
    summary: "How major and area source status is defined, what goes into the determination, how oil and gas sites are counted, and why the answer decides which NESHAP subparts apply.",
    category: "Federal Regulations",
    scene: "chemical",
    readMinutes: 8,
    published: "2026-10-31",
    sections: [
      {
        heading: "Why it comes first",
        paragraphs: [
          "Many NESHAP subparts apply only to major sources of HAP, some only to area sources, and some to both with different requirements. The boiler rules show the split: Subpart DDDDD covers boilers and process heaters at major sources, and Subpart JJJJJJ covers boilers at area sources.",
        ],
        quotes: [RT.ddddd, RT.jjjjjj],
      },
      {
        heading: "The definitions",
        paragraphs: [
          "The general definitions are in 40 CFR 63.2. Major source status is based on potential to emit HAP, considering controls, from all stationary sources in a contiguous area under common control. An area source is any source of HAP that isn't major. Some subparts define major source for their own category, so read the subpart's definitions as well.",
        ],
        quotes: [RT.hapMajor, RT.hapArea],
      },
      {
        heading: "What goes into the number",
        paragraphs: [
          "Use potential to emit, not actual emissions. Include every HAP-emitting unit at the site under common control, including units no NESHAP covers, and compare both the largest single HAP and the total of all HAP with the definition.",
          "Controls and operating limits lower potential to emit only if they are enforceable; see the definition of potential to emit in 40 CFR 63.2. Keep the HAP speciation behind each estimate, because the single-HAP comparison depends on it.",
        ],
      },
      {
        heading: "Oil and gas sites are counted differently",
        paragraphs: [
          "The oil and gas rules count major source status their own way. Subpart ZZZZ makes the determination for each surface site at production facilities. Subpart HH, for oil and natural gas production facilities, uses the definition in 40 CFR 63.761 and lets the owner estimate emissions from maximum throughput.",
          "Subpart HH also requires a facility that is not major, but whose actual emissions are close, to update its determination every year. Read 40 CFR 63.760(c) before concluding a production facility is an area source.",
        ],
        quotes: [RT.hapSurfaceSite, RT.hhSources, RT.hhThroughput, RT.hhUpdate],
      },
      {
        heading: "Area source doesn't mean no NESHAP",
        paragraphs: [
          "Area sources have standards too: Subpart HH covers TEG dehydration units at area sources, ZZZZ covers engines, and JJJJJJ covers boilers. Some area source rules also say whether being subject to them requires a Title V permit; ZZZZ is one.",
        ],
        quotes: [RT.hhAreaTeg, RT.zzzzAreaNoTv],
      },
      {
        heading: "Staying an area source",
        paragraphs: [
          "A source near the line can take enforceable limits on HAP to stay an area source; the guide on writing a synthetic minor limit covers how. Subpart HH says it doesn't stand in the way. A source that later becomes major has to meet the major source requirements, so revisit the determination whenever equipment, throughput, or gas composition changes.",
        ],
        quotes: [RT.hhLimitPte, RT.hhBecomesMajor],
      },
      {
        heading: "Document the determination",
        paragraphs: ["Keep a written determination with:"],
        list: [
          "The site boundary and the basis for contiguous area and common control",
          "Every HAP-emitting unit, with capacity and potential to emit for each HAP",
          "The factor, model, or analysis behind each estimate, with its source and date",
          "Each enforceable limit relied on, by permit and condition number",
          "The largest single HAP and the total, compared with the definition",
          "The date of the determination and the changes that would call for a new one",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 63.2: definitions for Part 63 (eCFR)", url: ecfr("63.2") },
      { title: "40 CFR 63.7485: Subpart DDDDD applicability (eCFR)", url: ecfr("63.7485") },
      { title: "40 CFR 63.11193: Subpart JJJJJJ applicability (eCFR)", url: ecfr("63.11193") },
      { title: "40 CFR 63.6585: Subpart ZZZZ applicability (eCFR)", url: ecfr("63.6585") },
      { title: "40 CFR 63.760: Subpart HH applicability (eCFR)", url: ecfr("63.760") },
      { title: "40 CFR 63.761: Subpart HH definitions (eCFR)", url: ecfr("63.761") },
    ],
    related: [
      { label: "Applicability Checker", href: "/applicability" },
      { label: "Writing a synthetic minor limit", href: "/resources/writing-a-synthetic-minor-limit" },
      { label: "NESHAP HH in the Rule Library", href: "/regulations/neshap/subpart-hh" },
      { label: "NESHAP ZZZZ in the Rule Library", href: "/regulations/neshap/subpart-zzzz" },
    ],
  },
  {
    slug: "storage-tank-rules-kb-kc-oooob",
    title: "Storage tank rules: Kb, Kc, and the oil and gas NSPS",
    summary: "How construction date, capacity, vapor pressure, and place in the oil and gas source category decide which NSPS covers a storage vessel, and how OOOOb looks at the tank battery instead of the tank.",
    category: "Federal Regulations",
    scene: "tank-farm",
    readMinutes: 10,
    published: "2026-10-31",
    sections: [
      {
        heading: "Two families of rules",
        paragraphs: [
          "A storage vessel can fall under the volatile organic liquid storage NSPS (Subparts Kb and Kc) or, in the crude oil and natural gas source category, the oil and gas NSPS (Subparts OOOO, OOOOa, and OOOOb). Which one depends on when the vessel was built or changed, its size, what it stores, and where it sits. Vessels built before the Kb window may fall under older Part 60 subparts not covered here.",
        ],
      },
      {
        heading: "Kb and Kc: the date window comes first",
        paragraphs: [
          "Kb and Kc split by the date construction, reconstruction, or modification commenced. Each then sets capacity and vapor pressure conditions, so you need the vessel's design capacity and the maximum true vapor pressure of the liquid as stored.",
        ],
        quotes: [RT.kb, RT.kc, RT.kbVp, RT.kcBig, RT.kcSmall],
      },
      {
        heading: "Exclusions that matter for oil and gas",
        paragraphs: [
          "Both subparts exclude vessels up to a stated size used for petroleum or condensate before custody transfer. For production tanks, check that exclusion first, then the oil and gas NSPS. The exemption lists also cover bulk gasoline plants and gasoline service stations; read them in full.",
        ],
        quotes: [RT.kbCustody, RT.kcCustody],
      },
      {
        heading: "The oil and gas NSPS: which subpart by date",
        paragraphs: [
          "OOOO, OOOOa, and OOOOb each cover facilities built, modified, or reconstructed in their own window. Subpart OOOOc is different: it sets emission guidelines for existing sources, which reach a site through a state or federal plan rather than directly.",
        ],
        quotes: [RT.o4Window, RT.o4aWindow, RT.o4bWindow, RT.o4cPlan],
      },
      {
        heading: "OOOO and OOOOa look at each vessel",
        paragraphs: ["Under OOOO and OOOOa, the affected facility is a single storage vessel with potential VOC emissions at or above the rule's threshold."],
        quotes: [RT.o4Tank, RT.o4aTank1, RT.o4aTank],
      },
      {
        heading: "OOOOb looks at the tank battery",
        paragraphs: [
          "OOOOb changed the unit of analysis. The affected facility is the tank battery, and potential emissions are added across all its vessels, for VOC and for methane. A battery below both thresholds stays out only while its calculation is kept on file. Check which vessels make up the battery against the definitions in 40 CFR 60.5430b.",
          "Adding a vessel, or replacing vessels so total capacity goes up, can make an existing battery an affected facility, and so can added throughput on the dates the rule gives. Recalculate whenever the battery changes. Once a battery is an affected facility, a later drop in its potential for VOC emissions doesn't take it out of the rule.",
        ],
        quotes: [RT.o4bTank, RT.o4bTankVoc, RT.o4bTankCh4, RT.o4bCumulative, RT.o4bBelow, RT.o4bMod, RT.o4bModAdd, RT.o4bModReplace, RT.o4bStays],
      },
      {
        heading: "How OOOOb wants the potential calculated",
        paragraphs: [
          "OOOOb sets the method and the throughput basis: a generally accepted model or calculation that accounts for flashing, working, and breathing losses. An enforceable limit can be taken into account, but from the date the rule gives, only if it contains the listed elements. The guide on writing a synthetic minor limit walks through them.",
        ],
        quotes: [RT.o4bWellSite, RT.o4bLimit],
      },
      {
        heading: "What to collect for each vessel",
        paragraphs: ["Gather these before reading the rules:"],
        list: [
          "Design capacity, and the tanks manifolded together",
          "Liquid stored and its maximum true vapor pressure as stored, with the basis",
          "Dates of construction, reconstruction, and modification",
          "Location: well site, centralized production facility, compressor station, processing plant, or elsewhere",
          "Where custody transfer happens",
          "Throughput, how it is measured, and the projected maximum",
          "Vapor recovery and control devices, and what is routed to them",
        ],
      },
    ],
    sources: [
      { title: "40 CFR 60.110b: Subpart Kb applicability (eCFR)", url: ecfr("60.110b") },
      { title: "40 CFR 60.110c: Subpart Kc applicability (eCFR)", url: ecfr("60.110c") },
      { title: "40 CFR 60.5365: Subpart OOOO applicability (eCFR)", url: ecfr("60.5365") },
      { title: "40 CFR 60.5365a: Subpart OOOOa applicability (eCFR)", url: ecfr("60.5365a") },
      { title: "40 CFR 60.5365b: Subpart OOOOb applicability (eCFR)", url: ecfr("60.5365b") },
      { title: "40 CFR 60.5360c: Subpart OOOOc purpose (eCFR)", url: ecfr("60.5360c") },
    ],
    related: [
      { label: "Storage tank emissions guide", href: "/resources/tank-emissions-methods" },
      { label: "Applicability Checker", href: "/applicability" },
      { label: "NSPS Kb in the Rule Library", href: "/regulations/nsps/subpart-kb" },
      { label: "NSPS OOOOb in the Rule Library", href: "/regulations/nsps/subpart-oooob" },
      { label: "Fixed-Roof Tank Losses calculator", href: "/calculators/tank-losses" },
    ],
  },
  {
    slug: "tank-emissions-methods",
    title: "Storage tank emissions: standing, working, and flash losses",
    summary: "How AP-42 Section 7.1 builds fixed-roof tank losses from standing and working losses, where the turnover and product factors come in, why flashing is a separate estimate, and how to check a setup against EPA's example.",
    category: "Emission Calculations",
    scene: "tank-farm",
    readMinutes: 8,
    published: "2026-10-31",
    sections: [
      {
        heading: "Two routine losses",
        paragraphs: [
          "AP-42 Section 7.1 estimates routine losses from a fixed-roof tank in two parts. Standing loss comes from the vapor space breathing as temperature and pressure change through the day. Working loss comes from filling, as rising liquid pushes vapor out of the tank.",
        ],
        quotes: [RT.ap42Total, RT.ap42LtSum],
      },
      {
        heading: "Working loss depends on turnovers",
        paragraphs: [
          "Turnovers compare a year's throughput with the tank's working volume. A tank that turns over often has less time to saturate its vapor space between fills, so AP-42 reduces the working loss with a turnover factor above a set number of turnovers. The reduction doesn't apply to vapor-balanced tanks or tanks where flashing occurs.",
        ],
        quotes: [RT.ap42Kn, RT.ap42KnFlash],
      },
      {
        heading: "Crude oil gets a product factor",
        paragraphs: ["The working loss product factor depends on the liquid stored."],
        quotes: [RT.ap42Kp, RT.ap42KpOther],
      },
      {
        heading: "Flashing is a separate estimate",
        paragraphs: [
          "When liquid from a pressurized separator enters a tank at lower pressure, dissolved gas comes out of solution. The standing and working loss equations don't capture this, and Section 7.1 points to other methods rather than settling on one. Some state agencies publish guidance on the methods they accept; check the state hub and the agency before choosing.",
          "Where flashing occurs, a standing and working loss calculation alone isn't the whole estimate. OOOOb, for example, asks for a method that accounts for flashing, working, and breathing losses when a tank battery's potential is calculated.",
        ],
        quotes: [RT.ap42FlashWhere, RT.ap42Flash],
      },
      {
        heading: "Controls apply to all three losses",
        paragraphs: [
          "If vapors go to a control device, apply its efficiency to flashing as well as standing and working losses. When the result feeds potential to emit, use only the efficiency an enforceable condition supports.",
        ],
        quotes: [RT.ap42FlashControl],
      },
      {
        heading: "Check your setup against EPA's example",
        paragraphs: [
          "Section 7.1 includes worked examples. Before trusting a spreadsheet or tool, run EPA's inputs through it and compare. The AirPermitHub Fixed-Roof Tank Losses calculator is tested against the working loss example quoted here.",
        ],
        quotes: [RT.ap42NExample, RT.ap42LwExample],
      },
      {
        heading: "What to record",
        paragraphs: ["A tank estimate someone else can check records:"],
        list: [
          "Tank dimensions, roof type, and shell and roof color and condition",
          "Liquid stored, with vapor pressure and molecular weight and their source",
          "Annual throughput and its basis: metered, projected, or permitted",
          "The meteorological data used, and where it came from",
          "For flashing: the method, the sample and its conditions, and separator pressure and temperature",
          "Any control device and the basis for its efficiency",
          "The AP-42 section and revision date used",
        ],
      },
    ],
    sources: [
      { title: AP42_7_1.title, url: AP42_7_1.url },
      { title: "40 CFR 60.5365b: Subpart OOOOb applicability, including tank battery potential (eCFR)", url: ecfr("60.5365b", "(e)(2)") },
    ],
    related: [
      { label: "Fixed-Roof Tank Losses calculator", href: "/calculators/tank-losses" },
      { label: "Storage tank rules: Kb, Kc, and OOOOb", href: "/resources/storage-tank-rules-kb-kc-oooob" },
      { label: "Emission Calculators", href: "/calculators" },
      { label: "Potential to emit, explained", href: "/resources/potential-to-emit-explained" },
    ],
  },
];
