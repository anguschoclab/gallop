/**
 * strategySyndicationHelpers.ts - Syndication financial models and investor appetite calculations
 */

import type { Horse } from "@/game/types";
import { horseCareerValuation } from "@/core/horse/pricing";
import { calculateOverallRating } from "@/core/horse/stats";

export interface SyndicationBreakdown {
  totalShares: number;
  totalValuation: number;
  sharePrice: number;
  recommendedPlayerShares: number;
  playerEquityValue: number;
  liquidCapitalProceeds: number;
  standingFee: number;
  estimatedAnnualDividend: number;
}

export interface SyndicationEligibility {
  isEligible: boolean;
  g1Wins: number;
  shortfall: number;
  reason?: string;
}

export interface PersonalityInterest {
  personality: string;
  interest: "High" | "Moderate" | "Cautious" | "Low";
  criteria: string;
}

export interface InvestorAppetiteReport {
  prestigeStable: PersonalityInterest;
  breederStable: PersonalityInterest;
  traderStable: PersonalityInterest;
  aggressiveStable: PersonalityInterest;
}

/**
 * Calculates the 40-share commercial syndication breakdown for a horse.
 * @param horse
 * @param allHorses
 */
export function calculateSyndicationBreakdown(
  horse: Horse,
  allHorses: Horse[] = [],
): SyndicationBreakdown {
  const valuation = horseCareerValuation(horse, allHorses);
  const totalValuation = Math.max(100000, valuation.breeding);
  const totalShares = 40;
  const sharePrice = Math.round(totalValuation / totalShares);
  const recommendedPlayerShares = 20; // 50% retained stake
  const playerEquityValue = recommendedPlayerShares * sharePrice;
  const liquidCapitalProceeds = (totalShares - recommendedPlayerShares) * sharePrice;
  const standingFee = horse.stud?.standingFee || Math.max(5000, Math.round(totalValuation * 0.02));
  const estimatedMares = 35;
  const estimatedAnnualDividend = Math.round(
    standingFee * estimatedMares * (recommendedPlayerShares / totalShares),
  );

  return {
    totalShares,
    totalValuation,
    sharePrice,
    recommendedPlayerShares,
    playerEquityValue,
    liquidCapitalProceeds,
    standingFee,
    estimatedAnnualDividend,
  };
}

/**
 * Evaluates whether a horse is eligible for stud syndication.
 * @param horse
 */
export function evaluateSyndicationEligibility(horse: Horse): SyndicationEligibility {
  const isGelding = horse.gender === "gelding" || horse.gelded;
  if (isGelding) {
    return {
      isEligible: false,
      g1Wins: 0,
      shortfall: 1,
      reason: "Gelding — ineligible for stud syndication. Value derives from racing earnings.",
    };
  }

  const isFemale = horse.gender === "filly" || horse.gender === "mare";
  if (isFemale) {
    return {
      isEligible: false,
      g1Wins: 0,
      shortfall: 1,
      reason:
        "Broodmare — commercial progeny and auction sales model applies instead of stud syndication.",
    };
  }

  const g1Wins = horse.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length ?? 0;

  if (g1Wins >= 1 || horse.stud?.atStud) {
    return {
      isEligible: true,
      g1Wins,
      shortfall: 0,
    };
  }

  return {
    isEligible: false,
    g1Wins,
    shortfall: Math.max(0, 1 - g1Wins),
    reason: `Requires at least 1 Grade 1 victory to unlock commercial stud syndication (${g1Wins}/1 achieved).`,
  };
}

/**
 * Evaluates NPC investor appetite across stable personality archetypes.
 * @param horse
 */
export function evaluateInvestorAppetite(horse: Horse): InvestorAppetiteReport {
  const g1Wins = horse.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length ?? 0;
  const stakesWins =
    horse.raceHistory?.filter(
      (r) => (r.grade === "G1" || r.grade === "G2" || r.grade === "G3") && r.position === 1,
    ).length ?? 0;
  const ovr = calculateOverallRating(horse);

  return {
    prestigeStable: {
      personality: "Prestige",
      interest: g1Wins >= 1 ? "High" : stakesWins >= 2 ? "Moderate" : "Low",
      criteria: "Demands marquee G1 wins at premier racecourses before acquiring shares.",
    },
    breederStable: {
      personality: "Breeder",
      interest: stakesWins >= 1 || ovr >= 78 ? "High" : "Moderate",
      criteria: "Prioritizes stamina, pedigree nick, and conformation for broodmare matings.",
    },
    traderStable: {
      personality: "Trader",
      interest: ovr >= 75 ? "High" : "Moderate",
      criteria: "Seeks immediate share price appreciation and high secondary trade liquidity.",
    },
    aggressiveStable: {
      personality: "Aggressive",
      interest: ovr >= 70 ? "High" : "Moderate",
      criteria: "Aggressively buys controlling syndicate stakes to influence breeding programs.",
    },
  };
}
