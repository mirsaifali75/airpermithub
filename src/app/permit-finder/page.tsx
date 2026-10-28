import type { Metadata } from "next";
import { Route } from "lucide-react";
import { HelpSidebar } from "@/components/layout/HelpSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermitFinderWizard } from "@/components/permit-finder/PermitFinderWizard";
import { stateProfileSummaries } from "@/lib/data/state-profiles";

export const metadata: Metadata = {
  title: "Permit Finder: Screen Your Air Permitting Path",
  description: "Find the right air permit path for your facility. Guided questions on facility, location, emission sources, and operations return state and federal programs to review, with citations.",
  alternates: { canonical: "/permit-finder" },
};

export default function PermitFinderPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Permit Finder" }]}
        title="Permit Finder"
        icon={<Route />}
        scene="refinery"
        description="Find the right permit path for your facility. Guided questions based on federal and state regulations; results are screening pointers with citations, not determinations."
      />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <PermitFinderWizard profiles={stateProfileSummaries()} />
        </div>
        <HelpSidebar />
      </div>
    </>
  );
}
