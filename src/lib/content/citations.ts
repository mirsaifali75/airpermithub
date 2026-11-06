import type { CitationRole, SourceKind } from "@prisma/client";
import type { GlossaryTerm } from "@/lib/data/glossary";
import type { PermitProgram, StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { Regulation } from "@/lib/data/types";

/**
 * Citation rows derived from a record's own fields. Every write of a version
 * goes through these, so the provenance the database rules check (R1, R2)
 * always matches what the page shows.
 */
export interface CitationInput {
  url: string;
  role: CitationRole;
  label?: string;
  position: number;
  pinpoint?: string;
  verbatimQuote?: string;
}

const list = (role: CitationRole, links: { name: string; url: string }[] | undefined, start = 0): CitationInput[] =>
  (links ?? []).map((l, i) => ({ url: l.url, role, label: l.name, position: start + i }));

export function stateProfileCitations(p: StateAirPermitProfile): CitationInput[] {
  return [
    ...list("SOURCE", p.sources),
    ...list("FORM", p.forms),
    ...list("GUIDANCE", p.guidance),
    ...p.regulations.flatMap((r, i) => (r.url ? [{ url: r.url, role: "REGULATION" as const, label: r.title, pinpoint: r.citation, position: i }] : [])),
    ...list("PORTAL", p.ePermitting && [p.ePermitting]),
    ...list("FEES", p.fees && [p.fees]),
    ...list("LOCAL_AGENCY", p.localAgencies),
  ];
}

export function agencyCitations(a: StateAirPermitProfile["agency"]): CitationInput[] {
  return [
    { url: a.url, role: "PRIMARY", label: a.name, position: 0 },
    ...(a.permitsUrl ? [{ url: a.permitsUrl, role: "PRIMARY" as const, label: "Air permits page", position: 1 }] : []),
  ];
}

/** The program page, the verbatim quote with its source, and the document any restated thresholds come from. */
export function programCitations(x: PermitProgram): CitationInput[] {
  const out: CitationInput[] = [];
  if (x.url) out.push({ url: x.url, role: "PRIMARY", label: x.name, pinpoint: x.citation, position: 0 });
  const quoteUrl = x.quoteSource?.url ?? x.url;
  if (x.quote && quoteUrl) out.push({ url: quoteUrl, role: "QUOTE", label: x.quoteSource?.name, verbatimQuote: x.quote, position: 0 });
  const thresholdsUrl = x.thresholdsSource?.url ?? x.url;
  if (x.thresholds && thresholdsUrl) out.push({ url: thresholdsUrl, role: "THRESHOLDS", label: x.thresholdsSource?.name, position: 0 });
  return out;
}

export function regulationCitations(r: Regulation): CitationInput[] {
  return r.sources.map((s, i) => ({ url: s.url, role: "SOURCE", label: s.title, pinpoint: s.citation, position: i }));
}

export function glossaryCitations(g: GlossaryTerm): CitationInput[] {
  return g.cites.map((c, i) => ({ url: c.url, role: "SOURCE", label: c.label, position: i }));
}

/** Source kind from the role it is cited for, then from the host. */
export function sourceKind(url: string, role: CitationRole): SourceKind {
  if (role === "FORM") return "FORM";
  if (role === "GUIDANCE") return "GUIDANCE";
  const host = new URL(url).hostname;
  if (host.endsWith("federalregister.gov")) return "FEDERAL_REGISTER";
  if (role === "REGULATION" || host.endsWith("ecfr.gov") || host.endsWith("govinfo.gov")) return "RULE_TEXT";
  return "AGENCY_PAGE";
}
