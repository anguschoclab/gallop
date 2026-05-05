// Facility Defaults - Default facility creation and helper functions

import type { Facility, FacilityType, FacilityLevel, PlayerFacilities } from "./facilityTypes";
import {
  FACILITY_MAINTENANCE_COSTS,
  FACILITY_UPGRADE_COSTS,
  FACILITY_ENABLED_WORKOUTS,
} from "./facilityTypes";

/**
 * Create a default facility at a given level
 */
export function createFacility(
  type: FacilityType,
  level: FacilityLevel,
  currentDay: number
): Facility {
  return {
    type,
    level,
    maintenanceCost: FACILITY_MAINTENANCE_COSTS[level],
    upgradeCost: FACILITY_UPGRADE_COSTS[level] ?? 0,
    builtDay: currentDay,
  };
}

/**
 * Create default facilities for a new player stable
 * Starts with all basic facilities
 */
export function createDefaultPlayerFacilities(currentDay: number = 1): PlayerFacilities {
  const facilityTypes: FacilityType[] = [
    "main_track",
    "barn",
    "exercise_pool",
    "treadmill",
    "veterinary_clinic",
    "starting_gates",
    "transport",
    "spa",
    "nutrition_lab",
    "rehab_center",
  ];

  const facilities: Partial<PlayerFacilities> = {};

  for (const type of facilityTypes) {
    facilities[type] = createFacility(type, "basic", currentDay);
  }

  return facilities as PlayerFacilities;
}

/**
 * Create facilities for an NPC stable based on tier
 * - Elite: Mostly premium/elite
 * - Mid: Standard/premium mix
 * - Budget: Basic/standard only
 */
export function createNPCFacilities(
  tier: "elite" | "mid" | "budget",
  currentDay: number
): PlayerFacilities {
  const facilityTypes: FacilityType[] = [
    "main_track",
    "barn",
    "exercise_pool",
    "treadmill",
    "veterinary_clinic",
    "starting_gates",
    "transport",
  ];

  const levelDistribution: Record<typeof tier, FacilityLevel[]> = {
    elite: ["elite", "premium", "premium", "premium", "standard", "standard", "basic"],
    mid: ["premium", "standard", "standard", "basic", "basic", "basic", "basic"],
    budget: ["basic", "basic", "basic", "basic", "standard", "basic", "basic"],
  };

  const facilities: Partial<PlayerFacilities> = {};
  const levels = levelDistribution[tier];

  for (let i = 0; i < facilityTypes.length; i++) {
    const type = facilityTypes[i];
    const level = levels[i % levels.length];
    facilities[type] = createFacility(type, level, currentDay);
  }

  // Add optional facilities for higher-tier stables
  if (tier === "elite") {
    facilities.spa = createFacility("spa", "premium", currentDay);
    facilities.nutrition_lab = createFacility("nutrition_lab", "standard", currentDay);
    facilities.rehab_center = createFacility("rehab_center", "standard", currentDay);
  } else if (tier === "mid") {
    facilities.spa = createFacility("spa", "basic", currentDay);
  }

  return facilities as PlayerFacilities;
}

/**
 * Calculate total daily maintenance cost for all facilities
 */
export function calculateTotalMaintenance(facilities: PlayerFacilities): number {
  let total = 0;
  for (const facility of Object.values(facilities)) {
    if (facility) {
      total += facility.maintenanceCost;
    }
  }
  return total;
}

/**
 * Get facility bonus multiplier for a given facility type
 * Returns 0 if facility doesn't exist
 */
export function getFacilityBonus(
  facilities: PlayerFacilities,
  type: FacilityType
): number {
  const facility = facilities[type];
  if (!facility) return 0;

  const bonuses: Record<FacilityLevel, number> = {
    basic: 0,
    standard: 0.10,
    premium: 0.25,
    elite: 0.40,
  };

  return bonuses[facility.level];
}

/**
 * Check if a facility enables a specific workout type
 */
export function isWorkoutEnabled(
  facilities: PlayerFacilities,
  workoutType: string
): boolean {
  for (const [facilityType, enabledWorkouts] of Object.entries(FACILITY_ENABLED_WORKOUTS)) {
    const facility = facilities[facilityType as FacilityType];
    if (facility && (enabledWorkouts as string[]).includes(workoutType)) {
      return true;
    }
  }

  return false;
}

/**
 * Upgrade a facility to the next level
 * Returns null if already at max level or upgrade not possible
 */
export function upgradeFacility(
  facility: Facility,
  currentDay: number
): Facility | null {
  const levelOrder: FacilityLevel[] = ["basic", "standard", "premium", "elite"];
  const currentIndex = levelOrder.indexOf(facility.level);

  if (currentIndex >= levelOrder.length - 1) {
    return null; // Already at max level
  }

  const newLevel = levelOrder[currentIndex + 1];
  return createFacility(facility.type, newLevel, currentDay);
}

/**
 * Downgrade a facility (for emergency cost cutting)
 * Returns null if already at basic level
 */
export function downgradeFacility(
  facility: Facility,
  currentDay: number
): Facility | null {
  const levelOrder: FacilityLevel[] = ["basic", "standard", "premium", "elite"];
  const currentIndex = levelOrder.indexOf(facility.level);

  if (currentIndex <= 0) {
    return null; // Already at minimum level
  }

  const newLevel = levelOrder[currentIndex - 1];
  return createFacility(facility.type, newLevel, currentDay);
}
