// Breeding Resolution Phase
// Converts BreedingIntents into impacts (pregnancy creation, stud fee transfers)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, BreedingIntent } from "@/core/resolver/intents";
import type { AnyImpact, PregnancyCreationImpact, CashImpact, StudCareerImpact } from "@/core/resolver/impacts";
import { generateUUID } from "@/game/uuid";
import type { Pregnancy } from "@/game/types";

// Gestation period in days
const GESTATION_DAYS = 30;

/**
 * Breeding Resolution Phase (Order 25)
 * Resolves BreedingIntents into impacts:
 * - Pregnancy creation
 * - Cash changes (stud fee to NPC stable)
 * - Stud career updates (seasonBookings)
 */
export const breedingResolutionPhase: PipelinePhase = {
  name: "breedingResolution",
  order: 25,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Filter for breeding intents
    const breedingIntents = intents.filter((i): i is BreedingIntent => i.type === "breeding");

    for (const intent of breedingIntents) {
      const sire = state.horses.find((h) => h.id === intent.sireId);
      const dam = state.horses.find((h) => h.id === intent.damId);

      if (!sire || !dam) continue;

      // Check if sire is external (belongs to NPC stable)
      const isExternal = !!sire.stableId;
      let studFee = 0;

      if (isExternal && sire.stableId) {
        if (!sire.stud?.atStud) continue;
        if (sire.stud.seasonBookings >= sire.stud.bookSize) continue;
        if (sire.hemisphere !== dam.hemisphere) continue;
        studFee = sire.stud.standingFee;

        // Transfer stud fee to NPC stable
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "breedingResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: sire.stableId,
          amount: studFee,
          reason: "Stud fee",
        });

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
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
