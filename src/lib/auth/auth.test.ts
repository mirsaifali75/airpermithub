import { describe, expect, it } from "vitest";
import { isAdminEmail, safeNext } from "./config";
import { decrypt, encrypt, newToken, safeEqual, sha256 } from "./crypto";
import { describeAgent } from "./devices";
import { accountExistsEmail, appOrigin, newDeviceEmail, passwordChangedEmail, resetPasswordEmail, twoStepChangedEmail, verifyEmail } from "./email";
import { hashPassword, isBreached, passwordProblem, verifyPassword } from "./password";
import { base32Decode, base32Encode, hashBackupCode, looksLikeBackupCode, matchTotp, newBackupCodes, otpauthUrl, stepAt, totpAt } from "./totp";

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

  it("builds email links from configuration, never from the request", () => {
    expect(appOrigin({ AUTH_URL: "https://www.airpermithub.com/api/auth" })).toBe("https://www.airpermithub.com");
    expect(appOrigin({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "aph-git-x.vercel.app" })).toBe("https://aph-git-x.vercel.app");
    expect(appOrigin({ VERCEL_ENV: "production", VERCEL_URL: "aph-123.vercel.app" })).toBe("https://airpermithub.com");
    expect(appOrigin({})).toBe("https://airpermithub.com");
  });
});

describe("account emails", () => {
  it("escapes the link and carries exactly one", () => {
    const url = 'https://www.airpermithub.com/verify-email?token=a"b<c>&x=1';
    for (const m of [verifyEmail(url), resetPasswordEmail(url)]) {
      expect(m.text).toContain(url);
      expect(m.html).not.toContain('a"b<c>');
      expect(m.html).toContain("a&quot;b&lt;c&gt;&amp;x=1");
      expect(m.html.match(/href=/g)).toHaveLength(1);
    }
  });

  it("states how long each link lasts", () => {
    expect(verifyEmail("https://x.test").text).toMatch(/expires in 24 hours/);
    expect(resetPasswordEmail("https://x.test").text).toMatch(/expires in 30 minutes/);
  });

  it("writes alerts with the time in UTC and at most one link", () => {
    const at = new Date("2026-11-05T14:30:00Z");
    const device = newDeviceEmail({ device: "Firefox on Windows", when: at });
    expect(device.text).toContain("Firefox on Windows");
    expect(device.text).toContain("November 5, 2026 at 2:30 PM UTC");
    for (const m of [device, passwordChangedEmail(at), accountExistsEmail(), twoStepChangedEmail(true, at), twoStepChangedEmail(false, at)]) {
      expect(m.html.match(/href=/g)?.length ?? 0).toBeLessThanOrEqual(1);
      expect(m.subject).toMatch(/AirPermitHub|Two-step/);
    }
  });

  it("names the browser without keeping the whole user agent", () => {
    expect(describeAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0")).toBe("Edge on Windows");
    expect(describeAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")).toBe("Safari on macOS");
    expect(describeAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36")).toBe("Chrome on Android");
    expect(describeAgent(null)).toBe("an unknown browser");
  });
});

describe("passwords", () => {
  it("asks for length and variety, and keeps the email name out", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem("a".repeat(129))).toMatch(/at most 128/);
    expect(passwordProblem("aaaaabbbbbaaaaa")).toMatch(/variety/);
    expect(passwordProblem("dana.permits-2026!", "dana.permits@example.com")).toMatch(/email name/);
    expect(passwordProblem("correct horse battery staple")).toBeNull();
  });

  it("hashes with Argon2id and verifies only the same password", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(h, "correct horse battery stapl")).toBe(false);
    expect(await verifyPassword("not a hash", "anything")).toBe(false);
  });

  it("checks breaches by hash prefix only, and fails open", async () => {
    // SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8.
    let asked = "";
    const hit = (async (url: string) => {
      asked = url;
      return new Response("0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\n");
    }) as unknown as typeof fetch;
    expect(await isBreached("password", hit)).toBe(true);
    expect(asked).toBe("https://api.pwnedpasswords.com/range/5BAA6");

    const padded = (async () => new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0\r\n")) as unknown as typeof fetch;
    expect(await isBreached("password", padded)).toBe(false);
    const down = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    expect(await isBreached("password", down)).toBeNull();
    const offline = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await isBreached("password", offline)).toBeNull();
  });
});

describe("tokens and secrets", () => {
  it("stores only a hash of each token", () => {
    const { token, hash } = newToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(sha256(token));
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("seals secrets so they can't be read or altered without AUTH_SECRET", () => {
    const before = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret-one";
    try {
      const sealed = encrypt("JBSWY3DPEHPK3PXP", "totp-secret");
      expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
      expect(decrypt(sealed, "totp-secret")).toBe("JBSWY3DPEHPK3PXP");
      expect(() => decrypt(sealed, "other-purpose")).toThrow();
      const parts = sealed.split(".");
      parts[3] = Buffer.from("tampered").toString("base64url");
      expect(() => decrypt(parts.join("."), "totp-secret")).toThrow();
      process.env.AUTH_SECRET = "test-secret-two";
      expect(() => decrypt(sealed, "totp-secret")).toThrow();
    } finally {
      process.env.AUTH_SECRET = before;
    }
  });
});

describe("two-step codes", () => {
  // RFC 6238 appendix B, SHA-1 key "12345678901234567890", last 6 of the 8-digit values.
  const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));

  it("round-trips base32", () => {
    expect(rfcSecret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(rfcSecret).toString()).toBe("12345678901234567890");
    expect(base32Decode("gezd gnbv-gy3t").toString()).toBe(base32Decode("GEZDGNBVGY3T").toString());
  });

  it("matches the RFC 6238 test vectors", () => {
    expect(totpAt(rfcSecret, stepAt(59_000))).toBe("287082");
    expect(totpAt(rfcSecret, stepAt(1_111_111_109_000))).toBe("081804");
    expect(totpAt(rfcSecret, stepAt(1_234_567_890_000))).toBe("005924");
    expect(totpAt(rfcSecret, stepAt(2_000_000_000_000))).toBe("279037");
  });

  it("allows one step of drift and refuses a code used before", () => {
    const now = 1_234_567_890_000;
    const step = stepAt(now);
    expect(matchTotp(rfcSecret, "005924", { now })).toBe(step);
    expect(matchTotp(rfcSecret, "005 924", { now: now + 30_000 })).toBe(step);
    expect(matchTotp(rfcSecret, "005924", { now: now + 90_000 })).toBeNull();
    expect(matchTotp(rfcSecret, "005924", { now, lastStep: step })).toBeNull();
    expect(matchTotp(rfcSecret, "12345", { now })).toBeNull();
    expect(matchTotp(rfcSecret, "abcdef", { now })).toBeNull();
  });

  it("writes an authenticator link without the email unescaped", () => {
    const url = otpauthUrl("JBSWY3DPEHPK3PXP", "a+b@example.com");
    expect(url).toBe("otpauth://totp/AirPermitHub%3Aa%2Bb%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=AirPermitHub&algorithm=SHA1&digits=6&period=30");
  });

  it("makes ten distinct backup codes that match however they're typed", () => {
    const codes = newBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes.map((c) => c.code)).size).toBe(10);
    for (const { code, hash } of codes) {
      expect(code).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/);
      expect(hashBackupCode(code.toLowerCase().replace(/-/g, " "))).toBe(hash);
      expect(looksLikeBackupCode(code)).toBe(true);
    }
    expect(looksLikeBackupCode("123456")).toBe(false);
  });
});
