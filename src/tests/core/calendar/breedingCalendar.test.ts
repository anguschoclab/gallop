import { describe, it, expect } from "vitest";
import {
  inBreedingSeason,
  nextBreedingSeasonStart,
  isUniversalBirthday,
  isBreedingSeasonStart,
  BREEDING_SEASON,
  UNIVERSAL_BIRTHDAY,
} from "@/core/calendar/breedingCalendar";

describe("breedingCalendar", () => {
  describe("inBreedingSeason", () => {
    it("should return true when the day is within the Northern breeding season", () => {
      expect(inBreedingSeason(36, "Northern")).toBe(true);
      expect(inBreedingSeason(100, "Northern")).toBe(true);
      expect(inBreedingSeason(167, "Northern")).toBe(true);
    });

    it("should return false when the day is outside the Northern breeding season", () => {
      expect(inBreedingSeason(35, "Northern")).toBe(false);
      expect(inBreedingSeason(168, "Northern")).toBe(false);
    });

    it("should return true when the day is within the Southern breeding season", () => {
      expect(inBreedingSeason(244, "Southern")).toBe(true);
      expect(inBreedingSeason(300, "Southern")).toBe(true);
      expect(inBreedingSeason(350, "Southern")).toBe(true);
    });

    it("should return false when the day is outside the Southern breeding season", () => {
      expect(inBreedingSeason(243, "Southern")).toBe(false);
      expect(inBreedingSeason(351, "Southern")).toBe(false);
    });

    it("should wrap correctly on next year", () => {
      expect(inBreedingSeason(365 + 36, "Northern")).toBe(true);
      expect(inBreedingSeason(365 + 35, "Northern")).toBe(false);
      expect(inBreedingSeason(365 + 244, "Southern")).toBe(true);
    });
  });

  describe("nextBreedingSeasonStart", () => {
    it("should return the start of the current season if currently in season", () => {
      expect(nextBreedingSeasonStart(100, "Northern")).toBe(36);
      expect(nextBreedingSeasonStart(36, "Northern")).toBe(36);
      expect(nextBreedingSeasonStart(300, "Southern")).toBe(244);
    });

    it("should return the start of the next season if currently before the season", () => {
      expect(nextBreedingSeasonStart(10, "Northern")).toBe(36);
      expect(nextBreedingSeasonStart(10, "Southern")).toBe(244);
      expect(nextBreedingSeasonStart(200, "Southern")).toBe(244);
    });

    it("should return the start of the next year's season if currently after the season", () => {
      expect(nextBreedingSeasonStart(200, "Northern")).toBe(365 + 36);
      expect(nextBreedingSeasonStart(360, "Northern")).toBe(365 + 36);
      expect(nextBreedingSeasonStart(360, "Southern")).toBe(365 + 244);
    });

    it("should handle wrap to next year offset correctly", () => {
      expect(nextBreedingSeasonStart(365 + 10, "Northern")).toBe(365 + 36);
      expect(nextBreedingSeasonStart(365 + 200, "Northern")).toBe(365 * 2 + 36);
    });
  });

  describe("isUniversalBirthday", () => {
    it("should return true if day is universal birthday for Northern hemisphere", () => {
      expect(isUniversalBirthday(1, "Northern")).toBe(true);
      expect(isUniversalBirthday(365 + 1, "Northern")).toBe(true);
    });

    it("should return false if day is not universal birthday for Northern hemisphere", () => {
      expect(isUniversalBirthday(2, "Northern")).toBe(false);
      expect(isUniversalBirthday(213, "Northern")).toBe(false);
    });

    it("should return true if day is universal birthday for Southern hemisphere", () => {
      expect(isUniversalBirthday(213, "Southern")).toBe(true);
      expect(isUniversalBirthday(365 + 213, "Southern")).toBe(true);
    });

    it("should return false if day is not universal birthday for Southern hemisphere", () => {
      expect(isUniversalBirthday(1, "Southern")).toBe(false);
      expect(isUniversalBirthday(214, "Southern")).toBe(false);
    });
  });

  describe("isBreedingSeasonStart", () => {
    it("should return true if day is the start of the breeding season", () => {
      expect(isBreedingSeasonStart(36, "Northern")).toBe(true);
      expect(isBreedingSeasonStart(244, "Southern")).toBe(true);
      expect(isBreedingSeasonStart(365 + 36, "Northern")).toBe(true);
    });

    it("should return false if day is not the start of the breeding season", () => {
      expect(isBreedingSeasonStart(37, "Northern")).toBe(false);
      expect(isBreedingSeasonStart(1, "Northern")).toBe(false);
      expect(isBreedingSeasonStart(245, "Southern")).toBe(false);
      expect(isBreedingSeasonStart(1, "Southern")).toBe(false);
    });
  });
});
