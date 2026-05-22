/**
 * weatherSim.ts — Per-track Markov-chain weather simulator.
 *
 * Deterministic: seed = hash(`${trackId}:${day}`). Transition matrices are
 * indexed by ClimateZone (re-used from `trackConditionData`).
 */

import { createRng, hashStr } from "@/game/rng";
import type { ClimateZone } from "@/core/track/trackConditionData";
import {
  type SimWeatherPattern,
  SIM_WEATHER_PATTERNS,
  type WeatherState,
  PATTERN_SEVERITY,
  toTrackWeatherPattern,
} from "./weatherTypes";

export { toTrackWeatherPattern };

/**
 * Row-stochastic transition matrices: rows = today, cols = tomorrow.
 * Order matches SIM_WEATHER_PATTERNS: clear, overcast, shower, rain, storm.
 */
const TRANSITIONS: Record<ClimateZone, number[][]> = {
  arid: [
    [0.78, 0.16, 0.04, 0.015, 0.005],
    [0.55, 0.32, 0.1, 0.025, 0.005],
    [0.4, 0.35, 0.18, 0.06, 0.01],
    [0.3, 0.35, 0.2, 0.13, 0.02],
    [0.2, 0.35, 0.25, 0.15, 0.05],
  ],
  temperate: [
    [0.55, 0.25, 0.12, 0.06, 0.02],
    [0.3, 0.4, 0.18, 0.1, 0.02],
    [0.18, 0.32, 0.28, 0.18, 0.04],
    [0.12, 0.25, 0.25, 0.3, 0.08],
    [0.08, 0.2, 0.22, 0.3, 0.2],
  ],
  humid: [
    [0.4, 0.3, 0.18, 0.1, 0.02],
    [0.22, 0.35, 0.25, 0.14, 0.04],
    [0.12, 0.25, 0.32, 0.24, 0.07],
    [0.08, 0.18, 0.28, 0.34, 0.12],
    [0.05, 0.15, 0.22, 0.33, 0.25],
  ],
  tropical: [
    [0.3, 0.28, 0.22, 0.15, 0.05],
    [0.18, 0.3, 0.28, 0.18, 0.06],
    [0.1, 0.22, 0.32, 0.27, 0.09],
    [0.06, 0.15, 0.27, 0.36, 0.16],
    [0.04, 0.1, 0.2, 0.36, 0.3],
  ],
  continental: [
    [0.6, 0.22, 0.1, 0.06, 0.02],
    [0.32, 0.38, 0.16, 0.1, 0.04],
    [0.2, 0.3, 0.25, 0.18, 0.07],
    [0.12, 0.22, 0.25, 0.3, 0.11],
    [0.08, 0.18, 0.22, 0.3, 0.22],
  ],
  cool: [
    [0.45, 0.3, 0.15, 0.08, 0.02],
    [0.25, 0.35, 0.2, 0.15, 0.05],
    [0.15, 0.25, 0.3, 0.22, 0.08],
    [0.1, 0.2, 0.25, 0.3, 0.15],
    [0.05, 0.15, 0.2, 0.3, 0.3],
  ],
  warm: [
    [0.6, 0.25, 0.1, 0.04, 0.01],
    [0.4, 0.35, 0.15, 0.08, 0.02],
    [0.25, 0.3, 0.25, 0.15, 0.05],
    [0.15, 0.25, 0.25, 0.25, 0.1],
    [0.1, 0.2, 0.2, 0.3, 0.2],
  ],
};

const CLIMATE_TEMP: Record<ClimateZone, [number, number]> = {
  arid: [22, 38],
  temperate: [10, 24],
  humid: [16, 30],
  tropical: [22, 33],
  continental: [-2, 28],
  cool: [5, 18],
  warm: [18, 32],
};

const CLIMATE_HUMIDITY_BIAS: Record<ClimateZone, number> = {
  arid: 0.2,
  temperate: 0.55,
  humid: 0.75,
  tropical: 0.85,
  continental: 0.5,
  cool: 0.7,
  warm: 0.45,
};

/**
 * Seeded sample from a row of the transition matrix.
 * @param row
 * @param rng
 * @param rng.next
 */
function samplePattern(row: number[], rng: { next: () => number }): SimWeatherPattern {
  const r = rng.next();
  let acc = 0;
  for (let i = 0; i < row.length; i++) {
    acc += row[i];
    if (r <= acc) return SIM_WEATHER_PATTERNS[i];
  }
  return SIM_WEATHER_PATTERNS[SIM_WEATHER_PATTERNS.length - 1];
}

/**
 * Step one day forward from the previous WeatherState.
 * If `prev` is undefined, seeds with a climate-biased starting pattern.
 * @param prev
 * @param trackId
 * @param day
 * @param climate
 */
export function stepWeather(
  prev: WeatherState | undefined,
  trackId: string,
  day: number,
  climate: ClimateZone,
): WeatherState {
  const rng = createRng(hashStr(`${trackId}:${day}`));
  const matrix = TRANSITIONS[climate];
  const fromIdx = prev ? SIM_WEATHER_PATTERNS.indexOf(prev.pattern) : 0;
  const row = matrix[Math.max(0, fromIdx)];
  const pattern = samplePattern(row, rng);

  const [tMin, tMax] = CLIMATE_TEMP[climate];
  // Patterns nudge temp down; storm cools more than clear.
  const cool = PATTERN_SEVERITY[pattern] * 1.2;
  const tempC = Math.round((tMin + rng.next() * (tMax - tMin) - cool) * 10) / 10;

  const baseHumidity = CLIMATE_HUMIDITY_BIAS[climate];
  const humidityBoost = PATTERN_SEVERITY[pattern] * 0.07;
  const humidity = Math.min(
    1,
    Math.max(0, baseHumidity + humidityBoost + (rng.next() - 0.5) * 0.1),
  );

  return { trackId, day, pattern, tempC, humidity };
}

/**
 * Generate a forecast of `days` days starting at `startDay`, deterministic
 * given the seed previous state. Does NOT mutate input.
 * @param prev
 * @param trackId
 * @param startDay
 * @param days
 * @param climate
 */
export function generateForecast(
  prev: WeatherState | undefined,
  trackId: string,
  startDay: number,
  days: number,
  climate: ClimateZone,
): WeatherState[] {
  const out: WeatherState[] = [];
  let last = prev;
  for (let i = 0; i < days; i++) {
    last = stepWeather(last, trackId, startDay + i, climate);
    out.push(last);
  }
  return out;
}
