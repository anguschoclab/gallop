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
  it("stepWeather(undefined, trackId, day) is deterministic across runs", () => {
    const a = stepWeather(undefined, "churchill-downs", 100, "humid");
    const b = stepWeather(undefined, "churchill-downs", 100, "humid");
    expect(a).toEqual(b);
  });

  it("different (trackId, day) seeds produce independent outputs", () => {
    const a = stepWeather(undefined, "ascot", 50, "humid");
    const b = stepWeather(undefined, "ascot", 51, "humid");
    // Same seed family but different day — should not be identical state object.
    expect({ p: a.pattern, t: a.tempC }).not.toEqual({ p: b.pattern, t: b.tempC });
  });

  it("generateForecast returns N states with sequential days and bounded outputs", () => {
    const fc = generateForecast(undefined, "santa-anita", 200, 7, "arid");
    expect(fc).toHaveLength(7);
    fc.forEach((s, i) => {
      expect(s.day).toBe(200 + i);
      expect(s.trackId).toBe("santa-anita");
      expect(SIM_WEATHER_PATTERNS).toContain(s.pattern);
      expect(s.humidity).toBeGreaterThanOrEqual(0);
      expect(s.humidity).toBeLessThanOrEqual(1);
    });
  });

  it("regenerating the forecast yields identical sequences (pure)", () => {
    const seed: WeatherState = {
      trackId: "tokyo",
      day: 10,
      pattern: "clear",
      tempC: 20,
      humidity: 0.6,
      windKph: 12,
    };
    const f1 = generateForecast(seed, "tokyo", 11, 7, "humid");
    const f2 = generateForecast(seed, "tokyo", 11, 7, "humid");
    expect(f1).toEqual(f2);
  });
});

describe("weatherSim — climate biases", () => {
  it("arid climates trend dry over a 500-day window", () => {
    const samples = generateForecast(undefined, "dubai-meydan", 0, 500, "arid");
    const avgSeverity =
      samples.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / samples.length;
    expect(avgSeverity).toBeLessThan(1.2); // mostly clear/overcast
  });

  it("tropical climates trend wetter than arid over a 500-day window", () => {
    const tropic = generateForecast(undefined, "sha-tin", 0, 500, "tropical");
    const arid = generateForecast(undefined, "dubai-meydan", 0, 500, "arid");
    const avg = (xs: WeatherState[]) =>
      xs.reduce((s, w) => s + PATTERN_SEVERITY[w.pattern], 0) / xs.length;
    expect(avg(tropic)).toBeGreaterThan(avg(arid));
  });
});
