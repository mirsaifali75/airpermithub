import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listRules } from "./data/ecfr";
import { federalRegulations } from "./data/regulations";
import { metaForCode, paragraphLevels, programForPart, ruleHref, ruleMeta, shortHeading, topicsFor } from "./rules";

const config = JSON.parse(readFileSync(join(process.cwd(), "data", "ecfr", "config.json"), "utf8")) as { subparts: { part: number; subpart: string }[] };

describe("federal rule library", () => {
  const rules = listRules();

  it("has an eCFR snapshot and library entry for every configured subpart", () => {
    expect(rules.length).toBe(config.subparts.length);
    expect(ruleMeta.length).toBe(config.subparts.length);
    for (const c of config.subparts) expect(rules.some((r) => r.part === c.part && r.subpart === c.subpart), `${c.part} ${c.subpart}`).toBe(true);
    expect(new Set(rules.map(ruleHref)).size).toBe(rules.length);
  });

  it("only holds text that came from eCFR", () => {
    for (const r of rules) {
      const id = `${r.part} ${r.subpart}`;
      expect(r.url, id).toBe(`https://www.ecfr.gov/current/title-40/part-${r.part}/subpart-${r.subpart}`);
      expect(r.fullHeading.startsWith(`Subpart ${r.subpart}`), id).toBe(true);
      expect(r.hash, id).toMatch(/^[0-9a-f]{64}$/);
      expect(r.ecfrDate, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.sections.filter((s) => s.kind === "section").length, id).toBeGreaterThan(0);
      expect(r.quotes.length, id).toBeGreaterThan(0);
      for (const q of r.quotes) {
        expect(r.sections.some((s) => s.id === q.id), `${id} ${q.id}`).toBe(true);
        expect(q.paragraphs.length, `${id} ${q.id}`).toBeGreaterThan(0);
        for (const p of q.paragraphs) expect(p, `${id} ${q.id}`).not.toMatch(/<\/?[A-Z]+[ >]|&[a-z]+;/);
      }
    }
  });

  it("links each program's key subparts to library pages", () => {
    for (const reg of federalRegulations) {
      for (const sp of reg.keySubparts ?? []) {
        const part = Number(Object.entries(programForPart).find(([, slug]) => slug === reg.slug)?.[0]);
        expect(metaForCode(part, sp.code), `${reg.slug} ${sp.code}`).toBeDefined();
      }
    }
  });
});

describe("rule helpers", () => {
  it("shortens eCFR headings", () => {
    expect(shortHeading("Standards of Performance for Stationary Spark Ignition Internal Combustion Engines")).toBe("Stationary Spark Ignition Internal Combustion Engines");
    expect(shortHeading("National Emission Standards for Hazardous Air Pollutants From Oil and Natural Gas Production Facilities")).toBe("Oil and Natural Gas Production Facilities");
    expect(shortHeading("National Emission Standards for Hazardous Air Pollutants: Organic Liquids Distribution (Non-Gasoline)")).toBe("Organic Liquids Distribution (Non-Gasoline)");
    expect(shortHeading("General Provision")).toBe("General Provisions");
  });

  it("sorts section headings by their words", () => {
    expect(topicsFor("Am I subject to this subpart?")).toContain("applicability");
    expect(topicsFor("What are my notification, reporting, and recordkeeping requirements if I am an owner or operator?")).toContain("records");
    expect(topicsFor("What definitions apply to this subpart?")).toEqual(["definitions"]);
  });

  it("indents paragraphs by their markers", () => {
    expect(paragraphLevels(["(a) Lead-in:", "(1) One", "(i) Roman", "(ii) Roman", "(A) Upper", "(2) Two", "(b) Next"])).toEqual([0, 1, 2, 2, 3, 1, 0]);
    expect(paragraphLevels(["(g) G", "(h) H", "(1) One", "(2) Two.", "(i) The letter i", "(j) J"])).toEqual([0, 0, 1, 1, 0, 0]);
    expect(paragraphLevels(["(h) H", "(1) Applies when:", "(i) Roman one", "(ii) Roman two"])).toEqual([0, 1, 2, 2]);
  });
});
