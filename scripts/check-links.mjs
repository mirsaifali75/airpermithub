#!/usr/bin/env node
/**
 * Checks every outbound source link the site publishes: state profile JSON
 * and the URLs in src/lib/data, src/lib/tools, and the tool pages, plus
 * URLs built in code (link-urls.json, see below). Writes a Markdown report and prints a
 * summary. Run it somewhere with open internet access (GitHub Actions does
 * this weekly); agency sites block some automated clients, so a 403 means
 * "check by hand", not necessarily "broken".
 *
 *   node scripts/check-links.mjs [--out link-report.md] [--strict]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : "link-report.md";
const strict = args.includes("--strict");
const root = new URL("..", import.meta.url).pathname;

/** url -> Set of places it appears */
const found = new Map();
const add = (url, where) => {
  const clean = url.replace(/[)\].,;'"]+$/, "");
  if (!/^https?:\/\//.test(clean) || clean.includes("${")) return;
  if (!found.has(clean)) found.set(clean, new Set());
  found.get(clean).add(where);
};

function walkJson(value, where) {
  if (typeof value === "string") { if (/^https?:\/\//.test(value)) add(value, where); return; }
  if (Array.isArray(value)) { for (const v of value) walkJson(v, where); return; }
  if (value && typeof value === "object") for (const v of Object.values(value)) walkJson(v, where);
}

const statesDir = join(root, "data", "states");
for (const f of readdirSync(statesDir).filter((f) => f.endsWith(".json"))) {
  walkJson(JSON.parse(readFileSync(join(statesDir, f), "utf8")), `data/states/${f}`);
}
// Literal URLs in data modules, tool code, and tool pages.
const scan = (rel) => {
  const abs = join(root, rel);
  if (!existsSync(abs)) return;
  if (statSync(abs).isDirectory()) { for (const f of readdirSync(abs)) scan(join(rel, f)); return; }
  if (!/\.(ts|tsx)$/.test(rel) || /\.test\.ts$/.test(rel)) return;
  const text = readFileSync(abs, "utf8");
  for (const m of text.matchAll(/https?:\/\/[^\s"'`<>]+/g)) add(m[0], rel);
};
["src/lib/data", "src/lib/tools", "src/lib/fedreg.ts", "src/app/tools"].forEach(scan);
// URLs assembled in code, exported by `LINKS_OUT=link-urls.json npx vitest run src/lib/links-export.test.ts`.
const built = join(root, "link-urls.json");
if (existsSync(built)) for (const { url, where } of JSON.parse(readFileSync(built, "utf8"))) add(url, where);

const SKIP = [/^https:\/\/schema\.org/, /^https?:\/\/(www\.)?airpermithub\.com/, /^https:\/\/www\.federalregister\.gov\/api\//, /^https:\/\/www\.linkedin\.com\/sharing/];
const urls = [...found.keys()].filter((u) => !SKIP.some((r) => r.test(u)));

async function check(url) {
  const opts = { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "AirPermitHub link checker (+https://airpermithub.com)" } };
  try {
    let res = await fetch(url, { ...opts, method: "HEAD" });
    if (res.status === 405 || res.status === 403 || res.status === 404) res = await fetch(url, { ...opts, method: "GET" });
    return { url, status: res.status, finalUrl: res.url };
  } catch (e) {
    return { url, status: 0, error: e.cause?.code ?? e.name ?? String(e) };
  }
}

const results = [];
const queue = [...urls];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) results.push(await check(queue.shift()));
}));
results.sort((a, b) => a.url.localeCompare(b.url));

const broken = results.filter((r) => r.status === 404 || r.status === 410 || (r.status >= 500) || r.status === 0);
const blocked = results.filter((r) => r.status === 401 || r.status === 403 || r.status === 429);
const insecure = results.filter((r) => r.url.startsWith("http://"));
const moved = results.filter((r) => r.finalUrl && r.finalUrl !== r.url && r.status < 400 && new URL(r.finalUrl).hostname !== new URL(r.url).hostname);

const where = (u) => [...found.get(u)].join(", ");
const table = (rows, extra = () => "") => rows.length === 0 ? "_None._\n" : ["| URL | Status | Found in |", "|---|---|---|", ...rows.map((r) => `| ${r.url} | ${r.status || r.error}${extra(r)} | ${where(r.url)} |`)].join("\n") + "\n";

const report = `# Link check report

Checked ${results.length} unique links on ${new Date().toISOString().slice(0, 10)}.

## Broken or unreachable (${broken.length})
${table(broken)}
## Blocked automated check, verify by hand (${blocked.length})
${table(blocked)}
## Redirects to another domain, review (${moved.length})
${table(moved, (r) => ` → ${r.finalUrl}`)}
## Plain http:// links, try the https version (${insecure.length})
${table(insecure)}`;

writeFileSync(out, report);
console.log(`Checked ${results.length} links: ${broken.length} broken, ${blocked.length} blocked, ${moved.length} cross-domain redirects, ${insecure.length} http://. Report: ${out}`);
if (strict && broken.length > 0) process.exit(1);
