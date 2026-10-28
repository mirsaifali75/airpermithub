import type { Metadata } from "next";
import { ArrowRight, Factory } from "lucide-react";
import Link from "next/link";
import { Scene } from "@/components/illustrations/Scene";
import { PageHeader } from "@/components/layout/PageHeader";
import { industryScene, orderedIndustries } from "@/lib/data/industries";

export const metadata: Metadata = {
  title: "Air Permitting by Industry",
  description: "Industry-specific permitting guidance, regulations and resources for oil and gas, midstream, refining, power generation, chemical, manufacturing, mining, and waste.",
  alternates: { canonical: "/industries" },
};

export default function IndustriesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Industries" }]} title="Industries" icon={<Factory />} scene="manufacturing" description="Industry-specific permitting guidance, regulations and resources: common emission sources, typical equipment, programs worth screening, and the right calculators." />
      <div className="container-page py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {orderedIndustries().map((i) => (
            <li key={i.slug}>
              <Link href={`/industries/${i.slug}`} className="group block h-full overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className="overflow-hidden">
                  <Scene kind={industryScene[i.slug]} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h2 className="flex items-center justify-between font-bold text-navy-900">{i.name} <ArrowRight className="h-4 w-4 text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" /></h2>
                  <p className="mt-1 text-sm text-muted">{i.short}</p>
                  <p className="mt-3 text-xs text-slate-500">{i.equipment.slice(0, 4).join(" · ")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
