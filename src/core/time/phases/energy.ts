/**
 * phases/energy.ts - Energy restoration phase
 *
 * This file provides the energy restoration phase that restores energy for all horses
 * and handles health status recovery (covering_sickness -> recovering -> healthy).
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/facilities (getFacilityBonus), @/core/genetics/phenotype (resolveEpmRisk)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_ENERGY } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import { getFacilityBonus } from "@/core/facilities";
import { resolveEpmRisk } from "@/core/genetics/phenotype";
import { BANISTER_CONSTANTS, decayValue, calculatePeakingIndex } from "@/core/health/banister";

const RECOVERY_DAYS = 30;
const COVERING_SICKNESS_DURATION = 7;
const ILLNESS_DURATION_MIN = 14;
const ILLNESS_DURATION_MAX = 30;

/**
 * Phase: Energy Restoration
 * Restore energy for all horses (35 points, capped at 100)
 * Also handles health status recovery (covering_sickness -> recovering -> healthy)
 * Recalculates Banister fitness/fatigue decay.
 */
export const energyPhase = {
  name: "energy",
  order: PHASE_ORDER_ENERGY,
  /**
   * Execute the energy restoration phase
   * @param context - The pipeline context containing state and current day
   * @returns Updated pipeline context with restored energy and health status
   */
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Index staff by stableId and role for fast lookup
    const staffByStableAndRole = new Map<string, Map<string, any>>();
    if (state.hiredStaff) {
      for (const staff of state.hiredStaff) {
        const stableId = staff.stableId ?? "";
        if (!staffByStableAndRole.has(stableId)) {
          staffByStableAndRole.set(stableId, new Map());
        }
        staffByStableAndRole.get(stableId)!.set(staff.role, staff);
      }
    }

    const outpostMap = new Map<string, any>();
    for (const s of state.npcStables ?? []) {
      for (const o of s.outposts ?? []) {
        outpostMap.set(o.id, o);
      }
    }

    // Collect acclimatization decay updates per outpost without mutating state.
    const acclimatizationUpdates = new Map<string, Map<string, number>>();

    const horses = state.horses.map((h) => {
      // Skip energy restoration for deceased horses
      if (h.lifecycleStatus === "deceased") return h;

      // Get staff bonuses for this stable
      const stableId = h.stableId ?? "";
      const roleMap = staffByStableAndRole.get(stableId);

      const nutritionist = roleMap?.get("nutritionist");
      const nutritionistBonus = nutritionist ? nutritionist.bonusValue : 0;

      const vet = roleMap?.get("veterinarian");
      const vetBonus = vet ? vet.bonusValue : 0;

      // Health status recovery logic
      let newHealthStatus = h.healthStatus;
      if (h.healthStatus === "covering_sickness" && h.healthStatusDay) {
        const daysSinceOnset = newDay - h.healthStatusDay;
        const effectiveDuration = COVERING_SICKNESS_DURATION * (1 - vetBonus);
        if (daysSinceOnset >= effectiveDuration) {
          newHealthStatus = "recovering";
        }
      } else if (h.healthStatus === "recovering" && h.healthStatusDay) {
        const daysSinceOnset = newDay - h.healthStatusDay;
        const effectiveDuration = (COVERING_SICKNESS_DURATION + RECOVERY_DAYS) * (1 - vetBonus);
        if (daysSinceOnset >= effectiveDuration) {
          newHealthStatus = "healthy";
        }
      } else if (h.healthStatus === "other_illness" && h.healthStatusDay) {
        const daysSinceOnset = newDay - h.healthStatusDay;
        const minDuration = ILLNESS_DURATION_MIN * (1 - vetBonus);
        const maxDuration = ILLNESS_DURATION_MAX * (1 - vetBonus);
        if (daysSinceOnset >= minDuration && daysSinceOnset <= maxDuration) {
          if (context.dailyRng.next() < 0.3 + vetBonus) {
            newHealthStatus = "recovering";
          }
        } else if (daysSinceOnset > maxDuration) {
          newHealthStatus = "recovering";
        }
      }

      // Illness check system (only for healthy horses)
      if (newHealthStatus === "healthy" && h.genotype && h.genotype.health) {
        const immunityTier = h.genotype.markers.immunity;
        const epmRisk = resolveEpmRisk(h.genotype.health.epm);

        // EPM susceptibility: treat immunity as one tier lower for illness check
        let effectiveImmunityTier = immunityTier;
        if (epmRisk > 0) {
          if (immunityTier === "excellent") effectiveImmunityTier = "good";
          else if (immunityTier === "good") effectiveImmunityTier = "fair";
          else if (immunityTier === "fair") effectiveImmunityTier = "poor";
        }

        // Daily illness chance based on immunity tier
        const illnessChance: Record<"excellent" | "good" | "fair" | "poor", number> = {
          excellent: 0.001, // 0.1%
          good: 0.003, // 0.3%
          fair: 0.006, // 0.6%
          poor: 0.01, // 1.0%
        };

        if (context.dailyRng.next() < illnessChance[effectiveImmunityTier]) {
          newHealthStatus = "other_illness";
          // healthStatusDay will be set below
        }
      }

      // Energy restoration (modified by recoveryRate, barn facility, and nutritionist staff)
      const barnBonus = state.facilities ? getFacilityBonus(state.facilities, "barn") : 0;
      const baseEnergyGain = 35 * (1 + barnBonus + nutritionistBonus);
      const energyGain = baseEnergyGain * (h.recoveryRate || 1.0);
      const newEnergy = Math.min(100, h.energy + energyGain);

      // Dynamic Form: Recovery points regeneration (small daily recovery)
      const currentRecoveryPoints = h.recoveryPoints ?? 100;
      const baseRecoveryGain = 10 * (1 + barnBonus + nutritionistBonus);
      const recoveryGain = baseRecoveryGain * (h.recoveryRate || 1.0);
      const newRecoveryPoints = Math.min(100, currentRecoveryPoints + recoveryGain);

      // --- BANISTER DECAY ---
      const currentFitness = h.fitness ?? 0;
      const currentFatigue = h.fatigue ?? 0;

      const newFitness = decayValue(currentFitness, 1, BANISTER_CONSTANTS.FITNESS_TAU);
      const newFatigue = decayValue(currentFatigue, 1, BANISTER_CONSTANTS.FATIGUE_TAU);
      const newPeakingIndex = calculatePeakingIndex(newFitness, newFatigue);
      // --- END BANISTER DECAY ---

      // --- ACCLIMATIZATION DECAY ---
      if (h.outpostId) {
        const outpost = outpostMap.get(h.outpostId);
        if (outpost && outpost.acclimatizationDays?.[h.id] > 0) {
          const remainingDays = outpost.acclimatizationDays[h.id] - 1;
          if (!acclimatizationUpdates.has(h.outpostId)) {
            acclimatizationUpdates.set(h.outpostId, new Map<string, number>());
          }
          acclimatizationUpdates.get(h.outpostId)!.set(h.id, remainingDays);
        }
      }
      // --- END ACCLIMATIZATION ---

      return {
        ...h,
        energy: newEnergy,
        recoveryPoints: newRecoveryPoints,
        fitness: newFitness,
        fatigue: newFatigue,
        peakingIndex: newPeakingIndex,
        healthStatus: newHealthStatus,
        healthStatusDay:
          newHealthStatus !== h.healthStatus && newHealthStatus !== "healthy"
            ? newDay
            : h.healthStatusDay,
        activeInjury: newHealthStatus === "healthy" ? undefined : h.activeInjury,
      };
    });

    // Apply acclimatization decay updates to a fresh npcStables array.
    let npcStables = state.npcStables;
    if (acclimatizationUpdates.size > 0) {
      npcStables = npcStables.map((stable) => {
        const originalOutposts = stable.outposts ?? [];
        let outpostsChanged = false;
        const updatedOutposts = originalOutposts.map((outpost: any) => {
          const updates = acclimatizationUpdates.get(outpost.id);
          if (!updates) return outpost;
          const updatedDays = { ...outpost.acclimatizationDays };
          for (const [horseId, days] of updates.entries()) {
            updatedDays[horseId] = days;
          }
          outpostsChanged = true;
          return { ...outpost, acclimatizationDays: updatedDays };
        });
        return outpostsChanged ? { ...stable, outposts: updatedOutposts } : stable;
      });
    }

    return {
      ...context,
      state: {
        ...state,
        horses,
        npcStables,
      },
    };
  },
};
