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
import { getSyndicationAppetite, computeQualityStakeScale } from "./syndicationAppetite";
import { recordSyndicatePurchaseTrace, type SyndicatePurchaseTrace } from "./syndicationTrace";

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

/**
 * Full trace of the NPC share-purchase decision: personality appetite,
 * proven quality gate, cash budget and the resulting stake.
 * @param npcStable
 * @param syndicate
 * @param stallion
 */
export function evaluateSharePurchase(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
): SyndicatePurchaseTrace {
  const personality = npcStable.personality;
  const appetite = getSyndicationAppetite(personality);

  const cash = npcStable.cash || 0;
  const currentShares = syndicate.shareHolders[npcStable.id] || 0;
  const careerStats = getCareerStats(stallion);
  const g1Wins = careerStats.g1Wins;
  const g2Wins = careerStats.g2Wins;
  const g3Wins = careerStats.g3Wins;

  const quality = computeQualityStakeScale(g1Wins, g2Wins, g3Wins);
  const scaledCapPct = Math.min(1, appetite.stakeCapPct * quality.scale);
  const maxShares = Math.floor(syndicate.totalShares * scaledCapPct);
  const availableShares = maxShares - currentShares;

  const base: SyndicatePurchaseTrace = {
    stableId: String(npcStable.id),
    personality,
    syndicateId: String(syndicate.id ?? syndicate.stallionId ?? ""),
    stallionId: String(stallion.id),
    appetite,
    cash,
    sharePrice: 0,
    totalShares: syndicate.totalShares,
    currentShares,
    maxShares,
    availableShares: Math.max(0, availableShares),
    g1Wins,
    g2Wins,
    g3Wins,
    minG1Wins: appetite.minG1Wins,
    minG2Wins: appetite.minG2Wins,
    minG3Wins: appetite.minG3Wins,
    qualityScore: quality.score,
    qualityTier: quality.tier,
    qualityStakeScale: quality.scale,
    budget: cash * appetite.cashFraction,
    maxAffordable: 0,
    candidateShares: 0,
    takeoverShares: 0,
    outcome: "buy",
    shares: 0,
  };

  if (availableShares <= 0) return { ...base, outcome: "skip_stake_cap" };
  // Tiered-fallback OR gate: pass if any graded gate is satisfied
  if (g1Wins < appetite.minG1Wins && g2Wins < appetite.minG2Wins && g3Wins < appetite.minG3Wins) {
    return { ...base, outcome: "skip_quality_gate" };
  }

  const sharePrice = calculateSharePrice(syndicate, stallion);
  if (sharePrice <= 0) return { ...base, sharePrice, outcome: "skip_price" };

  const budget = cash * appetite.cashFraction;
  const maxAffordable = Math.floor(budget / sharePrice);
  const candidateShares = Math.min(availableShares, maxAffordable);
  const withCash = { ...base, sharePrice, budget, maxAffordable, candidateShares };

  if (candidateShares < 1) return { ...withCash, outcome: "skip_unaffordable" };

  const takeoverShares = sharesToTriggerDevolution(syndicate, npcStable.id, availableShares);
  const withTakeover = { ...withCash, takeoverShares };

  if (appetite.chasesControl && takeoverShares > 0 && takeoverShares <= maxAffordable) {
    if (
      personality === "aggressive" ||
      personality === "trader" ||
      (personality === "prestige" && g1Wins >= 3)
    ) {
      return { ...withTakeover, outcome: "buy_control", shares: takeoverShares };
    }
  }

  return {
    ...withTakeover,
    outcome: "buy",
    shares: Math.max(1, Math.floor(candidateShares * appetite.buyFraction)),
  };
}

export function calculateSharePurchase(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
): number {
  const trace = evaluateSharePurchase(npcStable, syndicate, stallion);
  recordSyndicatePurchaseTrace(trace);
  return trace.shares;
}

export interface CounterofferGuidance {
  stableId: string;
  /** Shares the NPC currently holds. */
  currentShares: number;
  /** Scaled max shares the NPC is willing to hold. */
  maxShares: number;
  /** Minimum shares the NPC would accept (always 1). */
  minAcceptable: number;
  /** Maximum shares the NPC can absorb this turn (budget + cap limited). */
  maxAcceptable: number;
  /** Whether the offered share count falls within [minAcceptable, maxAcceptable]. */
  acceptable: boolean;
  /** Expected stake (shares) after the offer is absorbed. */
  expectedStakeAfter: number;
  /** Expected stake as a fraction of total shares after the offer. */
  expectedStakePctAfter: number;
  /** Human-readable fit note. */
  note: string;
  /** The underlying purchase trace. */
  trace: SyndicatePurchaseTrace;
}

/**
 * Forecast how an NPC rival would respond to a player's offer of N syndicate
 * shares. This is a read-only projection — the actual solicit action picks a
 * random personality investor at execution time.
 * @param npcStable
 * @param syndicate
 * @param stallion
 * @param offeredShares
 */
export function evaluateCounteroffer(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
  offeredShares: number,
): CounterofferGuidance {
  const trace = evaluateSharePurchase(npcStable, syndicate, stallion);
  const maxAcceptable = Math.min(trace.availableShares, trace.maxAffordable);
  const minAcceptable = 1;
  const isBuyOutcome = trace.outcome === "buy" || trace.outcome === "buy_control";
  const acceptable =
    isBuyOutcome && offeredShares >= minAcceptable && offeredShares <= maxAcceptable;
  const expectedStakeAfter = Math.min(
    trace.currentShares + Math.max(0, offeredShares),
    trace.maxShares,
  );
  const expectedStakePctAfter = trace.totalShares > 0 ? expectedStakeAfter / trace.totalShares : 0;

  let note: string;
  if (trace.outcome === "skip_quality_gate") {
    const awaited = [
      trace.minG1Wins > 0 ? `G1 ${trace.minG1Wins}` : null,
      trace.minG2Wins > 0 ? `G2 ${trace.minG2Wins}` : null,
      trace.minG3Wins > 0 ? `G3 ${trace.minG3Wins}` : null,
    ]
      .filter(Boolean)
      .join(" or ");
    note = `Holding off — wants ${awaited} wins`;
  } else if (trace.outcome === "skip_stake_cap") {
    note = "Past stake cap — won't buy more";
  } else if (trace.outcome === "skip_unaffordable" || trace.outcome === "skip_price") {
    note = "Priced out at current share price";
  } else if (offeredShares < minAcceptable) {
    note = "Must offer at least 1 share";
  } else if (offeredShares > maxAcceptable) {
    note = `Exceeds budget by ${offeredShares - maxAcceptable}`;
  } else {
    note = "Within range";
  }

  return {
    stableId: trace.stableId,
    currentShares: trace.currentShares,
    maxShares: trace.maxShares,
    minAcceptable,
    maxAcceptable,
    acceptable,
    expectedStakeAfter,
    expectedStakePctAfter,
    note,
    trace,
  };
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
