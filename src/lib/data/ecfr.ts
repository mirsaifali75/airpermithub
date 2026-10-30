import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getRuleMeta, ruleMeta, ruleSlug, programForPart, shortHeading, type EcfrSubpart, type RuleMeta } from "@/lib/rules";

/**
 * Server-only loader for the eCFR snapshot in /data/ecfr. Files are written by
 * scripts/sync-ecfr.mjs; nothing here edits the official text.
 */

const DIR = join(process.cwd(), "data", "ecfr");

export type LibraryRule = EcfrSubpart & { meta: RuleMeta; shortHeading: string };

let cache: LibraryRule[] | null = null;

export function listRules(): LibraryRule[] {
  if (cache) return cache;
  const out: LibraryRule[] = [];
  if (existsSync(DIR)) {
    for (const file of readdirSync(DIR).filter((f) => /^40-cfr-\d+-subpart-.+\.json$/.test(f))) {
      const rule = JSON.parse(readFileSync(join(DIR, file), "utf8")) as EcfrSubpart;
      const meta = getRuleMeta(rule.part, rule.subpart);
      if (meta) out.push({ ...rule, meta, shortHeading: shortHeading(rule.heading) });
    }
  }
  const order = (r: LibraryRule) => ruleMeta.findIndex((m) => m === r.meta);
  cache = out.sort((a, b) => order(a) - order(b));
  return cache;
}

export function getRule(program: string, slug: string) {
  return listRules().find((r) => programForPart[r.part] === program && ruleSlug(r.subpart) === slug);
}

/** Small summary for search and listings, safe to send to the browser. */
export function ruleSummaries() {
  return listRules().map((r) => ({ part: r.part, subpart: r.subpart, heading: r.heading, shortHeading: r.shortHeading, aka: r.meta.aka ?? [], category: r.meta.category, also: r.meta.also ?? [], latestAmendment: r.latestAmendment }));
}
export type RuleSummary = ReturnType<typeof ruleSummaries>[number];
