/**
 * auctionAI.ts - Auction AI system
 *
 * This file provides learning from auction outcomes, strategic bidding,
 * and portfolio management for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Stable, AuctionLot), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating)
 * Related files: npcCycleAI.ts (uses auction AI), personalitySystem.ts (provides personality state)
 */

/**
 * Auction AI System
 * Learning from auction outcomes, strategic bidding, portfolio management
 */

import type { Horse, Race, Stable, AuctionLot } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import { createLearningState, recordOutcome as recordLearningOutcome } from "./learningModule";
import { getSuccessRate, getAdaptiveThreshold, type LearningState } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { EconomicTrend } from "./strategicCoordinator";
import type { NpcRelationship } from "./npcCycleAI";
import {
  CONSIGN_UNDERPERFORMER_RATING_THRESHOLD,
  CONSIGN_UNDERPERFORMER_AGE_THRESHOLD,
  CONSIGN_RATING_RELAXATION_PER_WEIGHT,
  CONSIGN_AGE_RELAXATION_PER_WEIGHT,
  BID_BASE_THRESHOLD,
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "./subsystemWeightConstants";

export interface AuctionAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  biddingHistory: BiddingDecision[];
  consignmentHistory: ConsignmentDecision[];
  portfolio: PortfolioState;
  recentHammerPrices: number[];
}

export interface BiddingDecision {
  lotId: string;
  horseId: string;
  horseRating: number;
  maxBid: number;
  finalBid: number;
  won: boolean;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  value?: number;
}

export interface ConsignmentDecision {
  horseId: string;
  horseRating: number;
  reason: "underperformer" | "surplus" | "rebalancing" | "retirement";
  minPrice: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  sold?: boolean;
  salePrice?: number;
}

export interface PortfolioState {
  targetHorseCount: number;
  currentHorseCount: number;
  budgetRemaining: number;
  ageDistribution: Record<number, number>;
  qualityTarget: number;
}

/**
 * Create AI state for auction decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * bidding history, consignment history, and portfolio state.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized auction AI state
 */
export function createAuctionAIState(stable: Stable): AuctionAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    biddingHistory: [],
    consignmentHistory: [],
    recentHammerPrices: [],
    portfolio: {
      targetHorseCount: stable.personality === "prestige" ? 15 : 10,
      currentHorseCount: 0,
      budgetRemaining: stable.cash,
      ageDistribution: {},
      qualityTarget: 60,
    },
  };
}

/**
 * Calculate bidding value score for a horse.
 *
 * Evaluates the horse's value relative to current bid, applies personality
 * modifiers, learning-based adjustments, and strategic considerations.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse to evaluate
 * @param lot - The auction lot
 * @param stable - The stable making the bid
 * @param currentDay - Current game day
 * @returns Bidding value score (0-100)
 */
export function calculateBiddingValue(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
): number {
  let score = 0;

  // Base value from horse rating vs current bid
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;
  const currentBid = lot.hammerPrice || lot.reservePrice;
  const valueRatio = estimatedValue / (currentBid || 1);

  // Higher score for undervalued horses
  score += Math.max(0, (valueRatio - 1) * 30);

  // Personality modifiers
  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_rating: horseRating,
    current_bid: currentBid,
  };

  score = calculateUtilityScore(aiState.personalityState, "bidding", factors);

  // Learning-based adjustment (use horse age as context key)
  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "bidding", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  // Strategic considerations with 90-day horizon
  const strategicValue = evaluateStrategicBiddingValue(aiState, horse, stable, currentDay);
  score += strategicValue;

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate strategic bidding value.
 *
 * Calculates strategic value based on portfolio fit, age distribution fit,
 * and quality fit. Returns bonus points for horses that fill gaps in the stable's portfolio.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse to evaluate
 * @param stable - The stable making the bid
 * @param currentDay - Current game day
 * @returns Strategic value bonus (0-25)
 */
function evaluateStrategicBiddingValue(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): number {
  let strategicValue = 0;

  // Portfolio fit
  const portfolio = aiState.portfolio;
  if (portfolio.currentHorseCount < portfolio.targetHorseCount) {
    strategicValue += 10; // Need more horses
  }

  // Age distribution fit
  const ageCount = portfolio.ageDistribution[horse.age] || 0;
  if (ageCount < 3) {
    strategicValue += 5; // Need horses of this age
  }

  // Quality fit
  const horseRating = calculateOverallRating(horse);
  if (horseRating >= portfolio.qualityTarget) {
    strategicValue += 10; // High-quality horse
  }

  return strategicValue;
}

/**
 * Calculate the maximum bid an NPC stable will place on a horse.
 *
 * Determines the maximum bid based on estimated value, personality risk
 * tolerance, budget constraints, and learning-based adjustments.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse to bid on
 * @param lot - The auction lot
 * @param stable - The stable making the bid
 * @param currentDay - Current game day
 * @param friction - Friction value with player (optional, for rivalry behavior)
 * @returns Maximum bid amount
 */
export function calculateMaxBid(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
  friction?: number,
): number {
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;

  // Base max bid is estimated value
  let maxBid = estimatedValue;

  // Personality-based risk tolerance
  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 1.2 : 0.8;
  maxBid *= riskTolerance;

  // Budget constraint
  const budgetShare = aiState.portfolio.budgetRemaining * 0.3; // Max 30% of budget per horse
  maxBid = Math.min(maxBid, budgetShare);

  // Learning-based adjustment (use horse age as context key)
  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "bidding", contextKey);
  if (successRate < 0.4) {
    maxBid *= 0.8; // Reduce bid if success rate is low
  }

  // Apply friction multiplier if bidding on player-owned horse with high friction
  if (horse.owned && friction && friction >= 50) {
    const frictionMultiplier = 1 + (friction - 50) / 200; // max +0.25x at friction=100
    maxBid *= frictionMultiplier;
  }

  return Math.floor(maxBid);
}

/**
 * Determine if stable should bid on a horse.
 *
 * Checks budget constraints, calculates value score and max bid,
 * and uses adaptive threshold for decision making.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse to bid on
 * @param lot - The auction lot
 * @param stable - The stable making the bid
 * @param currentDay - Current game day
 * @param weight - Subsystem weight that modulates bidding willingness (default 1.0)
 * @returns True if stable should bid
 */
export function shouldBidOnHorse(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  // Weight ≤ 0 → never bid
  if (weight <= 0) return false;

  // Basic checks
  if (stable.cash < lot.reservePrice) return false;
  const currentBid = lot.hammerPrice || lot.reservePrice;
  if (currentBid > stable.cash) return false;

  // Calculate value and max bid
  const valueScore = calculateBiddingValue(aiState, horse, lot, stable, currentDay);
  const maxBid = calculateMaxBid(aiState, horse, lot, stable, currentDay);

  // Get adaptive threshold (use horse age as context key)
  const contextKey = `${horse.age}`;
  const baseThreshold = BID_BASE_THRESHOLD;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "bidding",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Weight modulates threshold: higher weight → lower threshold → more likely to bid
  const effectiveThreshold = adaptiveThreshold / weight;

  // Decision: bid if value exceeds threshold and within budget
  return valueScore > effectiveThreshold && maxBid >= (lot.hammerPrice || lot.reservePrice);
}

/**
 * Calculate bid increment.
 *
 * Determines how much to increase the bid based on current bid,
 * max bid, and aggressiveness factor.
 *
 * @param currentBid - Current bid amount
 * @param maxBid - Maximum bid allowed
 * @param aggressiveness - Aggressiveness factor (0-1)
 * @returns Bid increment amount
 */
export function calculateBidIncrement(
  currentBid: number,
  maxBid: number,
  aggressiveness: number,
): number {
  const remaining = maxBid - currentBid;
  const baseIncrement = Math.max(100, currentBid * 0.05);
  const aggressiveIncrement = baseIncrement * (1 + aggressiveness);
  return Math.min(aggressiveIncrement, remaining);
}

/**
 * Determine if horse should be consigned.
 *
 * Evaluates horse for consignment based on underperformance, surplus,
 * age rebalancing, or retirement criteria.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse to evaluate
 * @param stable - The stable owning the horse
 * @param currentDay - Current game day
 * @param weight - Subsystem weight that modulates consignment willingness (default 1.0)
 * @returns Object with shouldConsign flag and optional reason
 */
export function shouldConsignHorse(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): {
  shouldConsign: boolean;
  reason?: "underperformer" | "surplus" | "rebalancing" | "retirement";
} {
  // Weight ≤ 0 → never consign
  if (weight <= 0) return { shouldConsign: false };

  // Don't consign young horses
  if (horse.age < 3) return { shouldConsign: false };

  const horseRating = calculateOverallRating(horse);
  const portfolio = aiState.portfolio;

  // Weight-modulated thresholds: higher weight relaxes criteria
  const ratingThreshold =
    CONSIGN_UNDERPERFORMER_RATING_THRESHOLD + (weight - 1) * CONSIGN_RATING_RELAXATION_PER_WEIGHT;
  const ageThreshold =
    CONSIGN_UNDERPERFORMER_AGE_THRESHOLD - (weight - 1) * CONSIGN_AGE_RELAXATION_PER_WEIGHT;

  // Check for underperformance
  if (horseRating < ratingThreshold && horse.age > ageThreshold) {
    return { shouldConsign: true, reason: "underperformer" };
  }

  // Check for surplus
  if (portfolio.currentHorseCount > portfolio.targetHorseCount + 2) {
    return { shouldConsign: true, reason: "surplus" };
  }

  // Check for age rebalancing
  const ageCount = portfolio.ageDistribution[horse.age] || 0;
  if (ageCount > 4 && horse.age > 6) {
    return { shouldConsign: true, reason: "rebalancing" };
  }

  // Check for retirement
  if (horse.age >= 10 && horseRating < 50) {
    return { shouldConsign: true, reason: "retirement" };
  }

  return { shouldConsign: false };
}

/**
 * Record bidding decision for learning.
 *
 * Records the bidding decision, updates learning state, and adjusts
 * portfolio if the bid was won.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse bid on
 * @param lot - The auction lot
 * @param stable - The stable making the bid
 * @param maxBid - Maximum bid amount
 * @param finalBid - Final bid amount
 * @param won - Whether the bid was won
 * @param currentDay - Current game day
 * @returns Updated auction AI state
 */
export function recordBiddingDecision(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  maxBid: number,
  finalBid: number,
  won: boolean,
  currentDay: number,
): AuctionAIState {
  const decision: BiddingDecision = {
    lotId: lot.id,
    horseId: horse.id,
    horseRating: calculateOverallRating(horse),
    maxBid,
    finalBid,
    won,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.biddingHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update learning state (use horse age as context key)
  const contextKey = `${horse.age}`;
  const value = won ? decision.horseRating - finalBid / 1000 : -finalBid / 1000;
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "auction",
    `${horse.id}:${lot.id}`,
    won,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  // Update portfolio if won
  const newPortfolio = { ...aiState.portfolio };
  if (won) {
    newPortfolio.currentHorseCount++;
    newPortfolio.budgetRemaining -= finalBid;
    newPortfolio.ageDistribution = {
      ...newPortfolio.ageDistribution,
      [horse.age]: (newPortfolio.ageDistribution[horse.age] || 0) + 1,
    };
  }

  return {
    ...aiState,
    biddingHistory: trimmedHistory,
    learningState: newLearningState,
    portfolio: newPortfolio,
  };
}

/**
 * Record consignment decision for learning.
 *
 * Records the consignment decision and updates portfolio state.
 *
 * @param aiState - Current auction AI state
 * @param horse - The horse being consigned
 * @param reason - Reason for consignment
 * @param minPrice - Minimum price for consignment
 * @param stable - The stable consigning the horse
 * @param currentDay - Current game day
 * @returns Updated auction AI state
 */
export function recordConsignmentDecision(
  aiState: AuctionAIState,
  horse: Horse,
  reason: "underperformer" | "surplus" | "rebalancing" | "retirement",
  minPrice: number,
  stable: Stable,
  currentDay: number,
): AuctionAIState {
  const decision: ConsignmentDecision = {
    horseId: horse.id,
    horseRating: calculateOverallRating(horse),
    reason,
    minPrice,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.consignmentHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update portfolio
  const newPortfolio = {
    ...aiState.portfolio,
    currentHorseCount: Math.max(0, aiState.portfolio.currentHorseCount - 1),
    ageDistribution: {
      ...aiState.portfolio.ageDistribution,
      [horse.age]: Math.max(0, (aiState.portfolio.ageDistribution[horse.age] || 0) - 1),
    },
  };

  return {
    ...aiState,
    consignmentHistory: trimmedHistory,
    portfolio: newPortfolio,
  };
}

/**
 * Get auction insights for a stable.
 *
 * Calculates bidding statistics, consignment statistics, and
 * portfolio health metrics for a stable.
 *
 * @param aiState - Current auction AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with bidding, consignment, and portfolio metrics
 */
export function getAuctionInsights(
  aiState: AuctionAIState,
  stableId: string,
): {
  totalBids: number;
  winRate: number;
  avgValue: number;
  totalConsignments: number;
  sellRate: number;
  portfolioHealth: number;
} {
  const stableBiddingHistory = aiState.biddingHistory.filter((d) => d.stableId === stableId);
  const totalBids = stableBiddingHistory.length;
  const wins = stableBiddingHistory.filter((d) => d.won).length;
  const winRate = totalBids > 0 ? wins / totalBids : 0.5;
  const avgValue =
    totalBids > 0
      ? stableBiddingHistory.reduce((sum, d) => sum + (d.value || 0), 0) / totalBids
      : 0;

  const stableConsignmentHistory = aiState.consignmentHistory.filter(
    (d) => d.stableId === stableId,
  );
  const totalConsignments = stableConsignmentHistory.length;
  const sold = stableConsignmentHistory.filter((d) => d.sold).length;
  const sellRate = totalConsignments > 0 ? sold / totalConsignments : 0.5;

  // Portfolio health: ratio of current to target horses
  const portfolioHealth =
    aiState.portfolio.currentHorseCount / (aiState.portfolio.targetHorseCount || 1);

  return {
    totalBids,
    winRate,
    avgValue,
    totalConsignments,
    sellRate,
    portfolioHealth,
  };
}

// ─── Market Trend Awareness ──────────────────────────────────────────────────

/**
 * Calculate a market trend multiplier for bidding decisions.
 *
 * Uses the global economic trend to adjust bidding thresholds:
 * - Bull market (high yearlingPriceIndex): raise max bids, as future resale value is higher
 * - Bear market (low yearlingPriceIndex): lower max bids, as market is cooling
 *
 * @param trend - Current global economic trend
 * @returns Multiplier to apply to max bid (e.g., 1.1 in bull market, 0.9 in bear)
 */
export function getMarketTrendMultiplier(trend: EconomicTrend): number {
  const indexDeviation = (trend.yearlingPriceIndex - 100) / 100;
  // Clamp to ±20% adjustment
  const multiplier = 1 + Math.max(-0.2, Math.min(0.2, indexDeviation));
  return multiplier;
}

/**
 * Calculate the average recent hammer price from tracked auction history.
 *
 * @param aiState - Current auction AI state
 * @returns Average hammer price, or 0 if no history
 */
export function getAverageRecentHammerPrice(aiState: AuctionAIState): number {
  if (aiState.recentHammerPrices.length === 0) return 0;
  return (
    aiState.recentHammerPrices.reduce((sum, p) => sum + p, 0) / aiState.recentHammerPrices.length
  );
}

/**
 * Record a hammer price for market trend tracking.
 *
 * @param aiState - Current auction AI state
 * @param hammerPrice - The final sale price
 * @returns Updated AI state with tracked hammer price (keeps last 20)
 */
export function recordHammerPrice(aiState: AuctionAIState, hammerPrice: number): AuctionAIState {
  const updated = [...aiState.recentHammerPrices, hammerPrice];
  // Keep last 20 prices
  const trimmed = updated.length > 20 ? updated.slice(-20) : updated;
  return { ...aiState, recentHammerPrices: trimmed };
}

// ─── Coalition Bidding ───────────────────────────────────────────────────────

/**
 * Determine if a stable should yield to an allied stable in a coalition bidding scenario.
 *
 * When multiple NPC stables in an economic cartel or racing coalition want the same horse,
 * they should coordinate to avoid driving prices up. The stable with the higher need
 * (lower portfolio count or higher quality target alignment) gets priority.
 *
 * @param myStable - The stable considering bidding
 * @param myAiState - The stable's auction AI state
 * @param allyStableId - ID of the allied stable also interested
 * @param allyRelationship - Relationship with the ally
 * @param allyPortfolioCount - Ally's current horse count
 * @param allyTargetCount - Ally's target horse count
 * @returns True if this stable should yield (not bid) to the ally
 */
export function shouldYieldToAlly(
  myStable: Stable,
  myAiState: AuctionAIState,
  allyStableId: string,
  allyRelationship: NpcRelationship,
  allyPortfolioCount: number,
  allyTargetCount: number,
): boolean {
  // Only yield to allies in economic alliances
  if (
    allyRelationship.allianceType !== "racing_coalition" &&
    allyRelationship.allianceType !== "breeding_partnership"
  ) {
    return false;
  }

  // Low trust = no cooperation
  if (allyRelationship.trust < 30) return false;

  const myCount = myAiState.portfolio.currentHorseCount;
  const myTarget = myAiState.portfolio.targetHorseCount;

  // If I'm well-stocked and ally needs horses more, yield
  const myNeed = Math.max(0, myTarget - myCount);
  const allyNeed = Math.max(0, allyTargetCount - allyPortfolioCount);

  // Ally needs more horses than I do
  if (allyNeed > myNeed) return true;

  // Equal need: higher-rated stable (prestige > aggressive > others) gets priority
  if (allyNeed === myNeed && myStable.personality !== "prestige") {
    return true;
  }

  return false;
}

// ─── Consignment Timing ──────────────────────────────────────────────────────

/**
 * Evaluate whether the current auction catalog is a good time to consign a horse.
 *
 * Avoid consigning a mid-quality horse into a sale full of high-quality prospects,
 * as it will get overshadowed and fetch a lower price. Conversely, consigning
 * a high-quality horse into a weak sale can maximize visibility and price.
 *
 * @param horse - The horse being considered for consignment
 * @param catalogHorseRatings - Array of ratings of other horses in the catalog
 * @returns Object with shouldConsign flag and expected price modifier
 */
export function evaluateConsignmentTiming(
  horse: Horse,
  catalogHorseRatings: number[],
): { shouldConsign: boolean; priceModifier: number } {
  const horseRating = calculateOverallRating(horse);

  if (catalogHorseRatings.length === 0) {
    // Empty catalog — good time to consign, less competition
    return { shouldConsign: true, priceModifier: 1.1 };
  }

  const catalogAvg =
    catalogHorseRatings.reduce((sum, r) => sum + r, 0) / catalogHorseRatings.length;
  const ratingDiff = horseRating - catalogAvg;

  // Consigning a strong horse into a weak catalog: price boost
  if (ratingDiff > 15) {
    return { shouldConsign: true, priceModifier: 1.15 };
  }

  // Consigning a weak horse into a strong catalog: price penalty
  if (ratingDiff < -15) {
    return { shouldConsign: false, priceModifier: 0.85 };
  }

  // Neutral: horse fits the catalog
  return { shouldConsign: true, priceModifier: 1.0 };
}

// ─── Post-Purchase Integration ───────────────────────────────────────────────

/**
 * Generate a post-purchase plan for a horse won at auction.
 *
 * After winning a bid, the stable should immediately plan:
 * - Initial training focus based on horse's current stats and aptitudes
 * - Target race class based on rating
 * - Development timeline based on age
 *
 * @param horse - The horse purchased at auction
 * @param stable - The stable that purchased the horse
 * @returns Post-purchase plan with training focus, target class, and timeline
 */
export function generatePostPurchasePlan(
  horse: Horse,
  stable: Stable,
): {
  trainingFocus: "speed" | "stamina" | "acceleration" | "maintenance";
  targetRaceClass: "maidens" | "allowance" | "listed" | "graded";
  developmentDays: number;
  rationale: string;
} {
  const rating = calculateOverallRating(horse);

  // Determine training focus based on weakest stat area
  const { speed, stamina, acceleration } = horse.stats;
  const minStat = Math.min(speed, stamina, acceleration);
  let trainingFocus: "speed" | "stamina" | "acceleration" | "maintenance";

  if (minStat === speed) {
    trainingFocus = "speed";
  } else if (minStat === stamina) {
    trainingFocus = "stamina";
  } else {
    trainingFocus = "acceleration";
  }

  // Maintenance focus for older horses
  if (horse.age >= 6) {
    trainingFocus = "maintenance";
  }

  // Determine target race class based on rating
  let targetRaceClass: "maidens" | "allowance" | "listed" | "graded";
  if (rating < 50) {
    targetRaceClass = "maidens";
  } else if (rating < 65) {
    targetRaceClass = "allowance";
  } else if (rating < 80) {
    targetRaceClass = "listed";
  } else {
    targetRaceClass = "graded";
  }

  // Development timeline based on age
  const developmentDays = horse.age <= 2 ? 180 : horse.age <= 4 ? 90 : 45;

  // Build rationale
  const rationale = `Rating ${rating.toFixed(0)} → ${targetRaceClass} target. ${trainingFocus} focus needed (lowest stat: ${minStat}). ${horse.age}yo → ${developmentDays}d development window.`;

  return {
    trainingFocus,
    targetRaceClass,
    developmentDays,
    rationale,
  };
}
