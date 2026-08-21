/**
 * phases/breedingResolution.ts - Breeding resolution phase
 *
 * This file provides the breeding resolution phase that converts BreedingIntents
 * into impacts (pregnancy creation, stud fee transfers).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, BreedingIntent), @/core/resolver/impacts/index (AnyImpact, PregnancyCreationImpact, CashImpact, StudCareerImpact), @/game/uuid (generateUUID), @/game/types (Pregnancy), @/game/constants (GESTATION_DAYS)
 * Related files: ../pipeline.ts (uses phase)
 */

// Breeding Resolution Phase
// Converts BreedingIntents into impacts (pregnancy creation, stud fee transfers)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type {
  AnyIntent,
  BreedingIntent,
  SyndicateFeeDistributionIntent,
} from "@/core/resolver/intents";
import type {
  AnyImpact,
  PregnancyCreationImpact,
  CashImpact,
  StudCareerImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { Pregnancy } from "@/game/types";
import { GESTATION_DAYS, PHASE_ORDER_BREEDING_RESOLUTION } from "@/constants";
import { resolveSyndicationIntent } from "@/core/resolver/resolvers/syndicateResolver";
import { canBreed } from "@/core/breeding/eligibility";

/**
 * Breeding Resolution Phase (Order 25)
 * Resolves BreedingIntents into impacts:
 * - Pregnancy creation
 * - Cash changes (stud fee to NPC stable)
 * - Stud career updates (seasonBookings)
 */
export const breedingResolutionPhase: PipelinePhase = {
  name: "breedingResolution",
  order: PHASE_ORDER_BREEDING_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Filter for breeding intents
    const breedingIntents = intents.filter((i): i is BreedingIntent => i.type === "breeding");

    const { horseMap } = context;
    const existingPregnancies = state.pregnancies ?? [];
    const newPregnancies: Pregnancy[] = [];

    for (const intent of breedingIntents) {
      const sire = horseMap.get(intent.sireId);
      const dam = horseMap.get(intent.damId);

      if (!sire || !dam) continue;

      // Re-validate eligibility at resolution time
      const allPregnancies = [...existingPregnancies, ...newPregnancies];
      const breedCheck = canBreed(sire, dam, newDay, allPregnancies);
      if (!breedCheck.ok) continue;

      // Check if sire is external (belongs to a different stable than the breeder)
      const sireStableId = sire.ownership?.type === "npc" ? sire.ownership.stableId : undefined;
      const isExternal =
        intent.source === "player" ? !!sireStableId : sireStableId !== intent.sourceId;
      let studFee = 0;

      if (isExternal && sireStableId) {
        if (!sire.stud?.atStud) continue;
        if (sire.stud.seasonBookings >= sire.stud.bookSize) continue;
        if (sire.hemisphere !== dam.hemisphere) continue;
        studFee = sire.stud.standingFee;

        // Check if stallion is syndicated and handle fee distribution
        const syndicate = state.syndicates?.[sire.id];
        if (syndicate && syndicate.totalShares > 0) {
          // Generate syndicate fee distribution intent
          const feeDistIntent: SyndicateFeeDistributionIntent = {
            id: generateUUID(),
            entityId: sire.id,
            source: "system",
            day: newDay,
            priority: 50,
            type: "syndicate_fee_distribution",
            syndicateId: syndicate.id,
            totalFee: studFee,
            breedingDay: newDay,
          };
          const feeDistImpacts = resolveSyndicationIntent(feeDistIntent, state, newDay);
          impacts.push(...feeDistImpacts);
        } else {
          // Transfer stud fee to NPC stable (non-syndicated)
          impacts.push({
            id: generateUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "breedingResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: sireStableId!,
            amount: studFee,
            reason: "Stud fee",
          });
        }

        // Update stud career (seasonBookings)
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "breedingResolution",
          logLevel: "conditional",
          type: "stud_career",
          horseId: intent.sireId,
          studCareer: {
            ...sire.stud,
            seasonBookings: sire.stud.seasonBookings + 1,
            retiredOnDay: sire.stud.retiredOnDay,
          },
          reason: "Breeding booking",
        });
      }

      // Create pregnancy
      const dueDay = newDay + GESTATION_DAYS;
      const pregnancy: Pregnancy = {
        id: generateUUID(),
        sireId: intent.sireId,
        damId: intent.damId,
        sireName: sire.name,
        damName: dam.name,
        conceivedDay: newDay,
        dueDay,
        resolved: false,
        liveFoalGuarantee: intent.liveFoalGuarantee,
        reBreedingAttempts: 0,
        refunded: false,
        isPlayerOwned: true,
      };

      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "breedingResolution",
        logLevel: "always",
        type: "pregnancy_creation",
        pregnancy,
        reason: "Breeding",
      });
      newPregnancies.push(pregnancy);

      // Deduct fee from breeder (player)
      if (intent.source === "player" && intent.fee && intent.fee > 0) {
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "breedingResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: "player",
          amount: -intent.fee,
          reason: "Breeding fee",
        });
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
