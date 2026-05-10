/**
 * rivalry.ts - Rivalry and Friction mechanics
 * 
 * Manages the numerical relationship (Friction) between the player 
 * and NPC stables, and the Regional Dominance system.
 */

export const RIVALRY_CONSTANTS = {
  FRICTION: {
    MIN: -100,
    MAX: 100,
    DECAY_RATE: 0.98, // Daily decay back toward 0
    
    // Provocation triggers
    OUTBID_AT_AUCTION: 25,
    WIN_GRADED_RACE_OVER_NPC: 15,
    CLAIM_NPC_HORSE: 40,
    TAUNT_IN_GAZETTE: 20,
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
    UNSEAT_WIN_STREAK: 3, // Wins against the king to unseat
    HOME_FIELD_BONUS: 0.05, // 5% focus/grit boost
  }
};

/**
 * Calculate the outcome of a provocation.
 */
export function calculateFrictionChange(currentFriction: number, change: number): number {
  return Math.min(RIVALRY_CONSTANTS.FRICTION.MAX, Math.max(RIVALRY_CONSTANTS.FRICTION.MIN, currentFriction + change));
}

/**
 * Determine if a stable is a "Hated Rival" (Trigger for Spoilers).
 */
export function isHatedRival(friction: number): boolean {
  return friction >= 70;
}

/**
 * Determine if a stable is a "Friendly Competitor".
 */
export function isFriendlyCompetitor(friction: number): boolean {
  return friction <= -50;
}
