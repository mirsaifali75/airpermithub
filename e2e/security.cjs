// Break-in and abuse attempts against a local production build (next start on :3124).
const { chromium } = require("playwright");
const fs = require("fs");
const EMAILS = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";
const path = require("path");

const BASE = process.env.E2E_BASE || "http://localhost:3124";
// Fresh each run: the sign-up form refuses passwords found in known breaches (checked live against Have I Been Pwned).
const RUN = require("crypto").randomBytes(6).toString("hex");
const PW = `aph e2e ${RUN} first passphrase`;
const ROOT = process.cwd();
const results = [];
const ok = (name, cond, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${String(extra).slice(0, 200)})` : ""}`);
const emails = () => fs.readFileSync(EMAILS, "utf8").trim().split("\n").map((l) => JSON.parse(l).body);
const lastEmail = (to, re) => emails().filter((e) => e.to === to && re.test(e.subject)).pop();
const linkIn = (e) => e.text.match(/https?:\/\/\S+/)[0];

const manifest = require(path.join(ROOT, ".next/server/server-reference-manifest.json")).node;
const action = (name) => Object.entries(manifest).find(([, v]) => v.exportedName === name)[0];

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

/** Calls a server action the way the browser does, from inside the page (so cookies ride along). */
const callAction = (page, id, args, { at = "/dashboard" } = {}) =>
  page.evaluate(async ({ id, args, at }) => {
    const r = await fetch(at, { method: "POST", headers: { "Next-Action": id, Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(args) });
    return { status: r.status, text: (await r.text()).slice(0, 4000) };
  }, { id, args, at });

/** A form action (prevState, FormData) encoded as React does. */
const callFormAction = (page, id, prev, fields, at = "/dashboard") =>
  page.evaluate(async ({ id, prev, fields, at }) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(`_1_${k}`, v);
    fd.append("0", JSON.stringify([prev, "$K1"]));
    const r = await fetch(at, { method: "POST", headers: { "Next-Action": id, Accept: "text/x-component" }, body: fd });
    return { status: r.status, text: (await r.text()).slice(0, 4000) };
  }, { id, prev, fields, at });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  const stamp = Date.now();

  // ── 1. Security headers on pages and the API ──
  for (const p of ["/", "/sign-in", "/tools/deviation-log", "/api/v1/states"]) {
    const r = await fetch(BASE + p);
    const h = r.headers;
    ok(`headers on ${p}`, /frame-ancestors 'none'/.test(h.get("content-security-policy") ?? "") && h.get("x-frame-options") === "DENY" && h.get("x-content-type-options") === "nosniff" && /max-age=\d{8}/.test(h.get("strict-transport-security") ?? "") && !h.get("x-powered-by"));
  }

  // ── 2. XSS: a hostile name and company must render as text ──
  const xssName = `<img src=x onerror="window.__xss=1;alert('name')">Eve`;
  const eve = `eve.${stamp}@example.com`;
  await signUpAndConfirm(page, xssName, eve);
  await page.goto(`${BASE}/account`);
  const company = page.locator("main input[name=company]");
  if (await company.count()) {
    await company.fill(`<script>window.__xss=2</script><svg onload="window.__xss=3">`);
    await page.locator("main").getByRole("button", { name: /Save/ }).first().click();
    await page.waitForTimeout(1200);
  }
  for (const p of ["/dashboard", "/account"]) {
    await page.goto(BASE + p);
    await page.waitForTimeout(500);
    ok(`hostile name shown as plain text on ${p}`, (await page.evaluate(() => window.__xss)) === undefined && dialogs.length === 0, dialogs.join(","));
  }
  const welcome = emails().filter((e) => e.to === eve).map((e) => e.html ?? "").join("\n");
  ok("hostile name never lands raw in an email", !/<img src=x/.test(welcome));

  // ── 3. Session cookie flags ──
  const cookies = await ctx.cookies();
  const session = cookies.find((c) => /authjs\.session-token/.test(c.name));
  ok("session cookie is HttpOnly and SameSite=Lax", !!session && session.httpOnly && session.sameSite === "Lax", session && `${session.name} httpOnly=${session.httpOnly} sameSite=${session.sameSite}`);
  ok("no session token readable from page scripts", !(await page.evaluate(() => document.cookie)).includes("session-token"));

  // ── 4. Open redirect after sign-in ──
  const bad = ["//evil.example", "/\\evil.example", "https://evil.example", "/%09/evil.example", "/%2F%2Fevil.example", "javascript:alert(1)", "/\t/evil.example", "\\\\evil.example"];
  const p2 = await (await browser.newContext()).newPage();
  for (const next of bad) {
    await p2.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
    await p2.getByLabel("Email", { exact: true }).fill(eve);
    await p2.getByLabel("Password", { exact: true }).fill(PW);
    await p2.getByRole("button", { name: "Sign in", exact: true }).click();
    await p2.waitForLoadState("networkidle").catch(() => {});
    await p2.waitForTimeout(400);
    ok(`sign-in next=${JSON.stringify(next)} stays on this site`, new URL(p2.url()).origin === BASE, p2.url());
    await p2.context().clearCookies();
  }

  // ── 5. Forged cross-site server action calls are refused ──
  const pushId = action("pushSaved");
  const forged = await fetch(`${BASE}/dashboard`, {
    method: "POST",
    headers: { "Next-Action": pushId, Origin: "https://evil.example", Cookie: `${session.name}=${session.value}`, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
    body: JSON.stringify([[{ key: "aph.jobs.saved.v1", value: ["evil"], base: null }]]),
  });
  const forgedText = await forged.text();
  ok("server action from another site is refused", forged.status >= 400 || !/"ok":true/.test(forgedText), `${forged.status} ${forgedText.slice(0, 120)}`);
  const pull = await callAction(page, action("pullSaved"), []);
  ok("forged call stored nothing", !pull.text.includes('"evil"'));

  // ── 6. Saved-work abuse ──
  const push = (items) => callAction(page, pushId, [items]);
  ok("unknown saved key refused", /isn't saved work/.test((await push([{ key: "aph.evil.v1", value: 1, base: null }])).text));
  ok("prototype key refused", /isn't saved work/.test((await push([{ key: "__proto__", value: 1, base: null }])).text));
  ok("oversized value refused", /too large/.test((await push([{ key: "aph.jobs.saved.v1", value: "x".repeat(600_000), base: null }])).text));
  ok("too many items at once refused", /too much at once/.test((await push(Array.from({ length: 500 }, (_, i) => ({ key: "aph.jobs.saved.v1", value: i, base: null })))).text));
  ok("duplicate keys in one push refused", /isn't saved work/.test((await push([{ key: "aph.jobs.saved.v1", value: 1, base: null }, { key: "aph.jobs.saved.v1", value: 2, base: null }])).text));
  ok("bad version stamp refused", /isn't saved work/.test((await push([{ key: "aph.jobs.saved.v1", value: 1, base: "not-a-date" }])).text));
  const big = await page.evaluate(async ({ id }) => {
    const r = await fetch("/dashboard", { method: "POST", headers: { "Next-Action": id, Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify([[{ key: "aph.jobs.saved.v1", value: "y".repeat(3_000_000), base: null }]]) });
    return r.status;
  }, { id: pushId });
  ok("3 MB request body refused by the server", big >= 400, big);

  let throttled = false;
  for (let i = 0; i < 130 && !throttled; i++) throttled = /Too many saves/.test((await push([{ key: "aph.jobs.saved.v1", value: [`demo-${i}`], base: null }])).text);
  ok("a script hammering saves is slowed down", throttled);

  // ── 7. A normal account can't use reviewer or admin actions ──
  const dec = await callFormAction(page, action("decide"), {}, { taskId: "x", decision: "approve" }, "/admin/review");
  ok("normal account refused by review decision", /reviewer account/.test(dec.text), dec.text.slice(0, 160));
  const rm = await callFormAction(page, action("removeHost"), {}, { domain: "gov" }, "/admin/review");
  ok("normal account refused by official-source change", /reviewer account/.test(rm.text), rm.text.slice(0, 160));
  await page.goto(`${BASE}/admin/review`);
  ok("admin pages closed to a normal account", !/Review queue/i.test(await page.locator("main").innerText()) || /sign in|not allowed|reviewer/i.test(await page.locator("main").innerText()), page.url());

  // ── 8. Signed-out calls to account actions ──
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(BASE + "/");
  const anonPush = await callAction(anon, pushId, [[{ key: "aph.jobs.saved.v1", value: ["x"], base: null }]], { at: "/" });
  ok("signed-out save refused", /Sign in to save/.test(anonPush.text));
  const anonDelete = await callFormAction(anon, action("deleteAccount"), {}, { confirm: eve, password: PW }, "/account");
  ok("signed-out delete goes nowhere", !/"ok"/.test(anonDelete.text) && anonDelete.status < 500, anonDelete.status);

  // ── 9. Public API abuse ──
  const sc = (body, headers = {}) => fetch(`${BASE}/api/v1/screening`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
  ok("screening: oversized body 413", (await sc("x".repeat(9000))).status === 413);
  ok("screening: broken JSON 400", (await sc("{oops")).status === 400);
  ok("screening: wrong shape 422", (await sc(JSON.stringify({ state: "../../etc/passwd", equipment: "x".repeat(50) }))).status === 422);
  let limited = false;
  for (let i = 0; i < 40 && !limited; i++) limited = (await sc("{}", { "X-Forwarded-For": "203.0.113.9" })).status === 429;
  ok("screening: flood gets 429", limited);
  for (const t of ["..%2F..%2Fpackage.json", "%2e%2e%2f%2e%2e%2f.env", "....//....//etc/passwd", "a".repeat(3000)]) {
    const r = await fetch(`${BASE}/api/v1/templates/${t}`);
    const body = await r.text();
    ok(`templates: ${t.slice(0, 24)} gives nothing private`, r.status === 404 && !/"dependencies"|DATABASE_URL|root:x:/.test(body), r.status);
  }
  for (const m of ["PUT", "DELETE", "PATCH"]) {
    const r = await fetch(`${BASE}/api/v1/states`, { method: m });
    ok(`states API refuses ${m}`, r.status === 405 || r.status === 404, r.status);
  }

  // ── 10. Errors don't leak internals ──
  const nf = await fetch(`${BASE}/this-page-does-not-exist-${stamp}`);
  const nfText = await nf.text();
  ok("unknown page is a plain 404", nf.status === 404 && !/at .*\.js:\d+|node_modules|prisma/i.test(nfText));
  const junk = await fetch(`${BASE}/dashboard`, { method: "POST", headers: { "Next-Action": "deadbeef", "Content-Type": "text/plain" }, body: "[" });
  const junkText = await junk.text();
  ok("junk action call leaks no stack trace", !/at .*\.js:\d+|node_modules|PrismaClient/.test(junkText), `${junk.status} ${junkText.slice(0, 100)}`);

  // ── 11. No secrets in anything the browser downloads ──
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Run with the server's AUTH_SECRET set, so the bundle check can look for it.");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const staticFiles = walk(path.join(ROOT, ".next/static"));
  const values = [secret, process.env.RESEND_API_KEY, process.env.DATABASE_URL, ...(process.env.ADMIN_EMAILS ?? "").split(/[\s,;]+/)].filter((v) => v && v.length > 5);
  const leaks = staticFiles.filter((f) => { const s = fs.readFileSync(f, "utf8"); return values.some((v) => s.includes(v)) || /postgres(ql)?:\/\/|DATABASE_URL|RESEND_API_KEY|AUTH_SECRET/.test(s); });
  ok(`no secrets in ${staticFiles.length} browser files`, leaks.length === 0, leaks.slice(0, 3).join(", "));

  // ── 12. Sign-in timing doesn't reveal which emails have accounts ──
  const timeSignIn = async (email) => {
    const t = await (await browser.newContext()).newPage();
    await t.goto(`${BASE}/sign-in`);
    await t.getByLabel("Email", { exact: true }).fill(email);
    await t.getByLabel("Password", { exact: true }).fill("wrong password here 123");
    const s = Date.now();
    await t.getByRole("button", { name: "Sign in", exact: true }).click();
    await t.locator('main [role="alert"]').first().waitFor({ timeout: 15000 });
    const ms = Date.now() - s;
    const msg = await t.locator('main [role="alert"]').first().innerText();
    await t.context().close();
    return { ms, msg };
  };
  const real = [], fake = [];
  for (let i = 0; i < 3; i++) {
    real.push(await timeSignIn(eve));
    fake.push(await timeSignIn(`nobody.${stamp}.${i}@example.com`));
  }
  const med = (a) => a.map((x) => x.ms).sort((x, y) => x - y)[1];
  ok("wrong password and unknown email get the same message", real[0].msg === fake[0].msg, `${real[0].msg} | ${fake[0].msg}`);
  ok("and take about the same time", Math.abs(med(real) - med(fake)) < 400, `${med(real)}ms vs ${med(fake)}ms`);

  ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  console.log(results.join("\n"));
  console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
  await browser.close();
  if (results.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
})().catch((e) => { console.log(results.join("\n")); console.error(e); process.exit(1); });
