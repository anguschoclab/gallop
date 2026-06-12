/**
 * weatherSim.test.ts — Deterministic Markov transitions for the weather sim.
 */
import { describe, it, expect } from "vitest";
import {
  stepWeather,
  generateForecast,
  SIM_WEATHER_PATTERNS,
  PATTERN_SEVERITY,
  type WeatherState,
} from "@/core/weather";

describe("weatherSim — determinism", () => {
  // Use actual track IDs from tracks.json
  const CHURCHILL_DOWNS = "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const SARATOGA = "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a";
  const MEYDAN = "85a3d0b8-a4a9-4ff7-bc18-705874d8da31";
  const TOKYO = "09aea125-88e4-4e51-b8d7-0475869c6269";

  it("stepWeather(undefined, trackId, day) is deterministic across runs", () => {
    const a = stepWeather(undefined, CHURCHILL_DOWNS, 100);
    const b = stepWeather(undefined, CHURCHILL_DOWNS, 100);
    expect(a).toEqual(b);
  });

  it("different (trackId, day) seeds produce independent outputs", () => {
    const a = stepWeather(undefined, SARATOGA, 50);
    const b = stepWeather(undefined, SARATOGA, 51);
    // Same seed family but different day — should not be identical state object.
    expect({ p: a.pattern, t: a.tempC }).not.toEqual({ p: b.pattern, t: b.tempC });
  });

  it("generateForecast returns N states with sequential days and bounded outputs", () => {
    const fc = generateForecast(undefined, MEYDAN, 200, 7);
    expect(fc).toHaveLength(7);
    fc.forEach((s, i) => {
      expect(s.day).toBe(200 + i);
      expect(s.trackId).toBe(MEYDAN);
      expect(SIM_WEATHER_PATTERNS).toContain(s.pattern);
      expect(s.humidity).toBeGreaterThanOrEqual(0);
      expect(s.humidity).toBeLessThanOrEqual(1);
    });
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

describe("weatherSim — Koppen climate patterns", () => {
  const MEYDAN = "85a3d0b8-a4a9-4ff7-bc18-705874d8da31"; // BWh - Hot Desert
  const ASCOT = "bf517cc6-2210-42ad-a6de-7115abc4ef08"; // Cfb - Temperate Oceanic
  const HONG_KONG = "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec"; // Aw - Tropical

  it("desert climate (BWh) trends dry over a 500-day window", () => {
    const samples = generateForecast(undefined, MEYDAN, 0, 500);
    const avgSeverity =
      samples.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / samples.length;
    expect(avgSeverity).toBeLessThan(1.2); // mostly clear/overcast
  });

  it("tropical climate trends wetter than desert over a 500-day window", () => {
    const tropic = generateForecast(undefined, HONG_KONG, 0, 500);
    const desert = generateForecast(undefined, MEYDAN, 0, 500);
    const avg = (xs: WeatherState[]) =>
      xs.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / xs.length;
    expect(avg(tropic)).toBeGreaterThan(avg(desert));
  });

  it("oceanic climate (Cfb) has moderate severity year-round", () => {
    const samples = generateForecast(undefined, ASCOT, 0, 365);
    const avgSeverity =
      samples.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / samples.length;
    // Cfb should be moderate - not too dry, not too wet
    expect(avgSeverity).toBeGreaterThan(1.0);
    expect(avgSeverity).toBeLessThan(2.0);
  });

  it("temperature varies by Koppen climate type", () => {
    const desertTemps = generateForecast(undefined, MEYDAN, 0, 30).map((w) => w.tempC);
    const oceanicTemps = generateForecast(undefined, ASCOT, 0, 30).map((w) => w.tempC);

    const avgDesert = desertTemps.reduce((a, b) => a + b, 0) / desertTemps.length;
    const avgOceanic = oceanicTemps.reduce((a, b) => a + b, 0) / oceanicTemps.length;

    // Desert should generally be warmer than oceanic
    expect(avgDesert).toBeGreaterThan(avgOceanic);
  });

  it("humidity is high for tropical climates", () => {
    const tropic = generateForecast(undefined, HONG_KONG, 0, 30);
    const avgHumidity = tropic.reduce((s, w) => s + w.humidity, 0) / tropic.length;
    expect(avgHumidity).toBeGreaterThan(0.6); // High humidity
  });
});
