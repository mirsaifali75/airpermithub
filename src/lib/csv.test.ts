import { describe, expect, it } from "vitest";
import { csvCell, csvFileName, csvLines, toCsv } from "./csv";

describe("csv", () => {
  it("quotes only when needed, doubling inner quotes", () => {
    expect(csvCell("Boiler B-1")).toBe("Boiler B-1");
    expect(csvCell('Plant, "A"')).toBe('"Plant, ""A"""');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell(" padded ")).toBe('" padded "');
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(0)).toBe("0");
  });

  it("opens formula-like text as text but leaves numbers alone", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("+1 call")).toBe("'+1 call");
    expect(csvCell("-12.5")).toBe("-12.5");
    expect(csvCell("+3e2")).toBe("+3e2");
    expect(csvCell(-4)).toBe("-4");
  });

  it("ends every line, including the last, with CRLF", () => {
    expect(csvLines([["a", "b"], [], [1]])).toBe("a,b\r\n\r\n1\r\n");
  });

  it("labels worksheets and dates them", () => {
    const lines = toCsv("Rolling Limit Tracker", [["x"]], "2026-10-31").split("\r\n");
    expect(lines.slice(0, 3)).toEqual(["AirPermitHub Template: Rolling Limit Tracker (not an agency form)", "Exported,2026-10-31", "x"]);
  });

  it("builds tidy file names", () => {
    expect(csvFileName("compliance-matrix", "Tank Battery #2")).toMatch(/^airpermithub-compliance-matrix-tank-battery-2-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csvFileName("my-factors", undefined, "")).toMatch(/^airpermithub-my-factors-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
