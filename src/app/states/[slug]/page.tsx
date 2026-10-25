import type { Metadata } from "next";
import { ArrowRight, Building2, ExternalLink, FileText, Fuel, Landmark, Quote, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, CitationBadge, VerificationBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer, EmptyState, VerifyNotice } from "@/components/ui/Notices";
import { getStateProfile } from "@/lib/data/state-profiles";
import type { PermitProgram, PermitType } from "@/lib/data/state-profile-types";
import { getStateTile, stateTiles } from "@/lib/data/states";

export function generateStaticParams() {
  return stateTiles.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const tile = getStateTile(slug);
  if (!tile) return {};
  const p = getStateProfile(slug);
  return {
    title: `${tile.name} Air Permits${p ? `: ${p.agency.name}` : ""}`,
    description: p ? p.overview.slice(0, 155) : `${tile.name} air permitting hub (in research).`,
    alternates: { canonical: `/states/${slug}` },
    robots: p ? undefined : { index: false },
  };
}

const typeLabel: Record<PermitType, string> = {
  exemption: "Exemption",
  registration: "Registration / Notice",
  pbr: "Permit by Rule",
  general: "General Permit",
  standard: "Standard Permit",
  "minor-nsr": "Minor NSR",
  psd: "PSD",
  nnsr: "Nonattainment NSR",
  "title-v": "Title V",
  "state-operating": "State Operating",
  other: "Other",
};

function ProgramCard({ p }: { p: PermitProgram }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{p.name}</h3>
        <Badge tone="blue">{typeLabel[p.type]}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-700">{p.description}</p>
      {p.quote && (
        <figure className="mt-3 rounded-xl border-l-4 border-cyan-500 bg-canvas px-4 py-3">
          <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted"><Quote className="h-3.5 w-3.5" aria-hidden="true" /> Quoted verbatim from the agency source</figcaption>
          <blockquote className="text-sm text-slate-700">{p.quote}</blockquote>
        </figure>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {p.citation && <CitationBadge>{p.citation}</CitationBadge>}
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            Official page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </li>
  );
}

function Block({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-ink">{icon} {title}</h2>
      {children}
    </section>
  );
}

function LinkList({ links }: { links: { name: string; url: string }[] }) {
  if (!links.length) return <p className="text-sm text-muted">No links indexed yet.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50/50">
            {l.name} <ExternalLink className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function StatePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const tile = getStateTile(slug);
  if (!tile) notFound();
  const p = getStateProfile(slug);

  if (!p) {
    return (
      <>
        <PageHeader crumbs={[{ label: "States", href: "/states" }, { label: tile.name }]} eyebrow={tile.code} title={`${tile.name} Air Permits`} icon={<Landmark className="h-7 w-7" />} description="This state hub is in research." />
        <div className="container-page py-12">
          <EmptyState icon={<Landmark className="h-6 w-6" />} title={`${tile.name} hub coming soon`} action={<Link href="/permit-finder" className={buttonClass("primary")}>Use the Permit Finder</Link>}>
            AirPermitHub publishes a state only after its agency, programs, forms, and guidance are checked against official pages. Until then, start with the federal programs and your state air agency&apos;s website.
          </EmptyState>
        </div>
      </>
    );
  }

  const byType = (types: PermitType[]) => p.permitTypes.filter((t) => types.includes(t.type));
  const groups = [
    { id: "authorizations", title: "Air permits & authorizations", types: ["exemption", "registration", "pbr", "standard", "general", "minor-nsr", "other", "state-operating"] as PermitType[] },
    { id: "major-nsr", title: "Major NSR (PSD & nonattainment)", types: ["psd", "nnsr"] as PermitType[] },
    { id: "title-v", title: "Title V operating permits", types: ["title-v"] as PermitType[] },
  ].filter((g) => byType(g.types).length);

  const nav = [
    ...groups.map((g) => [g.id, g.title.split(" (")[0]]),
    ...(p.oilAndGas ? [["oil-gas", "Oil & Gas"]] : []),
    ["regulations", "Regulations"],
    ["forms", "Forms"],
    ["guidance", "Guidance"],
    ["compliance", "Compliance"],
    ["sources", "Sources"],
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "States", href: "/states" }, { label: tile.name }]}
        eyebrow={`${p.code} · EPA Region ${p.epaRegion}`}
        title={`${p.name} Air Permits`}
        icon={<Landmark className="h-7 w-7" />}
        description={p.overview}
      >
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge level={p.verification} />
          <Badge tone="gray">Last reviewed {p.lastReviewed}</Badge>
        </div>
      </PageHeader>

      <div className="sticky top-16 z-30 border-b border-line bg-white/90 backdrop-blur lg:top-[4.5rem]">
        <nav aria-label={`${p.name} sections`} className="container-page flex gap-1 overflow-x-auto py-2">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">{label}</a>
          ))}
        </nav>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          {groups.map((g) => (
            <Block key={g.id} id={g.id} title={g.title} icon={<Route className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
              <ul className="grid gap-4 md:grid-cols-2">{byType(g.types).map((t) => <ProgramCard key={t.name} p={t} />)}</ul>
            </Block>
          ))}

          {p.oilAndGas && (
            <Block id="oil-gas" title="Oil & Gas" icon={<Fuel className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
              <p className="mb-4 text-slate-700">{p.oilAndGas.summary}</p>
              <ul className="grid gap-4 md:grid-cols-2">{p.oilAndGas.programs.map((t) => <ProgramCard key={t.name} p={t} />)}</ul>
              <Link href="/industries/oil-gas" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Oil & Gas industry hub <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Block>
          )}

          <Block id="regulations" title="State air regulations" icon={<FileText className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {p.regulations.map((r) => (
                <li key={r.citation} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-48 shrink-0"><CitationBadge>{r.citation}</CitationBadge></span>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-ink hover:text-brand-600">{r.title} <ExternalLink className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /></a>
                  ) : <span className="text-sm text-ink">{r.title}</span>}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="forms" title="Forms" icon={<FileText className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
            <LinkList links={p.forms} />
          </Block>

          <Block id="guidance" title="Guidance" icon={<FileText className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
            <LinkList links={p.guidance} />
          </Block>

          <Block id="compliance" title="Compliance" icon={<ShieldCheck className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
            <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">
              State compliance obligations (reporting, emissions inventory, testing) are being indexed. Use the <Link href="/compliance" className="font-medium text-brand-600">Compliance dashboard</Link> preview to see how they will be tracked.
            </p>
          </Block>

          <Block id="sources" title="Sources" icon={<ShieldCheck className="h-5 w-5 text-eco-600" aria-hidden="true" />}>
            <LinkList links={p.sources} />
            {p.notes && <p className="mt-4 text-sm text-muted"><span className="font-semibold text-ink">Editorial note: </span>{p.notes}</p>}
          </Block>
          <Disclaimer />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="text-xs font-semibold text-muted uppercase">Agency</p>
            <a href={p.agency.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 font-semibold text-ink hover:text-brand-600">{p.agency.name} <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" /></a>
            {p.agency.division && <p className="text-sm text-muted">{p.agency.division}</p>}
            <div className="mt-4 space-y-2">
              {p.agency.permitsUrl && <a href={p.agency.permitsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm", "w-full")}>Agency air permits page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
              {p.ePermitting && <a href={p.ePermitting.url} target="_blank" rel="noopener noreferrer" className={buttonClass("subtle", "sm", "w-full")}>{p.ePermitting.name}</a>}
              {p.fees && <a href={p.fees.url} target="_blank" rel="noopener noreferrer" className={buttonClass("subtle", "sm", "w-full")}>{p.fees.name}</a>}
            </div>
          </div>
          {p.localAgencies && p.localAgencies.length > 0 && (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900"><Building2 className="h-4 w-4" aria-hidden="true" /> Local jurisdiction</p>
              {p.localAgencies.map((l) => (
                <div key={l.url} className="mt-2 text-sm text-amber-900">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">{l.name}</a>
                  <p className="text-xs">{l.jurisdiction}</p>
                  {l.notes && <p className="mt-1 text-xs opacity-80">{l.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <VerifyNotice>Content checked against {p.agency.name.replace(/ \(.*\)/, "")} pages on {p.lastReviewed}. Rules change; confirm with the agency before relying on it.</VerifyNotice>
          <Link href="/permit-finder" className={buttonClass("secondary", "md", "w-full")}>Screen a {p.name} facility <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </aside>
      </div>
    </>
  );
}
