import type { Metadata } from "next";
import { ArrowRight, Building2, Gauge, ExternalLink, FileText, Landmark, Quote, Route } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, CitationBadge, VerificationBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Disclaimer, EmptyState, VerifyNotice } from "@/components/ui/Notices";
import { Tabs } from "@/components/ui/Tabs";
import { agencyShortName, getStateProfile } from "@/lib/data/state-profiles";
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
          <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Quote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {p.quoteSource ? (
              <span>
                Quoted verbatim from{" "}
                <a href={p.quoteSource.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{p.quoteSource.name}</a>
              </span>
            ) : (
              "Quoted verbatim from the agency source"
            )}
          </figcaption>
          <blockquote className="text-sm text-slate-700">{p.quote}</blockquote>
        </figure>
      )}
      {p.thresholds && (
        <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {p.thresholdsSource ? (
              <span>
                Thresholds summarized from{" "}
                <a href={p.thresholdsSource.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{p.thresholdsSource.name}</a>, not a quotation
              </span>
            ) : (
              "Thresholds (summarized from source, not a quotation)"
            )}
          </p>
          <p className="text-sm text-slate-700">{p.thresholds}</p>
        </div>
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

function Block({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">{icon} {title}</h2>
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

  const abbr = agencyShortName(p.agency.name);
  const short = abbr !== p.agency.name ? abbr : null;
  const highlights = groups.flatMap((g) => byType(g.types)).slice(0, 4);
  const popular = [...p.forms.slice(0, 3), ...p.guidance.slice(0, 3)];

  const tabs = [
    {
      label: "Overview",
      content: (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-ink">Air permitting in {p.name}</h2>
            <p className="mt-2 text-slate-700">{p.overview}</p>
          </section>
          {highlights.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {highlights.map((t) => (
                <li key={t.name} className="flex flex-col rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Route className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{typeLabel[t.type]}</p>
                    </div>
                  </div>
                  <a href="#permit-pathways" className="mt-3 inline-flex items-center gap-1 self-end text-sm font-semibold text-brand-600 hover:text-brand-700">View details <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                </li>
              ))}
            </ul>
          )}
          {popular.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-ink">Popular resources</h2>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {popular.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-brand-600 hover:underline">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {l.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ),
    },
    {
      label: "Permit Pathways",
      count: p.permitTypes.length,
      content: (
        <div className="space-y-10">
          {groups.map((g) => (
            <Block key={g.id} title={g.title} icon={<Route className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
              <ul className="grid gap-4 md:grid-cols-2">{byType(g.types).map((t) => <ProgramCard key={t.name} p={t} />)}</ul>
            </Block>
          ))}
        </div>
      ),
    },
    ...(p.oilAndGas
      ? [{
          label: "Oil & Gas",
          count: p.oilAndGas.programs.length,
          content: (
            <>
              <p className="mb-4 text-slate-700">{p.oilAndGas.summary}</p>
              <ul className="grid gap-4 md:grid-cols-2">{p.oilAndGas.programs.map((t) => <ProgramCard key={t.name} p={t} />)}</ul>
              <Link href="/industries/oil-gas" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Oil & Gas industry hub <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </>
          ),
        }]
      : []),
    {
      label: "Rules",
      count: p.regulations.length,
      content: (
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
      ),
    },
    { label: "Forms", count: p.forms.length, content: <LinkList links={p.forms} /> },
    { label: "Guidance", count: p.guidance.length, content: <LinkList links={p.guidance} /> },
    {
      label: "Contacts",
      content: (
        <div className="space-y-6">
          <dl className="divide-y divide-line rounded-xl border border-line text-sm">
            {[
              { k: "Agency", v: <a href={p.agency.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{p.agency.name}</a> },
              ...(p.agency.division ? [{ k: "Division", v: p.agency.division }] : []),
              ...(p.agency.permitsUrl ? [{ k: "Air permits page", v: <a href={p.agency.permitsUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline">{p.agency.permitsUrl}</a> }] : []),
              ...(p.ePermitting ? [{ k: "Online permitting", v: <a href={p.ePermitting.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{p.ePermitting.name}</a> }] : []),
              ...(p.fees ? [{ k: "Fees", v: <a href={p.fees.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{p.fees.name}</a> }] : []),
              { k: "EPA region", v: `Region ${p.epaRegion}` },
            ].map(({ k, v }) => (
              <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="font-medium text-muted">{k}</dt>
                <dd className="min-w-0 text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {p.localAgencies && p.localAgencies.length > 0 && (
            <Block title="Local air agencies" icon={<Building2 className="h-5 w-5 text-brand-500" aria-hidden="true" />}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.localAgencies.map((l) => (
                  <li key={l.url} className="rounded-xl border border-line p-4 text-sm">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">{l.name}</a>
                    <p className="text-muted">{l.jurisdiction}</p>
                    {l.notes && <p className="mt-1 text-xs text-slate-600">{l.notes}</p>}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          <p className="text-sm text-muted">AirPermitHub links to agency pages only; it does not list individual staff contacts.</p>
        </div>
      ),
    },
    {
      label: "Sources",
      count: p.sources.length,
      content: (
        <>
          <LinkList links={p.sources} />
          {p.notes && p.verification === "verified" && <p className="mt-4 text-sm text-muted"><span className="font-semibold text-ink">Editorial note: </span>{p.notes}</p>}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "States", href: "/states" }, { label: tile.name }]}
        eyebrow={`${p.code} · EPA Region ${p.epaRegion}`}
        title={short ? `${p.name} Air Permits – ${short}` : `${p.name} Air Permits`}
        icon={<Landmark className="h-7 w-7" />}
        description={p.agency.name}
      >
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge level={p.verification} />
          <Badge tone="gray">Last reviewed {p.lastReviewed}</Badge>
          <a href={p.agency.url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>Visit {short ?? "agency"} website <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
        </div>
      </PageHeader>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {p.verification !== "verified" && (
            <VerifyNotice>
              <strong className="font-semibold">Partially verified.</strong> {p.notes ?? "Some details on this page could not be confirmed against the agency's site."}
            </VerifyNotice>
          )}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <Tabs variant="underline" printAll tabs={tabs} />
          </div>
          <Disclaimer />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
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
          <VerifyNotice>
            {p.verification === "verified"
              ? `Content checked against ${p.agency.name.replace(/ \(.*\)/, "")} pages on ${p.lastReviewed}.`
              : `Partially verified on ${p.lastReviewed}. See the note on what could not be confirmed.`}{" "}
            Rules change; confirm with the agency before relying on it.
          </VerifyNotice>
          <Link href="/permit-finder" className={buttonClass("secondary", "md", "w-full")}>Screen a {p.name} facility <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </aside>
      </div>
    </>
  );
}
