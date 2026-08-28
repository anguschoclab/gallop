/**
 * auction.ts - Auction lot valuation and bidding logic
 *
 * This file provides functions for calculating lot valuations, bidding values,
 * commission amounts, and net proceeds for auction sales.
 *
 * Dependencies: @/core/horse/gender (isMaleHorse, isFemaleHorse), ./types (Horse, Pregnancy, Stable, AuctionLot, AuctionSale, AuctionSaleKind), @/core/horse/horseFactory (generateNpcHorse), @/core/horse/pricing (calculateNpcHorseValue), @/core/stable/stableConfig (PERSONALITY_CONFIG), ./rng (createRng, hashStr, Rng), ./uuid (generateUUID), @/core/breeding/pedigreePricing (pedigreeMultiplier), @/core/ai/auctionAI (calculateBiddingValue, calculateMaxBid, shouldBidOnHorse, createAuctionAIState, recordBiddingDecision), @/core/ai/npcCycleAI (NpcAIManager), ./auctionData (SALE_TRIGGERS, KIND_LABELS)
 * Related files: auctionRunner.ts (uses valuation logic), auctionData.ts (sale triggers and labels)
 */

import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import type {
  Horse,
  Pregnancy,
  Stable,
  AuctionLot,
  AuctionSale,
  AuctionSaleKind,
} from "@/game/types";
import { generateNpcHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { calculateNpcHorseValue } from "@/core/horse/pricing";
import { createRng, type Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import { calculateMaxBid, shouldBidOnHorse } from "@/core/ai/auctionBidding";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { DEFAULT_SUBSYSTEM_WEIGHT } from "@/constants/aiConstants";
import {
  CONSIGNMENT_COMMISSION,
  AUCTION_RESERVE_AGGRESSIVE,
  AUCTION_RESERVE_SPECIALIST_LOW,
  AUCTION_RESERVE_BREEDER,
  AUCTION_RESERVE_ELITE,
  AUCTION_AGGRESSIVE_BID_MIN_PERCENT,
  AUCTION_AGGRESSIVE_BID_VARIANCE,
} from "@/constants";
import type { AuctionHouse } from "@/core/prestige";
import { houseCommissionRate } from "@/core/prestige";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Calculate net proceeds from hammer price after commission.
 *
 * @param hammerPrice - The hammer price of the lot
 * @param house - Optional auction house; when provided its commission surcharge is applied
 * @returns Net proceeds after consignment commission
 */
export function netProceeds(hammerPrice: number, house?: AuctionHouse): number {
  const rate = house ? houseCommissionRate(CONSIGNMENT_COMMISSION, house) : CONSIGNMENT_COMMISSION;
  return Math.round(hammerPrice * (1 - rate));
}

/**
 * Compute the commission taken from a hammer price.
 *
 * @param hammerPrice - The hammer price of the lot
 * @param house - Optional auction house; when provided its commission surcharge is applied
 * @returns Commission amount
 */
export function commissionAmount(hammerPrice: number, house?: AuctionHouse): number {
  return hammerPrice - netProceeds(hammerPrice, house);
}

// ---------------------------------------------------------------------------
// Lot valuation
// ---------------------------------------------------------------------------

/**
 * Calculate how much a stable values a given auction lot.
 *
 * Returns a dollar figure representing their ceiling bid. Considers pedigree multiplier,
 * stable personality, sale kind, horse attributes, and various premiums.
 *
 * @param horse - The horse being valued
 * @param stable - The stable making the valuation
 * @param saleKind - Type of auction sale
 * @param allHorses - All horses in the game (for pedigree calculations)
 * @param horseMap - Map of horse IDs to horses
 * @returns Ceiling bid amount
 */
// Valuation logic extracted to auctionValuation.ts
export { calculateLotValuation } from "./auctionValuation";
import { calculateLotValuation } from "./auctionValuation";

// ---------------------------------------------------------------------------
// NPC bidding
// ---------------------------------------------------------------------------

const BUDGET_CAPS: Record<Stable["personality"], number> = {
  aggressive: AUCTION_RESERVE_AGGRESSIVE,
  conservative: 0.15,
  developer: 0.3,
  "win-now": 0.2,
  specialist: AUCTION_RESERVE_SPECIALIST_LOW,
  breeder: AUCTION_RESERVE_BREEDER,
  trader: 0.2,
  prestige: AUCTION_RESERVE_ELITE,
};

/**
 * Returns the next NPC bid amount, or null if the stable passes.
 * AI-driven decisions when npcAIManager is provided.
 */
/**
 * Calculate NPC bid for an auction lot.
 *
 * Uses AI-driven bidding if AI manager is available, otherwise falls back to
 * original valuation logic. Returns null if the stable should not bid.
 *
 * @param stable - The stable making the bid
 * @param horse - The horse being bid on
 * @param currentBid - Current bid amount
 * @param saleKind - Type of auction sale
 * @param rng - Random number generator
 * @param allHorses - All horses in the game (for pedigree calculations)
 * @param horseMap - Map of horse IDs to horses
 * @param npcAIManager - Optional AI manager for advanced bidding logic
 * @param currentDay - Current game day
 * @returns Bid amount or null if should not bid
 */
export function calculateNpcBid(
  stable: Stable,
  horse: Horse,
  currentBid: number,
  saleKind: AuctionSaleKind,
  rng: ReturnType<typeof createRng>,
  allHorses?: readonly Horse[],
  horseMap?: Map<string, Horse>,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
): number | null {
  // Use AI-driven bidding if AI manager is available
  if (npcAIManager && currentDay !== undefined) {
    const aiState = npcAIManager.stableStates[stable.id];
    if (aiState?.auctionAI) {
      // Create a temporary lot object for AI evaluation
      const tempLot: AuctionLot = {
        id: `temp_${horse.id}`,
        horseId: horse.id,
        consignorStableId: undefined,
        saleId: "temp",
        reservePrice: 0,
        hammerPrice: currentBid || undefined,
        soldToStableId: undefined,
        passed: false,
        withdrawn: false,
        bidHistory: [],
      };

      // Check if stable should bid using AI
      const auctionWeight = aiState.subsystemWeights?.auction ?? DEFAULT_SUBSYSTEM_WEIGHT;
      const shouldBid = shouldBidOnHorse(
        aiState.auctionAI,
        horse,
        tempLot,
        stable,
        currentDay,
        auctionWeight,
      );
      if (!shouldBid) return null;

      // Calculate max bid using AI with friction consideration
      const friction = aiState.friction ?? 0;
      const maxBid = calculateMaxBid(
        aiState.auctionAI,
        horse,
        tempLot,
        stable,
        currentDay,
        friction,
      );

      const nextBid = Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
      if (nextBid > maxBid) return null;

      return nextBid;
    }
  }

  // Fall back to original logic if AI not available
  const ceiling = calculateLotValuation(horse, stable, saleKind, allHorses, horseMap);

  if (ceiling <= 0) return null;

  const budgetCap = stable.cash * BUDGET_CAPS[stable.personality];
  const maxBid = Math.min(ceiling, budgetCap);

  const nextBid = Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
  if (nextBid > maxBid) return null;

  // Aggressive/prestige personalities bid near ceiling immediately
  if (stable.personality === "aggressive" || stable.personality === "prestige") {
    const aggressiveBid = Math.min(
      Math.round(
        ceiling *
          (AUCTION_AGGRESSIVE_BID_MIN_PERCENT + rng.range(0, AUCTION_AGGRESSIVE_BID_VARIANCE)),
      ),
      maxBid,
    );
    return aggressiveBid > currentBid ? Math.ceil(aggressiveBid / 100) * 100 : nextBid;
  }

  // Conservative stops at 80% of valuation
  if (stable.personality === "conservative" && nextBid > ceiling * 0.8) return null;

  // Trader drops out if price exceeds resale margin (valuation * 0.7)
  if (stable.personality === "trader" && nextBid > ceiling * 0.7) return null;

  return nextBid;
}

// ---------------------------------------------------------------------------
// Lot generation
// ---------------------------------------------------------------------------

const ELIGIBLE_AGES_BY_KIND: Record<AuctionSaleKind, number[]> = {
  weanling: [0],
  yearling: [1, 2],
  weanling_south: [0],
  yearling_south: [1, 2],
  mixed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  broodmare: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  "2yo_training": [2],
  racing_age: [3, 4, 5, 6, 7],
  liquidation: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
};

// Some sales are hemisphere-specific; others (mixed/broodmare/2yo/racing-age)
// sample from any region. Returning undefined means "no hemisphere filter".
const HEMISPHERE_BY_KIND: Record<AuctionSaleKind, "Northern" | "Southern" | undefined> = {
  weanling: "Northern",
  yearling: "Northern",
  weanling_south: "Southern",
  yearling_south: "Southern",
  mixed: undefined,
  broodmare: undefined,
  "2yo_training": undefined,
  racing_age: undefined,
  liquidation: undefined,
};

/**
 * Sale-kind eligibility filter. Returns true when this horse is appropriate
 * stock for this kind of sale. Layered on top of the age filter.
 */
/**
 * Check if a horse is eligible for a specific auction sale kind.
 *
 * @param horse - The horse to check
 * @param kind - Type of auction sale
 * @param pregnancies - Optional pregnancy data for broodmare checks
 * @returns True if horse is eligible for this sale kind
 */
export function isLotEligible(
  horse: Horse,
  kind: AuctionSaleKind,
  pregnancies?: readonly Pregnancy[],
): boolean {
  if (!ELIGIBLE_AGES_BY_KIND[kind].includes(horse.age)) return false;
  const hemi = HEMISPHERE_BY_KIND[kind];
  if (hemi && horse.hemisphere !== hemi) return false;

  if (kind === "broodmare") {
    if (!isFemaleHorse(horse.gender)) return false;
  }
  if (kind === "racing_age") {
    if (horse.gender === "mare") return false; // mares 4+ go to broodmare
    if (!horse.racingViable) return false;
  }
  if (kind === "2yo_training") {
    if (!horse.racingViable) return false;
  }
  return true;
}

/**
 * Generate a "breeze time" for a 2YO-in-training lot.
 *
 * Expressed in seconds for a 1/8-mile (≈202m) burst. Real OBS works range ~9.6s (elite)
 * to ~11.0s (slow). Faster horses get faster breezes; small RNG noise on top.
 *
 * @param horse - The horse to generate breeze time for
 * @param rng - Random number generator
 * @returns Breeze time in seconds
 */
export function generateBreezeSeconds(horse: Horse, rng: Rng): number {
  const speed = horse.stats.speed; // 0-100
  const accel = horse.stats.acceleration;
  const ovr = (speed * 0.6 + accel * 0.4) / 100; // 0..1
  const base = 11.0 - ovr * 1.4; // 9.6 (elite) → 11.0 (slow)
  const noise = (rng.range(0, 1) - 0.5) * 0.3;
  return Math.round((base + noise) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Per-personality consignment policy
// ---------------------------------------------------------------------------

/**
 * Decide which of a stable's horses it wants to consign for a sale.
 *
 * Each personality has its own logic for consignment. Returns consigned horses,
 * fresh lot count for filler, and reserve multiplier.
 *
 * @param stable - The stable consigning horses
 * @param kind - Type of auction sale
 * @param allHorses - All horses in the game
 * @param rng - Random number generator
 * @returns Object with consign array, freshCount, and reserveMultiplier
 */
// Consignment logic extracted to auctionConsignment.ts
export { personalityConsignmentPolicy } from "./auctionConsignment";
import { personalityConsignmentPolicy } from "./auctionConsignment";

/**
 * Generate a new AuctionSale with lots from NPC consignors + player-eligible horses.
 *
 * Player horses must be consigned separately via consignHorse().
 *
 * @param day - Day the sale occurs
 * @param stables - All NPC stables
 * @param allHorses - All horses in the game
 * @param kind - Type of auction sale
 * @param name - Display name of the sale
 * @param rng - Random number generator
 * @returns Generated auction sale with lots
 */
export function generateAuctionLots(
  day: number,
  stables: Stable[],
  allHorses: Horse[],
  kind: AuctionSaleKind,
  name: string,
  rng: Rng,
): AuctionSale {
  const saleId = generateUUID(rng);
  const hemisphere = HEMISPHERE_BY_KIND[kind];
  const eligibleAges = ELIGIBLE_AGES_BY_KIND[kind];
  const lots: AuctionLot[] = [];

  // Every major stable gets a chance to consign — per-personality policy
  // decides what (if anything) they actually list.
  const consignors = stables.filter((s) => s.isMajor);

  for (const stable of consignors) {
    const policy = personalityConsignmentPolicy(stable, kind, allHorses, rng);

    for (let horse of policy.consign) {
      horse = ensurePhenotypeResolved(horse);
      const pedigreeMul = pedigreeMultiplier(horse, {
        horses: Object.fromEntries(allHorses.map((h) => [h.id, h])),
      });
      const baseValue = calculateNpcHorseValue(horse, stable.tier) * pedigreeMul;
      const breezeSeconds = kind === "2yo_training" ? generateBreezeSeconds(horse, rng) : undefined;
      lots.push({
        id: generateUUID(rng),
        horseId: horse.id,
        consignorStableId: stable.id,
        saleId,
        reservePrice: Math.round(baseValue * policy.reserveMultiplier),
        passed: false,
        withdrawn: false,
        breezeSeconds,
      });
    }

    for (let i = 0; i < policy.freshCount; i++) {
      // Fresh NPC horse — pick an age the sale will accept.
      const targetAge = eligibleAges[rng.int(0, eligibleAges.length - 1)];
      const freshHorse = generateNpcHorse(stable, rng, undefined, 1, {
        forcedAge: targetAge,
        hemisphere: hemisphere ?? (rng.next() < 0.5 ? "Northern" : "Southern"),
      });
      // Re-check eligibility after generation (e.g. broodmare wants only mares).
      if (!isLotEligible(freshHorse, kind)) continue;
      const resolvedFresh = ensurePhenotypeResolved(freshHorse);
      allHorses.push(resolvedFresh);
      const pedigreeMul = pedigreeMultiplier(resolvedFresh, {
        horses: Object.fromEntries(allHorses.map((h) => [h.id, h])),
      });
      const baseValue = calculateNpcHorseValue(resolvedFresh, stable.tier) * pedigreeMul;
      const breezeSeconds =
        kind === "2yo_training" ? generateBreezeSeconds(resolvedFresh, rng) : undefined;
      lots.push({
        id: generateUUID(rng),
        horseId: resolvedFresh.id,
        consignorStableId: stable.id,
        saleId,
        reservePrice: Math.round(baseValue * policy.reserveMultiplier),
        passed: false,
        withdrawn: false,
        breezeSeconds,
      });
    }
  }

  return {
    id: saleId,
    name,
    day,
    kind,
    lots,
    resolved: false,
  };
}

// ---------------------------------------------------------------------------
// Sale resolution
// ---------------------------------------------------------------------------

// Sale resolution extracted to auctionResolution.ts
export { resolveAuctionSale, type ResolvedSale } from "./auctionResolution";
