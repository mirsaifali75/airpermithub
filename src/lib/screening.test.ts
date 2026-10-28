import { describe, expect, it } from "vitest";
import { equipmentOptions } from "./data/equipment";
import { stateProfileSummaries } from "./data/state-profiles";
import { screen, type ScreeningInput } from "./screening";

const profiles = stateProfileSummaries();
const allowed = new Set(["potentially-applicable", "likely-not-applicable", "more-info-needed", "insufficient-info"]);

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

  describe("four outcomes", () => {
    const all = (r: ReturnType<typeof screen>) => [...r.pathways, ...r.federalRules];
    const find = (r: ReturnType<typeof screen>, re: RegExp) => all(r).filter((i) => re.test(`${i.title} ${i.citation ?? ""}`));

    it("marks major-source programs insufficient when PTE is unknown", () => {
      const r = screen({ ...base, pteKnown: "no" }, profiles);
      const major = r.pathways.filter((p) => /title v/i.test(p.title));
      expect(major.length).toBeGreaterThan(0);
      for (const p of major) expect(p.status).toBe("insufficient-info");
    });

    it("marks PSD insufficient when attainment status is unsure", () => {
      const r = screen({ ...base, pteKnown: "yes", attainment: "unsure" }, profiles);
      for (const p of find(r, /prevention of significant|\bpsd\b/i)) expect(p.status).toBe("insufficient-info");
    });

    it("marks nonattainment NSR likely not applicable only when the user says all-attainment", () => {
      const nm = profiles.find((p) => p.permitTypes.some((t) => t.type === "nnsr"));
      expect(nm).toBeDefined();
      const yes = screen({ ...base, state: nm!.slug, pteKnown: "yes", attainment: "all-attainment" }, profiles);
      const unsure = screen({ ...base, state: nm!.slug, pteKnown: "yes", attainment: "some-nonattainment" }, profiles);
      const nnsrName = nm!.permitTypes.find((t) => t.type === "nnsr")!.name;
      expect(yes.pathways.find((p) => p.title === nnsrName)?.status).toBe("likely-not-applicable");
      expect(unsure.pathways.find((p) => p.title === nnsrName)?.status).toBe("more-info-needed");
    });

    it("marks date-driven NSPS insufficient when dates are unknown", () => {
      const r = screen({ ...base, datesKnown: "no" }, profiles);
      for (const f of find(r, /OOOO|Kb|IIII/)) expect(f.status).toBe("insufficient-info");
    });

    it("marks the major-source boiler NESHAP likely not applicable for an area source", () => {
      const r = screen({ ...base, equipment: ["Heaters"], hapStatus: "area" }, profiles);
      expect(find(r, /DDDDD/)[0]?.status).toBe("likely-not-applicable");
      expect(find(screen({ ...base, equipment: ["Heaters"], hapStatus: "unsure" }, profiles), /DDDDD/)[0]?.status).toBe("insufficient-info");
      expect(find(screen({ ...base, equipment: ["Heaters"], hapStatus: "major" }, profiles), /DDDDD/)[0]?.status).toBe("more-info-needed");
    });

    it("lists state oil and gas programs as likely not applicable for other industries", () => {
      const og = screen(base, profiles).pathways.filter((p) => p.program.endsWith("oil & gas"));
      const mfg = screen({ ...base, industry: "Manufacturing" }, profiles).pathways.filter((p) => p.program.endsWith("oil & gas"));
      expect(og.length).toBeGreaterThan(0);
      expect(og.every((p) => p.status !== "likely-not-applicable")).toBe(true);
      expect(mfg.length).toBe(og.length);
      expect(mfg.every((p) => p.status === "likely-not-applicable")).toBe(true);
    });

    it("never marks anything likely not applicable without a user answer behind it", () => {
      const r = screen({ ...base, equipment: [...equipmentOptions] }, profiles);
      expect(all(r).some((i) => i.status === "likely-not-applicable")).toBe(false);
    });

    it("updates data gaps from the applicability answers", () => {
      const r = screen({ ...base, datesKnown: "yes", attainment: "all-attainment", hapStatus: "unsure" }, profiles).dataGaps.join(" ");
      expect(r).toMatch(/applicability dates in each flagged subpart/);
      expect(r).toMatch(/40 CFR Part 81/);
      expect(r).toMatch(/major or area source of hazardous air pollutants/);
    });
  });
});
