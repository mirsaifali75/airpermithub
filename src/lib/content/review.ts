import type { ContentEntity, Prisma, PrismaClient, VersionStatus } from "@prisma/client";

/**
 * The review half of detect -> flag -> review -> approve -> version -> publish.
 * A reviewer approves, sends back, or rejects a review task; approving a
 * proposed version supersedes the published one and publishes it in one
 * transaction, so a record always has exactly one published version. The
 * database enforces the rest (R1 official source, R3 frozen versions,
 * R4 reviewer is not the author).
 */

type VersionRow = { id: string; authorId: string; status: VersionStatus; versionNo: number; restatedThreshold?: string | null };
interface VersionDelegate {
  findUnique(args: { where: { id: string } }): Promise<VersionRow | null>;
  findFirst(args: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }): Promise<VersionRow | null>;
  aggregate(args: { where: Record<string, unknown>; _max: { versionNo: true } }): Promise<{ _max: { versionNo: number | null } }>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<VersionRow>;
}

/** Each versioned record kind: its version table, and the column naming the record it belongs to. */
export const versionTables = {
  STATE_PROFILE: { model: "stateProfileVersion", identity: "stateId", label: "State profile" },
  AGENCY: { model: "agencyVersion", identity: "agencyId", label: "Agency" },
  PERMIT_PROGRAM: { model: "permitProgramVersion", identity: "programId", label: "Permit program" },
  REGULATION: { model: "regulationVersion", identity: "regulationId", label: "Regulation" },
  GLOSSARY_TERM: { model: "glossaryTermVersion", identity: "termId", label: "Glossary term" },
} as const;
export type VersionedEntity = keyof typeof versionTables;
export const isVersioned = (e: ContentEntity): e is VersionedEntity => e in versionTables;

type Db = PrismaClient | Prisma.TransactionClient;
export const versions = (db: Db, entity: VersionedEntity) => (db as unknown as Record<string, VersionDelegate>)[versionTables[entity].model];

export async function nextVersionNo(db: Db, entity: VersionedEntity, identityId: string) {
  const { _max } = await versions(db, entity).aggregate({ where: { [versionTables[entity].identity]: identityId }, _max: { versionNo: true } });
  return (_max.versionNo ?? 0) + 1;
}

export class ReviewError extends Error {}

const openStatuses = ["OPEN", "IN_PROGRESS"] as const;

async function openTask(tx: Prisma.TransactionClient, taskId: string) {
  const task = await tx.reviewTask.findUnique({ where: { id: taskId } });
  if (!task) throw new ReviewError("That review task doesn't exist.");
  if (!openStatuses.includes(task.status as (typeof openStatuses)[number])) throw new ReviewError("That review task is already decided.");
  return task;
}

const decided = (status: "APPROVED" | "SENT_BACK" | "REJECTED" | "CLOSED", reviewerId: string, note?: string) => ({
  status, decidedById: reviewerId, decidedAt: new Date(), decisionNote: note?.trim() || null,
});

/** Approves a task: publishes its proposed version, removes a record, or confirms the official-host list. */
export async function approveTask(db: PrismaClient, taskId: string, reviewerId: string, note?: string) {
  try {
    await approveIn(db, taskId, reviewerId, note);
  } catch (e) {
    // R1 is checked when the transaction commits, so it surfaces as a database error.
    if (e instanceof Error && /\bR1:/.test(e.message)) {
      throw new ReviewError("This version cites no official source, so it can't be published (R1). Send it back for an official citation.");
    }
    throw e;
  }
}

function approveIn(db: PrismaClient, taskId: string, reviewerId: string, note?: string) {
  return db.$transaction(async (tx) => {
    const task = await openTask(tx, taskId);
    const now = new Date();
    const audit = (action: string, after: Record<string, unknown>) =>
      tx.auditLog.create({ data: { actorId: reviewerId, action, entityType: task.entityType, entityId: task.entityId, after: { taskId, note: note ?? null, ...after } } });

    if (task.kind === "OFFICIAL_DOMAIN") {
      await tx.reviewTask.update({ where: { id: taskId }, data: decided("APPROVED", reviewerId, note) });
      await audit("review.confirm-domains", {});
      return;
    }
    if (!isVersioned(task.entityType)) throw new ReviewError("This task can't be approved here.");
    const entity = task.entityType;
    const v = versions(tx, entity);
    const ident = versionTables[entity].identity;
    const current = await v.findFirst({ where: { [ident]: task.entityId, status: "PUBLISHED" } });

    if (task.kind === "RESTATED_THRESHOLD") throw new ReviewError("A restated threshold closes when a version with verbatim text is approved.");
    if (!task.versionId) {
      // A proposed removal: the record keeps its history but has no published version.
      const proposal = await tx.auditLog.findFirst({ where: { action: "proposal.remove", after: { path: ["taskId"], equals: taskId } } });
      if (proposal?.actorId === reviewerId) throw new ReviewError("You proposed this removal, so someone else has to review it (R4).");
      if (current) await v.update({ where: { id: current.id }, data: { status: "SUPERSEDED", supersededAt: now } });
      await tx.reviewTask.update({ where: { id: taskId }, data: decided("APPROVED", reviewerId, note) });
      await audit("review.remove", { versionId: current?.id ?? null });
      return;
    }

    const draft = await v.findUnique({ where: { id: task.versionId } });
    if (!draft || draft.status !== "IN_REVIEW") throw new ReviewError("That version is no longer waiting for review.");
    if (draft.authorId === reviewerId) throw new ReviewError("You wrote this version, so someone else has to review it (R4).");
    if (current) await v.update({ where: { id: current.id }, data: { status: "SUPERSEDED", supersededAt: now } });
    await v.update({ where: { id: draft.id }, data: { status: "PUBLISHED", publishedAt: now, reviewedById: reviewerId, reviewedAt: now } });
    await tx.reviewTask.update({ where: { id: taskId }, data: decided("APPROVED", reviewerId, note) });
    if (entity === "PERMIT_PROGRAM" && !draft.restatedThreshold) {
      await tx.reviewTask.updateMany({
        where: { kind: "RESTATED_THRESHOLD", entityId: task.entityId, status: { in: [...openStatuses] } },
        data: decided("CLOSED", reviewerId, `Version ${draft.versionNo} replaced the restated thresholds.`),
      });
    }
    await audit("review.publish", { versionId: draft.id, versionNo: draft.versionNo, supersededId: current?.id ?? null });
  });
}

/** Sends a proposed version back to its author (it returns to Draft) or rejects it for good. */
export async function declineTask(db: PrismaClient, taskId: string, reviewerId: string, how: "SENT_BACK" | "REJECTED", note?: string) {
  if (!note?.trim()) throw new ReviewError("Say why, so the author knows what to change.");
  return db.$transaction(async (tx) => {
    const task = await openTask(tx, taskId);
    if (task.versionId && isVersioned(task.entityType)) {
      const v = versions(tx, task.entityType);
      const draft = await v.findUnique({ where: { id: task.versionId } });
      if (draft?.status === "IN_REVIEW") await v.update({ where: { id: draft.id }, data: { status: how === "REJECTED" ? "REJECTED" : "DRAFT" } });
    }
    await tx.reviewTask.update({ where: { id: taskId }, data: decided(how, reviewerId, note) });
    await tx.auditLog.create({ data: { actorId: reviewerId, action: how === "REJECTED" ? "review.reject" : "review.send-back", entityType: task.entityType, entityId: task.entityId, after: { taskId, note } } });
  });
}

/**
 * Takes a host off the official-source list. Sources on it stop counting
 * for R1, and each published record left without an official citation gets
 * a review task.
 */
export async function removeOfficialDomain(db: PrismaClient, domain: string, reviewerId: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.officialDomain.findUnique({ where: { domain } });
    if (!row) throw new ReviewError("That host isn't on the list.");
    if (row.domain === "gov") throw new ReviewError(".gov stays on the list.");
    await tx.officialDomain.delete({ where: { domain } });
    await tx.auditLog.create({ data: { actorId: reviewerId, action: "domain.remove", entityType: "OfficialDomain", entityId: row.id, before: { domain, note: row.note } } });

    const tasks: Prisma.ReviewTaskCreateManyInput[] = [];
    for (const [entity, t] of Object.entries(versionTables) as [VersionedEntity, (typeof versionTables)[VersionedEntity]][]) {
      const fk = { STATE_PROFILE: "stateProfileVersionId", AGENCY: "agencyVersionId", PERMIT_PROGRAM: "programVersionId", REGULATION: "regulationVersionId", GLOSSARY_TERM: "glossaryVersionId" }[entity];
      const orphaned = await tx.$queryRawUnsafe<{ id: string; identity: string }[]>(
        `SELECT v.id, v."${t.identity}" AS identity FROM "${t.model.charAt(0).toUpperCase()}${t.model.slice(1)}" v
         WHERE v.status = 'PUBLISHED' AND NOT EXISTS (
           SELECT 1 FROM "Citation" c JOIN "Source" s ON s.id = c."sourceId" WHERE c."${fk}" = v.id AND s."isOfficial")`,
      );
      for (const o of orphaned) {
        tasks.push({
          kind: "SOURCE_CHANGED", entityType: entity, entityId: o.identity, versionId: o.id,
          title: `${t.label} lost its official source when ${domain} was removed`,
          detail: `Its published version cites no host left on the official-source list. Add an official citation in a new version, or restore ${domain}.`,
        });
      }
    }
    if (tasks.length) await tx.reviewTask.createMany({ data: tasks });
    return tasks.length;
  });
}
