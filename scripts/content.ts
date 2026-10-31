/**
 * Content database commands (run with tsx):
 *   import   load data/ into an empty database as published version 1
 *   export   write the published content to .content/ for the build
 *   parity   check that the database returns exactly what data/ holds
 */
import { PrismaClient } from "@prisma/client";
import { exportContent, writeContentDir } from "@/lib/content/export";
import { readFileContent } from "@/lib/content/files";
import { importContent } from "@/lib/content/import";
import { contentDiff } from "@/lib/content/diff";

async function main() {
  const cmd = process.argv[2];
  const db = new PrismaClient();
  try {
    if (cmd === "import") {
      console.log(await importContent(db, readFileContent()));
    } else if (cmd === "export") {
      const content = await exportContent(db);
      writeContentDir(content);
      console.log(`Exported ${content.states.length} states, ${content.regulations.length} regulations, ${content.glossary.length} glossary terms to .content/`);
    } else if (cmd === "parity") {
      const diff = contentDiff(readFileContent(), await exportContent(db));
      if (diff.length) {
        console.error(`Database differs from data/ in ${diff.length} records:\n${diff.join("\n")}`);
        process.exitCode = 1;
      } else console.log("Database matches data/.");
    } else {
      console.error("Usage: tsx scripts/content.ts import|export|parity");
      process.exitCode = 2;
    }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("content.ts")) main();
