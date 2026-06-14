/**
 * banister.ts - Banister Fitness/Fatigue model logic
 *
 * Provides functions for calculating fitness and fatigue impulses from training,
 * and their daily decay over time.
 *
 * Reference: Banister's Impulse-Response Model
 * Form = Fitness - Fatigue
 */

import {
  BANISTER_FITNESS_TAU,
  BANISTER_FATIGUE_TAU,
  BANISTER_FITNESS_K,
  BANISTER_FATIGUE_K,
  WORKOUT_INTENSITIES,
} from "@/constants";

export const BANISTER_CONSTANTS = {
  FITNESS_TAU: BANISTER_FITNESS_TAU,
  FATIGUE_TAU: BANISTER_FATIGUE_TAU,

  FITNESS_K: BANISTER_FITNESS_K,
  FATIGUE_K: BANISTER_FATIGUE_K,

  WORKOUT_INTENSITY: WORKOUT_INTENSITIES,
};

/**
 * Calculate the decayed value of a metric over time
 * Formula: value * e^(-days / timeConstant)
 * @param initialValue
 * @param daysPassed
 * @param timeConstant
 */
export function decayValue(initialValue: number, daysPassed: number, timeConstant: number): number {
  if (daysPassed === 0) return initialValue;
  return initialValue * Math.exp(-daysPassed / timeConstant);
}

/**
 * Calculate the impulse gain from a workout.
 * Formula: Gain = intensity * k
 * @param intensity - The workout intensity value
 * @param k - The gain constant
 * @returns The impulse gain value
 */
export function calculateImpulse(intensity: number, k: number): number {
  return intensity * k;
}

/**
 * Calculate the peaking index (Form).
 * Formula: Form = Fitness - Fatigue
 * @param fitness - The current fitness value
 * @param fatigue - The current fatigue value
 * @returns The peaking index (form)
 */
export function calculatePeakingIndex(fitness: number, fatigue: number): number {
  return fitness * BANISTER_CONSTANTS.FITNESS_K - fatigue * BANISTER_CONSTANTS.FATIGUE_K;
}

/**
 * Get the impact of the peaking index on Beyer Speed Figure.
 * Returns a multiplier (e.g., 0.95 to 1.05).
 * @param peakingIndex - The peaking index value
 * @returns The Beyer speed figure multiplier
 */
export function getPeakingBeyerMultiplier(peakingIndex: number): number {
  // Peak zone is generally positive but not too high (which might imply undertraining)
  // Overtrained zone is deeply negative.

  if (peakingIndex > 20) return 1.05; // Peak performance
  if (peakingIndex > 0) return 1.02; // Good form
  if (peakingIndex > -10) return 1.0; // Standard form
  if (peakingIndex > -30) return 0.95; // Fatigued
  return 0.9; // Severely overtrained/exhausted
}
