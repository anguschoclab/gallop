/**
 * houseQuotes.ts - Auction-house pricing desk
 *
 * Every auction house quotes a horse at its own level: prestige scales the
 * hammer estimate, and the house's commission surcharge sets the spread between
 * what a buyer pays and what a seller nets. Also builds the deterministic daily
 * catalogue of horses each house has on offer.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: @/core/horse/pricing, @/core/horse/ownership, @/core/common/rng,
 *   @/core/prestige/auctionHouses, ./exchange
 * Related files: src/game/store/slices/exchangeSlice.ts,
 *   src/components/market/AuctionHouseDesk.tsx
 */

import type { Horse } from "@/core/horse/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { isPlayerOwned } from "@/core/horse/ownership";
import { createRng } from "@/core/common/rng";
import {
  AUCTION_HOUSES,
  houseCommissionRate,
  housePrestigeMultiplier,
  type AuctionHouse,
} from "@/core/prestige/auctionHouses";
import { EXCHANGE_BASE_COMMISSION } from "./exchange";
import { sellerStandingBidFactor } from "./exchangeAI";
import { dailyTradeSeries } from "./tradeSeries";

export type HouseQuote = {
  house: AuctionHouse;
  /** Reference market valuation, house-agnostic. */
  fairValue: number;
  /** Prestige-adjusted hammer estimate at this house. */
  hammerEstimate: number;
  /** What a buyer pays (hammer + buyer's premium). */
  buyPrice: number;
  /** What a seller receives after the house takes its cut. */
  sellPrice: number;
  commissionRate: number;
  commission: number;
  /** Multiplier the house applies to the player's net, from their standing. */
  standingFactor: number;
  /** Reputation tier label behind standingFactor. */
  standingLabel: string;
};

/** How many lots a house has on its board on any given day. */
export const HOUSE_CATALOGUE_SIZE = 6;

/**
 * Price a horse at one auction house.
 *
 * @param horse - Horse being quoted
 * @param allHorses - World horses (valuation context)
 * @param house - Auction house doing the quoting
 * @param playerReputation - Player reputation score (0-1000); better standing
 *   earns a better net when selling through the house
 */
export function houseQuote(
  horse: Horse,
  allHorses: Horse[],
  house: AuctionHouse,
  playerReputation = 0,
): HouseQuote {
  const fairValue = Math.round(horseMarketValue(horse, allHorses));
  const hammerEstimate = Math.max(500, Math.round(fairValue * housePrestigeMultiplier(house)));
  const commissionRate = houseCommissionRate(EXCHANGE_BASE_COMMISSION, house);
  const commission = Math.round(hammerEstimate * commissionRate);
  const standing = sellerStandingBidFactor(playerReputation);
  return {
    house,
    fairValue,
    hammerEstimate,
    buyPrice: hammerEstimate + commission,
    sellPrice: Math.round((hammerEstimate - commission) * standing.factor),
    commissionRate,
    commission,
    standingFactor: standing.factor,
    standingLabel: standing.tierLabel,
  };
}

/**
 * Quote a horse at every house, best selling price first.
 *
 * @param horse - Horse being quoted
 * @param allHorses - World horses (valuation context)
 * @param houses - Houses to quote (defaults to the full roster)
 * @param playerReputation - Player reputation score (0-1000)
 */
export function houseQuotes(
  horse: Horse,
  allHorses: Horse[],
  houses: AuctionHouse[] = AUCTION_HOUSES,
  playerReputation = 0,
): HouseQuote[] {
  return houses
    .map((house) => houseQuote(horse, allHorses, house, playerReputation))
    .sort((a, b) => b.sellPrice - a.sellPrice);
}

/** Which houses will take a horse of a given age. */
function houseTakesHorse(house: AuctionHouse, horse: Horse): boolean {
  const age = horse.age ?? 0;
  return house.kinds.some((kind) => {
    switch (kind) {
      case "weanling":
      case "weanling_south":
        return age <= 0;
      case "yearling":
      case "yearling_south":
        return age === 1;
      case "2yo_training":
        return age === 2;
      case "racing_age":
        return age >= 2 && age <= 6;
      case "broodmare":
        return horse.gender === "mare" || horse.gender === "filly";
      case "mixed":
      case "liquidation":
        return true;
      default:
        return true;
    }
  });
}

export type HouseListing = HouseQuote & { horse: Horse };

/**
 * The deterministic set of lots a house has on its board today. Stable for a
 * given (day, house) pair so the board doesn't churn between renders.
 *
 * @param args.day - Current day
 * @param args.house - Auction house
 * @param args.horses - All horses in the world
 * @param args.size - Number of lots to offer
 */
export function buildHouseCatalogue(args: {
  day: number;
  house: AuctionHouse;
  horses: Horse[];
  size?: number;
}): HouseListing[] {
  const { day, house, horses, size = HOUSE_CATALOGUE_SIZE } = args;
  const eligible = horses.filter(
    (h) =>
      !isPlayerOwned(h) &&
      h.lifecycleStatus !== "deceased" &&
      !h.consignedSaleId &&
      houseTakesHorse(house, h),
  );
  if (eligible.length === 0) return [];

  const rng = createRng(`house-board:${house.id}:${day}`);
  const pool = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
  const picked: Horse[] = [];
  const used = new Set<number>();
  const count = Math.min(size, pool.length);
  // Soft cap per consignor so one big yard cannot fill a house board.
  const perStable = new Map<string, number>();
  const consignorOf = (h: Horse): string =>
    h.ownership.type === "npc" ? (h.ownership.stableId ?? "unassigned") : "unassigned";
  const MAX_LOTS_PER_STABLE = 2;
  let guard = 0;
  while (picked.length < count && guard < count * 40) {
    guard += 1;
    const idx = rng.int(0, pool.length - 1);
    if (used.has(idx)) continue;
    const horse = pool[idx];
    const consignor = consignorOf(horse);
    const lots = perStable.get(consignor) ?? 0;
    if (lots >= MAX_LOTS_PER_STABLE) continue;
    used.add(idx);
    perStable.set(consignor, lots + 1);
    picked.push(horse);
  }

  return picked
    .map((horse) => ({ ...houseQuote(horse, horses, house), horse }))
    .sort((a, b) => b.buyPrice - a.buyPrice);
}

/**
 * Daily price series for the house desk: average hammer price and volume of
 * completed trades, carried forward so the line stays continuous.
 *
 * @param trades - Completed exchange trades
 * @param day - Current day
 * @param windowDays - Length of the window
 */
export function housePriceSeries(
  trades: { day: number; price: number }[],
  day: number,
  windowDays = 30,
): { day: number; avgPrice: number; volume: number; turnover: number }[] {
  return dailyTradeSeries(trades, day, windowDays, { carryAvg: true });
}
