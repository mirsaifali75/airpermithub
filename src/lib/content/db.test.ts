import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contentDiff } from "./diff";
import { exportContent } from "./export";
import { readFileContent } from "./files";
import { importContent, SYSTEM_EMAIL, type ImportSummary } from "./import";
import { proposeChanges } from "./propose";
import { approveTask, declineTask, removeOfficialDomain } from "./review";

/**
 * Runs against a throwaway Postgres (TEST_DATABASE_URL), which it wipes first.
 * Only local or CI service hosts are accepted, so it can never reach a real database.
 */
const url = process.env.TEST_DATABASE_URL;
const throwaway = !!url && /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(url);

describe.skipIf(!throwaway)("content database", () => {
  let db: PrismaClient;
  let summary: ImportSummary;
  let systemId: string;

  beforeAll(async () => {
    const wipe = new PrismaClient({ datasourceUrl: url });
    await wipe.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await wipe.$executeRawUnsafe("CREATE SCHEMA public");
    await wipe.$disconnect();
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url }, stdio: "pipe" });
    db = new PrismaClient({ datasourceUrl: url });
    summary = await importContent(db, readFileContent());
    systemId = (await db.user.findUniqueOrThrow({ where: { email: SYSTEM_EMAIL } })).id;
  }, 300_000);

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("returns exactly what data/ holds after the import", async () => {
    const files = readFileContent();
    expect(summary).toMatchObject({ states: files.states.length, regulations: files.regulations.length, glossary: files.glossary.length });
    expect(contentDiff(files, await exportContent(db))).toEqual([]);
  }, 60_000);

  it("opens a review task for every restated threshold", async () => {
    const restated = readFileContent().states.flatMap((p) => [...p.permitTypes, ...(p.oilAndGas?.programs ?? [])]).filter((x) => x.thresholds).length;
    expect(await db.reviewTask.count({ where: { kind: "RESTATED_THRESHOLD", status: "OPEN" } })).toBe(restated);
  });

  it("sets isOfficial from the allowlist, never from the writer", async () => {
    const off = await db.source.create({ data: { url: "https://example.com/rule", title: "x", kind: "OTHER", publisher: "example.com", isOfficial: true } });
    const gov = await db.source.create({ data: { url: "https://www.epa.gov/some-page", title: "x", kind: "OTHER", publisher: "epa.gov" } });
    expect(off.isOfficial).toBe(false);
    expect(gov.isOfficial).toBe(true);
    await db.officialDomain.create({ data: { domain: "example.com", jurisdiction: "STATE", addedById: systemId } });
    expect((await db.source.findUniqueOrThrow({ where: { id: off.id } })).isOfficial).toBe(true);
    await db.officialDomain.delete({ where: { domain: "example.com" } });
    expect((await db.source.findUniqueOrThrow({ where: { id: off.id } })).isOfficial).toBe(false);
  });

  /** A new glossary term with one draft version citing `sourceUrl`. */
  const draftTerm = async (slug: string, sourceUrl: string) => {
    const source = await db.source.upsert({ where: { url: sourceUrl }, create: { url: sourceUrl, title: "t", kind: "OTHER", publisher: "p" }, update: {} });
    const term = await db.glossaryTerm.create({ data: { slug, category: "Title V", position: 999 } });
    const v = await db.glossaryTermVersion.create({ data: { termId: term.id, term: slug, definition: "d", cites: [], versionNo: 1, authorId: systemId } });
    await db.citation.create({ data: { sourceId: source.id, role: "SOURCE", glossaryVersionId: v.id } });
    return { term, v };
  };
  const publish = (id: string) => db.glossaryTermVersion.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });

  it("R1: publishes only with a citation to an official source", async () => {
    const bad = await draftTerm("test-unofficial", "https://example.org/page");
    await expect(publish(bad.v.id)).rejects.toThrow(/R1/);
    const good = await draftTerm("test-official", "https://www.ecfr.gov/current/title-40");
    await expect(publish(good.v.id)).resolves.toMatchObject({ status: "PUBLISHED" });
  });

  it("R3: a published version can be superseded but never edited or deleted, and its citations are frozen", async () => {
    const { v } = await draftTerm("test-frozen", "https://www.ecfr.gov/current/title-40/part-70");
    await publish(v.id);
    await expect(db.glossaryTermVersion.update({ where: { id: v.id }, data: { definition: "changed" } })).rejects.toThrow(/R3/);
    await expect(db.glossaryTermVersion.delete({ where: { id: v.id } })).rejects.toThrow(/R3/);
    const c = await db.citation.findFirstOrThrow({ where: { glossaryVersionId: v.id } });
    await expect(db.citation.update({ where: { id: c.id }, data: { label: "changed" } })).rejects.toThrow(/R3/);
    await expect(db.citation.update({ where: { id: c.id }, data: { quoteCheckedAt: new Date() } })).resolves.toBeTruthy();
    await expect(db.citation.create({ data: { sourceId: c.sourceId, role: "SOURCE", glossaryVersionId: v.id } })).rejects.toThrow(/R3/);
    await expect(db.glossaryTermVersion.update({ where: { id: v.id }, data: { status: "SUPERSEDED", supersededAt: new Date() } })).resolves.toMatchObject({ status: "SUPERSEDED" });
    await expect(db.glossaryTermVersion.update({ where: { id: v.id }, data: { revisionNotes: "late edit" } })).rejects.toThrow(/R3/);
  });

  it("allows one published version per record", async () => {
    const { term, v } = await draftTerm("test-one-published", "https://www.ecfr.gov/current/title-40/part-60");
    await publish(v.id);
    const v2 = await db.glossaryTermVersion.create({ data: { termId: term.id, term: "x", definition: "d2", cites: [], versionNo: 2, authorId: systemId } });
    const src = await db.source.findUniqueOrThrow({ where: { url: "https://www.ecfr.gov/current/title-40/part-60" } });
    await db.citation.create({ data: { sourceId: src.id, role: "SOURCE", glossaryVersionId: v2.id } });
    await expect(publish(v2.id)).rejects.toThrow();
  });

  it("R4: the reviewer is never the author", async () => {
    const term = await db.glossaryTerm.create({ data: { slug: "test-r4", category: "Title V", position: 999 } });
    await expect(db.glossaryTermVersion.create({
      data: { termId: term.id, term: "x", definition: "d", cites: [], versionNo: 1, authorId: systemId, reviewedById: systemId },
    })).rejects.toThrow(/reviewer_not_author/);
  });

  it("keeps the audit log append-only", async () => {
    const row = await db.auditLog.findFirstOrThrow();
    await expect(db.auditLog.update({ where: { id: row.id }, data: { action: "x" } })).rejects.toThrow(/append-only/);
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(/append-only/);
  });

  /**
   * Detect -> flag -> review -> approve -> publish. Each test starts from what is
   * published now, so the earlier tests' records don't count as changes.
   */
  describe("proposing and reviewing changes", () => {
    let reviewerId: string;
    beforeAll(async () => {
      reviewerId = (await db.user.create({ data: { email: "reviewer@example.com", name: "Test reviewer", platformRole: "REVIEWER" } })).id;
    });
    const openTasks = (entityId: string) => db.reviewTask.findMany({ where: { entityId, status: "OPEN", kind: { in: ["CHANGE", "NEW_RECORD"] } } });

    it("proposes nothing when the files match what is published", async () => {
      const out = await proposeChanges(db, await exportContent(db), systemId);
      expect(out).toMatchObject({ proposed: [], removals: [], skipped: [], unsupported: [] });
      expect(out.unchanged).toBeGreaterThan(400);
    }, 60_000);

    it("turns a changed program into a version for review, and publishes it only when someone else approves", async () => {
      const before = await exportContent(db);
      const files = structuredClone(before);
      const state = files.states.find((s) => s.permitTypes.some((x) => !x.thresholds && x.url))!;
      const program = state.permitTypes.find((x) => !x.thresholds && x.url)!;
      program.description += " Edited for a test.";

      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([`${state.name}: ${program.name}`]);
      expect(contentDiff(before, await exportContent(db))).toEqual([]);
      const [task] = await db.reviewTask.findMany({ where: { entityType: "PERMIT_PROGRAM", kind: "CHANGE", status: "OPEN" } });
      const draft = await db.permitProgramVersion.findUniqueOrThrow({ where: { id: task.versionId! }, include: { citations: true } });
      expect(draft).toMatchObject({ status: "IN_REVIEW", versionNo: 2, description: program.description, authorId: systemId });
      expect(draft.citations.length).toBeGreaterThan(0);

      await expect(approveTask(db, task.id, systemId)).rejects.toThrow(/R4/);
      await approveTask(db, task.id, reviewerId, "Checked against the agency page.");
      expect(contentDiff(files, await exportContent(db))).toEqual([]);
      const history = await db.permitProgramVersion.findMany({ where: { programId: task.entityId }, orderBy: { versionNo: "asc" } });
      expect(history.map((v) => v.status)).toEqual(["SUPERSEDED", "PUBLISHED"]);
      expect(history[1].reviewedById).toBe(reviewerId);
      expect(await db.auditLog.count({ where: { action: "review.publish", entityId: task.entityId } })).toBe(1);
      await expect(approveTask(db, task.id, reviewerId)).rejects.toThrow(/already decided/);
    }, 60_000);

    it("doesn't propose a change twice, or again after a reviewer sent it back, and a newer change replaces a waiting one", async () => {
      const files = await exportContent(db);
      const g = files.glossary[0];
      const label = `Glossary: ${g.term}`;
      g.definition += " Edited for a test.";
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([label]);
      expect((await proposeChanges(db, files, systemId)).skipped).toEqual([`${label} (already waiting for review)`]);

      const [task] = await db.reviewTask.findMany({ where: { entityType: "GLOSSARY_TERM", kind: "CHANGE", status: "OPEN" } });
      await expect(declineTask(db, task.id, reviewerId, "SENT_BACK", "  ")).rejects.toThrow(/Say why/);
      await declineTask(db, task.id, reviewerId, "SENT_BACK", "Quote the definition from the rule.");
      expect((await db.glossaryTermVersion.findUniqueOrThrow({ where: { id: task.versionId! } })).status).toBe("DRAFT");
      expect((await proposeChanges(db, files, systemId)).skipped).toEqual([`${label} (sent back earlier)`]);

      g.definition += " Second edit.";
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([label]);
      g.definition += " Third edit.";
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([label]);
      const open = await openTasks(task.entityId);
      expect(open).toHaveLength(1);
      expect(await db.reviewTask.count({ where: { entityId: task.entityId, status: "CLOSED" } })).toBe(1);

      await approveTask(db, open[0].id, reviewerId);
      expect(contentDiff(files, await exportContent(db))).toEqual([]);
      const history = await db.glossaryTermVersion.findMany({ where: { termId: task.entityId }, orderBy: { versionNo: "asc" } });
      expect(history.map((v) => v.status)).toEqual(["SUPERSEDED", "DRAFT", "REJECTED", "PUBLISHED"]);
    }, 60_000);

    it("rejects for good, and proposes a rejected change again once it differs", async () => {
      const files = await exportContent(db);
      const r = files.regulations[0];
      const label = `${r.shortName} (${r.citation})`;
      r.summary += " Edited for a test.";
      await proposeChanges(db, files, systemId);
      const [task] = await db.reviewTask.findMany({ where: { entityType: "REGULATION", kind: "CHANGE", status: "OPEN" } });
      await declineTask(db, task.id, reviewerId, "REJECTED", "Not supported by the rule text.");
      expect((await db.regulationVersion.findUniqueOrThrow({ where: { id: task.versionId! } })).status).toBe("REJECTED");
      expect((await proposeChanges(db, files, systemId)).skipped).toEqual([`${label} (rejected earlier)`]);
      r.summary += " Reworded.";
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([label]);
      await approveTask(db, (await openTasks(task.entityId))[0].id, reviewerId);
      expect(contentDiff(files, await exportContent(db))).toEqual([]);
    }, 60_000);

    it("takes a removed record off the site only when someone else approves, and keeps its history", async () => {
      const files = await exportContent(db);
      const at = files.glossary.findLastIndex((g) => !g.slug.startsWith("test-"));
      const [gone] = files.glossary.splice(at, 1);
      const label = `Glossary: ${gone.term}`;
      expect((await proposeChanges(db, files, systemId)).removals).toEqual([label]);
      expect((await proposeChanges(db, files, systemId)).skipped).toEqual([`${label} (removal already waiting for review)`]);
      expect((await exportContent(db)).glossary.some((g) => g.slug === gone.slug)).toBe(true);

      const task = await db.reviewTask.findFirstOrThrow({ where: { title: `Remove: ${label}`, status: "OPEN" } });
      await expect(approveTask(db, task.id, systemId)).rejects.toThrow(/R4/);
      await approveTask(db, task.id, reviewerId);
      expect(contentDiff(files, await exportContent(db))).toEqual([]);
      expect(await db.glossaryTermVersion.count({ where: { termId: task.entityId, status: "SUPERSEDED" } })).toBeGreaterThan(0);

      // Putting it back is a new record for review.
      files.glossary.splice(at, 0, gone);
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([label]);
      const [again] = await openTasks(task.entityId);
      expect(again.kind).toBe("NEW_RECORD");
      await approveTask(db, again.id, reviewerId);
      expect(contentDiff(files, await exportContent(db))).toEqual([]);
    }, 60_000);

    it("explains an R1 refusal and leaves the task waiting", async () => {
      const files = await exportContent(db);
      const g = files.glossary.find((x) => x.slug === "test-one-published")!;
      g.definition += " Edited for a test.";
      expect((await proposeChanges(db, files, systemId)).proposed).toEqual([`Glossary: ${g.term}`]);
      const term = await db.glossaryTerm.findUniqueOrThrow({ where: { slug: g.slug } });
      const [task] = await openTasks(term.id);
      await expect(approveTask(db, task.id, reviewerId)).rejects.toThrow(/no official source.*R1/);
      expect(await db.reviewTask.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: "OPEN" });
      expect((await db.glossaryTermVersion.findUniqueOrThrow({ where: { id: task.versionId! } })).status).toBe("IN_REVIEW");
      await declineTask(db, task.id, reviewerId, "REJECTED", "Needs an official citation.");
    }, 60_000);

    it("reports what it can't propose instead of guessing", async () => {
      const files = await exportContent(db);
      const [first, second] = files.states;
      first.epaRegion += 1;
      second.permitTypes[0].type = second.permitTypes[0].type === "other" ? "general" : "other";
      files.states.push({ ...structuredClone(second), slug: "test-new-state", code: "ZZ", name: "Test State" });
      files.regulations[0].shortName += " (renamed)";
      const out = await proposeChanges(db, files, systemId);
      expect(out.proposed).toEqual([]);
      expect(out.unsupported).toEqual([
        `states/${first.slug}: code, name, or EPA region changed`,
        `${second.name}: ${second.permitTypes[0].name}: permit type changed`,
        "states/test-new-state: a new state hub",
        `regulations/${files.regulations[0].slug}: short name, citation, or jurisdiction changed`,
      ]);
    }, 60_000);

    it("flags published records left without an official source when a host comes off the list", async () => {
      await expect(removeOfficialDomain(db, "gov", reviewerId)).rejects.toThrow(/stays/);
      await db.officialDomain.create({ data: { domain: "example.net", jurisdiction: "STATE", addedById: systemId } });
      const { term, v } = await draftTerm("test-host-removal", "https://example.net/rule");
      await publish(v.id);
      expect(await removeOfficialDomain(db, "example.net", reviewerId)).toBe(1);
      expect(await db.reviewTask.findFirstOrThrow({ where: { kind: "SOURCE_CHANGED", entityId: term.id } })).toMatchObject({ versionId: v.id, status: "OPEN" });
      expect(await db.officialDomain.findUnique({ where: { domain: "example.net" } })).toBeNull();
      expect(await db.auditLog.count({ where: { action: "domain.remove" } })).toBe(1);
    });
  });
});
