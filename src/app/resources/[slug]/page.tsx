import type { Metadata } from "next";
import { ArrowRight, BookOpen, CalendarDays, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskCta } from "@/components/ask/AskCta";
import { Scene } from "@/components/illustrations/Scene";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Notices";
import { getGuide, guides } from "@/lib/data/guides";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return { title: g.title, description: g.summary, alternates: { canonical: `/resources/${g.slug}` }, openGraph: { type: "article", title: g.title, description: g.summary } };
}

const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.summary,
    datePublished: g.published,
    dateModified: g.published,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: `${site.url}/icon.svg` } },
    mainEntityOfPage: `${site.url}/resources/${g.slug}`,
  };
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-950 pt-24 pb-12 text-white sm:pt-28">
        <Scene kind={g.scene} className="absolute inset-0 -z-10 h-full w-full opacity-80" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/40" />
        <div className="container-page">
          <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Guides", href: "/resources?tab=guides" }, { label: g.title }]} />
          <Badge tone="blue" className="mt-6">{g.category}</Badge>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-5xl">{g.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">{g.summary}</p>
          <p className="mt-5 flex flex-wrap gap-4 text-sm text-white/65">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{g.readMinutes} min read</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />Published {g.published}</span>
          </p>
        </div>
      </section>
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0 max-w-3xl">
          {g.sections.map((s) => (
            <section key={s.heading} id={anchor(s.heading)} className="scroll-mt-24 border-b border-line py-6 first:pt-0 last:border-0">
              <h2 className="text-2xl font-bold text-navy-900">{s.heading}</h2>
              {s.paragraphs.map((p) => <p key={p.slice(0, 40)} className="mt-3 text-[1.05rem] leading-relaxed text-slate-700">{p}</p>)}
              {s.list && (
                <ul className="mt-3 space-y-2">
                  {s.list.map((li) => <li key={li} className="flex gap-2.5 text-[1.05rem] text-slate-700"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{li}</li>)}
                </ul>
              )}
            </section>
          ))}
          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="font-bold text-ink">Sources</h2>
            <ul className="mt-3 space-y-2">
              {g.sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 text-sm font-medium text-brand-700 hover:underline"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{s.title}</a></li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">This guide explains how programs fit together. It does not restate thresholds, limits, or deadlines; read those in the cited text or on the state hub.</p>
          </section>
          <Disclaimer className="mt-6" />
        </article>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-xs font-bold tracking-wider text-muted uppercase">On this page</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {g.sections.map((s) => <li key={s.heading}><a href={`#${anchor(s.heading)}`} className="text-slate-700 hover:text-brand-700">{s.heading}</a></li>)}
            </ul>
          </nav>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Related</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {g.related.map((r) => <li key={r.href}><Link href={r.href} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">{r.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-navy-900 p-5 text-white">
            <BookOpen className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">More guides</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {guides.filter((x) => x.slug !== g.slug).map((x) => <li key={x.slug}><Link href={`/resources/${x.slug}`} className="text-white/80 hover:text-white">{x.title}</Link></li>)}
            </ul>
          </div>
          <AskCta path={`/resources/${g.slug}`} />
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
