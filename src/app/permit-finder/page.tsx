import type { Metadata } from "next";
import { Route } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermitFinderWizard } from "@/components/permit-finder/PermitFinderWizard";
import { stateProfileSummaries } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Permit Finder: Screen Your Air Permitting Path",
  description: "Screen potential air permitting pathways by state, industry, facility type, and equipment. Preliminary screening with citations and next steps.",
  alternates: { canonical: "/permit-finder" },
};

export default function PermitFinderPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Permit Finder" }]}
        eyebrow="Screening tool"
        title="Permit Finder"
        icon={<Route className="h-7 w-7" />}
        description="Answer four questions to see which authorization options and federal programs deserve a closer look. Results are screening pointers with citations, not determinations."
      />
      <div className="container-page py-10">
        <PermitFinderWizard profiles={stateProfileSummaries()} />
      </div>
    </>
  );
}
