import { describe, expect, it } from "vitest";
import { jsonLdText } from "./json-ld";

describe("jsonLdText", () => {
  it("can't close the script tag it sits in", () => {
    const out = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain("<");
  });

  it("still parses back to the same data", () => {
    const data = { "@type": "FAQPage", name: "NOx < 25 tpy & CO > 100 tpy", sep: "a\u2028b\u2029c" };
    expect(JSON.parse(jsonLdText(data))).toEqual(data);
  });
});
