/**
 * syndicateStakes.ts - Player stallion syndicate stakes and reputation impact
 *
 * Derives the player's active stallion syndicate holdings, equity value, dividend
 * yields, progeny track records, partner sentiment, and evaluates how each stake
 * influences manager reputation (both through historical underwriting events and
 * dynamic bloodstock standing).
 *
 * Pure logic only — no store access, no mutations.
 *
 * Dependencies: @/core/breeding/types, @/core/reputation, @/core/types/branded
 * Related files: src/services/breeding/breedingFacade.ts,
 *   src/components/syndicates/SyndicateStakesPage.tsx,
 *   src/routes/syndicate-stakes.tsx
 */

import type { Syndicate } from "@/core/breeding/types";
import type { Horse } from "@/game/types";
import type { ManagerReputation, ReputationEvent } from "@/core/reputation";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import { asPlayerOwnerId, asHorseId } from "@/core/types/branded";

export interface PlayerSyndicateStake {
  id: string; // syndicateId
  stallionId: string;
  stallionName: string;
  stallionAge: number;
  shares: number;
  totalShares: number;
  equityPct: number; // 0 - 100
  sharePrice: number;
  stakeValue: number; // shares * sharePrice
  studFee: number;
  previousStudFee: number;
  feeGrowth: number; // studFee - previousStudFee
  lifetimeEarnings: number;
  playerEarningsShare: number; // lifetimeEarnings * (shares / totalShares)
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  averageSatisfaction: number; // 0 - 100
  playerSatisfaction: number; // 0 - 100
  investorCount: number;
  investorAverageSatisfaction: number | null;
  reputationPointsTotal: number;
  reputationImpactStatus: "positive" | "neutral" | "negative";
  reputationImpactLabel: string;
  reputationImpactDescription: string;
  recentEvents: ReputationEvent[];
}

export interface SyndicateStakesSummary {
  totalStakesCount: number;
  totalSharesOwned: number;
  totalStakeValue: number;
  totalDividendsEarned: number;
  averagePartnerSatisfaction: number;
  netReputationPoints: number;
  positiveCount: number;
  neutralCount: number;
  dragCount: number;
}

export interface CalculateSyndicateReputationImpactParams {
  averageSatisfaction: number;
  lifetimeG1Foals: number;
  lifetimeStakesFoals: number;
  feeGrowth: number;
  equityPct: number;
  stallionName: string;
}

export interface SyndicateReputationImpactResult {
  status: "positive" | "neutral" | "negative";
  label: string;
  description: string;
}

/**
 * Evaluates a syndicate stake's track performance, stud fee trend, and partner sentiment
 * to calculate its standing and qualitative impact on stable reputation.
 *
 * @param params - Parameters for evaluating syndicate reputation impact.
 */
export function calculateSyndicateReputationImpact(
  params: CalculateSyndicateReputationImpactParams,
): SyndicateReputationImpactResult {
  const { averageSatisfaction, lifetimeG1Foals, lifetimeStakesFoals, feeGrowth, stallionName } =
    params;

  if (
    averageSatisfaction >= 75 ||
    lifetimeG1Foals > 0 ||
    (lifetimeStakesFoals >= 3 && feeGrowth >= 0)
  ) {
    return {
      status: "positive",
      label: "Prestige Boost",
      description: `${stallionName}'s progeny success and strong partner satisfaction (${Math.round(
        averageSatisfaction,
      )}%) elevate bloodstock prestige.`,
    };
  }

  if (averageSatisfaction < 40 || (feeGrowth < 0 && averageSatisfaction < 50)) {
    return {
      status: "negative",
      label: "Reputation Drag",
      description: `Low partner satisfaction (${Math.round(
        averageSatisfaction,
      )}%) and commercial dissatisfaction create reputational drag for ${stallionName}.`,
    };
  }

  return {
    status: "neutral",
    label: "Stable Standing",
    description: `Syndicate partners remain satisfied (${Math.round(
      averageSatisfaction,
    )}%) with steady commercial standing for ${stallionName}.`,
  };
}

export interface DerivePlayerSyndicateStakesParams {
  syndicates: Record<string, Syndicate>;
  horses: Record<string, Horse>;
  reputation?: ManagerReputation;
  syndicateInvestors?: Record<string, InvestorRecord>;
  day?: number;
  playerStableId?: string;
}

/**
 * Derives an array of PlayerSyndicateStake objects from game state.
 * Filters to only syndicates where the player owns > 0 shares.
 *
 * @param params - Parameters for deriving player syndicate stakes.
 */
export function derivePlayerSyndicateStakes(
  params: DerivePlayerSyndicateStakesParams,
): PlayerSyndicateStake[] {
  const { syndicates, horses, reputation, syndicateInvestors, playerStableId = "player" } = params;

  const playerKey = asPlayerOwnerId(playerStableId);
  const results: PlayerSyndicateStake[] = [];

  for (const syn of Object.values(syndicates || {})) {
    const shares =
      syn.shareHolders?.[playerKey] ?? (syn.shareHolders as any)?.[playerStableId] ?? 0;
    if (shares <= 0) continue;

    const totalShares = Math.max(1, syn.totalShares || 40);
    const equityPct = Math.round((shares / totalShares) * 100);
    const sharePrice = syn.sharePrice || 0;
    const stakeValue = shares * sharePrice;
    const lifetimeEarnings = syn.lifetimeEarnings || 0;
    const playerEarningsShare = Math.round(lifetimeEarnings * (shares / totalShares));

    const stallion = horses[asHorseId(syn.stallionId)];
    const stallionAge = stallion?.age ?? 0;
    const studFee = stallion?.stud?.standingFee ?? syn.studFee ?? 0;
    const previousStudFee = stallion?.stud?.previousStandingFee ?? studFee;
    const feeGrowth = studFee - previousStudFee;
    const lifetimeStakesFoals = stallion?.stud?.lifetimeStakesFoals ?? 0;
    const lifetimeG1Foals = stallion?.stud?.lifetimeG1Foals ?? 0;

    // Shareholder satisfaction
    const satRecord = syn.shareholderSatisfaction;
    let averageSatisfaction = 50;
    let playerSatisfaction = 50;

    if (satRecord && Object.keys(satRecord).length > 0) {
      const scores = Object.values(satRecord);
      averageSatisfaction = Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length);
      playerSatisfaction = satRecord[playerKey] ?? (satRecord as any)[playerStableId] ?? 50;
    }

    // Investor sentiment
    let investorCount = 0;
    let investorAverageSatisfaction: number | null = null;
    if (syndicateInvestors) {
      const matchingInvestors = Object.values(syndicateInvestors).filter(
        (inv) => inv.syndicateId === syn.id,
      );
      investorCount = matchingInvestors.length;
      if (investorCount > 0) {
        investorAverageSatisfaction = Math.round(
          matchingInvestors.reduce((sum, inv) => sum + inv.satisfaction, 0) / investorCount,
        );
      }
    }

    // Historical reputation events matching this syndicate
    const needle = syn.stallionName.toLowerCase();
    const matchingEvents = (reputation?.events ?? []).filter((e) => {
      if (e.horseId === syn.stallionId) return true;
      const desc = e.description?.toLowerCase() ?? "";
      return desc.includes(needle) || (syn.id && desc.includes(syn.id.toLowerCase()));
    });

    const reputationPointsTotal = matchingEvents.reduce((sum, e) => sum + e.amount, 0);

    const impact = calculateSyndicateReputationImpact({
      averageSatisfaction,
      lifetimeG1Foals,
      lifetimeStakesFoals,
      feeGrowth,
      equityPct,
      stallionName: syn.stallionName,
    });

    results.push({
      id: syn.id,
      stallionId: syn.stallionId,
      stallionName: syn.stallionName,
      stallionAge,
      shares,
      totalShares,
      equityPct,
      sharePrice,
      stakeValue,
      studFee,
      previousStudFee,
      feeGrowth,
      lifetimeEarnings,
      playerEarningsShare,
      lifetimeStakesFoals,
      lifetimeG1Foals,
      averageSatisfaction,
      playerSatisfaction,
      investorCount,
      investorAverageSatisfaction,
      reputationPointsTotal,
      reputationImpactStatus: impact.status,
      reputationImpactLabel: impact.label,
      reputationImpactDescription: impact.description,
      recentEvents: matchingEvents,
    });
  }

  return results.sort((a, b) => b.stakeValue - a.stakeValue);
}

/**
 * Computes portfolio-level aggregate totals across all player syndicate stakes.
 *
 * @param stakes - Array of player syndicate stakes.
 */
export function calculateSyndicateStakesSummary(
  stakes: PlayerSyndicateStake[],
): SyndicateStakesSummary {
  if (stakes.length === 0) {
    return {
      totalStakesCount: 0,
      totalSharesOwned: 0,
      totalStakeValue: 0,
      totalDividendsEarned: 0,
      averagePartnerSatisfaction: 0,
      netReputationPoints: 0,
      positiveCount: 0,
      neutralCount: 0,
      dragCount: 0,
    };
  }

  let totalSharesOwned = 0;
  let totalStakeValue = 0;
  let totalDividendsEarned = 0;
  let totalSatisfactionSum = 0;
  let netReputationPoints = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let dragCount = 0;

  for (const stake of stakes) {
    totalSharesOwned += stake.shares;
    totalStakeValue += stake.stakeValue;
    totalDividendsEarned += stake.playerEarningsShare;
    totalSatisfactionSum += stake.averageSatisfaction;
    netReputationPoints += stake.reputationPointsTotal;

    if (stake.reputationImpactStatus === "positive") positiveCount++;
    else if (stake.reputationImpactStatus === "negative") dragCount++;
    else neutralCount++;
  }

  return {
    totalStakesCount: stakes.length,
    totalSharesOwned,
    totalStakeValue,
    totalDividendsEarned,
    averagePartnerSatisfaction: Math.round(totalSatisfactionSum / stakes.length),
    netReputationPoints,
    positiveCount,
    neutralCount,
    dragCount,
  };
}
