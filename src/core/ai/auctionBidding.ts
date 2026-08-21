import type { Horse, Stable, AuctionLot } from "@/game/types";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate, getAdaptiveThreshold } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { NpcRelationship } from "./npcCycleAI";
import type { AuctionAIState } from "./auctionAI";
import {
  BID_BASE_THRESHOLD,
  HORSE_RATING_TO_VALUE_MULTIPLIER,
  DEFAULT_SUBSYSTEM_WEIGHT,
} from "@/constants/aiConstants";

export function calculateBiddingValue(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
): number {
  let score = 0;

  const horseRating = calculateOverallRating(horse);
  const estimatedValue = horseRating * HORSE_RATING_TO_VALUE_MULTIPLIER;
  const currentBid = lot.hammerPrice || lot.reservePrice;
  const valueRatio = estimatedValue / (currentBid || 1);

  score += Math.max(0, (valueRatio - 1) * 30);

  const factors: Record<string, number> = {
    value_ratio: valueRatio,
    horse_age: horse.age,
    horse_rating: horseRating,
    current_bid: currentBid,
  };

  score = calculateUtilityScore(aiState.personalityState, "bidding", factors);

  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "bidding", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  const strategicValue = evaluateStrategicBiddingValue(aiState, horse, stable, currentDay);
  score += strategicValue;

  return Math.max(0, Math.min(100, score));
}

function evaluateStrategicBiddingValue(
  aiState: AuctionAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): number {
  let strategicValue = 0;

  const portfolio = aiState.portfolio;
  if (portfolio.currentHorseCount < portfolio.targetHorseCount) {
    strategicValue += 10;
  }

  const ageCount = portfolio.ageDistribution[horse.age] || 0;
  if (ageCount < 3) {
    strategicValue += 5;
  }

  const horseRating = calculateOverallRating(horse);
  if (horseRating >= portfolio.qualityTarget) {
    strategicValue += 10;
  }

  return strategicValue;
}

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

  let maxBid = estimatedValue;

  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 1.2 : 0.8;
  maxBid *= riskTolerance;

  const budgetShare = aiState.portfolio.budgetRemaining * 0.3;
  maxBid = Math.min(maxBid, budgetShare);

  const contextKey = `${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "bidding", contextKey);
  if (successRate < 0.4) {
    maxBid *= 0.8;
  }

  if (horse.ownership?.type === "player" && friction && friction >= 50) {
    const frictionMultiplier = 1 + (friction - 50) / 200;
    maxBid *= frictionMultiplier;
  }

  return Math.floor(maxBid);
}

export function shouldBidOnHorse(
  aiState: AuctionAIState,
  horse: Horse,
  lot: AuctionLot,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  if (weight <= 0) return false;

  if (stable.cash < lot.reservePrice) return false;
  const currentBid = lot.hammerPrice || lot.reservePrice;
  if (currentBid > stable.cash) return false;

  const valueScore = calculateBiddingValue(aiState, horse, lot, stable, currentDay);
  const maxBid = calculateMaxBid(aiState, horse, lot, stable, currentDay);

  const contextKey = `${horse.age}`;
  const baseThreshold = BID_BASE_THRESHOLD;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "bidding",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  const effectiveThreshold = adaptiveThreshold / weight;

  return valueScore > effectiveThreshold && maxBid >= (lot.hammerPrice || lot.reservePrice);
}

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

export function shouldYieldToAlly(
  myStable: Stable,
  myAiState: AuctionAIState,
  allyStableId: string,
  allyRelationship: NpcRelationship,
  allyPortfolioCount: number,
  allyTargetCount: number,
): boolean {
  if (
    allyRelationship.allianceType !== "racing_coalition" &&
    allyRelationship.allianceType !== "breeding_partnership"
  ) {
    return false;
  }

  if (allyRelationship.trust < 30) return false;

  const myCount = myAiState.portfolio.currentHorseCount;
  const myTarget = myAiState.portfolio.targetHorseCount;

  const myNeed = Math.max(0, myTarget - myCount);
  const allyNeed = Math.max(0, allyTargetCount - allyPortfolioCount);

  if (allyNeed > myNeed) return true;

  if (allyNeed === myNeed && myStable.personality !== "prestige") {
    return true;
  }

  return false;
}
