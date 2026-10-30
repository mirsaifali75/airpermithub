// Pulls official rule text from the eCFR API for the subparts in data/ecfr/config.json
// and writes one JSON file per subpart. A file is rewritten only when the rule text,
// headings, or amendment dates change, so a diff means eCFR changed.
// A config entry can list extra section ids to quote in `quote` when a subpart's
// applicability section has a heading the automatic match doesn't catch.
// Usage: node scripts/sync-ecfr.mjs [--report report.md]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://www.ecfr.gov/api/versioner/v1";
const DIR = new URL("../data/ecfr/", import.meta.url).pathname;
const { title, subparts } = JSON.parse(readFileSync(join(DIR, "config.json"), "utf8"));
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const reportPath = arg("--report");
const today = new Date().toISOString().slice(0, 10);

/** Section headings whose full text is kept: the parts of a subpart that say who it covers. */
const QUOTE_RE = /^(applicability|am i subject|am i affected|does this subpart apply|what is the purpose of this subpart|what parts of my (plant|facility)|what is the affected source|who must report|definition of (the )?source category|reporting threshold|scope\b|designated facilities)/i;
const MAX_QUOTES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, kind) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "AirPermitHub eCFR snapshot (+https://airpermithub.com)" } });
      if (r.ok) return kind === "json" ? r.json() : r.text();
      last = new Error(`${r.status} ${url}`);
      if (r.status === 404 || r.status === 400) throw last;
    } catch (e) {
      last = e;
      if (/^(404|400) /.test(e.message)) throw e;
    }
    await sleep(2000 * 2 ** i);
  }
  throw last;
}

const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
/** XML fragment to plain text. Inline markup (italics, subscripts) is dropped without adding spaces. */
export function text(x) {
  return decode(
    x
      .replace(/<SU>(\d+)<\/SU>/g, (_, d) => [...d].map((c) => SUP[c]).join(""))
      .replace(/<FTREF\s*\/>/g, "")
      .replace(/<\/?(E|I|B|SU|AC)\b[^>]*>/g, "")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

/** Parses the eCFR XML for one subpart. */
export function parseSubpart(xml, extraQuotes = []) {
  const top = xml.match(/<DIV6[^>]*TYPE="SUBPART"[^>]*>\s*<HEAD>([\s\S]*?)<\/HEAD>/);
  if (!top) throw new Error("No subpart heading in eCFR response");
  const fullHeading = text(top[1]);
  const heading = fullHeading.replace(/^Subpart\s+\S+\s*[—–-]\s*/, "");
  const srcMatch = xml.match(/<SOURCE>([\s\S]*?)<\/SOURCE>/);
  const source = srcMatch ? text(srcMatch[1]).replace(/^Source:\s*/i, "") : null;

  const sections = [];
  const quotes = [];
  let group = null;
  const re = /<DIV7[^>]*TYPE="SUBJGRP"[^>]*>\s*<HEAD>([\s\S]*?)<\/HEAD>|<DIV8[^>]*TYPE="SECTION"[^>]*>([\s\S]*?)<\/DIV8>|<DIV9[^>]*TYPE="APPENDIX"[^>]*>([\s\S]*?)<\/DIV9>/g;
  for (const m of xml.matchAll(re)) {
    if (m[1] !== undefined) { group = text(m[1]); continue; }
    const body = m[2] ?? m[3];
    const head = text(body.match(/<HEAD>([\s\S]*?)<\/HEAD>/)?.[1] ?? "");
    if (m[3] !== undefined) {
      sections.push({ id: null, heading: head, group: "Tables and appendices", kind: "table" });
      continue;
    }
    const h = head.match(/^§+\s*([0-9]+\.[0-9]+[a-zA-Z]*)(?:\s*[-–—]\s*[0-9]+\.[0-9]+[a-zA-Z]*)?\s*(.*)$/);
    if (!h) continue;
    const [, id, rest] = h;
    const reserved = /\[Reserved\]/i.test(rest);
    sections.push({ id, heading: rest.trim(), group, kind: reserved ? "reserved" : "section" });
    if (!reserved && (extraQuotes.includes(id) || (QUOTE_RE.test(rest.trim()) && quotes.length < MAX_QUOTES))) {
      const paragraphs = [];
      for (const p of body.matchAll(/<(P|FP)\b[^>]*>([\s\S]*?)<\/\1>|<ROW\b[^>]*>([\s\S]*?)<\/ROW>|<TTITLE>([\s\S]*?)<\/TTITLE>/g)) {
        const t = p[3] !== undefined
          ? [...p[3].matchAll(/<ENT\b[^>]*>([\s\S]*?)<\/ENT>/g)].map((e) => text(e[1])).join(" | ")
          : text(p[2] ?? p[4]);
        if (t) paragraphs.push(t);
      }
      const cita = body.match(/<CITA[^>]*>([\s\S]*?)<\/CITA>/);
      quotes.push({ id, heading: rest.trim(), paragraphs, cita: cita ? text(cita[1]) : null });
    }
  }
  return { fullHeading, heading, source, sections, quotes };
}

/** Latest amendment date per section, and every distinct amendment date for the subpart. */
export function parseVersions(json) {
  const bySection = {};
  const dates = new Set();
  for (const v of json?.content_versions ?? []) {
    const d = v.amendment_date ?? v.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? "")) continue;
    dates.add(d);
    if (v.identifier && (!bySection[v.identifier] || d > bySection[v.identifier])) bySection[v.identifier] = d;
  }
  return { bySection, dates: [...dates].sort().reverse() };
}

const fileFor = (part, subpart) => join(DIR, `40-cfr-${part}-subpart-${subpart.toLowerCase()}.json`);
const hashOf = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");

async function main() {
  const titles = await get(`${API}/titles.json`, "json");
  const t = titles.titles.find((x) => x.number === title);
  const date = t.up_to_date_as_of ?? t.latest_issue_date;
  const lines = [`# eCFR snapshot`, ``, `Title ${title} up to date as of ${date} (eCFR). Checked ${today}.`, ``];
  let failed = 0, changed = 0;

  for (const { part, subpart, quote = [] } of subparts) {
    const label = `40 CFR Part ${part}, Subpart ${subpart}`;
    try {
      const q = `part=${part}&subpart=${encodeURIComponent(subpart)}`;
      const xml = await get(`${API}/full/${date}/title-${title}.xml?${q}`, "text");
      const parsed = parseSubpart(xml, quote);
      let versions = { bySection: {}, dates: [] };
      try { versions = parseVersions(await get(`${API}/versions/title-${title}.json?${q}`, "json")); } catch (e) { lines.push(`- ⚠️ ${label}: amendment dates unavailable (${e.message})`); }
      const sections = parsed.sections.map((s) => ({ ...s, lastAmended: (s.id && versions.bySection[s.id]) ?? null }));
      const content = { heading: parsed.heading, fullHeading: parsed.fullHeading, source: parsed.source, sections, quotes: parsed.quotes, amendmentDates: versions.dates };
      const hash = hashOf(content);
      const file = fileFor(part, subpart);
      const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
      if (prev?.hash === hash) { lines.push(`- ${label}: no change`); continue; }
      const record = {
        title, part, subpart,
        url: `https://www.ecfr.gov/current/title-${title}/part-${part}/subpart-${subpart}`,
        ecfrDate: date,
        retrievedOn: today,
        latestAmendment: versions.dates[0] ?? null,
        hash,
        ...content,
      };
      writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
      changed++;
      if (!prev) { lines.push(`- **${label}: new** (${sections.length} entries, ${parsed.quotes.length} quoted sections)`); continue; }
      const prevIds = new Set(prev.sections.map((s) => `${s.id}|${s.heading}`));
      const nowIds = new Set(sections.map((s) => `${s.id}|${s.heading}`));
      const added = [...nowIds].filter((x) => !prevIds.has(x)).map((x) => x.replace("|", " "));
      const removed = [...prevIds].filter((x) => !nowIds.has(x)).map((x) => x.replace("|", " "));
      const prevQ = Object.fromEntries(prev.quotes.map((x) => [x.id, x.paragraphs.join("\n")]));
      const quoteChanged = parsed.quotes.filter((x) => prevQ[x.id] !== x.paragraphs.join("\n")).map((x) => `§ ${x.id}`);
      lines.push(`- **${label}: changed**`);
      if (prev.heading !== parsed.heading) lines.push(`  - Heading: "${prev.heading}" → "${parsed.heading}"`);
      if (added.length) lines.push(`  - Added or renamed: ${added.join("; ")}`);
      if (removed.length) lines.push(`  - Removed or renamed: ${removed.join("; ")}`);
      if (quoteChanged.length) lines.push(`  - Quoted text changed: ${quoteChanged.join(", ")}`);
      if (prev.latestAmendment !== record.latestAmendment) lines.push(`  - Latest amendment date: ${prev.latestAmendment} → ${record.latestAmendment}`);
    } catch (e) {
      failed++;
      lines.push(`- ❌ ${label}: ${e.message}`);
      console.log(`::warning::${label}: ${e.message}`);
    }
  }
  lines.push(``, `${changed} changed, ${failed} failed, ${subparts.length} checked.`);
  if (changed) lines.push(``, `Review each change against eCFR before merging. Merging publishes the new text on AirPermitHub.`);
  const report = lines.join("\n") + "\n";
  if (reportPath) writeFileSync(reportPath, report);
  console.log(report);
  if (failed === subparts.length) process.exit(1);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) await main();
