import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";
import { groupRacesByDate } from "@/core/race/groupRacesByDate";

describe("utils", () => {
  describe("cn", () => {
    it("merges tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
    });

    it("resolves tailwind conflicts", () => {
      expect(cn("px-2 py-1 bg-red-500", "bg-blue-500")).toBe("px-2 py-1 bg-blue-500");
    });

    it("handles conditional classes", () => {
      expect(cn("px-2", "bg-red-500")).toBe("px-2 bg-red-500");
    });

    it("handles undefined and null", () => {
      expect(cn("px-2", undefined, null, "bg-red-500")).toBe("px-2 bg-red-500");
    });

    it("handles arrays", () => {
      expect(cn(["px-2", "py-1"], "bg-red-500")).toBe("px-2 py-1 bg-red-500");
    });

    it("handles objects", () => {
      expect(cn({ "px-2": true, "py-1": false }, "bg-red-500")).toBe("px-2 bg-red-500");
    });
  });

  describe("groupRacesByDate", () => {
    it("groups races by day and sorts them", () => {
      const races = [
        { id: 1, day: 5 },
        { id: 2, day: 2 },
        { id: 3, day: 5 },
        { id: 4, day: 1 },
      ];

      const result = groupRacesByDate(races);

      expect(result).toEqual([
        { day: 1, races: [{ id: 4, day: 1 }] },
        { day: 2, races: [{ id: 2, day: 2 }] },
        {
          day: 5,
          races: [
            { id: 1, day: 5 },
            { id: 3, day: 5 },
          ],
        },
      ]);
    });

    it("handles empty arrays", () => {
      expect(groupRacesByDate([])).toEqual([]);
    });
  });
});
