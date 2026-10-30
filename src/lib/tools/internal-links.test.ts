import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { glossary } from "../data/glossary";
import { guides } from "../data/guides";
import { federalRegulations } from "../data/regulations";
import { listRules } from "../data/ecfr";
import { ruleHref } from "../rules";
import { allToolPages, coreTools } from "./catalog";
import { converters } from "./converters";

const appDir = join(__dirname, "..", "..", "app");

/** Static routes: every folder under src/app with a page.tsx and no dynamic segment. */
function staticRoutes(dir = appDir, base = ""): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (!statSync(p).isDirectory()) continue;
    if (f.startsWith("[") || f.startsWith("(") || f === "api") continue;
    const route = `${base}/${f}`;
    if (readdirSync(p).includes("page.tsx")) out.push(route);
    out.push(...staticRoutes(p, route));
  }
  return out;
}

const known = new Set([
  "/",
  ...staticRoutes(),
  ...guides.map((g) => `/resources/${g.slug}`),
  ...converters.map((c) => `/tools/${c.slug}`),
  ...federalRegulations.map((r) => `/regulations/${r.slug}`),
  ...listRules().map(ruleHref),
  "/states/texas",
]);
const terms = new Set(glossary.map((g) => g.slug));

function check(href: string, where: string) {
  const [path, hash] = href.split("#");
  const clean = path.split("?")[0] || "/";
  expect(known.has(clean), `${where}: ${href}`).toBe(true);
  if (clean === "/glossary" && hash) expect(terms.has(hash), `${where}: ${href}`).toBe(true);
}

describe("internal links from tools, guides, and the glossary", () => {
  it("point to pages that exist", () => {
    for (const g of guides) for (const r of g.related) if (r.href.startsWith("/") && !r.href.startsWith("/api/")) check(r.href, `guide ${g.slug}`);
    for (const t of glossary) for (const l of t.links ?? []) check(l.href, `glossary ${t.slug}`);
    for (const t of [...coreTools, ...allToolPages]) check(t.href, `tool ${t.slug}`);
  });
  it("in tool page files point to pages that exist", () => {
    const files = readdirSync(join(appDir, "tools"), { recursive: true }).map(String).filter((f) => f.endsWith("page.tsx"));
    for (const f of files) {
      const text = readFileSync(join(appDir, "tools", f), "utf8");
      for (const m of text.matchAll(/href: "(\/[^"]*)"/g)) check(m[1], `src/app/tools/${f}`);
    }
  });
  it("glossary entries are unique, cited, and cross-referenced correctly", () => {
    expect(terms.size).toBe(glossary.length);
    for (const t of glossary) {
      expect(t.cites.length, t.slug).toBeGreaterThan(0);
      for (const c of t.cites) expect(c.url, t.slug).toMatch(/^https:\/\/(www\.ecfr\.gov|www\.govinfo\.gov|texreg\.sos\.state\.tx\.us)\//);
      for (const r of t.related ?? []) expect(terms.has(r), `${t.slug} -> ${r}`).toBe(true);
      expect(t.definition, t.slug).not.toMatch(/\d+\s*(tpy|tons per year|ppm|percent|%)/i);
    }
  });
});
