import type { Metadata } from "next";
import { ArrowRight, Landmark, MapPinned } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegulationCard } from "@/components/regulations/RegulationCard";
import { Badge, VerificationBadge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { federalRegulations, regulationCategories } from "@/lib/data/regulations";
import { listStateProfiles } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Air Regulations Library: NSPS, NESHAP, Title V, NSR, PSD",
  description: "A source-linked library of federal and state air regulations, with citations, applicability pointers, and last-reviewed dates.",
  alternates: { canonical: "/regulations" },
};

export default function RegulationsPage() {
  const states = listStateProfiles();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Regulations" }]}
        eyebrow="Regulations library"
        title="Air Regulations & Guidance"
        icon={<Landmark className="h-7 w-7" />}
        description="Plain-language orientation to federal and state air programs, always linked to the official text. Each record shows its status, citation, and review date."
      >
        <ul className="flex flex-wrap gap-2">
          {["Federal EPA", ...states.map((s) => s.name), "Other States"].map((c) => (
            <li key={c}><span className="glass-dark inline-block rounded-full px-3 py-1 text-sm text-white/85">{c}</span></li>
          ))}
        </ul>
      </PageHeader>
      <div className="container-page space-y-14 py-12">
        <section aria-labelledby="fed">
          <SectionHeading id="fed" eyebrow="Federal EPA" title="Federal programs" action={{ label: "Federal overview", href: "/regulations/federal" }} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {federalRegulations.map((r) => <li key={r.slug}><RegulationCard reg={r} /></li>)}
            <li>
              <Link href="/resources?category=federal-regulations" className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-line bg-white/60 p-5 hover:border-brand-200">
                <div>
                  <span className="font-display text-2xl font-extrabold text-slate-400">Guidance</span>
                  <h3 className="mt-1 font-semibold text-ink">Regulatory Guidance</h3>
                  <p className="mt-1.5 text-sm text-muted">EPA guidance and applicability determinations index.</p>
                </div>
                <Badge tone="gray" className="mt-4 self-start">In development</Badge>
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="st">
          <SectionHeading id="st" eyebrow="State programs" title="State regulatory hubs" action={{ label: "All 50 states", href: "/states" }} />
          <ul className="grid gap-4 md:grid-cols-2">
            {states.map((s) => (
              <li key={s.slug}>
                <Link href={`/states/${s.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card hover:border-brand-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-ink"><MapPinned className="h-5 w-5 text-brand-500" aria-hidden="true" /> {s.name}</h3>
                    <VerificationBadge level={s.verification} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-navy-700">{s.agency.name}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {s.regulations.slice(0, 6).map((r) => (
                      <li key={r.citation} className="rounded-md bg-canvas px-2 py-1 font-mono text-xs text-navy-800 ring-1 ring-line">{r.citation}</li>
                    ))}
                  </ul>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Open hub <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cats">
          <SectionHeading id="cats" title="Browse by category" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regulationCategories.map((c) => (
              <li key={c.title}>
                <Link href={c.href} className="block h-full rounded-xl border border-line bg-white p-4 hover:border-brand-200 hover:bg-brand-50/50">
                  <span className="font-semibold text-ink">{c.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{c.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
