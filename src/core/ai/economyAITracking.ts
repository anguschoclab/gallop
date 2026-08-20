/**
 * economyAITracking.ts - Economic cycle processing and activity tracking
 *
 * Extracted from economyAI.ts for modularity.
 */

import type { GameState } from "@/game/types";
import type { NpcAIManager } from "./npcCycleAI";
import type { EconomicTrend } from "./strategicCoordinator";
import { createEconomicState, updateEconomicTrends } from "./economyAIState";

/**
 * Process the economic cycle, updating the global economic state on the manager.
 *
 * @param manager - Current NPC AI manager
 * @param state - Current game state
 * @param day - Current game day
 * @returns Updated manager with new globalEconomicState
 */
export function processEconomicCycle(
  manager: NpcAIManager,
  state: GameState,
  day: number,
): NpcAIManager {
  const current = manager.globalEconomicState ?? createEconomicState();
  const updated = updateEconomicTrends(current, state, day);

  const history = [...(manager.economicHistory ?? []), updated];
  const prunedHistory = history.length > 365 ? history.slice(-365) : history;

  return {
    ...manager,
    globalEconomicState: updated,
    economicHistory: prunedHistory,
  };
}

/**
 * Track claiming activity from resolved claims.
 *
 * @param manager - Current NPC AI manager
 * @param claimCount - Number of claims resolved today
 * @returns Updated manager with adjusted claiming market activity
 */
export function trackClaimingActivity(manager: NpcAIManager, claimCount: number): NpcAIManager {
  if (claimCount <= 0) return manager;

  const current = manager.globalEconomicState ?? createEconomicState();
  const activityBoost = Math.min(0.5, claimCount * 0.1);

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      claimingMarketActivity: Math.min(1, current.claimingMarketActivity + activityBoost),
    },
  };
}

/**
 * Track auction price data for economic signal calculation.
 *
 * @param manager - Current NPC AI manager
 * @param auctionResults - Array of hammer prices and horse ratings
 * @returns Updated manager with adjusted stud fee trend
 */
export function trackAuctionPrices(
  manager: NpcAIManager,
  auctionResults: Array<{ hammerPrice: number; horseRating: number }>,
): NpcAIManager {
  if (auctionResults.length === 0) return manager;

  const current = manager.globalEconomicState ?? createEconomicState();

  const pricePerRating = auctionResults.map((r) => r.hammerPrice / Math.max(1, r.horseRating));
  const avgPricePerRating = pricePerRating.reduce((sum, p) => sum + p, 0) / pricePerRating.length;

  const baseline = 1000;
  const deviation = (avgPricePerRating - baseline) / baseline;
  const trendAdjustment = Math.max(-0.1, Math.min(0.1, deviation * 0.05));

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      studFeeTrend: current.studFeeTrend * 0.9 + trendAdjustment,
    },
  };
}

/**
 * Track breeding volume data for economic signal calculation.
 *
 * @param manager - Current NPC AI manager
 * @param breedingCount - Number of new breedings this cycle
 * @param totalStudFeesPaid - Total stud fees paid this cycle
 * @returns Updated manager with adjusted economic state
 */
export function trackBreedingVolume(
  manager: NpcAIManager,
  breedingCount: number,
  totalStudFeesPaid: number,
): NpcAIManager {
  if (breedingCount === 0) return manager;

  const current = manager.globalEconomicState ?? createEconomicState();
  const avgFee = totalStudFeesPaid / breedingCount;

  const volumeSignal = Math.min(1, breedingCount / 20);
  const feeSignal = Math.min(1, avgFee / 50000);
  const combinedSignal = (volumeSignal + feeSignal) / 2;

  const trendAdjustment = (combinedSignal - 0.4) * 0.05;

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      studFeeTrend: Math.max(-0.5, Math.min(0.5, current.studFeeTrend * 0.95 + trendAdjustment)),
    },
  };
}

/**
 * Track private market sale prices for economic signal calculation.
 *
 * @param manager - Current NPC AI manager
 * @param purchases - Array of purchase prices and horse ratings
 * @returns Updated manager with adjusted yearling price index
 */
export function trackMarketPrices(
  manager: NpcAIManager,
  purchases: Array<{ price: number; horseRating: number }>,
): NpcAIManager {
  if (purchases.length === 0) return manager;

  const current = manager.globalEconomicState ?? createEconomicState();

  const avgPricePerRating =
    purchases.reduce((sum, p) => sum + p.price / Math.max(1, p.horseRating), 0) / purchases.length;

  const marketIndex = (avgPricePerRating / 1000) * 100;

  const blendedIndex = current.yearlingPriceIndex * 0.9 + marketIndex * 0.1;

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      yearlingPriceIndex: Math.max(50, Math.min(300, blendedIndex)),
    },
  };
}
