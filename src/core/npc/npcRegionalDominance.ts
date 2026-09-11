/**
 * npc/npcRegionalDominance.ts - Regional dominance and friction management
 *
 * Extracted from npcCycle.ts for modularity.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), @/core/ai/npcCycleAI (NpcAIManager, getOrCreateStableAIState), @/core/stable/rivalry (RIVALRY_CONSTANTS), @/core/narrative/rivalryNewsGenerator, @/core/uuid, @/core/common/rng
 * Related files: src/core/npc/regionalDominanceHelpers.ts (extracted helpers)
 */

import type { Horse, Race, Stable } from "@/game/types";
import type { ReputationEvent } from "@/core/reputation/reputationTypes";
import type { Rng } from "@/core/common/rng";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { RIVALRY_CONSTANTS } from "@/core/stable/rivalry";
import type { NewsItem } from "@/core/narrative/newsTypes";
import {
  resolveWinningStableId,
  handlePlayerUnseatsNpcKing,
  handleNpcWinsRegion,
  buildRaceEntryMaps,
  findBestResult,
  resolveGrudgeMatch,
} from "@/core/npc/regionalDominanceHelpers";

/**
 * Apply ally friction cascades — when an NPC gains friction against the player,
 * their allies also gain a reduced amount of friction.
 *
 * @param aiManager - Current AI manager (will be mutated in the shallow copy).
 * @param sourceStableId - The stable that gained friction.
 * @param frictionGain - The friction amount gained.
 * @param _region - The region where the event occurred (reserved for future use).
 */
export function applyAllyFrictionCascade(
  aiManager: NpcAIManager,
  sourceStableId: string,
  frictionGain: number,
  _region: string,
): void {
  const sourceState = aiManager.stableStates[sourceStableId];
  if (!sourceState?.npcRelationships) return;

  const allyFrictionGain = Math.floor(frictionGain * 0.4);

  for (const [otherStableId, rel] of Object.entries(sourceState.npcRelationships)) {
    if (rel.allianceType && rel.allianceType !== "non_aggression_pact") {
      const allyState = aiManager.stableStates[otherStableId];
      if (allyState) {
        allyState.friction = Math.min(100, allyState.friction + allyFrictionGain);
      }
    }
  }
}

/**
 * Process grudge matches for a single race — head-to-head rivalry news and friction updates.
 * Extracted from resolveRegionalDominance for clarity.
 * @param race
 * @param horseMap
 * @param stableMap
 * @param aiManager
 * @param currentDay
 * @param rng
 */
function resolveGrudgeMatchesForRace(
  race: Race,
  horseMap: Map<string, Horse>,
  stableMap: Map<string, Stable>,
  aiManager: NpcAIManager,
  currentDay: number,
  rng: Rng,
): { newsItems: NewsItem[]; reputationEvents: ReputationEvent[] } {
  const newsItems: NewsItem[] = [];
  const reputationEvents: ReputationEvent[] = [];

  if (!race.graded || !["G1", "G2", "G3"].includes(race.graded.grade)) {
    return { newsItems, reputationEvents };
  }

  const hasPlayerEntry = race.entries.some((e) => e.ownership?.type === "player");
  if (!hasPlayerEntry) return { newsItems, reputationEvents };

  const { playerHorseIds, npcHorseIdsByStable } = buildRaceEntryMaps(race);
  const playerBest = findBestResult(race, playerHorseIds);
  if (!playerBest) return { newsItems, reputationEvents };

  const rivalStablesInRace = new Set(
    race.entries
      .map((e) => (e.ownership?.type === "npc" ? e.ownership.stableId : null))
      .filter((id): id is NonNullable<typeof id> => id != null),
  );

  for (const rivalStableId of rivalStablesInRace) {
    const rivalAI = aiManager.stableStates[rivalStableId];
    if (!rivalAI || rivalAI.friction < 50) continue;

    const rivalStable = stableMap.get(rivalStableId);
    if (!rivalStable) continue;

    const rivalHorseIds = npcHorseIdsByStable.get(rivalStableId);
    if (!rivalHorseIds || rivalHorseIds.size === 0) continue;

    const rivalBest = findBestResult(race, rivalHorseIds);
    if (!rivalBest) continue;

    const playerHorse = horseMap.get(playerBest.horseId);
    const rivalHorse = horseMap.get(rivalBest.horseId);
    if (!playerHorse || !rivalHorse) continue;

    const playerWon = playerBest.position < rivalBest.position;
    const result = resolveGrudgeMatch(
      race,
      playerHorse,
      rivalHorse,
      playerWon,
      rivalStable,
      rivalAI,
      currentDay,
      rng,
    );
    newsItems.push(...result.newsItems);
    reputationEvents.push(...result.reputationEvents);

    applyAllyFrictionCascade(
      aiManager,
      rivalStableId,
      playerWon ? 10 : 15,
      race.graded?.country || "",
    );
    aiManager.stableStates[rivalStableId] = { ...rivalAI };
  }

  return { newsItems, reputationEvents };
}

/**
 * Process regional dominance updates based on race winners.
 * Updates the AI manager with new regional kings and friction values.
 * Also detects rivalry milestones and generates news items.
 *
 * @param races - Array of resolved races.
 * @param horses - Array of all horses.
 * @param npcStables - Array of NPC stables.
 * @param aiManager - Current AI manager.
 * @param currentDay - Current game day.
 * @param rng - Random number generator.
 * @returns Updated AI manager with new regional kings and friction values, plus generated news items.
 */
export function resolveRegionalDominance(
  races: Race[],
  horses: Horse[],
  npcStables: Stable[],
  aiManager: NpcAIManager,
  currentDay: number,
  rng: Rng,
): { aiManager: NpcAIManager; newsItems: NewsItem[]; reputationEvents: ReputationEvent[] } {
  try {
    const updatedAiManager = {
      ...aiManager,
      stableStates: Object.fromEntries(
        Object.entries(aiManager.stableStates).map(([id, s]) => [id, { ...s }]),
      ),
    };
    const newsItems: NewsItem[] = [];
    const reputationEvents: ReputationEvent[] = [];

    const horseMap = new Map(horses.map((h) => [h.id, h]));
    const stableMap = new Map(npcStables.map((s) => [s.id, s]));

    for (const race of races) {
      if (!race.result || race.result.length === 0) continue;
      const winner = race.result[0];
      const region = race.graded?.country || "North America (East)";
      const currentKingId = updatedAiManager.regionalKings[region];

      const winningHorse = horseMap.get(winner.horseId);
      const winningStableId = resolveWinningStableId(winningHorse);
      if (!winningStableId) continue;

      // Regional king update
      if (winningStableId === currentKingId) {
        if (currentKingId !== "player") {
          const kingAI = updatedAiManager.stableStates[currentKingId];
          if (kingAI) kingAI.winsAgainstPlayer = 0;
        }
      } else if (winningStableId === "player") {
        if (currentKingId && currentKingId !== "player") {
          const escNews = handlePlayerUnseatsNpcKing(
            updatedAiManager,
            currentKingId,
            region,
            race,
            currentDay,
            rng,
            stableMap,
          );
          newsItems.push(...escNews);
        } else if (!currentKingId) {
          updatedAiManager.regionalKings[region] = "player";
        }
      } else {
        const npcNews = handleNpcWinsRegion(
          updatedAiManager,
          winningStableId,
          currentKingId,
          region,
          race,
          currentDay,
          rng,
          stableMap,
        );
        newsItems.push(...npcNews);
      }

      // Grudge match processing
      const grudgeResult = resolveGrudgeMatchesForRace(
        race,
        horseMap,
        stableMap,
        updatedAiManager,
        currentDay,
        rng,
      );
      newsItems.push(...grudgeResult.newsItems);
      reputationEvents.push(...grudgeResult.reputationEvents);
    }

    return { aiManager: updatedAiManager, newsItems, reputationEvents };
  } catch (error) {
    console.error("Error processing regional dominance:", error);
    return { aiManager, newsItems: [], reputationEvents: [] };
  }
}

/**
 * Apply friction decay to all stable AI states.
 *
 * @param aiManager - Current AI manager.
 * @returns Updated AI manager with decayed friction values.
 */
export function applyFrictionDecay(aiManager: NpcAIManager): NpcAIManager {
  try {
    const updatedAiManager = {
      ...aiManager,
      stableStates: Object.fromEntries(
        Object.entries(aiManager.stableStates).map(([id, s]) => [id, { ...s }]),
      ),
    };

    for (const id in updatedAiManager.stableStates) {
      updatedAiManager.stableStates[id].friction *= RIVALRY_CONSTANTS.FRICTION.DECAY_RATE;
    }

    return updatedAiManager;
  } catch (error) {
    console.error("Error applying friction decay:", error);
    return aiManager;
  }
}
