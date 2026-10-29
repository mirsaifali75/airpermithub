import type { Metadata } from "next";
import { ArrowRight, BookOpen, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { AskForm } from "@/components/ask/AskForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { orderedIndustries } from "@/lib/data/industries";
import { practitionerGuides } from "@/lib/data/practitioner-guides";
import { stateTiles } from "@/lib/data/states";

export const metadata: Metadata = {
  title: "Ask an Air Permitting Question",
  description: "Send a question about permit applicability, potential to emit, NSR, Title V, NSPS and NESHAP, stack testing, or compliance records to AirPermitHub.",
  alternates: { canonical: "/ask" },
};

const goodQuestion = [
  "The state, and the local air district if there is one.",
  "The equipment: type, size or rating, fuel, and controls.",
  "What authorization the site has now: none, permit by rule, general permit, minor NSR, or Title V.",
  "What is changing: a new unit, a modification, more throughput, or a move.",
  "The permit condition or rule citation you're reading, quoted if you can.",
  "What you've already worked out, such as a PTE estimate and how you got it.",
];

export default function AskPage() {
  const states = stateTiles.map((s) => s.name).sort();
  const industries = orderedIndustries().map((i) => i.name);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ask a Question" }]}
        eyebrow="Ask AirPermitHub"
        title="Ask an Air Permitting Question"
        icon={<MessageSquareText />}
        description="Stuck on applicability, a PTE calculation, an NSR baseline, or a Title V condition? Send it in. Questions are read by the person who runs AirPermitHub."
      />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <AskForm states={states} industries={industries} />
          <Disclaimer />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink">A question that gets a useful answer includes</h2>
            <ul className="mt-3 space-y-2">
              {goodQuestion.map((g) => <li key={g} className="flex gap-2 text-sm text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{g}</li>)}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink">What to expect</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>There is no set response time, and not every question gets a personal reply.</li>
              <li>Questions that come up often become free guides. Yours is used only if you tick the box, with identifying details removed.</li>
              <li>Spot an error on the site? Choose &ldquo;Something on this site is wrong&rdquo; as the topic.</li>
            </ul>
          </section>
          <div className="rounded-2xl bg-navy-900 p-5 text-white">
            <BookOpen className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-semibold">Already answered</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {practitionerGuides.map((g) => <li key={g.slug}><Link href={`/resources/${g.slug}`} className="inline-flex items-start gap-1.5 text-white/80 hover:text-white"><ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{g.title}</Link></li>)}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
