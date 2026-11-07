// Browser run of changing an account's email against the production build on :3124 with fake Resend on :4010.
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.env.E2E_BASE || "http://localhost:3124";
const EMAILS = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";
const RUN = require("crypto").randomBytes(6).toString("hex");
const PW = `aph e2e ${RUN} change passphrase`;
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); if (!cond) console.log("FAIL", name, extra); };

function emails() {
  if (!fs.existsSync(EMAILS)) return [];
  return fs.readFileSync(EMAILS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).body);
}
const lastEmail = (to, re) => emails().filter((e) => e.to === to && re.test(e.subject)).pop();
const linkIn = (e) => e.text.match(/https?:\/\/\S+/)[0];
const alertText = async (page) => (await page.locator("form [role=alert]").allInnerTexts()).join(" | ");

async function signIn(page, email, password = PW) {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** The Email card on the account page; the delete-account card also asks for the password. */
const emailCard = (page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Email", exact: true }) });

async function openChange(page) {
  await page.goto(`${BASE}/account`);
  await page.getByRole("button", { name: "Change email" }).click();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${String(e)} on ${page.url().replace(BASE, "")}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|_vercel/.test(m.text() + (m.location()?.url ?? ""))) errors.push(m.text()); });
  const stamp = Date.now();
  const oldAddr = `lee.${stamp}@example.com`;
  const newAddr = `lee.new.${stamp}@example.com`;
  const other = `kim.${stamp}@example.com`;

  // Two accounts: Lee, who moves address, and Kim, whose address is taken.
  for (const [name, email] of [["Lee Park", oldAddr], ["Kim Wu", other]]) {
    await page.goto(`${BASE}/sign-up`);
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PW);
    await page.locator('input[name="terms"]').check();
    await page.getByRole("button", { name: "Create free account" }).click();
    await page.waitForURL(/\/sign-up\/check-email/);
    await page.goto(linkIn(lastEmail(email, /Confirm your/)));
    await page.getByRole("button", { name: "Confirm my email" }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto(`${BASE}/account`);
    await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
    await page.waitForURL((u) => !/\/account/.test(u.pathname));
  }

  await signIn(page, oldAddr);
  await page.waitForURL(/\/dashboard/);

  // ── Mistakes ──
  await openChange(page);
  await page.getByLabel("New email address").fill(newAddr);
  await emailCard(page).getByLabel("Your password").fill("not my password at all");
  await page.getByRole("button", { name: "Send confirmation link" }).click();
  await page.waitForTimeout(800);
  ok("a wrong password is refused", await page.getByText("Your password isn't right.").isVisible());
  ok("no link goes out for a wrong password", !lastEmail(newAddr, /Confirm your new/));
  await page.getByLabel("New email address").fill(oldAddr);
  await emailCard(page).getByLabel("Your password").fill(PW);
  await page.getByRole("button", { name: "Send confirmation link" }).click();
  await page.waitForTimeout(800);
  ok("the current address is refused", await page.getByText("That's already the email on your account.").isVisible());

  // ── Another account's address: same reply, a note to that address, nothing changes ──
  await openChange(page);
  await page.getByLabel("New email address").fill(other);
  await emailCard(page).getByLabel("Your password").fill(PW);
  await page.getByRole("button", { name: "Send confirmation link" }).click();
  await page.getByText(`We sent a link to ${other}`).waitFor({ timeout: 5000 }).catch(() => {});
  ok("a taken address gets the same reply", await page.getByText(`We sent a link to ${other}`).isVisible());
  ok("the taken address gets a note, not a link", !!lastEmail(other, /already has an AirPermitHub account/) && !lastEmail(other, /Confirm your new/));

  // ── The real change ──
  await openChange(page);
  await page.getByLabel("New email address").fill(newAddr);
  await emailCard(page).getByLabel("Your password").fill(PW);
  await page.getByRole("button", { name: "Send confirmation link" }).click();
  await page.getByText(`We sent a link to ${newAddr}`).waitFor({ timeout: 5000 }).catch(() => {});
  ok("asking for a change says where the link went", await page.getByText(`We sent a link to ${newAddr}`).isVisible());
  const link = lastEmail(newAddr, /Confirm your new/);
  ok("the new address gets the link", !!link);
  const warned = lastEmail(oldAddr, /asked to change/);
  ok("the old address is warned, with the new one masked", !!warned && warned.text.includes("l•••@example.com") && !warned.text.includes(newAddr));
  await page.goto(`${BASE}/account`);
  ok("nothing changes before the link is used", await page.getByText(oldAddr, { exact: true }).first().isVisible());

  const url = linkIn(link);
  await page.goto(url);
  ok("the link page names the new address", await page.getByText(newAddr).isVisible());
  await page.getByRole("button", { name: "Use this email" }).click();
  await page.waitForURL(/\/account\?email=changed/);
  ok("the account shows the new address", await page.getByText(`Your email is now ${newAddr}`).isVisible());
  ok("the old address hears it's done", !!lastEmail(oldAddr, /email was changed/));
  await page.goto(url);
  ok("the link works once", await page.getByText("This link has expired or was already used").isVisible());

  // ── Sign-in follows the new address ──
  await page.goto(`${BASE}/account`);
  await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await page.waitForURL((u) => !/\/account/.test(u.pathname));
  await signIn(page, oldAddr);
  await page.waitForTimeout(800);
  ok("the old address no longer signs in", /don't match/.test(await alertText(page)), await alertText(page));
  await signIn(page, newAddr);
  await page.waitForURL(/\/dashboard/).catch(() => {});
  ok("the new address signs in", /\/dashboard/.test(page.url()), page.url());

  // ── Guessing passwords through this form is limited ──
  await openChange(page);
  for (let i = 0; i < 9; i++) {
    await page.getByLabel(/email address/).fill(`x${i}.${stamp}@example.com`);
    await emailCard(page).getByLabel("Your password").fill(`wrong guess ${i} here`);
    await page.getByRole("button", { name: "Send confirmation link" }).click();
    await page.waitForTimeout(500);
  }
  ok("password guesses here stop after a few", /Too many wrong passwords/.test(await alertText(page)), await alertText(page));

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - failed}/${results.length} email change checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
