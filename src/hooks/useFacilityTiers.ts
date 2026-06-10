/**
 * useFacilityTiers.ts - Hook for facility tier calculations and upgrade eligibility
 *
 * Extracted from FacilityCategory.tsx to centralize tier / upgrade logic.
 *
 * Dependencies: @/core/facilities (FACILITY_ENABLED_WORKOUTS, FacilityType, FacilityLevel)
 */

import {
  FACILITY_ENABLED_WORKOUTS,
  type FacilityType,
  type FacilityLevel,
} from "@/core/facilities";

const FACILITY_LEVELS: FacilityLevel[] = ["basic", "standard", "premium", "elite"];

function getRankValue(level: string) {
  switch (level) {
    case "basic":
      return 1;
    case "standard":
      return 2;
    case "premium":
      return 3;
    case "elite":
      return 4;
    default:
      return 0;
  }
}

export interface FacilityTierInfo {
  currentLevelIndex: number;
  maxLevel: boolean;
  upgradeCost: number;
  canAfford: boolean;
  rankVal: number;
  enabledWorkouts: string[];
}

export function useFacilityTiers(
  facility: { level: FacilityLevel; upgradeCost: number; maintenanceCost: number } | undefined,
  cash: number,
): FacilityTierInfo {
  const currentLevelIndex = facility ? FACILITY_LEVELS.indexOf(facility.level) : -1;
  const maxLevel = currentLevelIndex >= FACILITY_LEVELS.length - 1;
  const upgradeCost = facility?.upgradeCost ?? 0;
  const canAfford = cash >= upgradeCost;
  const rankVal = facility ? getRankValue(facility.level) : 0;

  return {
    currentLevelIndex,
    maxLevel,
    upgradeCost,
    canAfford,
    rankVal,
    enabledWorkouts: [],
  };
}

export { FACILITY_LEVELS, getRankValue };
