import type { ContentStatus, Prisma, PrismaClient } from "@prisma/client";
import type { GlossaryTerm } from "@/lib/data/glossary";
import type { PermitProgram, StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { Regulation } from "@/lib/data/types";
import { sourceKind, type CitationInput } from "./citations";
import { toDate, toEnum } from "./enums";

/**
 * The version columns for each kind of record, built from the shapes the site
 * renders. The import and change proposals both write versions through these,
 * so a record round-trips through the database unchanged.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;
const optJson = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const host = (url: string) => new URL(url).hostname.toLowerCase();

/** A permit program's stable id: its state and its name. */
export const programSlug = (stateSlug: string, name: string) => `${stateSlug}-${slugify(name)}`;

export const agencyData = (a: StateAirPermitProfile["agency"]) => ({ name: a.name, division: a.division ?? null, url: a.url, permitsUrl: a.permitsUrl ?? null });

/** Everything on a state hub except its agency and its programs, which are records of their own. */
export const stateProfileData = (p: StateAirPermitProfile) => ({
  overview: p.overview, notes: p.notes ?? null, oilAndGasSummary: p.oilAndGas?.summary ?? null, lastReviewed: toDate(p.lastReviewed),
  localAgencies: optJson(p.localAgencies), regulations: json(p.regulations), forms: json(p.forms), guidance: json(p.guidance),
  sources: json(p.sources), ePermitting: optJson(p.ePermitting), fees: optJson(p.fees),
});

export const programData = (x: PermitProgram) => ({
  name: x.name, description: x.description, citationText: x.citation ?? null, url: x.url ?? null,
  verbatimQuote: x.quote ?? null, quoteSource: optJson(x.quoteSource), restatedThreshold: x.thresholds ?? null, thresholdsSource: optJson(x.thresholdsSource),
});

/** Restated thresholds keep a record at Needs Review (R2). */
export const programContentStatus = (x: PermitProgram): ContentStatus => (x.thresholds ? "NEEDS_REVIEW" : "APH_SUMMARY");

export const regulationData = (r: Regulation) => ({
  name: r.name, agency: r.agency, tagline: r.tagline, summary: r.summary,
  applicability: json(r.applicability), requirements: json(r.requirements), monitoring: json(r.monitoring), testing: json(r.testing),
  recordkeeping: json(r.recordkeeping), reporting: json(r.reporting), definitions: json(r.definitions),
  keySubparts: optJson(r.keySubparts), sources: json(r.sources), relatedCalculators: r.relatedCalculators,
});

export const glossaryData = (g: GlossaryTerm) => ({
  term: g.term, abbr: g.abbr ?? null, definition: g.definition, cites: json(g.cites), related: g.related ?? [], links: optJson(g.links),
});

/** "40 CFR Part 60" -> 40 / "60"; "40 CFR 51.160" -> 40 / "51". */
export const cfr = (citation: string) => {
  const m = citation.match(/(\d+)\s*CFR\s*(?:Parts?\s*)?(\d+)/);
  return m ? { cfrTitle: Number(m[1]), cfrPart: m[2] } : { cfrTitle: null, cfrPart: null };
};

export type CitationFk = "stateProfileVersionId" | "agencyVersionId" | "programVersionId" | "regulationVersionId" | "glossaryVersionId";

type Db = PrismaClient | Prisma.TransactionClient;

/** Source ids for these citations' URLs, creating any source not seen before (titled and typed by its first citation). */
export async function ensureSources(db: Db, rows: CitationInput[]) {
  const first = new Map<string, CitationInput>();
  for (const c of rows) if (!first.has(c.url)) first.set(c.url, c);
  if (!first.size) return new Map<string, string>();
  await db.source.createMany({
    data: [...first.values()].map((c) => ({ url: c.url, title: c.label ?? c.url, kind: sourceKind(c.url, c.role), publisher: host(c.url) })),
    skipDuplicates: true,
  });
  const found = await db.source.findMany({ where: { url: { in: [...first.keys()] } }, select: { id: true, url: true } });
  return new Map(found.map((s) => [s.url, s.id]));
}

export async function writeCitations(db: Db, fk: CitationFk, versionId: string, rows: CitationInput[], sourceIds?: Map<string, string>) {
  if (!rows.length) return 0;
  const ids = sourceIds ?? (await ensureSources(db, rows));
  await db.citation.createMany({
    data: rows.map((c) => ({
      sourceId: ids.get(c.url)!, role: c.role, label: c.label ?? null, position: c.position,
      pinpoint: c.pinpoint ?? null, verbatimQuote: c.verbatimQuote ?? null, [fk]: versionId,
    })),
  });
  return rows.length;
}

export const toVerification = (v: StateAirPermitProfile["verification"]) => toEnum<"VERIFIED" | "PARTIAL" | "UNVERIFIED">(v);
