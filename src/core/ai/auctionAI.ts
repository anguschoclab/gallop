/**
 * Auction AI System
 * Multi-factor lot valuation, bidding strategies, personality integration
 */

import type { Horse, Stable, AuctionLot } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
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
  valuationHistory: ValuationDecision[];
  ageDistribution: Record<number, number>;
}

export interface ValuationDecision {
  horseId: string;
  lotId: string;
  valuation: number;
  finalPrice: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean; // True if we won the lot
  value?: number; // Net value (valuation - price)
}

/**
 * Create AI state for auction decisions
 */
export function createAuctionAIState(stable: Stable): AuctionAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    valuationHistory: [],
    ageDistribution: {},
  };
}

/**
 * Calculate lot valuation score for a stable
 */
export function calculateLotValuation(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
): number {
  let valuation = 0;

  // Base valuation from horse rating
  const horseRating = calculateOverallRating(horse);
  valuation = horseRating * 1200; // Base: $1.2k per rating point

  // Age-based premium
  const ageFactor = horse.age === 1 ? 1.5 : horse.age === 2 ? 1.3 : 1.0;
  valuation *= ageFactor;

  // Pedigree premium (if yearling)
  if (horse.age === 1 && horse.pedigree) {
    // Check for high-quality parents
    // (simplified for now)
    valuation *= 1.2;
  }

  // Personality modifiers
  const factors: Record<string, number> = {
    horse_rating: horseRating,
    horse_age: horse.age,
    stable_cash: stable.cash,
    reserve_price: lot.reservePrice || 0,
  };

  const utilityScore = calculateUtilityScore(aiState.personalityState, "auction_valuation", factors);
  valuation *= (utilityScore / 50); // Scale valuation by utility

  // Learning-based adjustment
  const contextKey = `${horse.age}:${horseRating > 70 ? "high" : "low"}`;
  const successRate = getSuccessRate(aiState.learningState, "auction_valuation", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 0.2;
  valuation *= (1 + adaptiveBonus);

  return Math.floor(valuation);
}

/**
 * Determine bidding strategy for a lot
 */
export function determineBiddingStrategy(
  aiState: AuctionAIState,
  lot: AuctionLot,
  stable: Stable,
): {
  maxBid: number;
  incrementType: "standard" | "aggressive" | "snipe";
} {
  const horse = {} as any; // (In a real system, we'd have the horse data here)
  const valuation = calculateLotValuation(aiState, horse, lot, stable);
  
  // Max bid is usually 110% of valuation for aggressive, 90% for conservative
  const personality = aiState.personalityState.personality;
  let maxBid = valuation;

  if (personality === "aggressive") maxBid *= 1.15;
  if (personality === "conservative") maxBid *= 0.85;
  if (personality === "win-now") maxBid *= 1.1;

  // Cap at 15% of total cash
  maxBid = Math.min(maxBid, stable.cash * 0.15);

  let incrementType: "standard" | "aggressive" | "snipe" = "standard";
  if (personality === "aggressive") incrementType = "aggressive";
  if (personality === "prestige") incrementType = "snipe";

  return { maxBid, incrementType };
}

/**
 * Determine if stable should consign a horse to auction
 */
export function shouldConsignHorse(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): {
  shouldConsign: boolean;
  reservePrice: number;
  suggestedSale?: string;
} {
  const rating = calculateOverallRating(horse);
  
  // NPC Consignment logic
  let shouldConsign = false;
  if (rating < 40 && stable.tier === "elite") shouldConsign = true; // Cull weak horses
  if (horse.age > 8) shouldConsign = true; // Sell older horses
  
  // Personality-driven consignment
  if (aiState.personalityState.personality === "win-now" && rating < 50) shouldConsign = true;

  const reservePrice = rating * 800; // Simplified reserve

  return { shouldConsign, reservePrice };
}

/**
 * Record auction decision for learning
 */
export function recordAuctionDecision(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  valuation: number,
  stable: Stable,
  currentDay: number,
): AuctionAIState {
  const decision: ValuationDecision = {
    horseId: horse.id,
    lotId: lot.id,
    valuation,
    finalPrice: 0,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  aiState.valuationHistory.push(decision);

  // Trim history
  const maxHistory = aiState.personalityState.memoryDepth;
  if (aiState.valuationHistory.length > maxHistory) {
    aiState.valuationHistory = aiState.valuationHistory.slice(-maxHistory);
  }

  return aiState;
}

/**
 * Record auction outcome for learning
 */
export function recordAuctionOutcome(
  aiState: AuctionAIState,
  lotId: string,
  success: boolean,
  finalPrice: number,
  currentDay: number,
): AuctionAIState {
  const decision = aiState.valuationHistory.find((d) => d.lotId === lotId && d.success === undefined);
  if (decision) {
    decision.success = success;
    decision.finalPrice = finalPrice;
    decision.value = success ? decision.valuation - finalPrice : 0;

    // Update learning state
    const horseRating = decision.valuation / 1200; // rough proxy
    const contextKey = `${finalPrice > 50000 ? "expensive" : "cheap"}`;
    aiState.learningState = recordOutcome(
      aiState.learningState,
      "auction_valuation",
      contextKey,
      success,
      decision.value || 0,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );
  }
  return aiState;
}
