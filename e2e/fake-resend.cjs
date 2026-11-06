// Stands in for Resend's email API during end-to-end runs: every email is appended to EMAILS_FILE.
const http = require("http");
const fs = require("fs");
const file = process.env.EMAILS_FILE || "e2e/.out/emails.jsonl";
http
  .createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      fs.appendFileSync(file, JSON.stringify({ path: req.url, body: JSON.parse(b || "{}") }) + "\n");
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"id":"fake"}');
    });
  })
  .listen(4010, () => console.log("fake email service on :4010"));
