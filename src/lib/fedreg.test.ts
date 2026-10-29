import { describe, expect, it } from "vitest";
import { frUrl, mergeDocs, normalizeDoc } from "./fedreg";

const raw = (over: Record<string, unknown> = {}) => ({
  title: "Air Plan Approval; Texas; Example Revision",
  type: "Rule",
  abstract: "EPA is approving a revision.",
  document_number: "2026-00001",
  html_url: "https://www.federalregister.gov/documents/2026/10/01/2026-00001/example",
  publication_date: "2026-10-01",
  effective_on: "2026-10-31",
  comments_close_on: null,
  cfr_references: [{ title: 40, part: "52", chapter: null, citation_url: null }],
  docket_ids: ["EPA-R06-OAR-2026-0001"],
  ...over,
});

describe("Federal Register feed", () => {
  it("builds the API query with repeated array parameters", () => {
    const u = new URL(frUrl("60", 20));
    expect(u.searchParams.getAll("conditions[type][]")).toEqual(["RULE", "PRORULE"]);
    expect(u.searchParams.get("conditions[cfr][part]")).toBe("60");
    expect(u.searchParams.getAll("fields[]")).toContain("comments_close_on");
  });
  it("normalizes a rule and rejects unusable records", () => {
    expect(normalizeDoc(raw(), "sip")).toMatchObject({ documentNumber: "2026-00001", type: "Rule", parts: ["52"], effective: "2026-10-31", commentsClose: null, groups: ["sip"] });
    expect(normalizeDoc(raw({ type: "Notice" }), "sip")).toBeNull();
    expect(normalizeDoc(raw({ html_url: "https://example.com/x" }), "sip")).toBeNull();
    expect(normalizeDoc(raw({ publication_date: "yesterday" }), "sip")).toBeNull();
    expect(normalizeDoc(null, "sip")).toBeNull();
  });
  it("merges a document found under two programs and sorts newest first", () => {
    const a = normalizeDoc(raw({ document_number: "A", publication_date: "2026-09-01", cfr_references: [{ title: 40, part: "60" }, { title: 40, part: "63" }] }), "nsps")!;
    const a2 = normalizeDoc(raw({ document_number: "A", publication_date: "2026-09-01" }), "neshap")!;
    const b = normalizeDoc(raw({ document_number: "B", publication_date: "2026-10-15" }), "sip")!;
    const merged = mergeDocs([[a], [a2, b]]);
    expect(merged.map((d) => d.documentNumber)).toEqual(["B", "A"]);
    expect(merged[1].groups).toEqual(["nsps", "neshap"]);
    expect(merged[1].parts).toEqual(["60", "63"]);
  });
});
