// Floods and junk input against a local production build; the server must stay up and answer sensibly.
const BASE = process.env.E2E_BASE || "http://localhost:3124";
const manifest = require(require("path").join(process.cwd(), ".next/server/server-reference-manifest.json")).node;
const action = (name) => Object.entries(manifest).find(([, v]) => v.exportedName === name)[0];
const results = [];
const ok = (name, cond, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${String(extra).slice(0, 220)})` : ""}`);

const formAction = async (name, at, fields, extraHeaders = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(`_1_${k}`, v);
  fd.append("0", JSON.stringify([{}, "$K1"]));
  const r = await fetch(BASE + at, { method: "POST", redirect: "manual", headers: { "Next-Action": action(name), Accept: "text/x-component", Origin: BASE, ...extraHeaders }, body: fd });
  return { status: r.status, text: (await r.text()).slice(0, 600) };
};
const pool = async (n, conc, fn) => {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: conc }, async () => { while (i < n) { const k = i++; try { out[k] = await fn(k); } catch (e) { out[k] = { status: "ERR", text: String(e) }; } } }));
  return out;
};
const tally = (rs) => rs.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
const alive = async () => { const s = Date.now(); const r = await fetch(BASE + "/sign-in"); return { ok: r.status === 200, ms: Date.now() - s }; };

(async () => {
  // 1. Junk input into every public form.
  const junk = ["", " ", "a".repeat(150_000), "\u0000\u0000", "' OR 1=1 --", "\"; DROP TABLE \"User\"; --", "${7*7}{{7*7}}", "<script>alert(1)</script>", "😀".repeat(5000), "%00%0d%0aSet-Cookie: x=1", "a@b", "x@" + "y".repeat(300) + ".com", "../../../../etc/passwd"];
  const forms = [
    ["signInWithPassword", "/sign-in", (v) => ({ email: v, password: v, next: v })],
    ["signUp", "/sign-up", (v) => ({ name: v, email: v, password: v, terms: v, next: v, accountType: v })],
    ["requestReset", "/forgot-password", (v) => ({ email: v })],
    ["setNewPassword", "/reset-password", (v) => ({ token: v, password: v, confirm: v })],
    ["confirmEmailAction", "/verify-email", (v) => ({ token: v, next: v })],
    ["answerTwoStep", "/sign-in/two-step", (v) => ({ code: v, challenge: v, next: v })],
  ];
  for (const [name, at, mk] of forms) {
    const rs = [];
    for (const v of junk) {
      try { rs.push(await formAction(name, at, mk(v), { "X-Forwarded-For": `198.51.100.${Math.floor(Math.random() * 250)}` })); }
      catch (e) { rs.push({ status: `refused:${e.cause?.code ?? e}`, text: "", big: v.length * Object.keys(mk(v)).length }); }
    }
    // A body over the 1 MB server-action limit is cut off by the server; that counts as refused, not crashed.
    rs.forEach((r, i) => { if (String(r.status).startsWith("refused")) r.text = `input #${i} (${junk[i].length} chars)`; });
    const crashes = rs.filter((r) => (String(r.status).startsWith("refused") && !(r.big > 1_000_000)) || r.status >= 500);
    ok(`${name}: ${junk.length} junk inputs, no server errors`, crashes.length === 0, JSON.stringify(tally(rs)) + " " + (crashes.map((c) => c.text).join("; ") ?? ""));
  }
  ok("still answering after junk", (await alive()).ok);

  // 2. A wrong-password flood from many addresses at one account.
  const t0 = Date.now();
  const flood = await pool(400, 40, (k) => formAction("signInWithPassword", "/sign-in", { email: "victim@example.com", password: `guess-${k}`, next: "/dashboard" }, { "X-Forwarded-For": `10.9.${k >> 8}.${k & 255}` }));
  const blocked = flood.filter((r) => /too many|try again/i.test(r.text)).length;
  ok("400 password guesses at one account in parallel: server holds", flood.every((r) => r.status !== "ERR" && r.status < 500), JSON.stringify(tally(flood)) + ` in ${Date.now() - t0}ms`);
  ok("and the account locks after a handful", blocked >= 380, `${blocked} of 400 told to wait`);

  // 3. Page and API floods.
  const pages = ["/", "/permit-finder", "/regulations/nsps", "/states/texas", "/glossary", "/tools", "/sign-in"];
  const t1 = Date.now();
  const pageFlood = await pool(3000, 100, (k) => fetch(BASE + pages[k % pages.length]).then(async (r) => { await r.arrayBuffer(); return { status: r.status }; }));
  ok("3,000 page loads, 100 at a time", pageFlood.every((r) => r.status === 200), JSON.stringify(tally(pageFlood)) + ` in ${Date.now() - t1}ms`);
  const apiFlood = await pool(600, 60, (k) => fetch(`${BASE}/api/v1/screening`, { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `172.16.0.${k % 3}` }, body: JSON.stringify({ state: "texas", industry: "oil-gas", facilityType: "x", equipment: ["engine"] }) }).then(async (r) => { await r.text(); return { status: r.status }; }));
  ok("600 screening calls from 3 addresses: answered or rate-limited, never crashed", apiFlood.every((r) => [200, 422, 429].includes(r.status)), JSON.stringify(tally(apiFlood)));
  const search = await fetch(`${BASE}/search?q=${"nox".repeat(3000)}`);
  ok("absurdly long search URL handled", search.status < 500, search.status);
  const deep = await fetch(`${BASE}/api/v1/screening`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "[".repeat(4000) + "]".repeat(4000) });
  ok("deeply nested JSON handled", deep.status < 500, deep.status);

  // 4. Slow and huge bodies.
  const huge = await fetch(`${BASE}/sign-in`, { method: "POST", headers: { "Next-Action": action("signInWithPassword"), Origin: BASE }, body: "x".repeat(5_000_000) }).then((r) => r.status).catch((e) => `ERR ${e.cause?.code ?? e}`);
  ok("5 MB post to a form refused", huge === 413 || huge >= 400 || /ERR/.test(huge), huge);

  const after = await alive();
  ok("site still answers quickly after all of it", after.ok && after.ms < 3000, `${after.ms}ms`);
  console.log(results.join("\n"));
  console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
  if (results.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
})().catch((e) => { console.log(results.join("\n")); console.error(e); process.exit(1); });
