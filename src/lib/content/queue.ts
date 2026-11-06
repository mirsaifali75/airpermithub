import type { Prisma, PrismaClient, ReviewKind, ReviewStatus, VersionStatus } from "@prisma/client";
import { closableKinds, isVersioned, versionTables, type VersionedEntity } from "./review";

/**
 * What the review console reads: the queue, one task with the version it
 * proposes beside the one it would replace, and the record's audit trail.
 */

export const kindLabels: Record<ReviewKind, string> = {
  CHANGE: "Change",
  NEW_RECORD: "New record",
  RESTATED_THRESHOLD: "Restated threshold",
  SOURCE_CHANGED: "Source lost",
  OFFICIAL_DOMAIN: "Official hosts",
  ERROR_REPORT: "Error report",
  FEDERAL_REGISTER_MATCH: "Federal Register",
};

export const statusLabels: Record<ReviewStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In progress", APPROVED: "Approved", SENT_BACK: "Sent back", REJECTED: "Rejected", CLOSED: "Closed",
};

export const versionStatusLabels: Record<VersionStatus, string> = {
  DRAFT: "Draft", IN_REVIEW: "In review", PUBLISHED: "Published", SUPERSEDED: "Superseded", REJECTED: "Rejected",
};

const open: ReviewStatus[] = ["OPEN", "IN_PROGRESS"];
export const isOpen = (s: ReviewStatus) => open.includes(s);

export async function queueCounts(db: PrismaClient) {
  const rows = await db.reviewTask.groupBy({ by: ["kind"], where: { status: { in: open } }, _count: { _all: true } });
  const counts = Object.fromEntries(rows.map((r) => [r.kind, r._count._all])) as Partial<Record<ReviewKind, number>>;
  return { counts, total: rows.reduce((n, r) => n + r._count._all, 0) };
}

export const PAGE_SIZE = 50;

export async function listTasks(db: PrismaClient, { kind, decided, page }: { kind?: ReviewKind; decided: boolean; page: number }) {
  const where: Prisma.ReviewTaskWhereInput = { status: decided ? { notIn: open } : { in: open }, ...(kind ? { kind } : {}) };
  const [tasks, total] = await Promise.all([
    db.reviewTask.findMany({
      where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      orderBy: decided ? [{ decidedAt: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }, { id: "asc" }],
      include: { decidedBy: { select: { name: true, email: true } } },
    }),
    db.reviewTask.count({ where }),
  ]);
  return { tasks, total };
}

export type CitationRow = {
  id: string; role: string; label: string | null; pinpoint: string | null; verbatimQuote: string | null;
  source: { url: string; title: string; isOfficial: boolean };
};
export type VersionRow = Record<string, unknown> & {
  id: string; versionNo: number; status: VersionStatus; authorId: string; reviewedById: string | null; revisionNotes: string | null;
  publishedAt: Date | null; createdAt: Date; citations: CitationRow[]; author: { name: string | null; email: string; isSystem: boolean };
};
type VersionReader = {
  findUnique(a: { where: { id: string }; include: typeof withCitations }): Promise<VersionRow | null>;
  findFirst(a: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; include: typeof withCitations }): Promise<VersionRow | null>;
  findMany(a: { where: Record<string, unknown>; orderBy: Record<string, "asc" | "desc">; select: Record<string, true> }): Promise<Pick<VersionRow, "id" | "versionNo" | "status" | "createdAt" | "publishedAt">[]>;
};
const withCitations = {
  citations: { orderBy: { position: "asc" as const }, include: { source: { select: { url: true, title: true, isOfficial: true } } } },
  author: { select: { name: true, email: true, isSystem: true } },
};
const reader = (db: PrismaClient, entity: VersionedEntity) => (db as unknown as Record<string, VersionReader>)[versionTables[entity].model];

/** Bookkeeping columns, left out of the field-by-field comparison. */
const bookkeeping = new Set([
  "id", "versionNo", "status", "authorId", "author", "reviewedById", "reviewedAt", "publishedAt", "supersededAt",
  "effectiveFrom", "effectiveTo", "createdAt", "revisionNotes", "citations",
]);

export interface FieldRow { field: string; before: string | null; after: string | null; changed: boolean }

const shown = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
};
const fieldName = (k: string) => {
  const words = k.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function fieldRows(entity: VersionedEntity, before: VersionRow | null, after: VersionRow | null): FieldRow[] {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
    .filter((k) => !bookkeeping.has(k) && k !== versionTables[entity].identity);
  return keys.map((k) => {
    const b = before ? shown(before[k]) : null;
    const a = after ? shown(after[k]) : null;
    return { field: fieldName(k), before: b, after: a, changed: b !== a };
  });
}

/** A record's name in the reviewer's words, and where it shows on the site. */
export async function recordInfo(db: PrismaClient, entity: VersionedEntity, id: string): Promise<{ label: string; href?: string }> {
  switch (entity) {
    case "STATE_PROFILE": {
      const s = await db.state.findUnique({ where: { id } });
      return s ? { label: `${s.name} state hub`, href: `/states/${s.slug}` } : { label: "State hub" };
    }
    case "AGENCY": {
      const a = await db.regulatoryAgency.findUnique({ where: { id }, include: { state: true } });
      return a?.state ? { label: `${a.state.name} air agency`, href: `/states/${a.state.slug}` } : { label: "Agency" };
    }
    case "PERMIT_PROGRAM": {
      const p = await db.permitProgram.findUnique({ where: { id }, include: { state: true, versions: { orderBy: { versionNo: "desc" }, take: 1, select: { name: true } } } });
      if (!p) return { label: "Permit program" };
      return { label: `${p.state?.name ?? "State"}: ${p.versions[0]?.name ?? p.slug}`, href: p.state ? `/states/${p.state.slug}` : undefined };
    }
    case "REGULATION": {
      const r = await db.regulation.findUnique({ where: { id } });
      return r ? { label: `${r.shortName} (${r.citation})`, href: `/regulations/${r.slug}` } : { label: "Regulation" };
    }
    case "GLOSSARY_TERM": {
      const t = await db.glossaryTerm.findUnique({ where: { id }, include: { versions: { orderBy: { versionNo: "desc" }, take: 1, select: { term: true } } } });
      return t ? { label: `Glossary: ${t.versions[0]?.term ?? t.slug}`, href: `/glossary#${t.slug}` } : { label: "Glossary term" };
    }
  }
}

export type Action = "approve" | "send-back" | "reject" | "close";

export async function taskDetail(db: PrismaClient, id: string, viewerId: string) {
  const task = await db.reviewTask.findUnique({ where: { id }, include: { decidedBy: { select: { name: true, email: true } } } });
  if (!task) return null;
  const entity = isVersioned(task.entityType) ? task.entityType : null;

  let record: { label: string; href?: string } | null = null;
  let proposed: VersionRow | null = null;
  let previous: VersionRow | null = null;
  let history: Awaited<ReturnType<VersionReader["findMany"]>> = [];
  let authorId: string | null = null;

  if (entity) {
    const v = reader(db, entity);
    const ident = versionTables[entity].identity;
    record = await recordInfo(db, entity, task.entityId);
    history = await v.findMany({ where: { [ident]: task.entityId }, orderBy: { versionNo: "asc" }, select: { id: true, versionNo: true, status: true, createdAt: true, publishedAt: true } });
    if (task.versionId) {
      proposed = await v.findUnique({ where: { id: task.versionId }, include: withCitations });
      // Compare with the version that was on the site when this one was proposed.
      if (proposed && (task.kind === "CHANGE" || task.kind === "NEW_RECORD")) {
        previous = await v.findFirst({ where: { [ident]: task.entityId, versionNo: { lt: proposed.versionNo }, publishedAt: { not: null } }, orderBy: { versionNo: "desc" }, include: withCitations });
      }
      authorId = task.kind === "CHANGE" || task.kind === "NEW_RECORD" ? (proposed?.authorId ?? null) : null;
    } else if (task.kind === "CHANGE") {
      // A removal: show what would come off the site.
      previous = await v.findFirst({ where: { [ident]: task.entityId, status: isOpen(task.status) ? "PUBLISHED" : "SUPERSEDED" }, orderBy: { versionNo: "desc" }, include: withCitations });
      const proposal = await db.auditLog.findFirst({ where: { action: "proposal.remove", after: { path: ["taskId"], equals: task.id } } });
      authorId = proposal?.actorId ?? null;
    }
  }

  const isProposal = task.kind === "CHANGE" || task.kind === "NEW_RECORD";
  const isRemoval = task.kind === "CHANGE" && !task.versionId;
  const actions: Action[] = !isOpen(task.status) ? []
    : isProposal ? ["approve", "send-back", "reject"]
    : task.kind === "OFFICIAL_DOMAIN" ? ["approve"]
    : (closableKinds as readonly string[]).includes(task.kind) ? ["close"]
    : [];
  const ownWork = !!authorId && authorId === viewerId;

  const audit = await db.auditLog.findMany({
    where: { OR: [{ entityId: { in: [task.entityId, ...history.map((h) => h.id)] } }, { after: { path: ["taskId"], equals: task.id } }] },
    orderBy: { createdAt: "desc" }, take: 25, include: { actor: { select: { name: true, email: true, isSystem: true } } },
  });

  return {
    task, entity, record, proposed, previous, history, isProposal, isRemoval, actions, ownWork,
    fields: entity && (proposed || previous) ? fieldRows(entity, isProposal ? previous : null, isRemoval ? null : (proposed ?? previous)) : [],
    audit,
  };
}

/** The hosts an official-host task lists, whether each is still on the list, and how many sources it covers. */
export async function hostRows(db: PrismaClient, detail: string | null) {
  const hosts = (detail ?? "").split("\n").map((h) => h.trim()).filter(Boolean);
  const [listed, publishers] = await Promise.all([
    db.officialDomain.findMany({ where: { domain: { in: hosts } }, select: { domain: true, jurisdiction: true } }),
    db.source.groupBy({ by: ["publisher"], _count: { _all: true } }),
  ]);
  const on = new Map(listed.map((d) => [d.domain, d.jurisdiction]));
  return hosts.map((h) => ({
    host: h,
    listed: on.has(h),
    jurisdiction: on.get(h) ?? null,
    sources: publishers.filter((p) => p.publisher === h || p.publisher.endsWith(`.${h}`)).reduce((n, p) => n + p._count._all, 0),
  }));
}

export async function auditPage(db: PrismaClient, page: number) {
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { actor: { select: { name: true, email: true, isSystem: true } } } }),
    db.auditLog.count(),
  ]);
  return { rows, total };
}
