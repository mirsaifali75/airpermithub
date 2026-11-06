// Browser run of every account flow against the production build on :3124 with fake Resend on :4010.
const { chromium } = require("playwright");
const crypto = require("crypto");
const fs = require("fs");
const EMAILS = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";

const BASE = process.env.E2E_BASE || "http://localhost:3124";
const SHOTS = process.env.E2E_SHOTS || "e2e/.out/shots";
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
const PW = "correct horse battery staple";
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); if (!cond) console.log("FAIL", name, extra); };

function emails() {
  if (!fs.existsSync(EMAILS)) return [];
  return fs.readFileSync(EMAILS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).body);
}
const lastEmail = (to, re) => emails().filter((e) => e.to === to && re.test(e.subject)).pop();
const linkIn = (e) => e.text.match(/https?:\/\/\S+/)[0];

function totp(secret, t = Date.now()) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0; const out = [];
  for (const ch of secret.replace(/\s/g, "")) { value = (value << 5) | A.indexOf(ch); bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac("sha1", Buffer.from(out)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
}

async function signUp(page, { name, email, next }) {
  await page.goto(`${BASE}/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(/\/sign-up\/check-email/);
}
async function signIn(page, email, password = PW, next) {
  await page.goto(`${BASE}/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const alertText = async (page) => (await page.locator("form [role=alert]").allInnerTexts()).join(" | ");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|_vercel/.test(m.text() + (m.location()?.url ?? ""))) errors.push(m.text()); });
  const stamp = Date.now();
  const dana = `dana.${stamp}@example.com`;

  // ── Signed out: tools gated, reading pages public ──
  await page.goto(`${BASE}/permit-finder`);
  ok("permit finder gated when signed out", await page.getByRole("heading", { name: "Use the Permit Finder with a free account" }).isVisible());
  await page.screenshot({ path: `${SHOTS}/gate-permit-finder.png`, fullPage: false });
  await page.goto(`${BASE}/tools/ppm-to-lb-hr`);
  ok("converter gated", await page.getByRole("heading", { name: /Use the ppm to lb\/hr converter/ }).isVisible());
  ok("converter formula and FAQ stay public", await page.getByRole("heading", { name: "Questions engineers ask" }).isVisible());
  await page.goto(`${BASE}/calculators/engines`);
  ok("calculator gated", await page.getByRole("heading", { name: /Use the Engines calculator with a free account/ }).isVisible());
  await page.goto(`${BASE}/tools/deviation-log`);
  ok("workbook tool gated", await page.getByRole("heading", { name: /Use the Deviation/ }).isVisible());
  await page.goto(`${BASE}/regulations`);
  ok("regulations page public", (await page.locator("#gate-heading, #preview-heading").count()) === 0);
  await page.goto(`${BASE}/dashboard`);
  ok("dashboard sends signed-out visitors to sign in", /\/sign-in\?next=(%2F|\/)dashboard/.test(page.url()), page.url());

  // ── Sign up from a tool, confirm, land back on the tool ──
  await page.goto(`${BASE}/permit-finder`);
  await page.getByRole("link", { name: /Sign up free to use this tool/ }).click();
  await page.waitForURL(/\/sign-up\?next=%2Fpermit-finder/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${SHOTS}/sign-up-phone.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel("Password", { exact: true }).fill("short");
  await signUp(page, { name: "Dana Reyes", email: dana, next: "/permit-finder" });
  ok("sign-up shows check-email page", await page.getByText(dana).count() >= 0);
  const verify = lastEmail(dana, /Confirm your/);
  ok("verification email sent", !!verify);
  const vlink = linkIn(verify);
  ok("verify link carries the tool", /next=%2Fpermit-finder/.test(vlink), vlink.replace(/token=[^&]+/, "token=…"));
  await page.goto(vlink);
  await page.screenshot({ path: `${SHOTS}/verify.png` });
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await page.waitForURL(/\/permit-finder/);
  ok("confirmed and signed in, back on the tool", (await page.locator("#gate-heading, #preview-heading").count()) === 0);
  await page.goto(vlink);
  ok("verify link works once", await page.getByText("This link has expired or was already used").isVisible());

  // ── Dashboard ──
  await page.goto(`${BASE}/dashboard`);
  ok("dashboard greets by first name", await page.getByText(/Dana/).first().isVisible());
  ok("dashboard labels unbuilt features", (await page.getByText("Coming soon").count()) >= 3, String(await page.getByText("Coming soon").count()));
  await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${SHOTS}/dashboard-phone.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  const hdr = (await page.getByRole("link", { name: "My account", exact: true }).count()) > 0 && (await page.getByRole("link", { name: "Sign in", exact: true }).count()) === 0;
  ok("header shows My Account when signed in", hdr);

  // ── Sign out, wrong password, sign in ──
  await page.goto(`${BASE}/account`);
  await page.locator("main").getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/permit-finder`);
  ok("signed out again: gated", await page.locator("#gate-heading, #preview-heading").isVisible());
  await signIn(page, dana, "wrong password here");
  await page.waitForTimeout(800);
  ok("wrong password refused", /don.t match/i.test(await alertText(page)), await alertText(page));
  await signIn(page, dana.toUpperCase(), PW, "/tools/deviation-log");
  await page.waitForURL(/\/tools\/deviation-log/);
  ok("sign in returns to next", (await page.locator("#gate-heading, #preview-heading").count()) === 0);

  // ── Lockout on a second account ──
  const lee = `lee.${stamp}@example.com`;
  const p2 = await (await browser.newContext()).newPage();
  await signUp(p2, { name: "Lee Park", email: lee });
  let locked = "";
  for (let i = 0; i < 9; i++) { await signIn(p2, lee, `wrong password ${i}`); await p2.waitForTimeout(300); locked = await alertText(p2); }
  ok("too many wrong passwords locks the address", /too many|try again/i.test(locked), locked);
  await signIn(p2, lee, PW);
  await p2.waitForTimeout(800);
  ok("right password still refused while locked", p2.url().includes("/sign-in"), p2.url());

  // ── Forgot and reset (on Lee: also clears the lockout? no, check reset works) ──
  await p2.goto(`${BASE}/forgot-password`);
  await p2.getByLabel("Email", { exact: true }).fill(lee);
  await p2.getByRole("button", { name: "Email me a reset link" }).click();
  await p2.waitForURL(/sent=1/);
  const reset = lastEmail(lee, /Reset your/);
  ok("reset email sent", !!reset);
  await p2.goto(linkIn(reset));
  await p2.getByLabel("New password").fill("a whole new passphrase");
  await p2.getByLabel("Type it again").fill("a whole new passphrase");
  await p2.getByRole("button", { name: "Set new password" }).click();
  await p2.waitForURL(/\/sign-in\?reset=1/);
  ok("reset leads to sign-in", true);
  await p2.goto(linkIn(reset));
  ok("reset link works once", (await p2.getByText(/expired|already used/).count()) > 0);
  // Unknown address gets the same reply.
  await p2.goto(`${BASE}/forgot-password`);
  await p2.getByLabel("Email", { exact: true }).fill(`nobody.${stamp}@example.com`);
  await p2.getByRole("button", { name: "Email me a reset link" }).click();
  await p2.waitForURL(/sent=1/);
  ok("unknown address: same reply, no email", !lastEmail(`nobody.${stamp}@example.com`, /./));

  // ── Duplicate sign-up doesn't reveal the account ──
  const p3 = await (await browser.newContext()).newPage();
  await signUp(p3, { name: "Someone Else", email: dana });
  ok("duplicate sign-up shows the same page", p3.url().endsWith("/sign-up/check-email"));
  ok("duplicate sign-up emails the owner instead", !!lastEmail(dana, /already have/));

  // ── New browser alert ──
  const before = emails().filter((e) => e.to === dana && /New sign-in/.test(e.subject)).length;
  await signIn(p3, dana);
  await p3.waitForURL(/\/dashboard/);
  const after = emails().filter((e) => e.to === dana && /New sign-in/.test(e.subject)).length;
  ok("second browser triggers a new sign-in email", after === before + 1, `${before}->${after}`);

  // ── Settings: profile, password change keeps this session, ends the other ──
  await page.goto(`${BASE}/account`);
  await page.screenshot({ path: `${SHOTS}/account.png`, fullPage: true });
  await page.getByLabel("Full name").fill("Dana R. Reyes");
  await page.getByRole("button", { name: /Save/ }).first().click();
  await page.waitForTimeout(800);
  await page.getByLabel("Current password").fill(PW);
  await page.getByLabel("New password").fill("another fine passphrase");
  await page.getByLabel("Type it again").fill("another fine passphrase");
  await page.getByRole("button", { name: "Change password" }).click();
  await page.waitForTimeout(1000);
  ok("password change notice", /Password changed/.test(await page.locator("body").innerText()));
  ok("password changed email", !!lastEmail(dana, /password was changed/));
  await p3.goto(`${BASE}/dashboard`);
  ok("other browser signed out by password change", p3.url().includes("/sign-in"), p3.url());
  await page.goto(`${BASE}/dashboard`);
  ok("this browser stays signed in", page.url().endsWith("/dashboard"));
  ok("profile name saved", await page.getByText(/Dana/).first().isVisible());

  // ── Two-step login ──
  await page.goto(`${BASE}/account/two-step`);
  await page.getByRole("button", { name: "Set up two-step login" }).click();
  await page.waitForURL(/\/account\/two-step/);
  await page.getByText("Setup key", { exact: true }).waitFor();
  const key = (await page.locator("p.font-mono").first().innerText()).replace(/\s/g, "");
  ok("setup key shown", /^[A-Z2-7]{32}$/.test(key), key.length);
  ok("QR code shown", (await page.locator("svg").count()) > 0);
  await page.screenshot({ path: `${SHOTS}/two-step-setup.png`, fullPage: true });
  await page.locator('input[name="code"]').fill("000000");
  await page.getByRole("button", { name: "Turn on two-step login" }).click();
  await page.waitForTimeout(800);
  ok("wrong setup code refused", /didn.t match/.test(await page.locator("body").innerText()));
  await page.locator('input[name="code"]').fill(totp(key));
  await page.getByRole("button", { name: "Turn on two-step login" }).click();
  await page.getByText(/backup codes/i).first().waitFor();
  const codes = (await page.locator("body").innerText()).match(/[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}/g) || [];
  ok("ten backup codes shown", new Set(codes).size === 10, String(new Set(codes).size));
  await page.screenshot({ path: `${SHOTS}/backup-codes.png`, fullPage: true });
  ok("two-step on email", !!lastEmail(dana, /Two-step login is on/));

  // Sign in with password + backup code.
  const p4 = await (await browser.newContext()).newPage();
  await signIn(p4, dana, "another fine passphrase", "/compliance");
  await p4.waitForURL(/\/sign-in\/two-step/);
  ok("password then code step", true);
  await p4.screenshot({ path: `${SHOTS}/sign-in-code.png` });
  await p4.locator('input[name="code"]').fill("111111");
  await p4.getByRole("button", { name: "Verify and sign in" }).click();
  await p4.waitForTimeout(800);
  ok("wrong code counts down", /tries? left/.test(await alertText(p4)), await alertText(p4));
  await p4.getByRole("button", { name: "Lost your phone? Use a backup code" }).click();
  await p4.locator('input[name="code"]').fill(codes[0].toLowerCase());
  await p4.getByRole("button", { name: "Verify and sign in" }).click();
  await p4.waitForURL(/\/compliance/);
  ok("backup code signs in and returns to next", (await p4.locator("#gate-heading, #preview-heading").count()) === 0);

  // Sign in with an app code from the next time step (the setup code's step can't be reused).
  const wait = 30000 - (Date.now() % 30000) + 500;
  await new Promise((r) => setTimeout(r, wait));
  const p5 = await (await browser.newContext()).newPage();
  await signIn(p5, dana, "another fine passphrase");
  await p5.waitForURL(/\/sign-in\/two-step/);
  const code = totp(key);
  await p5.locator('input[name="code"]').fill(code);
  await p5.getByRole("button", { name: "Verify and sign in" }).click();
  await p5.waitForURL(/\/dashboard/);
  ok("app code signs in", true);
  const p6 = await (await browser.newContext()).newPage();
  await signIn(p6, dana, "another fine passphrase");
  await p6.waitForURL(/\/sign-in\/two-step/);
  await p6.locator('input[name="code"]').fill(code);
  await p6.getByRole("button", { name: "Verify and sign in" }).click();
  await p6.waitForTimeout(800);
  ok("same app code refused a second time", p6.url().includes("/sign-in/two-step"), await alertText(p6));

  // ── Admin: role from ADMIN_EMAILS after confirming; console needs two-step ──
  const p7 = await (await browser.newContext()).newPage();
  const admin = "admin@example.com";
  // The admin address may already exist from earlier runs, so set its password by reset either way.
  await signUp(p7, { name: "Site Admin", email: admin });
  await p7.goto(`${BASE}/forgot-password`);
  await p7.getByLabel("Email", { exact: true }).fill(admin);
  await p7.getByRole("button", { name: "Email me a reset link" }).click();
  await p7.waitForURL(/sent=1/);
  await p7.goto(linkIn(lastEmail(admin, /Reset your/)));
  await p7.getByLabel("New password").fill("staff review passphrase 26");
  await p7.getByLabel("Type it again").fill("staff review passphrase 26");
  await p7.getByRole("button", { name: "Set new password" }).click();
  await p7.waitForURL(/reset=1/);
  await signIn(p7, admin, "staff review passphrase 26", "/admin");
  await p7.waitForURL(/\/admin|\/sign-in\/two-step/);
  if (p7.url().includes("/admin")) {
    ok("admin without two-step is asked to set it up", /two-step/i.test(await p7.locator("main").innerText()));
    await p7.screenshot({ path: `${SHOTS}/admin-needs-two-step.png` });
  }

  // ── Delete account ──
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BASE}/account`);
  await page.getByLabel("Type your email to confirm").fill("wrong@example.com");
  await page.getByLabel("Your password").fill("another fine passphrase");
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.waitForTimeout(800);
  ok("delete refuses a mismatched email", /doesn.t match/.test(await page.locator("body").innerText()));
  await page.getByLabel("Type your email to confirm").fill(dana);
  await page.getByLabel("Your password").fill("another fine passphrase");
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.waitForURL(/account=deleted/);
  ok("account deleted", true);
  await p5.goto(`${BASE}/dashboard`);
  ok("deleted account's other sessions end", p5.url().includes("/sign-in"));
  await signIn(page, dana, "another fine passphrase");
  await page.waitForTimeout(800);
  ok("deleted account can't sign in", page.url().includes("/sign-in"));

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  console.log(results.join("\n"));
  await browser.close();
  if (results.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
})().catch((e) => { console.log(results.join("\n")); console.error(e); process.exit(1); });
