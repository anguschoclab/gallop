/**
 * phases/narrativePhase.ts - Narrative phase
 *
 * Evaluates narrative opportunities, generates story arcs and beats,
 * and produces news items for the Gallop Gazette.
 * Runs after season standings (order 195) so seasonal results inform narratives.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/ai/narrativeAI (processNarrativeCycle), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "../pipeline";
import { processNarrativeCycle, detectRaceBeats } from "@/core/ai/narrativeAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_NARRATIVE } from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { NewsImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

export const narrativePhase = {
  name: "narrative",
  order: PHASE_ORDER_NARRATIVE,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (state.npcStables.length === 0) {
      return context;
    }

    let aiManager: NpcAIManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    // Process narrative arc progression
    aiManager = processNarrativeCycle(aiManager, state.npcStables, newDay);

    // Detect narrative beats from resolved races
    const resolvedRacesToday = Object.values(state.races).filter(
      (r) => r.resolved && r.day === newDay,
    );
    aiManager = detectRaceBeats(aiManager, resolvedRacesToday, context.horseMap, newDay);

    // Generate news impacts from story beats
    const impacts: AnyImpact[] = [];
    for (const stable of state.npcStables) {
      const stableState = aiManager.stableStates[stable.id];
      const beats = stableState?.narrativeState?.storyBeats ?? [];
      for (const beat of beats) {
        if (beat.day === newDay) {
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: "",
            day: newDay,
            phase: "narrative",
            logLevel: "conditional",
            type: "news_item",
            newsItem: {
              id: generateUUID(context.dailyRng),
              day: newDay,
              headline: beat.headline,
              body: beat.body,
              category: "stable",
              importance: "medium",
            },
          } as NewsImpact);
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        npcAIManager: aiManager,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
