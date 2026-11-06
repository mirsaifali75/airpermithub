import { describe, expect, it } from "vitest";
import { readCapped } from "./body";

const streamed = (parts: string[]) =>
  new Request("http://x/api", {
    method: "POST",
    body: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close(); } }),
    // @ts-expect-error Node's fetch needs this for a streamed body
    duplex: "half",
  });

describe("readCapped", () => {
  it("returns a body within the cap", async () => {
    expect(await readCapped(new Request("http://x/api", { method: "POST", body: '{"a":1}' }), 100)).toBe('{"a":1}');
  });

  it("refuses a declared size over the cap without reading it", async () => {
    const req = new Request("http://x/api", { method: "POST", body: "x".repeat(50), headers: { "content-length": "5000" } });
    expect(await readCapped(req, 100)).toBeNull();
  });

  it("stops a streamed body as soon as it passes the cap", async () => {
    expect(await readCapped(streamed(["x".repeat(60), "x".repeat(60), "x".repeat(60)]), 100)).toBeNull();
    expect(await readCapped(streamed(["héllo ", "wörld"]), 100)).toBe("héllo wörld");
  });

  it("counts bytes, not characters", async () => {
    expect(await readCapped(new Request("http://x/api", { method: "POST", body: "é".repeat(60) }), 100)).toBeNull();
  });
});
