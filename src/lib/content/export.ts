import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { GlossaryCategory, GlossaryTerm } from "@/lib/data/glossary";
import type { Link, LocalAgency, PermitProgram, StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { ContentStatus, Regulation, RegulationSection, SourceRef } from "@/lib/data/types";
import { fromDate, fromEnum } from "./enums";
import type { Content } from "./types";

/** Drops null and undefined fields, so database rows round-trip to the files' shape. */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as T;
}

/** JSON columns hold exactly the shape the import wrote. */
const json = <T>(v: unknown) => v as T;

const published = { where: { status: "PUBLISHED" as const }, take: 1 };

/** The published version of every record, in the shapes the site renders. */
export async function exportContent(db: PrismaClient): Promise<Content> {
  const states = await db.state.findMany({
    orderBy: { name: "asc" },
    include: {
      versions: published,
      agencies: { include: { versions: published } },
      programs: { orderBy: [{ isOilAndGas: "asc" }, { position: "asc" }], include: { versions: published } },
    },
  });

  const profiles = states.flatMap((s): StateAirPermitProfile[] => {
    const v = s.versions[0];
    const a = s.agencies[0]?.versions[0];
    if (!v || !a) return [];
    const programs = s.programs.flatMap((p) => {
      const pv = p.versions[0];
      if (!pv) return [];
      const program: PermitProgram = compact({
        type: fromEnum<PermitProgram["type"]>(p.type), name: pv.name, description: pv.description, citation: pv.citationText, url: pv.url,
        quote: pv.verbatimQuote, quoteSource: json<Link | null>(pv.quoteSource), thresholds: pv.restatedThreshold, thresholdsSource: json<Link | null>(pv.thresholdsSource),
      } as PermitProgram);
      return [{ isOilAndGas: p.isOilAndGas, program }];
    });
    const oilAndGas = programs.filter((x) => x.isOilAndGas).map((x) => x.program);
    return [compact({
      code: s.code, name: s.name, slug: s.slug, epaRegion: s.epaRegion,
      agency: compact({ name: a.name, division: a.division, url: a.url, permitsUrl: a.permitsUrl }) as StateAirPermitProfile["agency"],
      localAgencies: json<LocalAgency[] | null>(v.localAgencies),
      overview: v.overview,
      permitTypes: programs.filter((x) => !x.isOilAndGas).map((x) => x.program),
      oilAndGas: v.oilAndGasSummary !== null || oilAndGas.length ? { summary: v.oilAndGasSummary ?? "", programs: oilAndGas } : null,
      regulations: json<StateAirPermitProfile["regulations"]>(v.regulations),
      forms: json<Link[]>(v.forms), guidance: json<Link[]>(v.guidance),
      ePermitting: json<Link | null>(v.ePermitting), fees: json<Link | null>(v.fees),
      sources: json<Link[]>(v.sources),
      lastReviewed: fromDate(v.lastReviewed),
      verification: fromEnum<StateAirPermitProfile["verification"]>(v.verification),
      notes: v.notes,
    } as StateAirPermitProfile)];
  });

  const regs = await db.regulation.findMany({
    orderBy: { position: "asc" },
    include: { versions: published, relatedFrom: { orderBy: { position: "asc" }, include: { to: { select: { slug: true } } } } },
  });
  const regulations = regs.flatMap((r): Regulation[] => {
    const v = r.versions[0];
    if (!v) return [];
    return [compact({
      slug: r.slug, shortName: r.shortName, name: v.name, citation: r.citation, jurisdiction: fromEnum<Regulation["jurisdiction"]>(r.jurisdiction),
      agency: v.agency, status: fromEnum<ContentStatus>(v.contentStatus), tagline: v.tagline, summary: v.summary,
      applicability: json<RegulationSection>(v.applicability), requirements: json<RegulationSection>(v.requirements), monitoring: json<RegulationSection>(v.monitoring), testing: json<RegulationSection>(v.testing),
      recordkeeping: json<RegulationSection>(v.recordkeeping), reporting: json<RegulationSection>(v.reporting), definitions: json<RegulationSection>(v.definitions),
      keySubparts: json<Regulation["keySubparts"] | null>(v.keySubparts), sources: json<SourceRef[]>(v.sources),
      relatedRules: r.relatedFrom.map((x) => x.to.slug), relatedCalculators: v.relatedCalculators,
    } as Regulation)];
  });

  const terms = await db.glossaryTerm.findMany({ orderBy: { position: "asc" }, include: { versions: published } });
  const glossary = terms.flatMap((t): GlossaryTerm[] => {
    const v = t.versions[0];
    if (!v) return [];
    return [compact({
      slug: t.slug, term: v.term, abbr: v.abbr, category: t.category as GlossaryCategory, definition: v.definition,
      cites: json<GlossaryTerm["cites"]>(v.cites), related: v.related.length ? v.related : null, links: json<GlossaryTerm["links"] | null>(v.links),
    } as GlossaryTerm)];
  });

  return { states: profiles, regulations, glossary };
}

/** Where a database build writes its export; the loaders read it when present. */
export const CONTENT_DIR = ".content";

export function writeContentDir(content: Content, dir = join(process.cwd(), CONTENT_DIR)) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "states"), { recursive: true });
  for (const p of content.states) writeFileSync(join(dir, "states", `${p.code.toLowerCase()}.json`), `${JSON.stringify(p, null, 2)}\n`);
  writeFileSync(join(dir, "regulations.json"), `${JSON.stringify(content.regulations, null, 2)}\n`);
  writeFileSync(join(dir, "glossary.json"), `${JSON.stringify(content.glossary, null, 2)}\n`);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify({ source: "database", exportedAt: new Date().toISOString(), states: content.states.length }, null, 2)}\n`);
}
