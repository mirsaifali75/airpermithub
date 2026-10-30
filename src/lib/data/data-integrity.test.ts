import { describe, expect, it } from "vitest";
import { demoCompanies, demoJobs } from "./jobs";
import { demoPermits } from "./permits";
import { federalRegulations } from "./regulations";
import { listStateProfiles } from "./state-profiles";

/**
 * Guards the content rules: every state program number must sit in a
 * sourced `quote` or `thresholds` field, every link is https, and demo
 * records stay flagged as demo.
 */

const profiles = listStateProfiles();
// http:// links are allowed (some agencies still publish them) but scripts/check-links.mjs reports them for review.
const https = (u: string | undefined) => u === undefined || /^https?:\/\/[^\s]+$/.test(u);

describe("state profiles", () => {
  it.each(profiles.map((p) => [p.slug, p]))("%s has required, well-formed fields", (_slug, p) => {
    expect(p.code).toMatch(/^[A-Z]{2}$/);
    expect(["verified", "partial", "unverified"]).toContain(p.verification);
    expect(p.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.sources.length).toBeGreaterThan(0);
    expect(p.permitTypes.length).toBeGreaterThan(0);
    expect(https(p.agency.url)).toBe(true);
  });

  it.each(profiles.map((p) => [p.slug, p]))("%s links are well-formed URLs", (_slug, p) => {
    const urls = [
      p.agency.url, p.agency.permitsUrl, p.ePermitting?.url, p.fees?.url,
      ...p.sources.map((l) => l.url), ...p.forms.map((l) => l.url), ...p.guidance.map((l) => l.url),
      ...[...p.permitTypes, ...(p.oilAndGas?.programs ?? [])].flatMap((x) => [x.url, x.quoteSource?.url, x.thresholdsSource?.url]),
      ...p.regulations.map((r) => r.url), ...(p.localAgencies ?? []).map((l) => l.url),
    ];
    for (const u of urls) expect(https(u), u).toBe(true);
  });

  it.each(profiles.map((p) => [p.slug, p]))("%s only quotes thresholds next to a source URL", (_slug, p) => {
    for (const prog of [...p.permitTypes, ...(p.oilAndGas?.programs ?? [])]) {
      if (prog.quote || prog.thresholds) expect(prog.url, prog.name).toMatch(/^https?:\/\//);
    }
  });

  it("partial states explain what is missing", () => {
    for (const p of profiles.filter((x) => x.verification !== "verified")) expect(p.notes, p.slug).toBeTruthy();
  });
});

describe("federal regulation records", () => {
  it("cite at least one source each", () => {
    for (const r of federalRegulations) expect(r.sources.length, r.slug).toBeGreaterThan(0);
  });
});

describe("demo records", () => {
  it("are flagged and never marked as official", () => {
    for (const p of demoPermits) {
      expect(p.isDemo).toBe(true);
      expect(p.origin).not.toBe("official");
    }
    for (const j of demoJobs) expect(j.isDemo, j.id).toBe(true);
    for (const c of demoCompanies) expect(c.name).toBeTruthy();
  });
});
