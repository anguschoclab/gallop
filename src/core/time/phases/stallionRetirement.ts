/**
 * phases/stallionRetirement.ts - Stallion retirement phase
 *
 * This file provides the stallion retirement phase that automatically retires
 * eligible NPC stallions to stud based on career performance and age.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/game/uuid (generateUUID), @/core/resolver/impacts/index (StudCareerImpact, LogImpact), @/core/breeding/stallions (calculateRecommendedStudFee), @/lib/formatting (formatCurrency)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_STALLION_RETIREMENT } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import { generateUUID } from "@/core/uuid";
import type { StudCareerImpact, LogImpact } from "@/core/resolver/impacts/index";
import { calculateRecommendedStudFee } from "@/core/breeding/stallions";
import { formatCurrency } from "@/core/common/formatting";
import { SIRE_GENDERS } from "@/core/horse/gender";
import { getCareerStats } from "@/core/horse/stats";

/**
 * Phase: Stallion Retirement (Order 145)
 * Automatically retires eligible NPC stallions to stud based on career performance and age.
 */
export const stallionRetirementPhase: PipelinePhase = {
  name: "stallionRetirement",
  order: PHASE_ORDER_STALLION_RETIREMENT,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts = [...context.impacts];

    // Only run for NPC horses
    const npcHorses = Object.values(state.horses).filter((h) => h.stableId);
    const { stableMap } = context;

    for (const horse of npcHorses) {
      // 1. Basic eligibility
      if (!SIRE_GENDERS.includes(horse.gender)) continue;
      if (horse.stud?.atStud) continue;
      if (horse.age < 4) continue;

      // 2. Retirement Criteria
      // NPCs retire if they are legends (high fame/G1 wins) or reached "old age" (6+)
      const isLegend = horse.fame > 70 || getCareerStats(horse).g1Wins > 0;
      const isOld = horse.age >= 6;

      // Additional check: are they still competitive?
      // If they haven't raced in 30 days and have 0 energy, they are essentially retired from racing
      const lastRaceDay =
        horse.raceHistory.length > 0 ? Math.max(...horse.raceHistory.map((r) => r.day)) : 0;
      const inactive = newDay - lastRaceDay > 60;

      if ((isLegend && inactive) || isOld) {
        const stable = stableMap.get(horse.stableId!);
        const fee = calculateRecommendedStudFee(horse, stable?.tier || "mid");

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "stallionRetirement",
          logLevel: "always",
          type: "stud_career",
          horseId: horse.id,
          studCareer: {
            atStud: true,
            standingFee: fee,
            bookSize: 40, // Default book size
            seasonBookings: 0,
            lifetimeFoals: 0,
            lifetimeStakesFoals: 0,
            lifetimeG1Foals: 0,
            retiredOnDay: newDay,
          },
          reason: `Retired to stud due to ${isLegend ? "career excellence" : "age"}`,
        } as StudCareerImpact);

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "stallionRetirement",
          logLevel: "always",
          type: "log",
          text: `${horse.name} has been retired to stud with a standing fee of ${formatCurrency(fee)}.`,
          reason: "NPC Retirement log",
        } as LogImpact);
      }
    }

    return {
      ...context,
      impacts,
    };
  },
};
