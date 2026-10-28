import type { MetadataRoute } from "next";
import { calculatorMethods } from "@/lib/calc/methods";
import { guides } from "@/lib/data/guides";
import { industries } from "@/lib/data/industries";
import { federalRegulations } from "@/lib/data/regulations";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/", "/permit-finder", "/calculators", "/applicability", "/regulations", "/regulations/federal", "/states", "/permits",
    "/compliance", "/industries", "/jobs", "/resources", "/templates", "/about", "/disclaimer",
    ...calculatorMethods.map((m) => `/calculators/${m.slug}`),
    ...federalRegulations.map((r) => `/regulations/${r.slug}`),
    ...listStateProfiles().map((s) => `/states/${s.slug}`),
    ...industries.map((i) => `/industries/${i.slug}`),
    ...guides.map((g) => `/resources/${g.slug}`),
  ];
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}
