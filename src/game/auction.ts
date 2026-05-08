import type { Horse, Pregnancy, Stable, AuctionLot, AuctionSale, AuctionSaleKind } from "./types";
import { generateNpcHorse } from "@/core/horse/horseFactory";
import { calculateNpcHorseValue } from "@/core/horse/pricing";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { createRng, hashStr, type Rng } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import {
  calculateBiddingValue,
  calculateMaxBid,
  shouldBidOnHorse,
  createAuctionAIState,
  recordBiddingDecision,
} from "@/core/ai/auctionAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sale-house cut taken from the hammer price of player consignments. 6%. */
export const CONSIGNMENT_COMMISSION = 0.06;

/** Default reserve as a fraction of base value when the player consigns. */
export const DEFAULT_PLAYER_RESERVE_RATIO = 0.7;

/** Compute net proceeds the player receives after commission. */
export function netProceeds(hammerPrice: number): number {
  return Math.round(hammerPrice * (1 - CONSIGNMENT_COMMISSION));
}

/** Compute the commission taken from a hammer price. */
export function commissionAmount(hammerPrice: number): number {
  return hammerPrice - netProceeds(hammerPrice);
}

// ---------------------------------------------------------------------------
// Labels & Schedule
// ---------------------------------------------------------------------------

export const SALE_TRIGGERS: { doy: number; kind: AuctionSaleKind; name: string }[] = [
  { doy: 75, kind: "2yo_training", name: "Spring 2YO Breeze-Up Sale" },
  { doy: 90, kind: "weanling", name: "Spring Weanling Sale" },
  { doy: 105, kind: "yearling_south", name: "Southern Yearling Sale" },
  { doy: 165, kind: "mixed", name: "Midsummer Mixed Sale" },
  { doy: 240, kind: "yearling", name: "Late Summer Yearling Sale" },
  { doy: 270, kind: "racing_age", name: "Autumn Horses-of-Racing-Age Sale" },
  { doy: 290, kind: "weanling_south", name: "Southern Weanling Sale" },
  { doy: 335, kind: "broodmare", name: "Year-End Broodmare & Breeding Stock Sale" },
];

export const KIND_LABELS: Record<AuctionSaleKind, string> = {
  weanling: "Weanling Sale",
  yearling: "Yearling Sale",
  weanling_south: "Southern Weanling Sale",
  yearling_south: "Southern Yearling Sale",
  mixed: "Mixed Sale",
  broodmare: "Broodmare & Breeding Stock Sale",
  "2yo_training": "2YOs in Training Sale",
  racing_age: "Horses-of-Racing-Age Sale",
};

// ---------------------------------------------------------------------------
// Lot valuation
// ---------------------------------------------------------------------------

/**
 * Calculate how much a stable values a given auction lot.
 * Returns a dollar figure representing their ceiling bid.
 */
export function calculateLotValuation(
  horse: Horse,
  stable: Stable,
  saleKind: AuctionSaleKind,
  allHorses?: readonly Horse[],
  horseMap?: Map<string, Horse>,
): number {
  // Pedigree multiplier raises the ceiling for foals by elite stallions out
  // of blue-hen mares. Falls back to 1× when allHorses isn't passed (older
  // call sites still work; new sites pass the live horses[] array).
  const pedigreeMul = allHorses ? pedigreeMultiplier(horse, { horses: allHorses }, horseMap) : 1;
  const base = Math.round(calculateNpcHorseValue(horse, stable.tier) * pedigreeMul);

  const p = stable.personality;
  const cfg = PERSONALITY_CONFIG[p];
  const isYearling = saleKind === "yearling" || saleKind === "yearling_south";
  const isWeanling = saleKind === "weanling" || saleKind === "weanling_south";
  const isFilly = horse.gender === "filly" || horse.gender === "mare";
  const is2yoTraining = saleKind === "2yo_training";
  const isBroodmare = saleKind === "broodmare";
  const isRacingAge = saleKind === "racing_age";

  let mod = 1.0;

  switch (p) {
    case "aggressive":
      mod = 1.3;
      break;
    case "conservative":
      mod = 0.75;
      break;
    case "developer":
      mod = isYearling ? 1.4 : isWeanling ? 1.2 : 0.8;
      break;
    case "win-now":
      mod = isWeanling ? 0.6 : isYearling ? 0.9 : 1.0;
      break;
    case "specialist": {
      const distanceMatch =
        stable.preferredDistance !== undefined &&
        Math.abs((stable.preferredDistance ?? 1600) - 1600) < 400;
      mod = distanceMatch ? 1.5 : 0.5;
      break;
    }
    case "breeder":
      mod = isFilly ? 1.6 : 0.7;
      // Blue hen dam premium
      if (horse.damName && horse.blueHenStatus?.isBlueHen) mod *= 1.2;
      break;
    case "trader":
      mod = 0.85;
      break;
    case "prestige":
      mod = 1.2 + horse.fame / 200;
      if (base < 5000) mod = 0; // skip cheap lots
      break;
  }

  // Apply conformation and temperament premiums (both affect resale/performance)
  if (horse.conformation === "excellent") mod *= 1.1;
  if (horse.temperament === "excellent") mod *= 1.05;

  // Youth preference from cfg modulates the yearling/weanling bonus
  if ((isYearling || isWeanling) && cfg.youthPreference > 0.5) {
    mod *= 1 + (cfg.youthPreference - 0.5) * 0.3;
  }

  // Sale-kind specific premiums layered on top of personality mod
  if (is2yoTraining) {
    // Win-now and aggressive love a fast-breezing 2YO
    if (p === "win-now" || p === "aggressive") mod *= 1.25;
    if (p === "developer") mod *= 0.9; // they wanted them younger
  }
  if (isBroodmare) {
    if (p === "breeder") mod *= 1.5;
    if (p === "developer") mod *= 1.1;
    if (p === "win-now") mod *= 0.4;
    if (horse.blueHenStatus?.isBlueHen) mod *= 1.3;
  }
  if (isRacingAge) {
    if (p === "win-now" || p === "prestige") mod *= 1.3;
    if (p === "developer") mod *= 0.7;
    if (horse.fame > 30) mod *= 1.0 + horse.fame / 200;
  }

  return Math.max(0, Math.round(base * mod));
}

// ---------------------------------------------------------------------------
// NPC bidding
// ---------------------------------------------------------------------------

const BUDGET_CAPS: Record<Stable["personality"], number> = {
  aggressive: 0.35,
  conservative: 0.15,
  developer: 0.3,
  "win-now": 0.2,
  specialist: 0.25,
  breeder: 0.35,
  trader: 0.2,
  prestige: 0.4,
};

/**
 * Returns the next NPC bid amount, or null if the stable passes.
 * AI-driven decisions when npcAIManager is provided.
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
    const aiState = npcAIManager.stableStates.get(stable.id);
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

      // Calculate max bid using AI
      const maxBid = calculateMaxBid(aiState.auctionAI, horse, tempLot, stable, currentDay);

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
    const aggressiveBid = Math.min(Math.round(ceiling * (0.88 + rng.range(0, 0.07))), maxBid);
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
 * Generate a "breeze time" for a 2YO-in-training lot, expressed in seconds
 * for a 1/8-mile (≈202m) burst. Real OBS works range ~9.6s (elite) to ~11.0s
 * (slow). Faster horses get faster breezes; small RNG noise on top.
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
 * Decide which of a stable's horses it wants to put through the ring for
 * this sale kind. Each personality has its own logic; the goal is that
 * every personality has a coherent reason to consign, so sales feel
 * populated and varied rather than monotonous.
 *
 * Returns:
 *   - `consign`: the existing horses they'll list
 *   - `freshCount`: how many fresh NPC-generated lots they want to add on top
 *     (used when their actual inventory is thin / for filler stables)
 *   - `reserveMultiplier`: scales the reserve price (prestige sets high
 *     reserves on headliners; trader sets low to clear stock)
 */
export function personalityConsignmentPolicy(
  stable: Stable,
  kind: AuctionSaleKind,
  allHorses: readonly Horse[],
  rng: Rng,
): { consign: Horse[]; freshCount: number; reserveMultiplier: number } {
  const owned = allHorses.filter((h) => h.stableId === stable.id && isLotEligible(h, kind));
  const p = stable.personality;

  // Default reserve floor (50% of valuation) — overridden below.
  let reserveMultiplier = 0.5;

  // Helper picks
  const fillies = owned.filter((h) => h.gender === "filly" || h.gender === "mare");
  const colts = owned.filter(
    (h) => h.gender === "colt" || h.gender === "horse" || h.gender === "gelding",
  );
  const unraced = owned.filter((h) => h.careerStarts === 0);
  const fading = owned.filter((h) => h.age >= h.peakAge + 2);
  const top = [...owned].sort((a, b) => b.fame + b.potential - (a.fame + a.potential));

  let consign: Horse[] = [];
  let freshCount = 0;

  switch (p) {
    case "aggressive":
      // Sells weanlings & off-niche stock to fund yearling + racing buys.
      consign = owned.filter((h) => h.age === 0).slice(0, 3);
      freshCount = kind === "weanling" || kind === "weanling_south" ? rng.int(1, 3) : rng.int(0, 2);
      break;
    case "conservative":
      // Rare consignor. Only excess lots, with high reserves.
      consign = owned.length > 8 ? owned.slice(8, 10) : [];
      freshCount = rng.int(0, 1);
      reserveMultiplier = 0.7;
      break;
    case "developer":
      // Consigns yearlings they've prepped (existing core behavior).
      consign =
        kind === "yearling" || kind === "yearling_south"
          ? owned.slice(0, 4)
          : kind === "weanling" || kind === "weanling_south"
            ? owned.slice(0, 2)
            : owned.slice(0, 1);
      freshCount = rng.int(1, 3);
      break;
    case "win-now":
      // Dumps unraced 2YOs and fading older horses; doesn't really consign foals.
      if (kind === "broodmare") consign = fading.filter((h) => h.gender === "mare").slice(0, 3);
      else if (kind === "racing_age")
        consign = fading.filter((h) => h.gender !== "mare").slice(0, 3);
      else if (kind === "2yo_training") consign = unraced.filter((h) => h.age === 2).slice(0, 3);
      else if (kind === "mixed") consign = fading.slice(0, 2);
      reserveMultiplier = 0.4; // wants to clear
      freshCount = rng.int(0, 2);
      break;
    case "specialist": {
      // Consigns horses outside their distance/surface niche.
      const offNiche = owned.filter((h) => {
        if (
          stable.preferredDistance &&
          Math.abs(h.distanceAptitude - stable.preferredDistance) > 600
        )
          return true;
        if (stable.preferredSurface) {
          const apts = h.surfaceAptitude;
          const best = (Object.entries(apts) as [keyof typeof apts, number][]).sort(
            (a, b) => b[1] - a[1],
          )[0];
          if (best[0] !== stable.preferredSurface) return true;
        }
        return false;
      });
      consign = offNiche.slice(0, 3);
      freshCount = rng.int(0, 2);
      break;
    }
    case "breeder":
      // Consigns colts (keeps fillies as future broodmares); broodmares past peak.
      if (kind === "broodmare") consign = fading.filter((h) => h.gender === "mare").slice(0, 4);
      else consign = colts.slice(0, 4);
      freshCount = rng.int(2, 4);
      break;
    case "trader":
      // Flips anything past margin — generalist consignor.
      consign = owned.slice(0, 5);
      freshCount = rng.int(1, 3);
      reserveMultiplier = 0.55;
      break;
    case "prestige":
      // Selective. Only lists genuine headliners — and asks a king's ransom.
      consign = top.filter((h) => h.fame >= 25 || h.potential >= 85).slice(0, 2);
      freshCount = rng.int(0, 1);
      reserveMultiplier = 0.85;
      break;
  }

  // Filter out anything already consigned to a different sale.
  consign = consign.filter((h) => !h.consignedSaleId);
  // Filter out broodmares the consignor wants to keep covering this season — too noisy without state.
  return { consign, freshCount, reserveMultiplier };
}

/**
 * Generate a new AuctionSale with lots from NPC consignors + player-eligible horses.
 * Player horses must be consigned separately via consignHorse().
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

    for (const horse of policy.consign) {
      const pedigreeMul = pedigreeMultiplier(horse, { horses: allHorses });
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
      allHorses.push(freshHorse);
      const pedigreeMul = pedigreeMultiplier(freshHorse, { horses: allHorses });
      const baseValue = calculateNpcHorseValue(freshHorse, stable.tier) * pedigreeMul;
      const breezeSeconds =
        kind === "2yo_training" ? generateBreezeSeconds(freshHorse, rng) : undefined;
      lots.push({
        id: generateUUID(rng),
        horseId: freshHorse.id,
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
 * Run the full NPC-vs-NPC (and player bids already recorded) auction resolution.
 * Returns updated lots with hammerPrice / soldToStableId / passed set.
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

    const horse = horseMap.get(lot.horseId);
    if (!horse) {
      updatedLots.push({ ...lot, passed: true });
      continue;
    }


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
