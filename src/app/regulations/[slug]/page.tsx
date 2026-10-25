import type { Metadata } from "next";
import { ArrowRight, Calculator, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CitationBadge, ContentStatusBadge, ReviewedBadge } from "@/components/ui/Badge";
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

  const toc = [
    ["summary", "Summary"],
    ...sectionOrder,
    ...(reg.keySubparts ? [["subparts", "Key subparts"] as const] : []),
    ["sources", "Official source"],
    ["related", "Related rules & calculators"],
  ];

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

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">On this page</p>
          <ul className="space-y-1 border-l border-line text-sm">
            {toc.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-muted hover:border-brand-500 hover:text-ink">{label}</a></li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 space-y-6">
          {/* Provenance card */}
          <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-4">
            {[
              ["Citation", reg.citation],
              ["Agency", reg.agency],
              ["Record type", "AirPermitHub summary"],
              ["Last reviewed", lastReviewed ?? "Pending editorial review"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-semibold text-muted uppercase">{k}</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{v}</p>
              </div>
            ))}
          </div>

          <VerifyNotice>
            This page orients you to the program and points to specific provisions. It does not restate thresholds, limits, or deadlines. Verify with the official agency source.
          </VerifyNotice>

          <section id="summary" className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-xl font-bold text-ink">Summary</h2>
            <p className="mt-3 text-slate-700">{reg.summary}</p>
          </section>

          {sectionOrder.map(([key, label]) => (
            <section key={key} id={key} className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="mb-3 text-xl font-bold text-ink">{label}</h2>
              <SectionBody section={reg[key]} />
            </section>
          ))}

          {reg.keySubparts && (
            <section id="subparts" className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-xl font-bold text-ink">Key subparts</h2>
              <p className="mt-1 text-sm text-muted">Subparts commonly reviewed for industrial and oil and gas facilities. Not a complete list.</p>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {reg.keySubparts.map((s) => (
                  <li key={s.code} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-44 shrink-0"><CitationBadge>{s.code}</CitationBadge></span>
                    <span className="text-sm text-slate-700">{s.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="sources" className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-xl font-bold text-ink">Official source</h2>
            <ul className="mt-4 space-y-3">
              {reg.sources.map((s) => (
                <li key={s.url} className="flex flex-col gap-2 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
                      {s.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <p className="text-xs text-muted">{s.agency}{s.citation ? ` · ${s.citation}` : ""}</p>
                  </div>
                  <ReviewedBadge date={s.lastReviewed} />
                </li>
              ))}
            </ul>
          </section>

          <section id="related" className="scroll-mt-24 grid gap-6 rounded-2xl border border-line bg-white p-6 shadow-card md:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold text-ink">Related rules</h2>
              <ul className="mt-3 space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/regulations/${r.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                      {r.shortName}: {r.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Related calculators</h2>
              {calcs.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {calcs.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/calculators/${m.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50">
                        <Calculator className="h-4 w-4 text-brand-500" aria-hidden="true" /> {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-muted">None yet.</p>}
            </div>
          </section>

          <p className="text-xs text-muted">Last updated on AirPermitHub: record created in Phase 1. Version history is tracked in the RegulationVersion table.</p>
          <Disclaimer />
        </article>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
