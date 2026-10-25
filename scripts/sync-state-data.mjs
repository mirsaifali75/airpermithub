// Copies the latest state research dataset into the app's data folder.
// Usage: node scripts/sync-state-data.mjs [sourceDir]
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = process.argv[2] ?? "/mnt/project-files/data/air-permits";
const dest = new URL("../data/", import.meta.url).pathname;

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}
mkdirSync(join(dest, "states"), { recursive: true });
for (const f of readdirSync(join(src, "states")).filter((f) => f.endsWith(".json"))) {
  cpSync(join(src, "states", f), join(dest, "states", f));
  console.log(`states/${f}`);
}
for (const f of ["federal.json", "index.json"]) {
  if (existsSync(join(src, f))) {
    cpSync(join(src, f), join(dest, f));
    console.log(f);
  }
}
