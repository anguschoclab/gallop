/**
 * regionalDominanceHelpers.ts - Pure helpers extracted from resolveRegionalDominance.
 *
 * Each helper handles one responsibility, keeping the coordinator thin.
 *
 * Dependencies: @/game/types, @/core/ai/npcCycleAI, @/core/stable/rivalry,
 *              @/core/narrative/rivalryNewsGenerator, @/core/uuid, @/core/common/rng
 * Related files: src/core/npc/npcRegionalDominance.ts (coordinator)
 */

import type { Horse, Race, Stable } from "@/game/types";
import type { ReputationEvent } from "@/core/reputation/reputationTypes";
import type { Rng } from "@/core/common/rng";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { RIVALRY_CONSTANTS } from "@/core/stable/rivalry";
import { generateUUID } from "@/core/uuid";
import type { NewsItem } from "@/core/narrative/newsTypes";
import { isPlayerOwned } from "@/core/horse/ownership";
import { asStableId } from "@/core/types/branded";
import {
  generateRivalryEmergenceNews,
  generateGrudgeMatchNews,
  generateRegionLostNews,
  generateRivalryEscalationNews,
  generateStableIntroNews,
} from "@/core/narrative/rivalryNewsGenerator";

/** Result of processing a single race's regional dominance. */
export interface RaceDominanceResult {
  newsItems: NewsItem[];
  reputationEvents: ReputationEvent[];
}

/**
 * Resolve the winning stable ID from a race result.
 * @param winningHorse
 * @returns The stable ID ("player" or NPC stable ID), or null if unresolvable.
 */
export function resolveWinningStableId(winningHorse: Horse | undefined): string | null {
  if (!winningHorse) return null;
  if (isPlayerOwned(winningHorse)) return "player";
  if (winningHorse.ownership?.type === "npc") return winningHorse.ownership.stableId;
  return null;
}

/**
 * Handle the case where the player wins a graded race in a region controlled by an NPC king.
 * Updates friction and generates escalation news if the threshold is crossed.
 * @param aiManager
 * @param currentKingId
 * @param region
 * @param race
 * @param currentDay
 * @param rng
 * @param stableMap
 */
export function handlePlayerUnseatsNpcKing(
  aiManager: NpcAIManager,
  currentKingId: string,
  region: string,
  race: Race,
  currentDay: number,
  rng: Rng,
  stableMap: Map<string, Stable>,
): NewsItem[] {
  const newsItems: NewsItem[] = [];
  const kingAI = aiManager.stableStates[currentKingId];
  if (!kingAI) return newsItems;

  const oldFriction = kingAI.friction;
  kingAI.friction = Math.min(
    100,
    kingAI.friction + RIVALRY_CONSTANTS.FRICTION.WIN_GRADED_RACE_OVER_NPC,
  );

  if (oldFriction < 80 && kingAI.friction >= 80) {
    const kingStable = stableMap.get(asStableId(currentKingId));
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

  if (race.graded && race.graded.grade === "G1") {
    aiManager.regionalKings[region] = "player";
  }
  return newsItems;
}

/**
 * Handle the case where an NPC stable wins a graded race.
 * Updates regional kings, prestige, and generates rivalry emergence news.
 * @param aiManager
 * @param winningStableId
 * @param currentKingId
 * @param region
 * @param race
 * @param currentDay
 * @param rng
 * @param stableMap
 */
export function handleNpcWinsRegion(
  aiManager: NpcAIManager,
  winningStableId: string,
  currentKingId: string | undefined,
  region: string,
  race: Race,
  currentDay: number,
  rng: Rng,
  stableMap: Map<string, Stable>,
): NewsItem[] {
  const newsItems: NewsItem[] = [];
  const stable = stableMap.get(winningStableId);
  if (!stable) return newsItems;

  const stableAI = getOrCreateStableAIState(aiManager, stable, currentDay);
  const oldFriction = stableAI.friction;

  if (currentKingId === "player") {
    stableAI.winsAgainstPlayer++;
    if (stableAI.winsAgainstPlayer >= RIVALRY_CONSTANTS.DOMINANCE.UNSEAT_WIN_STREAK) {
      aiManager.regionalKings = { ...aiManager.regionalKings, [region]: winningStableId };
      stableAI.winsAgainstPlayer = 0;
      const news = generateRegionLostNews(region, stable, currentDay, rng);
      if (news) newsItems.push(news);
    }
  } else {
    aiManager.regionalKings = { ...aiManager.regionalKings, [region]: winningStableId };
  }

  stableAI.regionalPrestige = {
    ...stableAI.regionalPrestige,
    [region]: (stableAI.regionalPrestige[region] || 0) + 1,
  };
  aiManager.stableStates[stable.id] = stableAI;

  if (currentKingId === "player") {
    applyAllyFrictionCascadeInternal(aiManager, stable.id, 5, region);
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
  return newsItems;
}

/**
 * Apply ally friction cascades — when an NPC gains friction against the player,
 * their allies also gain a reduced amount of friction.
 * @param aiManager
 * @param sourceStableId
 * @param frictionGain
 * @param _region
 */
function applyAllyFrictionCascadeInternal(
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
 * Build lookup maps for player and NPC horses in a race (for grudge matching).
 * @param race
 */
export function buildRaceEntryMaps(race: Race): {
  playerHorseIds: Set<string>;
  npcHorseIdsByStable: Map<string, Set<string>>;
} {
  const playerHorseIds = new Set<string>();
  const npcHorseIdsByStable = new Map<string, Set<string>>();
  for (const e of race.entries) {
    if (e.ownership?.type === "player") {
      playerHorseIds.add(e.horseId);
    } else if (e.ownership?.type === "npc") {
      const sid = e.ownership.stableId;
      let set = npcHorseIdsByStable.get(sid);
      if (!set) {
        set = new Set();
        npcHorseIdsByStable.set(sid, set);
      }
      set.add(e.horseId);
    }
  }
  return { playerHorseIds, npcHorseIdsByStable };
}

/**
 * Find the best (lowest position) result for a set of horse IDs.
 * @param race
 * @param horseIds
 */
export function findBestResult(
  race: Race,
  horseIds: Set<string>,
): { horseId: string; position: number } | null {
  const results = (race.result ?? []).filter((r) => horseIds.has(r.horseId));
  if (results.length === 0) return null;
  const bestPos = Math.min(...results.map((r) => r.position));
  const found = results.find((r) => r.position === bestPos);
  return found ? { horseId: found.horseId, position: bestPos } : null;
}

/**
 * Process a single grudge match between a player horse and a rival NPC horse.
 * Generates news, reputation events, and updates friction.
 * @param race
 * @param playerHorse
 * @param rivalHorse
 * @param playerWon
 * @param rivalStable
 * @param rivalAI
 * @param currentDay
 * @param rng
 */
export function resolveGrudgeMatch(
  race: Race,
  playerHorse: Horse,
  rivalHorse: Horse,
  playerWon: boolean,
  rivalStable: Stable,
  rivalAI: NpcAIManager["stableStates"][string],
  currentDay: number,
  rng: Rng,
): { newsItems: NewsItem[]; reputationEvents: ReputationEvent[] } {
  const newsItems: NewsItem[] = [];
  const reputationEvents: ReputationEvent[] = [];

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
      ? `Defeated rival ${rivalStable.name} in a ${race.graded!.grade} grudge match!`
      : `Lost to rival ${rivalStable.name} in a ${race.graded!.grade} grudge match.`,
    horseId: playerHorse.id,
    raceId: race.id,
  });

  const preFriction = rivalAI.friction;
  if (playerWon) {
    rivalAI.friction = Math.min(100, rivalAI.friction + 10);
  } else {
    const rivalWinGain = 15;
    rivalAI.friction = Math.min(100, rivalAI.friction + rivalWinGain);
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

  return { newsItems, reputationEvents };
}
