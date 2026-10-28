import type { Metadata } from "next";
import { Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import { JobBoard } from "@/components/jobs/JobBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoNotice } from "@/components/ui/Notices";
import { demoCompanies, demoJobs } from "@/lib/data/jobs";

export const metadata: Metadata = {
  title: "Air Quality Jobs: Air Permitting & Environmental Roles",
  description: "Find air permitting, air quality engineering, EHS, environmental compliance, consulting, and LDAR roles.",
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Jobs" }]} title="Air Quality Jobs" icon={<Briefcase />} scene="oil-gas" description="Find air permitting and environmental roles across operators, midstream, refining, power, and consulting." />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <DemoNotice>The job board is in preview. Every company and listing shown is fictional sample data. Employers can <Link href="/contact" className="font-semibold underline">contact us</Link> about posting real roles.</DemoNotice>
          <JobBoard />
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-bold text-ink"><Building2 className="h-5 w-5 text-brand-500" aria-hidden="true" /> Employers</h2>
            <ul className="mt-3 space-y-2">
              {demoCompanies.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/jobs/companies/${c.slug}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-canvas">
                    <span className="scale-75"><CompanyLogo company={c.name} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                      <span className="block text-xs text-muted">{demoJobs.filter((j) => j.company === c.name).length} open roles</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-navy-900 p-5 text-white">
            <p className="font-semibold">Hiring air quality talent?</p>
            <p className="mt-1 text-sm text-white/70">Job posting opens with employer accounts.</p>
            <Link href="/contact" className="mt-3 inline-block text-sm font-semibold text-cyan-400">Get notified →</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
