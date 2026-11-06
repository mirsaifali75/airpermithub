// Stands in for Twilio Verify during end-to-end runs. Each code it "texts" is
// appended to SMS_FILE so the scripts can type it. Its own rules, close to
// Twilio's: a code lasts 10 minutes, allows 5 checks, and a number gets at
// most 5 codes in 10 minutes.
const http = require("http");
const fs = require("fs");
const file = process.env.SMS_FILE || "e2e/.out/sms.jsonl";
const pending = new Map();
const sends = new Map();
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

http
  .createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      if (!/^Basic .+/.test(req.headers.authorization || "")) return json(res, 401, { code: 20003, message: "Authenticate" });
      const form = new URLSearchParams(b);
      const to = form.get("To") || "";
      const now = Date.now();
      const live = (p) => p && now - p.at < 600_000;
      if (/\/Verifications$/.test(req.url) && req.method === "POST") {
        const recent = (sends.get(to) || []).filter((t) => now - t < 600_000);
        if (recent.length >= 5) return json(res, 429, { code: 60203, message: "Max send attempts reached" });
        sends.set(to, [...recent, now]);
        // Like Twilio, a code that's still waiting is sent again rather than replaced.
        const p = live(pending.get(to)) ? pending.get(to) : { code: String(Math.floor(100000 + Math.random() * 900000)), at: now, checks: 0 };
        pending.set(to, p);
        fs.appendFileSync(file, JSON.stringify({ to, code: p.code, channel: form.get("Channel") }) + "\n");
        return json(res, 201, { status: "pending", to, channel: "sms" });
      }
      if (/\/VerificationCheck$/.test(req.url) && req.method === "POST") {
        const p = pending.get(to);
        if (!live(p)) return json(res, 404, { code: 20404, message: "Not found" });
        p.checks += 1;
        if (p.checks > 5) { pending.delete(to); return json(res, 429, { code: 60202, message: "Max check attempts reached" }); }
        if (form.get("Code") === p.code) { pending.delete(to); return json(res, 200, { status: "approved", valid: true, to }); }
        return json(res, 200, { status: "pending", valid: false, to });
      }
      json(res, 404, { code: 20404 });
    });
  })
  .listen(4020, () => console.log("fake Twilio Verify on :4020"));
