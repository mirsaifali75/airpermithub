import { Hero } from "@/components/home/Hero";
import { IndustriesAndRegulations } from "@/components/home/IndustriesAndRegulations";
import { Audiences, FinalCta, LatestJobs, LatestResources } from "@/components/home/LowerSections";
import { ToolCards } from "@/components/home/ToolCards";
import { StateTileMap } from "@/components/states/StateTileMap";
import { SectionHeading } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Notices";
import { stateMapProfiles } from "@/lib/data/state-profiles";

export default function HomePage() {
  const profiles = stateMapProfiles();
  return (
    <>
      <Hero liveStates={profiles.map((p) => p.name).sort((a, b) => (a === "Texas" ? -1 : b === "Texas" ? 1 : a.localeCompare(b)))} />
      <ToolCards />
      <IndustriesAndRegulations />
      <section className="bg-canvas py-16 sm:py-20" aria-labelledby="states-heading">
        <div className="container-page">
          <SectionHeading
            id="states-heading"
            eyebrow="State regulatory hubs"
            title="Explore by State"
            description="Select a state to see its air agency, permit programs, and official forms and guidance."
            action={{ label: "All state hubs", href: "/states" }}
          />
          <StateTileMap profiles={profiles} />
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
