// Prints the tool rule quotes (src/lib/tools/rule-text.ts) as JSON for build.py.
// Usage: node scripts/workbooks/export-quotes.mjs > /tmp/rt.json   (Node 22+)
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const src = readFileSync(new URL("../../src/lib/tools/rule-text.ts", import.meta.url), "utf8").replace(" as const satisfies Record<string, RuleQuote>;", ";");
const file = join(mkdtempSync(join(tmpdir(), "aph-rt-")), "rule-text.ts");
writeFileSync(file, src);
const m = await import(pathToFileURL(file).href);
process.stdout.write(JSON.stringify({ RT: m.RT, psd: m.psdSignificance }, null, 1));
