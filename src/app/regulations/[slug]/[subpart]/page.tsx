import type { Metadata } from "next";
import { ArrowRight, BookOpen, Calculator, ExternalLink, History, ScrollText, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialSection } from "@/components/rules/OfficialSection";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Notices";
import { getMethod } from "@/lib/calc/methods";
import { getRule, listRules, type LibraryRule } from "@/lib/data/ecfr";
import { getRegulation } from "@/lib/data/regulations";
import { ecfrSectionUrl, programForPart, ruleCategories, ruleCitation, ruleHref, ruleName, ruleSlug, sectionTopics, topicsFor, type RuleCategory } from "@/lib/rules";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return listRules().map((r) => ({ slug: programForPart[r.part], subpart: ruleSlug(r.subpart) }));
}

type Params = { params: Promise<{ slug: string; subpart: string }> };

const titleFor = (r: LibraryRule) => `${ruleName(r)}${r.meta.aka?.length ? ` (${r.meta.aka[0]})` : ""}: ${r.shortHeading}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, subpart } = await params;
  const r = getRule(slug, subpart);
  if (!r) return {};
  return {
    title: titleFor(r),
    description: `Who ${ruleCitation(r)} covers, quoted from eCFR, with every section heading and amendment date. ${r.fullHeading}.`.slice(0, 300),
    alternates: { canonical: ruleHref(r) },
  };
}

/** Calculators and guides that fit each group of rules. Links only; nothing here decides applicability. */
const helpers: Record<RuleCategory, { calcs: string[]; links: { label: string; href: string }[] }> = {
  "oil-gas": { calcs: ["tanks", "fugitives", "pneumatics", "compressors", "flares", "venting"], links: [{ label: "Oil and gas air permitting", href: "/industries/oil-gas" }] },
  engines: { calcs: ["engines"], links: [{ label: "Preparing for a performance test", href: "/resources/preparing-for-a-performance-test" }, { label: "Stack test O2 correction and units", href: "/resources/stack-test-results-o2-correction-and-units" }] },
  turbines: { calcs: [], links: [{ label: "Preparing for a performance test", href: "/resources/preparing-for-a-performance-test" }, { label: "Stack test O2 correction and units", href: "/resources/stack-test-results-o2-correction-and-units" }] },
  boilers: { calcs: ["heaters"], links: [{ label: "Preparing for a performance test", href: "/resources/preparing-for-a-performance-test" }] },
  storage: { calcs: ["tanks"], links: [] },
  gasoline: { calcs: ["tanks"], links: [] },
  refining: { calcs: ["flares", "tanks", "fugitives"], links: [{ label: "Refining air permitting", href: "/industries/refining" }] },
  chemical: { calcs: ["fugitives", "tanks", "flares"], links: [{ label: "Chemical plant air permitting", href: "/industries/chemical" }] },
  power: { calcs: ["heaters", "ghg"], links: [{ label: "Power generation air permitting", href: "/industries/power-generation" }] },
  minerals: { calcs: [], links: [{ label: "Aggregates air permitting", href: "/industries/aggregates" }] },
  landfills: { calcs: [], links: [{ label: "Landfill and waste air permitting", href: "/industries/landfills-waste" }] },
  manufacturing: { calcs: [], links: [{ label: "Manufacturing air permitting", href: "/industries/manufacturing" }] },
  ghg: { calcs: ["ghg"], links: [] },
  general: { calcs: [], links: [{ label: "Compliance matrix builder", href: "/tools/compliance-matrix-builder" }, { label: "Title V deviation log", href: "/tools/deviation-log" }] },
};

export default async function SubpartPage({ params }: Params) {
  const { slug, subpart } = await params;
  const r = getRule(slug, subpart);
  if (!r) notFound();

  const program = getRegulation(slug);
  const categories = [r.meta.category, ...(r.meta.also ?? [])];
  const related = listRules().filter((x) => x !== r && [x.meta.category, ...(x.meta.also ?? [])].some((c) => categories.includes(c)));
  const help = helpers[r.meta.category];
  const calcs = help.calcs.map(getMethod).filter((m) => !!m);
  const sections = r.sections.filter((s) => s.kind === "section");
  const groups: { name: string | null; rows: typeof r.sections }[] = [];
  for (const s of r.sections) {
    const g = groups.at(-1);
    if (g && g.name === s.group) g.rows.push(s);
    else groups.push({ name: s.group, rows: [s] });
  }
  const topicMap = sectionTopics
    .map((t) => ({ ...t, ids: sections.filter((s) => s.id && topicsFor(s.heading).includes(t.key)).map((s) => s.id!) }))
    .filter((t) => t.ids.length > 0);
  const frSearch = `https://www.federalregister.gov/documents/search?conditions%5Bagencies%5D%5B%5D=environmental-protection-agency&conditions%5Bterm%5D=${encodeURIComponent(`"subpart ${r.subpart}" "part ${r.part}"`)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: r.fullHeading,
    alternateName: [ruleName(r), ...(r.meta.aka ?? [])],
    legislationIdentifier: ruleCitation(r),
    legislationJurisdiction: "US",
    legislationType: "Regulation",
    url: `${site.url}${ruleHref(r)}`,
    sameAs: r.url,
    legislationDateVersion: r.ecfrDate,
  };

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Regulations", href: "/regulations" },
          { label: "Rule Library", href: "/regulations/library" },
          ...(program ? [{ label: program.shortName, href: `/regulations/${program.slug}` }] : []),
          { label: `Subpart ${r.subpart}` },
        ]}
        eyebrow={ruleCitation(r)}
        title={titleFor(r)}
        icon={<ScrollText className="h-7 w-7" />}
        description={r.fullHeading}
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="green" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Rule text from eCFR</Badge>
          {r.latestAmendment && <Badge tone="gray" icon={<History className="h-3.5 w-3.5" />}>Last amended in eCFR {r.latestAmendment}</Badge>}
        </div>
      </PageHeader>

      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="src-h">
            <h2 id="src-h" className="text-lg font-bold text-ink">Where this text comes from</h2>
            <dl className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
              {[
                ["Citation", ruleCitation(r)],
                ["Official title", r.fullHeading],
                ["Text as of", `eCFR current through ${r.ecfrDate}, retrieved ${r.retrievedOn}`],
                ["Latest amendment", r.latestAmendment ?? "Not listed by eCFR"],
                ...(r.source ? [["Source note", r.source]] : []),
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="font-medium text-muted">{k}</dt>
                  <dd className="text-ink [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-slate-700">
              Headings and quoted sections on this page are copied from the{" "}
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">eCFR text of Subpart {r.subpart}</a>{" "}
              without changes. AirPermitHub checks eCFR every week and reviews any change before publishing it, so this page can trail eCFR by a few days. eCFR is
              maintained by the Office of the Federal Register and the Government Publishing Office. It is not an official legal edition of the CFR, and it does not
              show how an agency has applied the rule in a permit.
            </p>
          </section>

          {topicMap.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="map-h">
              <h2 id="map-h" className="text-lg font-bold text-ink">Where to look in Subpart {r.subpart}</h2>
              <p className="mt-1 text-sm text-muted">Sections sorted by the words in their eCFR headings. Read the full section before relying on it; requirements often sit in more than one place.</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {topicMap.map((t) => (
                  <div key={t.key} className="rounded-xl border border-line px-4 py-3">
                    <dt className="text-sm font-semibold text-ink">{t.label}</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.ids.map((id) => (
                        <a key={id} href={`#sec-${id}`} className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700 hover:bg-brand-100">§ {id}</a>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {r.quotes.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="who-h">
              <h2 id="who-h" className="text-lg font-bold text-ink">Who the subpart covers, in the rule&apos;s own words</h2>
              <p className="mt-1 text-sm text-muted">The sections that set out what the subpart applies to, quoted in full from eCFR. Dates, sizes, and other figures are the rule&apos;s, not AirPermitHub&apos;s.</p>
              <div className="mt-4 space-y-4">
                {r.quotes.map((q) => <OfficialSection key={q.id} q={q} />)}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="toc-h">
            <h2 id="toc-h" className="text-lg font-bold text-ink">Every section in Subpart {r.subpart}</h2>
            <p className="mt-1 text-sm text-muted">{sections.length} sections{r.sections.some((s) => s.kind === "table") ? ` and ${r.sections.filter((s) => s.kind === "table").length} tables` : ""}, in eCFR order. Each link opens the official text.</p>
            <div className="mt-4 space-y-5">
              {groups.map((g, gi) => (
                <div key={`${g.name}-${gi}`}>
                  {g.name && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.name}</h3>}
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {g.rows.map((s, i) => (
                      <li key={`${s.id ?? s.heading}-${i}`} id={s.id ? `sec-${s.id}` : undefined} className="grid scroll-mt-24 gap-1 px-4 py-2.5 text-sm target:bg-amber-50 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-3">
                        {s.kind === "table" ? (
                          <>
                            <span className="font-mono text-xs font-semibold text-muted sm:pt-0.5">Table</span>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:text-brand-700 hover:underline [overflow-wrap:anywhere]">{s.heading}</a>
                            <span className="whitespace-nowrap text-xs text-muted sm:text-right">See eCFR</span>
                          </>
                        ) : (
                          <>
                            <a href={ecfrSectionUrl(s.id!)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-semibold text-brand-700 hover:underline sm:pt-0.5">§ {s.id}</a>
                            <span className={s.kind === "reserved" ? "text-muted" : "text-slate-800"}>{s.heading}</span>
                            <span className="whitespace-nowrap text-xs text-muted sm:text-right">{s.lastAmended ? `Amended ${s.lastAmended}` : ""}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-lg font-bold text-ink">Amendment history</h2>
            {r.amendmentDates.length > 0 ? (
              <>
                <p className="mt-1 text-sm text-muted">Dates on which eCFR records a change to any section of Subpart {r.subpart}, newest first.</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {r.amendmentDates.map((d) => <li key={d} className="rounded-md bg-canvas px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-line">{d}</li>)}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">eCFR did not list amendment dates for this subpart when it was retrieved.</p>
            )}
            <p className="mt-4 text-sm text-slate-700">
              To read the rulemakings behind these dates, search the{" "}
              <a href={frSearch} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">Federal Register for Subpart {r.subpart}</a>. New EPA air rules and proposals also appear in the{" "}
              <Link href="/regulatory-updates" className="font-semibold text-brand-700 hover:underline">Federal Air Rule Tracker</Link>.
            </p>
          </section>

          <Disclaimer />
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {r.meta.aka && r.meta.aka.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-bold text-ink">Also called</h2>
              <p className="mt-2 text-sm text-slate-700">{r.meta.aka.join(", ")}</p>
            </section>
          )}
          {(calcs.length > 0 || help.links.length > 0) && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-bold text-ink">Tools for this work</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {calcs.map((m) => (
                  <li key={m.slug}><Link href={`/calculators/${m.slug}`} className="flex items-start gap-2 text-brand-700 hover:underline"><Calculator className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{m.title}</Link></li>
                ))}
                {help.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="flex items-start gap-2 text-brand-700 hover:underline"><Wrench className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{l.label}</Link></li>
                ))}
              </ul>
            </section>
          )}
          {related.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-bold text-ink">Related subparts</h2>
              <p className="mt-1 text-xs text-muted">{categories.map((c) => ruleCategories.find((x) => x.key === c)?.label).join(" · ")}</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                {related.map((x) => (
                  <li key={ruleHref(x)}>
                    <Link href={ruleHref(x)} className="group block">
                      <span className="font-semibold text-brand-700 group-hover:underline">{ruleName(x)}</span>
                      <span className="block text-xs text-muted">{x.shortHeading}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="rounded-2xl bg-navy-900 p-5 text-white">
            <BookOpen className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">Program overview</p>
            {program && <Link href={`/regulations/${program.slug}`} className="mt-1 flex items-center gap-1.5 text-sm text-white/80 hover:text-white">{program.shortName}: {program.name} <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></Link>}
            <Link href="/regulations/library" className="mt-1 flex items-center gap-1.5 text-sm text-white/80 hover:text-white">All subparts in the rule library <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></Link>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 text-sm text-white/80 hover:text-white">Subpart {r.subpart} in eCFR <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a>
          </div>
          <Link href="/permit-finder" className={buttonClass("secondary", "md", "w-full")}>Screen a facility <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
