import type { Metadata } from "next";
import { ArrowRight, FileSpreadsheet, Lock, Quote, ScrollText, Sigma } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { JsonLd } from "@/components/ui/JsonLd";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { toolIcons } from "@/components/tools/ToolIcon";
import { site } from "@/lib/site";
import { AIR_BASE, airCalcs } from "@/lib/utilities";
import { AIR_WORKBOOK_PATH } from "@/lib/utilities/workbook-layout";

const count = airCalcs.reduce((a, u) => a + u.sections.length, 0);
const quotes = new Set(airCalcs.flatMap((u) => u.sections.flatMap((s) => (s.quotes ?? []).map((q) => q.text)))).size;

export const metadata: Metadata = {
  title: "Air Permit Engineering Calculators: BACT $/ton, Flare 40 CFR 60.18 Check, EPA Method 19",
  description: `${count} air permit engineering calculations with every step shown and ${quotes} passages of rule and EPA guidance quoted word for word: BACT capital recovery and cost-effectiveness ($/ton, incremental), flare net heating value and exit velocity under 40 CFR 60.18 and 63.11, and EPA Method 19 F factors and lb/MMBtu emission rates. Excel import and export.`,
  alternates: { canonical: AIR_BASE },
};

export default function AirEngineeringHub() {
  const Icon = toolIcons.airtools;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AirPermitHub air permit engineering calculators",
    itemListElement: airCalcs.map((u, i) => ({ "@type": "ListItem", position: i + 1, name: u.name, url: `${site.url}${AIR_BASE}/${u.slug}` })),
  };
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools", href: "/tools" }, { label: "Air Permit Engineering" }]}
        eyebrow="Practitioner tools"
        title="Air Permit Engineering Calculators"
        icon={<Icon />}
        scene="refinery"
        description="The calculations behind a BACT analysis, a flare compliance demonstration, and a stack test report. Type your numbers in the boxes; the rule or EPA guidance each step relies on is quoted word for word beside it."
      />
      <div className="container-page space-y-12 py-12">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {airCalcs.map((u) => (
            <li key={u.slug}>
              <Link href={`${AIR_BASE}/${u.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                <p className="flex gap-2 text-sm font-medium text-slate-600 italic"><Quote className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />{u.problem}</p>
                <span className="mt-4 text-lg font-bold text-navy-900 group-hover:text-brand-700">{u.name}</span>
                <ul className="mt-2 flex-1 space-y-1 text-sm text-muted">
                  {u.sections.map((s) => <li key={s.id} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{s.title}</li>)}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="grid gap-6 rounded-3xl bg-navy-900 p-6 text-white sm:p-10 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="wb-heading">
          <div>
            <FileSpreadsheet className="h-7 w-7 text-gold-200" aria-hidden="true" />
            <h2 id="wb-heading" className="mt-3 text-2xl font-bold">All {count} calculations as one locked Excel workbook</h2>
            <p className="mt-2 text-white/80">Yellow boxes are the only cells you can type in; every formula is locked. Export from any calculator to get the workbook filled with your numbers for a permit application appendix, or import a filled workbook to recheck it.</p>
            <a href={AIR_WORKBOOK_PATH} download className="mt-5 inline-flex h-11 items-center gap-2 rounded-sm bg-white px-5 text-sm font-semibold text-navy-900 hover:bg-gold-200">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Download the workbook (.xlsx)
            </a>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            {[
              { icon: ScrollText, t: "Each limit, equation, and constant is quoted from eCFR or the EPA document it comes from, and checked against the source every month." },
              { icon: Sigma, t: "Every result shows its formula with your numbers substituted." },
              { icon: Lock, t: "Nothing regulatory is assumed: interest rate, F factors, and emission values are yours to enter." },
            ].map(({ icon: I, t }) => <li key={t} className="flex gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-gold-200" aria-hidden="true" />{t}</li>)}
          </ul>
        </section>
        <p className="text-sm text-muted">
          Need a quick unit change instead? The <Link href="/tools#converters" className="font-semibold text-brand-700 hover:underline">stack test and unit converters</Link> cover ppm to lb/hr, O₂ correction, and lb/MMBtu to tons per year.
        </p>
        <ShareLinks path={AIR_BASE} title="Air Permit Engineering Calculators" />
        <Disclaimer />
      </div>
      <JsonLd data={jsonLd} />
    </>
  );
}
