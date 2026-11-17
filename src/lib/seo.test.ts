import { describe, expect, it } from "vitest";
import { clip, DESCRIPTION_MAX, withSocial } from "./seo";

describe("clip", () => {
  it("leaves short text alone", () => {
    expect(clip("Short text.")).toBe("Short text.");
  });
  it("cuts long text at a word boundary within the limit", () => {
    const long = "word ".repeat(80);
    const out = clip(long);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith("word…")).toBe(true);
  });
  it("collapses whitespace", () => {
    expect(clip("a\n  b")).toBe("a b");
  });
});

describe("withSocial", () => {
  it("gives the page its own og/twitter title, description, url and image", () => {
    const m = withSocial({ title: "Texas Air Permit Requirements (TCEQ)", description: "Desc.", alternates: { canonical: "/states/texas" } });
    expect(m.openGraph).toMatchObject({ title: "Texas Air Permit Requirements (TCEQ) | AirPermitHub", description: "Desc.", url: "/states/texas" });
    expect(m.openGraph?.images).toBeTruthy();
    expect(m.twitter).toMatchObject({ title: "Texas Air Permit Requirements (TCEQ) | AirPermitHub", card: "summary_large_image" });
  });
  it("keeps page-set og fields and absolute titles", () => {
    const m = withSocial({ title: { absolute: "Home | AirPermitHub" }, openGraph: { type: "article" } });
    expect(m.openGraph).toMatchObject({ type: "article", title: "Home | AirPermitHub" });
  });
});
