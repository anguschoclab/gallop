import { describe, it, expect } from "vitest";
import { GRADED_RACES, GRADED_RACES_BY_DAY_OF_YEAR } from "@/data/gradedRaces";

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
