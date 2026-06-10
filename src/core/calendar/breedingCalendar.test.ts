import { describe, it, expect } from "vitest";
import { isUniversalBirthday } from "./breedingCalendar";

describe("breedingCalendar", () => {
  describe("isUniversalBirthday", () => {
    it("should return true for the universal birthday in the Northern hemisphere (day 1)", () => {
      expect(isUniversalBirthday(1, "Northern")).toBe(true);
    });

    it("should return true for the universal birthday in the Northern hemisphere in subsequent years (day 366)", () => {
      expect(isUniversalBirthday(366, "Northern")).toBe(true); // wrapped to dayOfYear 1
    });

    it("should return false for a non-universal birthday in the Northern hemisphere (day 2)", () => {
      expect(isUniversalBirthday(2, "Northern")).toBe(false);
    });

    it("should return false for the Southern birthday in the Northern hemisphere (day 213)", () => {
      expect(isUniversalBirthday(213, "Northern")).toBe(false);
    });

    it("should return true for the universal birthday in the Southern hemisphere (day 213)", () => {
      expect(isUniversalBirthday(213, "Southern")).toBe(true);
    });

    it("should return true for the universal birthday in the Southern hemisphere in subsequent years (day 578)", () => {
      expect(isUniversalBirthday(578, "Southern")).toBe(true); // wrapped to dayOfYear 213 (213 + 365)
    });

    it("should return false for the Northern birthday in the Southern hemisphere (day 1)", () => {
      expect(isUniversalBirthday(1, "Southern")).toBe(false);
    });

    it("should return false for a non-universal birthday in the Southern hemisphere (day 214)", () => {
      expect(isUniversalBirthday(214, "Southern")).toBe(false);
    });
  });
});
