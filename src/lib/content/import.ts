import type { ContentStatus, Prisma, PrismaClient, Verification } from "@prisma/client";
import { agencyCitations, glossaryCitations, programCitations, regulationCitations, sourceKind, stateProfileCitations, type CitationInput } from "./citations";
import { toDate, toEnum } from "./enums";
import type { Content } from "./types";

/** The account the import and other automated writers act as. It never signs in, so it can author but never review (R4). */
export const SYSTEM_EMAIL = "content-import@system.airpermithub.invalid";

const host = (url: string) => new URL(url).hostname.toLowerCase();
const isGov = (h: string) => h === "gov" || h.endsWith(".gov");
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "40 CFR Part 60" -> 40 / "60"; "40 CFR 51.160" -> 40 / "51". */
const cfr = (citation: string) => {
  const m = citation.match(/(\d+)\s*CFR\s*(?:Parts?\s*)?(\d+)/);
  return m ? { cfrTitle: Number(m[1]), cfrPart: m[2] } : { cfrTitle: null, cfrPart: null };
};

type CitationFk = "stateProfileVersionId" | "agencyVersionId" | "programVersionId" | "regulationVersionId" | "glossaryVersionId";

export interface ImportSummary {
  states: number;
  programs: number;
  regulations: number;
  glossary: number;
  sources: number;
  citations: number;
  officialDomains: number;
  reviewTasks: number;
}

/**
 * Loads the reviewed site content into an empty database as version 1 of each
 * record, published, with citations derived from each record's own links.
 * Restated thresholds and hosts outside .gov each open a review task.
 */
export async function importContent(db: PrismaClient, content: Content, { now = new Date() } = {}): Promise<ImportSummary> {
  if (await db.state.count()) throw new Error("The database already has content; the import only runs on an empty database.");

  const system = await db.user.upsert({
    where: { email: SYSTEM_EMAIL },
    create: { email: SYSTEM_EMAIL, name: "AirPermitHub import", isSystem: true, platformRole: "EDITOR" },
    update: {},
  });
  // Versions start as drafts, get their citations, then publish: the same path an editor's change takes.
  const envelope = (contentStatus: ContentStatus, verification: Verification, revisionNotes: string) => ({
    versionNo: 1, authorId: system.id, contentStatus, verification, revisionNotes,
  });
  const publishing = { status: "PUBLISHED" as const, publishedAt: now };

  // Every citation up front: the allowlist and the source table come from them.
  const all: CitationInput[] = [
    ...content.states.flatMap((p) => [
      ...stateProfileCitations(p), ...agencyCitations(p.agency),
      ...[...p.permitTypes, ...(p.oilAndGas?.programs ?? [])].flatMap(programCitations),
    ]),
    ...content.regulations.flatMap(regulationCitations),
    ...content.glossary.flatMap(glossaryCitations),
  ];

  // Allowlist (R1): every .gov host, plus each other host the live site cites, flagged for a reviewer to confirm.
  const localHosts = new Set(content.states.flatMap((p) => (p.localAgencies ?? []).map((l) => host(l.url))));
  const otherHosts = [...new Set(all.map((c) => host(c.url)))].filter((h) => !isGov(h)).sort();
  await db.officialDomain.createMany({
    skipDuplicates: true,
    data: [
      { domain: "gov", jurisdiction: "FEDERAL", note: "Every .gov host: federal, state, local, and tribal government sites.", addedById: system.id },
      ...otherHosts.map((domain) => ({
        domain, jurisdiction: localHosts.has(domain) ? ("LOCAL" as const) : ("STATE" as const), addedById: system.id,
        note: "Cited by the live site before the database existed. A reviewer confirms it is the agency's own site.",
      })),
    ],
  });

  // Sources: one row per URL, titled and typed by its first citation.
  const firstByUrl = new Map<string, CitationInput>();
  for (const c of all) if (!firstByUrl.has(c.url)) firstByUrl.set(c.url, c);
  await db.source.createMany({
    data: [...firstByUrl.values()].map((c) => ({ url: c.url, title: c.label ?? c.url, kind: sourceKind(c.url, c.role), publisher: host(c.url) })),
    skipDuplicates: true,
  });
  const sourceId = new Map((await db.source.findMany({ select: { id: true, url: true } })).map((s) => [s.url, s.id]));

  let citations = 0;
  const cite = async (tx: Prisma.TransactionClient, fk: CitationFk, versionId: string, rows: CitationInput[]) => {
    if (!rows.length) return;
    citations += rows.length;
    await tx.citation.createMany({
      data: rows.map((c) => ({
        sourceId: sourceId.get(c.url)!, role: c.role, label: c.label ?? null, position: c.position,
        pinpoint: c.pinpoint ?? null, verbatimQuote: c.verbatimQuote ?? null, [fk]: versionId,
      })),
    });
  };
  const audit: Prisma.AuditLogCreateManyInput[] = [];
  const logged = (entityType: string, entityId: string, after: unknown) =>
    audit.push({ actorId: system.id, action: "import.publish", entityType, entityId, after: after as Prisma.InputJsonValue, createdAt: now });
  const restated: Prisma.ReviewTaskCreateManyInput[] = [];

  let programs = 0;
  for (const p of content.states) {
    const note = `Imported from data/states/${p.code.toLowerCase()}.json (last reviewed ${p.lastReviewed}).`;
    const verification = toEnum<Verification>(p.verification);
    await db.$transaction(async (tx) => {
      const state = await tx.state.create({ data: { code: p.code, slug: p.slug, name: p.name, epaRegion: p.epaRegion } });
      const agency = await tx.regulatoryAgency.create({ data: { slug: `${p.slug}-air-agency`, jurisdiction: "STATE", stateId: state.id } });

      const av = await tx.agencyVersion.create({
        data: { agencyId: agency.id, name: p.agency.name, division: p.agency.division, url: p.agency.url, permitsUrl: p.agency.permitsUrl, ...envelope("OFFICIAL_SOURCE", verification, note) },
      });
      await cite(tx, "agencyVersionId", av.id, agencyCitations(p.agency));
      await tx.agencyVersion.update({ where: { id: av.id }, data: publishing });
      logged("AgencyVersion", av.id, p.agency);

      const sv = await tx.stateProfileVersion.create({
        data: {
          stateId: state.id, overview: p.overview, notes: p.notes, oilAndGasSummary: p.oilAndGas?.summary, lastReviewed: toDate(p.lastReviewed),
          localAgencies: p.localAgencies as Prisma.InputJsonValue | undefined, regulations: p.regulations as unknown as Prisma.InputJsonValue,
          forms: p.forms as unknown as Prisma.InputJsonValue, guidance: p.guidance as unknown as Prisma.InputJsonValue, sources: p.sources as unknown as Prisma.InputJsonValue,
          ePermitting: p.ePermitting as Prisma.InputJsonValue | undefined, fees: p.fees as Prisma.InputJsonValue | undefined,
          ...envelope("APH_SUMMARY", verification, note),
        },
      });
      await cite(tx, "stateProfileVersionId", sv.id, stateProfileCitations(p));
      await tx.stateProfileVersion.update({ where: { id: sv.id }, data: publishing });
      logged("StateProfileVersion", sv.id, { code: p.code, verification: p.verification, lastReviewed: p.lastReviewed });

      const groups = [[false, p.permitTypes], [true, p.oilAndGas?.programs ?? []]] as const;
      const used = new Set<string>();
      for (const [isOilAndGas, list] of groups) {
        for (const [position, x] of list.entries()) {
          let slug = `${p.slug}-${slugify(x.name)}`;
          for (let n = 2; used.has(slug); n++) slug = `${p.slug}-${slugify(x.name)}-${n}`;
          used.add(slug);
          const program = await tx.permitProgram.create({ data: { slug, stateId: state.id, agencyId: agency.id, type: toEnum(x.type), isOilAndGas, position } });
          const pv = await tx.permitProgramVersion.create({
            data: {
              programId: program.id, name: x.name, description: x.description, citationText: x.citation, url: x.url,
              verbatimQuote: x.quote, quoteSource: x.quoteSource as Prisma.InputJsonValue | undefined,
              restatedThreshold: x.thresholds, thresholdsSource: x.thresholdsSource as Prisma.InputJsonValue | undefined,
              ...envelope(x.thresholds ? "NEEDS_REVIEW" : "APH_SUMMARY", verification, note),
            },
          });
          await cite(tx, "programVersionId", pv.id, programCitations(x));
          await tx.permitProgramVersion.update({ where: { id: pv.id }, data: publishing });
          logged("PermitProgramVersion", pv.id, { slug, name: x.name });
          if (x.thresholds) {
            restated.push({
              kind: "RESTATED_THRESHOLD", entityType: "PERMIT_PROGRAM", entityId: program.id, versionId: pv.id,
              title: `${p.name}: replace the restated thresholds for "${x.name}" with verbatim text`,
              detail: `Restated text: ${x.thresholds}\nSource: ${x.thresholdsSource?.url ?? x.url ?? "(none)"}`,
            });
          }
          programs++;
        }
      }
    }, { timeout: 120_000 });
  }

  const regIds = new Map<string, string>();
  for (const [position, r] of content.regulations.entries()) {
    await db.$transaction(async (tx) => {
      const reg = await tx.regulation.create({
        data: { slug: r.slug, shortName: r.shortName, citation: r.citation, jurisdiction: toEnum(r.jurisdiction), position, ...cfr(r.citation) },
      });
      regIds.set(r.slug, reg.id);
      const json = (v: unknown) => v as Prisma.InputJsonValue;
      const rv = await tx.regulationVersion.create({
        data: {
          regulationId: reg.id, name: r.name, agency: r.agency, tagline: r.tagline, summary: r.summary,
          applicability: json(r.applicability), requirements: json(r.requirements), monitoring: json(r.monitoring), testing: json(r.testing),
          recordkeeping: json(r.recordkeeping), reporting: json(r.reporting), definitions: json(r.definitions),
          keySubparts: r.keySubparts ? json(r.keySubparts) : undefined, sources: json(r.sources), relatedCalculators: r.relatedCalculators,
          ...envelope(toEnum<ContentStatus>(r.status), "UNVERIFIED", "Imported from src/lib/data/regulations.ts."),
        },
      });
      await cite(tx, "regulationVersionId", rv.id, regulationCitations(r));
      await tx.regulationVersion.update({ where: { id: rv.id }, data: publishing });
      logged("RegulationVersion", rv.id, { slug: r.slug });
    });
  }
  await db.regulationRelation.createMany({
    data: content.regulations.flatMap((r) => r.relatedRules.map((to, position) => ({ fromId: regIds.get(r.slug)!, toId: regIds.get(to)!, position }))),
  });

  for (const [position, g] of content.glossary.entries()) {
    await db.$transaction(async (tx) => {
      const term = await tx.glossaryTerm.create({ data: { slug: g.slug, category: g.category, position } });
      const gv = await tx.glossaryTermVersion.create({
        data: {
          termId: term.id, term: g.term, abbr: g.abbr, definition: g.definition, cites: g.cites as Prisma.InputJsonValue,
          related: g.related ?? [], links: g.links as Prisma.InputJsonValue | undefined,
          ...envelope("APH_SUMMARY", "UNVERIFIED", "Imported from src/lib/data/glossary.ts."),
        },
      });
      await cite(tx, "glossaryVersionId", gv.id, glossaryCitations(g));
      await tx.glossaryTermVersion.update({ where: { id: gv.id }, data: publishing });
      logged("GlossaryTermVersion", gv.id, { slug: g.slug });
    });
  }

  const tasks: Prisma.ReviewTaskCreateManyInput[] = [
    ...restated,
    ...(otherHosts.length
      ? [{
          kind: "OFFICIAL_DOMAIN" as const, entityType: "OFFICIAL_DOMAIN" as const, entityId: "import",
          title: `Confirm ${otherHosts.length} cited hosts outside .gov belong to the agencies`,
          detail: otherHosts.join("\n"),
        }]
      : []),
  ];
  await db.reviewTask.createMany({ data: tasks });
  await db.auditLog.createMany({ data: audit });

  return {
    states: content.states.length, programs, regulations: content.regulations.length, glossary: content.glossary.length,
    sources: sourceId.size, citations, officialDomains: otherHosts.length + 1, reviewTasks: tasks.length,
  };
}
