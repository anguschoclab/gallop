import type { Horse, Stable, AuctionLot, AuctionSale, AuctionSaleKind } from "./types";
import { generateNpcHorse } from "./npcHorseGen";
import { calculateNpcHorseValue } from "./npcHorseGen";
import { PERSONALITY_CONFIG } from "./npcStables";
import { createRng, hashStr, type Rng } from "./rng";
import { generateUUID } from "./uuid";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const KIND_LABELS: Record<AuctionSaleKind, string> = {
  weanling: "Weanling Sale",
  yearling: "Yearling Sale",
  weanling_south: "Southern Weanling Sale",
  yearling_south: "Southern Yearling Sale",
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
  allHorses?: readonly Horse[]
): number {
  // Pedigree multiplier raises the ceiling for foals by elite stallions out
  // of blue-hen mares. Falls back to 1× when allHorses isn't passed (older
  // call sites still work; new sites pass the live horses[] array).
  const pedigreeMul = allHorses ? pedigreeMultiplier(horse, { horses: [...allHorses] }) : 1;
  const base = Math.round(calculateNpcHorseValue(horse, stable.tier) * pedigreeMul);
  const p = stable.personality;
  const cfg = PERSONALITY_CONFIG[p];
  const isYearling = saleKind === "yearling" || saleKind === "yearling_south";
  const isWeanling = saleKind === "weanling" || saleKind === "weanling_south";
  const isFilly = horse.gender === "filly" || horse.gender === "mare";

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
      mod = 1.2 + (horse.fame / 200);
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

  return Math.max(0, Math.round(base * mod));
}

// ---------------------------------------------------------------------------
// NPC bidding
// ---------------------------------------------------------------------------

const BUDGET_CAPS: Record<Stable["personality"], number> = {
  aggressive: 0.35,
  conservative: 0.15,
  developer: 0.30,
  "win-now": 0.20,
  specialist: 0.25,
  breeder: 0.35,
  trader: 0.20,
  prestige: 0.40,
};

/**
 * Returns the next NPC bid amount, or null if the stable passes.
 */
export function calculateNpcBid(
  stable: Stable,
  horse: Horse,
  currentBid: number,
  saleKind: AuctionSaleKind,
  rng: ReturnType<typeof createRng>,
  allHorses?: readonly Horse[]
): number | null {
  const ceiling = calculateLotValuation(horse, stable, saleKind, allHorses);
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
};

const HEMISPHERE_BY_KIND: Record<AuctionSaleKind, "Northern" | "Southern"> = {
  weanling: "Northern",
  yearling: "Northern",
  weanling_south: "Southern",
  yearling_south: "Southern",
};

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
  rng: Rng
): AuctionSale {
  const saleId = generateUUID(rng);
  const eligibleAges = ELIGIBLE_AGES_BY_KIND[kind];
  const hemisphere = HEMISPHERE_BY_KIND[kind];
  const lots: AuctionLot[] = [];

  // Use NPC major stables that are breeders/developers/traders as primary consignors
  const consignorPersonalities: Stable["personality"][] = ["breeder", "developer", "trader"];
  const consignors = stables.filter((s) => s.isMajor && consignorPersonalities.includes(s.personality));

  for (const stable of consignors) {
    // Each consignor contributes 1–4 lots from their inventory of eligible-age horses
    const stableHorses = allHorses.filter(
      (h) => h.stableId === stable.id && eligibleAges.includes(h.age) && h.hemisphere === hemisphere
    );

    // If inventory is thin, generate fresh NPC lots
    const inventoryLots = stableHorses.slice(0, 4);
    const freshCount = Math.max(0, rng.int(1, 4) - inventoryLots.length);

    for (const horse of inventoryLots) {
      lots.push({
        id: generateUUID(rng),
        horseId: horse.id,
        consignorStableId: stable.id,
        saleId,
        reservePrice: Math.round(calculateNpcHorseValue(horse, stable.tier) * 0.5),
        passed: false,
        withdrawn: false,
      });
    }

    for (let i = 0; i < freshCount; i++) {
      const freshHorse = generateNpcHorse(stable.id, stable.tier, rng, eligibleAges[0], undefined, hemisphere);
      allHorses.push(freshHorse);
      lots.push({
        id: generateUUID(rng),
        horseId: freshHorse.id,
        consignorStableId: stable.id,
        saleId,
        reservePrice: Math.round(calculateNpcHorseValue(freshHorse, stable.tier) * 0.5),
        passed: false,
        withdrawn: false,
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
  allHorses: Horse[]
): ResolvedSale {
  const log: string[] = [];
  const updatedLots: AuctionLot[] = [];

  // Bidders: all major stables (not the consignor for their own lot)
  const bidderStables = stables.filter((s) => s.isMajor);

  for (const lot of sale.lots) {
    if (lot.withdrawn) {
      updatedLots.push(lot);
      continue;
    }

    const horse = allHorses.find((h) => h.id === lot.horseId);
    if (!horse) {
      updatedLots.push({ ...lot, passed: true });
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
        const bid = calculateNpcBid(stable, horse, currentBid, sale.kind, rng, allHorses);
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
      updatedLots.push({ ...lot, hammerPrice: currentBid, soldToStableId: currentWinner, passed: false });
      const winner = stables.find((s) => s.id === currentWinner);
      log.push(`${horse.name} — sold to ${winner?.name ?? "Unknown"} for $${currentBid.toLocaleString()}`);
    }
  }

  return { lots: updatedLots, log };
}
