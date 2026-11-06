import { describe, expect, it } from "vitest";
import { isSavedKey, mergeSaved } from "./saved";

describe("saved work", () => {
  it("follows only the tools' own keys", () => {
    for (const k of ["aph.tools.deviations.v1", "aph.calc.saved.v1", "aph.calc.draft.engines.v1", "aph.calc.factors.v1", "aph.compliance.tasks.v1", "aph.jobs.saved.v1"]) expect(isSavedKey(k)).toBe(true);
    for (const k of ["aph.sync.owner", "aph.sync.dirty", "aph_device", "aph.tools", "aph.tools.", "aph.tools.X", "other.tools.a", `aph.tools.${"a".repeat(100)}`, 42, null]) expect(isSavedKey(k)).toBe(false);
  });

  it("joins lists of records by id, keeping the account's copy of a clash", () => {
    const account = [{ id: "a", tpy: 1 }, { id: "b", tpy: 2 }];
    const browser = [{ id: "b", tpy: 99 }, { id: "c", tpy: 3 }];
    expect(mergeSaved(browser, account)).toEqual([{ id: "a", tpy: 1 }, { id: "b", tpy: 2 }, { id: "c", tpy: 3 }]);
  });

  it("joins lists of saved ids without repeats", () => {
    expect(mergeSaved(["j2", "j3"], ["j1", "j2"])).toEqual(["j1", "j2", "j3"]);
  });

  it("keeps the account's copy of a tool's entries, and the browser's when the account has none", () => {
    const account = { cycle: 6, items: [{ id: "x" }] };
    const browser = { cycle: 12, items: [{ id: "y" }] };
    expect(mergeSaved(browser, account)).toBe(account);
    expect(mergeSaved(browser, undefined)).toBe(browser);
    expect(mergeSaved(undefined, account)).toBe(account);
    expect(mergeSaved([{ id: "a" }, "loose"], [{ id: "b" }])).toEqual([{ id: "b" }]);
  });
});
