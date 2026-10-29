import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { glossary } from "./data/glossary";
import { guides } from "./data/guides";
import { federalRegulations } from "./data/regulations";
import { converters } from "./tools/converters";
import { nsrRuleText } from "./tools/nsr";

/**
 * Every outbound source URL built in code (including URLs assembled by helper
 * functions, which a text scan misses). With LINKS_OUT set, writes them to a
 * JSON file that scripts/check-links.mjs adds to its weekly check.
 */
function collect() {
  const out: { url: string; where: string }[] = [];
  for (const g of glossary) for (const c of g.cites) out.push({ url: c.url, where: `glossary: ${g.term}` });
  for (const g of guides) for (const s of g.sources) out.push({ url: s.url, where: `guide: ${g.slug}` });
  for (const r of federalRegulations) for (const s of r.sources) out.push({ url: s.url, where: `regulation: ${r.slug}` });
  for (const c of converters) for (const s of c.sources) out.push({ url: s.url, where: `converter: ${c.slug}` });
  out.push({ url: nsrRuleText.source.url, where: "nsr tool" }, { url: nsrRuleText.current.url, where: "nsr tool" });
  return out;
}

describe("source links built in code", () => {
  const links = collect();
  it("are well-formed absolute URLs", () => {
    expect(links.length).toBeGreaterThan(50);
    for (const l of links) expect(() => new URL(l.url), l.where).not.toThrow();
    for (const l of links) expect(l.url, l.where).toMatch(/^https?:\/\//);
  });
  it.runIf(!!process.env.LINKS_OUT)("export for the link checker", () => {
    writeFileSync(process.env.LINKS_OUT!, JSON.stringify(links, null, 1));
  });
});
