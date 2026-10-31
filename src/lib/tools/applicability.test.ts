import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GHG_CO2E, GHG_HEAT, HAP_SINGLE, HAP_TOTAL, PSD_LISTED, PSD_OTHER, TV_MAJOR, TV_OZONE,
  applicabilityCsv, equipmentTypes, hapStatus, quadOWindows, screenAll, screenEquipment, screenFacility,
  type EquipmentInput, type FacilityInput,
} from "./applicability";
import { RT } from "./rule-text";

const facility = (p: Partial<FacilityInput> = {}): FacilityInput => ({
  name: "Test", state: "", hap: "unknown", hapSingle: null, hapTotal: null,
  pte: { NOx: null, CO: null, VOC: null, SO2: null, PM10: null, "PM2.5": null, PM: null },
  listedCategory: "unknown", ozone: "unknown", oilGas: false, ghgListed: "unknown", ghgCo2e: null, combustionMmbtu: null, ...p,
});
const pte = (v: Partial<FacilityInput["pte"]>) => ({ NOx: 1, CO: 1, VOC: 1, SO2: 1, PM10: 1, "PM2.5": 1, PM: 1, ...v });
const eq = (p: Partial<EquipmentInput> & Pick<EquipmentInput, "type">): EquipmentInput => ({ id: "e", name: "", date: "", dateKind: "construction", ...p });
const find = (list: { key: string }[], key: string) => list.find((x) => x.key === key) as ReturnType<typeof screenFacility>[number];

const allQuoteText = Object.values(RT).map((q) => q.text).join(" \n ");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

describe("thresholds and dates come from the quoted rule text", () => {
  it("states each numeric threshold in its quote", () => {
    expect(RT.hapMajor.text).toContain(`${HAP_SINGLE} tons per year`);
    expect(RT.hapMajor.text).toContain(`${HAP_TOTAL} tons per year`);
    expect(RT.tvMajor100.text).toContain(`${TV_MAJOR} tpy`);
    for (const t of new Set(Object.values(TV_OZONE))) expect(RT.tvOzone.text).toContain(`${t} tpy`);
    expect(RT.psdListed.text).toContain(`${PSD_LISTED} tons per year`);
    expect(RT.psd250.text).toContain(`${PSD_OTHER} tons per year`);
    expect(RT.ghgHeat.text).toContain(`${GHG_HEAT} mmBtu/hr`);
    expect(RT.ghgA4.text).toContain(`${GHG_CO2E.toLocaleString("en-US")} metric tons`);
    expect(RT.kbVp.text).toMatch(/3\.5 kilopascals[\s\S]*15\.0 kPa/);
    expect(RT.kbCustody.text).toContain("1,589.874");
    expect(RT.kcCustody.text).toContain("420,000 gal");
  });

  it("finds every date the screen compares against in a quote", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/tools/applicability.ts"), "utf8");
    const dates = new Set([...src.matchAll(/"(\d{4})-(\d{2})-(\d{2})"/g)].map(([, y, m, d]) => `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`));
    expect(dates.size).toBeGreaterThan(15);
    for (const d of dates) expect(allQuoteText, d).toContain(d);
  });
});

describe("facility screen", () => {
  it("derives HAP status from potential HAP", () => {
    expect(hapStatus(facility({ hapSingle: 12 }))).toBe("major");
    expect(hapStatus(facility({ hapSingle: 4, hapTotal: 26 }))).toBe("major");
    expect(hapStatus(facility({ hapSingle: 4, hapTotal: 9 }))).toBe("area");
    expect(hapStatus(facility({ hapSingle: 4 }))).toBe("unknown");
  });

  it("flags Title V at 100 tpy and at the ozone nonattainment thresholds", () => {
    expect(find(screenFacility(facility({ pte: pte({ NOx: 100 }), ozone: "none", hap: "area" })), "title-v").status).toBe("potentially-applicable");
    expect(find(screenFacility(facility({ pte: pte({ NOx: 99 }), ozone: "none", hap: "area" })), "title-v").status).toBe("likely-not-applicable");
    expect(find(screenFacility(facility({ pte: pte({ VOC: 30 }), ozone: "severe", hap: "area" })), "title-v").status).toBe("potentially-applicable");
    expect(find(screenFacility(facility({ pte: pte({ VOC: 30 }), ozone: "serious", hap: "area" })), "title-v").status).toBe("likely-not-applicable");
    expect(find(screenFacility(facility({ pte: pte({ NOx: 5 }) })), "title-v").status).toBe("more-info-needed");
  });

  it("uses 100 tpy for listed PSD categories and 250 tpy otherwise", () => {
    expect(find(screenFacility(facility({ pte: pte({ CO: 150 }), listedCategory: "yes" })), "psd-major").status).toBe("potentially-applicable");
    expect(find(screenFacility(facility({ pte: pte({ CO: 150 }), listedCategory: "no" })), "psd-major").status).toBe("likely-not-applicable");
    expect(find(screenFacility(facility({ pte: pte({ CO: 150 }) })), "psd-major").status).toBe("more-info-needed");
    expect(find(screenFacility(facility({ pte: pte({ CO: 250 }), listedCategory: "no" })), "psd-major").status).toBe("potentially-applicable");
  });

  it("needs both combustion conditions for GHG reporting", () => {
    expect(find(screenFacility(facility({ ghgListed: "no", combustionMmbtu: 30, ghgCo2e: 25000 })), "ghgrp").status).toBe("potentially-applicable");
    expect(find(screenFacility(facility({ ghgListed: "no", combustionMmbtu: 29, ghgCo2e: 90000 })), "ghgrp").status).toBe("likely-not-applicable");
    expect(find(screenFacility(facility({ ghgListed: "a3" })), "ghgrp").status).toBe("potentially-applicable");
  });
});

describe("equipment screen", () => {
  const f = facility({ hap: "area" });
  it("applies the IIII order and manufacture dates", () => {
    const at = (p: Partial<EquipmentInput>) => find(screenEquipment(eq({ type: "ci-engine", ...p }), f), "nsps-iiii").status;
    expect(at({ date: "2005-07-11", manufactured: "2007-01-01" })).toBe("likely-not-applicable");
    expect(at({ date: "2005-07-12", manufactured: "2006-04-02" })).toBe("potentially-applicable");
    expect(at({ date: "2005-07-12", manufactured: "2006-04-01" })).toBe("likely-not-applicable");
    expect(at({ date: "2005-07-12", manufactured: "2006-05-01", firePump: true })).toBe("likely-not-applicable");
    expect(at({ date: "2005-07-12" })).toBe("more-info-needed");
  });

  it("applies the JJJJ manufacture date for engine size and design", () => {
    const at = (p: Partial<EquipmentInput>) => find(screenEquipment(eq({ type: "si-engine", date: "2007-01-01", ...p }), f), "nsps-jjjj").status;
    expect(at({ hp: 600, burn: "4SLB", manufactured: "2007-12-31" })).toBe("likely-not-applicable");
    expect(at({ hp: 600, burn: "4SRB", manufactured: "2007-12-31" })).toBe("potentially-applicable");
    expect(at({ hp: 600, manufactured: "2007-12-31" })).toBe("more-info-needed");
    expect(at({ hp: 300, manufactured: "2008-07-01" })).toBe("potentially-applicable");
    expect(at({ hp: 300, manufactured: "2008-06-30" })).toBe("likely-not-applicable");
  });

  it("converts tank capacity and vapor pressure for Kb and applies Kc sizes", () => {
    const kb = (p: Partial<EquipmentInput>) => find(screenEquipment(eq({ type: "tank", date: "2000-01-01", liquid: "vol", ...p }), f), "nsps-kb").status;
    expect(kb({ gallons: 20000, tvp: 0.4 })).toBe("likely-not-applicable"); // 75.7 m3, 2.76 kPa < 15.0
    expect(kb({ gallons: 20000, tvp: 2.5 })).toBe("potentially-applicable"); // 17.2 kPa
    expect(kb({ gallons: 19000, tvp: 5 })).toBe("likely-not-applicable"); // below 75 m3
    const kc = (p: Partial<EquipmentInput>) => find(screenEquipment(eq({ type: "tank", date: "2024-01-01", liquid: "vol", ...p }), f), "nsps-kc");
    expect(kc({ gallons: 30000, tvp: 1.0 }).status).toBe("potentially-applicable");
    expect(kc({ gallons: 30000, tvp: 1.0 }).why).toContain("below the control criteria");
    expect(kc({ gallons: 30000, tvp: 0.2 }).status).toBe("likely-not-applicable");
    expect(kc({ gallons: 400000, tvp: 3, liquid: "crude-condensate", beforeCustody: true }).status).toBe("likely-not-applicable");
  });

  it("places turbines by commence date", () => {
    const keys = (date: string) => screenEquipment(eq({ type: "turbine", date, mmbtu: 50 }), f).filter((x) => x.status === "potentially-applicable").map((x) => x.key);
    expect(keys("1990-01-01")).toContain("nsps-gg");
    expect(keys("2010-01-01")).toContain("nsps-kkkk");
    expect(keys("2025-01-01")).toContain("nsps-kkkka");
  });

  it("puts oil and gas dates in the right subpart windows", () => {
    expect(quadOWindows("2011-08-23")).toEqual(["KKK", "LLL", "OOOOc"]);
    expect(quadOWindows("2011-08-24")).toEqual(["OOOO", "OOOOc"]);
    expect(quadOWindows("2015-09-19")).toEqual(["OOOOa", "OOOOc"]);
    expect(quadOWindows("2022-12-07")).toEqual(["OOOOb"]);
  });

  it("screens OOOOb tank batteries on VOC or methane", () => {
    const at = (p: Partial<EquipmentInput>) => find(screenEquipment(eq({ type: "tank", date: "2024-01-01", liquid: "crude-condensate", gallons: 10000, ...p }), facility({ oilGas: true })), "quad-o-oooob");
    expect(at({ vocTpy: 6, ch4Tpy: 0 }).status).toBe("potentially-applicable");
    expect(at({ vocTpy: 2, ch4Tpy: 20 }).status).toBe("potentially-applicable");
    expect(at({ vocTpy: 2, ch4Tpy: 5 }).status).toBe("likely-not-applicable");
    expect(at({ vocTpy: 2, ch4Tpy: 5 }).basis).toContain(RT.o4bTankVoc);
  });

  it("gives every result a status, a reason, and rule text, for every equipment type", () => {
    for (const t of equipmentTypes) {
      for (const date of ["", "1980-01-01", "2012-01-01", "2024-06-01"]) {
        for (const fac of [facility({ hap: "major", oilGas: true }), facility({ hap: "area" }), facility()]) {
          const out = screenEquipment(eq({ type: t.value, date, site: "other" }), fac);
          expect(out.length, t.value).toBeGreaterThan(0);
          for (const x of out) {
            expect(["potentially-applicable", "likely-not-applicable", "more-info-needed"]).toContain(x.status);
            expect(x.why.length, x.key).toBeGreaterThan(10);
            expect(x.basis.length, `${t.value} ${x.key}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe("export", () => {
  it("labels the CSV as a screening template and lists every finding", () => {
    const f = facility({ name: "Plant, \"A\"" });
    const e = [eq({ type: "boiler", name: "B-1", date: "2015-01-01", mmbtu: 50 })];
    const csv = applicabilityCsv(f, e, "2026-10-31");
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("AirPermitHub Template");
    expect(lines[1]).toContain("Not an applicability determination");
    expect(csv).toContain('"Plant, ""A"""');
    const { facility: fw, equipment } = screenAll(f, e);
    for (const x of [...fw, ...equipment[0].findings]) expect(csv).toContain(x.rule);
  });
});
