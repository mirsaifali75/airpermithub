import { describe, expect, it } from "vitest";
import { listStateProfiles } from "@/lib/data/state-profiles";
import { ruleSummaries } from "@/lib/data/ecfr";
import { buildSearchIndex, exampleQueries, search } from "./search";

const index = buildSearchIndex(listStateProfiles(), ruleSummaries());
const top = (q: string, n = 1) => search(index, q).slice(0, n).map((d) => d.href);

describe("site search", () => {
  it("finds the section landing pages by name", () => {
    expect(top("state explorer")).toEqual(["/states"]);
    expect(top("templates")).toEqual(["/templates"]);
    expect(top("how we verify")).toEqual(["/verification"]);
  });

  it("puts the program overview first for a program or Part query", () => {
    expect(top("nsps")).toEqual(["/regulations/nsps"]);
    expect(top("40 CFR Part 60")).toEqual(["/regulations/nsps"]);
    expect(top("title 5")).toEqual(["/regulations/title-v"]);
  });

  it("shows only pages that match every word when there are any", () => {
    expect(search(index, "louisiana permit").map((d) => d.href)).toEqual(["/states/louisiana"]);
    expect(top("TCEQ PBR")).toEqual(["/states/texas"]);
  });

  it("links a CFR section to its subpart", () => {
    expect(top("60.5365b")).toEqual(["/regulations/nsps/subpart-oooob#sec-60.5365b"]);
    expect(top("§ 63.6585")).toEqual(["/regulations/neshap/subpart-zzzz#sec-63.6585"]);
    expect(search(index, "40 CFR 60.5365b")).toHaveLength(1);
  });

  it("tolerates typos and plural or -ing forms", () => {
    expect(top("louisianna")).toEqual(["/states/louisiana"]);
    expect(top("wyomng title v")).toEqual(["/states/wyoming"]);
    expect(search(index, "flare").map((d) => d.href)).toContain("/calculators/flares");
  });

  it("returns results for every suggested query", () => {
    for (const q of exampleQueries) expect(search(index, q).length, q).toBeGreaterThan(0);
  });
});
