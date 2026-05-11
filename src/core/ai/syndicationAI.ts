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

/**
 * Calculate syndicate value based on stallion performance metrics.
 *
 * Considers G1 wins, lifetime earnings, progeny performance, and age.
 *
 * @param stallion - The stallion to value
 * @returns Estimated syndicate value in dollars
 */
export function calculateSyndicateValue(stallion: Horse): number {
  const g1Wins =
    stallion.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;
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
  const g1Wins =
    stallion.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;
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
 * Determine if NPC should purchase shares in a syndicate.
 *
 * NPCs purchase shares if:
 * - They have sufficient cash
 * - The share price is fair or undervalued
 * - They don't already own too many shares (max 30%)
 * - The stallion has good prospects
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

  // Conservative: only buy 25% of affordable shares
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
 * @param npcStable - The NPC stable
 * @param syndicate - The syndicate to consider
 * @param stallion - The stallion for valuation
 * @returns Number of shares to sell (0 if none)
 */
export function calculateShareSale(
  npcStable: Stable,
  syndicate: Syndicate,
  stallion: Horse,
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

  if (isOvervalued || isDeclining || needsCash) {
    // Sell 50% of holdings
    return Math.floor(currentShares * 0.5);
  }

  return 0;
}
