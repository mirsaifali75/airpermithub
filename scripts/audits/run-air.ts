/**
 * Prints every air permit engineering calculator's worked example: steps,
 * results (in the first display unit), checks and warnings. Used for hand
 * checks and by scripts/audits/audit_air.py.
 *
 *   npx tsx scripts/audits/run-air.ts            # readable
 *   npx tsx scripts/audits/run-air.ts --json     # for the audit
 */
import { airCalcs, exampleSection, runSection } from "../../src/lib/utilities";
import { fmt, fromSI, unitOf } from "../../src/lib/utilities/units";

const json = process.argv.includes("--json");
const out: Record<string, unknown> = {};
for (const u of airCalcs) {
  for (const s of u.sections) {
    const r = runSection(s, exampleSection(s));
    const key = `${u.slug}/${s.id}`;
    out[key] = { error: r.error ?? null, results: Object.fromEntries(r.results.map((x) => [x.id, { value: fromSI(x.family, x.show[0], x.value), unit: x.show[0] }])), checks: r.checks ?? [] };
    if (json) continue;
    console.log(`\n=== ${key}${r.error ? `  ERROR: ${r.error}` : ""}`);
    for (const st of r.steps) console.log(`  · ${st.label}: ${st.work}`);
    for (const x of r.results) console.log(`  = ${x.label}: ${fmt(fromSI(x.family, x.show[0], x.value), 6)} ${unitOf(x.family, x.show[0]).label}`);
    for (const ch of r.checks ?? []) console.log(`  ${ch.pass ? "PASS" : "FAIL"} ${ch.text}`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
  }
}
if (json) process.stdout.write(JSON.stringify(out));
