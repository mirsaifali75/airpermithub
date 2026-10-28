import type { Metadata } from "next";
import { ArrowRight, BookOpen, Download, FileSpreadsheet, Landmark, ListChecks, MapPinned, } from "lucide-react";
import Link from "next/link";
import { Scene } from "@/components/illustrations/Scene";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccordionItem } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { Tabs } from "@/components/ui/Tabs";
import { faqs, guides } from "@/lib/data/guides";
import { resources } from "@/lib/data/resources";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { aphTemplates } from "@/lib/data/templates";

export const metadata: Metadata = {
  title: "Air Permitting Resources: Guides, Templates & FAQs",
  description: "Guides, articles, templates and tools for air permitting professionals: where to start, potential to emit, PSD vs. NSR, Title V, state guides, CSV templates, and FAQs.",
  alternates: { canonical: "/resources" },
};

function Row({ href, title, sub, thumb, meta, download }: { href: string; title: string; sub: string; thumb: React.ReactNode; meta?: React.ReactNode; download?: boolean }) {
  const inner = (
    <>
      <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-navy-900">{thumb}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy-900">{title}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{sub}</span>
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      {download ? <Download className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" /> : <ArrowRight className="h-5 w-5 shrink-0 text-brand-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
    </>
  );
  const cls = "group flex items-center gap-4 rounded-xl border border-line bg-white p-3 pr-4 shadow-card transition-colors hover:border-brand-200";
  return download ? <a href={href} download className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
}

const iconThumb = (Icon: typeof BookOpen) => (
  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950 text-cyan-400"><Icon className="h-7 w-7" aria-hidden="true" /></span>
);

export default function ResourcesPage() {
  const states = listStateProfiles();
  const featuredStates = ["texas", "new-mexico", "oklahoma", "colorado", "louisiana", "north-dakota"].map((s) => states.find((p) => p.slug === s)).filter((p) => !!p);
  const planned = resources.filter((r) => !guides.some((g) => g.slug === r.slug));

  const guideRows = guides.map((g) => (
    <li key={g.slug}>
      <Row href={`/resources/${g.slug}`} title={g.title} sub={g.summary} thumb={<Scene kind={g.scene} grain={false} className="h-full w-full" />} meta={<><Badge tone="blue">{g.category}</Badge><span className="text-xs text-muted">{g.readMinutes} min read</span></>} />
    </li>
  ));
  const stateRows = featuredStates.map((s) => (
    <li key={s.slug}>
      <Row href={`/states/${s.slug}`} title={`${s.name} Air Permitting Guide`} sub={`${s.agency.name}: ${s.permitTypes.map((p) => p.name).slice(0, 3).join(", ")}, and more.`} thumb={iconThumb(MapPinned)} meta={<span className="text-xs text-muted">Reviewed {s.lastReviewed}</span>} />
    </li>
  ));
  const templateRows = aphTemplates.map((t) => (
    <li key={t.slug}>
      <Row href={`/api/v1/templates/${t.slug}`} download title={t.title} sub={t.description} thumb={iconThumb(t.kind === "checklist" ? ListChecks : FileSpreadsheet)} meta={<><Badge tone="navy">AirPermitHub Template</Badge><span className="text-xs text-muted">CSV</span></>} />
    </li>
  ));

  return (
    <>
      <PageHeader crumbs={[{ label: "Resources" }]} title="Resources" icon={<BookOpen />} scene="oil-gas" description="Guides, articles, templates and tools for air permitting professionals. Every guide cites its sources and points to the governing text." />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Tabs
          className="min-w-0"
          tabs={[
            {
              label: "Featured",
              content: <ul className="space-y-3">{guideRows.slice(0, 3)}{stateRows.slice(0, 2)}{templateRows.slice(0, 1)}</ul>,
            },
            {
              label: "Guides",
              count: guides.length + featuredStates.length,
              content: (
                <div className="space-y-8">
                  <ul className="space-y-3">{guideRows}</ul>
                  <section>
                    <h2 className="mb-3 text-sm font-bold tracking-wider text-muted uppercase">State guides</h2>
                    <ul className="space-y-3">{stateRows}</ul>
                    <Link href="/states" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">All {states.length} state hubs <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                  </section>
                  {planned.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-sm font-bold tracking-wider text-muted uppercase">In production</h2>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {planned.map((r) => (
                          <li key={r.slug} className="rounded-xl border border-dashed border-line bg-white/60 p-4">
                            <p className="font-semibold text-slate-600">{r.title}</p>
                            <p className="mt-1 text-sm text-muted">{r.excerpt}</p>
                            <Badge tone="gray" className="mt-2">Planned</Badge>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              ),
            },
            { label: "Templates", count: aphTemplates.length, content: <ul className="space-y-3">{templateRows}</ul> },
            {
              label: "FAQs",
              count: faqs.length,
              content: (
                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  {faqs.map((f, i) => <AccordionItem key={f.q} title={f.q} defaultOpen={i === 0}>{f.a}</AccordionItem>)}
                </div>
              ),
            },
          ]}
        />
        <aside className="space-y-4 lg:pt-14">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink">Quick links</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {[
                { l: "Regulations Explorer", h: "/regulations", i: Landmark },
                { l: "State Explorer", h: "/states", i: MapPinned },
                { l: "Official forms (Permit Library)", h: "/permits?tab=forms", i: FileSpreadsheet },
                { l: "EPA guidance", h: "/regulations?tab=guidance", i: BookOpen },
              ].map(({ l, h, i: Icon }) => (
                <li key={h}><Link href={h} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 hover:bg-canvas hover:text-brand-700"><Icon className="h-4 w-4 text-brand-500" aria-hidden="true" />{l}</Link></li>
              ))}
            </ul>
          </div>
          <Disclaimer />
        </aside>
      </div>
    </>
  );
}
