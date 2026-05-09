/**
 * trackConditions.ts - Unified track conditions system
 *
 * This file provides surface-specific terminology, speed modifiers, turf rail positions,
 * maintenance actions, and climate-aware condition progression.
 *
 * Dependencies: @/game/types (TrackCondition), @/game/rng (Rng), ./track/trackConditionData (constants and types)
 * Related files: track/trackConditionData.ts (provides static data)
 */

import type { TrackCondition } from "@/game/types";
import type { Rng } from "@/game/rng";
import {
  CONDITION_TIERS,
  REGIONAL_TERMINOLOGY,
  TRACK_SPEED_MODIFIERS,
  STAMINA_DRAIN_MODIFIERS,
  SURFACE_COMPATIBILITY,
  DEFAULT_TURF_RAIL_POSITIONS,
  RAIL_POSITION_EXTRA_DISTANCE,
  BASE_DETERIORATION_RATES,
  WEATHER_DETERIORATION_MODIFIERS,
  DAILY_RECOVERY_RATES,
  MAINTENANCE_ACTIONS,
  TRACK_BASE_CHARACTERISTICS,
  CLIMATE_CONDITION_BIAS,
  CLIMATE_DRYING_RATES,
  type RegionCode,
  type TurfRailPosition,
  type WeatherPattern,
  type MaintenanceAction,
  type MaintenanceConfig,
  type TrackBaseCharacteristics,
  type ClimateZone,
} from "./track/trackConditionData";

export type {
  RegionCode,
  TurfRailPosition,
  WeatherPattern,
  MaintenanceAction,
  MaintenanceConfig,
  TrackBaseCharacteristics,
  ClimateZone,
};

// Re-export constants for backward compatibility
export {
  CONDITION_TIERS,
  REGIONAL_TERMINOLOGY,
  TRACK_SPEED_MODIFIERS,
  STAMINA_DRAIN_MODIFIERS,
  SURFACE_COMPATIBILITY,
  DEFAULT_TURF_RAIL_POSITIONS,
  RAIL_POSITION_EXTRA_DISTANCE,
  BASE_DETERIORATION_RATES,
  WEATHER_DETERIORATION_MODIFIERS,
  DAILY_RECOVERY_RATES,
  MAINTENANCE_ACTIONS,
  TRACK_BASE_CHARACTERISTICS,
  CLIMATE_CONDITION_BIAS,
  CLIMATE_DRYING_RATES,
};

/**
 * Get running style bias from rail position.
 *
 * Positive values indicate inside advantage (saves ground),
 * negative values indicate outside disadvantage (more ground to cover).
 *
 * @param railPosition - Turf rail position
 * @returns Bias modifier (positive = inside advantage)
 *
 * @example
 * const bias = getRailBias("true"); // 0.05
 */
export function getRailBias(railPosition: TurfRailPosition): number {
  switch (railPosition) {
    case "true":
      return 0.05; // Slight inside advantage (saves ground)
    case "+10ft":
      return 0;
    case "+20ft":
      return -0.02; // Slight outside disadvantage
    case "+30ft":
      return -0.05; // More ground to cover
  }
}

/**
 * Calculate track condition change after a race day.
 *
 * Factors in base deterioration rate, weather impact, number of races,
 * and maintenance quality to determine the new track condition.
 *
 * @param current - Current track condition
 * @param weather - Weather pattern during racing
 * @param racesRun - Number of races completed
 * @param maintenanceLevel - 0-1 scale of track preparation quality (default 0.5)
 * @returns New track condition
 *
 * @example
 * const newCondition = calculateConditionChange("good", "rain", 8, 0.8);
 */
export function calculateConditionChange(
  current: TrackCondition,
  weather: WeatherPattern,
  racesRun: number,
  maintenanceLevel: number = 0.5,
): TrackCondition {
  const baseRate = BASE_DETERIORATION_RATES[current];
  const weatherMod = WEATHER_DETERIORATION_MODIFIERS[weather];
  const maintenanceProtection = maintenanceLevel * 0.5; // Up to 50% reduction

  const deterioration = (baseRate + weatherMod) * racesRun * (1 - maintenanceProtection);

  // Map deterioration to condition steps
  const conditionIndex = CONDITION_TIERS.indexOf(current);
  const steps = Math.floor(deterioration / 3); // 3% = 1 condition tier
  const newIndex = Math.min(CONDITION_TIERS.length - 1, conditionIndex + steps);

  return CONDITION_TIERS[newIndex];
}

/**
 * Simulate track recovery between race days.
 *
 * Calculates how much the track recovers based on days rested and climate zone.
 *
 * @param current - Current condition
 * @param daysRested - Days since last racing
 * @param climate - Climate zone affecting drying (default "temperate")
 * @returns Recovered track condition
 *
 * @example
 * const recovered = calculateConditionRecovery("yielding", 3, "tropical");
 */
export function calculateConditionRecovery(
  current: TrackCondition,
  daysRested: number,
  climate: ClimateZone = "temperate",
): TrackCondition {
  const baseRecovery = DAILY_RECOVERY_RATES[current] * daysRested;
  const climateModifier = CLIMATE_DRYING_RATES[climate];
  const totalRecovery = baseRecovery * climateModifier;

  const conditionIndex = CONDITION_TIERS.indexOf(current);
  const steps = Math.floor(totalRecovery / 3);
  const newIndex = Math.max(0, conditionIndex - steps);

  return CONDITION_TIERS[newIndex];
}

/**
 * Generate a random track condition biased by climate zone.
 *
 * Uses climate-specific weights to generate a condition that's appropriate
 * for the given climate and surface type.
 *
 * @param rng - Random number generator
 * @param climate - Climate zone for bias (default "temperate")
 * @param surface - Surface type for compatibility filtering (default "turf")
 * @returns Track condition appropriate for the climate and surface
 *
 * @example
 * const condition = randomTrackConditionWithClimateBias(rng, "tropical", "dirt");
 */
export function randomTrackConditionWithClimateBias(
  rng: Rng,
  climate: ClimateZone = "temperate",
  surface: "dirt" | "turf" | "synthetic" = "turf",
): TrackCondition {
  const weights = CLIMATE_CONDITION_BIAS[climate];
  const validConditions = SURFACE_COMPATIBILITY[surface].validConditions;

  // Filter weights to only valid conditions and normalize
  const validEntries = Object.entries(weights).filter(([condition]) =>
    validConditions.includes(condition as TrackCondition),
  ) as [TrackCondition, number][];

  const totalWeight = validEntries.reduce((sum, [, weight]) => sum + weight, 0);
  const normalized = validEntries.map(
    ([condition, weight]) => [condition, weight / totalWeight] as const,
  );

  // Weighted random selection
  const roll = rng.next();
  let cumulative = 0;

  for (const [condition, weight] of normalized) {
    cumulative += weight;
    if (roll <= cumulative) {
      return condition;
    }
  }

  // Fallback to last valid condition
  return normalized[normalized.length - 1]?.[0] ?? "good";
}

/**
 * Get regional display terminology for a track condition.
 *
 * Returns the region-specific label, abbreviation, and description
 * for a given track condition.
 *
 * @param condition - Standard track condition
 * @param region - Region code for terminology
 * @returns Regional display information with label, abbreviation, description
 *
 * @example
 * const info = getRegionalTerminology("good", "uk");
 */
export function getRegionalTerminology(
  condition: TrackCondition,
  region: RegionCode,
): { label: string; abbreviation: string; description: string } {
  return REGIONAL_TERMINOLOGY[region][condition];
}

/**
 * Calculate speed modifier for a given track condition.
 *
 * Returns the speed multiplier for the condition, optionally adjusted
 * by the horse's mud aptitude for harsh conditions.
 *
 * @param condition - Track condition
 * @param mudAptitude - Horse's mud aptitude (0.85-1.15, default 1.0)
 * @returns Final speed multiplier
 *
 * @example
 * const modifier = getSpeedModifier("soft", 1.1); // 1.1 * base
 */
export function getSpeedModifier(condition: TrackCondition, mudAptitude: number = 1.0): number {
  const baseModifier = TRACK_SPEED_MODIFIERS[condition];
  const isHarsh = condition === "soft" || condition === "heavy" || condition === "yielding";

  if (isHarsh) {
    // Mud aptitude provides advantage/disadvantage on soft/heavy
    return baseModifier * mudAptitude;
  }

  return baseModifier;
}

/**
 * Calculate stamina drain for a given track condition.
 *
 * Returns the stamina drain multiplier for the condition.
 *
 * @param condition - Track condition
 * @returns Stamina drain multiplier
 *
 * @example
 * const drain = getStaminaDrainModifier("heavy"); // Higher than good
 */
export function getStaminaDrainModifier(condition: TrackCondition): number {
  return STAMINA_DRAIN_MODIFIERS[condition];
}

/**
 * Get turf rail position for a track condition.
 *
 * Returns the default turf rail position for the condition,
 * or uses the override if provided.
 *
 * @param condition - Track condition
 * @param override - Optional override position
 * @returns Turf rail position
 *
 * @example
 * const position = getTurfRailPosition("good"); // "true"
 */
export function getTurfRailPosition(
  condition: TrackCondition,
  override?: TurfRailPosition,
): TurfRailPosition {
  return override ?? DEFAULT_TURF_RAIL_POSITIONS[condition];
}

/**
 * Determine if a maintenance action is applicable for a surface.
 *
 * Checks if a given maintenance action can be performed on a specific surface type.
 *
 * @param action - Maintenance action type
 * @param surface - Track surface type (dirt, turf, synthetic)
 * @returns Whether the action can be performed
 *
 * @example
 * const canHarrow = isMaintenanceApplicable("harrow", "dirt"); // true
 */
export function isMaintenanceApplicable(
  action: MaintenanceAction,
  surface: "dirt" | "turf" | "synthetic",
): boolean {
  const config = MAINTENANCE_ACTIONS.find((a) => a.action === action);
  return config?.applicableSurfaces.includes(surface) ?? false;
}

export type { TrackCondition };
