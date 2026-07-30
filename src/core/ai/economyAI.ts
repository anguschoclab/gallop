/**
 * economyAI.ts - Global economic state management for NPC AI
 *
 * Tracks and manages economic trends including stud fees, yearling prices,
 * and claiming market activity. Provides economic signals to other AI subsystems.
 *
 * Dependencies: @/game/types (GameState, Stable), ./npcCycleAI (NpcAIManager), ./strategicCoordinator (EconomicTrend)
 * Related files: strategicCoordinator.ts (uses economic trends in world assessment), npcCycle.ts (calls processEconomicCycle)
 */

import type { GameState, Stable } from "@/game/types";
import type { NpcAIManager } from "./npcCycleAI";
import type { EconomicTrend } from "./strategicCoordinator";

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_YEARLING_INDEX = 100;
const INDEX_MEAN_REVERSION = 0.1; // How fast index reverts to 100
const STUD_FEE_TREND_DECAY = 0.05; // How fast stud fee trend decays to 0
const NPC_CASH_IMPACT_FACTOR = 0.0001; // How much NPC cash affects price index
const CLAIMING_ACTIVITY_DECAY = 0.1;

// ─── Economic State Management ───────────────────────────────────────────────

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

// ─── Trend Updates ───────────────────────────────────────────────────────────

/**
 * Update economic trends based on current game state.
 *
 * Analyzes NPC cash levels, breeding activity, and claiming activity
 * to evolve the economic trends over time.
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

  // Yearling price index: driven by NPC cash levels (more cash = higher prices)
  // Apply mean reversion toward 100, then adjust based on cash
  const cashImpact = (avgNpcCash - 100000) * NPC_CASH_IMPACT_FACTOR;
  const reversion = (BASE_YEARLING_INDEX - current.yearlingPriceIndex) * INDEX_MEAN_REVERSION;
  const newIndex = current.yearlingPriceIndex + reversion + cashImpact;

  // Stud fee trend: decays toward 0, influenced by yearling price movement
  const trendDecay = current.studFeeTrend * (1 - STUD_FEE_TREND_DECAY);
  const priceInfluence = (newIndex - current.yearlingPriceIndex) * 0.01;
  const newStudFeeTrend = trendDecay + priceInfluence;

  // Claiming market activity: decays over time
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

// ─── Price Adjustments ───────────────────────────────────────────────────────

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

// ─── Economic Signals ────────────────────────────────────────────────────────

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

// ─── Economic Cycle Processing ───────────────────────────────────────────────

/**
 * Process the economic cycle, updating the global economic state on the manager.
 *
 * Called once per NPC cycle to evolve economic trends.
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

  return {
    ...manager,
    globalEconomicState: updated,
  };
}

/**
 * Track claiming activity from resolved claims.
 * Increases the claimingMarketActivity counter when claims occur.
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
