import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { notFound } from "next/navigation";
import { ToolGate } from "@/components/auth/ToolGate";
import { UtilityPreview } from "@/components/previews";
import { ToolPage } from "@/components/tools/ToolPage";
import { UtilityCalculator } from "@/components/utilities/UtilityCalculator";
import { JsonLd } from "@/components/ui/JsonLd";
import { keptIn } from "@/lib/storage/where";
import { OILGAS_BASE, UTIL_BASE, getUtility, oilGasCalcs } from "@/lib/utilities";

export function generateStaticParams() {
  return oilGasCalcs.map((u) => ({ slug: u.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const u = getUtility((await params).slug);
  if (!u) return {};
  return withSocial({ title: `${u.name}: Formulas, Worked Examples & Excel`, description: u.description, alternates: { canonical: `${OILGAS_BASE}/${u.slug}` } });
}

export default async function OilGasCalcPage({ params }: { params: Promise<{ slug: string }> }) {
  const u = getUtility((await params).slug);
  if (!u) notFound();
  const path = `${OILGAS_BASE}/${u.slug}`;
  const refs = [...new Map(u.sections.flatMap((s) => s.refs).map((r) => [r.url, r])).values()];
  const howTo = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${u.name} calculations`,
    itemListElement: u.sections.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.title, description: `${s.question} ${s.formulas.join("; ")}`, url: `https://www.airpermithub.com${path}#${s.id}` })),
  };
  return (
    <ToolPage
      path={path}
      title={u.name}
      description={u.description}
      problem={u.problem}
      crumbs={[{ label: "Tools", href: "/tools" }, { label: "Oil & Gas Calculators", href: OILGAS_BASE }, { label: u.short }]}
      how={[
        { heading: "What it calculates", points: u.sections.map((s) => `${s.title}: ${s.question}`) },
        {
          heading: "Method and limits",
          points: [
            ...u.notes,
            "Every input is yours to enter. Example values are labeled and are not data from a real well or facility.",
            `Entries are ${keptIn}. Export to Excel for a copy with live formulas and a record of every step.`,
          ],
        },
        { heading: "Formulas", points: u.sections.flatMap((s) => s.formulas.slice(0, 2)) },
      ]}
      sources={refs}
      related={[
        ...oilGasCalcs.filter((x) => x.slug !== u.slug).map((x) => ({ label: x.name, href: `${OILGAS_BASE}/${x.slug}` })),
        { label: "Excel Calculation Sheet Review", href: `${UTIL_BASE}/excel-review` },
        { label: "Oil & Gas Air Permitting", href: "/industries/oil-gas" },
        { label: "Templates & Workbooks", href: "/templates" },
      ]}
    >
      <ToolGate name={u.name} next={path} preview={<UtilityPreview slug={u.slug} />}>
        <UtilityCalculator slug={u.slug} />
      </ToolGate>
      <JsonLd data={howTo} />
    </ToolPage>
  );
}
