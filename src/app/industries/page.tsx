import type { Metadata } from "next";
import { Factory } from "lucide-react";
import Link from "next/link";
import { IndustryArt } from "@/components/illustrations/IndustryArt";
import { PageHeader } from "@/components/layout/PageHeader";
import { industries } from "@/lib/data/industries";

export const metadata: Metadata = {
  title: "Air Permitting by Industry",
  description: "Industry hubs for oil and gas, midstream, refining, chemical, power, manufacturing, aggregates, and waste: common sources, equipment, and programs to screen.",
  alternates: { canonical: "/industries" },
};

export default function IndustriesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Industries" }]} eyebrow="Industry hubs" title="Explore by Industry" icon={<Factory className="h-7 w-7" />} description="Each hub collects common emission sources, typical equipment, programs worth screening, and the right calculators." />
      <div className="container-page py-12">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((i) => (
            <li key={i.slug}>
              <Link href={`/industries/${i.slug}`} className="group block overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <IndustryArt kind={i.art} className="aspect-[16/7] w-full" />
                <div className="p-5">
                  <h2 className="text-lg font-bold text-ink">{i.name}</h2>
                  <p className="mt-1 text-sm text-muted">{i.short}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
