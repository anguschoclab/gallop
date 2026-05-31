/**
 * weatherSim.ts — Per-track Markov-chain weather simulator.
 *
 * Uses scientifically accurate Koppen climate classification with monthly
 * transition matrices and regional seasonal pattern modifiers.
 *
 * Deterministic: seed = hash(`${trackId}:${day}`)
 */

import { createRng, hashStr } from "@/game/rng";
import type { KoppenCode } from "./koppenTypes";
import { KOPPEN_PROFILES } from "./koppenProfiles";
import { getTrackKoppen } from "./trackKoppenMappings";
import { getTrackHemisphere } from "./trackClimate";
import {
  type SimWeatherPattern,
  SIM_WEATHER_PATTERNS,
  type WeatherState,
  PATTERN_SEVERITY,
  toTrackWeatherPattern,
} from "./weatherTypes";

export { toTrackWeatherPattern };

/**
 * Get month (1-12) from day of year, accounting for hemisphere.
 * Southern hemisphere has inverted seasons (day 1 = July 1).
 */
function getMonthFromDay(day: number, hemisphere: "Northern" | "Southern"): number {
  const dayOfYear = ((day - 1) % 365) + 1;
  
  // For southern hemisphere, shift by 6 months (182 days)
  const effectiveDay = hemisphere === "Southern" 
    ? ((dayOfYear + 182 - 1) % 365) + 1 
    : dayOfYear;
  
  // Approximate month from day of year
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayCount = 0;
  
  for (let month = 0; month < 12; month++) {
    dayCount += monthLengths[month];
    if (effectiveDay <= dayCount) {
      return month + 1;
    }
  }
  
  return 12;
}

/**
 * Generate monthly transition probabilities based on Koppen climate data.
 * Uses historical precipitation days to derive daily rain probability.
 */
function generateMonthlyTransitions(koppen: KoppenCode, month: number): number[] {
  const profile = KOPPEN_PROFILES[koppen];
  const monthly = profile.monthly[month];
  
  if (!monthly) {
    // Fallback: moderate probabilities
    return [0.35, 0.30, 0.15, 0.12, 0.04, 0.04];
  }
  
  // Calculate rain probability from precipDays
  // Average 30-day month, precipDays / 30 = daily rain probability
  const rainProb = Math.min(0.8, monthly.precipDays / 30);
  const clearProb = Math.max(0.1, 1 - rainProb - 0.1); // Reserve 10% for other
  
  // Distribute rain probability across shower/rain/storm based on intensity
  const stormProb = monthly.thunderstormDays ? monthly.thunderstormDays / 30 : rainProb * 0.1;
  const snowProb = monthly.snowfallDays ? monthly.snowfallDays / 30 : 0;
  const regularRain = Math.max(0, rainProb - stormProb - snowProb);
  
  // Split regular rain between shower and rain
  const showerProb = regularRain * 0.4;
  const heavyRainProb = regularRain * 0.6;
  
  // Overcast is higher in humid climates, lower in dry
  const overcastProb = monthly.humidity > 0.7 ? 0.35 : monthly.humidity > 0.5 ? 0.25 : 0.15;
  
  // Adjust clear to ensure sum = 1
  const adjustedClear = Math.max(0.05, 1 - overcastProb - showerProb - heavyRainProb - snowProb - stormProb);
  
  // Normalize to ensure sum = 1
  const raw = [adjustedClear, overcastProb, showerProb, heavyRainProb, snowProb, stormProb];
  const sum = raw.reduce((a, b) => a + b, 0);
  
  return raw.map(v => v / sum);
}

/**
 * Wind speed ranges by pattern (min, max) in km/h.
 * Enhanced with regional wind characteristics.
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
 * Apply regional wind modifiers based on Koppen code.
 */
function getRegionalWindRange(koppen: KoppenCode, baseRange: [number, number]): [number, number] {
  const [min, max] = baseRange;
  
  switch (koppen) {
    case "Cfb": // Oceanic - stronger westerlies
    case "Dfb":
      return [min * 1.2, max * 1.1];
    case "Cfa": // Monsoon influence
    case "Aw":
      return [min * 1.1, max * 1.3]; // Higher max for monsoon surges
    case "BWh": // Desert - thermal winds
      return [min * 0.8, max * 0.9];
    case "Csb": // Mediterranean
      return [min, max * 1.1];
    default:
      return [min, max];
  }
}

/**
 * Seeded sample from a transition probability distribution.
 */
function samplePattern(probs: number[], rng: { next: () => number }): SimWeatherPattern {
  const r = rng.next();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) return SIM_WEATHER_PATTERNS[i];
  }
  return SIM_WEATHER_PATTERNS[SIM_WEATHER_PATTERNS.length - 1];
}

/**
 * Generate temperature from historical normals with daily variance.
 */
function generateTemperature(
  koppen: KoppenCode, 
  month: number, 
  pattern: SimWeatherPattern,
  rng: { next: () => number }
): number {
  const profile = KOPPEN_PROFILES[koppen].monthly[month];
  const { avgHigh, avgLow } = profile;
  
  // Daily variance: ±3°C
  const variance = (rng.next() - 0.5) * 6;
  
  // Pattern affects temperature: storms/rain cooler, clear warmer
  const patternMod = {
    clear: 2,
    overcast: 0,
    shower: -1,
    rain: -2,
    snow: -5,
    storm: -3,
  }[pattern];
  
  // Use avgHigh as base, add variance and pattern modifier
  return Math.round((avgHigh + variance + patternMod) * 10) / 10;
}

/**
 * Generate humidity from historical normals with pattern-based adjustments.
 */
function generateHumidity(
  koppen: KoppenCode,
  month: number,
  pattern: SimWeatherPattern,
  rng: { next: () => number }
): number {
  const profile = KOPPEN_PROFILES[koppen].monthly[month];
  const baseHumidity = profile.humidity;
  
  // Pattern-based adjustments
  const patternMod = {
    clear: -0.05,
    overcast: 0,
    shower: 0.05,
    rain: 0.10,
    snow: 0.08,
    storm: 0.15,
  }[pattern];
  
  // Daily variance: ±5%
  const variance = (rng.next() - 0.5) * 0.1;
  
  return Math.min(1, Math.max(0, baseHumidity + patternMod + variance));
}

/**
 * Generate wind speed with regional and pattern-based adjustments.
 */
function generateWind(
  koppen: KoppenCode,
  pattern: SimWeatherPattern,
  rng: { next: () => number }
): number {
  const baseRange = WIND_RANGES[pattern];
  const [min, max] = getRegionalWindRange(koppen, baseRange);
  
  return Math.round(min + rng.next() * (max - min));
}

/**
 * Step one day forward from the previous WeatherState.
 * Uses Koppen-based monthly climate data and seasonal patterns.
 * @param prev
 * @param trackId
 * @param day
 */
export function stepWeather(
  prev: WeatherState | undefined,
  trackId: string,
  day: number,
): WeatherState {
  const koppen = getTrackKoppen(trackId);
  const hemisphere = getTrackHemisphere(trackId);
  const month = getMonthFromDay(day, hemisphere);
  
  const rng = createRng(hashStr(`${trackId}:${day}`));
  
  // Get base monthly transition probabilities
  const transitions = generateMonthlyTransitions(koppen, month);
  
  // Adjust based on previous pattern (Markov property)
  const fromIdx = prev ? SIM_WEATHER_PATTERNS.indexOf(prev.pattern) : 0;
  
  // Weight transitions based on previous state
  // Higher probability of staying in same weather or transitioning logically
  const adjustedTransitions = transitions.map((prob, idx) => {
    if (idx === fromIdx) return prob * 1.3; // Slight persistence bias
    return prob;
  });
  
  // Normalize
  const sum = adjustedTransitions.reduce((a, b) => a + b, 0);
  const normalizedTransitions = adjustedTransitions.map(p => p / sum);
  
  const pattern = samplePattern(normalizedTransitions, rng);
  
  // Generate weather values from historical climate data
  const tempC = generateTemperature(koppen, month, pattern, rng);
  const humidity = generateHumidity(koppen, month, pattern, rng);
  const windKph = generateWind(koppen, pattern, rng);
  
  // Temperature-snow consistency check
  let finalPattern = pattern;
  if (pattern === "snow" && tempC > 2) {
    finalPattern = "rain";
  } else if (pattern === "rain" && tempC <= 0 && rng.next() < 0.3) {
    finalPattern = "snow";
  }

  return { 
    trackId, 
    day, 
    pattern: finalPattern, 
    tempC, 
    humidity, 
    windKph,
  };
}

/**
 * Generate a forecast of `days` days starting at `startDay`.
 * Deterministic given the seed and previous state.
 * @param prev
 * @param trackId
 * @param startDay
 * @param days
 */
export function generateForecast(
  prev: WeatherState | undefined,
  trackId: string,
  startDay: number,
  days: number,
): WeatherState[] {
  const out: WeatherState[] = [];
  let last = prev;
  for (let i = 0; i < days; i++) {
    last = stepWeather(last, trackId, startDay + i);
    out.push(last);
  }
  return out;
}
