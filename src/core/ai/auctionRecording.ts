import type { Horse, Stable, AuctionLot } from "@/game/types";
import { recordLearningOutcome, trimHistory } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import type { EconomicTrend } from "./strategicCoordinator";
import type { AuctionAIState, BiddingDecision, ConsignmentDecision } from "./auctionAI";

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

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

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

export function recordConsignmentDecision(
  aiState: AuctionAIState,
  horse: Horse,
  reason: "underperformer" | "surplus" | "rebalancing" | "retirement" | "financial_distress",
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

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

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

export function getMarketTrendMultiplier(trend: EconomicTrend): number {
  const indexDeviation = (trend.yearlingPriceIndex - 100) / 100;
  const multiplier = 1 + Math.max(-0.2, Math.min(0.2, indexDeviation));
  return multiplier;
}

export function getAverageRecentHammerPrice(aiState: AuctionAIState): number {
  if (aiState.recentHammerPrices.length === 0) return 0;
  return (
    aiState.recentHammerPrices.reduce((sum, p) => sum + p, 0) / aiState.recentHammerPrices.length
  );
}

export function recordHammerPrice(aiState: AuctionAIState, hammerPrice: number): AuctionAIState {
  const updated = [...aiState.recentHammerPrices, hammerPrice];
  const trimmed = updated.length > 20 ? updated.slice(-20) : updated;
  return { ...aiState, recentHammerPrices: trimmed };
}

export function evaluateConsignmentTiming(
  horse: Horse,
  catalogHorseRatings: number[],
): { shouldConsign: boolean; priceModifier: number } {
  const horseRating = calculateOverallRating(horse);

  if (catalogHorseRatings.length === 0) {
    return { shouldConsign: true, priceModifier: 1.1 };
  }

  const catalogAvg =
    catalogHorseRatings.reduce((sum, r) => sum + r, 0) / catalogHorseRatings.length;
  const ratingDiff = horseRating - catalogAvg;

  if (ratingDiff > 15) {
    return { shouldConsign: true, priceModifier: 1.15 };
  }

  if (ratingDiff < -15) {
    return { shouldConsign: false, priceModifier: 0.85 };
  }

  return { shouldConsign: true, priceModifier: 1.0 };
}

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

  if (horse.age >= 6) {
    trainingFocus = "maintenance";
  }

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

  const developmentDays = horse.age <= 2 ? 180 : horse.age <= 4 ? 90 : 45;

  const rationale = `Rating ${rating.toFixed(0)} → ${targetRaceClass} target. ${trainingFocus} focus needed (lowest stat: ${minStat}). ${horse.age}yo → ${developmentDays}d development window.`;

  return {
    trainingFocus,
    targetRaceClass,
    developmentDays,
    rationale,
  };
}
