/**
 * Characterization tests for the imported real-world data module.
 *
 * Pins current behavior of the CSV/JSON parsers and the localStorage-backed
 * dataset store before the module is moved out of @/data (dataImmutability
 * architecture invariant — src/data must be immutable/side-effect free).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCsv,
  parseRaceTime,
  parseDistance,
  rowsToDataset,
  importRealWorldText,
  getImportedDataset,
  clearImportedDataset,
  IMPORT_TEMPLATE_CSV,
} from "@/services/storage/importedRealWorldService";

beforeEach(() => {
  clearImportedDataset();
});

describe("parseCsv", () => {
  it("parses simple rows with header lowercased and snake_cased", () => {
    const rows = parseCsv("Horse Name,Country\nFrankel,GB\n");
    expect(rows).toEqual([{ horse_name: "Frankel", country: "GB" }]);
  });

  it("handles quoted fields, escaped quotes and CRLF", () => {
    const rows = parseCsv('a,b\r\n"x""y",z\r\n');
    expect(rows).toEqual([{ a: 'x"y', b: "z" }]);
  });

  it("skips empty rows and returns [] for blank input", () => {
    expect(parseCsv("a,b\n,\n1,2\n")).toEqual([{ a: "1", b: "2" }]);
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("   \n  \n")).toEqual([]);
  });
});

describe("parseRaceTime", () => {
  it("parses m:ss.cc, seconds, and m.s.cc forms", () => {
    expect(parseRaceTime("1:59.40")).toBeCloseTo(119.4);
    expect(parseRaceTime("2:20.6")).toBeCloseTo(140.6);
    expect(parseRaceTime("119.4")).toBeCloseTo(119.4);
    expect(parseRaceTime("1.59.40")).toBeCloseTo(119.4);
  });

  it("returns null for empty or non-positive values", () => {
    expect(parseRaceTime("")).toBeNull();
    expect(parseRaceTime("abc")).toBeNull();
    expect(parseRaceTime("0")).toBeNull();
  });
});

describe("parseDistance", () => {
  it("parses metres, furlongs and miles", () => {
    expect(parseDistance("2400")).toBe(2400);
    expect(parseDistance("2400m")).toBe(2400);
    expect(parseDistance("10f")).toBe(Math.round(10 * 201.168));
    expect(parseDistance("1.25mi")).toBe(Math.round(1.25 * 1609.34));
  });

  it("returns null for invalid values", () => {
    expect(parseDistance("")).toBeNull();
    expect(parseDistance("abc")).toBeNull();
    expect(parseDistance("0")).toBeNull();
    expect(parseDistance("-5")).toBeNull();
  });
});

describe("rowsToDataset", () => {
  it("classifies career rows by starts column", () => {
    const { careers, records, skipped } = rowsToDataset([
      { horse: "Frankel", starts: "14", wins: "14", earnings: "2998302" },
    ]);
    expect(careers).toHaveLength(1);
    expect(careers[0]).toMatchObject({ horse: "Frankel", starts: 14, wins: 14 });
    expect(records).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it("classifies result rows by time column and requires track/surface/distance", () => {
    const { records, skipped } = rowsToDataset([
      {
        horse: "Flightline",
        track: "Keeneland",
        surface: "Dirt",
        distance: "2012",
        time: "2:00.05",
      },
      { horse: "NoTime" },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ horse: "Flightline", surface: "Dirt", source: "imported" });
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toContain("no time or starts");
  });

  it("marks kind=record rows as official track records", () => {
    const { records } = rowsToDataset([
      {
        kind: "record",
        horse: "Arrogate",
        track: "Saratoga",
        surface: "Dirt",
        distance: "10f",
        time: "1:59.36",
      },
    ]);
    expect(records[0].isOfficialTrackRecord).toBe(true);
  });

  it("skips rows missing a horse name", () => {
    const { skipped } = rowsToDataset([{ starts: "10", wins: "5" }]);
    expect(skipped[0]).toContain("missing horse name");
  });
});

describe("importRealWorldText + getImportedDataset", () => {
  it("imports CSV text and exposes it via getImportedDataset", () => {
    const result = importRealWorldText(IMPORT_TEMPLATE_CSV, "template.csv");
    expect(result.records).toBe(2);
    expect(result.careers).toBe(1);
    const ds = getImportedDataset();
    expect(ds.records).toHaveLength(2);
    expect(ds.careers).toHaveLength(1);
    expect(ds.fileName).toBe("template.csv");
    expect(ds.importedAt).not.toBeNull();
  });

  it("imports JSON arrays and merge mode appends", () => {
    importRealWorldText(IMPORT_TEMPLATE_CSV, "a.csv");
    const json = JSON.stringify([
      { kind: "career", horse: "Enable", starts: 19, wins: 15, earnings: 10000000 },
    ]);
    const result = importRealWorldText(json, "b.json", "merge");
    expect(result.careers).toBe(1);
    const ds = getImportedDataset();
    expect(ds.careers).toHaveLength(2);
    expect(ds.fileName).toBe("b.json");
  });

  it("replace mode discards previous data and clear resets", () => {
    importRealWorldText(IMPORT_TEMPLATE_CSV, "a.csv");
    importRealWorldText(IMPORT_TEMPLATE_CSV, "b.csv", "replace");
    expect(getImportedDataset().careers).toHaveLength(1);
    clearImportedDataset();
    const ds = getImportedDataset();
    expect(ds.records).toHaveLength(0);
    expect(ds.importedAt).toBeNull();
  });
});
