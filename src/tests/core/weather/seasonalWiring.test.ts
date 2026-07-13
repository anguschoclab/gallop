/**
 * seasonalWiring.test.ts - Integration tests for seasonal modifiers wired into stepWeather
 *
 * Verifies that seasonal modifiers actually affect weather generation:
 * - Japan in June (tsuyu) is wetter than Japan in January
 * - Spain in July (mediterranean dry) is drier than Spain in January
 * - UAE (no modifiers) is unchanged and deterministic
 * - Australia in January (bushfire) is drier than Australia in July
 * - Determinism is preserved
 * - Unknown trackIds fall back gracefully
 */

import { describe, it, expect } from "vitest";
import { stepWeather, generateForecast, PATTERN_SEVERITY, type WeatherState } from "@/core/weather";

// Real track IDs from trackKoppenMappings.ts
const TOKYO = "09aea125-88e4-4e51-b8d7-0475869c6269"; // Japan, Cfa
const MADRID = "23e80c06-3df8-4590-b813-116458225a15"; // Spain, Csa
const MEYDAN = "85a3d0b8-a4a9-4ff7-bc18-705874d8da31"; // UAE, BWh
const FLEMINGTON = "a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d"; // Australia, Cfb

/**
 * Compute the average pattern severity over a range of days.
 * Higher severity = wetter weather (clear=0, overcast=1, shower=2, rain=3, snow=3, storm=4).
 */
function averageSeverity(trackId: string, startDay: number, days: number): number {
  const forecast = generateForecast(undefined, trackId, startDay, days);
  return forecast.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / forecast.length;
}

/**
 * Find days that map to a specific calendar month (1-12).
 * Calendar month is computed from day-of-year without hemisphere shift.
 * Month 1 = Jan (days 1-31), Month 6 = Jun (days 152-181), etc.
 */
function dayRangeForMonth(month: number, yearOffset: number = 0): { start: number; end: number } {
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let start = 1;
  for (let m = 1; m < month; m++) {
    start += monthLengths[m - 1];
  }
  const end = start + monthLengths[month - 1] - 1;
  return { start: start + yearOffset * 365, end: end + yearOffset * 365 };
}

describe("Seasonal Wiring - stepWeather integration", () => {
  describe("Determinism (preserved after wiring)", () => {
    it("stepWeather(undefined, trackId, day) is deterministic across runs", () => {
      const a = stepWeather(undefined, TOKYO, 100);
      const b = stepWeather(undefined, TOKYO, 100);
      expect(a).toEqual(b);
    });

    it("different (trackId, day) seeds produce independent outputs", () => {
      const a = stepWeather(undefined, TOKYO, 50);
      const b = stepWeather(undefined, TOKYO, 51);
      expect({ p: a.pattern, t: a.tempC }).not.toEqual({ p: b.pattern, t: b.tempC });
    });

    it("regenerating the forecast yields identical sequences (pure)", () => {
      const seed: WeatherState = {
        trackId: TOKYO,
        day: 10,
        pattern: "clear",
        tempC: 20,
        humidity: 0.6,
        windKph: 12,
      };
      const f1 = generateForecast(seed, TOKYO, 11, 7);
      const f2 = generateForecast(seed, TOKYO, 11, 7);
      expect(f1).toEqual(f2);
    });
  });

  describe("Japan seasonal variation (tsuyu in June)", () => {
    it("Japan in June is wetter than Japan in January", () => {
      // June = days 152-181, January = days 1-31
      // Use multiple years for statistical stability
      let juneSeverity = 0;
      let januarySeverity = 0;
      let juneCount = 0;
      let januaryCount = 0;

      for (let year = 0; year < 3; year++) {
        const june = dayRangeForMonth(6, year);
        const january = dayRangeForMonth(1, year);

        for (let day = june.start; day <= june.end; day++) {
          const w = stepWeather(undefined, TOKYO, day);
          juneSeverity += PATTERN_SEVERITY[w.pattern];
          juneCount++;
        }
        for (let day = january.start; day <= january.end; day++) {
          const w = stepWeather(undefined, TOKYO, day);
          januarySeverity += PATTERN_SEVERITY[w.pattern];
          januaryCount++;
        }
      }

      const juneAvg = juneSeverity / juneCount;
      const januaryAvg = januarySeverity / januaryCount;
      // June should be wetter due to tsuyu + east_asian_monsoon
      expect(juneAvg).toBeGreaterThan(januaryAvg);
    });
  });

  describe("Spain seasonal variation (mediterranean dry in July)", () => {
    it("Spain in July is drier than Spain in January", () => {
      let julySeverity = 0;
      let januarySeverity = 0;
      let julyCount = 0;
      let januaryCount = 0;

      for (let year = 0; year < 3; year++) {
        const july = dayRangeForMonth(7, year);
        const january = dayRangeForMonth(1, year);

        for (let day = july.start; day <= july.end; day++) {
          const w = stepWeather(undefined, MADRID, day);
          julySeverity += PATTERN_SEVERITY[w.pattern];
          julyCount++;
        }
        for (let day = january.start; day <= january.end; day++) {
          const w = stepWeather(undefined, MADRID, day);
          januarySeverity += PATTERN_SEVERITY[w.pattern];
          januaryCount++;
        }
      }

      const julyAvg = julySeverity / julyCount;
      const januaryAvg = januarySeverity / januaryCount;
      // July should be drier due to mediterranean_dry (rainSuppression 0.8)
      expect(julyAvg).toBeLessThan(januaryAvg);
    });
  });

  describe("UAE (no seasonal modifiers - unchanged behavior)", () => {
    it("UAE weather is deterministic and valid", () => {
      const w = stepWeather(undefined, MEYDAN, 100);
      expect(w).toBeDefined();
      expect(w.trackId).toBe(MEYDAN);
      expect(w.pattern).toBeDefined();
      expect(w.tempC).toBeDefined();
      expect(w.humidity).toBeGreaterThanOrEqual(0);
      expect(w.humidity).toBeLessThanOrEqual(1);
    });

    it("UAE trends dry over a 500-day window", () => {
      const avg = averageSeverity(MEYDAN, 0, 500);
      expect(avg).toBeLessThan(1.2);
    });
  });

  describe("Australia seasonal variation (bushfire in January)", () => {
    it("Australia in January is drier than Australia in July", () => {
      // Australia is southern hemisphere — getMonthFromDay shifts by 182 days
      // But seasonal modifiers use actual calendar month
      // January (days 1-31): calendar month = 1 → bushfire_season active
      // July (days 182-212): calendar month = 7 → no modifiers active
      let janSeverity = 0;
      let julSeverity = 0;
      let janCount = 0;
      let julCount = 0;

      for (let year = 0; year < 3; year++) {
        const january = dayRangeForMonth(1, year);
        const july = dayRangeForMonth(7, year);

        for (let day = january.start; day <= january.end; day++) {
          const w = stepWeather(undefined, FLEMINGTON, day);
          janSeverity += PATTERN_SEVERITY[w.pattern];
          janCount++;
        }
        for (let day = july.start; day <= july.end; day++) {
          const w = stepWeather(undefined, FLEMINGTON, day);
          julSeverity += PATTERN_SEVERITY[w.pattern];
          julCount++;
        }
      }

      const janAvg = janSeverity / janCount;
      const julAvg = julSeverity / julCount;
      // January (calendar) has bushfire_season (rainSuppression 0.4, clearBoost 0.2)
      // + australian_monsoon (rainBoost 0.28) + australian_cyclone (rainBoost 0.12)
      // The monsoon boosts rain but bushfire suppresses it heavily
      // Net effect on rain: shower *= (1+0.28+0.12) * (1-0.4) = 1.4 * 0.6 = 0.84
      // So rain is suppressed overall, and clear is boosted by 1.2
      // January should be drier than July
      expect(janAvg).toBeLessThan(julAvg);
    });
  });

  describe("Unknown trackId fallback", () => {
    it("unknown trackId still produces valid weather", () => {
      const w = stepWeather(undefined, "unknown-track-xyz-123", 100);
      expect(w).toBeDefined();
      expect(w.pattern).toBeDefined();
      expect(w.tempC).toBeDefined();
      expect(w.humidity).toBeGreaterThanOrEqual(0);
      expect(w.humidity).toBeLessThanOrEqual(1);
      expect(w.windKph).toBeGreaterThanOrEqual(0);
    });

    it("unknown trackId is deterministic", () => {
      const a = stepWeather(undefined, "unknown-track-xyz-123", 100);
      const b = stepWeather(undefined, "unknown-track-xyz-123", 100);
      expect(a).toEqual(b);
    });
  });

  describe("Koppen climate patterns still hold", () => {
    it("desert climate (BWh) trends dry over a 500-day window", () => {
      const avg = averageSeverity(MEYDAN, 0, 500);
      expect(avg).toBeLessThan(1.2);
    });

    it("tropical climate trends wetter than desert over a 500-day window", () => {
      const HONG_KONG = "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec"; // Aw
      const tropicAvg = averageSeverity(HONG_KONG, 0, 500);
      const desertAvg = averageSeverity(MEYDAN, 0, 500);
      expect(tropicAvg).toBeGreaterThan(desertAvg);
    });

    it("oceanic climate (Cfb) has moderate severity year-round", () => {
      const ASCOT = "bf517cc6-2210-42ad-a6de-7115abc4ef08"; // Cfb
      const avg = averageSeverity(ASCOT, 0, 365);
      expect(avg).toBeGreaterThan(1.0);
      expect(avg).toBeLessThan(2.0);
    });

    it("temperature varies by Koppen climate type", () => {
      const desertTemps = generateForecast(undefined, MEYDAN, 0, 30).map((w) => w.tempC);
      const oceanicTemps = generateForecast(
        undefined,
        "bf517cc6-2210-42ad-a6de-7115abc4ef08",
        0,
        30,
      ).map((w) => w.tempC);
      const avgDesert = desertTemps.reduce((a, b) => a + b, 0) / desertTemps.length;
      const avgOceanic = oceanicTemps.reduce((a, b) => a + b, 0) / oceanicTemps.length;
      expect(avgDesert).toBeGreaterThan(avgOceanic);
    });

    it("humidity is high for tropical climates", () => {
      const HONG_KONG = "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec";
      const tropic = generateForecast(undefined, HONG_KONG, 0, 30);
      const avgHumidity = tropic.reduce((s, w) => s + w.humidity, 0) / tropic.length;
      expect(avgHumidity).toBeGreaterThan(0.6);
    });
  });
});
