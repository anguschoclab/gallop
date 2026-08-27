/**
 * market/types.ts - Market types
 *
 * This file provides types for market operations including scout reports,
 * auction lots and sales, private sale offers, and claiming races.
 *
 * Dependencies: @/core/horse/types (HorseStats)
 * Related files: None
 */

import type { HorseStats } from "@/core/horse/types";
import type { HorseId, OwnerKey, RaceId, StableId } from "@/core/types/branded";

export type ScoutReport = {
  horseId: HorseId;
  stableId: StableId;
  day: number;
  accuracy: number;
  revealedStats: Partial<HorseStats>;
  notes: string;
  geneticInsight?: {
    distanceMarker?: string;
    surfaceMarker?: string;
    hiddenColorCarrier?: string;
    abilityMarkers?: string[];
  };
};

export type AuctionBidRecord = {
  stableId?: OwnerKey;
  amount: number;
  tick: number;
};

export type AuctionLot = {
  id: string;
  horseId: HorseId;
  consignorStableId?: StableId;
  saleId: string;
  reservePrice: number;
  hammerPrice?: number;
  soldToStableId?: StableId;
  passed: boolean;
  withdrawn: boolean;
  bidHistory?: AuctionBidRecord[];
  breezeSeconds?: number;
  buyNowPrice?: number;
};

export type AuctionSaleKind =
  | "weanling"
  | "yearling"
  | "weanling_south"
  | "yearling_south"
  | "mixed"
  | "broodmare"
  | "2yo_training"
  | "racing_age"
  | "liquidation";

export type AuctionSale = {
  id: string;
  name: string;
  day: number;
  kind: AuctionSaleKind;
  lots: AuctionLot[];
  resolved: boolean;
  /** Auction house staging this sale (see @/core/prestige/auctionHouses). */
  houseId?: string;
};

export type PrivateSaleStatus = "pending" | "accepted" | "countered" | "declined" | "expired";

export type PrivateSaleOffer = {
  id: string;
  horseId: HorseId;
  fromStableId?: StableId;
  toStableId?: StableId;
  amount: number;
  counterAmount?: number;
  status: PrivateSaleStatus;
  createdDay: number;
  expiresDay: number;
};

export type Claim = {
  id: string;
  raceId: RaceId;
  horseId: HorseId;
  claimantStableId?: StableId;
  price: number;
  day: number;
};
