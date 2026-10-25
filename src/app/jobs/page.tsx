import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { JobBoard } from "@/components/jobs/JobBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoNotice } from "@/components/ui/Notices";
import { jobCategories } from "@/lib/data/jobs";

export const metadata: Metadata = {
  title: "Air Permit & Air Quality Jobs",
  description: "Air quality engineer, air permitting, EHS, environmental compliance, and LDAR jobs.",
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Jobs" }]} eyebrow="Careers" title="Air Permit Jobs" icon={<Briefcase className="h-7 w-7" />} description="Roles for air quality engineers, permitting specialists, EHS professionals, consultants, and technicians.">
        <ul className="flex flex-wrap gap-2">
          {jobCategories.slice(0, 8).map((c) => <li key={c}><span className="glass-dark inline-block rounded-full px-3 py-1 text-xs text-white/85">{c}</span></li>)}
        </ul>
      </PageHeader>
      <div className="container-page space-y-6 py-10">
        <DemoNotice>The job board is in preview. Listings below are fictional samples that show how real postings will appear. Employers can <Link href="/contact" className="font-semibold underline">contact us</Link> about posting.</DemoNotice>
        <JobBoard />
      </div>
    </>
  );
}
