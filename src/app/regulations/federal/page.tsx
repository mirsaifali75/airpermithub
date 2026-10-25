import type { Metadata } from "next";
import { Landmark } from "lucide-react";
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
        <Disclaimer />
      </div>
    </>
  );
}
