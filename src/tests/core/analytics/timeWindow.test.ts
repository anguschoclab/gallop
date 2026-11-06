import { describe, it, expect } from "vitest";
import {
  timeWindowLabel,
  windowStartDay,
  isInWindow,
  weekBucket,
  filterByWindow,
} from "@/domains/analytics/simulation/timeWindow";

describe("timeWindow", () => {
  describe("timeWindowLabel", () => {
    it("returns correct label for valid weeks", () => {
      expect(timeWindowLabel(4)).toBe("4 wks");
      expect(timeWindowLabel(0)).toBe("All time");
    });
    // Can't pass invalid week because of TimeWindowWeeks type
  });

  describe("windowStartDay", () => {
    it("returns negative infinity for all-time (0 weeks)", () => {
      expect(windowStartDay(100, 0)).toBe(Number.NEGATIVE_INFINITY);
    });

    it("returns correct start day for 4 weeks (exclusive lower bound)", () => {
      // 4 weeks = 28 days. 100 - 28 = 72
      expect(windowStartDay(100, 4)).toBe(72);
    });
  });

  describe("isInWindow", () => {
    it("returns true for all-time (0 weeks)", () => {
      expect(isInWindow(10, 100, 0)).toBe(true);
      expect(isInWindow(200, 100, 0)).toBe(true);
    });

    it("returns true if day is within window", () => {
      // 4 weeks from day 100 is > 72 and <= 100
      expect(isInWindow(100, 100, 4)).toBe(true);
      expect(isInWindow(73, 100, 4)).toBe(true);
    });

    it("returns false if day is exactly on the exclusive lower bound", () => {
      // 4 weeks from day 100 is > 72 and <= 100
      expect(isInWindow(72, 100, 4)).toBe(false);
    });

    it("returns false if day is older than window", () => {
      expect(isInWindow(50, 100, 4)).toBe(false);
    });

    it("returns false if day is in the future", () => {
      expect(isInWindow(101, 100, 4)).toBe(false);
    });
  });

  describe("weekBucket", () => {
    it("returns -1 for all-time (0 weeks)", () => {
      expect(weekBucket(90, 100, 0)).toBe(-1);
    });

    it("returns -1 if day is out of window", () => {
      expect(weekBucket(50, 100, 4)).toBe(-1); // Too old
      expect(weekBucket(101, 100, 4)).toBe(-1); // Future
    });

    it("returns 3 (latest bucket) for current day when window is 4 weeks", () => {
      // Window is 4 weeks, buckets are 0, 1, 2, 3
      // Days 94-100 are in bucket 3
      expect(weekBucket(100, 100, 4)).toBe(3);
      expect(weekBucket(94, 100, 4)).toBe(3);
    });

    it("returns 2 for previous week when window is 4 weeks", () => {
      // Days 87-93 are in bucket 2
      expect(weekBucket(93, 100, 4)).toBe(2);
      expect(weekBucket(87, 100, 4)).toBe(2);
    });

    it("returns 0 (oldest bucket) for oldest valid day when window is 4 weeks", () => {
      // Days 73-79 are in bucket 0
      expect(weekBucket(79, 100, 4)).toBe(0);
      expect(weekBucket(73, 100, 4)).toBe(0);
    });
  });

  describe("filterByWindow", () => {
    it("returns all rows for all-time (0 weeks)", () => {
      const rows = [{ day: 50 }, { day: 100 }, { day: 150 }];
      expect(filterByWindow(rows, 100, 0)).toEqual(rows);
    });

    it("filters out rows that are outside the window", () => {
      const rows = [
        { day: 50, name: "old" },
        { day: 72, name: "lower bound" },
        { day: 73, name: "in window oldest" },
        { day: 90, name: "in window" },
        { day: 100, name: "in window newest" },
        { day: 101, name: "future" },
      ];

      const result = filterByWindow(rows, 100, 4);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("in window oldest");
      expect(result[1].name).toBe("in window");
      expect(result[2].name).toBe("in window newest");
    });
  });
});
