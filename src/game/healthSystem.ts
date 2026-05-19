/**
 * healthSystem.ts - Injury and health mechanics
 *
 * This file provides injury rolling, recovery tracking, and health status management
 * for horses during races and training.
 *
 * Dependencies: ./types (Horse, Rng)
 * Related files: raceSim.ts (uses injury rolling), training.ts (uses injury mechanics)
 */

import type { Horse, Rng } from "./types";
import {
  EVENT_INJURY_MULTIPLIER_RACE,
  EVENT_INJURY_MULTIPLIER_TRAINING,
  FATIGUE_INJURY_THRESHOLD,
  FATIGUE_INJURY_DIVISOR,
  ENERGY_LOW_THRESHOLD,
  ENERGY_INJURY_MULTIPLIER,
  INJURY_SEVERITY_CAREER_ENDING_THRESHOLD,
  INJURY_SEVERITY_MAJOR_THRESHOLD,
  INJURY_SEVERITY_MODERATE_THRESHOLD,
  INJURY_RECOVERY_CAREER_ENDING,
  INJURY_RECOVERY_MAJOR_MIN,
  INJURY_RECOVERY_MAJOR_MAX,
  INJURY_RECOVERY_MODERATE_MIN,
  INJURY_RECOVERY_MODERATE_MAX,
  INJURY_RECOVERY_MINOR,
} from "@/game/constants/gameConstants";

export type InjurySeverity = "minor" | "moderate" | "major" | "career-ending";

export interface Injury {
  severity: InjurySeverity;
  type: string;
  recoveryDays: number;
  occurredDay: number;
}

/**
 * Rolls for a potential injury during high-stress events like races or heavy training.
 * The chance of injury is calculated based on genetic proneness, event intensity, fatigue level, and current energy.
 *
 * @param {Horse} horse - The horse subject to the injury roll.
 * @param {"race" | "training"} eventType - The type of event being simulated.
 * @param {Rng} rng - Seeded random number generator.
 * @returns {Injury | null} An injury object if a roll succeeds, otherwise null.
 */
export function rollForInjury(
  horse: Horse,
  eventType: "race" | "training",
  rng: Rng,
): Injury | null {
  if (horse.healthStatus !== "healthy") return null;

  // Base chance is the horse's genetic proneness
  let chance = horse.injuryProneness ?? 0.01;

  // Event multipliers
  if (eventType === "race") chance *= EVENT_INJURY_MULTIPLIER_RACE;
  if (eventType === "training") chance *= EVENT_INJURY_MULTIPLIER_TRAINING;

  // Fatigue factor (Banister model)
  const fatigue = horse.fatigue ?? 0;
  if (fatigue > FATIGUE_INJURY_THRESHOLD) {
    chance *= 1 + (fatigue - FATIGUE_INJURY_THRESHOLD) / FATIGUE_INJURY_DIVISOR; // Risk increases linearly with fatigue
  }

  // Energy factor
  if (horse.energy < ENERGY_LOW_THRESHOLD) {
    chance *= ENERGY_INJURY_MULTIPLIER;
  }

  if (rng.next() < chance) {
    const severityRoll = rng.next();
    let severity: InjurySeverity = "minor";
    let recoveryDays = INJURY_RECOVERY_MINOR;
    let type = "Soft Tissue Strain";

    if (severityRoll > INJURY_SEVERITY_CAREER_ENDING_THRESHOLD) {
      severity = "career-ending";
      recoveryDays = INJURY_RECOVERY_CAREER_ENDING;
      type = "Fractured Sesamoidean";
    } else if (severityRoll > INJURY_SEVERITY_MAJOR_THRESHOLD) {
      severity = "major";
      recoveryDays =
        INJURY_RECOVERY_MAJOR_MIN +
        rng.int(0, INJURY_RECOVERY_MAJOR_MAX - INJURY_RECOVERY_MAJOR_MIN);
      type = "Tendon Tear";
    } else if (severityRoll > INJURY_SEVERITY_MODERATE_THRESHOLD) {
      severity = "moderate";
      recoveryDays =
        INJURY_RECOVERY_MODERATE_MIN +
        rng.int(0, INJURY_RECOVERY_MODERATE_MAX - INJURY_RECOVERY_MODERATE_MIN);
      type = "Shin Splints";
    }

    return { severity, type, recoveryDays, occurredDay: 0 }; // Day set by caller
  }

  return null;
}
