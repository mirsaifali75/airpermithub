// Browser run of the Contact page and its form, plus the 404 page, against the production build on :3124 with fake Resend on :4010.
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.env.E2E_BASE || "http://localhost:3124";
const EMAILS = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";
const INBOX = "contact@airpermithub.com";
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); if (!cond) console.log("FAIL", name, extra); };

function emails() {
  if (!fs.existsSync(EMAILS)) return [];
  return fs.readFileSync(EMAILS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).body);
}
const fromSender = (addr) => emails().filter((e) => e.to === INBOX && e.reply_to === addr);
const alertText = async (page) => (await page.locator("form [role=alert]").allInnerTexts()).join(" | ");
const thanks = (page) => page.getByText("Thanks, your message was sent.");

async function send(page, { topic, name, email, message, pageLink, source }) {
  await page.goto(`${BASE}/contact`);
  if (topic) await page.getByLabel("What is this about?").selectOption({ label: topic });
  if (name) await page.getByLabel("Your name (optional)").fill(name);
  await page.getByLabel("Your email").fill(email);
  if (pageLink) await page.getByLabel("Page with the error").fill(pageLink);
  if (source) await page.getByLabel(/Official source/).fill(source);
  await page.getByLabel(topic === "Report an error" ? "What looks wrong?" : "Message", { exact: true }).fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${String(e)} on ${page.url().replace(BASE, "")}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|_vercel/.test(m.text() + (m.location()?.url ?? ""))) errors.push(m.text()); });
  const stamp = Date.now();

  // ── The page itself ──
  await page.goto(`${BASE}/contact`);
  ok("contact page shows the inbox address", (await page.locator(`a[href="mailto:${INBOX}"]`).count()) >= 1);
  ok("the old 'launch with accounts' note is gone", !(await page.getByText("launch with accounts").count()));
  ok("the form starts without error-report fields", !(await page.getByLabel("Page with the error").count()));
  await page.getByLabel("What is this about?").selectOption({ label: "Report an error" });
  ok("choosing 'Report an error' shows the page and source fields", (await page.getByLabel("Page with the error").count()) === 1 && (await page.getByLabel(/Official source/).count()) === 1);

  // ── A question ──
  const dana = `dana.${stamp}@example.com`;
  await send(page, { name: "Dana Lee", email: dana, message: "How do I save a calculation to my account?" });
  await thanks(page).waitFor({ timeout: 5000 }).catch(() => {});
  ok("a question is sent", await thanks(page).isVisible());
  ok("the thank-you names the reply address", await page.getByText(`We'll reply to ${dana}.`).isVisible());
  const q = fromSender(dana)[0];
  ok("the inbox gets it with the sender as Reply-To", !!q, JSON.stringify(emails().slice(-1)[0] ?? {}).slice(0, 200));
  ok("the subject is only the topic", q?.subject === "Contact form: A question about the site or a tool", q?.subject);
  ok("the message is in the email", !!q?.text.includes("How do I save a calculation to my account?"));
  ok("an unconfirmed reply address is flagged", !!q?.text.includes("Reply address: Not confirmed"));

  // ── An error report with markup in it ──
  const erin = `erin.${stamp}@example.com`;
  await send(page, { topic: "Report an error", email: erin, pageLink: "/states/nd", source: "https://deq.nd.gov/AQ/", message: "The threshold on this page looks wrong <script>alert(1)</script>" });
  await thanks(page).waitFor({ timeout: 5000 }).catch(() => {});
  ok("an error report is sent", await thanks(page).isVisible());
  const r = fromSender(erin)[0];
  ok("the report names the page as a full link", !!r?.text.includes("Page: https://airpermithub.com/states/nd"), r?.text?.slice(0, 200));
  ok("the report names the official source", !!r?.text.includes("Official source: https://deq.nd.gov/AQ/"));
  ok("markup in a message is escaped in the email", !!r && !r.html.includes("<script>") && r.html.includes("&lt;script&gt;"));

  // ── Mistakes are explained and nothing is sent ──
  const before = emails().length;
  await send(page, { email: "x@y", message: "This address has no dot after the @ sign." });
  await page.waitForTimeout(600);
  ok("a reply address without a domain is refused", /reply to/.test(await alertText(page)), await alertText(page));
  ok("what was typed stays in the form", (await page.getByLabel("Message", { exact: true }).inputValue()) === "This address has no dot after the @ sign.");
  await page.goto(`${BASE}/contact`);
  await page.getByLabel("What is this about?").selectOption({ label: "Report an error" });
  await page.getByLabel("Your email").fill(`fay.${stamp}@example.com`);
  await page.getByLabel("Page with the error").fill("javascript:alert(1)");
  await page.getByLabel("What looks wrong?").fill("Trying a script link as the page.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.waitForTimeout(600);
  ok("a script link as the page is refused", /web address/.test(await alertText(page)), await alertText(page));
  ok("nothing was sent for either mistake", emails().length === before);

  // ── A bot that fills every box ──
  const bot = `bot.${stamp}@example.com`;
  await page.goto(`${BASE}/contact`);
  await page.getByLabel("Your email").fill(bot);
  await page.getByLabel("Message", { exact: true }).fill("Buy cheap things at this link right now.");
  await page.locator('input[name="website"]').evaluate((el) => { el.value = "https://spam.example"; });
  await page.getByRole("button", { name: "Send message" }).click();
  await thanks(page).waitFor({ timeout: 5000 }).catch(() => {});
  ok("a bot gets the same thank-you", await thanks(page).isVisible());
  ok("but nothing reaches the inbox", fromSender(bot).length === 0);

  // ── Floods stop ──
  const gus = `gus.${stamp}@example.com`;
  for (let i = 1; i <= 4; i++) await send(page, { email: gus, message: `Message number ${i} from the same person.` });
  await page.waitForTimeout(600);
  ok("a flood from one network is paused", /paused the form/.test(await alertText(page)), await alertText(page));
  ok("the inbox got no more than the limit", fromSender(gus).length === 3, String(fromSender(gus).length));

  // ── Phone width ──
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p2 = await phone.newPage();
  await p2.goto(`${BASE}/contact`);
  const wide = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok("no sideways scrolling on a phone", !wide);
  await p2.screenshot({ path: "e2e/.out/contact-phone.png", fullPage: true });
  await phone.close();

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  // ── The 404 page hydrates cleanly (its print stamp once showed "/_not-found") ──
  const crashes = [];
  const onCrash = (e) => crashes.push(String(e));
  page.on("pageerror", onCrash);
  await page.goto(`${BASE}/no-such-page-${stamp}`, { waitUntil: "networkidle" });
  page.off("pageerror", onCrash);
  ok("the 404 page has no script errors", crashes.length === 0, crashes.join(" | "));

  await browser.close();
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - failed}/${results.length} contact checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
