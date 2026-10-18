/**
 * auctionAI.ts - Auction AI system (orchestrator)
 *
 * Provides types, state creation, and consignment evaluation.
 * Bidding logic extracted to: auctionBidding.ts.
 * Recording/insights extracted to: auctionRecording.ts.
 *
 * Dependencies: @/game/types, ./personalitySystem, ./learningModule, @/core/horse/stats, @/constants/aiConstants, @/constants/financialDistressConstants
 * Related files: auctionBidding.ts, auctionRecording.ts
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { DistressLevel } from "./financialDistressAI";
import {
  CONSIGN_UNDERPERFORMER_RATING_THRESHOLD,
  CONSIGN_UNDERPERFORMER_AGE_THRESHOLD,
  CONSIGN_RATING_RELAXATION_PER_WEIGHT,
  CONSIGN_AGE_RELAXATION_PER_WEIGHT,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";
import {
  DISTRESS_CONSIGN_RATING_REDUCTION,
  DISTRESS_CONSIGN_AGE_REDUCTION,
  DISTRESS_EMERGENCY_CONSIGN_RATING_THRESHOLD,
} from "@/constants/financialDistressConstants";

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
  reason: "underperformer" | "surplus" | "rebalancing" | "retirement" | "financial_distress";
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
 * @param distressLevel - Optional financial distress level for distress-aware consignment
 * @returns Object with shouldConsign flag and optional reason
 */
export function shouldConsignHorse(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
  distressLevel?: DistressLevel,
): {
  shouldConsign: boolean;
  reason?: "underperformer" | "surplus" | "rebalancing" | "retirement" | "financial_distress";
} {
  // Weight ≤ 0 → never consign
  if (weight <= 0) return { shouldConsign: false };

  // Don't consign young horses (unless in distress)
  if (horse.age < 3 && !distressLevel) return { shouldConsign: false };
  if (horse.age < 3 && distressLevel !== "critical") return { shouldConsign: false };

  const horseRating = calculateOverallRating(horse);
  const portfolio = aiState.portfolio;

  // Distress-aware consignment logic
  if (distressLevel === "critical") {
    // Critical: consign all except top 3 by rating — caller must handle top-3 filtering.
    // Here we consign any horse with rating below a very high threshold.
    return { shouldConsign: true, reason: "financial_distress" };
  }

  if (distressLevel === "emergency") {
    // Emergency: consign any horse with rating < threshold, age >= 3
    if (horse.age >= 3 && horseRating < DISTRESS_EMERGENCY_CONSIGN_RATING_THRESHOLD) {
      return { shouldConsign: true, reason: "financial_distress" };
    }
  }

  if (distressLevel === "caution") {
    // Caution: lower rating threshold, lower age threshold
    const distressRatingThreshold =
      CONSIGN_UNDERPERFORMER_RATING_THRESHOLD +
      (weight - 1) * CONSIGN_RATING_RELAXATION_PER_WEIGHT -
      DISTRESS_CONSIGN_RATING_REDUCTION;
    const distressAgeThreshold =
      CONSIGN_UNDERPERFORMER_AGE_THRESHOLD -
      (weight - 1) * CONSIGN_AGE_RELAXATION_PER_WEIGHT -
      DISTRESS_CONSIGN_AGE_REDUCTION;
    if (horseRating < distressRatingThreshold && horse.age > distressAgeThreshold) {
      return { shouldConsign: true, reason: "financial_distress" };
    }
  }

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
