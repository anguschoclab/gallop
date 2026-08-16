/**
 * phases/diplomacyPhase.ts - Diplomacy phase
 *
 * Processes NPC-to-NPC diplomatic interactions: trust decay/growth,
 * alliance formation/dissolution, and cartel evaluation.
 * Runs after npcCyclePhase (order 80) so it has fresh AI state.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/ai/diplomacyAI (processDiplomaticInteractions, initializeRelationships), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: ../pipeline.ts (uses phase), index.ts (aggregates phase)
 */

import type { PipelineContext } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts";
import type { DiplomaticImpact, CartelImpact } from "@/core/resolver/impacts/miscImpacts";
import type { DiplomaticActionIntent, CartelActionIntent } from "@/core/resolver/intents";
import { processDiplomaticInteractions, initializeRelationships } from "@/core/ai/diplomacyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { PHASE_ORDER_DIPLOMACY } from "@/constants";
import { generateUUID } from "@/core/uuid";

export const diplomacyPhase = {
  name: "diplomacy",
  order: PHASE_ORDER_DIPLOMACY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, intents, worldAssessment } = context;

    if (state.npcStables.length === 0) {
      return context;
    }

    let aiManager: NpcAIManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager || {
      stableStates: {},
      globalDay: newDay,
      regionalKings: {},
    };

    // Initialize relationships if not yet present
    const hasRelationships = Object.values(aiManager.stableStates).some(
      (s) => s.npcRelationships !== undefined,
    );
    if (!hasRelationships) {
      aiManager = initializeRelationships(aiManager, state.npcStables);
    }

    // Process diplomatic interactions for this cycle
    aiManager = processDiplomaticInteractions(aiManager, state.npcStables, newDay);

    // Use worldAssessment: high player dominance increases NPC cooperation urgency
    const cooperationBoost = worldAssessment
      ? Math.max(1, 1 + (worldAssessment.playerDominance - 0.5) * 0.4)
      : 1;

    // Convert diplomatic_action and cartel_action intents into impacts
    const impacts: AnyImpact[] = [...context.impacts];

    const diplomaticIntents = intents.filter(
      (i): i is DiplomaticActionIntent => i.type === "diplomatic_action",
    );
    for (const intent of diplomaticIntents) {
      const baseTrustChange =
        intent.action === "propose_alliance"
          ? 10
          : intent.action === "break_alliance"
            ? -20
            : intent.action === "betray"
              ? -40
              : 5; // cooperate
      const trustChange = Math.round(baseTrustChange * cooperationBoost);

      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "diplomacy",
        logLevel: "always",
        type: "diplomatic",
        sourceStableId: intent.sourceId ?? intent.entityId,
        targetStableId: intent.targetStableId,
        action:
          intent.action === "propose_alliance"
            ? "alliance_formed"
            : intent.action === "break_alliance"
              ? "alliance_broken"
              : intent.action === "betray"
                ? "betrayal"
                : "cooperation",
        allianceType: intent.allianceType,
        trustChange,
      } as DiplomaticImpact);
    }

    const cartelIntents = intents.filter(
      (i): i is CartelActionIntent => i.type === "cartel_action",
    );
    for (const intent of cartelIntents) {
      const stableIds = [intent.sourceId ?? intent.entityId, ...(intent.targetStableIds ?? [])];

      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "diplomacy",
        logLevel: "always",
        type: "cartel",
        stableIds,
        action:
          intent.action === "join_cartel"
            ? "cartel_formed"
            : intent.action === "leave_cartel"
              ? "cartel_dissolved"
              : "market_coordinated",
        marketAction: intent.marketAction,
      } as CartelImpact);
    }

    return {
      ...context,
      state: {
        ...state,
        npcAIManager: aiManager,
      },
      impacts,
    };
  },
};
