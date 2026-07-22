/**
 * facilityBranching.ts - Specialization logic for Imperial Expansion
 */

import type { FacilityBranch, Outpost } from "./outpostTypes";
import type { Horse } from "@/game/types";

export const BRANCH_MODIFIERS = {
  turf: {
    staminaGain: 1.2,
    recoverySpeed: 1.15,
    turfPerformance: 1.05,
    dirtPerformance: 0.95, // Softness penalty
  },
  dirt: {
    speedGain: 1.2,
    gateSkillGain: 1.15,
    dirtPerformance: 1.05,
    turfInjuryRisk: 1.1, // Bone stress
  },
};

/**
 * Apply outpost specialization modifiers to a horse.
 * @param branch - The facility branch type
 * @returns Branch modifiers object or null if branch is neutral
 */
export function getBranchModifiers(branch: FacilityBranch) {
  if (branch === "neutral") return null;
  return BRANCH_MODIFIERS[branch];
}

/**
 * Check if a horse is acclimatized to its current outpost.
 * @param horse - The horse to check
 * @param outposts - Array of outpost objects
 * @returns True if horse is acclimatized or has no outpost
 */
export function isHorseAcclimatized(horse: Horse, outposts: Outpost[]): boolean {
  if (!horse.outpostId) return true;
  const outpost = outposts.find((o) => o.id === horse.outpostId);
  if (!outpost) return true;

  const daysLeft = outpost.acclimatizationDays?.[horse.id] || 0;
  return daysLeft <= 0;
}
