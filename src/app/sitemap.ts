import type { MetadataRoute } from "next";
import { calculatorMethods } from "@/lib/calc/methods";
import { guides } from "@/lib/data/guides";
import { industries } from "@/lib/data/industries";
import { federalRegulations } from "@/lib/data/regulations";
import { listRules } from "@/lib/data/ecfr";
import { ruleHref } from "@/lib/rules";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { site } from "@/lib/site";
import { allToolPages } from "@/lib/tools/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/", "/permit-finder", "/calculators", "/applicability", "/regulations", "/regulations/federal", "/states", "/permits",
    "/compliance", "/industries", "/jobs", "/resources", "/templates", "/about", "/verification", "/disclaimer", "/tools",
    "/glossary", "/regulatory-updates", "/contact", "/privacy", "/terms",
    ...allToolPages.map((t) => t.href),
    ...calculatorMethods.map((m) => `/calculators/${m.slug}`),
    ...federalRegulations.map((r) => `/regulations/${r.slug}`),
    "/regulations/library",
    ...listRules().map(ruleHref),
    ...listStateProfiles().map((s) => `/states/${s.slug}`),
    ...industries.map((i) => `/industries/${i.slug}`),
    ...guides.map((g) => `/resources/${g.slug}`),
  ];
  // lastmod only where we know when the content was last checked (state hubs); a guessed date would mislead crawlers.
  const reviewed = new Map(listStateProfiles().map((s) => [`/states/${s.slug}`, s.lastReviewed]));
  return [...new Set(paths)].map((p) => {
    const last = reviewed.get(p);
    return {
      url: `${site.url}${p === "/" ? "" : p}`,
      ...(last && !Number.isNaN(Date.parse(last)) ? { lastModified: last } : {}),
      changeFrequency: "weekly",
      priority: p === "/" ? 1 : 0.7,
    };
  });
}
