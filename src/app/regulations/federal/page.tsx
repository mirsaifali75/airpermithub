import type { Metadata } from "next";
import { ArrowRight, Landmark, ScrollText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegulationCard } from "@/components/regulations/RegulationCard";
import { Disclaimer, VerifyNotice } from "@/components/ui/Notices";
import { federalRegulations } from "@/lib/data/regulations";

export const metadata: Metadata = {
  title: "Federal Air Regulations (EPA)",
  description: "Federal Clean Air Act programs for stationary sources: NSPS, NESHAP, Title V, NSR, PSD, Nonattainment NSR, and AP-42 emission factors.",
  alternates: { canonical: "/regulations/federal" },
};

export default function FederalPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Regulations", href: "/regulations" }, { label: "Federal" }]}
        eyebrow="Federal EPA"
        title="Federal Air Programs"
        icon={<Landmark className="h-7 w-7" />}
        description="The federal stationary-source programs most air permits trace back to. Most are implemented through state agencies, so always check the state hub too."
      />
      <div className="container-page space-y-8 py-12">
        <VerifyNotice>Program summaries are AirPermitHub orientation text. The Code of Federal Regulations and the agency with jurisdiction are the authority.</VerifyNotice>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {federalRegulations.map((r) => <li key={r.slug}><RegulationCard reg={r} /></li>)}
        </ul>
        <Link href="/regulations/library" className="group flex flex-col gap-3 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-3">
            <ScrollText className="mt-0.5 h-6 w-6 shrink-0 text-cyan-400" aria-hidden="true" />
            <span>
              <span className="block font-bold">Federal Rule Library</span>
              <span className="block text-sm text-white/80">NSPS, NESHAP, and GHG reporting subparts: who each covers in eCFR&apos;s words, every section, and amendment dates.</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-300 group-hover:text-white">Browse subparts <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
        <Disclaimer />
      </div>
    </>
  );
}
