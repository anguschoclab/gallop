/**
 * seasonalModifiers.test.ts - Comprehensive tests for seasonal modifier system
 *
 * Tests:
 * - Modifier definition validation (months, probability ranges)
 * - Regional pattern assignments
 * - getSeasonalModifiers edge cases and optimization regression
 * - applyModifiers edge cases
 * - Real-world pattern validation
 */

import { describe, it, expect } from "vitest";
import {
  SEASONAL_MODIFIERS,
  REGIONAL_PATTERNS,
  COUNTRY_TO_REGION,
  getSeasonalModifiers,
  applyModifiers,
  type SeasonalModifier,
} from "@/core/weather/seasonalModifiers";

describe("Seasonal Modifiers - Modifier Definitions", () => {
  it("should have valid month ranges (1-12) for all modifiers", () => {
    for (const [, modifier] of Object.entries(SEASONAL_MODIFIERS)) {
      for (const month of modifier.months) {
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
      }
    }
  });

  it("should have valid probability values (0-1 range)", () => {
    for (const [, modifier] of Object.entries(SEASONAL_MODIFIERS)) {
      if (modifier.rainBoost !== undefined) {
        expect(modifier.rainBoost).toBeGreaterThanOrEqual(0);
        expect(modifier.rainBoost).toBeLessThanOrEqual(1);
      }
      if (modifier.stormBoost !== undefined) {
        expect(modifier.stormBoost).toBeGreaterThanOrEqual(0);
        expect(modifier.stormBoost).toBeLessThanOrEqual(1);
      }
      if (modifier.rainSuppression !== undefined) {
        expect(modifier.rainSuppression).toBeGreaterThanOrEqual(0);
        expect(modifier.rainSuppression).toBeLessThanOrEqual(1);
      }
      if (modifier.clearBoost !== undefined) {
        expect(modifier.clearBoost).toBeGreaterThanOrEqual(0);
        expect(modifier.clearBoost).toBeLessThanOrEqual(1);
      }
      if (modifier.overcastBoost !== undefined) {
        expect(modifier.overcastBoost).toBeGreaterThanOrEqual(0);
        expect(modifier.overcastBoost).toBeLessThanOrEqual(1);
      }
      if (modifier.humidityBoost !== undefined) {
        expect(modifier.humidityBoost).toBeGreaterThanOrEqual(0);
        expect(modifier.humidityBoost).toBeLessThanOrEqual(1);
      }
    }
  });

  it("should have at least one active month for every modifier", () => {
    for (const [key, modifier] of Object.entries(SEASONAL_MODIFIERS)) {
      expect(modifier.months.length).toBeGreaterThan(0);
    }
  });
});

describe("Seasonal Modifiers - Regional Pattern Assignment", () => {
  it("should have patterns for all mapped countries", () => {
    for (const country of Object.keys(COUNTRY_TO_REGION)) {
      const region = COUNTRY_TO_REGION[country];
      expect(REGIONAL_PATTERNS[region]).toBeDefined();
    }
  });

  it("should assign correct patterns to Japan (monsoon + tsuyu + pacific_typhoon)", () => {
    const japanPatterns = REGIONAL_PATTERNS.japan;
    expect(japanPatterns).toContain("east_asian_monsoon");
    expect(japanPatterns).toContain("tsuyu");
    expect(japanPatterns).toContain("pacific_typhoon");
  });

  it("should assign Mediterranean pattern to Spain and Italy", () => {
    expect(REGIONAL_PATTERNS.spain).toContain("mediterranean_dry");
    expect(REGIONAL_PATTERNS.italy).toContain("mediterranean_dry");
  });

  it("should assign hurricane pattern to Florida", () => {
    expect(REGIONAL_PATTERNS.florida).toContain("atlantic_hurricane");
  });

  it("should have no patterns for desert regions", () => {
    expect(REGIONAL_PATTERNS.uae).toEqual([]);
    expect(REGIONAL_PATTERNS.saudi_arabia).toEqual([]);
  });

  it("should assign european_summer_storms to Germany, Austria, Hungary", () => {
    expect(REGIONAL_PATTERNS.germany).toContain("european_summer_storms");
    expect(REGIONAL_PATTERNS.austria).toContain("european_summer_storms");
    expect(REGIONAL_PATTERNS.hungary).toContain("european_summer_storms");
  });

  it("should assign bushfire + monsoon + cyclone to Australia", () => {
    expect(REGIONAL_PATTERNS.australia_nsw).toContain("australian_monsoon");
    expect(REGIONAL_PATTERNS.australia_nsw).toContain("bushfire_season");
    expect(REGIONAL_PATTERNS.australia_nsw).toContain("australian_cyclone");
  });
});

describe("Seasonal Modifiers - getSeasonalModifiers", () => {
  it("should return empty array for desert regions in any month", () => {
    for (let month = 1; month <= 12; month++) {
      const modifiers = getSeasonalModifiers("UAE", month);
      expect(modifiers).toEqual([]);
    }
  });

  it("should return empty array for unknown country", () => {
    for (let month = 1; month <= 12; month++) {
      const modifiers = getSeasonalModifiers("Atlantis", month);
      expect(modifiers).toEqual([]);
    }
  });

  it("should return empty array for out-of-range months (0 and 13)", () => {
    expect(getSeasonalModifiers("Japan", 0)).toEqual([]);
    expect(getSeasonalModifiers("Japan", 13)).toEqual([]);
    expect(getSeasonalModifiers("Spain", 0)).toEqual([]);
    expect(getSeasonalModifiers("Spain", 13)).toEqual([]);
  });

  it("should return monsoon modifiers for Japan in summer", () => {
    const juneModifiers = getSeasonalModifiers("Japan", 6);
    expect(juneModifiers.length).toBeGreaterThan(0);

    const julyModifiers = getSeasonalModifiers("Japan", 7);
    expect(julyModifiers.length).toBeGreaterThan(0);
  });

  it("should return >=2 modifiers for Japan in June (east_asian_monsoon + tsuyu)", () => {
    const juneModifiers = getSeasonalModifiers("Japan", 6);
    expect(juneModifiers.length).toBeGreaterThanOrEqual(2);
  });

  it("should return 0 modifiers for Japan in January (no pattern active)", () => {
    const janModifiers = getSeasonalModifiers("Japan", 1);
    expect(janModifiers).toEqual([]);
  });

  it("should return modifiers for Japan in October (autumn_rain + pacific_typhoon)", () => {
    const octModifiers = getSeasonalModifiers("Japan", 10);
    expect(octModifiers.length).toBeGreaterThanOrEqual(2);
  });

  it("should return Mediterranean dry modifiers for Spain in summer", () => {
    const julyModifiers = getSeasonalModifiers("Spain", 7);
    expect(julyModifiers.length).toBeGreaterThan(0);
    expect(julyModifiers.some((m) => m.rainSuppression !== undefined)).toBe(true);
  });

  it("should not return Mediterranean dry modifiers for Spain in winter", () => {
    const januaryModifiers = getSeasonalModifiers("Spain", 1);
    expect(januaryModifiers.some((m) => m.rainSuppression !== undefined)).toBe(false);
  });

  it("should return 0 modifiers for Spain in January", () => {
    const janModifiers = getSeasonalModifiers("Spain", 1);
    expect(janModifiers).toEqual([]);
  });

  it("should return modifiers for Australia in January (bushfire + monsoon + cyclone)", () => {
    const janModifiers = getSeasonalModifiers("Australia", 1);
    expect(janModifiers.length).toBeGreaterThanOrEqual(3);
  });

  it("should return 0 modifiers for Australia in July", () => {
    const julModifiers = getSeasonalModifiers("Australia", 7);
    expect(julModifiers).toEqual([]);
  });

  it("should return UAE empty for all 12 months", () => {
    for (let month = 1; month <= 12; month++) {
      expect(getSeasonalModifiers("UAE", month)).toEqual([]);
    }
  });

  it("should return european_summer_storms modifier for Germany in June", () => {
    const junModifiers = getSeasonalModifiers("Germany", 6);
    expect(junModifiers.length).toBeGreaterThan(0);
    expect(junModifiers.some((m) => m.thunderstormDays !== undefined)).toBe(true);
  });

  it("should return 0 modifiers for Germany in January", () => {
    const janModifiers = getSeasonalModifiers("Germany", 1);
    expect(janModifiers).toEqual([]);
  });

  it("should return references to actual SEASONAL_MODIFIERS objects (not copies)", () => {
    const juneModifiers = getSeasonalModifiers("Japan", 6);
    for (const mod of juneModifiers) {
      const found = Object.values(SEASONAL_MODIFIERS).some((sm) => sm === mod);
      expect(found).toBe(true);
    }
  });
});

describe("Seasonal Modifiers - applyModifiers", () => {
  const baseTransition = {
    clear: 0.5,
    overcast: 0.2,
    shower: 0.15,
    rain: 0.1,
    snow: 0.03,
    storm: 0.02,
  };

  it("should boost rain probability correctly", () => {
    const modifier: SeasonalModifier = { months: [6], rainBoost: 0.25 };
    const result = applyModifiers(baseTransition, [modifier]);
    expect(result.shower).toBeGreaterThan(baseTransition.shower);
    expect(result.rain).toBeGreaterThan(baseTransition.rain);
  });

  it("should suppress rain probability correctly", () => {
    const modifier: SeasonalModifier = { months: [7], rainSuppression: 0.8 };
    const result = applyModifiers(baseTransition, [modifier]);
    expect(result.shower).toBeLessThan(baseTransition.shower);
    expect(result.rain).toBeLessThan(baseTransition.rain);
  });

  it("should normalize probabilities to sum to 1", () => {
    const modifier: SeasonalModifier = { months: [6], rainBoost: 0.5, clearBoost: 0.3 };
    const result = applyModifiers(baseTransition, [modifier]);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("should handle multiple modifiers correctly", () => {
    const modifiers: SeasonalModifier[] = [
      { months: [6], rainBoost: 0.2 },
      { months: [6], stormBoost: 0.15 },
    ];
    const result = applyModifiers(baseTransition, modifiers);
    expect(result.shower).toBeGreaterThan(baseTransition.shower);
    expect(result.rain).toBeGreaterThan(baseTransition.rain);
    expect(result.storm).toBeGreaterThan(baseTransition.storm);
  });

  it("should return base normalized to sum=1 for empty modifiers array", () => {
    const result = applyModifiers(baseTransition, []);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("should not change transition probabilities for heatBoost-only modifier (just normalized)", () => {
    const modifier: SeasonalModifier = { months: [1], heatBoost: 0.15 };
    const base = baseTransition as Record<string, number>;
    const result = applyModifiers(base, [modifier]);
    const originalSum = Object.values(base).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(base)) {
      const expectedRatio = base[key] / originalSum;
      expect(Math.abs(result[key] - expectedRatio)).toBeLessThan(0.001);
    }
  });

  it("should not change transition probabilities for humidityBoost-only modifier (just normalized)", () => {
    const modifier: SeasonalModifier = { months: [6], humidityBoost: 0.15 };
    const base = baseTransition as Record<string, number>;
    const result = applyModifiers(base, [modifier]);
    const originalSum = Object.values(base).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(base)) {
      const expectedRatio = base[key] / originalSum;
      expect(Math.abs(result[key] - expectedRatio)).toBeLessThan(0.001);
    }
  });

  it("should not change transition probabilities for thunderstormDays-only modifier", () => {
    const modifier: SeasonalModifier = { months: [6], thunderstormDays: 5 };
    const base = baseTransition as Record<string, number>;
    const result = applyModifiers(base, [modifier]);
    const originalSum = Object.values(base).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(base)) {
      const expectedRatio = base[key] / originalSum;
      expect(Math.abs(result[key] - expectedRatio)).toBeLessThan(0.001);
    }
  });

  it("should apply combined rainBoost + rainSuppression multiplicatively", () => {
    const modifiers: SeasonalModifier[] = [{ months: [6], rainBoost: 0.5, rainSuppression: 0.4 }];
    const result = applyModifiers(baseTransition, modifiers);
    // rainBoost: shower *= 1.5, rain *= 1.5
    // rainSuppression: shower *= 0.6, rain *= 0.6
    // Net: shower *= 1.5 * 0.6 = 0.9, rain *= 1.5 * 0.6 = 0.9
    // After normalization the ratios shift, but shower/rain should be less than original
    // since they're multiplied by 0.9 while clear/overcast/snow are unchanged
    // Actually 0.9 < 1.0 so shower and rain decrease relative to unmodified keys
    // Let's verify they decreased
    const originalSum = Object.values(baseTransition).reduce((a, b) => a + b, 0);
    const expectedShowerRaw = baseTransition.shower * 1.5 * 0.6;
    const expectedRainRaw = baseTransition.rain * 1.5 * 0.6;
    const expectedClearRaw = baseTransition.clear;
    const expectedOvercastRaw = baseTransition.overcast;
    const expectedSnowRaw = baseTransition.snow;
    const expectedStormRaw = baseTransition.storm * (1 - 0.4 * 0.5);
    const expectedSum =
      expectedShowerRaw +
      expectedRainRaw +
      expectedClearRaw +
      expectedOvercastRaw +
      expectedSnowRaw +
      expectedStormRaw;
    expect(Math.abs(result.shower - expectedShowerRaw / expectedSum)).toBeLessThan(0.001);
    expect(Math.abs(result.rain - expectedRainRaw / expectedSum)).toBeLessThan(0.001);
  });

  it("should handle missing keys in base (treated as 0, no crash)", () => {
    const partialBase = { clear: 0.7, overcast: 0.3 };
    const modifier: SeasonalModifier = { months: [6], rainBoost: 0.5 };
    const result = applyModifiers(partialBase, [modifier]);
    expect(result.clear).toBeDefined();
    expect(result.overcast).toBeDefined();
    expect(result.shower).toBeDefined();
    expect(result.shower).toBe(0); // 0 * 1.5 = 0
    expect(result.rain).toBe(0);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it("should return all zeros for all-zero base (sum=0 guard)", () => {
    const zeroBase = { clear: 0, overcast: 0, shower: 0, rain: 0, snow: 0, storm: 0 };
    const modifier: SeasonalModifier = { months: [6], rainBoost: 0.5 };
    const result = applyModifiers(zeroBase, [modifier]);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it("should stack multiple rainBoost modifiers correctly", () => {
    const modifiers: SeasonalModifier[] = [
      { months: [6], rainBoost: 0.2 },
      { months: [6], rainBoost: 0.3 },
    ];
    const result = applyModifiers(baseTransition, modifiers);
    // First: shower *= 1.2, rain *= 1.2
    // Second: shower *= 1.3, rain *= 1.3
    // Net: shower *= 1.2 * 1.3 = 1.56, rain *= 1.56
    expect(result.shower).toBeGreaterThan(baseTransition.shower);
    expect(result.rain).toBeGreaterThan(baseTransition.rain);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });
});

describe("Seasonal Modifiers - Real-World Pattern Validation", () => {
  it("Japan: June-July should have rain boost (tsuyu)", () => {
    const june = getSeasonalModifiers("Japan", 6);
    const july = getSeasonalModifiers("Japan", 7);
    expect(june.some((m) => m.rainBoost && m.rainBoost > 0.2)).toBe(true);
    expect(july.some((m) => m.rainBoost && m.rainBoost > 0.2)).toBe(true);
  });

  it("Spain: July-August should have dry suppression", () => {
    const july = getSeasonalModifiers("Spain", 7);
    const august = getSeasonalModifiers("Spain", 8);
    expect(july.some((m) => m.rainSuppression && m.rainSuppression > 0.5)).toBe(true);
    expect(august.some((m) => m.rainSuppression && m.rainSuppression > 0.5)).toBe(true);
  });

  it("Australia: December-February should have heat boost (bushfire)", () => {
    const january = getSeasonalModifiers("Australia", 1);
    expect(january.some((m) => m.heatBoost && m.heatBoost > 0)).toBe(true);
  });

  it("Great Britain: October-January should have winter rain boost", () => {
    const october = getSeasonalModifiers("Great Britain", 10);
    const january = getSeasonalModifiers("Great Britain", 1);
    expect(october.some((m) => m.rainBoost && m.rainBoost > 0)).toBe(true);
    expect(january.some((m) => m.rainBoost && m.rainBoost > 0)).toBe(true);
  });

  it("Great Britain: July should have no winter rain modifiers", () => {
    const july = getSeasonalModifiers("Great Britain", 7);
    expect(july).toEqual([]);
  });
});
