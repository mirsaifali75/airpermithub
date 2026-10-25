import type { Metadata } from "next";
import { ArrowRight, Calculator, Database, Eye, FileCheck2, History } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { calculatorMethods } from "@/lib/calc/methods";
import { pollutants } from "@/lib/data/equipment";

export const metadata: Metadata = {
  title: "Emissions Calculator for Industrial Equipment",
  description: "Transparent emission calculations for engines, heaters, flares, storage tanks, and fugitives. See the formula, factor, source, and every step.",
  alternates: { canonical: "/calculators" },
};

const planned = ["Dehydrators", "Pneumatics", "Loading", "Turbines"];

const factorFields = ["Source category", "Pollutant", "Factor value", "Units", "Reference document", "Section / table", "Publication or revision date", "Official URL", "Rating / quality", "Notes", "Version history"];

export default function CalculatorsPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Calculators" }]}
        eyebrow="Emissions toolkit"
        title="Emission Calculators"
        icon={<Calculator className="h-7 w-7" />}
        description="Equipment-based calculations that show the formula, the emission factor, its source, and every intermediate step. Nothing is hidden."
      />
      <div className="container-page space-y-14 py-12">
        <section aria-labelledby="calc-list">
          <SectionHeading id="calc-list" title="Choose equipment" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {calculatorMethods.map((m) => (
              <li key={m.slug}>
                <Link href={`/calculators/${m.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                  <span className="text-xs font-semibold text-brand-600">{m.equipmentCategory}</span>
                  <h3 className="mt-1 text-lg font-bold text-ink">{m.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted">{m.description}</p>
                  <code className="mt-4 block truncate rounded-lg bg-canvas px-3 py-2 text-xs text-navy-800">{m.formula}</code>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Start calculating <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
            {planned.map((p) => (
              <li key={p} className="flex flex-col justify-between rounded-2xl border border-dashed border-line bg-white/60 p-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-500">{p}</h3>
                  <p className="mt-1.5 text-sm text-muted">Method in development.</p>
                </div>
                <Badge tone="gray" className="mt-4 self-start">Phase 2</Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-3" aria-label="How calculations work">
          {[
            { icon: Eye, title: "Transparent by design", body: "Every result shows its formula, inputs, emission factor, and each intermediate step, so a reviewer can reproduce it by hand." },
            { icon: FileCheck2, title: "You cite the factor", body: "AirPermitHub does not ship unverified emission factors. Enter the factor and its reference; results without a cited source are flagged." },
            { icon: History, title: "Versioned factor library", body: "Phase 2 adds a factor database where every value carries its publication, revision date, URL, and version history." },
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
              {factorFields.map((f) => <li key={f}><Badge tone="blue">{f}</Badge></li>)}
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

        <Disclaimer />
      </div>
    </>
  );
}
