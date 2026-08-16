/**
 * syndicationAI.ts - Syndication AI for NPC decision-making
 *
 * This file provides AI logic for NPC stables to make syndication-related decisions,
 * including creating syndicates on G1 winners, purchasing/selling shares, and valuing
 * syndicates based on stallion performance.
 *
 * Dependencies: @/game/types (Horse, Stable), @/core/breeding/types (Syndicate)
 * Related files: ../npc/intentGenerators.ts (uses this for syndication decisions)
 */

import type { Horse, Stable } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import type { DistressLevel } from "./financialDistressAI";
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";
import { getCareerStats } from "@/core/horse/stats";
import { getPersonalityAIState, recordPersonalityOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";

/**
 * Syndication AI State — tracks learning outcomes for syndication decisions.
 *
 * This is the only AI subsystem that previously had zero personality/learning
 * integration. This state enables adaptive syndication decisions based on
 * historical success rates.
 */
export interface SyndicationAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  syndicationHistory: SyndicationDecision[];
}

export interface SyndicationDecision {
  stallionId: string;
  stableId: string;
  action: "create" | "buy" | "sell" | "dissolve";
  shares: number;
  value: number;
  day: number;
  success: boolean;
}

/**
 * Create AI state for syndication decisions.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized syndication AI state
 */
export function createSyndicationAIState(stable: Stable): SyndicationAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    syndicationHistory: [],
  };
}

/**
 * Record a syndication decision outcome for learning.
 *
 * @param aiState - Current syndication AI state
 * @param decision - The decision that was made
 * @param currentDay - Current game day
 * @returns Updated syndication AI state
 */
export function recordSyndicationOutcome(
  aiState: SyndicationAIState,
  decision: SyndicationDecision,
  currentDay: number,
): SyndicationAIState {
  const newHistory = [...aiState.syndicationHistory, decision];
  const trimmedHistory = newHistory.slice(-aiState.personalityState.memoryDepth);

  const contextKey = decision.action;
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "syndication",
    contextKey,
    decision.success,
    decision.value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  const newPersonalityState = recordPersonalityOutcome(
    aiState.personalityState,
    "syndication",
    { stallionId: decision.stallionId, action: decision.action },
    decision.success,
    decision.value,
    currentDay,
  );

  return {
    ...aiState,
    syndicationHistory: trimmedHistory,
    learningState: newLearningState,
    personalityState: newPersonalityState,
  };
}

/**
 * Get syndication success rate for a given action type.
 *
 * @param aiState - Current syndication AI state
 * @param action - The action type to check
 * @returns Success rate (0-1)
 */
export function getSyndicationSuccessRate(
  aiState: SyndicationAIState,
  action: SyndicationDecision["action"],
): number {
  return getSuccessRate(aiState.learningState, "syndication", action);
}

/**
 * Calculate syndicate value based on stallion performance metrics.
 *
 * Considers G1 wins, lifetime earnings, progeny performance, and age.
 *
 * @param stallion - The stallion to value
 * @returns Estimated syndicate value in dollars
 */
export function calculateSyndicateValue(stallion: Horse): number {
  const g1Wins = getCareerStats(stallion).g1Wins;
  const lifetimeEarnings = stallion.lifetimeEarnings || 0;
  const age = stallion.age;

  // Base value from G1 wins
  const g1Value = g1Wins * 500000;

  // Earnings multiplier
  const earningsMultiplier = 1 + lifetimeEarnings / 10000000;
  const earningsValue = lifetimeEarnings * 0.1 * earningsMultiplier;

  // Age depreciation (stallions decline after age 15)
  const ageMultiplier = age > 15 ? 1 - (age - 15) * 0.05 : 1;

  return Math.round((g1Value + earningsValue) * Math.max(0.5, ageMultiplier));
}

/**
 * Calculate fair share price for a syndicate.
 *
 * Based on syndicate value divided by total shares.
 *
 * @param syndicate - The syndicate to price
 * @param stallion - The stallion for valuation
 * @returns Price per share
 */
export function calculateSharePrice(syndicate: Syndicate, stallion: Horse): number {
  const syndicateValue = calculateSyndicateValue(stallion);
  return Math.round(syndicateValue / syndicate.totalShares);
}

/**
 * Determine if NPC should create a syndicate for a stallion.
 *
 * NPCs create syndicates for their G1 winners if:
 * - Stallion has at least 1 G1 win
 * - Stallion is at stud
 * - NPC has sufficient cash to cover initial share distribution
 * - Stallion is not already syndicated
 *
 * @param npcStable - The NPC stable
 * @param stallion - The stallion to consider
 * @param existingSyndicates - Map of existing syndicates
 * @returns Whether NPC should create syndicate
 */
export function shouldCreateSyndicate(
  npcStable: Stable,
  stallion: Horse,
  existingSyndicates: Record<string, Syndicate>,
): boolean {
  // Check if stallion is owned by NPC
  if (stallion.stableId !== npcStable.id) return false;

  // Check if stallion is a G1 winner
  const g1Wins = getCareerStats(stallion).g1Wins;
  if (g1Wins === 0) return false;

  // Check if stallion is at stud
  if (!stallion.stud?.atStud) return false;

  // Check if already syndicated
  if (existingSyndicates[stallion.id]) return false;

  // Check if NPC has sufficient cash for initial share distribution (20 shares at $10k each)
  const initialCost = 200000;
  if ((npcStable.cash || 0) < initialCost) return false;

  return true;
}

/**
 * Personality-aware syndicate creation check.
 *
 * Uses the syndication AI state to adjust the creation threshold based on
 * past syndication success rates and personality confidence.
 *
 * @param aiState - Current syndication AI state
 * @param npcStable - The NPC stable
 * @param stallion - The stallion to consider
 * @param existingSyndicates - Map of existing syndicates
 * @returns Whether NPC should create syndicate (with learning adjustment)
 */
export function shouldCreateSyndicateWithLearning(
  aiState: SyndicationAIState,
  npcStable: Stable,
  stallion: Horse,
  existingSyndicates: Record<string, Syndicate>,
): boolean {
  const baseDecision = shouldCreateSyndicate(npcStable, stallion, existingSyndicates);
  if (!baseDecision) return false;

  // Adjust based on past syndication success
  const successRate = getSyndicationSuccessRate(aiState, "create");
  const confidence = aiState.personalityState.strategyConfidence;

  // If past syndication attempts had low success, be more cautious
  if (successRate < 0.3 && aiState.syndicationHistory.length > 3) {
    return false;
  }

  // High-confidence stables are more willing to create syndicates
  if (confidence < 0.4 && successRate < 0.5) {
    return false;
  }

  return true;
}

/**
 * Check if selling N shares would cause the NPC to lose majority ownership.
 * @param syndicate The syndicate object.
 * @param npcStableId The ID of the NPC stable.
 * @param sharesToSell The number of shares to sell.
 */
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

/**
 * Calculate how many shares the NPC needs to buy to trigger devolution
 * (become the majority shareholder). Returns 0 if impossible.
 * @param syndicate The syndicate object.
 * @param npcStableId The ID of the NPC stable.
 * @param availableShares The number of available shares to buy.
 */
function sharesToTriggerDevolution(
  syndicate: Syndicate,
  npcStableId: string,
  availableShares: number,
): number {
  const currentShares = syndicate.shareHolders[npcStableId] || 0;
  const threshold = syndicate.totalShares / 2;

  // Find current owner's shares
  let currentOwnerKey = "";
  let currentOwnerShares = 0;
  for (const [holder, count] of Object.entries(syndicate.shareHolders)) {
    if (count > currentOwnerShares) {
      currentOwnerShares = count;
      currentOwnerKey = holder;
    }
  }

  // If NPC is already the majority owner, no takeover needed
  if (currentOwnerKey === npcStableId) return 0;

  // NPC needs to exceed currentOwnerShares AND currentOwner must be <= threshold
  // Since buying from treasury doesn't reduce currentOwner's shares,
  // devolution can only trigger if currentOwner is already <= threshold
  if (currentOwnerShares > threshold) return 0;

  // NPC needs strictly more than currentOwnerShares
  const needed = currentOwnerShares + 1 - currentShares;
  if (needed <= 0) return 0; // NPC already has more (shouldn't happen if not owner, but safety)
  if (needed > availableShares) return 0;

  return needed;
}

/**
 * Determine if NPC should purchase shares in a syndicate.
 *
 * NPCs purchase shares if:
 * - They have sufficient cash
 * - The share price is fair or undervalued
 * - They don't already own too many shares (max 30%)
 * - The stallion has good prospects
 *
 * Personality + financial hybrid:
 * - Aggressive/trader: If takeover is possible and affordable, buy exactly enough to cross threshold.
 * - Prestige: Strongly motivated for elite stallions (3+ G1 wins).
 * - Conservative/breeder: Use existing 25% of affordable logic, no takeover ambition.
 *
 * @param npcStable - The NPC stable
 * @param syndicate - The syndicate to consider
 * @param stallion - The stallion for valuation
 * @returns Number of shares to purchase (0 if none)
 */
export function calculateSharePurchase(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
): number {
  const cash = npcStable.cash || 0;
  const currentShares = syndicate.shareHolders[npcStable.id] || 0;
  const maxShares = Math.floor(syndicate.totalShares * 0.3); // Max 30% ownership
  const availableShares = maxShares - currentShares;

  if (availableShares <= 0) return 0;

  const sharePrice = calculateSharePrice(syndicate, stallion);
  const maxAffordable = Math.floor(cash / sharePrice);
  const sharesToBuy = Math.min(availableShares, maxAffordable);

  // Only buy if can afford at least 1 share
  if (sharesToBuy < 1) return 0;

  const personality = npcStable.personality;

  // Check if a takeover is possible
  const takeoverShares = sharesToTriggerDevolution(syndicate, npcStable.id, availableShares);

  if (takeoverShares > 0 && takeoverShares <= maxAffordable) {
    // Takeover is possible and affordable
    if (personality === "aggressive" || personality === "trader") {
      // Buy exactly enough to trigger devolution
      return takeoverShares;
    }

    if (personality === "prestige") {
      // Prestige NPCs are motivated for elite stallions
      const g1Wins = getCareerStats(stallion).g1Wins;
      if (g1Wins >= 3) {
        return takeoverShares;
      }
    }
  }

  // Conservative/breeder: only buy 25% of affordable shares
  return Math.floor(sharesToBuy * 0.25);
}

/**
 * Determine if NPC should sell shares in a syndicate.
 *
 * NPCs sell shares if:
 * - The share price is overvalued
 * - They need cash
 * - The stallion is aging poorly
 *
 * Personality + financial hybrid:
 * - Conservative/breeder/prestige: Avoid selling shares that trigger devolution unless cash-critical (< $50k).
 * - Aggressive/trader: Sell freely even if devolution occurs.
 * - If NPC is not the current owner, devolution doesn't matter — sell freely.
 * - If selling would cause devolution, reduce sell quantity to stay above threshold.
 *
 * @param npcStable - The NPC stable
 * @param syndicate - The syndicate to consider
 * @param stallion - The stallion for valuation
 * @param distressLevel - Optional financial distress level for distress-aware selling
 * @returns Number of shares to sell (0 if none)
 */
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

  // Sell if overvalued by more than 50%
  const fairPrice = syndicateValue / syndicate.totalShares;
  const isOvervalued = sharePrice > fairPrice * 1.5;

  // Sell if stallion is old and declining
  const isDeclining = stallion.age > 18 && stallion.stud?.seasonBookings === 0;

  // Sell if NPC needs cash (less than $100k)
  const needsCash = (npcStable.cash || 0) < 100000;

  // Distress-aware: force selling when in distress
  const inDistress =
    distressLevel === "caution" || distressLevel === "emergency" || distressLevel === "critical";

  if (!isOvervalued && !isDeclining && !needsCash && !inDistress) return 0;

  // Critical distress: sell everything, ignore devolution
  if (distressLevel === "critical") {
    return currentShares;
  }

  // Emergency distress: sell all shares (aggressive/trader) or keep majority (cautious)
  if (distressLevel === "emergency") {
    const personality = npcStable.personality;
    const isOwner = stallion.stableId === npcStable.id;
    const avoidDevolution =
      personality === "conservative" || personality === "breeder" || personality === "prestige";

    if (isOwner && avoidDevolution) {
      const threshold = syndicate.totalShares / 2;
      const maxSellable = currentShares - Math.ceil(threshold) - 1;
      return Math.max(0, maxSellable);
    }
    return currentShares;
  }

  // Base sell quantity: 50% of holdings
  let sellQuantity = Math.floor(currentShares * 0.5);
  if (sellQuantity < 1) return 0;

  const personality = npcStable.personality;
  const isOwner = stallion.stableId === npcStable.id;
  const cashCritical = (npcStable.cash || 0) < 50000;

  // If NPC is the current owner, check if selling would cause devolution
  if (isOwner && !cashCritical) {
    const avoidDevolution =
      personality === "conservative" || personality === "breeder" || personality === "prestige";

    if (avoidDevolution) {
      // Reduce sell quantity to stay above the majority threshold
      const threshold = syndicate.totalShares / 2;
      const maxSellable = currentShares - Math.ceil(threshold) - 1; // Keep 1 above threshold
      if (maxSellable > 0) {
        sellQuantity = Math.min(sellQuantity, maxSellable);
      } else {
        // Can't sell any without losing majority
        return 0;
      }
    }
    // Aggressive/trader: sell freely, accept devolution
  }

  return sellQuantity;
}

// ─── Syndicate Share Valuation ───────────────────────────────────────────────

/**
 * Calculate the per-share value of a syndicate.
 *
 * Uses the stallion's syndicate value and divides by total shares,
 * adjusting for stallion age trajectory (younger stallions have
 * more upside potential).
 *
 * @param stallion - The syndicated stallion
 * @param totalShares - Total shares in the syndicate
 * @returns Per-share value
 */
export function calculateShareValue(stallion: Horse, totalShares: number): number {
  if (totalShares <= 0) return 0;
  const syndicateValue = calculateSyndicateValue(stallion);
  return Math.round(syndicateValue / totalShares);
}

// ─── Syndicate Dissolution Evaluation ────────────────────────────────────────

/**
 * Evaluate if a syndicate should be dissolved.
 *
 * If a stallion's performance has declined significantly (no G1 wins in
 * recent years, declining progeny earnings), it may be time to dissolve
 * the syndicate and sell the stallion.
 *
 * @param stallion - The syndicated stallion
 * @param syndicateValue - Current syndicate value
 * @param yearsActive - Years the syndicate has been active
 * @returns True if the syndicate should be dissolved
 */
export function shouldDissolveSyndicate(
  stallion: Horse,
  syndicateValue: number,
  yearsActive: number,
): boolean {
  // Don't dissolve young syndicates
  if (yearsActive < 3) return false;

  // Check recent G1 performance
  const recentG1Wins =
    stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1 && r.day > 0).length ||
    0;

  // If stallion is old and syndicate value is low, dissolve
  if (stallion.age > 18 && syndicateValue < 500000) return true;

  // If no G1 wins and syndicate has been active for 5+ years with low value
  if (yearsActive >= 5 && recentG1Wins === 0 && syndicateValue < 1000000) return true;

  return false;
}
