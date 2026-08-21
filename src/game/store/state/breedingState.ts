/**
 * state/breedingState.ts - Breeding state management
 *
 * This file provides breeding-related state for reproduction tracking and lineage,
 * including pregnancies, Triple Crown history, and active breeding programs.
 *
 * Dependencies: ../types (Pregnancy, TripleCrownProgress), @/core/breeding/programs (BreedingProgram)
 * Related files: store.ts (uses breeding state), breeding.ts (breeding logic)
 */

// Breeding State - Reproduction and lineage tracking
// Includes pregnancies, stud careers, and breeding history

import type { Pregnancy, ShareTransaction, ShareActivityFeedItem } from "@/core/breeding/types";
import type { TripleCrownProgress } from "@/core/calendar/campaignTypes";
import type { BreedingProgram } from "@/core/breeding/programs";
import type { Syndicate } from "@/core/breeding/types";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import type { HorseId, InvestorId } from "@/core/types/branded";

export interface MatingPlanEntry {
  damId: HorseId;
  sireId: HorseId;
  liveFoalGuarantee: boolean;
}

export interface SavedMatingPlan {
  id: string;
  name: string;
  createdDay: number;
  entries: MatingPlanEntry[];
}

/**
 * Breeding-related state for reproduction tracking and lineage.
 */
export interface BreedingState {
  /** Active pregnancies */
  pregnancies: Pregnancy[];
  /** Historical record of Triple Crown attempts */
  triplecrownHistory?: TripleCrownProgress[];
  /** Player's active multi-generation breeding program (one at a time) */
  activeBreedingProgram: BreedingProgram | null;
  /** Stallion syndicates indexed by stallion ID */
  syndicates: Record<string, Syndicate>;
  /** Player-facing syndication investors keyed by investor id */
  syndicateInvestors: Record<string, InvestorRecord>;
  /** Share transaction history for syndicates */
  shareTransactions: ShareTransaction[];
  /** Activity feed for syndicate share transactions and devolution events */
  shareActivityFeed: ShareActivityFeedItem[];
  /** Saved mating plans for reuse across breeding seasons */
  savedMatingPlans: SavedMatingPlan[];
}

/**
 * Create default breeding state for new games.
 *
 * @returns Default breeding state with empty pregnancies and no active breeding program
 */
export function createDefaultBreedingState(): BreedingState {
  return {
    pregnancies: [],
    triplecrownHistory: [],
    activeBreedingProgram: null,
    syndicates: {},
    syndicateInvestors: {},
    shareTransactions: [],
    shareActivityFeed: [],
    savedMatingPlans: [],
  };
}
