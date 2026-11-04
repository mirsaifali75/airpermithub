import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { workbooks } from "./workbooks";

describe("workbook downloads", () => {
  it("every listed workbook file exists in public/workbooks", () => {
    for (const w of workbooks) expect(existsSync(join(process.cwd(), "public", "workbooks", w.file)), w.file).toBe(true);
  });
  it("has unique slugs and files", () => {
    expect(new Set(workbooks.map((w) => w.slug)).size).toBe(workbooks.length);
    expect(new Set(workbooks.map((w) => w.file)).size).toBe(workbooks.length);
  });
});
