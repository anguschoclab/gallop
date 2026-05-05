// Training Resolution Phase
// Converts TrainingIntents into impacts (stat changes, energy changes, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, TrainingIntent } from "@/core/resolver/intents";
import type { AnyImpact, HorseStatImpact, EnergyImpact } from "@/core/resolver/impacts";
import { createRng, hashStr } from "@/game/rng";
import type { Horse } from "@/game/types";

/**
 * Training Resolution Phase (Order 45)
 * Resolves TrainingIntents into impacts:
 * - Stat gains (speed, stamina, acceleration)
 * - Energy changes
 * - Cash changes (already deducted when intent was enqueued)
 * - Health status changes (OCD risk)
 */
export const trainingResolutionPhase: PipelinePhase = {
  name: "trainingResolution",
  order: 45,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Filter for training intents
    const trainingIntents = intents.filter((i): i is TrainingIntent => i.type === "training");

    for (const intent of trainingIntents) {
      const horse = state.horses.find((h) => h.id === intent.horseId);
      if (!horse) continue;

      // Check if horse is eligible for training (energy, health)
      if (horse.energy < 15) continue;
      if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") continue;

      // Deduct energy (only for actual training, not rest)
      if (intent.trainingType !== "rest") {
        impacts.push({
          id: crypto.randomUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "energy_change",
          horseId: intent.horseId,
          delta: -18,
          reason: "Training",
        });
      } else {
        // Rest adds energy
        impacts.push({
          id: crypto.randomUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "energy_change",
          horseId: intent.horseId,
          delta: 30,
          reason: "Rest",
        });
      }

      // Apply stat gains (skip for rest)
      if (intent.trainingType !== "rest") {
        // Generate RNG for this training session
        const trainingRng = createRng(hashStr(`training_${intent.horseId}_${newDay}`));

        const stat = horse.stats[intent.trainingType as "speed" | "stamina" | "acceleration"];
        const ageRatio = Math.min(1, horse.age / horse.peakAge);
        const effectivePotential = horse.potential * ageRatio;
        const gap = effectivePotential - stat;
        const trainingChance = 0.65 * horse.trainability;

        if (gap > 0 && trainingRng.next() < trainingChance) {
          const gain = Math.min(gap, trainingRng.next() < 0.2 ? 2 : 1);
          impacts.push({
            id: crypto.randomUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "trainingResolution",
            logLevel: "conditional",
            type: "horse_stat_change",
            horseId: intent.horseId,
            stat: intent.trainingType as "speed" | "stamina" | "acceleration",
            delta: gain,
            reason: "Training gain",
          });
        }

        // Check for OCD injury (2yo only)
        const ocdRisk = horse.ocdRisk ?? 0;
        if (horse.age <= 2 && ocdRisk > 0 && trainingRng.next() < ocdRisk) {
          // Health status change will be applied by impact
          // For now, we'll need to handle this in the impact application
          // This is a limitation of the current impact system - we need to add health status impact type
          // For now, we'll skip this and handle it in a future update
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
