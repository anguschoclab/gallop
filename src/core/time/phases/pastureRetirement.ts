/**
 * phases/pastureRetirement.ts - Pasture retirement phase
 *
 * This file provides the pasture retirement phase that automatically retires
 * NPC horses to pasture based on age and inactivity, and deletes dead/retired
 * horses with no wins to prevent array accumulation.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact, PastureRetirementImpact, LogImpact, HorseDeletionImpact), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";

// Pasture Retirement Phase
// Automatically retires NPC horses to pasture based on age and inactivity
// Also deletes dead/retired horses with no wins to prevent array accumulation

import { createRng, hashStr } from "@/core/common/rng";
import { AGE_RETIREMENT_THRESHOLD, FAME_LOW_THRESHOLD, INACTIVITY_RETIREMENT_DAYS, PHASE_ORDER_PASTURE_RETIREMENT } from "@/constants";
import type {
  AnyImpact,
  PastureRetirementImpact,
  LogImpact,
  HorseDeletionImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import {
  isTopHorse,
  isHallOfFameEligible,
  buildRetirementBody,
} from "@/core/inbox/retirementMessages";

/**
 * Phase: Pasture Retirement
 * Automatically retires NPC horses to pasture when they meet criteria:
 * - Age ≥ 8 (past typical racing age)
 * - OR (age ≥ 6 AND inactive for 90+ days AND not at stud)
 * - OR (age ≥ 5 AND low fame < 20 AND no graded wins)
 */
export const pastureRetirementPhase: PipelinePhase = {
  name: "pastureRetirement",
  order: PHASE_ORDER_PASTURE_RETIREMENT, // After stallion retirement (145)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, intents } = context;
    const impacts: AnyImpact[] = [];

    // 1. Process player intents
    const retirementIntents = intents.filter((i) => i.type === "pasture_retirement");
    for (const intent of retirementIntents) {
      const horse = state.horses.find((h) => h.id === (intent as any).horseId);
      if (horse && horse.lifecycleStatus === "active") {
        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "pastureRetirement",
          logLevel: "always",
          type: "pasture_retirement",
          horseId: horse.id,
          retiredOnDay: newDay,
          reason: "Voluntary retirement to pasture",
        } as PastureRetirementImpact);

        impacts.push({
          id: generateUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "pastureRetirement",
          logLevel: "always",
          type: "log",
          text: `${horse.name} has been retired to pasture.`,
          reason: "Player pasture retirement",
        } as LogImpact);

        if (!horse.stableId && isTopHorse(horse)) {
          const hofEligible = isHallOfFameEligible(horse);
          impacts.push({
            id: generateUUID(),
            intentId: intent.id,
            day: newDay,
            phase: "pastureRetirement",
            logLevel: "always",
            type: "inbox_message",
            message: {
              day: newDay,
              category: "retirement",
              priority: hofEligible ? "action" : "info",
              title: `${horse.name} Retired to Pasture`,
              body: buildRetirementBody(horse, "pasture"),
              cta: {
                label: "View Horse",
                route: "stable.$horseId",
                params: { horseId: horse.id },
              },
            },
          } as any);
        }
      }
    }

    // 2. Automatic NPC retirement
    const npcHorses = state.horses.filter((h) => h.stableId && h.lifecycleStatus === "active");

    for (const horse of npcHorses) {
      // Skip if already at stud (stud retirement handles that)
      if (horse.stud?.atStud) continue;

      // Calculate last race day
      const lastRaceDay =
        horse.raceHistory.length > 0 ? Math.max(...horse.raceHistory.map((r) => r.day)) : 0;
      const inactiveDays = lastRaceDay > 0 ? newDay - lastRaceDay : newDay;

      // Count graded wins
      const gradedWins = horse.raceHistory.filter(
        (r) => r.position === 1 && r.grade && ["G1", "G2", "G3"].includes(r.grade),
      ).length;

      // Determine retirement eligibility
      const isOld = horse.age >= 8;
      const isOldAndInactive =
        horse.age >= AGE_RETIREMENT_THRESHOLD && inactiveDays > INACTIVITY_RETIREMENT_DAYS;
      const isLowAchiever = horse.age >= 5 && horse.fame < 20 && gradedWins === 0;

      if (isOld || isOldAndInactive || isLowAchiever) {
        let reason = "";
        if (isOld) reason = "old age";
        else if (isOldAndInactive) reason = "age and inactivity";
        else reason = "limited career success";

        // Emit pasture retirement impact
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "pastureRetirement",
          logLevel: "conditional",
          type: "pasture_retirement",
          horseId: horse.id,
          retiredOnDay: newDay,
          reason: `Retired to pasture due to ${reason}`,
        } as PastureRetirementImpact);

        // Emit log impact
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "pastureRetirement",
          logLevel: "conditional",
          type: "log",
          text: `${horse.name} has been retired to pasture (${reason}).`,
          reason: "NPC pasture retirement",
        } as LogImpact);
      }
    }

    // 3. Delete dead/retired horses with no wins to prevent array accumulation
    const horsesToDelete = state.horses.filter(
      (h) =>
        (h.lifecycleStatus === "deceased" || h.lifecycleStatus === "retired") && h.careerWins === 0,
    );

    for (const horse of horsesToDelete) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "pastureRetirement",
        logLevel: "never",
        type: "horse_deletion",
        horseId: horse.id,
      } as HorseDeletionImpact);
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
