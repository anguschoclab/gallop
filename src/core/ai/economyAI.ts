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

  // Industry mean earnings influence: higher earnings drive higher yearling prices
  const industryMean = state.industryMeanEarnings ?? 0;
  const earningsImpact = industryMean > 0 ? Math.log10(industryMean + 1) * 0.5 : 0;

  // Yearling price index: driven by NPC cash levels and industry earnings
  // Apply mean reversion toward 100, then adjust based on cash and earnings
  const cashImpact = (avgNpcCash - 100000) * NPC_CASH_IMPACT_FACTOR;
  const reversion = (BASE_YEARLING_INDEX - current.yearlingPriceIndex) * INDEX_MEAN_REVERSION;
  const newIndex = current.yearlingPriceIndex + reversion + cashImpact + earningsImpact;

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

/**
 * Track auction price data for economic signal calculation.
 *
 * Updates the stud fee trend based on auction hammer prices
 * relative to horse ratings. High prices drive stud fee inflation.
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

  // Calculate average price-per-rating-point
  const pricePerRating = auctionResults.map((r) => r.hammerPrice / Math.max(1, r.horseRating));
  const avgPricePerRating = pricePerRating.reduce((sum, p) => sum + p, 0) / pricePerRating.length;

  // Compare to baseline (1000 per rating point = neutral)
  const baseline = 1000;
  const deviation = (avgPricePerRating - baseline) / baseline;
  const trendAdjustment = Math.max(-0.1, Math.min(0.1, deviation * 0.05));

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      studFeeTrend: current.studFeeTrend * 0.9 + trendAdjustment, // Weighted update
    },
  };
}

// ─── Cartel Coordination (Phase 5c) ──────────────────────────────────────────

/**
 * Evaluate whether a cartel opportunity exists for a group of stables.
 *
 * Checks if stables have high mutual trust and complementary personalities
 * to form an economic cartel for market coordination.
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

  // Determine cartel type based on initiator personality
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
 * Returns coordination directives for cartel members:
 * - "avoid_bidding_war": members should not bid against each other in auctions
 * - "rotate_claims": members take turns claiming underpriced horses
 * - "fix_stud_fees": members agree not to undercut stud fees
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

// ─── Dynamic Pricing (Phase 5d) ──────────────────────────────────────────────

/**
 * Calculate dynamic auction reserve price based on market trends.
 *
 * NPC consignments set reserve prices based on market trends,
 * not just horse rating. In a bull market, reserves are higher.
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
 * NPC stables strategically enter horses at claiming prices that reflect
 * market conditions. Low price to attract claims when wanting to sell,
 * high price to deter claims when wanting to keep.
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
    // Price below market to attract claims
    return Math.round(basePrice * 0.8 * marketMultiplier);
  }
  // Price above market to deter claims
  return Math.round(basePrice * 1.3 * marketMultiplier);
}

/**
 * Calculate dynamic stud fee based on progeny performance and market demand.
 *
 * NPC stallion stud fees adjust based on progeny performance, market demand,
 * and cartel agreements.
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
    // Cartel keeps fees high — 20% premium, no market downward adjustment
    return Math.round(baseFee * 1.2);
  }

  const marketAdjustment = calculateStudFeeAdjustment(trend, baseFee);
  const performanceMultiplier = 0.7 + progenyPerformanceScore * 0.6; // 0.7 to 1.3
  return Math.round(marketAdjustment * performanceMultiplier);
}

/**
 * Track breeding volume data for economic signal calculation.
 *
 * Updates the economic state based on the number of new pregnancies
 * and average stud fees paid. High breeding volume signals market confidence.
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

  // High breeding volume with high fees → bullish stud fee trend
  // Low volume or low fees → bearish pressure
  const volumeSignal = Math.min(1, breedingCount / 20); // Normalize: 20+ breedings = max signal
  const feeSignal = Math.min(1, avgFee / 50000); // Normalize: 50k+ avg fee = max signal
  const combinedSignal = (volumeSignal + feeSignal) / 2;

  // Adjust stud fee trend: high activity pushes fees up, low activity pushes down
  const trendAdjustment = (combinedSignal - 0.4) * 0.05; // Range: -0.02 to +0.03

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
 * Updates the yearling price index based on private market purchase prices
 * relative to horse ratings. This complements auction price tracking by
 * capturing off-market transactions.
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

  // Calculate average price-per-rating-point from market purchases
  const avgPricePerRating =
    purchases.reduce((sum, p) => sum + p.price / Math.max(1, p.horseRating), 0) / purchases.length;

  // Normalize: 1000 per rating point = index 100
  const marketIndex = (avgPricePerRating / 1000) * 100;

  // Blend with existing index (weighted moving average)
  const blendedIndex = current.yearlingPriceIndex * 0.9 + marketIndex * 0.1;

  return {
    ...manager,
    globalEconomicState: {
      ...current,
      yearlingPriceIndex: Math.max(50, Math.min(300, blendedIndex)),
    },
  };
}
