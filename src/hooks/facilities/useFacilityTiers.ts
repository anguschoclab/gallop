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
import { canUpgradeFacility } from "@/core/reputation";
import type { ReputationTier } from "@/core/reputation";

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
  canUpgradeByReputation: boolean;
  requiredRepTier: ReputationTier | null;
}

export function useFacilityTiers(
  facility: { level: FacilityLevel; upgradeCost: number; maintenanceCost: number } | undefined,
  cash: number,
  reputationTier: ReputationTier = "unknown",
): FacilityTierInfo {
  const currentLevelIndex = facility ? FACILITY_LEVELS.indexOf(facility.level) : -1;
  const maxLevel = currentLevelIndex >= FACILITY_LEVELS.length - 1;
  const upgradeCost = facility?.upgradeCost ?? 0;
  const canAfford = cash >= upgradeCost;
  const rankVal = facility ? getRankValue(facility.level) : 0;

  const repGate = facility
    ? canUpgradeFacility(facility.level, reputationTier)
    : { allowed: true, requiredTier: reputationTier };

  return {
    currentLevelIndex,
    maxLevel,
    upgradeCost,
    canAfford,
    rankVal,
    enabledWorkouts: [],
    canUpgradeByReputation: repGate.allowed,
    requiredRepTier: maxLevel ? null : repGate.requiredTier,
  };
}

export { FACILITY_LEVELS, getRankValue };
