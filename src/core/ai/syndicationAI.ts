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
import { getCareerStats } from "@/core/horse/stats";
import { getPersonalityAIState, recordPersonalityOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordLearningOutcome,
  getSuccessRate,
  trimHistory,
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
  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

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
  if (stallion.ownership?.type !== "npc" || stallion.ownership.stableId !== npcStable.id)
    return false;

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

// Syndicate decisions (create with learning, share purchase/sale, valuation, dissolution)
// extracted to syndicationAIDecisions.ts
export {
  shouldCreateSyndicateWithLearning,
  calculateSharePurchase,
  calculateShareSale,
  calculateShareValue,
  shouldDissolveSyndicate,
} from "./syndicationAIDecisions";
