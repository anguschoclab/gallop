/**
 * phenotype/aptitude.ts - Aptitude and running style resolution
 *
 * Dependencies: @/core/common/types (Locus), @/core/horse/types (RunningStyle)
 */

import type { Locus } from "@/core/common/types";
import type { RunningStyle } from "@/core/horse/types";

/**
 * Resolve running style from style locus.
 *
 * Maps locus value to running style: E (early), EP (early-press), P (press), S (sustain/closer).
 *
 * @param styleLocus - Style locus
 * @returns Running style
 *
 * @example
 * const style = resolveRunningStyle(genotype.style);
 */
export function resolveRunningStyle(styleLocus: Locus): RunningStyle {
  const avg = (styleLocus[0] + styleLocus[1]) / 2;
  if (avg <= 1.5) return "E";
  if (avg <= 2.5) return "EP";
  if (avg <= 3.5) return "P";
  return "S";
}

/**
 * Resolve distance aptitude from locus.
 *
 * Maps locus value to preferred distance range (800-3200m).
 *
 * @param locus - Distance locus
 * @returns Preferred distance in meters
 *
 * @example
 * const distance = resolveDistanceAptitude(genotype.preferences.distance);
 */
export function resolveDistanceAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 800 + sum * 120;
}

/**
 * Resolve surface aptitude from locus.
 *
 * Maps locus value to surface bias for Turf, Dirt, and Synthetic.
 *
 * @param locus - Surface locus
 * @returns Surface aptitude multipliers
 *
 * @example
 * const aptitude = resolveSurfaceAptitude(genotype.preferences.surface);
 */
export function resolveSurfaceAptitude(
  locus: Locus,
): Record<"Turf" | "Dirt" | "Synthetic", number> {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 };
  if (sum >= 8) return { Turf: 0.9, Dirt: 1.0, Synthetic: 0.95 };
  return { Turf: 0.98, Dirt: 0.98, Synthetic: 1.0 };
}

/**
 * Resolve aptitude multiplier from locus.
 *
 * Returns a multiplier based on locus value (0.8-1.2 range).
 *
 * @param locus - Locus
 * @returns Aptitude multiplier
 *
 * @example
 * const multiplier = resolveAptitudeMultiplier(genotype.preferences.climbing);
 */
export function resolveAptitudeMultiplier(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.8 + (sum / 10) * 0.4;
}

/**
 * Resolve mud aptitude from locus.
 *
 * Returns mud aptitude multiplier (0.85-1.15 range).
 *
 * @param locus - Mud aptitude locus
 * @returns Mud aptitude multiplier
 *
 * @example
 * const aptitude = resolveMudAptitude(genotype.mudAptitude);
 */
export function resolveMudAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.85 + ((sum - 2) / 8) * 0.3;
}

/**
 * Resolve weather preference from locus.
 *
 * Maps locus value to weather preference: dry (low sum), wet (high sum), or all (middle).
 *
 * @param locus - Weather aptitude locus
 * @returns Weather preference: "dry", "wet", or "all"
 *
 * @example
 * const preference = resolveWeatherPreference(genotype.weatherAptitude);
 */
export function resolveWeatherPreference(locus: Locus): "dry" | "wet" | "all" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "dry";
  if (sum >= 8) return "wet";
  return "all";
}

/**
 * Calculate distance modifier based on fiber bias and race distance.
 *
 * Returns speed and stamina multipliers based on whether the horse is a
 * sprinter, stayer, or balanced and the race distance.
 *
 * @param fiberBias - Fiber bias type
 * @param distance - Race distance in meters
 * @returns Speed and stamina multipliers
 *
 * @example
 * const modifier = fiberDistanceModifier("sprinter", 1200);
 */
export function fiberDistanceModifier(
  fiberBias: "sprinter" | "balanced" | "stayer",
  distance: number,
): { speedMul: number; staminaMul: number } {
  if (fiberBias === "sprinter") {
    if (distance <= 1200) return { speedMul: 1.05, staminaMul: 0.95 };
    if (distance >= 2000) return { speedMul: 0.95, staminaMul: 0.9 };
  }
  if (fiberBias === "stayer") {
    if (distance <= 1200) return { speedMul: 0.9, staminaMul: 1.05 };
    if (distance >= 2000) return { speedMul: 0.98, staminaMul: 1.1 };
  }
  return { speedMul: 1, staminaMul: 1 };
}
