/**
 * economyAIState.ts - Economic state creation, trend updates, and price adjustments
 *
 * Extracted from economyAI.ts for modularity.
 */

import type { GameState } from "@/game/types";
import type { EconomicTrend } from "./strategicCoordinator";

const BASE_YEARLING_INDEX = 100;
const INDEX_MEAN_REVERSION = 0.1;
const STUD_FEE_TREND_DECAY = 0.05;
const NPC_CASH_IMPACT_FACTOR = 0.0001;
const CLAIMING_ACTIVITY_DECAY = 0.1;

export { BASE_YEARLING_INDEX };

/**
 * Create initial economic state with baseline values.
 *
 * @returns EconomicTrend with neutral baseline values
 */
export function createEconomicState(): EconomicTrend {
  return {
    studFeeTrend: 0,
    yearlingPriceIndex: BASE_YEARLING_INDEX,
    claimingMarketActivity: 0,
  };
}

/**
 * Update economic trends based on current game state.
 *
 * @param current - Current economic trends
 * @param state - Current game state
 * @param _day - Current game day (reserved for future use)
 * @returns Updated economic trends
 */
export function updateEconomicTrends(
  current: EconomicTrend,
  state: GameState,
  _day: number,
): EconomicTrend {
  const npcStables = state.npcStables ?? [];
  const totalNpcCash = npcStables.reduce((sum, s) => sum + s.cash, 0);
  const npcCount = npcStables.length;
  const avgNpcCash = npcCount > 0 ? totalNpcCash / npcCount : 100000;

  const industryMean = state.industryMeanEarnings ?? 0;
  const earningsImpact = industryMean > 0 ? Math.log10(industryMean + 1) * 0.5 : 0;

  const cashImpact = (avgNpcCash - 100000) * NPC_CASH_IMPACT_FACTOR;
  const reversion = (BASE_YEARLING_INDEX - current.yearlingPriceIndex) * INDEX_MEAN_REVERSION;
  const newIndex = current.yearlingPriceIndex + reversion + cashImpact + earningsImpact;

  const trendDecay = current.studFeeTrend * (1 - STUD_FEE_TREND_DECAY);
  const priceInfluence = (newIndex - current.yearlingPriceIndex) * 0.01;
  const newStudFeeTrend = trendDecay + priceInfluence;

  const newClaimingActivity = Math.max(
    0,
    current.claimingMarketActivity * (1 - CLAIMING_ACTIVITY_DECAY),
  );

  return {
    studFeeTrend: newStudFeeTrend,
    yearlingPriceIndex: Math.max(50, Math.min(200, newIndex)),
    claimingMarketActivity: newClaimingActivity,
  };
}

/**
 * Calculate stud fee adjustment based on economic trends.
 *
 * @param trend - Current economic trends
 * @param baseFee - Base stud fee
 * @returns Adjusted stud fee
 */
export function calculateStudFeeAdjustment(trend: EconomicTrend, baseFee: number): number {
  const multiplier = 1 + trend.studFeeTrend;
  return Math.round(baseFee * multiplier);
}

/**
 * Calculate yearling price adjustment based on economic trends.
 *
 * @param trend - Current economic trends
 * @param basePrice - Base yearling price
 * @returns Adjusted yearling price
 */
export function calculateYearlingPriceAdjustment(trend: EconomicTrend, basePrice: number): number {
  const multiplier = trend.yearlingPriceIndex / BASE_YEARLING_INDEX;
  return Math.round(basePrice * multiplier);
}

/**
 * Get a high-level economic signal for other AI subsystems.
 *
 * @param trend - Current economic trends
 * @returns "bull" (rising prices), "bear" (falling prices), or "stable"
 */
export function getEconomicSignal(trend: EconomicTrend): "bull" | "bear" | "stable" {
  const indexDeviation = trend.yearlingPriceIndex - BASE_YEARLING_INDEX;
  if (indexDeviation > 10 && trend.studFeeTrend > 0) return "bull";
  if (indexDeviation < -10 && trend.studFeeTrend < 0) return "bear";
  return "stable";
}
