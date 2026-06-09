import { describe, it, expect } from "vitest";
import {
  isUniversalBirthday,
  inBreedingSeason,
  nextBreedingSeasonStart,
  isBreedingSeasonStart,
} from "@/core/calendar/breedingCalendar";

describe("isUniversalBirthday", () => {
  it("should return true for Northern hemisphere on Jan 1 (day 1)", () => {
    expect(isUniversalBirthday(1, "Northern")).toBe(true);
  });

  it("should return false for Northern hemisphere on other days", () => {
    expect(isUniversalBirthday(2, "Northern")).toBe(false);
    expect(isUniversalBirthday(365, "Northern")).toBe(false);
  });

  it("should return true for Southern hemisphere on Aug 1 (day 213)", () => {
    expect(isUniversalBirthday(213, "Southern")).toBe(true);
  });

  it("should return false for Southern hemisphere on other days", () => {
    expect(isUniversalBirthday(1, "Southern")).toBe(false);
    expect(isUniversalBirthday(214, "Southern")).toBe(false);
  });

  it("should handle wrap around correctly for Northern hemisphere", () => {
    expect(isUniversalBirthday(366, "Northern")).toBe(true); // Year 2, Jan 1
  });

  it("should handle wrap around correctly for Southern hemisphere", () => {
    expect(isUniversalBirthday(578, "Southern")).toBe(true); // Year 2, Aug 1
  });
});
