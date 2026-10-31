import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contentDiff } from "./diff";
import { exportContent } from "./export";
import { readFileContent } from "./files";
import { importContent, SYSTEM_EMAIL, type ImportSummary } from "./import";

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
});
