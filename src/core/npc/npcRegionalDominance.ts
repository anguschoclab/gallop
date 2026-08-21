/**
 * npc/npcRegionalDominance.ts - Regional dominance and friction management
 *
 * Extracted from npcCycle.ts for modularity.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), @/core/ai/npcCycleAI (NpcAIManager, getOrCreateStableAIState), @/core/stable/rivalry (RIVALRY_CONSTANTS), @/services/narrative/rivalryNewsGenerator, @/core/uuid, @/core/common/rng
 */

import type { Horse, Race, Stable } from "@/game/types";
import type { ReputationEvent } from "@/core/reputation/reputationTypes";
import type { Rng } from "@/core/common/rng";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { RIVALRY_CONSTANTS } from "@/core/stable/rivalry";
import { generateUUID } from "@/core/uuid";
import type { NewsItem } from "@/services/narrative/newsTypes";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  generateRivalryEmergenceNews,
  generateGrudgeMatchNews,
  generateRegionLostNews,
  generateRivalryEscalationNews,
  generateStableIntroNews,
} from "@/services/narrative/rivalryNewsGenerator";

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
export function processRegionalDominance(
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
      if (!winningHorse) continue;
      const winningStableId = isPlayerOwned(winningHorse)
        ? "player"
        : winningHorse.stableId;
      if (!winningStableId) continue;

      if (winningStableId === currentKingId) {
        if (currentKingId !== "player") {
          const kingAI = updatedAiManager.stableStates[currentKingId];
          if (kingAI) kingAI.winsAgainstPlayer = 0;
        }
      } else {
        if (winningStableId === "player") {
          if (currentKingId && currentKingId !== "player") {
            const kingAI = updatedAiManager.stableStates[currentKingId];
            if (kingAI) {
              const oldFriction = kingAI.friction;
              kingAI.friction = Math.min(
                100,
                kingAI.friction + RIVALRY_CONSTANTS.FRICTION.WIN_GRADED_RACE_OVER_NPC,
              );

              if (oldFriction < 80 && kingAI.friction >= 80) {
                const kingStable = stableMap.get(currentKingId);
                if (kingStable) {
                  const escNews = generateRivalryEscalationNews(
                    kingStable,
                    oldFriction,
                    kingAI.friction,
                    currentDay,
                    rng,
                  );
                  if (escNews) newsItems.push(escNews);
                }
              }

              if (!kingAI.winsAgainstPlayer) kingAI.winsAgainstPlayer = 0;
            }

            if (race.graded && race.graded.grade === "G1") {
              updatedAiManager.regionalKings[region] = "player";
            }
          } else if (!currentKingId) {
            updatedAiManager.regionalKings[region] = "player";
          }
        } else {
          const stable = stableMap.get(winningStableId);
          if (stable) {
            const stableAI = getOrCreateStableAIState(updatedAiManager, stable, currentDay);
            const oldFriction = stableAI.friction;

            if (currentKingId === "player") {
              stableAI.winsAgainstPlayer++;
              if (stableAI.winsAgainstPlayer >= RIVALRY_CONSTANTS.DOMINANCE.UNSEAT_WIN_STREAK) {
                updatedAiManager.regionalKings[region] = winningStableId;
                stableAI.winsAgainstPlayer = 0;

                const news = generateRegionLostNews(region, stable, currentDay, rng);
                if (news) newsItems.push(news);
              }
            } else {
              updatedAiManager.regionalKings[region] = winningStableId;
            }
            stableAI.regionalPrestige[region] = (stableAI.regionalPrestige[region] || 0) + 1;
            updatedAiManager.stableStates[stable.id] = stableAI;

            if (currentKingId === "player") {
              applyAllyFrictionCascade(updatedAiManager, stable.id, 5, region);
            }

            if (oldFriction < 60 && stableAI.friction >= 60 && !stableAI.rivalryAnnouncedDay) {
              if (!stableAI.introPublishedDay) {
                const introNews = generateStableIntroNews(stable, currentDay, rng);
                if (introNews) {
                  newsItems.push(introNews);
                  stableAI.introPublishedDay = currentDay;
                }
              }
              const news = generateRivalryEmergenceNews(stable, stableAI.friction, currentDay, rng);
              if (news) {
                newsItems.push(news);
                stableAI.rivalryAnnouncedDay = currentDay;
              }
            }
          }
        }
      }

      // Grudge Match Logic
      if (
        race.graded &&
        (race.graded.grade === "G1" || race.graded.grade === "G2" || race.graded.grade === "G3")
      ) {
        const hasPlayerEntry = race.entries.some((e) => e.owned);
        if (hasPlayerEntry) {
          const rivalStablesInRace = new Set(
            race.entries.map((e) => e.stableId).filter((id) => id && id !== "player"),
          );

          for (const rivalStableId of rivalStablesInRace) {
            if (!rivalStableId) continue;
            const rivalAI = updatedAiManager.stableStates[rivalStableId];
            if (rivalAI && rivalAI.friction >= 50) {
              const rivalStable = stableMap.get(rivalStableId);
              if (!rivalStable) continue;

              const playerHorseIds = new Set(
                race.entries.filter((e) => e.owned).map((e) => e.horseId),
              );
              const rivalHorseIds = new Set(
                race.entries.filter((e) => e.stableId === rivalStableId).map((e) => e.horseId),
              );

              const playerBestPos = Math.min(
                ...race.result!.filter((r) => playerHorseIds.has(r.horseId)).map((r) => r.position),
              );
              const rivalBestPos = Math.min(
                ...race.result!.filter((r) => rivalHorseIds.has(r.horseId)).map((r) => r.position),
              );

              const playerHorseId = race.result!.find(
                (r) => r.position === playerBestPos && playerHorseIds.has(r.horseId),
              )?.horseId;
              const rivalHorseId = race.result!.find(
                (r) => r.position === rivalBestPos && rivalHorseIds.has(r.horseId),
              )?.horseId;

              if (playerHorseId && rivalHorseId) {
                const playerHorse = horseMap.get(playerHorseId);
                const rivalHorse = horseMap.get(rivalHorseId);

                if (playerHorse && rivalHorse) {
                  const playerWon = playerBestPos < rivalBestPos;
                  const news = generateGrudgeMatchNews(
                    race,
                    playerHorse,
                    rivalHorse,
                    playerWon,
                    currentDay,
                    rng,
                    rivalStable,
                  );
                  if (news) newsItems.push(news);

                  reputationEvents.push({
                    id: generateUUID(rng),
                    day: currentDay,
                    source: playerWon ? "rivalry_win" : "rivalry_loss",
                    amount: playerWon ? 15 : -10,
                    description: playerWon
                      ? `Defeated rival ${rivalStable.name} in a ${race.graded.grade} grudge match!`
                      : `Lost to rival ${rivalStable.name} in a ${race.graded.grade} grudge match.`,
                    horseId: playerHorse.id,
                    raceId: race.id,
                  });

                  const preFriction = rivalAI.friction;

                  if (playerWon) {
                    rivalAI.friction = Math.min(100, rivalAI.friction + 10);
                  } else {
                    const rivalWinGain = 15;
                    rivalAI.friction = Math.min(100, rivalAI.friction + rivalWinGain);
                    applyAllyFrictionCascade(
                      updatedAiManager,
                      rivalStableId!,
                      rivalWinGain,
                      region,
                    );
                  }

                  if (preFriction < 80 && rivalAI.friction >= 80) {
                    const escNews = generateRivalryEscalationNews(
                      rivalStable,
                      preFriction,
                      rivalAI.friction,
                      currentDay,
                      rng,
                    );
                    if (escNews) newsItems.push(escNews);
                  }

                  updatedAiManager.stableStates[rivalStableId!] = { ...rivalAI };
                }
              }
            }
          }
        }
      }
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
