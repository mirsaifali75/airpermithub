/**
 * Runs before `next build` on Vercel (see "vercel-build" in package.json).
 * Without DATABASE_URL it does nothing and the site builds from data/ files.
 * With it: apply migrations, load data/ into an empty database, and, when
 * CONTENT_SOURCE is "database", export the published content to .content/
 * for the pages to read. On production builds, each record that differs from
 * data/ becomes a proposed version in the review queue; nothing publishes
 * until a reviewer approves it.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { CONTENT_SOURCE } from "@/lib/content/config";
import { contentDiff } from "@/lib/content/diff";
import { exportContent, writeContentDir } from "@/lib/content/export";
import { readFileContent } from "@/lib/content/files";
import { importContent, SYSTEM_EMAIL } from "@/lib/content/import";
import { proposeChanges } from "@/lib/content/propose";

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
    const files = readFileContent();
    const content = await exportContent(db);
    const diff = contentDiff(files, content);
    console.log(diff.length ? `db-build: database differs from data/ in ${diff.length} records: ${diff.slice(0, 20).join(", ")}` : "db-build: database matches data/.");
    if (diff.length && process.env.VERCEL_ENV === "production") {
      // Preview builds may share the production database, so only a production build proposes changes.
      const system = await db.user.findUniqueOrThrow({ where: { email: SYSTEM_EMAIL } });
      const out = await proposeChanges(db, files, system.id);
      console.log(`db-build: proposed ${out.proposed.length} changes and ${out.removals.length} removals for review.`, out);
    }
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
