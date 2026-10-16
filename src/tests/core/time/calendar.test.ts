import { describe, it, expect } from "vitest";
import {
  isWeeklyBoundary,
  isSeasonBoundary,
  isYearBoundary,
  isPhaseDue,
  boundaryDaysInRange,
} from "@/core/time/calendar";

describe("calendar cadence boundaries", () => {
  it("weekly boundary on every 7th day", () => {
    expect(isWeeklyBoundary(7)).toBe(true);
    expect(isWeeklyBoundary(14)).toBe(true);
    expect(isWeeklyBoundary(8)).toBe(false);
    expect(isWeeklyBoundary(1)).toBe(false);
  });

  it("season boundary on every 30th day", () => {
    expect(isSeasonBoundary(30)).toBe(true);
    expect(isSeasonBoundary(60)).toBe(true);
    expect(isSeasonBoundary(31)).toBe(false);
  });

  it("year boundary when game year rolls over", () => {
    expect(isYearBoundary(365, 366)).toBe(true);
    expect(isYearBoundary(100, 101)).toBe(false);
  });

  it("daily cadence is always due", () => {
    for (const day of [1, 7, 30, 365]) {
      expect(isPhaseDue({ cadence: "daily", newDay: day, previousDay: day - 1 })).toBe(true);
    }
  });

  it("weekly cadence due on boundaries or after 7 elapsed days", () => {
    expect(isPhaseDue({ cadence: "weekly", newDay: 7, previousDay: 6, lastRunDay: 1 })).toBe(true);
    expect(isPhaseDue({ cadence: "weekly", newDay: 8, previousDay: 7, lastRunDay: 7 })).toBe(false);
    expect(isPhaseDue({ cadence: "weekly", newDay: 8, previousDay: 7, lastRunDay: 0 })).toBe(true); // 8 days elapsed
    expect(isPhaseDue({ cadence: "weekly", newDay: 5, previousDay: 4 })).toBe(true); // never ran
  });

  it("seasonal cadence due at day 30 or after 30 elapsed days", () => {
    expect(isPhaseDue({ cadence: "seasonal", newDay: 30, previousDay: 29, lastRunDay: 1 })).toBe(
      true,
    );
    expect(isPhaseDue({ cadence: "seasonal", newDay: 15, previousDay: 14, lastRunDay: 1 })).toBe(
      false,
    );
    expect(isPhaseDue({ cadence: "seasonal", newDay: 31, previousDay: 30, lastRunDay: 1 })).toBe(
      true,
    );
  });

  it("yearly cadence due on rollover", () => {
    expect(isPhaseDue({ cadence: "yearly", newDay: 366, previousDay: 365, lastRunDay: 1 })).toBe(
      true,
    );
    expect(isPhaseDue({ cadence: "yearly", newDay: 200, previousDay: 199, lastRunDay: 1 })).toBe(
      false,
    );
  });

  it("interval cadence requires intervalDays", () => {
    expect(
      isPhaseDue({
        cadence: "interval",
        newDay: 10,
        previousDay: 9,
        intervalDays: 5,
        lastRunDay: 5,
      }),
    ).toBe(true);
    expect(
      isPhaseDue({
        cadence: "interval",
        newDay: 9,
        previousDay: 8,
        intervalDays: 5,
        lastRunDay: 5,
      }),
    ).toBe(false);
    // Missing intervalDays behaves permissively (compiler rejects such descriptors anyway)
    expect(isPhaseDue({ cadence: "interval", newDay: 9, previousDay: 8, lastRunDay: 5 })).toBe(
      true,
    );
  });

  it("boundaryDaysInRange lists due boundary days", () => {
    expect(boundaryDaysInRange(1, 30, "weekly")).toEqual([7, 14, 21, 28]);
    expect(boundaryDaysInRange(1, 30, "seasonal")).toEqual([30]);
    expect(boundaryDaysInRange(1, 400, "yearly")).toEqual([365]);
    expect(boundaryDaysInRange(1, 30, "daily")).toEqual([]);
  });
});
