/**
 * npc/npcCycle.ts - NPC cycle orchestration
 *
 * This file provides the main NPC cycle orchestration that coordinates
 * NPC training, race entry, horse fame updates, and AI state management.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, Jockey), @/core/common/rng (Rng), @/core/ai/npcCycleAI (NpcAIManager, getOrCreateStableAIState, updateStableAIState, pruneAllLearningData), ./npcFame (calculateFameGainsForRaces), ./npcRegionalDominance (processRegionalDominance, applyFrictionDecay), ./npcFacilityUpgrades (processNpcFacilityUpgrade), @/core/horse/fans (calculateFanGainsForRaces)
 * Related files: intentGenerators.ts (provides intent generation)
 */

import type { Horse, Race, Stable, Jockey } from "@/game/types";
import type { ReputationEvent } from "@/core/reputation/reputationTypes";
import type { Rng } from "@/core/common/rng";
import {
  NpcAIManager,
  getOrCreateStableAIState,
  updateStableAIState,
  pruneAllLearningData,
} from "@/core/ai/npcCycleAI";
import type { PlayerFacilities } from "@/core/facilities/facilityTypes";
import type { NewsItem } from "@/services/narrative/newsTypes";
import { calculateFanGainsForRaces } from "@/core/horse/fans";
import { calculateFameGainsForRaces } from "./npcFame";
import { processRegionalDominance, applyFrictionDecay } from "./npcRegionalDominance";
import { processNpcFacilityUpgrade } from "./npcFacilityUpgrades";

// Re-export fame functions for backward compatibility
export { calculateFameGainsForRaces, applyFameGainsToHorses } from "./npcFame";

/**
 * NPC Cycle Result
 */
export interface NpcCycleResult {
  horses: Horse[];
  races: Race[];
  jockeys: Jockey[];
  aiManager: NpcAIManager;
  npcFacilities?: Record<string, PlayerFacilities>;
  newsItems?: NewsItem[];
  reputationEvents?: ReputationEvent[];
  cashChanges?: Array<{ stableId: string; amount: number; reason: string }>;
  fameChanges?: Array<{ horseId: string; delta: number }>;
  fanChanges?: Array<{ horseId: string; delta: number }>;
}

/**
 * Run the complete NPC cycle for a single day
 * This orchestrates:
 * 1. NPC Training (handled via Intent pipeline)
 * 2. NPC Race Entry (handled via Intent pipeline)
 * 3. Horse Fame Updates for yesterday's races
 * 4. AI state management and pruning
 *
 * @param npcStables - Array of NPC stables
 * @param horses - Current horse roster
 * @param jockeys - Current jockeys
 * @param races - Current race schedule
 * @param currentDay - The current game day
 * @param rng - Random number generator
 * @param raceEntryDaysAhead - How many days ahead to enter races (default: 3)
 * @param pregnantIds - Set of IDs for pregnant mares
 * @param aiManager - Existing AI manager
 * @param npcFacilities - Optional record of NPC facilities
 * @returns Updated horses, races, and AI manager
 */
export function runNpcCycle(
  npcStables: Stable[],
  horses: Horse[],
  jockeys: Jockey[],
  races: Race[],
  currentDay: number,
  rng: Rng,
  raceEntryDaysAhead: number = 3,
  pregnantIds: Set<string> = new Set(),
  aiManager: NpcAIManager = { stableStates: {}, globalDay: currentDay, regionalKings: {} },
  npcFacilities?: Record<string, PlayerFacilities>,
): NpcCycleResult {
  try {
    // Skip if no NPC stables
    if (npcStables.length === 0) {
      return {
        horses,
        races,
        jockeys,
        aiManager,
        cashChanges: [],
        fameChanges: [],
        fanChanges: [],
      };
    }

    // 1. NPC Training and 2. NPC Race Entry are now handled via the Intent/Impact pipeline
    const horsesAfterTraining = horses;
    const racesAfterEntry = races;
    const cashChanges: Array<{ stableId: string; amount: number; reason: string }> = [];
    let fameChanges: Array<{ horseId: string; delta: number }> = [];
    let fanChanges: Array<{ horseId: string; delta: number }> = [];

    // Clone facilities to avoid mutating the input state.
    let updatedNpcFacilities = npcFacilities;
    if (npcFacilities) {
      updatedNpcFacilities = {};
      for (const stableId in npcFacilities) {
        updatedNpcFacilities[stableId] = { ...npcFacilities[stableId] };
      }
    }

    // 3. Calculate fame gains for horses in yesterday's races (do not mutate horses here).
    const yesterdayRaces = races.filter((r) => r.day === currentDay && r.resolved && r.result);

    if (yesterdayRaces.length > 0) {
      const fameGains = calculateFameGainsForRaces(yesterdayRaces);
      if (fameGains.size > 0) {
        fameChanges = Array.from(fameGains.entries()).map(([horseId, delta]) => ({
          horseId,
          delta,
        }));
      }

      const fanGains = calculateFanGainsForRaces(yesterdayRaces);
      if (fanGains.size > 0) {
        fanChanges = Array.from(fanGains.entries()).map(([horseId, delta]) => ({
          horseId,
          delta,
        }));
      }
    }

    // 4. AI state management
    let updatedAiManager: NpcAIManager = {
      ...aiManager,
      globalDay: currentDay,
      stableStates: Object.fromEntries(
        Object.entries(aiManager.stableStates).map(([id, s]) => [id, { ...s }]),
      ),
      regionalKings: { ...(aiManager.regionalKings || {}) },
    };

    // Regional dominance & friction decay
    const dominanceResult = processRegionalDominance(
      yesterdayRaces,
      horses,
      npcStables,
      updatedAiManager,
      currentDay,
      rng,
    );
    updatedAiManager = dominanceResult.aiManager;
    const newsItems: NewsItem[] = [...dominanceResult.newsItems];

    // Collect smart notification news items from intent generation
    if (updatedAiManager.pendingNewsItems && updatedAiManager.pendingNewsItems.length > 0) {
      newsItems.push(...updatedAiManager.pendingNewsItems);
      updatedAiManager.pendingNewsItems = [];
    }

    updatedAiManager = applyFrictionDecay(updatedAiManager);

    // Create or update AI state for each stable
    for (const stable of npcStables) {
      try {
        const stableAIState = getOrCreateStableAIState(updatedAiManager, stable, currentDay);

        // AI-driven facility upgrades
        if (updatedNpcFacilities && updatedNpcFacilities[stable.id]) {
          const cashChange = processNpcFacilityUpgrade(
            stable,
            stableAIState,
            updatedNpcFacilities[stable.id],
            currentDay,
          );
          if (cashChange) {
            cashChanges.push(cashChange);
          }
        }

        // Update stable state in manager
        updatedAiManager.stableStates[stable.id] = updateStableAIState(stableAIState, currentDay);
      } catch (error) {
        console.error(`Error processing stable ${stable.id} in NPC cycle:`, error);
      }
    }

    // Prune old learning data
    const cutoffDay = currentDay - 90;
    updatedAiManager = pruneAllLearningData(updatedAiManager, cutoffDay);

    return {
      horses,
      races: racesAfterEntry,
      jockeys,
      aiManager: updatedAiManager,
      npcFacilities: updatedNpcFacilities,
      newsItems,
      reputationEvents: dominanceResult.reputationEvents,
      cashChanges,
      fameChanges,
      fanChanges,
    };
  } catch (error) {
    console.error("Error in runNpcCycle:", error);
    // Return original state on error to prevent corruption
    return {
      horses,
      races,
      jockeys,
      aiManager,
      npcFacilities,
      newsItems: [],
      cashChanges: [],
      fameChanges: [],
      fanChanges: [],
    };
  }
}
