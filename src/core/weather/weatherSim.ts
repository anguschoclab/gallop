/**
 * weatherSim.ts — Per-track Markov-chain weather simulator.
 *
 * Deterministic: seed = hash(`${trackId}:${day}`). Transition matrices are
 * indexed by ClimateZone (re-used from `trackConditionData`).
 */

import { createRng, hashStr } from "@/game/rng";
import type { ClimateZone } from "@/core/track/trackConditionData";
import type { Hemisphere } from "./trackClimate";
import {
  type SimWeatherPattern,
  SIM_WEATHER_PATTERNS,
  type WeatherState,
  PATTERN_SEVERITY,
  toTrackWeatherPattern,
} from "./weatherTypes";

export { toTrackWeatherPattern };

/**
 * Seasonal temperature offset based on day of year and hemisphere.
 * Peaks at +amp around day-of-year 200 in the Northern hemisphere,
 * shifted by 6 months for the Southern hemisphere.
 * @param day
 * @param hemisphere
 * @param amp
 */
function seasonalTempOffset(day: number, hemisphere: Hemisphere, amp: number): number {
  const dayOfYear = ((day - 1) % 365) + 1;
  const phase = hemisphere === "Southern" ? dayOfYear + 182 : dayOfYear;
  const normalizedPhase = ((phase - 1) % 365) + 1;
  return amp * Math.sin((2 * Math.PI * (normalizedPhase - 80)) / 365);
}

/**
 * Seasonal row bias for transition matrices based on hemisphere.
 * Southern hemisphere gets wetter summers (mirrored pattern).
 * @param row
 * @param hemisphere
 * @param day
 */
function seasonalRowBias(row: number[], hemisphere: Hemisphere, day: number): number[] {
  const dayOfYear = ((day - 1) % 365) + 1;
  const phase = hemisphere === "Southern" ? dayOfYear + 182 : dayOfYear;
  const normalizedPhase = ((phase - 1) % 365) + 1;
  const sign = hemisphere === "Southern" ? -1 : 1;
  const bias = sign * 0.05 * Math.sin((2 * Math.PI * (normalizedPhase - 80)) / 365);
  return row.map((v) => Math.max(0, v + bias));
}

/**
 * Row-stochastic transition matrices: rows = today, cols = tomorrow.
 * Order matches SIM_WEATHER_PATTERNS: clear, overcast, shower, rain, snow, storm.
 */
const TRANSITIONS: Record<ClimateZone, number[][]> = {
  arid: [
    [0.78, 0.16, 0.04, 0.012, 0.003, 0.005],
    [0.55, 0.32, 0.1, 0.022, 0.003, 0.005],
    [0.4, 0.35, 0.18, 0.055, 0.005, 0.01],
    [0.3, 0.35, 0.2, 0.12, 0.01, 0.02],
    [0.25, 0.35, 0.2, 0.12, 0.05, 0.05],
    [0.2, 0.35, 0.22, 0.13, 0.05, 0.05],
  ],
  temperate: [
    [0.55, 0.25, 0.12, 0.05, 0.01, 0.02],
    [0.3, 0.4, 0.18, 0.09, 0.01, 0.02],
    [0.18, 0.32, 0.28, 0.16, 0.02, 0.04],
    [0.12, 0.25, 0.25, 0.26, 0.04, 0.08],
    [0.1, 0.22, 0.24, 0.26, 0.08, 0.1],
    [0.08, 0.2, 0.22, 0.28, 0.02, 0.2],
  ],
  humid: [
    [0.4, 0.3, 0.18, 0.09, 0.01, 0.02],
    [0.22, 0.35, 0.25, 0.13, 0.01, 0.04],
    [0.12, 0.25, 0.32, 0.22, 0.02, 0.07],
    [0.08, 0.18, 0.28, 0.3, 0.04, 0.12],
    [0.06, 0.15, 0.24, 0.3, 0.08, 0.17],
    [0.05, 0.15, 0.22, 0.3, 0.03, 0.25],
  ],
  tropical: [
    [0.3, 0.28, 0.22, 0.14, 0.01, 0.05],
    [0.18, 0.3, 0.28, 0.17, 0.01, 0.06],
    [0.1, 0.22, 0.32, 0.26, 0.01, 0.09],
    [0.06, 0.15, 0.27, 0.34, 0.02, 0.16],
    [0.05, 0.12, 0.22, 0.35, 0.02, 0.24],
    [0.04, 0.1, 0.2, 0.35, 0.01, 0.3],
  ],
  continental: [
    [0.6, 0.22, 0.1, 0.05, 0.01, 0.02],
    [0.32, 0.38, 0.16, 0.09, 0.01, 0.04],
    [0.2, 0.3, 0.25, 0.17, 0.01, 0.07],
    [0.12, 0.22, 0.25, 0.28, 0.02, 0.11],
    [0.1, 0.2, 0.22, 0.28, 0.05, 0.15],
    [0.08, 0.18, 0.22, 0.28, 0.02, 0.22],
  ],
  cool: [
    [0.45, 0.3, 0.15, 0.06, 0.02, 0.02],
    [0.25, 0.35, 0.2, 0.13, 0.02, 0.05],
    [0.15, 0.25, 0.3, 0.2, 0.02, 0.08],
    [0.1, 0.2, 0.25, 0.28, 0.02, 0.15],
    [0.08, 0.18, 0.22, 0.28, 0.05, 0.19],
    [0.05, 0.15, 0.2, 0.28, 0.02, 0.3],
  ],
  warm: [
    [0.6, 0.25, 0.1, 0.035, 0.005, 0.01],
    [0.4, 0.35, 0.15, 0.075, 0.005, 0.02],
    [0.25, 0.3, 0.25, 0.145, 0.005, 0.05],
    [0.15, 0.25, 0.25, 0.235, 0.015, 0.1],
    [0.12, 0.2, 0.2, 0.24, 0.03, 0.21],
    [0.1, 0.2, 0.2, 0.25, 0.05, 0.2],
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
 * Wind speed ranges by pattern (min, max) in km/h.
 * Storms have higher wind; snow often calmer than rain.
 */
const WIND_RANGES: Record<SimWeatherPattern, [number, number]> = {
  clear: [5, 20],
  overcast: [10, 25],
  shower: [15, 35],
  rain: [25, 50],
  snow: [20, 40],
  storm: [40, 80],
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
 * @param hemisphere
 */
export function stepWeather(
  prev: WeatherState | undefined,
  trackId: string,
  day: number,
  climate: ClimateZone,
  hemisphere: Hemisphere = "Northern",
): WeatherState {
  const rng = createRng(hashStr(`${trackId}:${day}`));
  const matrix = TRANSITIONS[climate];
  const fromIdx = prev ? SIM_WEATHER_PATTERNS.indexOf(prev.pattern) : 0;
  const baseRow = matrix[Math.max(0, fromIdx)];

  // Pre-calculate temperature to adjust transition row for snow/rain coupling
  const [tMin, tMax] = CLIMATE_TEMP[climate];
  const seasonalAmp = (tMax - tMin) * 0.3;
  const seasonal = seasonalTempOffset(day, hemisphere, seasonalAmp);
  const baseTemp = tMin + rng.next() * (tMax - tMin) + seasonal;

  // Adjust transition row based on temperature for snow/rain coupling
  // Snow index = 4, Rain index = 3
  const adjustedRow = [...seasonalRowBias(baseRow, hemisphere, day)];
  if (baseTemp <= 0) {
    // Freezing: boost snow probability at expense of rain
    const snowBoost = adjustedRow[3] * 0.3; // 30% of rain probability moves to snow
    adjustedRow[4] += snowBoost;
    adjustedRow[3] -= snowBoost;
  } else if (baseTemp > 2) {
    // Above freezing: snow unlikely, transfer to rain
    const snowToRain = adjustedRow[4] * 0.8; // 80% of snow probability moves to rain
    adjustedRow[3] += snowToRain;
    adjustedRow[4] -= snowToRain;
  }
  // Normalize row to ensure it sums to 1
  const rowSum = adjustedRow.reduce((a, b) => a + b, 0);
  const row = adjustedRow.map((v) => v / rowSum);

  const pattern = samplePattern(row, rng);

  // Patterns nudge temp down; storm cools more than clear.
  const cool = PATTERN_SEVERITY[pattern] * 1.2;
  const tempC = Math.round((baseTemp - cool) * 10) / 10;

  // Temperature-snow consistency: if above freezing, downgrade snow to rain
  let finalPattern = pattern;
  if (pattern === "snow" && tempC > 2) {
    finalPattern = "rain";
  } else if (pattern === "rain" && tempC <= 0 && rng.next() < 0.3) {
    // Freezing rain has 30% chance to become snow
    finalPattern = "snow";
  }

  const baseHumidity = CLIMATE_HUMIDITY_BIAS[climate];
  const humidityBoost = PATTERN_SEVERITY[finalPattern] * 0.07;
  const humidity = Math.min(
    1,
    Math.max(0, baseHumidity + humidityBoost + (rng.next() - 0.5) * 0.1),
  );

  // Generate wind based on pattern severity
  const [wMin, wMax] = WIND_RANGES[finalPattern];
  const windKph = Math.round(wMin + rng.next() * (wMax - wMin));

  return { trackId, day, pattern: finalPattern, tempC, humidity, windKph };
}

/**
 * Generate a forecast of `days` days starting at `startDay`, deterministic
 * given the seed previous state. Does NOT mutate input.
 * @param prev
 * @param trackId
 * @param startDay
 * @param days
 * @param climate
 * @param hemisphere
 */
export function generateForecast(
  prev: WeatherState | undefined,
  trackId: string,
  startDay: number,
  days: number,
  climate: ClimateZone,
  hemisphere: Hemisphere = "Northern",
): WeatherState[] {
  const out: WeatherState[] = [];
  let last = prev;
  for (let i = 0; i < days; i++) {
    last = stepWeather(last, trackId, startDay + i, climate, hemisphere);
    out.push(last);
  }
  return out;
}
