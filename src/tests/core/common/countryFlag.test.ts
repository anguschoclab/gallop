/**
 * countryFlag.test.ts - Country/region flag emoji tests
 *
 * Tests for getCountryFlag, getRegionFlag, and getRegionCountryLabel
 * in @/shared/common/countryFlag.
 */

import { describe, it, expect } from "vitest";
import { getCountryFlag, getRegionFlag, getRegionCountryLabel } from "@/shared/common/countryFlag";

describe("getCountryFlag", () => {
  it.each<[string | null | undefined, string]>([
    [undefined, "🏳️"],
    [null, "🏳️"],
    ["", "🏳️"],
    ["USA", "🇺🇸"],
    ["UK", "🇬🇧"],
    ["Hong Kong", "🇭🇰"],
    ["New Zealand", "🇳🇿"],
    ["Atlantis", "🏳️"],
  ])("maps %j to %s", (country, expected) => {
    expect(getCountryFlag(country)).toBe(expected);
  });
});

describe("getRegionFlag", () => {
  it.each<[string | null | undefined, string]>([
    [undefined, "🏳️"],
    [null, "🏳️"],
    ["", "🏳️"],
    ["north_america", "🇺🇸"],
    ["europe", "🇪🇺"],
    ["asia_pacific", "🇦🇺"],
    ["south_america", "🇦🇷"],
    ["antarctica", "🏳️"],
  ])("maps %j to %s", (region, expected) => {
    expect(getRegionFlag(region)).toBe(expected);
  });
});

describe("getRegionCountryLabel", () => {
  it.each<[string | null | undefined, string]>([
    [undefined, "—"],
    [null, "—"],
    ["north_america", "North America"],
    ["europe", "Europe"],
    ["asia_pacific", "Asia-Pacific"],
    ["south_america", "South America"],
  ])("maps %j to %s", (region, expected) => {
    expect(getRegionCountryLabel(region)).toBe(expected);
  });

  it("returns the raw region for unlisted keys", () => {
    expect(getRegionCountryLabel("middle_east")).toBe("middle_east");
  });
});
