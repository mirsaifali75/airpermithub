import type { Metadata } from "next";
import { ArrowRight, Briefcase, Calculator, Cog, Flame, Gavel, Wind } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Scene } from "@/components/illustrations/Scene";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge, CitationBadge, DemoBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Notices";
import { SectionHeading } from "@/components/ui/Section";
import { getMethod } from "@/lib/calc/methods";
import { getIndustry, industries, industryScene, oilGasSegments } from "@/lib/data/industries";
import { demoJobs } from "@/lib/data/jobs";
import { getRegulation } from "@/lib/data/regulations";
import { guides as allGuides } from "@/lib/data/guides";
import { listStateProfiles } from "@/lib/data/state-profiles";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const i = getIndustry((await params).slug);
  if (!i) return {};
  return { title: `${i.name} Air Permits & Compliance`, description: i.summary, alternates: { canonical: `/industries/${i.slug}` } };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const ind = getIndustry((await params).slug);
  if (!ind) notFound();
  const isOG = ind.slug === "oil-gas";
  const regs = ind.potentialRules.map(getRegulation).filter((r) => !!r);
  const calcs = ind.calculators.map(getMethod).filter((m) => !!m);
  const jobs = demoJobs.filter((j) => j.industry === ind.name || (isOG && j.industry === "Midstream")).slice(0, 3);
  const stateOG = isOG ? listStateProfiles().filter((s) => s.oilAndGas) : [];
  const guides = allGuides;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-950 pt-24 pb-14 text-white sm:pt-28">
        <Scene kind={industryScene[ind.slug]} className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/10" />
        <div className="container-page">
          <Breadcrumbs items={[{ label: "Industries", href: "/industries" }, { label: ind.name }]} />
          <p className="mt-6 text-xs font-bold tracking-[0.2em] text-eco-500 uppercase">Industry hub</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold sm:text-5xl">{ind.name} Air Permitting</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">{ind.summary}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/permit-finder" className={buttonClass("primary", "lg")}>Find My Permit Path <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
            <Link href="/calculators" className={buttonClass("outline-light", "lg")}><Calculator className="h-5 w-5" aria-hidden="true" /> Calculate Emissions</Link>
          </div>
        </div>
      </section>

      <div className="container-page space-y-16 py-14">
        {isOG && (
          <section aria-labelledby="segments">
            <SectionHeading id="segments" eyebrow="Value chain" title="Upstream, Midstream, Processing" />
            <ul className="grid gap-4 md:grid-cols-3">
              {oilGasSegments.map((s) => (
                <li key={s.name} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                  <h3 className="text-xl font-bold text-ink">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted">{s.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">{s.equipment.map((e) => <li key={e}><Badge tone="gray">{e}</Badge></li>)}</ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><Wind className="h-5 w-5 text-brand-500" aria-hidden="true" /> Common emission sources</h2>
            <ul className="mt-4 space-y-2.5">
              {ind.commonSources.map((s) => <li key={s} className="flex gap-2.5 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" aria-hidden="true" />{s}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><Cog className="h-5 w-5 text-brand-500" aria-hidden="true" /> {isOG ? "Common equipment" : "Typical equipment"}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ind.equipment.map((e) => <li key={e} className="rounded-xl bg-canvas px-3 py-2.5 text-sm font-medium text-ink">{e}</li>)}
            </ul>
          </div>
        </section>

        <section aria-labelledby="regs">
          <SectionHeading id="regs" eyebrow="Screening" title="Programs worth screening" description="These federal programs commonly come up for this industry. Whether any applies depends on your equipment, dates, and emissions." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regs.map((r) => (
              <li key={r.slug}>
                <Link href={`/regulations/${r.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand-200">
                  <span className="flex items-center gap-2 font-display text-xl font-extrabold text-navy-900"><Gavel className="h-5 w-5 text-brand-500" aria-hidden="true" />{r.shortName}</span>
                  <span className="mt-1 flex-1 text-sm text-muted">{r.name}</span>
                  <span className="mt-3"><CitationBadge>{r.citation}</CitationBadge></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {stateOG.length > 0 && (
          <section aria-labelledby="state-og">
            <SectionHeading id="state-og" eyebrow="Permit resources" title="State oil & gas programs" />
            <ul className="grid gap-4 md:grid-cols-2">
              {stateOG.map((s) => (
                <li key={s.slug} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                  <h3 className="text-lg font-bold text-ink">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted">{s.oilAndGas!.summary}</p>
                  <ul className="mt-4 space-y-1.5">
                    {s.oilAndGas!.programs.slice(0, 5).map((p) => (
                      <li key={p.name} className="flex flex-wrap items-center gap-2 text-sm text-ink"><Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />{p.name}</li>
                    ))}
                  </ul>
                  <Link href={`/states/${s.slug}#oil-gas`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">All {s.name} oil & gas programs <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Calculator className="h-5 w-5 text-brand-500" aria-hidden="true" /> Calculators</h2>
            <ul className="mt-4 space-y-2">
              {calcs.map((m) => <li key={m.slug}><Link href={`/calculators/${m.slug}`} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50">{m.name} <ArrowRight className="h-4 w-4 text-brand-500" aria-hidden="true" /></Link></li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Educational articles</h2>
            <ul className="mt-4 space-y-3">
              {guides.slice(0, 4).map((g) => <li key={g.slug} className="text-sm"><Link href={`/resources/${g.slug}`} className="font-medium text-brand-700 hover:underline">{g.title}</Link></li>)}
            </ul>
            <Link href="/resources" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Compliance resources <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Briefcase className="h-5 w-5 text-brand-500" aria-hidden="true" /> Relevant jobs</h2>
            <div className="mt-1"><DemoBadge>Demo listings</DemoBadge></div>
            <ul className="mt-3 space-y-2.5">
              {(jobs.length ? jobs : demoJobs.slice(0, 2)).map((j) => <li key={j.id} className="text-sm"><span className="font-medium text-ink">{j.title}</span><span className="block text-muted">{j.company} · {j.city}, {j.state}</span></li>)}
            </ul>
            <Link href="/jobs" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Browse jobs <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
