/**
 * facilities/index.ts - Facilities module
 *
 * This module provides infrastructure management for racing stables.
 * Facilities affect training, recovery, injury healing, and racing operations.
 *
 * Dependencies: ./facilityTypes (types), ./facilityDefaults (functions)
 * Related files: facilityTypes.ts, facilityDefaults.ts
 */

// Facilities Module - Infrastructure management for racing stables
// Facilities affect training, recovery, injury healing, and racing operations

// Type exports
export type { Facility, FacilityType, FacilityLevel, PlayerFacilities } from "./facilityTypes";

// Constant exports
export {
  FACILITY_BONUSES,
  FACILITY_MAINTENANCE_COSTS,
  FACILITY_UPGRADE_COSTS,
  FACILITY_NAMES,
  FACILITY_DESCRIPTIONS,
  FACILITY_ENABLED_WORKOUTS,
} from "./facilityTypes";

// Function exports
export {
  createFacility,
  createDefaultPlayerFacilities,
  createNPCFacilities,
  calculateTotalMaintenance,
  getFacilityBonus,
  isWorkoutEnabled,
  upgradeFacility,
  downgradeFacility,
} from "./facilityDefaults";
