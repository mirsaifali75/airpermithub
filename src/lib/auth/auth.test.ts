import { describe, expect, it } from "vitest";
import { isAdminEmail, safeNext } from "./config";
import { signInEmail } from "./email";

describe("auth helpers", () => {
  it("matches admin emails from a comma or space list, ignoring case", () => {
    expect(isAdminEmail("Owner@Example.com", "owner@example.com, other@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com", "owner@example.com other@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com", "owner@example.com")).toBe(false);
    expect(isAdminEmail("owner@example.com", "")).toBe(false);
  });

  it("keeps post-sign-in redirects on this site", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("/tools/deviation-log?x=1")).toBe("/tools/deviation-log?x=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, 42]) expect(safeNext(bad)).toBe("/dashboard");
  });

  it("writes the sign-in email with the link escaped and no other links", () => {
    const url = 'https://www.airpermithub.com/api/auth/callback/resend?token=a"b<c>&email=x';
    const m = signInEmail(url);
    expect(m.text).toContain(url);
    expect(m.text).toMatch(/expires in 15 minutes/);
    expect(m.html).not.toContain('a"b<c>');
    expect(m.html).toContain("a&quot;b&lt;c&gt;&amp;email=x");
    expect(m.html.match(/href=/g)).toHaveLength(1);
  });
});
