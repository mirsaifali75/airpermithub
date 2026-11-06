/**
 * Texted codes through Twilio Verify: Twilio makes the 6-digit code, texts it,
 * and checks it, so the code is never stored here; Twilio also expires codes
 * and caps checks on its side. Phone sign-up shows only when all three
 * settings are in the server's environment; they are never sent to the browser.
 * TWILIO_VERIFY_URL points local end-to-end tests at a stand-in server.
 */

const env = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID ?? "",
  token: process.env.TWILIO_AUTH_TOKEN ?? "",
  service: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  base: process.env.TWILIO_VERIFY_URL || "https://verify.twilio.com",
});

export const phoneEnabled = () => {
  const e = env();
  return Boolean(e.sid && e.token && e.service);
};

async function verify(path: "Verifications" | "VerificationCheck", body: Record<string, string>) {
  const e = env();
  if (!/^VA[0-9a-f]{32}$/i.test(e.service) && !process.env.TWILIO_VERIFY_URL) throw new Error("TWILIO_VERIFY_SERVICE_SID doesn't look like a Verify service id");
  return fetch(`${e.base}/v2/Services/${encodeURIComponent(e.service)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${e.sid}:${e.token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
}

export type SendResult = "sent" | "too-many" | "failed";

/** Texts a new code to an E.164 number. */
export async function sendCode(phone: string): Promise<SendResult> {
  try {
    const res = await verify("Verifications", { To: phone, Channel: "sms" });
    if (res.ok) return "sent";
    const detail = await res.text();
    // 60203: Twilio's own cap on codes sent to one number.
    if (res.status === 429 || /"code":\s*60203/.test(detail)) return "too-many";
    // Twilio's error text can repeat the number; logs keep only that it failed and why.
    console.error(`Twilio refused the code (${res.status}): ${detail.replace(/\+?\d{10,15}/g, "[number]").slice(0, 300)}`);
    return "failed";
  } catch (e) {
    console.error("Twilio code send failed", e);
    return "failed";
  }
}

/** True only when Twilio approves the code for that number. A wrong, expired or used-up code is false. */
export async function checkCode(phone: string, code: string): Promise<boolean> {
  if (!/^\d{4,10}$/.test(code)) return false;
  try {
    const res = await verify("VerificationCheck", { To: phone, Code: code });
    if (!res.ok) {
      // 404: no code waiting for that number (expired, used, or never sent). 429: too many checks.
      if (res.status !== 404 && res.status !== 429) console.error(`Twilio code check failed (${res.status})`);
      return false;
    }
    const data = (await res.json()) as { status?: string; valid?: boolean };
    return data.status === "approved";
  } catch (e) {
    console.error("Twilio code check failed", e);
    return false;
  }
}

export type CodeCheck = (phone: string, code: string) => Promise<boolean>;

/** The code someone typed, with spaces and dashes taken out. */
export const cleanCode = (raw: string) => raw.replace(/[\s-]/g, "").slice(0, 12);
