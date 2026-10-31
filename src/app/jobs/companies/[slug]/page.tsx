import type { Metadata } from "next";
import { Briefcase, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Scene } from "@/components/illustrations/Scene";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import { JobBoard } from "@/components/jobs/JobBoard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DemoBadge } from "@/components/ui/Badge";
import { DemoNotice, EmptyState } from "@/components/ui/Notices";
import { Tabs } from "@/components/ui/Tabs";
import { demoCompanies, demoJobs, getCompany } from "@/lib/data/jobs";
import type { SceneKind } from "@/components/illustrations/Scene";

export function generateStaticParams() {
  return demoCompanies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCompany((await params).slug);
  return c ? { title: `${c.name} – Company page preview`, robots: { index: false } } : {};
}

const sceneFor = (kind: string): SceneKind =>
  kind.startsWith("Midstream") ? "midstream" : kind.startsWith("Refining") ? "refinery" : kind.startsWith("Power") ? "power" : kind.startsWith("Chemical") ? "chemical" : kind.startsWith("Mining") ? "mining" : kind.startsWith("Environmental") ? "industrial" : "oil-gas";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompany((await params).slug);
  if (!c) notFound();
  const jobs = demoJobs.filter((j) => j.company === c.name);
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-950 pt-40 text-white lg:pt-48">
        <Scene kind={sceneFor(c.kind)} className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/90 via-navy-950/60 to-transparent" />
        <div className="container-page pb-6">
          <Breadcrumbs items={[{ label: "Jobs", href: "/jobs" }, { label: c.name }]} />
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end">
            <span className="rounded-2xl bg-white p-1.5 shadow-lift"><CompanyLogo company={c.name} size="lg" /></span>
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{c.name}</h1>
              <p className="mt-1 text-white/75">{c.kind}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin className="h-4 w-4" aria-hidden="true" />{c.hq} (headquarters)</p>
            </div>
            <DemoBadge>Fictional company</DemoBadge>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:max-w-md">
            <div className="glass-dark px-5 py-3"><dt className="text-xs text-white/60">Open jobs</dt><dd className="font-display text-2xl font-extrabold">{jobs.length}</dd></div>
            <div className="glass-dark px-5 py-3"><dt className="text-xs text-white/60">Locations</dt><dd className="font-display text-2xl font-extrabold">{c.locations.length}</dd></div>
          </dl>
        </div>
      </section>
      <div className="container-page space-y-6 py-8">
        <DemoNotice>This company and its listings are fictional. Company pages show how employers will present themselves once employer accounts launch.</DemoNotice>
        <Tabs
          tabs={[
            {
              label: "Overview",
              content: (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-ink">Current openings ({jobs.length})</h2>
                    <JobBoard jobs={jobs} compact />
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
                    <h2 className="font-bold text-ink">About</h2>
                    <p className="mt-2 text-sm text-muted">{c.about}</p>
                  </div>
                </div>
              ),
            },
            { label: "Jobs", count: jobs.length, content: <JobBoard jobs={jobs} /> },
            {
              label: "Locations",
              count: c.locations.length,
              content: (
                <ul className="grid gap-3 sm:grid-cols-3">
                  {c.locations.map((l) => (
                    <li key={l} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card"><MapPin className="h-5 w-5 text-brand-500" aria-hidden="true" /><span className="font-semibold text-ink">{l}</span></li>
                  ))}
                </ul>
              ),
            },
            { label: "About", content: <div className="max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card text-slate-700">{c.about}</div> },
            { label: "News", content: <EmptyState icon={<Briefcase className="h-6 w-6" />} title="No news yet">Employer news and announcements will appear here.</EmptyState> },
          ]}
        />
      </div>
    </>
  );
}
