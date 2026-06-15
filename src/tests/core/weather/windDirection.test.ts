import { describe, it, expect } from "vitest";
import { stepWeather, generateForecast } from "@/core/weather/weatherSim";
import type { WeatherState } from "@/core/weather/weatherTypes";

const TOKYO = "09aea125-88e4-4e51-b8d7-0475869c6269";

function makeSeed(day: number): WeatherState {
  return {
    trackId: TOKYO,
    day,
    pattern: "clear",
    tempC: 20,
    humidity: 0.5,
    windKph: 10,
  };
}

describe("windDirection generation", () => {
  it("produces windDirectionDeg in [0, 360)", () => {
    const today = stepWeather(makeSeed(1), TOKYO, 2);
    expect(today.windDirectionDeg).toBeDefined();
    expect(today.windDirectionDeg!).toBeGreaterThanOrEqual(0);
    expect(today.windDirectionDeg!).toBeLessThan(360);
    expect(Number.isInteger(today.windDirectionDeg!)).toBe(true);
  });

  it("is deterministic for the same seed and day", () => {
    const a = stepWeather(makeSeed(1), TOKYO, 2);
    const b = stepWeather(makeSeed(1), TOKYO, 2);
    expect(a.windDirectionDeg).toBe(b.windDirectionDeg);
  });

  it("propagates through generateForecast", () => {
    const forecast = generateForecast(makeSeed(1), TOKYO, 2, 7);
    expect(forecast.length).toBe(7);
    for (const day of forecast) {
      expect(day.windDirectionDeg).toBeDefined();
      expect(day.windDirectionDeg!).toBeGreaterThanOrEqual(0);
      expect(day.windDirectionDeg!).toBeLessThan(360);
    }
  });
});
