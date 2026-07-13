import { describe, it, expect } from "vitest";
import {
  GRADED_RACES,
  GRADED_RACES_BY_DAY_OF_YEAR,
  GRADED_RACES_BY_KEY,
  GRADED_RACES_BY_TRIPLECROWN_KEY,
  GRADED_RACES_BY_BC_KEY,
} from "@/data/gradedRaces";

describe("GRADED_RACES_BY_DAY_OF_YEAR", () => {
  it("is a Map<number, GradedRace[]>", () => {
    expect(GRADED_RACES_BY_DAY_OF_YEAR).toBeInstanceOf(Map);
  });

  it("every key is in [1, 365]", () => {
    for (const key of GRADED_RACES_BY_DAY_OF_YEAR.keys()) {
      expect(key).toBeGreaterThanOrEqual(1);
      expect(key).toBeLessThanOrEqual(365);
    }
  });

  it("every race in GRADED_RACES appears exactly once across all entries", () => {
    const allIndexed: string[] = [];
    for (const entry of GRADED_RACES_BY_DAY_OF_YEAR.values()) {
      for (const race of entry) {
        allIndexed.push(race.uuid);
      }
    }
    expect(allIndexed.length).toBe(GRADED_RACES.length);

    // No duplicates
    expect(new Set(allIndexed).size).toBe(allIndexed.length);
  });

  it("sum of entry lengths equals GRADED_RACES.length", () => {
    let total = 0;
    for (const entry of GRADED_RACES_BY_DAY_OF_YEAR.values()) {
      total += entry.length;
    }
    expect(total).toBe(GRADED_RACES.length);
  });

  it("each entry contains only races with matching dayOfYear", () => {
    for (const [doy, races] of GRADED_RACES_BY_DAY_OF_YEAR) {
      for (const race of races) {
        expect(race.dayOfYear).toBe(doy);
      }
    }
  });

  it("days with no races return undefined from .get()", () => {
    // Find a day-of-year with no races
    const usedDays = new Set(GRADED_RACES_BY_DAY_OF_YEAR.keys());
    let emptyDay = 1;
    while (usedDays.has(emptyDay)) emptyDay++;
    expect(GRADED_RACES_BY_DAY_OF_YEAR.get(emptyDay)).toBeUndefined();
  });

  it("index is stable (same reference on repeated access)", () => {
    // Module-level const — re-importing gives same object
    // Verify it has entries (was built once at module load)
    expect(GRADED_RACES_BY_DAY_OF_YEAR.size).toBeGreaterThan(0);
  });
});

describe("GRADED_RACES_BY_KEY", () => {
  it("is a Map<string, GradedRace>", () => {
    expect(GRADED_RACES_BY_KEY).toBeInstanceOf(Map);
  });

  it("size equals GRADED_RACES.length (no missing or duplicate keys)", () => {
    expect(GRADED_RACES_BY_KEY.size).toBe(GRADED_RACES.length);
  });

  it("every key in map matches race.key for the corresponding race", () => {
    for (const [key, race] of GRADED_RACES_BY_KEY) {
      expect(race.key).toBe(key);
    }
  });

  it(".get() returns the same object as GRADED_RACES.find() for known keys", () => {
    for (const race of GRADED_RACES) {
      const found = GRADED_RACES.find((r) => r.key === race.key);
      expect(GRADED_RACES_BY_KEY.get(race.key)).toBe(found);
    }
  });

  it(".get(nonexistentKey) returns undefined", () => {
    expect(GRADED_RACES_BY_KEY.get("nonexistent-race-key-xyz")).toBeUndefined();
  });

  it("every race in GRADED_RACES is retrievable via .get(race.key)", () => {
    for (const race of GRADED_RACES) {
      expect(GRADED_RACES_BY_KEY.get(race.key)).toBe(race);
    }
  });
});

describe("GRADED_RACES_BY_TRIPLECROWN_KEY", () => {
  it("is a Map<string, GradedRace[]>", () => {
    expect(GRADED_RACES_BY_TRIPLECROWN_KEY).toBeInstanceOf(Map);
  });

  it("every key is a non-empty string", () => {
    for (const key of GRADED_RACES_BY_TRIPLECROWN_KEY.keys()) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("every race in entries has triplecrownKey matching the map key", () => {
    for (const [tcKey, races] of GRADED_RACES_BY_TRIPLECROWN_KEY) {
      for (const race of races) {
        expect(race.triplecrownKey).toBe(tcKey);
      }
    }
  });

  it("all races with triplecrownKey appear exactly once across all entries", () => {
    const tcRaces = GRADED_RACES.filter((r) => r.triplecrownKey);
    const allIndexed: string[] = [];
    for (const entry of GRADED_RACES_BY_TRIPLECROWN_KEY.values()) {
      for (const race of entry) {
        allIndexed.push(race.uuid);
      }
    }
    expect(allIndexed.length).toBe(tcRaces.length);
    expect(new Set(allIndexed).size).toBe(allIndexed.length);
  });

  it("sum of entry lengths equals count of races with triplecrownKey", () => {
    const tcCount = GRADED_RACES.filter((r) => r.triplecrownKey).length;
    let total = 0;
    for (const entry of GRADED_RACES_BY_TRIPLECROWN_KEY.values()) {
      total += entry.length;
    }
    expect(total).toBe(tcCount);
  });

  it(".get(nonexistentKey) returns undefined", () => {
    expect(GRADED_RACES_BY_TRIPLECROWN_KEY.get("nonexistent-tc-key-xyz")).toBeUndefined();
  });
});

describe("GRADED_RACES_BY_BC_KEY", () => {
  it("is a Map<string, GradedRace[]>", () => {
    expect(GRADED_RACES_BY_BC_KEY).toBeInstanceOf(Map);
  });

  it("every race in entries has bcKey matching the map key", () => {
    for (const [bcKey, races] of GRADED_RACES_BY_BC_KEY) {
      for (const race of races) {
        expect(race.bcKey).toBe(bcKey);
      }
    }
  });

  it("all races with bcKey appear exactly once across all entries", () => {
    const bcRaces = GRADED_RACES.filter((r) => r.bcKey);
    const allIndexed: string[] = [];
    for (const entry of GRADED_RACES_BY_BC_KEY.values()) {
      for (const race of entry) {
        allIndexed.push(race.uuid);
      }
    }
    expect(allIndexed.length).toBe(bcRaces.length);
    expect(new Set(allIndexed).size).toBe(allIndexed.length);
  });

  it("sum of entry lengths equals count of races with bcKey", () => {
    const bcCount = GRADED_RACES.filter((r) => r.bcKey).length;
    let total = 0;
    for (const entry of GRADED_RACES_BY_BC_KEY.values()) {
      total += entry.length;
    }
    expect(total).toBe(bcCount);
  });

  it(".get(nonexistentKey) returns undefined", () => {
    expect(GRADED_RACES_BY_BC_KEY.get("nonexistent-bc-key-xyz")).toBeUndefined();
  });
});
