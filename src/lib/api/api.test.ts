import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { validateScreening } from "./validate-screening";

const slugs = new Set(["texas", "new-mexico"]);
const good = { state: "texas", industry: "Oil & Gas", facilityType: "Tank Battery", equipment: ["Storage Tanks"] };

describe("validateScreening", () => {
  it("accepts a minimal valid body", () => {
    const r = validateScreening(good, slugs);
    expect(r.ok).toBe(true);
  });

  it("accepts the applicability answers", () => {
    const r = validateScreening({ ...good, pollutants: ["NOx", "VOC"], datesKnown: "no", attainment: "unsure", hapStatus: "area" }, slugs);
    expect(r.ok && r.value.hapStatus).toBe("area");
  });

  it("drops unknown fields and de-duplicates lists", () => {
    const r = validateScreening({ ...good, equipment: ["Storage Tanks", "Storage Tanks"], admin: true }, slugs);
    expect(r.ok && r.value).toEqual({ ...good, county: undefined, controls: undefined, project: undefined, existingAuthorization: undefined, pteKnown: undefined, schedule: undefined, pollutants: undefined, datesKnown: undefined, attainment: undefined, hapStatus: undefined });
  });

  it.each([
    ["non-object", "nope"],
    ["array", []],
    ["unknown state", { ...good, state: "atlantis" }],
    ["unknown industry", { ...good, industry: "Space" }],
    ["missing facility type", { ...good, facilityType: "" }],
    ["long facility type", { ...good, facilityType: "x".repeat(500) }],
    ["unknown equipment", { ...good, equipment: ["Death Ray"] }],
    ["equipment not a list", { ...good, equipment: "Storage Tanks" }],
    ["bad project", { ...good, project: "maybe" }],
    ["bad schedule", { ...good, schedule: 3 }],
    ["unknown pollutant", { ...good, pollutants: ["Kryptonite"] }],
    ["bad attainment", { ...good, attainment: "maybe" }],
    ["bad HAP status", { ...good, hapStatus: "minor" }],
    ["huge controls list", { ...good, controls: Array.from({ length: 100 }, (_, i) => `c${i}`) }],
  ])("rejects %s", (_label, body) => {
    expect(validateScreening(body, slugs).ok).toBe(false);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 10).allowed).toBe(true);
    const blocked = rl.check("a", 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(rl.check("b", 20).allowed).toBe(true);
    expect(rl.check("a", 1000).allowed).toBe(true);
  });

  it("keeps memory bounded", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 3 });
    for (const k of ["a", "b", "c", "d"]) rl.check(k, 0);
    // "a" was evicted, so it starts a fresh window.
    expect(rl.check("a", 1).allowed).toBe(true);
  });
});
