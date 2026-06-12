/**
 * rivalry.ts - Rivalry and Friction mechanics
 *
 * Manages the numerical relationship (Friction) between the player
 * and NPC stables, and the Regional Dominance system.
 */

import {
  RIVALRY_FRICTION_MIN,
  RIVALRY_FRICTION_MAX,
  RIVALRY_FRICTION_DECAY_RATE,
  RIVALRY_OUTBID_AT_AUCTION,
  RIVALRY_WIN_GRADED_RACE_OVER_NPC,
  RIVALRY_CLAIM_NPC_HORSE,
  RIVALRY_TAUNT_IN_GAZETTE,
  RIVALRY_UNSEAT_WIN_STREAK,
  RIVALRY_HOME_FIELD_BONUS,
} from "@/constants";

export const RIVALRY_CONSTANTS = {
  FRICTION: {
    MIN: RIVALRY_FRICTION_MIN,
    MAX: RIVALRY_FRICTION_MAX,
    DECAY_RATE: RIVALRY_FRICTION_DECAY_RATE,

    // Provocation triggers
    OUTBID_AT_AUCTION: RIVALRY_OUTBID_AT_AUCTION,
    WIN_GRADED_RACE_OVER_NPC: RIVALRY_WIN_GRADED_RACE_OVER_NPC,
    CLAIM_NPC_HORSE: RIVALRY_CLAIM_NPC_HORSE,
    TAUNT_IN_GAZETTE: RIVALRY_TAUNT_IN_GAZETTE,
  },

  REGIONS: [
    "North America (East)",
    "North America (West)",
    "Europe (UK)",
    "Europe (France)",
    "Asia (Japan)",
    "Asia (Hong Kong)",
    "Australia",
    "South America",
  ],

  DOMINANCE: {
    UNSEAT_WIN_STREAK: RIVALRY_UNSEAT_WIN_STREAK,
    HOME_FIELD_BONUS: RIVALRY_HOME_FIELD_BONUS,
  },
};

/**
 * Calculate the outcome of a provocation.
 * @param currentFriction - Current friction value
 * @param change - Amount to change friction by
 * @returns New friction value clamped between MIN and MAX
 */
export function calculateFrictionChange(currentFriction: number, change: number): number {
  return Math.min(
    RIVALRY_CONSTANTS.FRICTION.MAX,
    Math.max(RIVALRY_CONSTANTS.FRICTION.MIN, currentFriction + change),
  );
}

/**
 * Determine if a stable is a "Hated Rival" (Trigger for Spoilers).
 * @param friction - Current friction value
 * @returns True if friction is 70 or higher
 */
export function isHatedRival(friction: number): boolean {
  return friction >= 70;
}

/**
 * Determine if a stable is a "Friendly Competitor".
 * @param friction - Current friction value
 * @returns True if friction is -50 or lower
 */
export function isFriendlyCompetitor(friction: number): boolean {
  return friction <= -50;
}
