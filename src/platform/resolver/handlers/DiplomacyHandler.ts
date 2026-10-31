/**
 * resolver/handlers/DiplomacyHandler.ts - Diplomacy and cartel impact handler
 *
 * This file provides the handler for processing diplomatic and cartel impacts
 * into the game state, updating NPC AI manager relationship and cartel state.
 *
 * Dependencies: ./types (ImpactHandler), @/domains/agents/simulation/npcCycleAI (NpcAIManager)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type {
  ImpactHandler,
  LookupMaps,
  ImpactHandlerFunction,
} from "@/platform/resolver/handlers/types";
import type { DiplomaticImpact, CartelImpact } from "@/platform/resolver/impacts/miscImpacts";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { BaseHandler } from "@/platform/resolver/handlers/BaseHandler";

const getAiManager = (draft: WritableDraft<GameState>): NpcAIManager | undefined =>
  (draft as unknown as { npcAIManager?: NpcAIManager }).npcAIManager;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  diplomatic: (draft, impact) => {
    const aiManager = getAiManager(draft);
    if (!aiManager) return;
    DiplomacyHandler.handleDiplomatic(aiManager, impact as DiplomaticImpact);
  },
  cartel: (draft, impact) => {
    const aiManager = getAiManager(draft);
    if (!aiManager) return;
    DiplomacyHandler.handleCartel(aiManager, impact as CartelImpact);
  },
};

export class DiplomacyHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return Object.hasOwn(IMPACT_HANDLERS, type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }

  static handleDiplomatic(aiManager: NpcAIManager, impact: DiplomaticImpact): void {
    const { sourceStableId, targetStableId, action, trustChange } = impact;
    const sourceState = aiManager.stableStates[sourceStableId];
    const targetState = aiManager.stableStates[targetStableId];
    if (!sourceState?.npcRelationships || !targetState?.npcRelationships) return;

    const sourceRel = sourceState.npcRelationships[targetStableId];
    if (sourceRel) {
      sourceRel.trust = Math.max(-100, Math.min(100, sourceRel.trust + trustChange));
      sourceRel.history.push({
        day: impact.day,
        type: action as "alliance_formed" | "alliance_broken" | "betrayal" | "cooperation",
        description: `${action} with ${targetStableId}`,
      });
    }

    // Bidirectional: update target's view of source
    const targetRel = targetState.npcRelationships[sourceStableId];
    if (targetRel) {
      targetRel.trust = Math.max(-100, Math.min(100, targetRel.trust + trustChange));
      targetRel.history.push({
        day: impact.day,
        type: action as "alliance_formed" | "alliance_broken" | "betrayal" | "cooperation",
        description: `${action} with ${sourceStableId}`,
      });
    }
  }

  static handleCartel(aiManager: NpcAIManager, impact: CartelImpact): void {
    const { stableIds, action } = impact;

    if (action === "cartel_formed") {
      // Mark relationships as economic_cartel alliance
      for (let i = 0; i < stableIds.length; i++) {
        for (let j = i + 1; j < stableIds.length; j++) {
          const s1 = aiManager.stableStates[stableIds[i]];
          const s2 = aiManager.stableStates[stableIds[j]];
          if (s1?.npcRelationships?.[stableIds[j]]) {
            s1.npcRelationships[stableIds[j]].allianceType = "economic_cartel";
          }
          if (s2?.npcRelationships?.[stableIds[i]]) {
            s2.npcRelationships[stableIds[i]].allianceType = "economic_cartel";
          }
        }
      }
    } else if (action === "cartel_dissolved") {
      // Remove economic_cartel alliance type
      for (let i = 0; i < stableIds.length; i++) {
        for (let j = i + 1; j < stableIds.length; j++) {
          const s1 = aiManager.stableStates[stableIds[i]];
          const s2 = aiManager.stableStates[stableIds[j]];
          if (s1?.npcRelationships?.[stableIds[j]]?.allianceType === "economic_cartel") {
            s1.npcRelationships[stableIds[j]].allianceType = null;
          }
          if (s2?.npcRelationships?.[stableIds[i]]?.allianceType === "economic_cartel") {
            s2.npcRelationships[stableIds[i]].allianceType = null;
          }
        }
      }
    }
    // "market_coordinated" is informational only — no state change needed
  }
}
