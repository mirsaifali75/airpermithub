import { federalRegulations } from "./data/regulations";
import { industries } from "./data/industries";
import { stateTiles } from "./data/states";
import type { StateAirPermitProfile } from "./data/state-profile-types";
import { calculatorMethods } from "./calc/methods";
import { guides } from "./data/guides";
import { aphTemplates } from "./data/templates";

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
}

const tools: SearchDoc[] = [
  { title: "Permit Finder", href: "/permit-finder", kind: "Tool", snippet: "Screen likely permitting paths by state, industry, facility type, and equipment.", keywords: "permit path authorization screening wizard compressor station tank battery" },
  { title: "Emission Calculator", href: "/calculators", kind: "Tool", snippet: "Transparent equipment-based emission calculations.", keywords: "emissions calculator pte potential to emit nox voc co tons per year" },
  { title: "Applicability Checker", href: "/applicability", kind: "Tool", snippet: "Screen NSPS, NESHAP, Title V, NSR, PSD, and state requirements.", keywords: "applicability screening threshold title v threshold" },
  { title: "Permit Library", href: "/permits", kind: "Tool", snippet: "Search permits, facilities, and regulatory documents.", keywords: "permit search facility permit number company county" },
  { title: "Compliance Calendar", href: "/compliance", kind: "Tool", snippet: "Track testing, reporting, inspections, and renewals; export to your calendar.", keywords: "compliance calendar deadlines reporting testing ldar inspection" },
  { title: "Air Quality Jobs", href: "/jobs", kind: "Tool", snippet: "Air permitting, EHS, and environmental engineering jobs.", keywords: "jobs careers air quality engineer ehs environmental" },
];

/** Builds the index. Call on the server; pass the result to client search UI. */
export function buildSearchIndex(profiles: StateAirPermitProfile[]): SearchDoc[] {
  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  return [
  ...tools,
  ...federalRegulations.map((r) => ({
    title: `${r.shortName} — ${r.name}`,
    href: `/regulations/${r.slug}`,
    kind: "Regulation" as const,
    snippet: `${r.citation}. ${r.tagline}`,
    keywords: [r.citation, r.summary, ...(r.keySubparts ?? []).map((s) => `${s.code} ${s.title} ${s.code.replace(/^.*Subpart\s+/, "")}`)].join(" "),
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

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\s]/g, " ");

/** Token scoring: at least half the query tokens must match; title hits rank higher. */
export function search(index: SearchDoc[], query: string, kind?: SearchKind): SearchDoc[] {
  const tokens = normalize(query).split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];
  return index
    .filter((d) => !kind || d.kind === kind)
    .map((d) => {
      const title = normalize(d.title);
      const body = normalize(`${d.snippet} ${d.keywords}`);
      let score = 0;
      let matched = 0;
      for (const t of tokens) {
        if (title.includes(t)) { score += 3; matched++; }
        else if (body.includes(t)) { score += 1; matched++; }
      }
      return { d, score: matched >= Math.ceil(tokens.length / 2) ? score : -1 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.d);
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
