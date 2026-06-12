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

import { PHASE_ORDER_HORSE_DEATH } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type {
  AnyImpact,
  HorseDeathImpact,
  LogImpact,
  NameReservationImpact,
} from "@/core/resolver/impacts/index";
import { createRng, hashStr } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { INSURANCE_CONFIG } from "@/core/insurance/insuranceTypes";
import { calculateBaseHorseValue } from "@/core/horse/pricing";

/**
 * Phase: Horse Death
 * Checks for death conditions:
 * - Old age: 2% baseline chance/year, scaling with age
 * - Catastrophic injury: 0.1% chance per race, higher with injuryProneness
 * - Illness complications: 0.5% chance/day while ill
 */
export const horseDeathPhase: PipelinePhase = {
  name: "horseDeath",
  order: PHASE_ORDER_HORSE_DEATH, // After pasture retirement (150)
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

        // Insurance payout for mortality
        const policy = (horse as any).insurancePolicy;
        if (policy && (policy.type === "mortality_only" || policy.type === "comprehensive")) {
          const coveragePercent =
            INSURANCE_CONFIG.COVERAGE[policy.type as keyof typeof INSURANCE_CONFIG.COVERAGE];
          const horseValue = calculateBaseHorseValue(horse, "mid");
          const payout = Math.round(horseValue * coveragePercent);
          if (payout > 0) {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
              phase: "horseDeath",
              logLevel: "always",
              type: "insurance_payout",
              horseId: horse.id,
              amount: payout,
              reason: `Insurance payout for ${horse.name} (${policy.type})`,
            } as any);
          }
        }

        // Reserve the name for 25 years
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "horseDeath",
          logLevel: "never",
          type: "name_reservation",
          name: horse.name,
          deceasedOnDay: newDay,
          reason: `Name ${horse.name} reserved for 25 years after death from ${cause}.`,
        } as NameReservationImpact);

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

          // Insurance payout for mortality
          const illnessPolicy = (horse as any).insurancePolicy;
          if (
            illnessPolicy &&
            (illnessPolicy.type === "mortality_only" || illnessPolicy.type === "comprehensive")
          ) {
            const coveragePercent =
              INSURANCE_CONFIG.COVERAGE[
                illnessPolicy.type as keyof typeof INSURANCE_CONFIG.COVERAGE
              ];
            const horseValue = calculateBaseHorseValue(horse, "mid");
            const payout = Math.round(horseValue * coveragePercent);
            if (payout > 0) {
              impacts.push({
                id: generateUUID(),
                intentId: "",
                day: newDay,
                phase: "horseDeath",
                logLevel: "always",
                type: "insurance_payout",
                horseId: horse.id,
                amount: payout,
                reason: `Insurance payout for ${horse.name} (${illnessPolicy.type})`,
              } as any);
            }
          }

          // Reserve the name for 25 years
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "horseDeath",
            logLevel: "never",
            type: "name_reservation",
            name: horse.name,
            deceasedOnDay: newDay,
            reason: `Name ${horse.name} reserved for 25 years after death from ${cause}.`,
          } as NameReservationImpact);
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
