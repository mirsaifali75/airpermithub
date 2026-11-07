import type { Metadata } from "next";
import { ArrowRight, FileSearch, FileSpreadsheet, Lock, Quote, Sigma } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { JsonLd } from "@/components/ui/JsonLd";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { toolIcons } from "@/components/tools/ToolIcon";
import { site } from "@/lib/site";
import { OILGAS_BASE, UTIL_BASE, oilGasCalcs } from "@/lib/utilities";
import { OILGAS_WORKBOOK_PATH } from "@/lib/utilities/workbook-layout";

const count = oilGasCalcs.reduce((a, u) => a + u.sections.length, 0);

export const metadata: Metadata = {
  title: "Oil & Gas Engineering Calculators: Z-Factor, PVT, IPR, Nodal, Chokes, Pipelines, Well Control",
  description: `${count} oil and gas calculations with every formula and step shown: gas analysis to VOC and HAP weight %, Z-factor, bubble point and Bo, Vogel IPR and AOF, bottomhole pressure and nodal analysis, liquid loading, Gilbert chokes, pipeline pressure drop, erosional velocity, separator sizing, tank gauging, kill sheet, rod pump and ESP sizing. Oilfield and metric units, Excel import and export.`,
  alternates: { canonical: OILGAS_BASE },
};

export default function OilGasHub() {
  const Icon = toolIcons.oilgas;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AirPermitHub oil and gas engineering calculators",
    itemListElement: oilGasCalcs.map((u, i) => ({ "@type": "ListItem", position: i + 1, name: u.name, url: `${site.url}${OILGAS_BASE}/${u.slug}` })),
  };
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools", href: "/tools" }, { label: "Oil & Gas Calculators" }]}
        eyebrow="Practitioner tools"
        title="Oil & Gas Engineering Calculators"
        icon={<Icon />}
        scene="oil-gas"
        description="The everyday calculations of production, reservoir, drilling, and facilities work. Type your numbers in the boxes and get the answer with every formula and step shown. Oilfield units first, metric with one click."
      />
      <div className="container-page space-y-12 py-12">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {oilGasCalcs.map((u) => (
            <li key={u.slug}>
              <Link href={`${OILGAS_BASE}/${u.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
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
              <span className="mt-2 flex-1 text-sm text-muted">Import any .xlsx and get a list of error cells, broken references, formulas that read blank cells, and numbers stored as text. AirPermitHub workbooks are recalculated and compared result by result.</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Review a workbook <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </li>
        </ul>

        <section className="grid gap-6 rounded-3xl bg-navy-900 p-6 text-white sm:p-10 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="wb-heading">
          <div>
            <FileSpreadsheet className="h-7 w-7 text-gold-200" aria-hidden="true" />
            <h2 id="wb-heading" className="mt-3 text-2xl font-bold">All {count} calculations as one locked Excel workbook</h2>
            <p className="mt-2 text-white/80">Yellow boxes are the only cells you can type in; every formula is locked so a sheet cannot be broken by accident. Z-factor, nodal analysis, and pipe sizing are solved inside Excel step by step, the same way the website does it. Export from any calculator to get the workbook filled with your numbers, or import a filled workbook to recheck it.</p>
            <a href={OILGAS_WORKBOOK_PATH} download className="mt-5 inline-flex h-11 items-center gap-2 rounded-sm bg-white px-5 text-sm font-semibold text-navy-900 hover:bg-gold-200">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Download the workbook (.xlsx)
            </a>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            {[
              { icon: Sigma, t: "Leave one value blank and it is solved: rate, skin, permeability, choke size, pipe size, outlet pressure, mud weight, or pump speed." },
              { icon: Sigma, t: "Every result has its formula, the numbers substituted, and the paper or government source." },
              { icon: Lock, t: "Constants like 141.2, 0.052, and 1,029.4 are computed from exact unit definitions, not typed in." },
              { icon: Sigma, t: "Gas analyses give VOC and HAP weight % for air permit applications." },
            ].map(({ icon: I, t }) => <li key={t} className="flex gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-gold-200" aria-hidden="true" />{t}</li>)}
          </ul>
        </section>
        <p className="text-sm text-muted">
          Permitting an oil and gas site? See <Link href="/industries/oil-gas" className="font-semibold text-brand-700 hover:underline">oil and gas air permitting</Link> for the federal and state rules that apply to wells, tanks, compressors, and pneumatics.
        </p>
        <ShareLinks path={OILGAS_BASE} title="Oil & Gas Engineering Calculators" />
        <Disclaimer />
      </div>
      <JsonLd data={jsonLd} />
    </>
  );
}
