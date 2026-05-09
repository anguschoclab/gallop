/**
 * Auction AI System
 * Learning from auction outcomes, strategic bidding, portfolio management
 */

import type { Horse, Stable, AuctionLot } from "@/game/types";
import {
  getPersonalityAIState,
  calculateUtilityScore,
} from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";

export interface AuctionAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  biddingHistory: BiddingDecision[];
  consignmentHistory: ConsignmentDecision[];
  portfolio: PortfolioState;
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
 * Create AI state for auction decisions
 */
export function createAuctionAIState(stable: Stable): AuctionAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    biddingHistory: [],
    consignmentHistory: [],
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
 * Calculate bidding value score for a horse
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
  const estimatedValue = horseRating * 1000;
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
 * Evaluate strategic bidding value
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
 * Calculate maximum bid for a horse
 */
export function calculateMaxBid(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
): number {
  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * 1000;

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

  return Math.floor(maxBid);
}

/**
 * Determine if stable should bid on a horse
 */
export function shouldBidOnHorse(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
): boolean {
  // Basic checks
  if (stable.cash < lot.reservePrice) return false;
  const currentBid = lot.hammerPrice || lot.reservePrice;
  if (currentBid > stable.cash) return false;

  // Calculate value and max bid
  const valueScore = calculateBiddingValue(aiState, horse, lot, stable, currentDay);
  const maxBid = calculateMaxBid(aiState, horse, lot, stable, currentDay);

  // Get adaptive threshold (use horse age as context key)
  const contextKey = `${horse.age}`;
  const baseThreshold = 50;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "bidding",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Decision: bid if value exceeds threshold and within budget
  return valueScore > adaptiveThreshold && maxBid >= (lot.hammerPrice || lot.reservePrice);
}

/**
 * Calculate bid increment
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
 * Determine if horse should be consigned
 */
export function shouldConsignHorse(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): {
  shouldConsign: boolean;
  reason?: "underperformer" | "surplus" | "rebalancing" | "retirement";
} {
  // Don't consign young horses
  if (horse.age < 3) return { shouldConsign: false };

  const horseRating = calculateOverallRating(horse);
  const portfolio = aiState.portfolio;

  // Check for underperformance
  if (horseRating < 40 && horse.age > 5) {
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
 * Record bidding decision for learning
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
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update learning state (use horse age as context key)
  const contextKey = `${horse.age}`;
  const value = won ? decision.horseRating - finalBid / 1000 : -finalBid / 1000;
  const newLearningState = recordOutcome(
    aiState.learningState,
    "bidding",
    contextKey,
    won,
    value,
    Date.now(),
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
 * Record consignment decision for learning
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
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

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
 * Get auction insights for a stable
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
  const portfolioHealth = aiState.portfolio.currentHorseCount / (aiState.portfolio.targetHorseCount || 1);

  return {
    totalBids,
    winRate,
    avgValue,
    totalConsignments,
    sellRate,
    portfolioHealth,
  };
}
