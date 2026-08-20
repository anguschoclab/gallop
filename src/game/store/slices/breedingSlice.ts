/**
 * store/slices/breedingSlice.ts - Breeding state slice
 *
 * This file provides breeding-related state and actions for reproduction and lineage
 * tracking, including breeding, retirement, pregnancy management, and breeding
 * program management.
 *
 * Dependencies: @/game/types (Pregnancy, TripleCrownProgress, Horse), @/game/state/breedingState (BreedingState, createDefaultBreedingState), @/core/breeding/programs (createBreedingProgram, updateProgramProgress, BreedingProgram), @/core/breeding/archetypes (getArchetypeById), @/core/breeding/eligibility (canBreed, BreedResult), @/game/uuid (generateUUID), @/core/resolver/intents (BreedingIntent), @/game/constants (BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE), @/lib/formatting (formatCurrency), ../guards (requireOwned, requireHorse), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/core/breeding/programs.ts (breeding programs)
 */

/**
 * Breeding Slice
 * Breeding-related state and actions for reproduction and lineage tracking
 */

import type { Pregnancy, TripleCrownProgress } from "@/game/types";
import type {
  BreedingState,
  MatingPlanEntry,
  SavedMatingPlan,
} from "@/game/store/state/breedingState";
import { createDefaultBreedingState } from "@/game/store/state/breedingState";
import { canBreed, type BreedResult } from "@/core/breeding/eligibility";
import { generateUUID } from "@/core/uuid";
import type {
  BreedingIntent,
  SyndicateFeeDistributionIntent,
  AnyIntent,
} from "@/core/resolver/intents";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/constants";
import { requireOwned, requireHorse } from "../guards";
import type { StoreSet, StoreGet } from "../types";
import { createSyndicateActions, createBreedingBatchActions } from "./breedingActions";

export type BreedingSlice = BreedingState & {
  breed: (
    sireId: string,
    damId: string,
    liveFoalGuarantee?: boolean,
  ) => { ok: true } | { ok: false; reason: string };
  retireToPasture: (horseId: string) => { ok: true } | { ok: false; reason: string };
  setPregnancies: (pregnancies: Pregnancy[]) => void;
  setTriplecrownHistory: (history: TripleCrownProgress[]) => void;
  createSyndicate: (
    stallionId: string,
    totalShares: number,
    sharePrice: number,
    initialShareholders: Record<string, number>,
  ) => { ok: true } | { ok: false; reason: string };
  purchaseShares: (
    syndicateId: string,
    shares: number,
    pricePerShare: number,
  ) => { ok: true } | { ok: false; reason: string };
  sellShares: (
    syndicateId: string,
    shares: number,
    pricePerShare: number,
  ) => { ok: true } | { ok: false; reason: string };
  solicitInvestor: (
    syndicateId: string,
    sharesOffered: number,
  ) => { ok: true; investorId: string } | { ok: false; reason: string };
  buyoutInvestor: (investorId: string) => { ok: true } | { ok: false; reason: string };
  breedBatch: (entries: MatingPlanEntry[]) => {
    ok: boolean;
    results: BatchBreedResult[];
    reason?: string;
  };
  saveMatingPlan: (name: string, entries: MatingPlanEntry[]) => { ok: true; planId: string };
  deleteMatingPlan: (planId: string) => void;
  getSavedMatingPlan: (planId: string) => SavedMatingPlan | undefined;
};

export type BatchBreedResult = {
  damId: string;
  sireId: string;
  ok: boolean;
  reason?: string;
};

/**
 * Create the breeding state slice with breeding and retirement actions.
 *
 * Provides breeding, retirement to pasture, pregnancy management, and Triple Crown
 * history tracking. Uses intent-based state updates for breeding actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Breeding slice with state and actions
 */
export function createBreedingSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): BreedingSlice {
  return {
    ...createDefaultBreedingState(),

    breed: (sireId, damId, liveFoalGuarantee = false) => {
      const s = get();
      const sire = s.horses[sireId];
      const dam = s.horses[damId];
      const fail = (reason: string): { ok: false; reason: string } => {
        set({ log: [{ day: s.day, text: `Breeding: ${reason}` }, ...s.log].slice(0, 50) });
        return { ok: false, reason };
      };

      const eligibility: BreedResult = canBreed(sire, dam, s.day, s.pregnancies);
      if (!eligibility.ok) return fail(eligibility.reason);

      // External-stallion path: if the sire belongs to an NPC stable, charge
      // the player the stud fee (in addition to base breeding fee), credit
      // the stable, and increment the stallion's season-bookings counter.
      // If the stallion is syndicated, apply fee reduction based on player's share ownership.
      const isExternal = !!sire!.stableId;
      let studFee = 0;
      if (isExternal) {
        if (!sire!.stud?.atStud) return fail(`${sire!.name} is not standing at stud.`);
        if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
          return fail(`${sire!.name}'s book is full this season.`);
        }
        if (sire!.hemisphere !== dam!.hemisphere) {
          return fail("Cross-hemisphere breeding is not supported.");
        }

        // Check if stallion is syndicated and apply fee reduction
        const syndicate = s.syndicates?.[sireId];
        const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
        const totalShares = syndicate?.totalShares || 1;
        const playerSharePercentage = playerShareCount / totalShares;

        // Apply fee reduction: player only pays their share of the stud fee
        studFee = sire!.stud.standingFee * (1 - playerSharePercentage);

        // Enqueue fee distribution intent if syndicated
        if (syndicate && syndicate.totalShares > 0) {
          const feeDistIntent: SyndicateFeeDistributionIntent = {
            id: generateUUID(),
            entityId: sireId,
            source: "system",
            day: s.day,
            priority: 50,
            type: "syndicate_fee_distribution",
            syndicateId: syndicate.id,
            totalFee: sire!.stud.standingFee,
            breedingDay: s.day,
          };
          enqueueIntent(feeDistIntent);
        }
      }

      const totalFee = isExternal
        ? BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
        : 0;
      if (s.cash < totalFee) return fail("Insufficient cash for breeding fee.");

      // Enqueue BreedingIntent for next day advance
      const intent: BreedingIntent = {
        id: generateUUID(),
        entityId: damId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "breeding",
        sireId,
        damId,
        liveFoalGuarantee,
      };

      enqueueIntent({
        ...intent,
        fee: totalFee,
      });
      return { ok: true };
    },

    retireToPasture: (horseId: string) => {
      const s = get();
      const horse = requireHorse(s.horses, horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;
      if (horse.age < 3)
        return { ok: false, reason: "Horse must be at least 3 years old to retire." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "pasture_retirement",
        horseId,
      });

      return { ok: true };
    },

    setPregnancies: (pregnancies) => {
      set({ pregnancies });
    },

    setTriplecrownHistory: (history) => {
      set({ triplecrownHistory: history });
    },

    ...createSyndicateActions(set, get, enqueueIntent),

    ...createBreedingBatchActions(set, get, enqueueIntent),
  };
}
