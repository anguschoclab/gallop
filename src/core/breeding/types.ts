/**
 * types.ts - Breeding type definitions
 *
 * This file provides type definitions for breeding-related concepts including
 * pregnancy, dosage profiles, and pedigree nodes.
 *
 * Dependencies: None (self-contained type definitions)
 * Related files: Used throughout the breeding module and game state
 */

import type { HorseId, StableId } from "@/core/types/branded";

export type Pregnancy = {
  id: string;
  sireId: HorseId;
  damId: HorseId;
  sireName: string;
  damName: string;
  conceivedDay: number;
  dueDay: number;
  resolved: boolean;
  foalId?: HorseId;
  stage?: "early" | "mid" | "late" | "delivered";
  earlyChecked?: boolean;
  midChecked?: boolean;
  twin?: boolean;
  liveFoalGuarantee?: boolean;
  reBreedingAttempts?: number;
  refunded?: boolean;
  stableId?: StableId;
  isPlayerOwned: boolean;
};

export type DosageProfile = {
  brilliant: number;
  intermediate: number;
  classic: number;
  solid: number;
  professional: number;
};

export type PedigreeNode = {
  horseId?: string;
  name: string;
  generation: number;
  aptitudinalGroup?: string;
  sireId?: string;
  damId?: string;
  sireName?: string;
  damName?: string;
  sirePedigree?: PedigreeNode;
  damPedigree?: PedigreeNode;
  /** True when this node is a pruned placeholder for a deeper ancestor. */
  isStub?: boolean;
};

export interface ShareTransaction {
  id: string;
  syndicateId: string;
  buyerStableId: import("@/core/types/branded").OwnerKey;
  sellerStableId: import("@/core/types/branded").OwnerKey;
  shares: number;
  pricePerShare: number;
  day: number;
}

export interface ShareActivityFeedItem {
  id: string;
  syndicateId: string;
  syndicateName: string;
  type: "share_purchase" | "share_sale" | "devolution" | "investor_solicit" | "investor_buyout";
  buyerStableId?: import("@/core/types/branded").OwnerKey;
  sellerStableId?: import("@/core/types/branded").OwnerKey;
  shares: number;
  pricePerShare: number;
  cashMoved: number;
  day: number;
  previousOwner?: string;
  newOwner?: string;
  stallionName?: string;
}

export interface Syndicate {
  id: string;
  stallionId: string;
  stallionName: string;
  totalShares: number; // usually 40 in real life
  shareHolders: Record<import("@/core/types/branded").OwnerKey, number>; // stableId -> share count
  sharePrice: number;
  studFee: number;
  isPublic: boolean;
  lifetimeEarnings: number; // accumulated stud fees
  // Shareholder satisfaction tracking (Phase 5)
  shareholderSatisfaction?: Record<import("@/core/types/branded").OwnerKey, number>; // stableId -> satisfaction (0-100)
  lastSatisfactionUpdate?: number; // day of last update
}
