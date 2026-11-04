import { createHash } from "node:crypto";
import type { ContentStatus, Prisma, PrismaClient, ReviewKind } from "@prisma/client";
import type { PermitProgram, StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { Regulation } from "@/lib/data/types";
import { agencyCitations, glossaryCitations, programCitations, regulationCitations, stateProfileCitations, type CitationInput } from "./citations";
import { toEnum } from "./enums";
import { exportContent } from "./export";
import { agencyData, cfr, glossaryData, programContentStatus, programData, programSlug, regulationData, stateProfileData, toVerification, writeCitations, type CitationFk } from "./records";
import { nextVersionNo, versions, versionTables, type VersionedEntity } from "./review";
import type { Content } from "./types";

/**
 * Detect and flag: compares the reviewed files in the repo with what the
 * database has published and turns each difference into a proposed version
 * waiting for review. Nothing here publishes. A change already proposed, or
 * one a reviewer rejected or sent back, is not proposed again unchanged.
 * Ordering and grouping on a page (positions, categories, related links) is
 * presentation and applies directly.
 */

export interface ProposalSummary {
  proposed: string[];
  removals: string[];
  unchanged: number;
  skipped: string[];
  unsupported: string[];
}

const fkFor: Record<VersionedEntity, CitationFk> = {
  STATE_PROFILE: "stateProfileVersionId", AGENCY: "agencyVersionId", PERMIT_PROGRAM: "programVersionId",
  REGULATION: "regulationVersionId", GLOSSARY_TERM: "glossaryVersionId",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== null).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]))
    : v;
const equal = (a: unknown, b: unknown) => same(canon(a), canon(b));
const omit = <T extends object, K extends keyof T>(o: T, ...keys: K[]) => {
  const copy = { ...o };
  for (const k of keys) delete copy[k];
  return copy as Omit<T, K>;
};
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(canon(v))).digest("hex").slice(0, 32);

/** The parts of a state hub that live on its profile version (not its identity, agency, or programs). */
const profilePart = (p: StateAirPermitProfile) => ({
  ...omit(p, "code", "name", "slug", "epaRegion", "agency", "permitTypes", "oilAndGas"), oilAndGasSummary: p.oilAndGas?.summary,
});
/** The parts of a regulation that live on its version (not its identity or its links to other rules). */
const regulationPart = (r: Regulation) => omit(r, "slug", "shortName", "citation", "jurisdiction", "relatedRules");
const programsOf = (p: StateAirPermitProfile) => [
  ...p.permitTypes.map((x, position) => ({ x, position, isOilAndGas: false })),
  ...(p.oilAndGas?.programs ?? []).map((x, position) => ({ x, position, isOilAndGas: true })),
];

export async function proposeChanges(db: PrismaClient, files: Content, authorId: string): Promise<ProposalSummary> {
  const live = await exportContent(db);
  const out: ProposalSummary = { proposed: [], removals: [], unchanged: 0, skipped: [], unsupported: [] };

  /** Opens one proposed version with its citations, unless the same change is already waiting or was declined. */
  const propose = async (
    entity: VersionedEntity, identityId: string, label: string, kind: ReviewKind,
    data: Record<string, unknown>, cites: CitationInput[], envelope: { contentStatus: ContentStatus; verification?: "VERIFIED" | "PARTIAL" | "UNVERIFIED" },
  ) => {
    const contentHash = hash({ data, cites, envelope });
    // Approved or replaced proposals don't count: the record may have changed since.
    const earlier = await db.reviewTask.findFirst({
      where: { entityType: entity, entityId: identityId, contentHash, status: { in: ["OPEN", "IN_PROGRESS", "SENT_BACK", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
    });
    if (earlier) {
      const why = { OPEN: "already waiting for review", IN_PROGRESS: "already waiting for review", SENT_BACK: "sent back earlier", REJECTED: "rejected earlier" }[earlier.status as "OPEN"];
      out.skipped.push(`${label} (${why})`);
      return;
    }
    await db.$transaction(async (tx) => {
      // A newer proposal replaces any older one still waiting for the same record.
      const stale = await tx.reviewTask.findMany({ where: { entityType: entity, entityId: identityId, kind: { in: ["CHANGE", "NEW_RECORD"] }, status: "OPEN" } });
      for (const t of stale) {
        if (t.versionId) await versions(tx, entity).update({ where: { id: t.versionId }, data: { status: "REJECTED" } });
        await tx.reviewTask.update({ where: { id: t.id }, data: { status: "CLOSED", decidedAt: new Date(), decisionNote: "Replaced by a newer proposal." } });
      }
      const versionNo = await nextVersionNo(tx, entity, identityId);
      const v = await (tx as unknown as Record<string, { create(a: { data: Record<string, unknown> }): Promise<{ id: string }> }>)[versionTables[entity].model].create({
        data: { [versionTables[entity].identity]: identityId, ...data, versionNo, status: "IN_REVIEW", authorId, revisionNotes: "Proposed from the reviewed files in the repository.", ...envelope },
      });
      await writeCitations(tx, fkFor[entity], v.id, cites);
      await tx.reviewTask.create({
        data: { kind, entityType: entity, entityId: identityId, versionId: v.id, contentHash, title: `${kind === "NEW_RECORD" ? "New" : "Change"}: ${label}`, detail: `Version ${versionNo}, proposed from the repository.` },
      });
      await tx.auditLog.create({ data: { actorId: authorId, action: "proposal.create", entityType: entity, entityId: identityId, after: { versionId: v.id, versionNo } as Prisma.InputJsonValue } });
    });
    out.proposed.push(label);
  };

  const proposeRemoval = async (entity: VersionedEntity, identityId: string, label: string) => {
    const open = await db.reviewTask.findFirst({ where: { entityType: entity, entityId: identityId, kind: "CHANGE", versionId: null, status: "OPEN" } });
    if (open) return void out.skipped.push(`${label} (removal already waiting for review)`);
    await db.$transaction(async (tx) => {
      const task = await tx.reviewTask.create({ data: { kind: "CHANGE", entityType: entity, entityId: identityId, title: `Remove: ${label}`, detail: "No longer in the repository. Approving takes it off the site; its history stays." } });
      await tx.auditLog.create({ data: { actorId: authorId, action: "proposal.remove", entityType: entity, entityId: identityId, after: { taskId: task.id } } });
    });
    out.removals.push(label);
  };

  // State hubs: profile, agency, and each program are separate records.
  const liveStates = new Map(live.states.map((s) => [s.slug, s]));
  for (const f of files.states) {
    const l = liveStates.get(f.slug);
    const state = await db.state.findUnique({ where: { slug: f.slug }, include: { agencies: true, programs: { include: { versions: { where: { status: "PUBLISHED" }, take: 1 } } } } });
    if (!state || !l) {
      out.unsupported.push(`states/${f.slug}: a new state hub`);
      continue;
    }
    if (state.code !== f.code || state.name !== f.name || state.epaRegion !== f.epaRegion) out.unsupported.push(`states/${f.slug}: code, name, or EPA region changed`);
    const verification = toVerification(f.verification);
    const agencyId = state.agencies[0].id;

    if (!equal(f.agency, l.agency)) await propose("AGENCY", agencyId, `${f.name} agency`, "CHANGE", agencyData(f.agency), agencyCitations(f.agency), { contentStatus: "OFFICIAL_SOURCE", verification });
    else out.unchanged++;
    if (!equal(profilePart(f), profilePart(l))) await propose("STATE_PROFILE", state.id, `${f.name} state hub`, "CHANGE", stateProfileData(f), stateProfileCitations(f), { contentStatus: "APH_SUMMARY", verification });
    else out.unchanged++;

    const liveBySlug = new Map(programsOf(l).map((p) => [programSlug(l.slug, p.x.name), p.x]));
    const fileSlugs = new Set<string>();
    for (const { x, position, isOilAndGas } of programsOf(f)) {
      const slug = programSlug(f.slug, x.name);
      fileSlugs.add(slug);
      const label = `${f.name}: ${x.name}`;
      let program = state.programs.find((p) => p.slug === slug);
      if (program && program.type !== toEnum(x.type)) {
        out.unsupported.push(`${label}: permit type changed`);
        continue;
      }
      if (!program) {
        program = { ...(await db.permitProgram.create({ data: { slug, stateId: state.id, agencyId, type: toEnum(x.type), isOilAndGas, position } })), versions: [] };
      } else if (program.position !== position || program.isOilAndGas !== isOilAndGas) {
        await db.permitProgram.update({ where: { id: program.id }, data: { position, isOilAndGas } });
      }
      const current: PermitProgram | undefined = liveBySlug.get(slug);
      if (current && equal(current, x)) {
        out.unchanged++;
        continue;
      }
      await propose("PERMIT_PROGRAM", program.id, label, current ? "CHANGE" : "NEW_RECORD", programData(x), programCitations(x), { contentStatus: programContentStatus(x), verification });
    }
    for (const p of state.programs) {
      if (p.versions.length && !fileSlugs.has(p.slug)) await proposeRemoval("PERMIT_PROGRAM", p.id, `${f.name}: ${p.versions[0].name}`);
    }
  }

  // Regulations and glossary terms.
  const liveRegs = new Map(live.regulations.map((r) => [r.slug, r]));
  const regIds = new Map((await db.regulation.findMany({ select: { id: true, slug: true } })).map((r) => [r.slug, r.id]));
  for (const [position, r] of files.regulations.entries()) {
    let id = regIds.get(r.slug);
    const l = liveRegs.get(r.slug);
    if (!id) {
      id = (await db.regulation.create({ data: { slug: r.slug, shortName: r.shortName, citation: r.citation, jurisdiction: toEnum(r.jurisdiction), position, ...cfr(r.citation) } })).id;
      regIds.set(r.slug, id);
    } else {
      const reg = await db.regulation.findUniqueOrThrow({ where: { id } });
      if (reg.shortName !== r.shortName || reg.citation !== r.citation || reg.jurisdiction !== toEnum(r.jurisdiction)) {
        out.unsupported.push(`regulations/${r.slug}: short name, citation, or jurisdiction changed`);
      }
      if (reg.position !== position) await db.regulation.update({ where: { id }, data: { position } });
    }
    if (l && equal(regulationPart(r), regulationPart(l))) out.unchanged++;
    else await propose("REGULATION", id, `${r.shortName} (${r.citation})`, l ? "CHANGE" : "NEW_RECORD", regulationData(r), regulationCitations(r), { contentStatus: toEnum<ContentStatus>(r.status) });
  }
  for (const r of files.regulations) {
    const fromId = regIds.get(r.slug)!;
    if (equal(r.relatedRules, liveRegs.get(r.slug)?.relatedRules ?? [])) continue;
    await db.$transaction([
      db.regulationRelation.deleteMany({ where: { fromId } }),
      db.regulationRelation.createMany({ data: r.relatedRules.filter((s) => regIds.has(s)).map((to, position) => ({ fromId, toId: regIds.get(to)!, position })) }),
    ]);
  }
  for (const l of live.regulations) if (!files.regulations.some((r) => r.slug === l.slug)) await proposeRemoval("REGULATION", regIds.get(l.slug)!, `${l.shortName} (${l.citation})`);

  const liveTerms = new Map(live.glossary.map((g) => [g.slug, g]));
  const terms = new Map((await db.glossaryTerm.findMany()).map((t) => [t.slug, t]));
  for (const [position, g] of files.glossary.entries()) {
    let t = terms.get(g.slug);
    if (!t) t = await db.glossaryTerm.create({ data: { slug: g.slug, category: g.category, position } });
    else if (t.category !== g.category || t.position !== position) await db.glossaryTerm.update({ where: { id: t.id }, data: { category: g.category, position } });
    const l = liveTerms.get(g.slug);
    if (l && equal(omit(g, "category"), omit(l, "category"))) out.unchanged++;
    else await propose("GLOSSARY_TERM", t.id, `Glossary: ${g.term}`, l ? "CHANGE" : "NEW_RECORD", glossaryData(g), glossaryCitations(g), { contentStatus: "APH_SUMMARY" });
  }
  for (const l of live.glossary) if (!files.glossary.some((g) => g.slug === l.slug)) await proposeRemoval("GLOSSARY_TERM", terms.get(l.slug)!.id, `Glossary: ${l.term}`);

  return out;
}
