/**
 * Runs before `next build` on Vercel (see "vercel-build" in package.json).
 * Without DATABASE_URL it does nothing and the site builds from data/ files.
 * With it: apply migrations, load data/ into an empty database, and, when
 * CONTENT_SOURCE is "database", export the published content to .content/
 * for the pages to read.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { CONTENT_SOURCE } from "@/lib/content/config";
import { contentDiff } from "@/lib/content/diff";
import { exportContent, writeContentDir } from "@/lib/content/export";
import { readFileContent } from "@/lib/content/files";
import { importContent } from "@/lib/content/import";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("db-build: no DATABASE_URL, building from data/ files.");
    return;
  }
  process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  const db = new PrismaClient();
  try {
    if ((await db.state.count()) === 0) {
      console.log("db-build: empty database, importing data/ as version 1.");
      console.log(await importContent(db, readFileContent()));
    }
    const content = await exportContent(db);
    const diff = contentDiff(readFileContent(), content);
    console.log(diff.length ? `db-build: database differs from data/ in ${diff.length} records: ${diff.slice(0, 20).join(", ")}` : "db-build: database matches data/.");
    if (CONTENT_SOURCE === "database") {
      writeContentDir(content);
      console.log(`db-build: pages will read ${content.states.length} state profiles from the database export.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
