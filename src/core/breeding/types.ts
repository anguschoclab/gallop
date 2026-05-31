/**
 * types.ts - Breeding type definitions
 *
 * This file provides type definitions for breeding-related concepts including
 * pregnancy, dosage profiles, and pedigree nodes.
 *
 * Dependencies: None (self-contained type definitions)
 * Related files: Used throughout the breeding module and game state
 */

export type Pregnancy = {
  id: string;
  sireId: string;
  damId: string;
  sireName: string;
  damName: string;
  conceivedDay: number;
  dueDay: number;
  resolved: boolean;
  foalId?: string;
  stage?: "early" | "mid" | "late" | "delivered";
  earlyChecked?: boolean;
  midChecked?: boolean;
  twin?: boolean;
  liveFoalGuarantee?: boolean;
  reBreedingAttempts?: number;
  refunded?: boolean;
  stableId?: string;
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
};

export interface ShareTransaction {
  id: string;
  syndicateId: string;
  stableId: string;
  shares: number;
  pricePerShare: number;
  day: number;
}

export interface Syndicate {
  id: string;
  stallionId: string;
  stallionName: string;
  totalShares: number; // usually 40 in real life
  shareHolders: Record<string, number>; // stableId -> share count
  sharePrice: number;
  studFee: number;
  isPublic: boolean;
  lifetimeEarnings: number; // accumulated stud fees
  // Shareholder satisfaction tracking (Phase 5)
  shareholderSatisfaction?: Record<string, number>; // stableId -> satisfaction (0-100)
  lastSatisfactionUpdate?: number; // day of last update
}
