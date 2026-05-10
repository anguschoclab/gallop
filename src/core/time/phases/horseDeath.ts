/**
 * phases/horseDeath.ts - Horse death phase
 *
 * This file provides the horse death phase that handles death from old age,
 * catastrophic injury, and illness complications.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact, HorseDeathImpact, LogImpact), @/game/rng (createRng, hashStr), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Horse Death Phase
// Handles death from old age, catastrophic injury, and illness complications

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, HorseDeathImpact, LogImpact } from "@/core/resolver/impacts/index";
import { createRng, hashStr } from "@/game/rng";
import { generateUUID } from "@/core/uuid";

/**
 * Phase: Horse Death
 * Checks for death conditions:
 * - Old age: 2% baseline chance/year, scaling with age
 * - Catastrophic injury: 0.1% chance per race, higher with injuryProneness
 * - Illness complications: 0.5% chance/day while ill
 */
export const horseDeathPhase: PipelinePhase = {
  name: "horseDeath",
  order: 160, // After pasture retirement (150)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Generate RNG for this phase
    const rng = createRng(hashStr(`horse_death_${newDay}`));

    for (const horse of state.horses) {
      // Skip already deceased horses
      if (horse.lifecycleStatus === "deceased") continue;

      // Skip very young horses (death unlikely before age 20)
      if (horse.age < 20) continue;

      // Check for old age death
      const age = horse.age;
      const baseDeathChance = 0.02; // 2% baseline per year
      const ageScaling = Math.max(1, (age - 20) * 0.05); // Increases with age
      const deathChance = baseDeathChance * ageScaling;

      if (rng.next() < deathChance) {
        const cause = "old age";
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "horseDeath",
          logLevel: horse.owned ? "always" : "conditional",
          type: "horse_death",
          horseId: horse.id,
          cause,
          deceasedOnDay: newDay,
          reason: `${horse.name} has passed away from ${cause} at age ${age}.`,
        } as HorseDeathImpact);

        if (horse.owned) {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "horseDeath",
            logLevel: "always",
            type: "log",
            text: `💔 ${horse.name} has passed away from ${cause} at age ${age}.`,
            reason: "Horse death notification",
          } as LogImpact);
        }
        continue; // Skip other death checks for this horse
      }

      // Check for illness complication death
      if (horse.healthStatus === "other_illness" || horse.healthStatus === "recovering") {
        const illnessDeathChance = 0.005; // 0.5% chance per day while ill
        if (rng.next() < illnessDeathChance) {
          const cause = "illness complications";
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "horseDeath",
            logLevel: horse.owned ? "always" : "conditional",
            type: "horse_death",
            horseId: horse.id,
            cause,
            deceasedOnDay: newDay,
            reason: `${horse.name} has succumbed to ${cause}.`,
          } as HorseDeathImpact);

          if (horse.owned) {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
              phase: "horseDeath",
              logLevel: "always",
              type: "log",
              text: `💔 ${horse.name} has succumbed to ${cause}.`,
              reason: "Horse death notification",
            } as LogImpact);
          }
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
