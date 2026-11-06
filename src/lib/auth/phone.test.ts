import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "./phone";
import { checkCode, cleanCode, phoneEnabled, sendCode } from "./sms";

describe("phone numbers", () => {
  it("accepts US and Canadian numbers in the usual formats", () => {
    for (const n of ["(415) 555-2671", "415-555-2671", "415.555.2671", "4155552671", "1 415 555 2671", "+1 (415) 555-2671", " +14155552671 "]) {
      expect(normalizePhone(n)).toBe("+14155552671");
    }
    expect(normalizePhone("(416) 555-0123")).toBe("+14165550123");
  });

  it("refuses numbers that can't get a code or cost more to text", () => {
    for (const n of ["", "555-1234", "800-555-1234", "1-888-555-1234", "1-900-555-1234", "+44 7911 123456", "+1 876 555 1234", "+1 649 555 1234", "415 555 2671 x12", "415-555-2671; drop", "1".repeat(41)]) {
      expect(normalizePhone(n)).toBeNull();
    }
  });

  it("formats and masks stored numbers", () => {
    expect(formatPhone("+14155552671")).toBe("(415) 555-2671");
    expect(maskPhone("+14155552671")).toBe("(•••) •••-2671");
  });

  it("cleans a typed code", () => {
    expect(cleanCode(" 123 456 ")).toBe("123456");
    expect(cleanCode("123-456")).toBe("123456");
  });
});

describe("Twilio Verify", () => {
  const env = { TWILIO_ACCOUNT_SID: "AC_test", TWILIO_AUTH_TOKEN: "token_test", TWILIO_VERIFY_SERVICE_SID: "VA0123456789abcdef0123456789abcdef" };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const stub = (status: number, body: unknown) => {
    const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", f);
    return f;
  };
  const setEnv = () => Object.entries(env).forEach(([k, v]) => vi.stubEnv(k, v));

  it("is on only with all three settings", () => {
    expect(phoneEnabled()).toBe(false);
    vi.stubEnv("TWILIO_ACCOUNT_SID", env.TWILIO_ACCOUNT_SID);
    vi.stubEnv("TWILIO_AUTH_TOKEN", env.TWILIO_AUTH_TOKEN);
    expect(phoneEnabled()).toBe(false);
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", env.TWILIO_VERIFY_SERVICE_SID);
    expect(phoneEnabled()).toBe(true);
  });

  it("asks Twilio to text a code, with the keys only in the Authorization header", async () => {
    setEnv();
    const f = stub(201, { status: "pending" });
    expect(await sendCode("+14155552671")).toBe("sent");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/Verifications`);
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toBe("To=%2B14155552671&Channel=sms");
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("AC_test:token_test").toString("base64")}`);
  });

  it("reports Twilio's own sending cap, and other refusals", async () => {
    setEnv();
    vi.spyOn(console, "error").mockImplementation(() => {});
    stub(429, { code: 60203, message: "Max send attempts reached" });
    expect(await sendCode("+14155552671")).toBe("too-many");
    stub(400, { code: 60200, message: "Invalid parameter" });
    expect(await sendCode("+14155552671")).toBe("failed");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await sendCode("+14155552671")).toBe("failed");
  });

  it("refuses to call a service id that isn't one", async () => {
    setEnv();
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "../../Accounts");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = stub(201, {});
    expect(await sendCode("+14155552671")).toBe("failed");
    expect(f).not.toHaveBeenCalled();
  });

  it("approves a code only when Twilio says approved", async () => {
    setEnv();
    stub(200, { status: "approved", valid: true });
    expect(await checkCode("+14155552671", "123456")).toBe(true);
    stub(200, { status: "pending", valid: false });
    expect(await checkCode("+14155552671", "123456")).toBe(false);
    stub(404, { code: 20404 });
    expect(await checkCode("+14155552671", "123456")).toBe(false);
    const f = stub(200, { status: "approved" });
    expect(await checkCode("+14155552671", "12ab56")).toBe(false);
    expect(await checkCode("+14155552671", "")).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
