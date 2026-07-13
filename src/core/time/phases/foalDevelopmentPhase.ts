/**
 * phases/foalDevelopmentPhase.ts — Foal-to-racehorse milestone alert phase.
 *
 * Runs at pipeline order 71 (after trainingResolution=45 / raceResolution=70 in
 * this project). For each player-owned foal whose developmentArc contains a
 * pending milestone whose `triggerDay === newDay`, this phase emits an inbox
 * message directing the player to the resolution UI. It never mutates horse
 * stats — stat deltas are applied only when the player explicitly resolves the
 * milestone via `resolveFoalMilestone`.
 */

import { PHASE_ORDER_FOAL_DEVELOPMENT } from "@/constants";
import { generateUUID } from "@/core/uuid";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";

export const foalDevelopmentPhase: PipelinePhase = {
  name: "foalDevelopment",
  order: PHASE_ORDER_FOAL_DEVELOPMENT,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    for (const horse of Object.values(state.horses)) {
      if (!horse.owned) continue;
      const arc = horse.developmentArc;
      if (!arc) continue;

      for (const milestone of arc.milestones) {
        if (milestone.status !== "pending") continue;
        if (milestone.triggerDay !== newDay) continue;

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "foalDevelopment",
          logLevel: "always",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "system",
            priority: "action",
            title: `${horse.name}: ${milestone.label}`,
            body: `${horse.name} is ready for ${milestone.label}. Choose an approach to shape early development.`,
            cta: {
              label: "Resolve Milestone",
              route: "/foal-development/$horseId",
              params: { horseId: horse.id },
            },
          },
        } as InboxImpact);
      }
    }

    if (impacts.length === 0) return context;

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
