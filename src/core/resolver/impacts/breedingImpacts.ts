/**
 * impacts/breedingImpacts.ts - Breeding impact types
 *
 * This file provides breeding-related impact types including pregnancy creation/update/deletion,
 * stud career updates, blue hen status, and stud fee updates.
 *
 * Dependencies: ./base (Impact), @/game/types (Pregnancy)
 * Related files: ../handlers/BreedingHandler.ts (handles impacts), ./index.ts (exports types)
 */

import type { Impact } from "./base";
import type { BlueHenStatus, Pregnancy, StudCareer } from "@/game/types";
import type { BlueHenImpact } from "./horseImpacts";

// Pregnancy creation impact
export interface PregnancyCreationImpact extends Impact {
  type: "pregnancy_creation";
  pregnancy: Pregnancy;
  reason: string;
}

// Pregnancy update impact
export interface PregnancyUpdateImpact extends Impact {
  type: "pregnancy_update";
  pregnancyId: string;
  updates: Partial<Pregnancy>;
  reason: string;
}

// Pregnancy deletion impact
export interface PregnancyDeletionImpact extends Impact {
  type: "pregnancy_deletion";
  pregnancyId: string;
  reason: string;
}

// Stud career impact
export interface StudCareerImpact extends Impact {
  type: "stud_career";
  horseId: string;
  studCareer: StudCareer;
  reason: string;
}

// Mare foaling update impact
export interface MareFoalingUpdateImpact extends Impact {
  type: "mare_foaling_update";
  horseId: string;
  lastFoaledDay: number;
  foalsProduced: string[];
  blueHenStatus: BlueHenStatus;
  reason: string;
}

// Update stud fee impact
export interface UpdateStudFeeImpact extends Impact {
  type: "update_stud_fee";
  horseId: string;
  newFee: number;
  reason: string;
}

// Syndicate creation impact
export interface SyndicateCreationImpact extends Impact {
  type: "syndicate_creation";
  syndicateId: string;
  stallionId: string;
  stallionName: string;
  totalShares: number;
  sharePrice: number;
  initialShareholders: Record<string, number>;
  reason: string;
}

// Share transaction impact
export interface ShareTransactionImpact extends Impact {
  type: "share_transaction";
  syndicateId: string;
  stableId: string;
  shares: number;
  pricePerShare: number;
  reason: string;
}

// Syndicate fee distribution impact
export interface SyndicateFeeDistributionImpact extends Impact {
  type: "syndicate_fee_distribution";
  syndicateId: string;
  totalFee: number;
  breedingDay: number;
  reason: string;
}

// Syndicate shareholder satisfaction impact (Phase 5)
export interface SyndicateSatisfactionImpact extends Impact {
  type: "syndicate_satisfaction";
  syndicateId: string;
  stableId: string;
  satisfactionDelta: number; // Can be positive or negative
  reason: string;
}

export type BreedingImpact =
  | PregnancyCreationImpact
  | PregnancyUpdateImpact
  | PregnancyDeletionImpact
  | StudCareerImpact
  | MareFoalingUpdateImpact
  | UpdateStudFeeImpact
  | BlueHenImpact
  | SyndicateCreationImpact
  | ShareTransactionImpact
  | SyndicateFeeDistributionImpact
  | SyndicateSatisfactionImpact;
