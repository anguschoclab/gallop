import type { PipelineContext } from "../pipeline";
import { getFacilityBonus } from "@/core/facilities";
import { resolveEpmRisk } from "@/core/genetics/phenotype";

const RECOVERY_DAYS = 30;
const COVERING_SICKNESS_DURATION = 7;
const ILLNESS_DURATION_MIN = 14;
const ILLNESS_DURATION_MAX = 30;

/**
 * Phase: Energy Restoration
 * Restore energy for all horses (35 points, capped at 100)
 * Also handles health status recovery (covering_sickness -> recovering -> healthy)
 */
export const energyPhase = {
  name: "energy",
  order: 40,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const horses = state.horses.map((h) => {
      // Skip energy restoration for deceased horses
      if (h.lifecycleStatus === "deceased") return h;

      // Health status recovery logic
      let newHealthStatus = h.healthStatus;
      if (h.healthStatus === "covering_sickness" && h.healthStatusDay) {
        const daysSinceOnset = newDay - h.healthStatusDay;
        if (daysSinceOnset >= COVERING_SICKNESS_DURATION) {
          newHealthStatus = "recovering";
        }
      } else if (h.healthStatus === "recovering" && h.healthStatusDay) {
        const daysSinceOnset = newDay - h.healthStatusDay;
        if (daysSinceOnset >= COVERING_SICKNESS_DURATION + RECOVERY_DAYS) {
          newHealthStatus = "healthy";
        }
      } else if (h.healthStatus === "other_illness" && h.healthStatusDay) {
        // Illness recovery: 14-30 days before transitioning to recovering
        const daysSinceOnset = newDay - h.healthStatusDay;
        if (daysSinceOnset >= ILLNESS_DURATION_MIN && daysSinceOnset <= ILLNESS_DURATION_MAX) {
          // Random chance to recover each day after minimum duration
          if (Math.random() < 0.3) {
            newHealthStatus = "recovering";
          }
        } else if (daysSinceOnset > ILLNESS_DURATION_MAX) {
          // Force recovery after max duration
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
          poor: 0.010, // 1.0%
        };

        if (Math.random() < illnessChance[effectiveImmunityTier]) {
          newHealthStatus = "other_illness";
          // healthStatusDay will be set below
        }
      }

      // Energy restoration (modified by recoveryRate locus and barn facility)
      const barnBonus = state.facilities ? getFacilityBonus(state.facilities, "barn") : 0;
      const baseEnergyGain = 35 * (1 + barnBonus);
      const energyGain = baseEnergyGain * (h.recoveryRate || 1.0);
      const newEnergy = Math.min(100, h.energy + energyGain);

      return {
        ...h,
        energy: newEnergy,
        healthStatus: newHealthStatus,
        healthStatusDay: (newHealthStatus !== h.healthStatus && newHealthStatus !== "healthy") ? newDay : h.healthStatusDay,
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
