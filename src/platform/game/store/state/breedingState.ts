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

import type {
  Pregnancy,
  ShareTransaction,
  ShareActivityFeedItem,
} from "@/domains/breeding/model/types";
import type { TripleCrownProgress } from "@/domains/calendar/model/campaignTypes";
import type { BreedingProgram } from "@/domains/breeding/simulation/programs";
import type { Syndicate } from "@/domains/breeding/model/types";
import type { SyndicateValueSnapshot } from "@/domains/breeding/simulation/syndicateLedger";
import type { InvestorRecord } from "@/domains/breeding/model/investorTypes";
import type { HorseId } from "@/shared/types/branded";
import type { RivalStake } from "@/domains/syndicates/model/rivalStakes";

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
  /** Activity feed for syndicate share transactions, fee distributions and devolution events */
  shareActivityFeed: ShareActivityFeedItem[];
  /** Daily per-syndicate stake value snapshots for the ledger time series */
  syndicateValueSnapshots: SyndicateValueSnapshot[];
  /** Saved mating plans for reuse across breeding seasons */
  savedMatingPlans: SavedMatingPlan[];
  /** Player stakes in rival stables' racehorses, keyed by horse id */
  rivalStakes: Record<string, RivalStake>;
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
    syndicateValueSnapshots: [],
    savedMatingPlans: [],
    rivalStakes: {},
  };
}
