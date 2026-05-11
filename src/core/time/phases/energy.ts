/**
 * phases/energy.ts - Energy restoration phase
 *
 * This file provides the energy restoration phase that restores energy for all horses
 * and handles health status recovery (covering_sickness -> recovering -> healthy).
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/facilities (getFacilityBonus), @/core/genetics/phenotype (resolveEpmRisk)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
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
  order: 40,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Index staff by stableId for fast lookup
    const staffByStable = new Map<string, any[]>();
    if (state.hiredStaff) {
      for (const staff of state.hiredStaff) {
        const stableId = staff.stableId ?? "";
        if (!staffByStable.has(stableId)) {
          staffByStable.set(stableId, []);
        }
        staffByStable.get(staff.stableId)!.push(staff);
      }
    }

    const horses = state.horses.map((h) => {
      // Skip energy restoration for deceased horses
      if (h.lifecycleStatus === "deceased") return h;

      // Get staff bonuses for this stable
      const stableId = h.stableId ?? "";
      const staffForStable = staffByStable.get(stableId) ?? [];

      const nutritionist = staffForStable.find((s) => s.role === "nutritionist");
      const nutritionistBonus = nutritionist ? nutritionist.bonusValue : 0;

      const vet = staffForStable.find((s) => s.role === "veterinarian");
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
          if (Math.random() < 0.3 + vetBonus) {
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

        if (Math.random() < illnessChance[effectiveImmunityTier]) {
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

      const newFitness = decayValue(currentFitness, BANISTER_CONSTANTS.FITNESS_TAU);
      const newFatigue = decayValue(currentFatigue, BANISTER_CONSTANTS.FATIGUE_TAU);
      const newPeakingIndex = calculatePeakingIndex(newFitness, newFatigue);
      // --- END BANISTER DECAY ---

      // --- ACCLIMATIZATION DECAY ---
      if (h.outpostId) {
        const stable = npcStables.find((s) => s.id === stableId);
        if (stable && (stable as any).outposts) {
          const outpost = (stable as any).outposts.find((o: any) => o.id === h.outpostId);
          if (outpost && outpost.acclimatizationDays?.[h.id] > 0) {
            outpost.acclimatizationDays[h.id]--;
          }
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

    return {
      ...context,
      state: {
        ...state,
        horses,
      },
    };
  },
};
