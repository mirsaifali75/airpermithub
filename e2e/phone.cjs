// Browser run of phone-number sign-up, sign-in and reset against the production
// build on :3124, with the Twilio Verify stand-in on :4020 writing codes to SMS_FILE.
const { chromium } = require("playwright");
const fs = require("fs");
const { parsePhoneNumberFromString } = require("libphonenumber-js/max");

const BASE = process.env.E2E_BASE || "http://localhost:3124";
const SMS = process.env.SMS_FILE || "e2e/.out/sms.jsonl";
const SHOTS = process.env.E2E_SHOTS || "e2e/.out/shots";
fs.mkdirSync(SHOTS, { recursive: true });
const RUN = require("crypto").randomBytes(6).toString("hex");
const PW = `aph phone ${RUN} first passphrase`;
const PW2 = `aph phone ${RUN} second passphrase`;
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); if (!cond) console.log("FAIL", name, extra); };

/** A random US number the site will accept, so reruns on the same database don't collide. */
function freshNumber() {
  for (;;) {
    const n = `415${200 + Math.floor(Math.random() * 700)}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const p = parsePhoneNumberFromString(n, "US");
    if (p?.isValid() && p.getType() === "FIXED_LINE_OR_MOBILE") return p.number;
  }
}
const pretty = (e164) => `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;
const texts = (to) => (fs.existsSync(SMS) ? fs.readFileSync(SMS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((t) => t.to === to) : []);
const lastCode = (to) => texts(to).pop()?.code;
const alertText = async (page) => (await page.locator("[role=alert]").allInnerTexts()).join(" | ");

async function startPhoneSignUp(page, phone, password = PW, next) {
  await page.goto(`${BASE}/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Sign up with phone number").check({ force: true });
  await page.getByLabel("Full name").fill("Sam Ortiz");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Text me a code" }).click();
}
async function signInByPhone(page, phone, password) {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Sign in with phone number").check({ force: true });
  await page.getByLabel("Phone number", { exact: true }).fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
/** Signs out with the account page's button, so no late response can set the session cookie again. */
async function signOut(page) {
  await page.goto(`${BASE}/account`);
  await page.locator("main").getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForLoadState("networkidle");
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|_vercel/.test(m.text() + (m.location()?.url ?? ""))) errors.push(m.text()); });
  const phone = freshNumber();

  // ── The switch is there, and email stays the default ──
  await page.goto(`${BASE}/sign-up`);
  ok("sign-up shows the Email | Phone number switch", await page.getByLabel("Sign up with phone number").isVisible());
  ok("email is the default", await page.getByLabel("Sign up with email").isChecked() && await page.getByLabel("Work email").isVisible());
  await page.getByLabel("Sign up with phone number").check({ force: true });
  ok("choosing phone swaps in the number field", await page.getByLabel("Mobile number").isVisible() && (await page.getByLabel("Work email").count()) === 0);
  ok("the number field says texts may cost", /Message and data rates may apply/.test(await page.locator("main").innerText()));
  await page.screenshot({ path: `${SHOTS}/phone-signup.png` });
  await page.goto(`${BASE}/sign-up?method=phone`);
  ok("?method=phone opens on the phone choice", await page.getByLabel("Sign up with phone number").isChecked());

  // ── Numbers the site won't text ──
  const allTexts = () => (fs.existsSync(SMS) ? fs.readFileSync(SMS, "utf8").trim().split("\n").filter(Boolean).length : 0);
  const textsBefore = allTexts();
  for (const bad of ["800-555-1234", "+44 7911 123456", "+1 876 555 1234", "555-1234"]) {
    await startPhoneSignUp(page, bad);
    await page.waitForTimeout(300);
    ok(`refuses ${bad}`, /US or Canadian mobile number/.test(await page.locator("main").innerText()) && /\/sign-up/.test(page.url()));
  }
  ok("no text went out for refused numbers", allTexts() === textsBefore);

  // ── Sign up with a phone number ──
  await startPhoneSignUp(page, pretty(phone), PW, "/permit-finder");
  await page.waitForURL(/\/sign-up\/verify-phone/);
  ok("lands on the code page", true);
  ok("code page shows only the last four digits", (await page.locator("main").innerText()).includes(phone.slice(-4)) && !(await page.locator("main").innerText()).includes(phone.slice(2, 8)));
  ok("one text went to the number", texts(phone).length === 1, String(texts(phone).length));
  const cookie = (await ctx.cookies()).find((c) => c.name === "aph_phone_signup");
  ok("sign-up cookie is httpOnly, Lax, and only for /sign-up", !!cookie && cookie.httpOnly && cookie.sameSite === "Lax" && cookie.path === "/sign-up", JSON.stringify(cookie && { httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path }));
  await page.screenshot({ path: `${SHOTS}/phone-code.png` });

  await page.getByLabel("6-digit code").fill(lastCode(phone) === "111111" ? "222222" : "111111");
  await page.getByRole("button", { name: "Confirm and create account" }).click();
  await page.waitForTimeout(500);
  ok("a wrong code says how many tries are left", /didn't match\. 4 tries left/.test(await alertText(page)), await alertText(page));

  await page.getByRole("button", { name: "Text me a new code" }).click();
  await page.getByText("We texted you a new code.").waitFor({ timeout: 10000 });
  ok("a new code can be texted", texts(phone).length === 2);

  await page.getByLabel("6-digit code").fill(lastCode(phone));
  await page.getByRole("button", { name: "Confirm and create account" }).click();
  await page.waitForURL(/\/permit-finder/);
  await page.waitForLoadState("networkidle");
  ok("the right code creates the account and returns to the tool", true);
  ok("the tool is open once signed in", (await page.getByRole("heading", { name: "Use the Permit Finder with a free account" }).count()) === 0);
  ok("sign-up cookie is gone", !(await ctx.cookies()).some((c) => c.name === "aph_phone_signup"));

  await page.goto(`${BASE}/dashboard`);
  const dash = await page.locator("main").innerText();
  ok("dashboard shows the phone number", dash.includes(pretty(phone)));
  ok("dashboard asks for no email confirmation", !/Confirm your email address/.test(dash));
  ok("dashboard offers two-step login", /Protect your account with two-step login/.test(dash));

  await page.goto(`${BASE}/account`);
  const acct = await page.locator("main").innerText();
  ok("account page shows the confirmed number", /Phone number/.test(acct) && acct.includes(pretty(phone)) && /Confirmed/.test(acct));
  ok("account page has no email card", (await page.getByRole("heading", { name: "Email", exact: true }).count()) === 0);
  ok("delete asks for the phone number", await page.getByLabel("Type your phone number to confirm").isVisible());
  await page.screenshot({ path: `${SHOTS}/phone-account.png`, fullPage: true });

  // ── Sign in with the number ──
  await signOut(page);
  await signInByPhone(page, phone.slice(2), `${PW} wrong`);
  await page.waitForTimeout(500);
  ok("a wrong password is refused", /That phone number and password don't match/.test(await alertText(page)), await alertText(page));
  await signInByPhone(page, `1-${phone.slice(2, 5)}-${phone.slice(5, 8)}-${phone.slice(8)}`, PW);
  await page.waitForURL(/\/dashboard/);
  ok("signs in with the number typed another way", true);

  // ── A second sign-up with the same number makes no new account ──
  await signOut(page);
  await startPhoneSignUp(page, phone, `aph phone ${RUN} someone else`);
  await page.waitForURL(/\/sign-up\/verify-phone/);
  await page.getByLabel("6-digit code").fill(lastCode(phone));
  await page.getByRole("button", { name: "Confirm and create account" }).click();
  await page.waitForURL(/\/sign-in\?method=phone&exists=1/);
  await page.getByText("already has an AirPermitHub account").waitFor({ timeout: 10000 }).catch(() => {});
  ok("a second sign-up with the number is told to sign in", /already has an AirPermitHub account/.test(await page.locator("main").innerText()) && await page.getByLabel("Sign in with phone number").isChecked());
  await signInByPhone(page, phone, `aph phone ${RUN} someone else`);
  await page.waitForTimeout(500);
  ok("the second sign-up's password doesn't open the account", /don't match/.test(await alertText(page)));

  // ── Reset by text ──
  // This number has had three codes this hour (sign-up, a resend, the second sign-up), the most
  // it gets, so start the reset with a clean slate, as an hour later would.
  require("child_process").execFileSync("node", ["e2e/clear-limits.cjs"], { stdio: "inherit" });
  await page.goto(`${BASE}/forgot-password?method=phone`);
  ok("forgot password opens on phone", await page.getByLabel("Reset with phone number").isChecked());
  const before = texts(phone).length;
  await page.getByLabel("Phone number", { exact: true }).fill(pretty(phone));
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.waitForURL(/\/reset-password\/phone/);
  ok("a reset code was texted", texts(phone).length === before + 1);
  await page.getByLabel("6-digit code from the text").fill(lastCode(phone));
  await page.getByLabel("New password").fill("aaaaaaaaaaaa");
  await page.getByLabel("Type it again").fill("aaaaaaaaaaaa");
  await page.getByRole("button", { name: "Set new password" }).click();
  await page.waitForTimeout(500);
  ok("a weak new password is refused, and the code still works after", /more variety/.test(await page.locator("main").innerText()));
  await page.getByLabel("6-digit code from the text").fill(lastCode(phone));
  await page.getByLabel("New password").fill(PW2);
  await page.getByLabel("Type it again").fill(PW2);
  await page.getByRole("button", { name: "Set new password" }).click();
  await page.waitForURL(/\/sign-in\?reset=1/);
  ok("reset lands on sign-in with the phone choice", await page.getByLabel("Sign in with phone number").isChecked());
  await signInByPhone(page, phone, PW);
  await page.waitForTimeout(500);
  ok("the old password stops working", /don't match/.test(await alertText(page)));
  await signInByPhone(page, phone, PW2);
  await page.waitForURL(/\/dashboard/);
  ok("the new password works", true);

  // ── Reset for a number with no account: same page, no text ──
  await signOut(page);
  const stranger = freshNumber();
  await page.goto(`${BASE}/forgot-password?method=phone`);
  await page.getByLabel("Phone number", { exact: true }).fill(stranger);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.waitForURL(/\/reset-password\/phone/);
  ok("an unknown number gets the same reply", /If .*has an AirPermitHub account, we texted it/.test(await page.locator("main").innerText()));
  ok("no text goes to a number without an account", texts(stranger).length === 0);
  await page.getByLabel("6-digit code from the text").fill("123456");
  await page.getByLabel("New password").fill(PW2);
  await page.getByLabel("Type it again").fill(PW2);
  await page.getByRole("button", { name: "Set new password" }).click();
  await page.waitForTimeout(500);
  ok("a code for a number without an account never matches", /didn't match/.test(await page.locator("main").innerText()));

  // ── Texting limits: three codes an hour per number ──
  const busy = freshNumber();
  for (let i = 0; i < 3; i++) {
    await page.context().clearCookies();
    await startPhoneSignUp(page, busy);
    await page.waitForURL(/\/sign-up\/verify-phone/);
  }
  await page.context().clearCookies();
  await startPhoneSignUp(page, busy);
  await page.waitForTimeout(800);
  ok("a fourth code in an hour is refused", /several codes in the last hour/.test(await alertText(page)), await alertText(page));
  ok("only three texts went to that number", texts(busy).length === 3, String(texts(busy).length));

  // ── Delete the account with its number ──
  await signInByPhone(page, phone, PW2);
  await page.waitForURL(/\/dashboard/);
  await page.goto(`${BASE}/account`);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Type your phone number to confirm").fill("(415) 000-0000");
  await page.getByLabel("Your password").fill(PW2);
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.waitForTimeout(500);
  ok("delete refuses the wrong number", /phone number you typed doesn't match/.test(await alertText(page)), await alertText(page));
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Type your phone number to confirm").fill(pretty(phone));
  await page.getByLabel("Your password").fill(PW2);
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.waitForURL(/\/\?account=deleted/);
  await signInByPhone(page, phone, PW2);
  await page.waitForTimeout(500);
  ok("a deleted phone account can't sign in", /don't match/.test(await alertText(page)));

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - failed}/${results.length} phone checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
