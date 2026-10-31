import type { Metadata } from "next";
import { Briefcase, Building2, ExternalLink, Landmark } from "lucide-react";
import Link from "next/link";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import { JobBoard } from "@/components/jobs/JobBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoNotice } from "@/components/ui/Notices";
import { demoCompanies, demoJobs, publicJobBoards } from "@/lib/data/jobs";

export const metadata: Metadata = {
  title: "Air Quality Jobs: Air Permitting & Environmental Roles",
  description: "A preview of the AirPermitHub job board for air permitting, air quality engineering, EHS, compliance, consulting, and LDAR roles, with links to official public job boards.",
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Jobs" }]} title="Air Quality Jobs" icon={<Briefcase />} scene="oil-gas" description="A job board for air permitting and environmental roles is in preview. Until employers post real roles, the listings here are fictional samples." />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <DemoNotice>Every company and listing on this board is fictional sample data, shown so you can try the search and filters. None of them is a real opening. Employers can <Link href="/contact" className="font-semibold underline">contact us</Link> about posting real roles.</DemoNotice>
          <section aria-labelledby="real-boards" className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 id="real-boards" className="flex items-center gap-2 font-bold text-ink"><Landmark className="h-5 w-5 text-brand-500" aria-hidden="true" /> Real openings today</h2>
            <p className="mt-1 text-sm text-muted">Official public employer sites that list air quality and environmental jobs. They open in a new tab; AirPermitHub isn&apos;t affiliated with them.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {publicJobBoards.map((b) => (
                <li key={b.url}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-start justify-between gap-2 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-brand-50/40">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-brand-700">{b.name}</span>
                      <span className="block text-xs text-muted">{b.note}</span>
                    </span>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <JobBoard />
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-navy-900 p-5 text-white">
            <p className="font-semibold">Hiring air quality talent?</p>
            <p className="mt-1 text-sm text-white/70">Job posting opens with employer accounts.</p>
            <Link href="/contact" className="mt-3 inline-block text-sm font-semibold text-cyan-400">Get notified →</Link>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-bold text-ink"><Building2 className="h-5 w-5 text-brand-500" aria-hidden="true" /> Sample employers</h2>
            <p className="mt-1 text-xs text-muted">Fictional companies that preview employer pages.</p>
            <ul className="mt-3 space-y-2">
              {demoCompanies.slice(0, 6).map((c) => {
                const n = demoJobs.filter((j) => j.company === c.name).length;
                return (
                  <li key={c.slug}>
                    <Link href={`/jobs/companies/${c.slug}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-canvas">
                      <span className="scale-75"><CompanyLogo company={c.name} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug font-semibold text-ink">{c.name}</span>
                        <span className="block text-xs text-muted">{n} sample {n === 1 ? "listing" : "listings"}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
