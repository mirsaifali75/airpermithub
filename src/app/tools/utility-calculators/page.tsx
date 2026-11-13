import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { ArrowRight, FileSearch, FileSpreadsheet, Quote, Sigma } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { JsonLd } from "@/components/ui/JsonLd";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { toolIcons } from "@/components/tools/ToolIcon";
import { site } from "@/lib/site";
import { UTIL_BASE, utilities } from "@/lib/utilities";
import { WORKBOOK_PATH } from "@/lib/utilities/workbook-layout";

export const metadata: Metadata = withSocial({
  title: "Plant Utility Calculators: Steam, Cooling Water, Chilled Water, Compressed Air, Nitrogen",
  description: "Utility calculations for process plants with every formula and step shown: steam tables (IAPWS-IF97), boiler fuel, flash steam, cooling water and towers, chilled water, water balance and pumps, compressed air, nitrogen purging, and hot oil. Worked examples, metric and US units, Excel import and export.",
  alternates: { canonical: UTIL_BASE },
});

export default function UtilityHub() {
  const Icon = toolIcons.utility;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AirPermitHub plant utility calculators",
    itemListElement: utilities.map((u, i) => ({ "@type": "ListItem", position: i + 1, name: u.name, url: `${site.url}${UTIL_BASE}/${u.slug}` })),
  };
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools", href: "/tools" }, { label: "Plant Utility Calculators" }]}
        eyebrow="Practitioner tools"
        title="Plant Utility Calculators"
        icon={<Icon />}
        scene="refinery"
        description="Steam, cooling water, chilled water, process water, compressed air, nitrogen, and hot oil. Each calculation shows its formulas and every step, solves for whichever value you leave blank, and works in metric or US units."
      />
      <div className="container-page space-y-12 py-12">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {utilities.map((u) => (
            <li key={u.slug}>
              <Link href={`${UTIL_BASE}/${u.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                <p className="flex gap-2 text-sm font-medium text-slate-600 italic"><Quote className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />{u.problem}</p>
                <span className="mt-4 text-lg font-bold text-navy-900 group-hover:text-brand-700">{u.name}</span>
                <ul className="mt-2 flex-1 space-y-1 text-sm text-muted">
                  {u.sections.map((s) => <li key={s.id} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{s.title}</li>)}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${UTIL_BASE}/excel-review`} className="group flex h-full flex-col rounded-2xl border border-gold-500/50 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <FileSearch className="h-6 w-6 text-gold-700" aria-hidden="true" />
              <span className="mt-3 text-lg font-bold text-navy-900 group-hover:text-brand-700">Review my Excel calculation sheet</span>
              <span className="mt-2 flex-1 text-sm text-muted">Import any .xlsx and get a list of error cells, broken references, formulas that read blank cells, numbers stored as text, and rules of thumb like the 500 and ÷ 24 shortcuts with where they stop being valid.</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Review a workbook <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </li>
        </ul>

        <section className="grid gap-6 rounded-3xl bg-navy-900 p-6 text-white sm:p-10 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="wb-heading">
          <div>
            <FileSpreadsheet className="h-7 w-7 text-gold-200" aria-hidden="true" />
            <h2 id="wb-heading" className="mt-3 text-2xl font-bold">The whole set as one Excel workbook</h2>
            <p className="mt-2 text-white/80">All 24 calculations with live formulas: yellow cells for your inputs, blue rows for results, and every intermediate step on its own row. Steam properties come from the IAPWS-IF97 equations written into the workbook, not a rough lookup. Export from any calculator to get the workbook filled with your numbers, or import a filled workbook to recheck it.</p>
            <a href={WORKBOOK_PATH} download className="mt-5 inline-flex h-11 items-center gap-2 rounded-sm bg-white px-5 text-sm font-semibold text-navy-900 hover:bg-gold-200">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Download the workbook (.xlsx)
            </a>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            {[
              "Leave one value blank and it is solved: flow, heat load, outlet temperature, area, U, receiver size, or time.",
              "Metric and US units on every input, with the conversion shown in SI.",
              "Every result has its formula, the numbers substituted, and the source.",
              "Imported files are read in your browser and never uploaded.",
            ].map((t) => <li key={t} className="flex gap-2"><Sigma className="mt-0.5 h-4 w-4 shrink-0 text-gold-200" aria-hidden="true" />{t}</li>)}
          </ul>
        </section>
        <ShareLinks path={UTIL_BASE} title="Plant Utility Calculators" />
        <Disclaimer />
      </div>
      <JsonLd data={jsonLd} />
    </>
  );
}
