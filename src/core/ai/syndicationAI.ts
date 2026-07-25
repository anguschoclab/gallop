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
import { findMajorityOwner } from "@/core/breeding/devolutionUtils";

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
    stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
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
    stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
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
 * Check if selling N shares would cause the NPC to lose majority ownership.
 * @param syndicate
 * @param npcStableId
 * @param sharesToSell
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
 * @param syndicate
 * @param npcStableId
 * @param availableShares
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
      const g1Wins =
        stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
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

  if (!isOvervalued && !isDeclining && !needsCash) return 0;

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
