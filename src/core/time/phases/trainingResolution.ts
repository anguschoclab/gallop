// Training Resolution Phase
// Converts TrainingIntents into impacts (stat changes, energy changes, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, TrainingIntent } from "@/core/resolver/intents";
import type {
  AnyImpact,
  HorseStatImpact,
  EnergyImpact,
  HealthStatusImpact,
} from "@/core/resolver/impacts";
import { createRng, hashStr } from "@/game/rng";
import type { Horse } from "@/game/types";
import { getFacilityBonus } from "@/core/facilities";
import { createExpense } from "@/core/expenses";
import { generateUUID } from "@/game/uuid";
import { createTransaction } from "@/core/transactions";

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
    const newExpenses: typeof state.expenses = [];
    const newTransactions: typeof state.transactions = [];

    // Filter for training intents
    const trainingIntents = intents.filter((i): i is TrainingIntent => i.type === "training");

    for (const intent of trainingIntents) {
      const horse = state.horses.find((h) => h.id === intent.horseId);
      if (!horse) continue;

      // Check if horse is eligible for training (energy, health)
      if (horse.energy < 15) continue;
      if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering")
        continue;

      // Record training expense (only for actual training, not rest)
      if (intent.trainingType !== "rest") {
        // Different workout types have different costs
        const costMap: Record<string, number> = {
          speed: 75,
          stamina: 75,
          acceleration: 75,
          bullet: 100, // High intensity
          breeze: 85, // Moderate intensity
          gate_work: 90, // Requires gate equipment
          swimming: 80, // Pool maintenance
          gallop: 70, // Standard work
        };
        const cost = costMap[intent.trainingType] ?? 75;

        newExpenses.push(
          createExpense(
            "training",
            cost,
            `${intent.trainingType} training for ${horse.name}`,
            newDay,
            { horseId: horse.id },
          ),
        );

        // Record transaction for training expense
        newTransactions.push(
          createTransaction(
            "expense",
            "training",
            -cost,
            `${intent.trainingType} training for ${horse.name}`,
            newDay,
            state.cash - cost,
            { horseId: horse.id },
          ),
        );
      }

      // Deduct energy (only for actual training, not rest)
      if (intent.trainingType !== "rest") {
        // Different workout types have different energy costs
        const energyCostMap: Record<string, number> = {
          speed: -18,
          stamina: -18,
          acceleration: -18,
          bullet: -25, // High intensity
          breeze: -20, // Moderate intensity
          gate_work: -22, // Requires more effort
          swimming: -15, // Low impact
          gallop: -16, // Standard work
        };
        const energyDelta = energyCostMap[intent.trainingType] ?? -18;

        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "energy_change",
          horseId: intent.horseId,
          delta: energyDelta,
          reason: `${intent.trainingType} training`,
        });
      } else {
        // Rest adds energy
        impacts.push({
          id: generateUUID(),
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

      // Apply stat gains based on workout type
      if (intent.trainingType !== "rest") {
        // Generate RNG for this training session
        const trainingRng = createRng(hashStr(`training_${intent.horseId}_${newDay}`));

        // Map workout types to primary/secondary stats and modifiers
        const workoutConfig: Record<
          string,
          {
            primary: keyof typeof horse.stats;
            secondary?: keyof typeof horse.stats;
            energyCost: number;
            injuryRisk: number;
            gainBonus: number;
          }
        > = {
          speed: { primary: "speed", energyCost: -18, injuryRisk: 1.0, gainBonus: 1.0 },
          stamina: { primary: "stamina", energyCost: -18, injuryRisk: 1.0, gainBonus: 1.0 },
          acceleration: {
            primary: "acceleration",
            energyCost: -18,
            injuryRisk: 1.0,
            gainBonus: 1.0,
          },
          bullet: {
            primary: "speed",
            secondary: "acceleration",
            energyCost: -25,
            injuryRisk: 1.5,
            gainBonus: 1.3,
          }, // High intensity
          breeze: {
            primary: "speed",
            secondary: "stamina",
            energyCost: -20,
            injuryRisk: 1.1,
            gainBonus: 1.1,
          }, // Moderate
          gate_work: {
            primary: "acceleration",
            secondary: "speed",
            energyCost: -22,
            injuryRisk: 0.8,
            gainBonus: 1.2,
          }, // Gate breaking
          swimming: { primary: "stamina", energyCost: -15, injuryRisk: 0.3, gainBonus: 0.9 }, // Low injury risk
          gallop: {
            primary: "stamina",
            secondary: "speed",
            energyCost: -16,
            injuryRisk: 0.7,
            gainBonus: 1.0,
          }, // Base building
        };

        const config = workoutConfig[intent.trainingType] ?? workoutConfig.speed;

        const primaryStat = horse.stats[config.primary];
        const ageRatio = Math.min(1, horse.age / horse.peakAge);
        const effectivePotential = horse.potential * ageRatio;
        const gap = effectivePotential - primaryStat;

        // Apply main_track facility bonus to training chance
        const facilities = state.facilities;
        const trackBonus = facilities ? getFacilityBonus(facilities, "main_track") : 0;
        const trainingChance = 0.65 * horse.trainability * (1 + trackBonus);

        if (gap > 0 && trainingRng.next() < trainingChance) {
          // Base gain with facility and workout bonuses
          let gain = Math.min(gap, trainingRng.next() < 0.2 ? 2 : 1);
          gain = Math.round(gain * (1 + trackBonus) * config.gainBonus);

          impacts.push({
            id: generateUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "trainingResolution",
            logLevel: "conditional",
            type: "horse_stat_change",
            horseId: intent.horseId,
            stat: config.primary,
            delta: gain,
            reason: `${intent.trainingType} gain`,
          });

          // Secondary stat gains (smaller)
          if (config.secondary && trainingRng.next() < 0.4) {
            const secondaryGap = effectivePotential - horse.stats[config.secondary];
            if (secondaryGap > 0) {
              const secondaryGain = Math.min(secondaryGap, 1);
              impacts.push({
                id: generateUUID(),
                intentId: intent.id,
                day: newDay,
                phase: "trainingResolution",
                logLevel: "conditional",
                type: "horse_stat_change",
                horseId: intent.horseId,
                stat: config.secondary,
                delta: secondaryGain,
                reason: `${intent.trainingType} secondary gain`,
              });
            }
          }
        }

        // Check for OCD injury (2yo only, risk varies by workout type)
        const ocdRisk = horse.ocdRisk ?? 0;
        if (horse.age <= 2 && ocdRisk > 0 && trainingRng.next() < ocdRisk * config.injuryRisk) {
          // OCD injury occurred - emit HealthStatusImpact
          const recoveryDuration = 30 + Math.floor(trainingRng.next() * 30); // 30-60 days
          impacts.push({
            id: generateUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "trainingResolution",
            logLevel: "always",
            type: "health_status_change",
            horseId: horse.id,
            status: "recovering",
            previousStatus: horse.healthStatus ?? "healthy",
            recoveryDay: newDay + recoveryDuration,
            reason: `OCD injury during ${intent.trainingType} - ${recoveryDuration} day recovery`,
          });
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        expenses: [...(state.expenses ?? []), ...newExpenses],
        transactions: [...(state.transactions ?? []), ...newTransactions],
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
