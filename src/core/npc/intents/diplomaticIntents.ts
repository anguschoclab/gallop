import type {
  AnyIntent,
  DiplomaticActionIntent,
  CartelActionIntent,
} from "@/core/resolver/intents";
import type { GameState, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type { StableAIState, NpcAIManager } from "@/core/ai/npcCycleAI";

export function generateNpcDiplomaticIntents(
  _state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  aiManager: NpcAIManager | undefined,
): AnyIntent[] {
  const intents: AnyIntent[] = [];
  if (!stableAI?.npcRelationships || !aiManager) return intents;

  const stableHash = stable.id.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) & 0xffff, 0);
  if ((day + stableHash) % 7 !== 0) return intents;

  for (const [otherStableId, rel] of Object.entries(stableAI.npcRelationships)) {
    if (rel.trust >= 70 && !rel.allianceType) {
      const allianceType: DiplomaticActionIntent["allianceType"] =
        stable.personality === "breeder" || stable.personality === "developer"
          ? "breeding_partnership"
          : stable.personality === "trader"
            ? "economic_cartel"
            : stable.personality === "aggressive"
              ? "racing_coalition"
              : "non_aggression";

      intents.push({
        id: generateUUID(),
        entityId: stable.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 30,
        type: "diplomatic_action",
        targetStableId: otherStableId,
        action: "propose_alliance",
        allianceType,
      } as DiplomaticActionIntent);
    }

    if (rel.allianceType && rel.trust < 20) {
      intents.push({
        id: generateUUID(),
        entityId: stable.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 60,
        type: "diplomatic_action",
        targetStableId: otherStableId,
        action: "break_alliance",
      } as DiplomaticActionIntent);
    }
  }

  const highTrustIds = Object.entries(stableAI.npcRelationships)
    .filter(([, rel]) => rel.trust >= 60 && !rel.allianceType)
    .map(([id]) => id);

  if (highTrustIds.length >= 1) {
    intents.push({
      id: generateUUID(),
      entityId: stable.id,
      source: "npc",
      sourceId: stable.id,
      day,
      priority: 25,
      type: "cartel_action",
      action: "join_cartel",
      targetStableIds: highTrustIds.slice(0, 2),
      marketAction: "avoid_bidding_war",
    } as CartelActionIntent);
  }

  return intents;
}
