import type { Horse, Stable } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import type { DistressLevel } from "./financialDistressAI";
import type { SyndicationAIState } from "./syndicationAI";
import {
  calculateSyndicateValue,
  calculateSharePrice,
  getSyndicationSuccessRate,
  shouldCreateSyndicate,
} from "./syndicationAI";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import { getCareerStats } from "@/core/horse/stats";
import { getSyndicationAppetite } from "./syndicationAppetite";

export function shouldCreateSyndicateWithLearning(
  aiState: SyndicationAIState,
  npcStable: Stable,
  stallion: Horse,
  existingSyndicates: Record<string, Syndicate>,
): boolean {
  const baseDecision = shouldCreateSyndicate(npcStable, stallion, existingSyndicates);
  if (!baseDecision) return false;

  const successRate = getSyndicationSuccessRate(aiState, "create");
  const confidence = aiState.personalityState.strategyConfidence;

  if (successRate < 0.3 && aiState.syndicationHistory.length > 3) {
    return false;
  }

  if (confidence < 0.4 && successRate < 0.5) {
    return false;
  }

  return true;
}

function wouldLoseMajority(
  syndicate: Syndicate,
  npcStableId: string,
  sharesToSell: number,
): boolean {
  const currentShares = syndicate.shareHolders[npcStableId] || 0;
  const afterShares = currentShares - sharesToSell;
  const threshold = syndicate.totalShares / 2;
  return afterShares <= threshold;
}

function sharesToTriggerDevolution(
  syndicate: Syndicate,
  npcStableId: string,
  availableShares: number,
): number {
  const currentShares = syndicate.shareHolders[npcStableId] || 0;
  const threshold = syndicate.totalShares / 2;

  let currentOwnerKey = "";
  let currentOwnerShares = 0;
  for (const [holder, count] of Object.entries(syndicate.shareHolders)) {
    if (count > currentOwnerShares) {
      currentOwnerShares = count;
      currentOwnerKey = holder;
    }
  }

  if (currentOwnerKey === npcStableId) return 0;

  if (currentOwnerShares > threshold) return 0;

  const needed = currentOwnerShares + 1 - currentShares;
  if (needed <= 0) return 0;
  if (needed > availableShares) return 0;

  return needed;
}

export function calculateSharePurchase(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
): number {
  const personality = npcStable.personality;
  const appetite = getSyndicationAppetite(personality);

  const cash = npcStable.cash || 0;
  const currentShares = syndicate.shareHolders[npcStable.id] || 0;
  const maxShares = Math.floor(syndicate.totalShares * appetite.stakeCapPct);
  const availableShares = maxShares - currentShares;

  if (availableShares <= 0) return 0;

  const g1Wins = getCareerStats(stallion).g1Wins;
  if (g1Wins < appetite.minG1Wins) return 0;

  const sharePrice = calculateSharePrice(syndicate, stallion);
  if (sharePrice <= 0) return 0;

  const budget = cash * appetite.cashFraction;
  const maxAffordable = Math.floor(budget / sharePrice);
  const sharesToBuy = Math.min(availableShares, maxAffordable);

  if (sharesToBuy < 1) return 0;

  const takeoverShares = sharesToTriggerDevolution(syndicate, npcStable.id, availableShares);

  if (appetite.chasesControl && takeoverShares > 0 && takeoverShares <= maxAffordable) {
    if (personality === "aggressive" || personality === "trader") {
      return takeoverShares;
    }

    if (personality === "prestige" && g1Wins >= 3) {
      return takeoverShares;
    }
  }

  return Math.max(1, Math.floor(sharesToBuy * appetite.buyFraction));
}

export function calculateShareSale(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
  distressLevel?: DistressLevel,
): number {
  const currentShares = syndicate.shareHolders[npcStable.id] || 0;
  if (currentShares <= 0) return 0;

  const sharePrice = calculateSharePrice(syndicate, stallion);
  const syndicateValue = calculateSyndicateValue(stallion);

  const fairPrice = syndicateValue / syndicate.totalShares;
  const isOvervalued = sharePrice > fairPrice * 1.5;

  const isDeclining = stallion.age > 18 && stallion.stud?.seasonBookings === 0;

  const needsCash = (npcStable.cash || 0) < 100000;

  const inDistress =
    distressLevel === "caution" || distressLevel === "emergency" || distressLevel === "critical";

  if (!isOvervalued && !isDeclining && !needsCash && !inDistress) return 0;

  if (distressLevel === "critical") {
    return currentShares;
  }

  if (distressLevel === "emergency") {
    const personality = npcStable.personality;
    const isOwner =
      stallion.ownership?.type === "npc" && stallion.ownership.stableId === npcStable.id;
    const avoidDevolution =
      personality === "conservative" || personality === "breeder" || personality === "prestige";

    if (isOwner && avoidDevolution) {
      const threshold = syndicate.totalShares / 2;
      const maxSellable = currentShares - Math.ceil(threshold) - 1;
      return Math.max(0, maxSellable);
    }
    return currentShares;
  }

  let sellQuantity = Math.floor(currentShares * 0.5);
  if (sellQuantity < 1) return 0;

  const personality = npcStable.personality;
  const isOwner =
    stallion.ownership?.type === "npc" && stallion.ownership.stableId === npcStable.id;
  const cashCritical = (npcStable.cash || 0) < 50000;

  if (isOwner && !cashCritical) {
    const avoidDevolution =
      personality === "conservative" || personality === "breeder" || personality === "prestige";

    if (avoidDevolution) {
      const threshold = syndicate.totalShares / 2;
      const maxSellable = currentShares - Math.ceil(threshold) - 1;
      if (maxSellable > 0) {
        sellQuantity = Math.min(sellQuantity, maxSellable);
      } else {
        return 0;
      }
    }
  }

  return sellQuantity;
}

export function calculateShareValue(stallion: Horse, totalShares: number): number {
  if (totalShares <= 0) return 0;
  const syndicateValue = calculateSyndicateValue(stallion);
  return Math.round(syndicateValue / totalShares);
}

export function shouldDissolveSyndicate(
  stallion: Horse,
  syndicateValue: number,
  yearsActive: number,
): boolean {
  if (yearsActive < 3) return false;

  const recentG1Wins =
    stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1 && r.day > 0).length ||
    0;

  if (stallion.age > 18 && syndicateValue < 500000) return true;

  if (yearsActive >= 5 && recentG1Wins === 0 && syndicateValue < 1000000) return true;

  return false;
}
