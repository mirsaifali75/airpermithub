import type { Metadata } from "next";
import { ArrowRight, Eye, Lock, Quote, Wrench } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { toolIcons } from "@/components/tools/ToolIcon";
import { Disclaimer } from "@/components/ui/Notices";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { practitionerGuides } from "@/lib/data/practitioner-guides";
import { site } from "@/lib/site";
import { converterTools, coreTools } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Air Permitting Tools: Rolling Limits, NSR Baselines, Compliance Matrix & Converters",
  description: "Free tools for the problems air permitting professionals hit every week: 12-month rolling limits, NSR baselines, permit compliance matrices, deviation logs, stack test converters, and EPA rule tracking.",
  alternates: { canonical: "/tools" },
};

const more = [
  { name: "Permit Finder", href: "/permit-finder", body: "Screen which permitting programs deserve a closer look for a facility or project.", icon: toolIcons.finder },
  { name: "Emission Calculators", href: "/calculators", body: "Engines, heaters, flares, tanks, and fugitives with every step and factor source shown.", icon: toolIcons.calc },
];

export default function ToolsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AirPermitHub practitioner tools",
    itemListElement: [...coreTools.filter((t) => t.slug !== "converters"), ...converterTools].map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${site.url}${t.href}` })),
  };
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools" }]}
        eyebrow="Practitioner tools"
        title="Tools for the Problems You Hit Every Week"
        icon={<Wrench />}
        scene="refinery"
        description="Rolling limits that sneak up on you, baseline periods for NSR, 150-page permits to track, deviations to report, and test results in the wrong units. Each tool shows its math and points to the rule text."
      />
      <div className="container-page space-y-16 py-12">
        <section aria-labelledby="problems-heading">
          <h2 id="problems-heading" className="text-2xl font-bold text-ink sm:text-3xl">Start from the problem</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coreTools.map((t) => {
              const Icon = toolIcons[t.icon];
              return (
                <li key={t.slug}>
                  <Link href={t.href} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                    <p className="flex gap-2 text-sm font-medium text-slate-600 italic"><Quote className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />{t.problem}</p>
                    <span className="mt-5 flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-[0_8px_18px_-8px_rgb(20_125_255/0.8)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="text-lg font-bold text-navy-900 group-hover:text-brand-700">{t.name}</span>
                    </span>
                    <span className="mt-2 flex-1 text-sm text-muted">{t.description}</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="converters" aria-labelledby="conv-heading" className="scroll-mt-24">
          <h2 id="conv-heading" className="text-2xl font-bold text-ink sm:text-3xl">Stack test and unit converters</h2>
          <p className="mt-2 max-w-2xl text-muted">The conversions you do between a test report, a CEMS printout, and a permit limit. Every step is shown, and nothing regulatory is prefilled.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {converterTools.map((t) => (
              <li key={t.slug}>
                <Link href={t.href} className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 shadow-card hover:border-brand-200">
                  <span className="font-bold text-navy-900 group-hover:text-brand-700">{t.name}</span>
                  <span className="mt-1 line-clamp-3 text-xs text-muted">{t.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="principles-heading" className="rounded-3xl bg-navy-900 p-6 text-white sm:p-10">
          <h2 id="principles-heading" className="text-2xl font-bold">How these tools are built</h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { icon: Eye, title: "The math is on the page", body: "Every result lists its formula and each intermediate step, so you can check it by hand or hand it to a reviewer." },
              { icon: Quote, title: "Rule text, not paraphrase", body: "Where a tool follows a regulation, the governing words are quoted from a government source with the citation. You enter the regulatory values from the rule that applies to you." },
              { icon: Lock, title: "Your data stays with you", body: "Entries are kept in your browser, not sent to AirPermitHub. Export to CSV to keep a record or share it with your team." },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon className="h-6 w-6 text-cyan-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-white/75">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="guides-heading">
          <h2 id="guides-heading" className="text-2xl font-bold text-ink sm:text-3xl">Guides for the hard parts</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {practitionerGuides.map((g) => (
              <li key={g.slug}>
                <Link href={`/resources/${g.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
                  <span className="text-xs font-semibold text-brand-600">{g.category} · {g.readMinutes} min read</span>
                  <span className="mt-1.5 font-bold text-navy-900 group-hover:text-brand-700">{g.title}</span>
                  <span className="mt-1.5 line-clamp-3 text-sm text-muted">{g.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="more-heading">
          <h2 id="more-heading" className="text-xl font-bold text-ink">Also on AirPermitHub</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {more.map(({ name, href, body, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span><span className="block font-bold text-navy-900 group-hover:text-brand-700">{name}</span><span className="mt-1 block text-sm text-muted">{body}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ShareLinks path="/tools" title="Air permitting tools on AirPermitHub" />
        <Disclaimer />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
