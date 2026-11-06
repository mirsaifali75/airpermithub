import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProblemSolvers } from "@/components/home/ProblemSolvers";
import { IndustriesAndRegulations } from "@/components/home/IndustriesAndRegulations";
import { Audiences, FinalCta, LatestJobs, LatestResources } from "@/components/home/LowerSections";
import { FieldCoverage, ProductPreviews, WorkspaceSection } from "@/components/home/PhotoSections";
import { HowWeVerify, MembersMap, StatementBand, TrustRow, WhatWeCover } from "@/components/home/ClassicSections";
import { SectorStrip } from "@/components/home/SectorStrip";
import { ToolCards } from "@/components/home/ToolCards";
import { StateExplorer } from "@/components/states/StateExplorer";
import { Disclaimer } from "@/components/ui/Notices";
import { stateMapProfiles } from "@/lib/data/state-profiles";

/** Home page in the Option E (classic) design. Every earlier section is kept; E's sections are added around them. */
export default function HomePage() {
  const profiles = stateMapProfiles();
  return (
    <>
      <Hero stateCount={profiles.length} />
      <TrustRow stateCount={profiles.length} />
      <WhatWeCover />
      <div className="bg-canvas">
        <ToolCards />
      </div>
      <MembersMap>
        <StateExplorer profiles={profiles} compact />
      </MembersMap>
      <ProductPreviews />
      <StatementBand />
      <HowItWorks />
      <ProblemSolvers />
      <IndustriesAndRegulations />
      <SectorStrip />
      <FieldCoverage />
      <WorkspaceSection />
      <Audiences />
      <LatestResources />
      <LatestJobs />
      <HowWeVerify />
      <FinalCta />
      <div className="bg-canvas py-6">
        <div className="container-page"><Disclaimer /></div>
      </div>
    </>
  );
}
