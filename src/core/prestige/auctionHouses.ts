/**
 * auctionHouses.ts - Auction house roster and prestige
 *
 * Every sale is staged by a house. A house's prestige drives the strength of the
 * bidding bench (hammer prices), the reserve level consignors set, and the
 * commission the house charges on top of the base rate.
 *
 * Dependencies: @/core/market/types (AuctionSaleKind), ./prestigeTypes
 * Related files: src/core/auction/data.ts (maps sale triggers to houses)
 */

import type { AuctionSaleKind } from "@/core/market/types";
import { prestigeMultiplier } from "./prestigeTypes";

/** Spread for house prestige multiplier (0.25 = ±25% at extremes). */
export const HOUSE_PRESTIGE_SPREAD = 0.25;

export type AuctionHouse = {
  id: string;
  name: string;
  shortName: string;
  country: string;
  /** 0-100 prestige score. */
  prestige: number;
  /** Extra commission points charged above the base consignment rate. */
  commissionSurcharge: number;
  /** Sale kinds this house stages. */
  kinds: AuctionSaleKind[];
  blurb: string;
};

export const AUCTION_HOUSES: AuctionHouse[] = [
  {
    id: "house-crownhill",
    name: "Crownhill Bloodstock",
    shortName: "Crownhill",
    country: "USA",
    prestige: 94,
    commissionSurcharge: 0.02,
    kinds: ["yearling", "racing_age"],
    blurb: "The blue-chip pavilion. Seven-figure yearlings and a bench that never blinks.",
  },
  {
    id: "house-tattersleigh",
    name: "Tattersleigh & Sons",
    shortName: "Tattersleigh",
    country: "Great Britain",
    prestige: 88,
    commissionSurcharge: 0.015,
    kinds: ["broodmare", "mixed"],
    blurb: "Old-world rostrum with the deepest broodmare book in Europe.",
  },
  {
    id: "house-avoncourt",
    name: "Avoncourt Sales Company",
    shortName: "Avoncourt",
    country: "Ireland",
    prestige: 76,
    commissionSurcharge: 0.01,
    kinds: ["2yo_training"],
    blurb: "Breeze-up specialists — the clock sells the horse here.",
  },
  {
    id: "house-marchetti",
    name: "Marchetti Equine Exchange",
    shortName: "Marchetti",
    country: "France",
    prestige: 61,
    commissionSurcharge: 0.005,
    kinds: ["weanling"],
    blurb: "A trader's ring: fast turnover, sharp pinhooking money.",
  },
  {
    id: "house-southern-cross",
    name: "Southern Cross Bloodstock",
    shortName: "Southern Cross",
    country: "Australia",
    prestige: 54,
    commissionSurcharge: 0,
    kinds: ["yearling_south", "weanling_south"],
    blurb: "The southern hemisphere circuit's principal sales ring.",
  },
  {
    id: "house-drover",
    name: "Drover Yard Auctions",
    shortName: "Drover Yard",
    country: "USA",
    prestige: 28,
    commissionSurcharge: 0,
    kinds: ["liquidation"],
    blurb: "No catalog gloss. Stock moves because it has to move.",
  },
];

export const AUCTION_HOUSE_BY_ID: Record<string, AuctionHouse> = Object.fromEntries(
  AUCTION_HOUSES.map((h) => [h.id, h]),
);

const HOUSE_BY_KIND: Partial<Record<AuctionSaleKind, AuctionHouse>> = (() => {
  const map: Partial<Record<AuctionSaleKind, AuctionHouse>> = {};
  for (const house of AUCTION_HOUSES) {
    for (const kind of house.kinds) {
      if (!map[kind] || map[kind]!.prestige < house.prestige) map[kind] = house;
    }
  }
  return map;
})();

/** Look up a house by id. */
export function getAuctionHouse(id?: string): AuctionHouse | undefined {
  return id ? AUCTION_HOUSE_BY_ID[id] : undefined;
}

/** The house that stages a given sale kind. */
export function getHouseForSaleKind(kind: AuctionSaleKind): AuctionHouse | undefined {
  return HOUSE_BY_KIND[kind];
}

/**
 * Resolve the house for a sale, preferring an explicit id and falling back to
 * the sale kind (keeps saves made before houses existed working).
 */
export function resolveSaleHouse(sale: {
  houseId?: string;
  kind: AuctionSaleKind;
}): AuctionHouse | undefined {
  return getAuctionHouse(sale.houseId) ?? getHouseForSaleKind(sale.kind);
}

/** Multiplier on ring money (reserves, valuations) for a house's prestige. */
export function housePrestigeMultiplier(house?: AuctionHouse): number {
  if (!house) return 1;
  return prestigeMultiplier(house.prestige, HOUSE_PRESTIGE_SPREAD);
}

/** Total commission rate charged by a house on top of the base rate. */
export function houseCommissionRate(baseRate: number, house?: AuctionHouse): number {
  return baseRate + (house?.commissionSurcharge ?? 0);
}
