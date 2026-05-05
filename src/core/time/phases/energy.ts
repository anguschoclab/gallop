import type { PipelineContext } from "../pipeline";

const RECOVERY_DAYS = 30;
const COVERING_SICKNESS_DURATION = 7;

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
      }

      // Energy restoration (modified by recoveryRate locus)
      const energyGain = 35 * (h.recoveryRate || 1.0);
      const newEnergy = Math.min(100, h.energy + energyGain);

      return {
        ...h,
        energy: newEnergy,
        healthStatus: newHealthStatus,
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
