import type { Metadata } from "next";
import { Calculator, Database, Eye, FileCheck2, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { calcCategories, calculatorMethods } from "@/lib/calc/methods";
import { CalculatorGrid } from "@/components/calculator/CalculatorGrid";
import { MyFactors } from "@/components/calculator/MyFactors";
import { factorRecordFields } from "@/lib/calc/factors";
import { pollutants } from "@/lib/data/equipment";

export const metadata: Metadata = {
  title: "Emissions Calculator for Industrial Equipment",
  description: "Transparent emission calculations for engines, heaters, flares, storage tanks, and fugitives. See the formula, factor, source, and every step.",
  alternates: { canonical: "/calculators" },
};


export default function CalculatorsPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Calculators" }]}
        title="Emission Calculators"
        icon={<Calculator />}
        scene="power"
        description="Estimate emissions using EPA methods and industry-standard approaches. Every result shows the formula, the factor you cite, and each intermediate step."
      />
      <div className="container-page space-y-14 py-10">
        <CalculatorGrid
          categories={calcCategories}
          methods={calculatorMethods.map(({ slug, title, short, formula, categories, icon }) => ({ slug, title, short, formula, categories, icon }))}
        />

        <section className="grid gap-6 lg:grid-cols-3" aria-label="How calculations work">
          {[
            { icon: Eye, title: "Transparent by design", body: "Every result shows its formula, inputs, emission factor, and each intermediate step, so a reviewer can reproduce it by hand." },
            { icon: FileCheck2, title: "You cite the factor", body: "AirPermitHub does not ship unverified emission factors. Enter the factor and its reference; results without a cited source are flagged." },
            { icon: History, title: "Versioned factor library", body: "Coming soon: reviewed factors with publication, revision date, URL, and version history. Today you can save the factors you cite as My factors, in the same record format." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <Icon className="h-6 w-6 text-brand-500" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-muted">{body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Database className="h-5 w-5 text-brand-500" aria-hidden="true" /> Emission factor record</h2>
            <p className="mt-1 text-sm text-muted">Every factor in the upcoming library will store:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {factorRecordFields.map((f) => <li key={f.key}><Badge tone="blue">{f.label}</Badge></li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Supported pollutants</h2>
            <p className="mt-1 text-sm text-muted">Results report lb/hr, lb/day, and tons/yr. CO2e is computed from the GWP you enter.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {pollutants.map((p) => <li key={p}><Badge tone="gray">{p}</Badge></li>)}
            </ul>
          </div>
        </section>

        <MyFactors methodNames={Object.fromEntries(calculatorMethods.map((m) => [m.slug, m.title]))} />

        <Disclaimer />
      </div>
    </>
  );
}
