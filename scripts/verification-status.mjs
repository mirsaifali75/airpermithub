// Builds data/verification/status.json, the compact result of the last source
// check that the site shows next to each quote and on /verification.
// Usage: node scripts/verification-status.mjs <report.json> [earlier-report.json ...]
// Reports come from the Source verification workflow (verify/<date>-<run>
// branches), newest first. Agency sites that refuse automated requests do so
// on some runs and not others, so an item the newest run could not read keeps
// its result from an earlier run within 31 days, if the text and source are
// unchanged. data/verification/manual.json lists checks an editor made by hand.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [reportFile, ...earlierFiles] = process.argv.slice(2);
if (!reportFile) {
  console.error("Usage: node scripts/verification-status.mjs <report.json> [earlier-report.json ...]");
  process.exit(1);
}
const manualFile = "data/verification/manual.json";
const report = JSON.parse(readFileSync(reportFile, "utf8"));
const earlier = earlierFiles.map((f) => JSON.parse(readFileSync(f, "utf8"))).filter((r) => (Date.parse(report.checkedOn) - Date.parse(r.checkedOn)) / 864e5 <= 31);
const manual = existsSync(manualFile) ? JSON.parse(readFileSync(manualFile, "utf8")) : [];

/** Results that count as confirmed, per kind. */
const PASS = { quote: ["verified"], threshold: ["numbers-found"], link: ["ok"], name: ["verified", "words-found"], citation: ["verified"], cfr: ["verified"], "cfr-term": ["verified"], "cfr-quote": ["verified"] };
/** Results that mean the source could not be read, not that the claim is wrong. */
const UNCHECKED = ["blocked", "unreadable", "unreachable", "skipped"];

const key = (kind, where, url) => `${kind}|${where}${kind === "link" || kind === "name" || kind === "citation" ? `|${url ?? ""}` : ""}`;
const hand = new Map(manual.map((m) => [key(m.kind, m.where, m.url), m]));
const same = (a, b) => a.kind === b.kind && a.where === b.where && a.url === b.url && a.text === b.text;

const claims = {};
const totals = {};
const states = {};
for (const r of report.results) {
  const k = key(r.kind, r.where, r.url);
  const m = hand.get(k);
  let result = m ? m.result : r.result;
  let readOn;
  if (!m && UNCHECKED.includes(result)) {
    for (const e of earlier) {
      const prev = e.results.find((x) => same(x, r));
      if (prev && !UNCHECKED.includes(prev.result)) { result = prev.result; readOn = e.checkedOn; break; }
    }
  }
  const status = PASS[r.kind]?.includes(result) ? "pass" : UNCHECKED.includes(result) ? "unchecked" : "fail";
  const entry = { s: status, r: result };
  if (m) Object.assign(entry, { by: "hand", on: m.checkedOn, note: m.note });
  else if (readOn) entry.on = readOn;
  else if (r.detail && status !== "pass") entry.d = String(r.detail).slice(0, 200);
  // Pages show a per-item result for quotes and threshold summaries; the rest are counted
  if (r.kind === "quote" || r.kind === "threshold") claims[k] = entry;

  const t = (totals[r.kind] ??= { pass: 0, fail: 0, unchecked: 0 });
  t[status]++;
  const code = r.where.match(/^state:([A-Z]{2}):/)?.[1];
  if (code) {
    const s = (states[code] ??= {});
    const c = (s[r.kind] ??= { pass: 0, fail: 0, unchecked: 0 });
    c[status]++;
  }
}
const seen = new Set(report.results.map((r) => key(r.kind, r.where, r.url)));
const unused = [...hand.keys()].filter((k) => !seen.has(k));
if (unused.length) console.warn(`manual checks that match no claim:\n  ${unused.join("\n  ")}`);

const out = { checkedOn: report.checkedOn, ecfrDate: report.ecfrDate, totals, states, claims };
writeFileSync("data/verification/status.json", JSON.stringify(out) + "\n");
console.log(JSON.stringify(totals, null, 1));
