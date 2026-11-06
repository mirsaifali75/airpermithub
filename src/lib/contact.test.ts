import { describe, expect, it } from "vitest";
import { checkContact, cleanLink, contactEmailMessage, type ContactInput } from "./contact";

const base: ContactInput = { topic: "question", name: " Dana  Lee ", email: " Dana@Example.com ", page: "", source: "", message: "How do I use the PTE calculator?" };

describe("checkContact", () => {
  it("cleans a good message", () => {
    const r = checkContact(base);
    expect(r).toEqual({ ok: { topic: "question", name: "Dana Lee", email: "dana@example.com", page: null, source: null, message: "How do I use the PTE calculator?" } });
  });

  it("refuses an unknown topic, including inherited object keys", () => {
    expect(checkContact({ ...base, topic: "billing" })).toMatchObject({ field: "topic" });
    expect(checkContact({ ...base, topic: "toString" })).toMatchObject({ field: "topic" });
    expect(checkContact({ ...base, topic: "__proto__" })).toMatchObject({ field: "topic" });
  });

  it("needs a reply address", () => {
    expect(checkContact({ ...base, email: "" })).toMatchObject({ field: "email" });
    expect(checkContact({ ...base, email: "dana@" })).toMatchObject({ field: "email" });
  });

  it("needs a message of a sensible length", () => {
    expect(checkContact({ ...base, message: "  hi  " })).toMatchObject({ field: "message" });
    expect(checkContact({ ...base, message: "x".repeat(5001) })).toMatchObject({ field: "message" });
    expect("ok" in checkContact({ ...base, message: "x".repeat(5000) })).toBe(true);
  });

  it("keeps a long name out", () => {
    expect(checkContact({ ...base, name: "n".repeat(101) })).toMatchObject({ field: "name" });
  });

  it("accepts page links in the forms people paste", () => {
    const r = checkContact({ ...base, topic: "error", page: "airpermithub.com/states/nd", source: "https://deq.nd.gov/AQ/" });
    expect(r).toMatchObject({ ok: { page: "https://airpermithub.com/states/nd", source: "https://deq.nd.gov/AQ/" } });
  });

  it("refuses links that aren't web addresses", () => {
    expect(checkContact({ ...base, page: "javascript:alert(1)" })).toMatchObject({ field: "page" });
    expect(checkContact({ ...base, source: "data:text/html,hi" })).toMatchObject({ field: "source" });
  });
});

describe("cleanLink", () => {
  it("reads a bare path as a page on this site", () => {
    expect(cleanLink("/states/nd")).toBe("https://airpermithub.com/states/nd");
  });
  it("doesn't read a protocol-relative link as a page on this site", () => {
    expect(cleanLink("//other.example/x")).toBe("https://other.example/x");
  });
  it("refuses very long links", () => {
    expect(cleanLink(`https://a.gov/${"x".repeat(600)}`)).toBe(null);
  });
});

describe("contactEmailMessage", () => {
  const m = { topic: "error" as const, name: "<b>Dana</b>", email: "dana@example.com", page: "https://airpermithub.com/states/nd?q=<x>", source: null, message: "Line one\n<script>alert(1)</script>" };

  it("puts only the topic label in the subject", () => {
    expect(contactEmailMessage(m).subject).toBe("Contact form: Report an error");
  });

  it("escapes everything the visitor typed", () => {
    const { html } = contactEmailMessage(m);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Dana</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("q=&lt;x&gt;");
    expect(html).not.toMatch(/<a\s/);
  });

  it("says whether the reply address was confirmed", () => {
    expect(contactEmailMessage(m).text).toContain("Reply address: Not confirmed");
    expect(contactEmailMessage(m, { signedIn: true }).text).toContain("Reply address: Confirmed");
  });

  it("keeps the message's line breaks in the plain-text copy", () => {
    expect(contactEmailMessage(m).text).toContain("Line one\n<script>");
  });
});
