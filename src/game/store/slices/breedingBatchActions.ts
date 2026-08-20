/**
 * breedingBatchActions.ts - Batch breeding and mating plan actions
 *
 * Extracted from breedingActions.ts for modularity.
 */

import type { MatingPlanEntry, SavedMatingPlan } from "@/game/store/state/breedingState";
import { canBreed } from "@/core/breeding/eligibility";
import { generateUUID } from "@/core/uuid";
import type { BreedingIntent, AnyIntent } from "@/core/resolver/intents";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE, MAX_BATCH_BREEDING } from "@/constants";
import type { StoreSet, StoreGet } from "../types";
import type { BreedingSlice, BatchBreedResult } from "./breedingSlice";

export function createBreedingBatchActions(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): Pick<
  BreedingSlice,
  "breedBatch" | "saveMatingPlan" | "deleteMatingPlan" | "getSavedMatingPlan"
> {
  return {
    breedBatch: (entries: MatingPlanEntry[]) => {
      const s = get();
      if (entries.length > MAX_BATCH_BREEDING) {
        return {
          ok: false,
          results: [],
          reason: `Batch exceeds maximum of ${MAX_BATCH_BREEDING} entries.`,
        };
      }
      const results: BatchBreedResult[] = [];
      const processedDams = new Set<string>();
      let totalFee = 0;

      for (const entry of entries) {
        const sire = s.horses[entry.sireId];
        const dam = s.horses[entry.damId];

        if (processedDams.has(entry.damId)) {
          results.push({
            damId: entry.damId,
            sireId: entry.sireId,
            ok: false,
            reason: "Mare already assigned in this batch.",
          });
          continue;
        }

        const eligibility = canBreed(sire, dam, s.day, s.pregnancies ?? []);
        if (!eligibility.ok) {
          results.push({
            damId: entry.damId,
            sireId: entry.sireId,
            ok: false,
            reason: eligibility.reason,
          });
          continue;
        }

        const isExternal = !!sire!.stableId;
        let studFee = 0;
        if (isExternal) {
          if (!sire!.stud?.atStud) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: `${sire!.name} is not standing at stud.`,
            });
            continue;
          }
          if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: `${sire!.name}'s book is full this season.`,
            });
            continue;
          }
          if (sire!.hemisphere !== dam!.hemisphere) {
            results.push({
              damId: entry.damId,
              sireId: entry.sireId,
              ok: false,
              reason: "Cross-hemisphere breeding is not supported.",
            });
            continue;
          }

          const syndicate = s.syndicates?.[entry.sireId];
          const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
          const totalShares = syndicate?.totalShares || 1;
          const playerSharePercentage = playerShareCount / totalShares;
          studFee = sire!.stud.standingFee * (1 - playerSharePercentage);
        }

        const fee = isExternal
          ? BREEDING_FEE + (entry.liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
          : 0;
        totalFee += fee;
        processedDams.add(entry.damId);
        results.push({
          damId: entry.damId,
          sireId: entry.sireId,
          ok: true,
        });
      }

      if (s.cash < totalFee) {
        return {
          ok: false,
          results: [],
          reason: "Insufficient cash for batch.",
        };
      }

      for (let i = 0; i < entries.length; i++) {
        if (!results[i].ok) continue;
        const entry = entries[i];
        const sire = s.horses[entry.sireId];
        const isExternal = !!sire?.stableId;
        let studFee = 0;
        if (isExternal && sire?.stud) {
          const syndicate = s.syndicates?.[entry.sireId];
          const playerShareCount = syndicate?.shareHolders?.["player"] || 0;
          const totalShares = syndicate?.totalShares || 1;
          const playerSharePercentage = playerShareCount / totalShares;
          studFee = sire.stud.standingFee * (1 - playerSharePercentage);
        }
        const fee = isExternal
          ? BREEDING_FEE + (entry.liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
          : 0;

        const intent: BreedingIntent = {
          id: generateUUID(),
          entityId: entry.damId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "breeding",
          sireId: entry.sireId,
          damId: entry.damId,
          liveFoalGuarantee: entry.liveFoalGuarantee,
        };
        enqueueIntent({ ...intent, fee });
      }

      return { ok: true, results };
    },

    saveMatingPlan: (name: string, entries: MatingPlanEntry[]) => {
      const plan: SavedMatingPlan = {
        id: generateUUID(),
        name,
        createdDay: get().day,
        entries,
      };
      set((state) => ({
        savedMatingPlans: [...state.savedMatingPlans, plan],
      }));
      return { ok: true, planId: plan.id };
    },

    deleteMatingPlan: (planId: string) => {
      set((state) => ({
        savedMatingPlans: state.savedMatingPlans.filter((p) => p.id !== planId),
      }));
    },

    getSavedMatingPlan: (planId: string) => {
      return get().savedMatingPlans.find((p) => p.id === planId);
    },
  };
}
