import type { Metadata } from "next";
import { Calculator } from "lucide-react";
import { notFound } from "next/navigation";
import { EmissionCalculator } from "@/components/calculator/EmissionCalculator";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { calculatorMethods, getMethod } from "@/lib/calc/methods";
import { federalRegulations } from "@/lib/data/regulations";

export function generateStaticParams() {
  return calculatorMethods.map((m) => ({ method: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ method: string }> }): Promise<Metadata> {
  const m = getMethod((await params).method);
  if (!m) return {};
  return {
    title: m.title,
    description: `${m.description} Formula: ${m.formula}.`,
    alternates: { canonical: `/calculators/${m.slug}` },
  };
}

export default async function MethodPage({ params }: { params: Promise<{ method: string }> }) {
  const m = getMethod((await params).method);
  if (!m) notFound();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Calculators", href: "/calculators" }, { label: m.name }]}
        eyebrow={m.equipmentCategory}
        title={m.title}
        icon={<Calculator />}
        description={m.description}
      />
      <div className="container-page space-y-6 py-10">
        <EmissionCalculator
          methodSlug={m.slug}
          related={federalRegulations.filter((r) => r.relatedCalculators.includes(m.slug)).map((r) => ({ slug: r.slug, shortName: r.shortName, citation: r.citation }))}
        />
        <Disclaimer />
      </div>
    </>
  );
}
