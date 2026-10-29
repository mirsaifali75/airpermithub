import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProblemSolvers } from "@/components/home/ProblemSolvers";
import { IndustriesAndRegulations } from "@/components/home/IndustriesAndRegulations";
import { Audiences, FinalCta, LatestJobs, LatestResources } from "@/components/home/LowerSections";
import { SectorStrip } from "@/components/home/SectorStrip";
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
      <SectorStrip />
      <ProblemSolvers />
      <IndustriesAndRegulations />
      <HowItWorks />
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
      <Audiences />
      <LatestResources />
      <LatestJobs />
      <FinalCta />
      <div className="bg-canvas py-6">
        <div className="container-page"><Disclaimer /></div>
      </div>
    </>
  );
}
