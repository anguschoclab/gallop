/**
 * workoutConstants.ts - Centralized training and workout constants
 */

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
};
