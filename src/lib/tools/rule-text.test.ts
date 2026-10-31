import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { guides } from "../data/guides";
import { ruleGuides } from "../data/rule-guides";
import { RT, ecfrHref, psdSignificance, quoteHref } from "./rule-text";

const alnum = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Section text from the weekly eCFR snapshot (data/ecfr), by section number. */
const snapshot = new Map<string, string>();
const DIR = join(process.cwd(), "data", "ecfr");
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "config.json")) {
  const d = JSON.parse(readFileSync(join(DIR, f), "utf8")) as { quotes: { id: string; paragraphs: string[] }[] };
  for (const q of d.quotes) snapshot.set(q.id, q.paragraphs.join(" "));
}

const sectionOf = (cite: string) => cite.match(/40 CFR (\d+\.\d+[a-zA-Z]*)/)?.[1];

describe("tool rule text", () => {
  it("links every quote to its source", () => {
    for (const [k, x] of Object.entries(RT)) {
      const href = quoteHref(x);
      expect(href, k).toBeTruthy();
      expect(() => new URL(href!), k).not.toThrow();
      if (!x.url) expect(sectionOf(x.cite), k).toBeTruthy();
    }
  });

  it("matches the eCFR snapshot word for word where the snapshot has the section", () => {
    let checked = 0;
    for (const [k, x] of Object.entries(RT)) {
      const sec = sectionOf(x.cite);
      const text = sec && !x.url ? snapshot.get(sec) : undefined;
      if (!text) continue;
      checked++;
      expect(alnum(text).includes(alnum(x.text)), `${k} (${x.cite})`).toBe(true);
    }
    expect(checked).toBeGreaterThan(60);
  });

  it("anchors eCFR links to the cited paragraph", () => {
    expect(ecfrHref("40 CFR 60.4200(a)(2)(i)")).toBe("https://www.ecfr.gov/current/title-40/section-60.4200#p-60.4200(a)(2)(i)");
    expect(ecfrHref("40 CFR 60.5365a(e)")).toBe("https://www.ecfr.gov/current/title-40/section-60.5365a#p-60.5365a(e)");
    expect(ecfrHref("EPA guidance")).toBeNull();
  });

  it("states each PSD significance rate in its own row of the quote", () => {
    for (const r of psdSignificance) expect(r.row, r.pollutant).toContain(String(r.tpy));
  });
});

describe("guide quotes", () => {
  it("come from this file, so the snapshot test and the monthly source check cover them", () => {
    const known = new Set(Object.values(RT).map((x) => `${x.cite}|${x.text}`));
    let n = 0;
    for (const g of guides) for (const s of g.sections) for (const x of s.quotes ?? []) {
      n++;
      expect(known.has(`${x.cite}|${x.text}`), `${g.slug}: ${x.cite}`).toBe(true);
    }
    expect(n).toBeGreaterThan(40);
  });

  it("leave numbers to the quotes: the rule guides' own words state no thresholds, dates, or limits", () => {
    const allowed = [/40 CFR \d+\.\d+[a-zA-Z]*(\([0-9a-zA-Z]+\))*/g, /AP-42( Section \d+\.\d+)?/g, /Section \d+\.\d+/g, /EPA's (1989|1995)/g, /Rolling 12-Month Limit Tracker/g, /Part \d+/g];
    for (const g of ruleGuides) {
      for (const t of [g.summary, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])]) {
        const rest = allowed.reduce((acc, re) => acc.replace(re, ""), t);
        expect(rest, `${g.slug}: ${t.slice(0, 60)}`).not.toMatch(/\d/);
      }
    }
  });
});
