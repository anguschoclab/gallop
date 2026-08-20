/**
 * withdrawalAIValue.ts - Risk and opportunity cost calculation for withdrawal AI
 *
 * Extracted from withdrawalAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import type { WithdrawalAIState } from "./withdrawalAITypes";

export function calculateWithdrawalRisk(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let risk = 0;

  if (horse.healthStatus !== "healthy") {
    risk += 30;
  }

  if (horse.energy < 50) {
    risk += (50 - horse.energy) / 2;
  }

  if (horse.form < 50) {
    risk += (50 - horse.form) / 2;
  }

  if (race.graded?.grade === "G1") risk += 10;
  if (race.graded?.grade === "G2") risk += 5;

  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff > 500) risk += 15;
  if (distDiff > 300) risk += 5;

  if (race.surface && horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"] < 0.9) {
    risk += 10;
  }

  return Math.min(100, risk);
}

export function calculateWithdrawalOpportunityCost(
  aiState: WithdrawalAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  let cost = 0;

  cost += race.entryFee || 0;
  cost += 500;

  const horseRating = calculateOverallRating(horse);
  const expectedPrize = horseRating * 100;
  cost += expectedPrize * 0.1;

  const config = aiState.personalityState;
  if (config.personality === "conservative") {
    cost *= 0.8;
  } else if (config.personality === "aggressive") {
    cost *= 1.2;
  }

  return cost;
}
