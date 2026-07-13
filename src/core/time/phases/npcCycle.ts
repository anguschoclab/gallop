/**
 * phases/npcCycle.ts - NPC cycle phase
 *
 * This file provides the NPC cycle phase that runs NPC training, race entry,
 * fame updates, and AI state management.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/npc/npcCycle (runNpcCycle), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { runNpcCycle } from "@/core/npc/npcCycle";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_NPC_CYCLE } from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type {
  NewsImpact,
  ReputationImpact,
  CashImpact,
  FameImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

/**
 * Phase: NPC Cycle
 * Run NPC training, race entry, fame updates, and AI state management
 */
export const npcCyclePhase = {
  name: "npcCycle",
  order: PHASE_ORDER_NPC_CYCLE,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Skip if no NPC stables
    if (state.npcStables.length === 0) {
      return context;
    }

    const pregnantIds = new Set(state.pregnancies.filter((p) => !p.resolved).map((p) => p.damId));

    // Get existing AI manager or create new one
    const aiManager: NpcAIManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    // Run the complete NPC cycle
    const {
      horses,
      races,
      jockeys,
      aiManager: updatedAiManager,
      newsItems,
      reputationEvents,
      cashChanges,
      fameChanges,
    } = runNpcCycle(
      state.npcStables,
      Object.values(state.horses),
      state.jockeys ?? [],
      Object.values(state.races),
      newDay,
      context.dailyRng,
      3,
      pregnantIds,
      aiManager,
    );

    const updatedHorses = Object.fromEntries(horses.map((h) => [h.id, h]));
    const updatedRaces = Object.fromEntries(races.map((r) => [r.id, r]));

    // Convert reputation events and news items to impacts.
    const impacts: AnyImpact[] = [];
    if (newsItems) {
      for (const newsItem of newsItems) {
        impacts.push({
          id: newsItem.id,
          intentId: "",
          day: newDay,
          phase: "npcCycle",
          logLevel: "conditional",
          type: "news_item",
          newsItem,
        } as NewsImpact);
      }
    }

    if (reputationEvents) {
      for (const event of reputationEvents) {
        impacts.push({
          id: event.id,
          intentId: "",
          day: newDay,
          phase: "npcCycle",
          logLevel: "conditional",
          type: "reputation_change",
          delta: event.amount,
          reason: event.description,
          source: event.source,
          metadata: { horseId: event.horseId, raceId: event.raceId },
        } as ReputationImpact);
      }
    }

    if (cashChanges) {
      for (const change of cashChanges) {
        impacts.push({
          id: generateUUID(context.dailyRng),
          intentId: "",
          day: newDay,
          phase: "npcCycle",
          logLevel: "conditional",
          type: "cash_change",
          entityId: change.stableId,
          amount: change.amount,
          reason: change.reason,
        } as CashImpact);
      }
    }

    if (fameChanges) {
      for (const change of fameChanges) {
        impacts.push({
          id: generateUUID(context.dailyRng),
          intentId: "",
          day: newDay,
          phase: "npcCycle",
          logLevel: "conditional",
          type: "fame_change",
          horseId: change.horseId,
          delta: change.delta,
          reason: "Race performance fame gain",
        } as FameImpact);
      }
    }

    return {
      ...context,
      state: {
        ...state,
        horses: updatedHorses,
        races: updatedRaces,
        jockeys,
        npcAIManager: updatedAiManager,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
