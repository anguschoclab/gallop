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

export type InjurySeverity = "minor" | "moderate" | "major" | "career-ending";

export interface Injury {
  severity: InjurySeverity;
  type: string;
  recoveryDays: number;
  occurredDay: number;
}

/**
 * Roll for potential injury during a high-stress event (race or heavy training).
 *
 * Rolls for injury based on the horse's genetic injury proneness, event type,
 * and fatigue level. Returns injury details if an injury occurs.
 *
 * @param horse - The horse to roll for injury
 * @param eventType - Type of event causing stress ("race" or "training")
 * @param rng - Random number generator
 * @returns Injury object if injury occurs, null otherwise
 */
export function rollForInjury(
  horse: Horse,
  eventType: "race" | "training",
  rng: Rng,
): Injury | null {
  if (horse.healthStatus !== "healthy") return null;

  // Base chance is the horse's genetic proneness
  let chance = horse.injuryProneness;

  // Event multipliers
  if (eventType === "race") chance *= 2.0;
  if (eventType === "training") chance *= 1.2;

  // Fatigue factor (Banister model)
  const fatigue = horse.fatigue ?? 0;
  if (fatigue > 50) {
    chance *= (1 + (fatigue - 50) / 100); // Risk increases linearly with fatigue > 50
  }

  // Energy factor (horses under 60 energy are more prone)
  if (horse.energy < 60) {
    chance *= 1.5;
  }

  if (rng.next() < chance) {
    const severityRoll = rng.next();
    let severity: InjurySeverity = "minor";
    let recoveryDays = 7;
    let type = "Soft Tissue Strain";

    if (severityRoll > 0.98) {
      severity = "career-ending";
      recoveryDays = 999;
      type = "Fractured Sesamoidean";
    } else if (severityRoll > 0.85) {
      severity = "major";
      recoveryDays = 60 + rng.int(0, 120);
      type = "Tendon Tear";
    } else if (severityRoll > 0.6) {
      severity = "moderate";
      recoveryDays = 14 + rng.int(0, 28);
      type = "Shin Splints";
    }

    return { severity, type, recoveryDays, occurredDay: 0 }; // Day set by caller
  }

  return null;
}
