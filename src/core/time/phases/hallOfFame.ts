/**
 * phases/hallOfFame.ts - Hall of Fame induction phase
 *
 * This file provides the Hall of Fame induction phase that inducts legendary
 * horses into the Hall of Fame based on career achievements.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact, HallOfFameInductionImpact, LogImpact), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Hall of Fame Phase
// Inducts legendary horses into the Hall of Fame based on career achievements

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { getCareerStats } from "@/core/horse/stats";
import type {
  AnyImpact,
  HallOfFameInductionImpact,
  LogImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { HallOfFameEntry } from "@/core/history/historyTypes";

/**
 * Phase: Hall of Fame Induction
 * Checks retired/deceased horses for Hall of Fame eligibility:
 * - lifecycleStatus: "retired" or "deceased"
 * - fame ≥ 85
 * - AND (3+ G1 wins OR 5+ graded wins OR Horse of the Year award)
 * - AND lifetimeEarnings ≥ $500,000
 */
export const hallOfFamePhase: PipelinePhase = {
  name: "hallOfFame",
  order: 155, // After pasture retirement (150), before horse death (160)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Check if Hall of Fame exists in state
    const existingHallOfFame = state.hallOfFame || [];

    for (const horse of state.horses) {
      // Skip if already inducted
      if (existingHallOfFame.some((h) => h.horseId === horse.id)) continue;

      // Skip if not retired or deceased
      if (horse.lifecycleStatus !== "retired" && horse.lifecycleStatus !== "deceased") continue;

      // Check fame threshold
      if (horse.fame < 85) continue;

      const stats = getCareerStats(horse);
      const g1Wins = stats.g1Wins;
      const gradedWins = stats.gradedWins;

      // Check for Horse of the Year awards
      const horseOfTheYearAwards = (state.awards || []).filter(
        (a) => a.horseId === horse.id && a.category === "horse_of_the_year",
      ).length;

      // Check earnings threshold
      if (horse.lifetimeEarnings < 500000) continue;

      // Check achievement criteria
      const hasAchievement = g1Wins >= 3 || gradedWins >= 5 || horseOfTheYearAwards >= 1;

      if (!hasAchievement) continue;

      // Eligible for Hall of Fame - emit induction impact
      const entry: HallOfFameEntry = {
        horseId: horse.id,
        name: horse.name,
        inductionDay: newDay,
        inductionYear: Math.floor(newDay / 365) + 1,
        achievements: [
          g1Wins > 0 ? `${g1Wins} G1 Wins` : "",
          gradedWins > g1Wins ? `${gradedWins - g1Wins} Graded Wins` : "",
          horseOfTheYearAwards > 0 ? `${horseOfTheYearAwards} HOTY Awards` : "",
        ].filter(Boolean),
        lifetimeEarnings: horse.lifetimeEarnings,
        lifetimeStarts: horse.careerStarts,
        lifetimeWins: horse.careerWins,
        g1Wins,
        bestBeyer: horse.stats.speed, // Approximation
        silk: horse.silk,
        pedigree: {
          sireName: horse.sireName,
          damName: horse.damName,
        },
      };

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "hallOfFame",
        logLevel: "always",
        type: "hall_of_fame_induction",
        entry,
        reason: `${horse.name} inducted into Hall of Fame`,
      } as HallOfFameInductionImpact);

      // Emit log impact
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "hallOfFame",
        logLevel: "always",
        type: "log",
        text: `🏆 ${horse.name} has been inducted into the Hall of Fame!`,
        reason: "Hall of Fame induction",
      } as LogImpact);
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
