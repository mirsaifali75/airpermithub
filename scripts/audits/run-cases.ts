/**
 * Runs oil and gas (or utility) calculator sections for a list of cases and
 * prints the site's results as JSON, for the independent accuracy audit:
 *
 *   npx tsx scripts/audits/run-cases.ts < cases.json > results.json
 *
 * cases.json: [{ "slug": "...", "section": "...", "values": { "id": [value, "unit"] } }]
 */
import { readFileSync } from "node:fs";
import { blankSection, getUtility, runSection } from "../../src/lib/utilities";

const cases = JSON.parse(readFileSync(0, "utf8")) as { slug: string; section: string; values: Record<string, [number, string]> }[];
const out = cases.map((k) => {
  const s = getUtility(k.slug)!.sections.find((x) => x.id === k.section)!;
  const st = blankSection(s);
  for (const [id, [v, u]] of Object.entries(k.values)) st.entries[id] = { v, u };
  const r = runSection(s, st);
  return { error: r.error ?? null, solved: r.solved ?? null, results: Object.fromEntries(r.results.map((x) => [x.id, x.value])), warnings: r.warnings };
});
process.stdout.write(JSON.stringify(out));
