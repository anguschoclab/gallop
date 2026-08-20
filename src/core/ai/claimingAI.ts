/**
 * claimingAI.ts - Claiming AI system (re-exports + strategies)
 *
 * This file now re-exports types, state creation, value/risk calculation,
 * and recording functions from dedicated modules for backward compatibility.
 * It retains post-claim planning, defense, and arbitrage strategies.
 */

import type { Horse, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";

// Re-export types, state creation, value/risk, and recording for backward compatibility
export type { ClaimingAIState, ClaimingDecision } from "./claimingAITypes";
export { createClaimingAIState } from "./claimingAITypes";
export { calculateClaimingValue, calculateClaimingRisk } from "./claimingAIValue";
export {
  shouldClaimHorse,
  recordClaimingDecision,
  recordClaimingOutcome,
  getClaimingInsights,
} from "./claimingAIRecording";

// ─── Post-Claim Plan ─────────────────────────────────────────────────────────

export function generatePostClaimPlan(
  horse: Horse,
  claimPrice: number,
  stable: Stable,
): { strategy: "flip" | "develop" | "breed"; targetTag?: number; expectedValue: number } {
  const rating = calculateOverallRating(horse);

  if (rating >= 70 && claimPrice < 50000) {
    return {
      strategy: "flip",
      targetTag: Math.floor(claimPrice * 2.5),
      expectedValue: claimPrice * 2,
    };
  }

  if (horse.age <= 4 && rating >= 55) {
    return {
      strategy: "develop",
      targetTag: Math.floor(claimPrice * 1.5),
      expectedValue: claimPrice * 1.8,
    };
  }

  if ((horse.gender === "mare" || horse.gender === "filly") && horse.age >= 5 && rating >= 60) {
    return {
      strategy: "breed",
      expectedValue: claimPrice * 1.5,
    };
  }

  return {
    strategy: "develop",
    targetTag: claimPrice,
    expectedValue: claimPrice * 1.2,
  };
}

// ─── Claiming Defense ────────────────────────────────────────────────────────

export function shouldDefendFromClaim(
  horse: Horse,
  claimingTag: number,
  stableCash: number,
): boolean {
  const rating = calculateOverallRating(horse);
  const expectedRatingForTag = claimingTag / 1000;

  if (rating > expectedRatingForTag + 20) {
    return true;
  }

  if (rating > expectedRatingForTag + 10 && stableCash > claimingTag * 3) {
    return true;
  }

  return false;
}

// ─── Market Arbitrage ────────────────────────────────────────────────────────

export function detectClaimingArbitrage(
  horses: Horse[],
  claimingTags: Map<string, number>,
): Array<{ horseId: string; rating: number; tag: number; profitPotential: number }> {
  const opportunities: Array<{
    horseId: string;
    rating: number;
    tag: number;
    profitPotential: number;
  }> = [];

  for (const horse of horses) {
    const tag = claimingTags.get(horse.id);
    if (tag === undefined) continue;

    const rating = calculateOverallRating(horse);
    const estimatedValue = rating * 1000;
    const profitPotential = estimatedValue - tag;

    if (profitPotential > tag * 0.2) {
      opportunities.push({ horseId: horse.id, rating, tag, profitPotential });
    }
  }

  opportunities.sort((a, b) => b.profitPotential - a.profitPotential);
  return opportunities;
}
