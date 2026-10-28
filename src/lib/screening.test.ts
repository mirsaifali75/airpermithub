import { describe, expect, it } from "vitest";
import { equipmentOptions } from "./data/equipment";
import { stateProfileSummaries } from "./data/state-profiles";
import { screen, type ScreeningInput } from "./screening";

const profiles = stateProfileSummaries();
const allowed = new Set(["potentially-applicable", "likely-not-applicable", "more-info-needed"]);

const base: ScreeningInput = { state: "texas", industry: "Oil & Gas", facilityType: "Tank Battery", equipment: ["Storage Tanks", "Engines"] };

describe("screening", () => {
  it("loads every state profile", () => {
    expect(profiles.length).toBe(51);
  });

  it.each(profiles.map((p) => [p.slug]))("never concludes a permit is required (%s)", (slug) => {
    const r = screen({ ...base, state: slug, equipment: [...equipmentOptions] }, profiles);
    for (const item of [...r.pathways, ...r.federalRules]) {
      expect(allowed.has(item.status)).toBe(true);
      // Program names and descriptions come from the cited state data; our own next-step text never concludes.
      expect(item.nextStep.toLowerCase()).not.toMatch(/permit is required|you must obtain/);
    }
  });

  it("keeps major-source programs at more-info-needed", () => {
    const r = screen(base, profiles);
    const major = r.pathways.filter((p) => /title v|psd|prevention of significant|nonattainment/i.test(p.title));
    expect(major.length).toBeGreaterThan(0);
    for (const p of major) expect(p.status).toBe("more-info-needed");
  });

  it("flags every federal rule as more-info-needed", () => {
    const r = screen({ ...base, equipment: [...equipmentOptions] }, profiles);
    expect(r.federalRules.length).toBeGreaterThan(0);
    for (const f of r.federalRules) expect(f.status).toBe("more-info-needed");
  });

  it("only points oil and gas NSPS at oil and gas industries", () => {
    const og = screen(base, profiles).federalRules.map((f) => f.citation);
    const mfg = screen({ ...base, industry: "Manufacturing" }, profiles).federalRules.map((f) => f.citation);
    expect(og.some((c) => c?.includes("OOOO"))).toBe(true);
    expect(mfg.some((c) => c?.includes("OOOO"))).toBe(false);
  });

  it("returns no federal pointers when no equipment is selected", () => {
    expect(screen({ ...base, equipment: [] }, profiles).federalRules).toEqual([]);
  });

  it("adds a data gap when the state is not in the dataset", () => {
    const r = screen({ ...base, state: "atlantis" }, profiles);
    expect(r.dataGaps[0]).toMatch(/not yet in AirPermitHub/);
    expect(r.pathways.length).toBeGreaterThan(0);
  });

  it("changes the PTE data gap when PTE is known", () => {
    const unknown = screen(base, profiles).dataGaps.join(" ");
    const known = screen({ ...base, pteKnown: "yes" }, profiles).dataGaps.join(" ");
    expect(unknown).toMatch(/use the Emission Calculator/);
    expect(known).not.toMatch(/use the Emission Calculator/);
  });

  it("adds considerations from the operations answers, with no numbers", () => {
    const r = screen({ ...base, project: "new", existingAuthorization: "unsure", controls: ["Flare"], schedule: "limited" }, profiles);
    expect(r.considerations.length).toBe(4);
    for (const c of r.considerations) expect(c.body).not.toMatch(/\d/);
  });

  it("adds no control consideration when the only control is None", () => {
    const r = screen({ ...base, controls: ["None"] }, profiles);
    expect(r.considerations.some((c) => c.title.startsWith("Controls"))).toBe(false);
  });
});
