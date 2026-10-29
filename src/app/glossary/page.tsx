import type { Metadata } from "next";
import { BookA } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlossaryList } from "@/components/tools/GlossaryList";
import { Disclaimer } from "@/components/ui/Notices";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { glossary } from "@/lib/data/glossary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Air Permitting Glossary: PTE, PSD, BACT, Title V, NSPS & More",
  description: "Plain-language definitions of air permitting terms (potential to emit, major modification, BACT, LAER, deviation, CAM, and more), each linked to the regulation that defines it.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "AirPermitHub Air Permitting Glossary",
    url: `${site.url}/glossary`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      ...(t.abbr ? { termCode: t.abbr } : {}),
      description: t.definition,
      url: `${site.url}/glossary#${t.slug}`,
    })),
  };
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tools", href: "/tools" }, { label: "Glossary" }]}
        eyebrow="Reference"
        title="Air Permitting Glossary"
        icon={<BookA />}
        description={`${terms.length} terms permit engineers use every day, in plain language, each linked to the regulation that defines it. Where programs define a term differently, the entry says so.`}
      />
      <div className="container-page max-w-4xl space-y-6 py-10">
        <GlossaryList terms={terms} />
        <p className="text-xs text-muted">Definitions are AirPermitHub explanations, not regulatory text. The cited provision governs, and state programs may define terms differently.</p>
        <ShareLinks path="/glossary" title="Air Permitting Glossary" />
        <Disclaimer />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
