import { federalRegulations } from "./data/regulations";
import { industries } from "./data/industries";
import { stateTiles } from "./data/states";
import type { StateAirPermitProfile } from "./data/state-profile-types";
import { calculatorMethods } from "./calc/methods";
import { guides } from "./data/guides";
import { aphTemplates } from "./data/templates";
import { glossary } from "./data/glossary";
import { allToolPages } from "./tools/catalog";
import { ruleCitation, ruleHref, ruleName } from "./rules";
import type { RuleSummary } from "./data/ecfr";

/**
 * Site search index. Phase 1 searches a static in-memory index of site
 * content. Phase 2 replaces `searchIndex` with a database / search-engine
 * query while keeping the same `SearchDoc` shape and filters.
 */

export type SearchKind = "Regulation" | "State" | "Industry" | "Calculator" | "Tool" | "Resource";

export interface SearchDoc {
  title: string;
  href: string;
  kind: SearchKind;
  snippet: string;
  keywords: string;
  /** Rule pages: first and last section, so "60.5365b" finds the subpart that holds it. */
  sections?: [string, string];
}

const tools: SearchDoc[] = [
  { title: "Permit Finder", href: "/permit-finder", kind: "Tool", snippet: "Screen likely permitting paths by state, industry, facility type, and equipment.", keywords: "permit path authorization screening wizard compressor station tank battery" },
  { title: "Emission Calculator", href: "/calculators", kind: "Tool", snippet: "Transparent equipment-based emission calculations.", keywords: "emissions calculator pte potential to emit nox voc co tons per year" },
  { title: "Permit Library", href: "/permits", kind: "Tool", snippet: "Search permits, facilities, and regulatory documents.", keywords: "permit search facility permit number company county" },
  { title: "Compliance Calendar", href: "/compliance", kind: "Tool", snippet: "Track testing, reporting, inspections, and renewals; export to your calendar.", keywords: "compliance calendar deadlines reporting testing ldar inspection" },
  { title: "Air Quality Jobs", href: "/jobs", kind: "Tool", snippet: "Job board preview with sample listings, plus links to official public job boards.", keywords: "jobs careers air quality engineer ehs environmental usajobs" },
];

/** Section landing pages, so a search for the page's name finds it. */
const hubs: SearchDoc[] = [
  { title: "State Explorer: air permits by state", href: "/states", kind: "State", snippet: "Map of all 50 states and DC with each state's permit programs, agency, forms, and guidance.", keywords: "states map state hubs explorer agencies state air permit programs all states" },
  { title: "Regulations Explorer", href: "/regulations", kind: "Regulation", snippet: "Browse federal and state air regulations: NSPS, NESHAP, MACT, Title V, NSR, PSD, GHG reporting, and state programs.", keywords: "regulations rules explorer federal state browse" },
  { title: "Federal air regulations (EPA)", href: "/regulations/federal", kind: "Regulation", snippet: "Federal Clean Air Act programs for stationary sources: NSPS, NESHAP, Title V, NSR, PSD, Nonattainment NSR, and AP-42.", keywords: "federal epa clean air act programs cfr" },
  { title: "Air permitting by industry", href: "/industries", kind: "Industry", snippet: "Industry guidance for oil and gas, midstream, refining, power generation, chemical, manufacturing, mining, and waste.", keywords: "industries sectors industry" },
  { title: "Guides and resources", href: "/resources", kind: "Resource", snippet: "Guides for air permitting professionals: where to start, potential to emit, PSD vs. NSR, Title V, templates, and FAQs.", keywords: "guides articles resources faq learn how to" },
  { title: "Templates and checklists", href: "/templates", kind: "Resource", snippet: "Free CSV templates: equipment, engine, and tank inventories, calculation workbook, permit condition tracker, deviation log, and checklists.", keywords: "templates template checklists checklist csv download spreadsheet forms" },
  { title: "How we verify", href: "/verification", kind: "Resource", snippet: "How AirPermitHub checks every quote, threshold, citation, and link against government sources and the current eCFR.", keywords: "verification verify sources accuracy methodology citations checked" },
  { title: "About AirPermitHub", href: "/about", kind: "Resource", snippet: "Who runs AirPermitHub and how it works.", keywords: "about who company" },
  { title: "Contact", href: "/contact", kind: "Resource", snippet: "Questions, corrections, and employer inquiries.", keywords: "contact email support correction feedback" },
];

/** Shown before the user types, so the main sections are one tap away. */
export const quickLinks: { label: string; href: string }[] = [
  { label: "State Explorer", href: "/states" },
  { label: "Federal Rule Library", href: "/regulations/library" },
  { label: "Permit Finder", href: "/permit-finder" },
  { label: "Emission Calculators", href: "/calculators" },
  { label: "Practitioner Tools", href: "/tools" },
  { label: "Guides", href: "/resources" },
];

/** Builds the index. Call on the server; pass the result to client search UI. */
export function buildSearchIndex(profiles: StateAirPermitProfile[], rules: RuleSummary[] = []): SearchDoc[] {
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  return [
  ...tools,
  ...hubs,
  { title: "Practitioner Tools", href: "/tools", kind: "Tool" as const, snippet: "Rolling limits, NSR baselines, compliance matrices, deviation logs, and stack test converters.", keywords: "tools rolling nsr baseline compliance matrix deviation converter" },
  ...allToolPages.map((t) => ({ title: t.name, href: t.href, kind: "Tool" as const, snippet: t.description, keywords: t.keywords })),
  ...glossary.map((g) => ({
    title: `${g.term}${g.abbr ? ` (${g.abbr})` : ""}: definition`,
    href: `/glossary#${g.slug}`,
    kind: "Resource" as const,
    snippet: g.definition,
    keywords: `glossary definition meaning ${g.abbr ?? ""} ${g.cites.map((c) => c.label).join(" ")}`,
  })),
  ...federalRegulations.map((r) => ({
    title: `${r.shortName} — ${r.name}${r.citation.length <= 25 ? ` (${r.citation})` : ""}`,
    href: `/regulations/${r.slug}`,
    kind: "Regulation" as const,
    snippet: `${r.citation}. ${r.tagline}`,
    keywords: [r.citation, r.summary, ...(r.keySubparts ?? []).map((s) => `${s.code} ${s.title} ${s.code.replace(/^.*Subpart\s+/, "")}`)].join(" "),
  })),
  { title: "Federal Rule Library", href: "/regulations/library", kind: "Regulation" as const, snippet: "NSPS, NESHAP, and GHG reporting subparts with eCFR text, section lists, and amendment dates.", keywords: "subpart library ecfr cfr rule text nsps neshap mact ghgrp" },
  ...rules.map((r) => ({
    title: `${ruleName(r)}${r.aka.length ? ` (${r.aka[0]})` : ""}`,
    href: ruleHref(r),
    kind: "Regulation" as const,
    snippet: `${ruleCitation(r)}. ${r.shortHeading}.`,
    keywords: [`subpart ${r.subpart}`, r.subpart, `40 cfr ${r.part}`, `part ${r.part}`, r.heading, ...r.aka].join(" "),
    ...(r.sectionRange ? { sections: r.sectionRange } : {}),
  })),
  ...stateTiles.map((s) => {
    const hub = bySlug.get(s.slug);
    return {
      title: `${s.name} air permits`,
      href: `/states/${s.slug}`,
      kind: "State" as const,
      snippet: hub ? `${hub.agency.name}. ${hub.overview}` : "State hub in development.",
      keywords: hub
        ? [s.code, hub.agency.name, ...hub.permitTypes.map((p) => `${p.name} ${p.citation ?? ""}`), ...(hub.oilAndGas?.programs ?? []).map((p) => `${p.name} oil gas compressor`), ...hub.regulations.map((r) => `${r.citation} ${r.title}`)].join(" ")
        : s.code,
    };
  }),
  ...industries.map((i) => ({
    title: `${i.name} air permitting`,
    href: `/industries/${i.slug}`,
    kind: "Industry" as const,
    snippet: i.summary,
    keywords: [...i.equipment, ...i.commonSources].join(" "),
  })),
  ...guides.map((g) => ({
    title: g.title,
    href: `/resources/${g.slug}`,
    kind: "Resource" as const,
    snippet: g.summary,
    keywords: g.sections.map((s) => s.heading).join(" "),
  })),
  ...aphTemplates.map((t) => ({
    title: `${t.title} (template)`,
    href: "/templates",
    kind: "Resource" as const,
    snippet: t.description,
    keywords: `template checklist csv download ${t.tags.join(" ")}`,
  })),
  ...calculatorMethods.map((m) => ({
    title: m.title,
    href: `/calculators/${m.slug}`,
    kind: "Calculator" as const,
    snippet: m.description,
    keywords: m.keywords,
  })),
  ];
}

const normalize = (s: string) => s.toLowerCase().replace(/§/g, " ").replace(/[^a-z0-9.\s]/g, " ").replace(/\.(?!\d)/g, " ").replace(/\s+/g, " ").trim();

/** Common ways people write the same thing. */
const synonyms: [RegExp, string][] = [
  [/\btitle 5\b/g, "title v"],
  [/\bpart 70\b/g, "part 70 title v"],
  [/\bquad o\b/g, "oooo"],
];

/** Plural and -ing forms match the base word: "flares" and "flaring" both find "flare". */
const stem = (t: string) => (t.length < 5 ? t : t.replace(/(?:ing|ed|es|s|e)$/, ""));

/** Edit distance up to `max`, for typos such as "louisianna". */
function near(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

const sectionNum = (id: string) => Number(id.split(".")[1].replace(/[a-z]+$/, ""));

/**
 * A CFR section in the query ("60.5365b", "§ 63.6585", "40 CFR 60.5365b")
 * points to the subpart whose section range holds it, linked to that section.
 */
function sectionHits(index: SearchDoc[], query: string, kind?: SearchKind): SearchDoc[] {
  const m = query.toLowerCase().match(/\b(\d{2})\.(\d{1,5})([a-z]{0,2})\b/);
  if (!m || (kind && kind !== "Regulation")) return [];
  const [id, part, n, suffix] = [m[0], m[1], Number(m[2]), m[3]];
  return index
    .filter((d) => {
      if (!d.sections) return false;
      const [lo, hi] = d.sections;
      return lo.startsWith(`${part}.`) && lo.replace(/^[\d.]+/, "") === suffix && n >= sectionNum(lo) && n <= sectionNum(hi);
    })
    .map((d) => ({ ...d, title: `§ ${id} in ${d.title}`, href: `${d.href}#sec-${id}`, snippet: `Jump to § ${id}. ${d.snippet}` }));
}

const kindOrder: SearchKind[] = ["Regulation", "State", "Tool", "Calculator", "Industry", "Resource"];
const prepared = new WeakMap<SearchDoc, { title: string; body: string; words: string[] }>();
const prep = (d: SearchDoc) => {
  let p = prepared.get(d);
  if (!p) {
    const title = normalize(d.title);
    p = { title, body: normalize(`${d.snippet} ${d.keywords}`), words: title.split(" ") };
    prepared.set(d, p);
  }
  return p;
};

/**
 * Ranks pages for a query. Pages that match every word come first (title
 * matches count most, and the whole phrase in a title counts more); pages
 * matching only some words show only when nothing matches them all. A word
 * found nowhere is swapped for the closest title word, for typos.
 */
export function search(index: SearchDoc[], query: string, kind?: SearchKind): SearchDoc[] {
  let q = normalize(query);
  for (const [re, to] of synonyms) q = q.replace(re, to);
  const docs = index.filter((d) => !kind || d.kind === kind);
  let tokens = [...new Set(q.split(" ").filter((t) => t.length > 1 || (/^[a-z]$/.test(t) && q.includes(`title ${t}`))))];
  if (tokens.length === 0) return [];
  tokens = tokens.map((t) => {
    if (t.length < 5 || /\d/.test(t) || docs.some((d) => prep(d).title.includes(stem(t)) || prep(d).body.includes(stem(t)))) return t;
    let best: string | undefined;
    for (const d of docs) best ??= prep(d).words.find((w) => w.length >= 4 && near(t, w, t.length >= 9 ? 2 : 1));
    return best ?? t;
  });
  q = tokens.join(" ");
  const scored = docs.map((d) => {
    const { title, body } = prep(d);
    let score = 0;
    let matched = 0;
    for (const t of tokens) {
      const st = stem(t);
      if (title.includes(t) || title.includes(st)) { score += new RegExp(`(^|\\s)${st.replace(/\./g, "\\.")}`).test(title) ? 4 : 3; matched++; }
      else if (body.includes(t) || body.includes(st)) { score += 1; matched++; }
    }
    if (tokens.length > 1 && title.includes(q)) score += 6;
    else if (tokens.length > 1 && body.includes(q)) score += 3;
    if (title === q) score += 5;
    return { d, score, matched };
  });
  const rank = (list: typeof scored) => list.sort((a, b) => b.score - a.score || kindOrder.indexOf(a.d.kind) - kindOrder.indexOf(b.d.kind)).map((r) => r.d);
  const sections = sectionHits(index, query, kind);
  const full = rank(scored.filter((r) => r.matched === tokens.length));
  const partial = full.length || sections.length ? [] : rank(scored.filter((r) => r.matched > 0 && r.matched >= Math.ceil(tokens.length / 2)));
  return [...sections, ...[...full, ...partial].filter((d) => !sections.some((x) => x.href.startsWith(`${d.href}#`)))];
}

export const exampleQueries = [
  "Texas compressor permit",
  "NSPS OOOOb",
  "40 CFR Part 60",
  "VOC tank emissions",
  "Title V threshold",
  "New Mexico compressor station",
  "flare requirements",
  "engine NOx",
  "TCEQ PBR",
  "NESHAP ZZZZ",
];
