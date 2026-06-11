import { describe, it, expect } from "vitest";
import { sum, average, max, min, maxBy, groupBy, countBy } from "@/lib/arrayHelpers";

describe("arrayHelpers", () => {
  describe("sum", () => {
    it("returns 0 for an empty array", () => {
      expect(sum([])).toBe(0);
    });

    it("returns the correct sum for positive numbers", () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
    });

    it("returns the correct sum for negative numbers", () => {
      expect(sum([-1, -2, -3])).toBe(-6);
    });

    it("returns the correct sum for mixed positive and negative numbers", () => {
      expect(sum([10, -5, 3, -2])).toBe(6);
    });
  });

  describe("average", () => {
    it("returns 0 for an empty array", () => {
      expect(average([])).toBe(0);
    });

    it("returns the correct average for standard numbers", () => {
      expect(average([1, 2, 3, 4])).toBe(2.5);
    });

    it("returns the element itself for a single-element array", () => {
      expect(average([42])).toBe(42);
    });

    it("returns the correct average for negative numbers", () => {
      expect(average([-2, -4, -6])).toBe(-4);
    });
  });

  describe("max", () => {
    it("returns -Infinity for an empty array", () => {
      expect(max([])).toBe(-Infinity);
    });

    it("returns the maximum for positive numbers", () => {
      expect(max([1, 5, 3, 9, 2])).toBe(9);
    });

    it("returns the maximum for negative numbers", () => {
      expect(max([-10, -3, -7])).toBe(-3);
    });

    it("returns the element itself for a single-element array", () => {
      expect(max([7])).toBe(7);
    });
  });

  describe("min", () => {
    it("returns Infinity for an empty array", () => {
      expect(min([])).toBe(Infinity);
    });

    it("returns the minimum for positive numbers", () => {
      expect(min([4, 1, 8, 3])).toBe(1);
    });

    it("returns the minimum for negative numbers", () => {
      expect(min([-5, -1, -10])).toBe(-10);
    });

    it("returns the element itself for a single-element array", () => {
      expect(min([7])).toBe(7);
    });
  });

  describe("maxBy", () => {
    it("returns the object with the maximum property value", () => {
      const items = [
        { name: "a", score: 10 },
        { name: "b", score: 50 },
        { name: "c", score: 30 },
      ];
      expect(maxBy(items, "score")).toEqual({ name: "b", score: 50 });
    });

    it("returns the first object when there is a tie", () => {
      const items = [
        { name: "a", score: 100 },
        { name: "b", score: 100 },
      ];
      expect(maxBy(items, "score")).toEqual({ name: "a", score: 100 });
    });

    it("returns undefined for an empty array", () => {
      expect(maxBy([], "score" as keyof { score: number })).toBeUndefined();
    });
  });

  describe("groupBy", () => {
    it("groups objects by a string key", () => {
      const items = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = groupBy(items, (item) => item.category);
      expect(result).toEqual({
        a: [
          { category: "a", value: 1 },
          { category: "a", value: 3 },
        ],
        b: [{ category: "b", value: 2 }],
      });
    });

    it("groups objects by a number key", () => {
      const items = [
        { month: 1, name: "Jan" },
        { month: 2, name: "Feb" },
        { month: 1, name: "Jan2" },
      ];
      const result = groupBy(items, (item) => item.month);
      expect(result).toEqual({
        1: [
          { month: 1, name: "Jan" },
          { month: 1, name: "Jan2" },
        ],
        2: [{ month: 2, name: "Feb" }],
      });
    });

    it("returns an empty object for an empty array", () => {
      expect(groupBy([], () => "key")).toEqual({});
    });
  });

  describe("countBy", () => {
    it("counts occurrences of each string value", () => {
      expect(countBy(["a", "b", "a", "c", "a", "b"])).toEqual({
        a: 3,
        b: 2,
        c: 1,
      });
    });

    it("counts occurrences of each number value", () => {
      expect(countBy([1, 2, 1, 3, 1])).toEqual({
        1: 3,
        2: 1,
        3: 1,
      });
    });

    it("returns an empty object for an empty array", () => {
      expect(countBy([])).toEqual({});
    });

    it("returns a single count for a single-element array", () => {
      expect(countBy(["x"])).toEqual({ x: 1 });
    });

    it("returns a single key with the full count when all values are the same", () => {
      expect(countBy(["z", "z", "z"])).toEqual({ z: 3 });
    });
  });
});
