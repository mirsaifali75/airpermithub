#!/usr/bin/env node
/**
 * Checks the site's sourced claims against the government pages they cite.
 * Input is the claims file written by src/lib/verify-export.test.ts
 * (VERIFY_OUT=verify-claims.json npx vitest run src/lib/verify-export.test.ts).
 *
 *  - Quotes must appear word for word in the cited page (PDFs via pdftotext).
 *  - Restated thresholds: every number must appear in the cited page, and the
 *    closest sentences are saved so an editor can swap in the exact wording.
 *  - 40 CFR citations, quotes, and glossary terms are checked against the
 *    current eCFR text of the cited section and paragraph.
 *  - Names, state rule citations, and links are checked on their pages.
 *
 * Needs open internet access (run in GitHub Actions). Writes report.json,
 * urls.json, and report.md to the --out folder.
 *
 *   node scripts/verify-sources.mjs --claims verify-claims.json --out data/verification
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = "https://www.ecfr.gov/api/versioner/v1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AirPermitHub-source-verifier (+https://airpermithub.com)";

// ---------- text helpers (exported for tests) ----------

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", sect: "§", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", deg: "°", frac12: "½", le: "≤", ge: "≥", middot: "·", reg: "®", copy: "©", shy: "" };
export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

/** Visible text of an HTML page. */
export function htmlText(html) {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    // One pass over tags, so markup inside attribute values (tooltips) is never split.
    // As in browsers, a quote opens a value only after "="; a stray quote is just a character.
    .replace(/<[a-zA-Z/!](?:=\s*"[^"]*"|=\s*'[^']*'|[^>])*>/g, (t) => (/^<(br\b|\/(p|div|li|tr|h[1-6]|td|th|section|article|dd|dt)>)/i.test(t) ? "\n" : " "));
  return decode(body).replace(/[ \t\r\f\v ]+/g, " ").replace(/\n\s*/g, "\n").trim();
}
export const titleOf = (html) => decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();

/** Lowercase letters and digits only: ignores spacing, punctuation, line-break hyphens, and quote styles. */
export const alnum = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Pieces of a quote that must each appear word for word: text between
 * ellipses, with [bracketed editorial insertions] removed.
 */
export function quoteFragments(quote) {
  return quote
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((f) => f.trim().replace(/^[,;:\s]+|[,;:\s]+$/g, ""))
    .filter((f) => f.split(/\s+/).length >= 2);
}

/** Text around the first place a quote's wording shows up, for an editor fixing a quote. */
export function contextFor(quote, text, size = 1200) {
  const words = quote.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  const lower = text.toLowerCase();
  for (let i = 0; i + 4 <= words.length; i++) {
    const probe = words.slice(i, i + 4).join(" ").toLowerCase().replace(/[.,;:]+$/, "");
    const at = lower.indexOf(probe);
    if (at >= 0) return text.slice(Math.max(0, at - 300), at + size).replace(/\s+/g, " ");
  }
  return null;
}

/** Share of the quote's 6-word runs that appear in the text, 0 to 1. */
export function coverage(quote, textAlnum) {
  const words = quote.split(/\s+/).map(alnum).filter(Boolean);
  if (words.length <= 6) return textAlnum.includes(words.join("")) ? 1 : 0;
  let hit = 0, n = 0;
  for (let i = 0; i + 6 <= words.length; i++, n++) if (textAlnum.includes(words.slice(i, i + 6).join(""))) hit++;
  return n ? hit / n : 0;
}

/** Numbers in a restated threshold, without thousands separators. */
export function numbersIn(s) {
  return [...new Set([...s.matchAll(/(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])\d+(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, "")))];
}
/**
 * Numbers a threshold summary restates, leaving out its source notes, e.g.
 * "(restated from TCEQ RG-404, 2011)", and rule numbers such as § 22a-174-3a,
 * Rule 62-210.200, or 30 TAC 122.10, which are not thresholds.
 */
export function thresholdNumbers(s) {
  const plain = s
    .replace(/\((?:[^()]|\([^()]*\))*\b(?:restated|per|from|fact sheet|RG-\d+|presentation|guide|guidance|rev\.)(?:[^()]|\([^()]*\))*\)/gi, " ")
    .replace(/(?:§+\s*|\b(?:Rule|TAC|COMAR|RCSA|NMAC|IAC|ARM|CSR|CFR|AAC|APDG|RG-|Chapter|Section|Part)\s*)\d[\w.\-()]*/g, " ")
    .replace(/\b\d+[a-z]+-\d[\w.\-()]*|\b\d+-\d+\.\d[\w.\-()]*|\b\d+-\d+-\d[\w.\-()]*/g, " ");
  return numbersIn(plain);
}
export function hasNumber(text, n) {
  const variants = [n];
  if (/^\d{4,}$/.test(n)) variants.push(Number(n).toLocaleString("en-US"));
  // "0.50" on the site and "0.5" at the source are the same number
  if (/\.\d*0$/.test(n)) variants.push(String(Number(n)));
  return variants.some((v) => new RegExp(`(?<![\\d.,])${v.replace(/[.,]/g, (c) => `\\${c}`)}(?![\\d]|[.,]\\d)`).test(text));
}

/** Sentences of `text` that share the most numbers and words with `claim`. */
export function closestSentences(claim, text, n = 2) {
  const nums = numbersIn(claim);
  const words = new Set(claim.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const sentences = text.split(/(?<=[.;:])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 20 && s.length < 600);
  return sentences
    .map((s) => ({ s, score: nums.filter((x) => hasNumber(s, x)).length * 3 + (s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => words.has(w)).length }))
    .filter((x) => x.score > 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
}

// ---------- eCFR paragraphs ----------

const roman = (n) => [["c", 100], ["xc", 90], ["l", 50], ["xl", 40], ["x", 10], ["ix", 9], ["v", 5], ["iv", 4], ["i", 1]].reduce((out, [r, v]) => { while (n >= v) { out += r; n -= v; } return out; }, "");
// Definitions sections run past (xl), as in 51.165(a)(1)(xlii)
const ROMAN = Array.from({ length: 120 }, (_, i) => roman(i + 1));
const nextLetter = (l) => (l === "z" ? "aa" : l.length === 2 ? String.fromCharCode(l.charCodeAt(0) + 1).repeat(2) : String.fromCharCode(l.charCodeAt(0) + 1));
function follows(type, prev, label) {
  if (type.endsWith("digit")) return Number(label) === Number(prev) + 1;
  if (type.endsWith("roman")) return ROMAN.indexOf(label) === ROMAN.indexOf(prev) + 1;
  if (type === "upper") return label === nextLetter(prev.toLowerCase()).toUpperCase();
  return label === nextLetter(prev);
}
const FIRST = { digit: "1", idigit: "1", lower: "a", ilower: "a", roman: "i", iroman: "i", upper: "A" };

/**
 * Splits one eCFR section's XML into paragraphs with full designations such
 * as "(b)(48)(ii)(d)", tracking nesting from each paragraph's leading markers.
 */
export function ecfrParagraphs(xml) {
  const out = [];
  let stack = [];
  let prevText = "";
  for (const m of xml.matchAll(/<(P|FP[-A-Z0-9]*)(?=[\s>])[^>]*>([\s\S]*?)<\/\1>/g)) {
    let raw = m[2].trim();
    let marker;
    let inline = false;
    while ((marker = raw.match(/^\(\s*(<(?:I|E)[^>]*>)?\s*([0-9]+|[a-z]{1,6}|[A-Z]{1,3})\s*(?:<\/(?:I|E)>)?\s*\)\s*/))) {
      const italic = !!marker[1];
      const label = marker[2];
      let candidates;
      if (/^\d+$/.test(label)) candidates = [italic ? "idigit" : "digit"];
      else if (/^[A-Z]+$/.test(label)) candidates = ["upper"];
      else candidates = ROMAN.includes(label) ? [italic ? "iroman" : "roman", italic ? "ilower" : "lower"] : [italic ? "ilower" : "lower"];
      // A second marker in the same paragraph, or one after a lead-in ending in a colon or dash, opens a new, deeper list.
      const leadIn = inline || /[:—-]\s*$|means\s*$/.test(prevText);
      const options = candidates.map((type) => {
        const k = stack.findIndex((s) => s.type === type);
        if (k >= 0 && follows(type, stack[k].label, label)) return { type, k, cont: true };
        if (k < 0 && FIRST[type] === label) return { type, k: stack.length, cont: false };
        return null;
      }).filter(Boolean);
      // "(i)" can continue a letter list or start a roman one.
      let pick = options[0];
      if (options.length > 1) pick = options.find((o) => (leadIn ? !o.cont : o.cont)) ?? options[0];
      if (!pick) {
        const k = stack.findIndex((s) => s.type === candidates[0]);
        pick = { type: candidates[0], k: k >= 0 ? k : stack.length };
      }
      stack = [...stack.slice(0, pick.k), { type: pick.type, label }];
      raw = raw.slice(marker[0].length);
      inline = true;
      // "(e) <I>Heading.</I> (1) Text": the heading belongs to (e), the text to (e)(1).
      const heading = raw.match(/^<(I|E)\b[^>]*>([^<]*)<\/\1>\s*(?=\(\s*(?:<(?:I|E)[^>]*>)?\s*(?:[0-9]+|[a-z]{1,6}|[A-Z]{1,3})\s*(?:<\/(?:I|E)>)?\s*\)\s)/);
      if (heading) {
        out.push({ des: stack.map((s) => `(${s.label})`).join(""), text: decode(heading[2]).trim() });
        prevText = heading[2];
        raw = raw.slice(heading[0].length);
      }
    }
    const text = decode(raw.replace(/<\/?(E|I|B|SU)\b[^>]*>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    out.push({ des: stack.map((s) => `(${s.label})`).join(""), text });
    prevText = text;
  }
  return out;
}

export function paragraphText(paras, des) {
  if (!des) return paras.map((p) => p.text).join(" ");
  return paras.filter((p) => p.des === des || p.des.startsWith(`${des}(`)).map((p) => p.text).join(" ");
}

// ---------- fetching ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pageCache = new Map();
const tmp = mkdtempSync(join(tmpdir(), "verify-"));
let pdfCount = 0;
let keepRaw = false;

async function fetchPage(url) {
  const key = url.split("#")[0];
  if (pageCache.has(key)) return pageCache.get(key);
  const p = (async () => {
    let last = { status: 0, error: "not attempted" };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(key, { redirect: "follow", signal: AbortSignal.timeout(45000), headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8" } });
        const type = res.headers.get("content-type") ?? "";
        const buf = Buffer.from(await res.arrayBuffer());
        const isPdf = type.includes("pdf") || buf.subarray(0, 5).toString() === "%PDF-";
        const isDocx = type.includes("wordprocessingml") || (/\.docx$/i.test(key) && buf.subarray(0, 2).toString() === "PK");
        let text = "", title = "", raw;
        if (isDocx) {
          const f = join(tmp, `p${pdfCount++}.docx`);
          writeFileSync(f, buf);
          // Word splits text into runs mid-word, so drop run tags without adding spaces
          try { text = decode(execFileSync("unzip", ["-p", f, "word/document.xml"], { maxBuffer: 64 * 1024 * 1024 }).toString().replace(/<\/w:p>/g, "\n").replace(/<w:(tab|br)\b[^>]*\/>/g, " ").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim(); } catch { text = ""; }
        } else if (isPdf) {
          const f = join(tmp, `p${pdfCount++}.pdf`);
          writeFileSync(f, buf);
          try { text = execFileSync("pdftotext", ["-q", f, "-"], { maxBuffer: 64 * 1024 * 1024 }).toString(); } catch { text = ""; }
        } else if (/html|xml|text/.test(type) || !type) {
          const html = buf.toString("utf8");
          text = htmlText(html);
          title = titleOf(html);
          if (keepRaw) raw = html;
        }
        last = { status: res.status, finalUrl: res.url, type: isPdf ? "pdf" : isDocx ? "docx" : type.split(";")[0], title, text, textAlnum: alnum(text), raw };
        if (res.status < 500 && res.status !== 429) return last;
      } catch (e) {
        last = { status: 0, error: e.cause?.code ?? e.name ?? String(e), text: "", textAlnum: "" };
      }
      await sleep(3000);
    }
    return last;
  })();
  pageCache.set(key, p);
  return p;
}

let ecfrDate = null;
const sectionCache = new Map();
const rawSections = new Map();
async function ecfrSection(section) {
  if (sectionCache.has(section)) return sectionCache.get(section);
  const p = (async () => {
    const part = section.split(".")[0];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${API}/full/${ecfrDate}/title-40.xml?part=${part}&section=${encodeURIComponent(section)}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
        if (res.status === 404 || res.status === 400) return { exists: false };
        if (res.ok) {
          const xml = await res.text();
          rawSections.set(section, xml);
          const head = decode((xml.match(/<HEAD>([\s\S]*?)<\/HEAD>/)?.[1] ?? "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
          return { exists: true, head, paras: ecfrParagraphs(xml) };
        }
      } catch { /* retry */ }
      await sleep(3000 * (attempt + 1));
    }
    return { exists: null };
  })();
  sectionCache.set(section, p);
  return p;
}

const splitCite = (cite) => {
  const m = cite.match(/^(\d+\.\d+[a-zA-Z]*)((?:\([0-9a-zA-Z]+\))*)/);
  return m ? { section: m[1], des: m[2] } : null;
};

// ---------- checks ----------

// Some agency sites answer with a server error but still send the full page.
const servedDespiteError = (page) => page.status >= 500 && !!page.title && page.text.length >= 2000;

function pageProblem(page) {
  if (!page || page.status === 0) return { result: "unreachable", detail: page?.error ?? "no response" };
  if (servedDespiteError(page)) return null;
  if (page.status === 401 || page.status === 403 || page.status === 429) return { result: "blocked", detail: `HTTP ${page.status}` };
  if (page.status >= 400) return { result: "broken", detail: `HTTP ${page.status}` };
  if (page.text.length < 400) return { result: "unreadable", detail: page.type === "pdf" ? "PDF has no extractable text" : "page text not readable (likely needs JavaScript)" };
  return null;
}

async function check(c) {
  if (c.kind === "link") {
    const page = await fetchPage(c.url);
    if (!page || page.status === 0) return { result: "unreachable", detail: page?.error };
    if ([401, 403, 429].includes(page.status)) return { result: "blocked", detail: `HTTP ${page.status}` };
    if (servedDespiteError(page)) return { result: "ok", detail: `${page.title} (server reported HTTP ${page.status} but sent the page)` };
    if (page.status >= 400) return { result: "broken", detail: `HTTP ${page.status}` };
    return { result: "ok", detail: page.title || undefined };
  }
  if (c.kind === "quote" || c.kind === "name" || c.kind === "citation" || c.kind === "threshold") {
    let page = await fetchPage(c.url);
    if (c.also?.length && !pageProblem(page)) {
      // Thresholds summarized from two documents: check the numbers against both
      const more = (await Promise.all(c.also.map(fetchPage))).filter((p) => !pageProblem(p));
      const text = [page.text, ...more.map((p) => p.text)].join("\n");
      page = { ...page, text, textAlnum: alnum(text) };
    }
    const problem = pageProblem(page);
    if (problem) return problem;
    if (c.kind === "quote") {
      if (page.textAlnum.includes(alnum(c.text))) return { result: "verified" };
      const frags = quoteFragments(c.text);
      const missing = frags.filter((f) => !page.textAlnum.includes(alnum(f)));
      if (frags.length > 1 && missing.length === 0) return { result: "verified", detail: `${frags.length} excerpts joined with ellipses, each found word for word` };
      const cov = coverage(c.text, page.textAlnum);
      return { result: cov >= 0.8 ? "near" : "not-found", detail: `${Math.round(cov * 100)}% of the quote's wording found${frags.length > 1 ? `; ${missing.length} of ${frags.length} excerpts missing` : ""}`, missing, candidates: closestSentences(c.text, page.text), context: contextFor(c.text, page.text) };
    }
    if (c.kind === "name") {
      const hay = page.textAlnum + alnum(page.title ?? "");
      const plain = c.text.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      if (hay.includes(alnum(c.text)) || hay.includes(alnum(plain))) return { result: "verified" };
      // Pages often shorten a formal name; check that every word of it is on the page
      const words = plain.match(/[A-Za-z][A-Za-z.'&-]{2,}|\d+/g)?.filter((w) => !/^(and|the|for)$/i.test(w)) ?? [];
      const missing = words.filter((w) => !hay.includes(alnum(w)));
      if (words.length && !missing.length) return { result: "words-found", detail: `every word of the name is on the page, not the full name in that order${page.title ? `; page title: ${page.title}` : ""}` };
      return { result: "not-found", detail: `${missing.length ? `missing: ${missing.join(", ")}; ` : ""}${page.title ? `page title: ${page.title}` : ""}` };
    }
    if (c.kind === "citation") {
      const core = c.text.match(/[\d][\d.:\-–A-Za-z]*\d/g)?.at(-1);
      if (!core) return { result: "skipped", detail: "no section number" };
      // "201.142-201.144" or "9.7.5-9.7.6": a range; either end on the page counts
      const ends = core.match(/^(.*[.:].*)[-–](\d.*[.:].*)$/)?.slice(1) ?? [core];
      return ends.some((e) => page.textAlnum.includes(alnum(e))) ? { result: "verified" } : { result: "not-found", detail: `"${core}" not on page` };
    }
    const nums = thresholdNumbers(c.text);
    const missing = nums.filter((n) => !hasNumber(page.text, n));
    return { result: missing.length ? "numbers-missing" : "numbers-found", detail: missing.length ? `not on page: ${missing.join(", ")}` : `${nums.length} numbers found`, candidates: closestSentences(c.text, page.text), context: missing.length ? contextFor(c.text, page.text) : undefined };
  }
  // 40 CFR checks
  const cites = (c.cite ?? "").split("|").map(splitCite).filter(Boolean);
  if (!cites.length) return { result: "skipped", detail: "no citation" };
  const results = [];
  for (const { section, des } of cites) {
    const sec = await ecfrSection(section);
    if (sec.exists === null) { results.push({ result: "unreachable", detail: `eCFR ${section}` }); continue; }
    if (!sec.exists) { results.push({ result: "not-found", detail: `§ ${section} not in current eCFR` }); continue; }
    const desExists = !des || sec.paras.some((p) => p.des === des || p.des.startsWith(`${des}(`));
    if (c.kind === "cfr") { results.push(desExists ? { result: "verified", detail: sec.head } : { result: "not-found", detail: `§ ${section} exists but paragraph ${des} not found` }); continue; }
    const target = alnum(c.kind === "cfr-term" ? c.text.replace(/\s*\([^)]*\)\s*/g, " ") : c.text);
    if (c.kind === "cfr-term" && c.text.includes(" | ")) {
      const here = alnum(paragraphText(sec.paras, des));
      const missing = c.text.split(" | ").filter((t) => !here.includes(alnum(t)));
      results.push(desExists && !missing.length ? { result: "verified", detail: `§ ${section}${des}` } : { result: "not-found", detail: `not in § ${section}${des}: ${missing.join("; ")}` });
      continue;
    }
    if (desExists && alnum(paragraphText(sec.paras, des)).includes(target)) { results.push({ result: "verified", detail: `§ ${section}${des}` }); continue; }
    const elsewhere = sec.paras.find((p) => alnum(p.text).includes(target));
    if (elsewhere) { results.push({ result: "other-paragraph", detail: `found in § ${section}${elsewhere.des}, cited ${des || "section"}` }); continue; }
    if (alnum(paragraphText(sec.paras, "")).includes(target)) { results.push({ result: "other-paragraph", detail: `found in § ${section} across paragraphs` }); continue; }
    const cov = coverage(c.text, alnum(paragraphText(sec.paras, "")));
    results.push({ result: cov >= 0.8 ? "near" : "not-found", detail: `${Math.round(cov * 100)}% of wording found in § ${section}` });
  }
  return results.find((r) => r.result === "verified") ?? results.find((r) => r.result === "other-paragraph") ?? results[0];
}

// ---------- main ----------

/** Saves the text of each listed page, for an editor checking wording against the source. */
async function fetchOnly(listFile, outDir) {
  mkdirSync(outDir, { recursive: true });
  keepRaw = true;
  const urls = readFileSync(listFile, "utf8").split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  const index = {};
  for (const [n, u] of urls.entries()) {
    const page = await fetchPage(u);
    const name = `f${String(n + 1).padStart(3, "0")}.txt`;
    index[name] = { url: u, status: page.status, finalUrl: page.finalUrl, type: page.type, title: page.title, error: page.error, length: page.text?.length ?? 0 };
    writeFileSync(join(outDir, name), page.text ?? "");
    if (page.raw) writeFileSync(join(outDir, name.replace(/\.txt$/, ".html")), page.raw);
  }
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 1));
  console.log(JSON.stringify(index, null, 1));
}

async function main() {
  const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
  if (arg("--fetch", null)) return fetchOnly(arg("--fetch"), arg("--out", "fetched"));
  const claims = JSON.parse(readFileSync(arg("--claims", "verify-claims.json"), "utf8"));
  const outDir = arg("--out", "data/verification");
  mkdirSync(outDir, { recursive: true });
  const titles = await (await fetch(`${API}/titles.json`, { headers: { "user-agent": UA } })).json();
  const t40 = titles.titles.find((t) => t.number === 40);
  ecfrDate = t40.up_to_date_as_of ?? t40.latest_issue_date;

  const results = new Array(claims.length);
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < claims.length) {
      const k = i++;
      const c = claims[k];
      try { results[k] = { ...c, ...(await check(c)) }; } catch (e) { results[k] = { ...c, result: "error", detail: String(e) }; }
    }
  }));

  const checkedOn = new Date().toISOString().slice(0, 10);
  const summary = {};
  for (const r of results) {
    summary[r.kind] ??= {};
    summary[r.kind][r.result] = (summary[r.kind][r.result] ?? 0) + 1;
  }
  const urls = {};
  for (const [u, p] of pageCache) {
    const page = await p;
    urls[u] = { status: page.status, finalUrl: page.finalUrl && page.finalUrl !== u ? page.finalUrl : undefined, type: page.type, title: page.title || undefined, textLength: page.text?.length ?? 0, error: page.error };
  }
  const debugDir = arg("--debug", null);
  if (debugDir) {
    mkdirSync(join(debugDir, "ecfr"), { recursive: true });
    mkdirSync(join(debugDir, "pages"), { recursive: true });
    for (const [sec, xml] of rawSections) writeFileSync(join(debugDir, "ecfr", `${sec}.xml`), xml);
    const textUrls = new Set(claims.filter((c) => ["quote", "threshold"].includes(c.kind)).flatMap((c) => [c.url, ...(c.also ?? [])].map((u) => u.split("#")[0])));
    const index = {};
    let n = 0;
    for (const u of textUrls) {
      const page = await pageCache.get(u);
      if (!page?.text) continue;
      const name = `p${String(++n).padStart(3, "0")}.txt`;
      index[name] = u;
      writeFileSync(join(debugDir, "pages", name), page.text);
    }
    writeFileSync(join(debugDir, "pages", "index.json"), JSON.stringify(index, null, 1));
  }
  writeFileSync(join(outDir, "report.json"), JSON.stringify({ checkedOn, ecfrDate, summary, results }, null, 1) + "\n");
  writeFileSync(join(outDir, "urls.json"), JSON.stringify(urls, null, 1) + "\n");

  const md = [`# Source verification`, ``, `Checked ${checkedOn} against live pages and eCFR (current through ${ecfrDate}). ${claims.length} claims, ${pageCache.size} pages, ${sectionCache.size} eCFR sections.`, ``, `| Kind | Results |`, `|---|---|`];
  for (const [k, v] of Object.entries(summary)) md.push(`| ${k} | ${Object.entries(v).map(([r, n]) => `${r}: ${n}`).join(", ")} |`);
  md.push(``, `## Needs attention`, ``);
  for (const r of results.filter((r) => !["verified", "ok", "numbers-found", "skipped", "words-found"].includes(r.result))) md.push(`- **${r.result}** ${r.kind} · ${r.where} · ${r.text.slice(0, 120).replace(/\|/g, "/")}${r.detail ? ` · ${r.detail}` : ""}${r.url ? ` · ${r.url}` : ""}`);
  writeFileSync(join(outDir, "report.md"), md.join("\n") + "\n");
  console.log(md.slice(0, 20).join("\n"));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) await main();
