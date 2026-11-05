import { describe, expect, it } from "vitest";
import { camCsv, camScreen, missingPlan, type CamUnit } from "./cam";
import { invCsv, invRow, invSummary, type InvRow } from "./inventory";

let n = 0;
const inv = (p: Partial<InvRow>): InvRow => ({ id: String(++n), unit: "B-1", description: "", pollutant: "NOx", name: "", activity: null, activityUnits: "MMscf/yr", factor: null, factorSource: "", control: null, controlApplies: true, otherTpy: null, method: "", ...p });

describe("emission inventory", () => {
  it("multiplies activity by lb factor and divides by 2,000", () => {
    const x = invRow(inv({ activity: 1000, factor: 2, control: 50 }));
    expect(x.tpy).toBeCloseTo(0.5);
    expect(x.steps).toContain("÷ 2,000 lb/ton = 0.5 tpy");
  });
  it("uses an other-method value instead of the factor", () => {
    expect(invRow(inv({ otherTpy: 3, method: "CEMS" })).steps).toBe("3 tpy by CEMS");
    expect(invRow(inv({ otherTpy: 3, factor: 2, activity: 1 })).problems[0]).toMatch(/other-method value is used/);
  });
  it("skips control that is not marked as applying", () => {
    expect(invRow(inv({ activity: 2000, factor: 1, control: 90, controlApplies: false })).tpy).toBe(1);
  });
  it("totals by pollutant and HAP by name", () => {
    const s = invSummary([
      inv({ activity: 2000, factor: 1 }), inv({ otherTpy: 2 }),
      inv({ pollutant: "HAP", name: "Formaldehyde", otherTpy: 0.5 }), inv({ pollutant: "HAP", name: " formaldehyde", otherTpy: 0.25 }), inv({ pollutant: "HAP", otherTpy: 0.1 }),
      inv({}),
    ]);
    expect(s.totals.find((t) => t.label === "NOx")!.tpy).toBe(3);
    expect(s.haps[0]).toMatchObject({ label: "Formaldehyde", tpy: 0.75 });
    expect(s.hapTotal).toBeCloseTo(0.85);
    expect(s.incomplete).toBe(1);
    expect(invCsv([inv({ otherTpy: 2 })], "F", "2026")).toContain("Inventory year,2026");
  });
});

const cam = (p: Partial<CamUnit>): CamUnit => ({ id: "c", unit: "EU-1", pollutant: "PM", limit: "Permit 3.1", subjectToLimit: "yes", exempt: "no", usesControl: "yes", precontrol: 150, majorAmount: 100, controlDevice: "", indicators: "", range: "", rangeBasis: "", performance: "", frequency: "", excursion: "", response: "", records: "", ...p });

describe("CAM screen (40 CFR 64.2(a))", () => {
  it("meets when all three criteria hold and pre-control PTE is at least 100% of the major amount", () => {
    expect(camScreen(cam({}), "yes").status).toBe("meets");
    expect(camScreen(cam({ precontrol: 100 }), "yes").status).toBe("meets");
  });
  it("fails on any criterion", () => {
    expect(camScreen(cam({ precontrol: 99 }), "yes").status).toBe("does-not-meet");
    expect(camScreen(cam({ usesControl: "no" }), "yes").status).toBe("does-not-meet");
    expect(camScreen(cam({ exempt: "yes" }), "yes").status).toBe("does-not-meet");
  });
  it("asks for what is unknown", () => {
    const r = camScreen(cam({ exempt: "unknown", majorAmount: null }), "unknown");
    expect(r.status).toBe("more-info");
    expect(r.reasons).toHaveLength(3);
  });
  it("does not reach a source that is not a Part 70/71 major source", () => {
    expect(camScreen(cam({}), "no").status).toBe("not-major");
  });
  it("lists missing plan items and exports", () => {
    expect(missingPlan(cam({ indicators: "Pressure drop" }))).not.toContain("Indicator(s) of performance");
    expect(camCsv([cam({})], "yes", "F")).toContain("Meets all 64.2(a) criteria");
  });
});
