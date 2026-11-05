import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProblemSolvers } from "@/components/home/ProblemSolvers";
import { IndustriesAndRegulations } from "@/components/home/IndustriesAndRegulations";
import { Audiences, FinalCta, LatestResources } from "@/components/home/LowerSections";
import { FieldCoverage, ProductPreviews, WorkspaceSection } from "@/components/home/PhotoSections";
import { ToolCards } from "@/components/home/ToolCards";
import { StateExplorer } from "@/components/states/StateExplorer";
import { SectionHeading } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Notices";
import { stateMapProfiles } from "@/lib/data/state-profiles";

export default function HomePage() {
  const profiles = stateMapProfiles();
  return (
    <>
      <Hero stateCount={profiles.length} />
      <div className="bg-canvas">
        <ToolCards />
      </div>
      <ProductPreviews />
      <HowItWorks />
      <ProblemSolvers />
      <IndustriesAndRegulations />
      <FieldCoverage />
      <section className="bg-canvas py-16 sm:py-20" aria-labelledby="states-heading">
        <div className="container-page">
          <SectionHeading
            id="states-heading"
            eyebrow="State Explorer"
            title="Explore by State"
            description="Select a state to see its air agency, permit programs, and official forms and guidance."
            action={{ label: "All states", href: "/states" }}
          />
          <StateExplorer profiles={profiles} compact />
        </div>
      </section>
      <WorkspaceSection />
      <Audiences />
      <LatestResources />
      <FinalCta />
      <div className="bg-canvas py-6">
        <div className="container-page"><Disclaimer /></div>
      </div>
    </>
  );
}
