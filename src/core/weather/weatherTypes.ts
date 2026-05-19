/**
 * weatherTypes.ts — Dynamic weather simulation types.
 *
 * Defines the per-track WeatherState used by the daily weather sim. Patterns
 * map onto the existing track-condition WeatherPattern vocabulary at the
 * boundary (see `weatherSim.toTrackWeatherPattern`).
 */

import type { WeatherPattern as TrackWeatherPattern } from "@/core/track/trackConditionData";

/** Sim-level weather pattern (player-facing vocabulary). */
export type SimWeatherPattern = "clear" | "overcast" | "shower" | "rain" | "storm";

export const SIM_WEATHER_PATTERNS: SimWeatherPattern[] = [
  "clear",
  "overcast",
  "shower",
  "rain",
  "storm",
];

/** Severity index used for "≥2 jump in 24h" drama detection. */
export const PATTERN_SEVERITY: Record<SimWeatherPattern, number> = {
  clear: 0,
  overcast: 1,
  shower: 2,
  rain: 3,
  storm: 4,
};

export interface WeatherState {
  trackId: string;
  day: number;
  pattern: SimWeatherPattern;
  /** Daytime high in Celsius. */
  tempC: number;
  /** Relative humidity 0–1. */
  humidity: number;
}

/**
 * Map sim pattern → existing track-condition WeatherPattern.
 * @param pattern
 */
export function toTrackWeatherPattern(pattern: SimWeatherPattern): TrackWeatherPattern {
  switch (pattern) {
    case "clear":
    case "overcast":
      return "dry";
    case "shower":
      return "light_rain";
    case "rain":
    case "storm":
      return "heavy_rain";
  }
}
