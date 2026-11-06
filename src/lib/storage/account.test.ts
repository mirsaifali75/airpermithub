import { describe, expect, it } from "vitest";
import { MAX_SAVED_DEPTH, withoutNul } from "./account";

describe("withoutNul", () => {
  it("drops NUL from strings and keys at any depth", () => {
    expect(withoutNul({ "a\u0000": ["x\u0000y", { z: "\u0000" }], n: 3, b: true, v: null })).toEqual({ a: ["xy", { z: "" }], n: 3, b: true, v: null });
  });

  it("leaves ordinary tool data unchanged", () => {
    const data = { rows: [{ month: "2026-01", tons: 1.25, note: "back\\slash \\u0000 literal" }] };
    expect(withoutNul(data)).toEqual(data);
  });

  it("refuses values nested deeper than any tool saves", () => {
    let deep: unknown = 1;
    for (let i = 0; i < MAX_SAVED_DEPTH + 5; i++) deep = [deep];
    expect(withoutNul(deep)).toBeUndefined();
    let ok: unknown = 1;
    for (let i = 0; i < 10; i++) ok = { a: ok };
    expect(withoutNul(ok)).toEqual(ok);
  });
});
