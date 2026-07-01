/**
 * workoutConstants.ts - Centralized training and workout constants
 */

import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";

export const TRAINING_COST = 75;

export const TRAINING_COST_MAP: Record<string, number> = {
  speed: 75,
  stamina: 75,
  acceleration: 75,
  bullet: 100,
  breeze: 85,
  gate_work: 90,
  swimming: 80,
  gallop: 70,
  treadmill: 85,
};

export const TRAINING_ENERGY_MAP: Record<string, number> = {
  speed: -18,
  stamina: -18,
  acceleration: -18,
  bullet: -25,
  breeze: -20,
  gate_work: -22,
  swimming: -15,
  gallop: -16,
  treadmill: -14,
};

export const TRAINING_ENERGY_REST = 30;
export const TRAINING_MIN_ENERGY_THRESHOLD = 15;

export const WORKOUT_INTENSITIES: Record<string, number> = {
  rest: 0,
  gallop: 5,
  breeze: 10,
  speed: 12,
  stamina: 12,
  acceleration: 12,
  gate_work: 15,
  bullet: 20,
  treadmill: 8,
};

export interface TrainingFacilityRequirement {
  facilityType: FacilityType;
  minLevel: FacilityLevel;
}

/**
 * Maps each gated training type to the facility and minimum level required to unlock it.
 * Training types absent from this map (speed, stamina, acceleration, rest) are always available.
 */
export const TRAINING_FACILITY_REQUIREMENTS: Record<string, TrainingFacilityRequirement> = {
  gallop: { facilityType: "barn", minLevel: "standard" },
  swimming: { facilityType: "exercise_pool", minLevel: "standard" },
  breeze: { facilityType: "barn", minLevel: "premium" },
  gate_work: { facilityType: "starting_gates", minLevel: "standard" },
  bullet: { facilityType: "barn", minLevel: "elite" },
  treadmill: { facilityType: "treadmill", minLevel: "standard" },
};
