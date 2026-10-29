import { ArrowRight, ExternalLink, Quote, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Disclaimer } from "@/components/ui/Notices";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { site } from "@/lib/site";

export interface ToolPageProps {
  path: string;
  title: string;
  description: string;
  /** The everyday problem, shown above the tool. */
  problem?: string;
  children: ReactNode;
  how: { heading: string; points: string[] }[];
  quotes?: { cite: string; text: string }[];
  quoteSource?: { title: string; url: string };
  sources: { title: string; url: string }[];
  related: { label: string; href: string }[];
  crumbs?: { label: string; href?: string }[];
}

/** Shared frame for practitioner tool pages: header, tool, method notes, rule text, sources, sharing. */
export function ToolPage({ path, title, description, problem, children, how, quotes, quoteSource, sources, related, crumbs }: ToolPageProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: title,
    description,
    url: `${site.url}${path}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web browser)",
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
  return (
    <>
      <PageHeader
        crumbs={crumbs ?? [{ label: "Tools", href: "/tools" }, { label: title }]}
        eyebrow="Practitioner tool"
        title={title}
        icon={<Wrench />}
        description={description}
      >
        {problem && <p className="max-w-2xl rounded-xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3 text-sm font-medium text-navy-800">&ldquo;{problem}&rdquo;</p>}
      </PageHeader>
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          {children}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-lg font-bold text-ink">How this works</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {how.map((h) => (
                <div key={h.heading}>
                  <h3 className="font-semibold text-ink">{h.heading}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {h.points.map((p) => <li key={p} className="flex gap-2 text-sm text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{p}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          {quotes && quotes.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="rule-heading">
              <h2 id="rule-heading" className="flex items-center gap-2 text-lg font-bold text-ink"><Quote className="h-5 w-5 text-brand-500" aria-hidden="true" /> Rule text this tool follows</h2>
              <ul className="mt-4 space-y-3">
                {quotes.map((q) => (
                  <li key={q.cite + q.text} className="rounded-xl bg-canvas px-4 py-3">
                    <p className="text-sm text-slate-800">&ldquo;{q.text}&rdquo;</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{q.cite}</p>
                  </li>
                ))}
              </ul>
              {quoteSource && (
                <p className="mt-3 text-xs text-muted">
                  Excerpts quoted verbatim from{" "}
                  <a href={quoteSource.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{quoteSource.title}</a>. Your state&apos;s SIP-approved rule may differ; confirm against the current text.
                </p>
              )}
            </section>
          )}
          <ShareLinks path={path} title={title} />
          <Disclaimer />
        </div>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Official sources</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 font-medium text-brand-700 hover:underline"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{s.title}</a></li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Related</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {related.map((r) => <li key={r.href}><Link href={r.href} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">{r.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>)}
            </ul>
          </section>
          <Link href="/tools" className="block rounded-2xl bg-navy-900 p-5 text-white hover:bg-navy-800">
            <Wrench className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <span className="mt-2 block font-semibold">All practitioner tools</span>
            <span className="mt-1 block text-sm text-white/75">Rolling limits, NSR baselines, compliance matrices, deviation logs, and unit converters.</span>
          </Link>
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
