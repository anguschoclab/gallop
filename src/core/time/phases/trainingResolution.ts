/**
 * phases/trainingResolution.ts - Training resolution phase
 *
 * This file provides the training resolution phase that converts TrainingIntents
 * into impacts (stat changes, energy changes, cash changes).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, TrainingIntent), @/core/resolver/impacts/index (AnyImpact), @/game/rng (createRng, hashStr), @/core/facilities (getFacilityBonus), @/core/expenses (createExpense), @/game/uuid (generateUUID), @/core/transactions (createTransaction), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/trainingAI (recordTrainingOutcome)
 * Related files: ../pipeline.ts (uses phase)
 */

// Training Resolution Phase
// Converts TrainingIntents into impacts (stat changes, energy changes, cash changes)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, TrainingIntent } from "@/core/resolver/intents";
import type {
  AnyImpact,
} from "@/core/resolver/impacts/index";
import { createRng, hashStr } from "@/game/rng";
import { getFacilityBonus } from "@/core/facilities";
import { createExpense } from "@/core/expenses";
import { generateUUID } from "@/game/uuid";
import { createTransaction } from "@/core/transactions";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordTrainingOutcome } from "@/core/ai/trainingAI";
import { BANISTER_CONSTANTS, calculateImpulse } from "@/core/health/banister";
import { getOutpostSpecialty } from "@/core/facilities/outpostTypes";
import { getBranchModifiers } from "@/core/facilities/facilityBranching";

/**
 * Training Resolution Phase (Order 45)
 * Resolves TrainingIntents into impacts:
 * - Stat gains (speed, stamina, acceleration)
 * - Energy changes
 * - Cash changes (already deducted when intent was enqueued)
 * - Health status changes (OCD risk)
 * - Banister impulses (fitness and fatigue)
 * - Outpost Specialization bonuses
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

    const horseMap = new Map(state.horses.map(h => [h.id, h]));
    const hiredStaffByStable = new Map<string, typeof state.hiredStaff>();
    if (state.hiredStaff) {
      for (const staff of state.hiredStaff) {
        if (!staff.stableId) continue;
        if (!hiredStaffByStable.has(staff.stableId)) hiredStaffByStable.set(staff.stableId, []);
        hiredStaffByStable.get(staff.stableId)!.push(staff);
      }
    }

    for (const intent of trainingIntents) {
      const horse = horseMap.get(intent.horseId);
      if (!horse) continue;

      // Skip training for retired or deceased horses
      if (horse.lifecycleStatus === "retired" || horse.lifecycleStatus === "deceased") continue;

      // Check if horse is eligible for training (energy, health)
      if (horse.energy < 15) continue;
      if (
        horse.healthStatus === "covering_sickness" ||
        horse.healthStatus === "recovering" ||
        horse.healthStatus === "other_illness"
      )
        continue;
      
      // Get staff bonuses for this stable
      const stableId = horse.stableId ?? "";
      const staffForStable = hiredStaffByStable.get(stableId) || [];

      
      const trainer = staffForStable.find(s => s.role === "trainer");
      const trainerBonus = trainer ? trainer.bonusValue : 0;
      
      const nutritionist = staffForStable.find(s => s.role === "nutritionist");
      const nutritionistBonus = nutritionist ? nutritionist.bonusValue : 0;

      // --- BANISTER IMPULSES ---
      if (intent.trainingType !== "rest") {
        const intensity = BANISTER_CONSTANTS.WORKOUT_INTENSITY[intent.trainingType] ?? 10;
        const fitnessDelta = calculateImpulse(intensity, BANISTER_CONSTANTS.FITNESS_K);
        const fatigueDelta = calculateImpulse(intensity, BANISTER_CONSTANTS.FATIGUE_K);

        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "fitness_change",
          horseId: horse.id,
          delta: fitnessDelta,
          reason: `${intent.trainingType} training impulse`,
        } as any);

        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "fatigue_change",
          horseId: horse.id,
          delta: fatigueDelta,
          reason: `${intent.trainingType} training impulse`,
        } as any);
      }
      // --- END BANISTER IMPULSES ---

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

        // Add cash change impact
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "trainingResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: "player",
          amount: -cost,
          reason: `${intent.trainingType} training cost`,
        } as any);
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
        const energyDelta = (energyCostMap[intent.trainingType] ?? -18) * (1 - nutritionistBonus);

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
      let totalGain = 0;
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

        // Apply main_track facility bonus and trainer bonus to training chance
        const facilities = state.facilities;
        const trackBonus = facilities ? getFacilityBonus(facilities, "main_track") : 0;
        
        // --- OUTPOST SPECIALIZATION (Imperial Expansion) ---
        let branchMod = null;
        if (horse.outpostId) {
            // Check if horse belongs to NPC stable
            if (horse.stableId && state.npcStables) {
                const npcStable = state.npcStables.find(s => s.id === horse.stableId);
                if (npcStable && (npcStable as any).outposts) {
                    const outpost = (npcStable as any).outposts.find((o: any) => o.id === horse.outpostId);
                    if (outpost) {
                        const specialty = getOutpostSpecialty(outpost);
                        branchMod = getBranchModifiers(specialty);
                    }
                }
            }
            // Check if horse belongs to player (player may have outposts in future)
            else if (!horse.stableId && (state as any).outposts) {
                const outpost = (state as any).outposts.find((o: any) => o.id === horse.outpostId);
                if (outpost) {
                    const specialty = getOutpostSpecialty(outpost);
                    branchMod = getBranchModifiers(specialty);
                }
            }
        }
        // --- END SPECIALIZATION ---

        const trainingChance = 0.65 * horse.trainability * (1 + trackBonus + trainerBonus);

        if (gap > 0 && trainingRng.next() < trainingChance) {
          // Base gain with facility and workout bonuses
          let gain = Math.min(gap, trainingRng.next() < 0.2 ? 2 : 1);
          gain = Math.round(gain * (1 + trackBonus) * config.gainBonus);
          
          // Apply branch multiplier
          if (branchMod) {
              if (config.primary === "stamina" && "staminaGain" in branchMod && branchMod.staminaGain) {
                  gain *= branchMod.staminaGain;
              }
              if (config.primary === "speed" && "speedGain" in branchMod && branchMod.speedGain) {
                  gain *= branchMod.speedGain;
              }
              gain = Math.round(gain);
          }
          
          totalGain += gain;

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
              totalGain += secondaryGain;
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

      // Record training outcome for NPC AI
      if (state.npcAIManager && horse.stableId) {
        const stable = state.npcStables.find(s => s.id === horse.stableId);
        if (stable) {
          const stableAI = getOrCreateStableAIState(state.npcAIManager, stable, newDay);
          if (stableAI.trainingAI) {
            stableAI.trainingAI = recordTrainingOutcome(
              stableAI.trainingAI,
              horse,
              intent.trainingType,
              totalGain > 0,
              totalGain,
              newDay
            );
            state.npcAIManager.stableStates[stable.id] = stableAI;
          }
        }
      }
    }

    const newTrainingUsed = { ...state.trainingUsed };
    for (const intent of trainingIntents) {
      if (intent.trainingType !== "rest") {
        newTrainingUsed[intent.horseId] = (newTrainingUsed[intent.horseId] || 0) + 1;
      }
    }

    return {
      ...context,
      state: {
        ...state,
        trainingUsed: newTrainingUsed,
        expenses: [...(state.expenses ?? []), ...newExpenses],
        transactions: [...(state.transactions ?? []), ...newTransactions],
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
