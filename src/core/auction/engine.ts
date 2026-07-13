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
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import {
  calculateBiddingValue,
  calculateMaxBid,
  shouldBidOnHorse,
  createAuctionAIState,
  recordBiddingDecision,
} from "@/core/ai/auctionAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { SALE_TRIGGERS, KIND_LABELS } from "./data";
import {
  CONSIGNMENT_COMMISSION,
  AUCTION_AGGRESSIVE_PREMIUM,
  AUCTION_2YO_TRAINING_PREMIUM,
  AUCTION_CONSERVATIVE_DISCOUNT,
  AUCTION_YEARLING_PREMIUM,
  AUCTION_WEANLING_PREMIUM,
  AUCTION_RACING_AGE_DISCOUNT,
  AUCTION_WEANLING_DISCOUNT,
  AUCTION_BROODMARE_DISCOUNT,
  AUCTION_FILLY_PREMIUM,
  AUCTION_BROODMARE_PREMIUM,
  AUCTION_RACING_AGE_PREMIUM,
  AUCTION_RESERVE_SPECIALIST,
  AUCTION_RESERVE_AGGRESSIVE,
  AUCTION_RESERVE_SPECIALIST_LOW,
  AUCTION_RESERVE_BREEDER,
  AUCTION_RESERVE_CONSERVATIVE,
  AUCTION_RESERVE_ELITE,
  AUCTION_AGGRESSIVE_BID_MIN_PERCENT,
  AUCTION_AGGRESSIVE_BID_VARIANCE,
  DEFAULT_PLAYER_RESERVE_RATIO,
} from "@/constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Compute net proceeds the player receives after commission. */
/**
 * Calculate net proceeds from hammer price after commission.
 *
 * @param hammerPrice - The hammer price of the lot
 * @returns Net proceeds after consignment commission
 */
export function netProceeds(hammerPrice: number): number {
  return Math.round(hammerPrice * (1 - CONSIGNMENT_COMMISSION));
}

/**
 * Compute the commission taken from a hammer price.
 *
 * @param hammerPrice - The hammer price of the lot
 * @returns Commission amount
 */
export function commissionAmount(hammerPrice: number): number {
  return hammerPrice - netProceeds(hammerPrice);
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
interface ValuationContext {
  horse: Horse;
  stable: Stable;
  saleKind: AuctionSaleKind;
  base: number;
  isYearling: boolean;
  isWeanling: boolean;
  isFilly: boolean;
  is2yoTraining: boolean;
  isBroodmare: boolean;
  isRacingAge: boolean;
}

/**
 * Aggressive valuation strategy.
 *
 * Aggressive stables bid 30% above base value, with an additional 25% premium for 2yo training.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function aggressiveValuation(ctx: ValuationContext): number {
  let mod = 1.0 + AUCTION_AGGRESSIVE_PREMIUM;
  if (ctx.is2yoTraining) mod *= 1.0 + AUCTION_2YO_TRAINING_PREMIUM;
  return mod;
}

/**
 * Conservative valuation strategy.
 *
 * Conservative stables bid 25% below base value.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function conservativeValuation(ctx: ValuationContext): number {
  return 1.0 - AUCTION_CONSERVATIVE_DISCOUNT;
}

/**
 * Developer valuation strategy.
 *
 * Developers pay premiums for yearlings (40%) and weanlings (20%), but discount racing age horses (30%).
 * They also value broodmares (10% premium) but discount 2yo training (10% discount).
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function developerValuation(ctx: ValuationContext): number {
  let mod = ctx.isYearling
    ? 1.0 + AUCTION_YEARLING_PREMIUM
    : ctx.isWeanling
      ? 1.0 + AUCTION_WEANLING_PREMIUM
      : 1.0 - AUCTION_RACING_AGE_DISCOUNT;
  if (ctx.is2yoTraining) mod *= 0.9;
  if (ctx.isBroodmare) mod *= 1.1;
  if (ctx.isRacingAge) mod *= 1.0 - AUCTION_RACING_AGE_DISCOUNT;
  return mod;
}

/**
 * Win-now valuation strategy.
 *
 * Win-now stables focus on racing age horses (30% premium) and 2yo training (25% premium).
 * They discount weanlings (40% discount) and broodmares (60% discount).
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function winNowValuation(ctx: ValuationContext): number {
  let mod = ctx.isWeanling ? 1.0 - AUCTION_WEANLING_DISCOUNT : ctx.isYearling ? 0.9 : 1.0;
  if (ctx.is2yoTraining) mod *= 1.0 + AUCTION_2YO_TRAINING_PREMIUM;
  if (ctx.isBroodmare) mod *= 1.0 - AUCTION_BROODMARE_DISCOUNT;
  if (ctx.isRacingAge) mod *= 1.0 + AUCTION_RACING_AGE_PREMIUM;
  return mod;
}

/**
 * Specialist valuation strategy.
 *
 * Specialists pay a 50% premium if the horse matches their preferred distance, otherwise a 50% discount.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function specialistValuation(ctx: ValuationContext): number {
  const distanceMatch =
    ctx.stable.preferredDistance !== undefined &&
    Math.abs((ctx.stable.preferredDistance ?? 1600) - 1600) < 400;
  return distanceMatch ? 1.5 : 0.5;
}

/**
 * Breeder valuation strategy.
 *
 * Breeders pay a 60% premium for fillies and a 50% premium for broodmares.
 * They also pay an additional 20% premium for Blue Hen dams.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function breederValuation(ctx: ValuationContext): number {
  let mod = ctx.isFilly ? 1.0 + AUCTION_FILLY_PREMIUM : 0.7;
  if (ctx.horse.damName && ctx.horse.blueHenStatus?.isBlueHen) mod *= 1.2;
  if (ctx.isBroodmare) mod *= 1.0 + AUCTION_BROODMARE_PREMIUM;
  return mod;
}

/**
 * Trader valuation strategy.
 *
 * Traders bid 15% below base value, looking for bargains they can flip.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function traderValuation(ctx: ValuationContext): number {
  return 0.85;
}

/**
 * Prestige valuation strategy.
 *
 * Prestige stables pay premiums based on horse fame (0.5% per fame point), with a base 20% premium.
 * They only bid on horses valued over $5,000 and pay an additional 30% premium for racing age horses.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function prestigeValuation(ctx: ValuationContext): number {
  let mod = 1.2 + ctx.horse.fame / 200;
  if (ctx.base < 5000) mod = 0;
  if (ctx.isRacingAge) mod *= 1.0 + AUCTION_RACING_AGE_PREMIUM;
  return mod;
}

const VALUATION_STRATEGIES: Record<Stable["personality"], (ctx: ValuationContext) => number> = {
  aggressive: aggressiveValuation,
  conservative: conservativeValuation,
  developer: developerValuation,
  "win-now": winNowValuation,
  specialist: specialistValuation,
  breeder: breederValuation,
  trader: traderValuation,
  prestige: prestigeValuation,
};

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
export function calculateLotValuation(
  horse: Horse,
  stable: Stable,
  saleKind: AuctionSaleKind,
  allHorses?: readonly Horse[],
  horseMap?: Map<string, Horse>,
): number {
  const pedigreeMul = allHorses ? pedigreeMultiplier(horse, { horses: Object.fromEntries(allHorses.map(h => [h.id, h])) }, horseMap) : 1;
  const base = Math.round(calculateNpcHorseValue(horse, stable.tier) * pedigreeMul);

  const p = stable.personality;
  const cfg = PERSONALITY_CONFIG[p];
  const isYearling = saleKind === "yearling" || saleKind === "yearling_south";
  const isWeanling = saleKind === "weanling" || saleKind === "weanling_south";
  const isFilly = isFemaleHorse(horse.gender);
  const is2yoTraining = saleKind === "2yo_training";
  const isBroodmare = saleKind === "broodmare";
  const isRacingAge = saleKind === "racing_age";

  const ctx: ValuationContext = {
    horse,
    stable,
    saleKind,
    base,
    isYearling,
    isWeanling,
    isFilly,
    is2yoTraining,
    isBroodmare,
    isRacingAge,
  };

  const strategy = VALUATION_STRATEGIES[p] || (() => 1.0);
  let mod = strategy(ctx);

  // Common premiums applied to all personalities
  const conformationVal = horse.stats?.conformation ?? horse.conformation ?? 50;
  const temperamentVal = horse.stats?.temperament ?? horse.temperament ?? 50;
  if (conformationVal >= 90) mod *= 1.1;
  if (temperamentVal >= 90) mod *= 1.05;

  // Youth preference from cfg modulates the yearling/weanling bonus
  if ((isYearling || isWeanling) && cfg.youthPreference > 0.5) {
    mod *= 1 + (cfg.youthPreference - 0.5) * 0.3;
  }

  // Broodmare specific common premium
  if (isBroodmare && horse.blueHenStatus?.isBlueHen) {
    mod *= 1.3;
  }

  // Racing age fame premium
  if (isRacingAge && horse.fame > 30) {
    mod *= 1.0 + horse.fame / 200;
  }

  return Math.max(0, Math.round(base * mod));
}

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
      const shouldBid = shouldBidOnHorse(aiState.auctionAI, horse, tempLot, stable, currentDay);
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
    if (horse.gender !== "mare" && horse.gender !== "filly") return false;
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
interface ConsignmentContext {
  stable: Stable;
  kind: AuctionSaleKind;
  allHorses: readonly Horse[];
  rng: Rng;
  owned: Horse[];
  fillies: Horse[];
  colts: Horse[];
  unraced: Horse[];
  fading: Horse[];
  top: Horse[];
}

type ConsignmentPolicyResult = {
  consign: Horse[];
  freshCount: number;
  reserveMultiplier: number;
};

const CONSIGNMENT_STRATEGIES: Record<
  Stable["personality"],
  (ctx: ConsignmentContext) => ConsignmentPolicyResult
> = {
  aggressive: (ctx) => ({
    consign: ctx.owned.filter((h) => h.age === 0).slice(0, 3),
    freshCount:
      ctx.kind === "weanling" || ctx.kind === "weanling_south"
        ? ctx.rng.int(1, 3)
        : ctx.rng.int(0, 2),
    reserveMultiplier: 0.5,
  }),
  conservative: (ctx) => ({
    consign: ctx.owned.length > 8 ? ctx.owned.slice(8, 10) : [],
    freshCount: ctx.rng.int(0, 1),
    reserveMultiplier: AUCTION_RESERVE_CONSERVATIVE,
  }),
  developer: (ctx) => ({
    consign:
      ctx.kind === "yearling" || ctx.kind === "yearling_south"
        ? ctx.owned.slice(0, 4)
        : ctx.kind === "weanling" || ctx.kind === "weanling_south"
          ? ctx.owned.slice(0, 2)
          : ctx.owned.slice(0, 1),
    freshCount: ctx.rng.int(1, 3),
    reserveMultiplier: 0.5,
  }),
  "win-now": (ctx) => {
    let consign: Horse[] = [];
    if (ctx.kind === "broodmare")
      consign = ctx.fading.filter((h) => h.gender === "mare").slice(0, 3);
    else if (ctx.kind === "racing_age")
      consign = ctx.fading.filter((h) => h.gender !== "mare").slice(0, 3);
    else if (ctx.kind === "2yo_training")
      consign = ctx.unraced.filter((h) => h.age === 2).slice(0, 3);
    else if (ctx.kind === "mixed") consign = ctx.fading.slice(0, 2);

    return {
      consign,
      reserveMultiplier: 0.4,
      freshCount: ctx.rng.int(0, 2),
    };
  },
  specialist: (ctx) => {
    const offNiche = ctx.owned.filter((h) => {
      if (
        ctx.stable.preferredDistance &&
        Math.abs(h.distanceAptitude - ctx.stable.preferredDistance) > 600
      )
        return true;
      if (ctx.stable.preferredSurface) {
        const apts = h.surfaceAptitude;
        const best = (Object.entries(apts) as [keyof typeof apts, number][]).sort(
          (a, b) => b[1] - a[1],
        )[0];
        if (best[0] !== ctx.stable.preferredSurface) return true;
      }
      return false;
    });
    return {
      consign: offNiche.slice(0, 3),
      freshCount: ctx.rng.int(0, 2),
      reserveMultiplier: AUCTION_RESERVE_SPECIALIST,
    };
  },
  breeder: (ctx) => ({
    consign:
      ctx.kind === "broodmare"
        ? ctx.fading.filter((h) => h.gender === "mare").slice(0, 4)
        : ctx.colts.slice(0, 4),
    freshCount: ctx.rng.int(2, 4),
    reserveMultiplier: AUCTION_RESERVE_BREEDER,
  }),
  trader: (ctx) => ({
    consign: ctx.owned.slice(0, 5),
    freshCount: ctx.rng.int(1, 3),
    reserveMultiplier: 0.55,
  }),
  prestige: (ctx) => ({
    consign: ctx.top.filter((h) => h.fame >= 25 || h.potential >= 85).slice(0, 2),
    freshCount: ctx.rng.int(0, 1),
    reserveMultiplier: AUCTION_RESERVE_ELITE,
  }),
};

/**
 * High-level consignment policy for NPC stables.
 *
 * Each personality type decides what horses to list based on age, gender, and
 * performance. Returns an object describing the horses to consign from their
 * own roster + how many "fresh" NPC horses to generate for that sale.
 *
 * @param stable - The NPC stable
 * @param kind - Type of auction sale
 * @param allHorses - All horses in the game
 * @param rng - Random number generator
 * @returns Object with consign array, freshCount, and reserveMultiplier
 */
export function personalityConsignmentPolicy(
  stable: Stable,
  kind: AuctionSaleKind,
  allHorses: readonly Horse[],
  rng: Rng,
): { consign: Horse[]; freshCount: number; reserveMultiplier: number } {
  const owned: Horse[] = [];
  for (const h of allHorses) {
    if (h.stableId === stable.id && isLotEligible(h, kind)) {
      owned.push(ensurePhenotypeResolved(h));
    }
  }
  const p = stable.personality;

  // Helper picks
  const fillies = owned.filter((h) => isFemaleHorse(h.gender));
  const colts = owned.filter((h) => isMaleHorse(h.gender) || h.gender === "gelding");
  const unraced = owned.filter((h) => h.careerStarts === 0);
  const fading = owned.filter((h) => h.age >= h.peakAge + 2);
  const top = [...owned].sort((a, b) => b.fame + b.potential - (a.fame + a.potential));

  const ctx: ConsignmentContext = {
    stable,
    kind,
    allHorses,
    rng,
    owned,
    fillies,
    colts,
    unraced,
    fading,
    top,
  };

  const strategy =
    CONSIGNMENT_STRATEGIES[p] ||
    (() => ({
      consign: [],
      freshCount: 0,
      reserveMultiplier: 0.5,
    }));

  const result = strategy(ctx);

  // Filter out anything already consigned to a different sale.
  result.consign = result.consign.filter((h) => !h.consignedSaleId);

  return result;
}

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
      const pedigreeMul = pedigreeMultiplier(horse, { horses: Object.fromEntries(allHorses.map(h => [h.id, h])) });
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
      const pedigreeMul = pedigreeMultiplier(resolvedFresh, { horses: Object.fromEntries(allHorses.map(h => [h.id, h])) });
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

export type ResolvedSale = {
  lots: AuctionLot[];
  log: string[];
};

/**
 * Run the full NPC-vs-NPC auction resolution.
 *
 * Processes all lots, resolves bids, and returns updated lots with hammerPrice,
 * soldToStableId, and passed status set. Player bids are already recorded.
 *
 * @param sale - The auction sale to resolve
 * @param stables - All NPC stables for bidding
 * @param allHorses - All horses in the game
 * @returns Resolved sale with updated lots and log
 */
export function resolveAuctionSale(
  sale: AuctionSale,
  stables: Stable[],
  allHorses: Horse[],
): ResolvedSale {
  const log: string[] = [];
  const updatedLots: AuctionLot[] = [];

  // Bidders: all major stables (not the consignor for their own lot)
  const bidderStables = stables.filter((s) => s.isMajor);
  const horseMap = new Map(allHorses.map((h) => [h.id, h]));

  for (const lot of sale.lots) {
    if (lot.withdrawn) {
      updatedLots.push(lot);
      continue;
    }

    let horse = horseMap.get(lot.horseId);
    if (!horse) {
      updatedLots.push({ ...lot, passed: true });
      continue;
    }
    horse = ensurePhenotypeResolved(horse);

    if (horse.lifecycleStatus === "deceased") {
      updatedLots.push({ ...lot, withdrawn: true });
      log.push(`${horse.name} — withdrawn (deceased)`);
      continue;
    }

    // Start from existing hammer price (player may have placed a book bid)
    let currentBid = lot.hammerPrice ?? 0;
    let currentWinner: string | undefined = lot.soldToStableId;

    // Determine bidder list (exclude consignor)
    const eligibleBidders = bidderStables.filter((s) => s.id !== lot.consignorStableId);

    // Run multiple rounds until no one raises
    let raised = true;
    while (raised) {
      raised = false;
      for (const stable of eligibleBidders) {
        if (stable.id === currentWinner) continue;
        const rng = createRng(hashStr(lot.id + stable.id + String(currentBid)));
        const bid = calculateNpcBid(stable, horse, currentBid, sale.kind, rng, allHorses, horseMap);

        if (bid !== null && bid > currentBid) {
          currentBid = bid;
          currentWinner = stable.id;
          raised = true;
        }
      }
    }

    // Check reserve
    if (currentBid < lot.reservePrice || currentWinner === undefined) {
      updatedLots.push({ ...lot, passed: true, hammerPrice: undefined, soldToStableId: undefined });
      log.push(`${horse.name} — passed (reserve not met)`);
    } else {
      updatedLots.push({
        ...lot,
        hammerPrice: currentBid,
        soldToStableId: currentWinner,
        passed: false,
      });
      const winner = stables.find((s) => s.id === currentWinner);
      log.push(
        `${horse.name} — sold to ${winner?.name ?? "Unknown"} for $${currentBid.toLocaleString()}`,
      );
    }
  }

  return { lots: updatedLots, log };
}
