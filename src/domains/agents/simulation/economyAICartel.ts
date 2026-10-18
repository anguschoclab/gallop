/**
 * economyAICartel.ts - Cartel coordination and dynamic pricing
 *
 * Extracted from economyAI.ts for modularity.
 */

import type { NpcAIManager } from "./npcCycleAI";
import type { EconomicTrend } from "./strategicCoordinator";
import { BASE_YEARLING_INDEX, calculateStudFeeAdjustment } from "./economyAIState";

/**
 * Evaluate whether a cartel opportunity exists for a group of stables.
 *
 * @param manager - Current NPC AI manager
 * @param initiatorId - Stable ID of the cartel initiator
 * @param candidateIds - Other stable IDs to evaluate
 * @returns Cartel formation info if viable, null otherwise
 */
export function evaluateCartelOpportunity(
  manager: NpcAIManager,
  initiatorId: string,
  candidateIds: string[],
): { memberIds: string[]; type: "breeding" | "claiming" | "auction" } | null {
  if (candidateIds.length === 0) return null;

  const initiatorState = manager.stableStates[initiatorId];
  if (!initiatorState?.npcRelationships) return null;

  const viableMembers: string[] = [initiatorId];
  let totalTrust = 0;
  let trustCount = 0;

  for (const candidateId of candidateIds) {
    const rel = initiatorState.npcRelationships[candidateId];
    if (!rel) continue;
    if (rel.trust >= 60) {
      viableMembers.push(candidateId);
      totalTrust += rel.trust;
      trustCount++;
    }
  }

  if (viableMembers.length < 2) return null;

  const avgTrust = totalTrust / trustCount;
  if (avgTrust < 65) return null;

  const personality = initiatorState.personalityState.personality;
  let type: "breeding" | "claiming" | "auction" = "auction";
  if (personality === "breeder" || personality === "developer") {
    type = "breeding";
  } else if (personality === "trader") {
    type = "claiming";
  }

  return { memberIds: viableMembers, type };
}

/**
 * Coordinate a cartel market action among member stables.
 *
 * @param memberIds - Stable IDs in the cartel
 * @param action - The coordinated market action
 * @param currentDay - Current game day
 * @returns Coordination directives per stable
 */
export function coordinateCartelAction(
  memberIds: string[],
  action: "avoid_bidding_war" | "rotate_claims" | "fix_stud_fees",
  currentDay: number,
): Record<string, { action: string; day: number; rotationIndex?: number }> {
  const directives: Record<string, { action: string; day: number; rotationIndex?: number }> = {};

  for (let i = 0; i < memberIds.length; i++) {
    directives[memberIds[i]] = {
      action,
      day: currentDay,
      rotationIndex: action === "rotate_claims" ? i : undefined,
    };
  }

  return directives;
}

/**
 * Calculate dynamic auction reserve price based on market trends.
 *
 * @param trend - Current economic trends
 * @param baseReserve - Base reserve price from horse rating
 * @returns Adjusted reserve price
 */
export function calculateAuctionReservePrice(trend: EconomicTrend, baseReserve: number): number {
  const marketMultiplier = trend.yearlingPriceIndex / BASE_YEARLING_INDEX;
  const bullPremium = trend.studFeeTrend > 0.05 ? 1.1 : 1.0;
  const bearDiscount = trend.studFeeTrend < -0.05 ? 0.9 : 1.0;
  const adjusted = baseReserve * marketMultiplier * bullPremium * bearDiscount;
  return Math.round(Math.max(baseReserve * 0.5, adjusted));
}

/**
 * Calculate strategic claiming price for an NPC horse entry.
 *
 * @param trend - Current economic trends
 * @param horseRating - Overall rating of the horse
 * @param wantsToSell - Whether the stable wants to sell the horse
 * @returns Strategic claiming price
 */
export function calculateStrategicClaimingPrice(
  trend: EconomicTrend,
  horseRating: number,
  wantsToSell: boolean,
): number {
  const basePrice = horseRating * 1000;
  const marketMultiplier = 1 + trend.claimingMarketActivity * 0.3;

  if (wantsToSell) {
    return Math.round(basePrice * 0.8 * marketMultiplier);
  }
  return Math.round(basePrice * 1.3 * marketMultiplier);
}

/**
 * Calculate dynamic stud fee based on progeny performance and market demand.
 *
 * @param trend - Current economic trends
 * @param baseFee - Base stud fee
 * @param progenyPerformanceScore - 0-1 score based on recent progeny results
 * @param cartelFixed - Whether a cartel is fixing fees (overrides market adjustment)
 * @returns Adjusted stud fee
 */
export function calculateDynamicStudFee(
  trend: EconomicTrend,
  baseFee: number,
  progenyPerformanceScore: number,
  cartelFixed: boolean,
): number {
  if (cartelFixed) {
    return Math.round(baseFee * 1.2);
  }

  const marketAdjustment = calculateStudFeeAdjustment(trend, baseFee);
  const performanceMultiplier = 0.7 + progenyPerformanceScore * 0.6;
  return Math.round(marketAdjustment * performanceMultiplier);
}
