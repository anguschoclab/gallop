/**
 * banister.ts - Banister Fitness/Fatigue model logic
 * 
 * Provides functions for calculating fitness and fatigue impulses from training,
 * and their daily decay over time.
 * 
 * Reference: Banister's Impulse-Response Model
 * Form = Fitness - Fatigue
 */

export const BANISTER_CONSTANTS = {
  // Decay constants (tau) in days
  FITNESS_TAU: 45,
  FATIGUE_TAU: 15,
  
  // Gain constants (k)
  FITNESS_K: 1.0,
  FATIGUE_K: 2.0, // Fatigue builds faster than fitness
  
  // Base intensity values for different workout types
  WORKOUT_INTENSITY: {
    rest: 0,
    gallop: 5,
    breeze: 10,
    speed: 12,
    stamina: 12,
    acceleration: 12,
    gate_work: 15,
    bullet: 20, // High intensity
  } as Record<string, number>,
};

/**
 * Calculate the new value after 1 day of decay.
 * Formula: V_new = V_old * exp(-1 / tau)
 */
export function decayValue(currentValue: number, tau: number): number {
  return currentValue * Math.exp(-1 / tau);
}

/**
 * Calculate the impulse gain from a workout.
 * Formula: Gain = intensity * k
 */
export function calculateImpulse(intensity: number, k: number): number {
  return intensity * k;
}

/**
 * Calculate the peaking index (Form).
 * Formula: Form = Fitness - Fatigue
 */
export function calculatePeakingIndex(fitness: number, fatigue: number): number {
  return fitness - fatigue;
}

/**
 * Get the impact of the peaking index on Beyer Speed Figure.
 * Returns a multiplier (e.g., 0.95 to 1.05).
 */
export function getPeakingBeyerMultiplier(peakingIndex: number): number {
  // Peak zone is generally positive but not too high (which might imply undertraining)
  // Overtrained zone is deeply negative.
  
  if (peakingIndex > 20) return 1.05; // Peak performance
  if (peakingIndex > 0) return 1.02;  // Good form
  if (peakingIndex > -10) return 1.0; // Standard form
  if (peakingIndex > -30) return 0.95; // Fatigued
  return 0.90; // Severely overtrained/exhausted
}
