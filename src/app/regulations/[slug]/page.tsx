import type { Metadata } from "next";
import { ArrowRight, Calculator, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskCta } from "@/components/ask/AskCta";
import { PageHeader } from "@/components/layout/PageHeader";
import { CitationBadge, ContentStatusBadge, ReviewedBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { getMethod } from "@/lib/calc/methods";
import { federalRegulations, getRegulation } from "@/lib/data/regulations";
import type { RegulationSection } from "@/lib/data/types";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return federalRegulations.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = getRegulation((await params).slug);
  if (!r) return {};
  return {
    title: `${r.shortName}: ${r.name} (${r.citation})`,
    description: r.summary,
    alternates: { canonical: `/regulations/${r.slug}` },
  };
}

const sectionOrder = [
  ["applicability", "Applicability"],
  ["requirements", "Requirements"],
  ["monitoring", "Monitoring"],
  ["testing", "Testing"],
  ["recordkeeping", "Recordkeeping"],
  ["reporting", "Reporting"],
  ["definitions", "Definitions"],
] as const;

function SectionBody({ section }: { section: RegulationSection }) {
  return (
    <>
      {section.summary ? (
        <p className="text-slate-700">{section.summary}</p>
      ) : (
        <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">
          AirPermitHub has not summarized this section yet. Refer to the official source.
        </p>
      )}
      {section.pointers && section.pointers.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {section.pointers.map((p) => (
            <li key={p.citation + p.label} className="flex flex-wrap items-center gap-2 text-sm">
              <CitationBadge>{p.citation}</CitationBadge>
              <span className="text-slate-700">{p.label}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function RegulationPage({ params }: { params: Promise<{ slug: string }> }) {
  const reg = getRegulation((await params).slug);
  if (!reg) notFound();

  const related = reg.relatedRules.map(getRegulation).filter((r) => !!r);
  const calcs = reg.relatedCalculators.map(getMethod).filter((m) => !!m);
  const lastReviewed = reg.sources.map((s) => s.lastReviewed).filter(Boolean).sort().at(-1) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: reg.name,
    legislationIdentifier: reg.citation,
    legislationJurisdiction: "US",
    url: `${site.url}/regulations/${reg.slug}`,
    sameAs: reg.sources.map((s) => s.url),
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Regulations", href: "/regulations" }, { label: "Federal", href: "/regulations/federal" }, { label: reg.shortName }]}
        eyebrow={reg.citation}
        title={`${reg.shortName}: ${reg.name}`}
        icon={<FileText className="h-7 w-7" />}
        description={reg.tagline}
      >
        <div className="flex flex-wrap gap-2">
          <ContentStatusBadge status={reg.status} />
          <ReviewedBadge date={lastReviewed} />
        </div>
      </PageHeader>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <Tabs
              variant="underline"
              printAll
              tabs={[
                {
                  label: "Overview",
                  content: (
                    <div className="space-y-5">
                      <p className="text-slate-700">{reg.summary}</p>
                      <dl className="divide-y divide-line rounded-xl border border-line text-sm">
                        {[
                          ["Citation", reg.citation],
                          ["Agency", reg.agency],
                          ["Record type", "AirPermitHub summary"],
                          ["Last reviewed", lastReviewed ?? "Pending editorial review"],
                        ].map(([k, v]) => (
                          <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                            <dt className="font-medium text-muted">{k}</dt>
                            <dd className="text-ink">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <VerifyNotice>
                        This page orients you to the program and points to specific provisions. It does not restate thresholds, limits, or deadlines. Verify with the official agency source.
                      </VerifyNotice>
                    </div>
                  ),
                },
                ...sectionOrder.map(([key, label]) => ({ label, content: <SectionBody section={reg[key]} /> })),
                ...(reg.keySubparts
                  ? [{
                      label: "Key Subparts",
                      count: reg.keySubparts.length,
                      content: (
                        <>
                          <p className="text-sm text-muted">Subparts commonly reviewed for industrial and oil and gas facilities. Not a complete list.</p>
                          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                            {reg.keySubparts.map((sp) => (
                              <li key={sp.code} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                                <span className="w-44 shrink-0"><CitationBadge>{sp.code}</CitationBadge></span>
                                <span className="text-sm text-slate-700">{sp.title}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ),
                    }]
                  : []),
                {
                  label: "Sources",
                  count: reg.sources.length,
                  content: (
                    <ul className="space-y-3">
                      {reg.sources.map((src) => (
                        <li key={src.url} className="flex flex-col gap-2 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
                              {src.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                            <p className="text-xs text-muted">{src.agency}{src.citation ? ` · ${src.citation}` : ""}</p>
                          </div>
                          <ReviewedBadge date={src.lastReviewed} />
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
          </div>
          <p className="text-xs text-muted">Each change to this summary will be dated and listed here once regulation records move to the reviewed database. Until then, rely on the linked eCFR text. New EPA rules and proposals appear in the <Link href="/regulatory-updates" className="font-semibold text-brand-700 hover:underline">Federal Air Rule Tracker</Link>.</p>
          <Disclaimer />
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink">Related resources</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {reg.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-brand-600 hover:underline">
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {src.title}
                  </a>
                </li>
              ))}
              {calcs.map((m) => (
                <li key={m.slug}>
                  <Link href={`/calculators/${m.slug}`} className="flex items-start gap-2 text-brand-600 hover:underline">
                    <Calculator className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {m.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {related.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-bold text-ink">Related regulations</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/regulations/${r.slug}`} className="flex items-start gap-2 text-brand-600 hover:underline">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{r.shortName}: {r.name} <span className="block text-xs text-muted">{r.citation}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Link href="/permit-finder" className={buttonClass("secondary", "md", "w-full")}>Screen a facility <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <AskCta path={`/regulations/${reg.slug}`} />
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
