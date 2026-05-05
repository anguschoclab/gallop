// Training Resolution Phase
// Converts TrainingIntents into impacts (stat changes, energy changes, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, TrainingIntent } from "@/core/resolver/intents";
import type { AnyImpact, HorseStatImpact, EnergyImpact } from "@/core/resolver/impacts";
import { createRng, hashStr } from "@/game/rng";
import type { Horse } from "@/game/types";
import { getFacilityBonus } from "@/core/facilities";

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

        // Apply main_track facility bonus to training chance
        const facilities = state.facilities;
        const trackBonus = facilities ? getFacilityBonus(facilities, "main_track") : 0;
        const trainingChance = 0.65 * horse.trainability * (1 + trackBonus);

        if (gap > 0 && trainingRng.next() < trainingChance) {
          // Base gain with facility bonus
          let gain = Math.min(gap, trainingRng.next() < 0.2 ? 2 : 1);
          gain = Math.round(gain * (1 + trackBonus)); // Apply facility bonus to gain amount
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
          // OCD injury occurred - emit HealthStatusImpact
          const recoveryDuration = 30 + Math.floor(trainingRng.next() * 30); // 30-60 days
          impacts.push({
            id: crypto.randomUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "trainingResolution",
            logLevel: "always",
            type: "health_status_change",
            horseId: horse.id,
            status: "recovering",
            previousStatus: horse.healthStatus ?? "healthy",
            recoveryDay: newDay + recoveryDuration,
            reason: `OCD injury during training (${intent.trainingType}) - ${recoveryDuration} day recovery`,
          });
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
