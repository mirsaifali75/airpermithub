import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConverterTool } from "@/components/tools/ConverterTool";
import { ToolPage } from "@/components/tools/ToolPage";
import { AccordionItem } from "@/components/ui/Accordion";
import { converters, getConverter } from "@/lib/tools/converters";

export function generateStaticParams() {
  return converters.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getConverter((await params).slug);
  if (!c) return {};
  return { title: c.title, description: c.description, alternates: { canonical: `/tools/${c.slug}` } };
}

export default async function ConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getConverter((await params).slug);
  if (!c) notFound();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <ToolPage
      path={`/tools/${c.slug}`}
      title={c.title}
      description={c.description}
      crumbs={[{ label: "Tools", href: "/tools" }, { label: "Converters", href: "/tools#converters" }, { label: c.name }]}
      how={[
        { heading: "Formula", points: c.formula },
        { heading: "Before you rely on the number", points: c.notes },
      ]}
      sources={c.sources}
      related={[
        ...c.related.map((r) => ({ label: `${getConverter(r)!.name} converter`, href: `/tools/${r}` })),
        { label: "Emission Calculators", href: "/calculators" },
      ]}
    >
      <p className="max-w-3xl text-[1.05rem] leading-relaxed text-slate-700">{c.intro}</p>
      <ConverterTool slug={c.slug} />
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-3 text-lg font-bold text-ink">Questions engineers ask</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {c.faqs.map((f, i) => <AccordionItem key={f.q} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
        </div>
        <p className="mt-3 text-sm text-muted">More converters: {converters.filter((x) => x.slug !== c.slug).map((x, i, a) => <span key={x.slug}><Link href={`/tools/${x.slug}`} className="font-medium text-brand-700 hover:underline">{x.name}</Link>{i < a.length - 1 ? ", " : ""}</span>)}.</p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </ToolPage>
  );
}
