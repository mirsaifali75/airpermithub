// Saved work follows the account: import on first sign-in, load on another browser, changes flow back, sign-out clears.
const { chromium } = require("playwright");
const fs = require("fs");
const EMAILS = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";

const BASE = process.env.E2E_BASE || "http://localhost:3124";
const PW = "correct horse battery staple";
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); };
const emails = () => fs.readFileSync(EMAILS, "utf8").trim().split("\n").map((l) => JSON.parse(l).body);
const lastEmail = (to, re) => emails().filter((e) => e.to === to && re.test(e.subject)).pop();
const linkIn = (e) => e.text.match(/https?:\/\/\S+/)[0];
const ls = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
const settled = (page) => page.waitForFunction(() => localStorage.getItem("aph.sync.owner") && !localStorage.getItem("aph.sync.dirty"), null, { timeout: 15000 });

async function signUpAndConfirm(page, name, email) {
  await page.goto(`${BASE}/sign-up`);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(/check-email/);
  await page.goto(linkIn(lastEmail(email, /Confirm your/)));
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await page.waitForURL(/\/dashboard/);
}
async function signIn(page, email) {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
}

(async () => {
  const browser = await chromium.launch();
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const errors = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now();
  const dana = `sync.${stamp}@example.com`;
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Browser A, signed out: bookmark a job, and hold a task saved before accounts existed.
  await a.goto(`${BASE}/jobs`);
  await a.getByRole("button", { name: "Save Air Permitting Engineer" }).first().click();
  await a.evaluate((date) => localStorage.setItem("aph.compliance.tasks.v1", JSON.stringify([{ id: "u1", title: "Annual compliance certification", facility: "Station 4", category: "Certification", date }])), nextMonth);
  ok("signed-out bookmark kept in the browser", (await ls(a, "aph.jobs.saved.v1")) === '["demo-1"]');

  // First sign-in in A brings that work into the new account.
  await signUpAndConfirm(a, "Sync Tester", dana);
  await settled(a);
  ok("browser work sent to the account on first sign-in", true);

  // Browser B, fresh: sign in and get it.
  await signIn(b, dana);
  await settled(b);
  ok("other browser gets the saved job", (await ls(b, "aph.jobs.saved.v1")) === '["demo-1"]', await ls(b, "aph.jobs.saved.v1"));
  ok("other browser gets the task", /Annual compliance certification/.test(await ls(b, "aph.compliance.tasks.v1") ?? ""));
  await b.waitForTimeout(300);
  const stats = await b.locator("#qs").locator("xpath=..").innerText();
  ok("dashboard shows them", /1\s*Saved jobs/.test(stats) && /1\s*Upcoming deadlines/.test(stats), stats.replace(/\s+/g, " ").slice(0, 120));

  // A fills in a tool B has never opened; B opening it (which fills in default months) must not blank A's work.
  await a.goto(`${BASE}/tools/rolling-12-month-tracker`);
  await a.getByLabel("What is limited").fill("NOx from Engine 3");
  await a.waitForTimeout(1500);
  await settled(a);
  await b.goto(`${BASE}/tools/rolling-12-month-tracker`);
  await b.waitForFunction(() => (localStorage.getItem("aph.tools.rolling.v1") ?? "").includes("Engine 3"), null, { timeout: 15000 }).catch(() => {});
  await b.waitForTimeout(500);
  ok("tool opened on a new browser shows the account's work, not a blank form", (await b.getByLabel("What is limited").inputValue()) === "NOx from Engine 3", await b.getByLabel("What is limited").inputValue());
  await a.reload();
  await settled(a);
  ok("and the account's copy is unchanged", (await a.getByLabel("What is limited").inputValue()) === "NOx from Engine 3");

  // A change in B reaches A.
  await b.goto(`${BASE}/tools/deviation-log`);
  await b.getByLabel("Report cycle").selectOption("12");
  await b.waitForTimeout(1500);
  await settled(b);
  await a.goto(`${BASE}/tools/deviation-log`);
  await a.waitForFunction(() => (localStorage.getItem("aph.tools.deviations.v1") ?? "").includes('"cycle":12'), null, { timeout: 15000 });
  await a.waitForTimeout(300);
  ok("change made in one browser shows in the other", (await a.getByLabel("Report cycle").inputValue()) === "12");

  // And A's change reaches B's dashboard.
  await a.goto(`${BASE}/jobs`);
  await settled(a);
  await a.getByRole("button", { name: "Save EHS Specialist – Midstream" }).first().click();
  await a.waitForTimeout(1500);
  await settled(a);
  await b.goto(`${BASE}/dashboard`);
  await b.waitForFunction(() => (localStorage.getItem("aph.jobs.saved.v1") ?? "").includes("demo-2"), null, { timeout: 15000 });
  ok("second bookmark reaches the other browser", true);

  // The top bar offers Sign out while signed in, from any page.
  await b.goto(`${BASE}/tools/deviation-log`);
  await settled(b);
  const strip = b.locator("div.bg-navy-950").first();
  await strip.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 10000 });
  ok("top bar shows Sign out when signed in", (await strip.getByRole("button", { name: "Sign out" }).count()) === 1 && (await strip.getByRole("link", { name: "Sign in" }).count()) === 0);
  await strip.getByRole("button", { name: "Sign out" }).click();
  await b.waitForURL(`${BASE}/`);
  await b.waitForFunction(() => !localStorage.getItem("aph.sync.owner"), null, { timeout: 15000 });
  await strip.getByRole("link", { name: "Sign in" }).waitFor({ timeout: 10000 });
  ok("top bar Sign out signs out, clears the account's work, and shows Sign in again", (await ls(b, "aph.jobs.saved.v1")) === null && (await ls(b, "aph.tools.deviations.v1")) === null);
  const session = await b.evaluate(() => fetch("/api/auth/session").then((r) => r.json()));
  ok("session is really gone after top bar Sign out", !session?.user, JSON.stringify(session));
  await b.goto(`${BASE}/tools/deviation-log`);
  ok("signed out, the tool page shows its preview again", (await b.locator("#preview-heading").count()) === 1);
  await signIn(b, dana);
  await settled(b);

  // Signing out removes the account's work from that browser.
  await a.goto(`${BASE}/account`);
  await a.locator("main").getByRole("button", { name: "Sign out", exact: true }).click();
  await a.waitForURL(`${BASE}/`);
  await a.waitForFunction(() => !localStorage.getItem("aph.sync.owner"), null, { timeout: 15000 });
  ok("sign-out clears the account's work from the browser", (await ls(a, "aph.jobs.saved.v1")) === null && (await ls(a, "aph.tools.deviations.v1")) === null);

  // Someone else signing in on A doesn't inherit it.
  const sam = `sam.${stamp}@example.com`;
  await signUpAndConfirm(a, "Sam Other", sam);
  await settled(a).catch(() => {});
  ok("next person on the browser starts empty", (await ls(a, "aph.jobs.saved.v1")) === null && (await ls(a, "aph.compliance.tasks.v1")) === null);
  await b.reload();
  await settled(b);
  ok("first account still has its work", (await ls(b, "aph.jobs.saved.v1")) === '["demo-1","demo-2"]', await ls(b, "aph.jobs.saved.v1"));

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  console.log(results.join("\n"));
  await browser.close();
  if (results.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
})().catch((e) => { console.log(results.join("\n")); console.error(e); process.exit(1); });
