import type { HorseStats } from "@/core/horse/types";

export type ScoutReport = {
  horseId: string;
  stableId: string;
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
  stableId?: string;
  amount: number;
  tick: number;
};

export type AuctionLot = {
  id: string;
  horseId: string;
  consignorStableId?: string;
  saleId: string;
  reservePrice: number;
  hammerPrice?: number;
  soldToStableId?: string;
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
  | "racing_age";

export type AuctionSale = {
  id: string;
  name: string;
  day: number;
  kind: AuctionSaleKind;
  lots: AuctionLot[];
  resolved: boolean;
};

export type PrivateSaleStatus = 'pending' | 'accepted' | 'countered' | 'declined' | 'expired';

export type PrivateSaleOffer = {
  id: string;
  horseId: string;
  fromStableId?: string;
  toStableId?: string;
  amount: number;
  counterAmount?: number;
  status: PrivateSaleStatus;
  createdDay: number;
  expiresDay: number;
};

export type Claim = {
  id: string;
  raceId: string;
  horseId: string;
  claimantStableId?: string;
  price: number;
  day: number;
};
