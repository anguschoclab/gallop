/**
 * npc/npcCycle.ts - NPC cycle orchestration
 *
 * This file provides the main NPC cycle orchestration that coordinates
 * NPC training, race entry, horse fame updates, and AI state management.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, Jockey), @/game/rng (Rng, createRng, hashStr), @/core/ai/npcCycleAI (NpcAIManager functions), @/core/ai/facilityAI (facility AI functions), @/core/facilities (upgradeFacility), @/core/ai/withdrawalAI (withdrawal AI functions)
 * Related files: intentGenerators.ts (provides intent generation)
 */

import type { Horse, Race, Stable, Jockey } from "@/game/types";
import { createRng, hashStr, type Rng } from "@/game/rng";
import {
  NpcAIManager,
  getOrCreateStableAIState,
  updateStableAIState,
  pruneAllLearningData,
} from "@/core/ai/npcCycleAI";
import {
  selectFacilityToUpgrade,
  calculateFacilityBudget,
  createFacilityAIState,
  recordFacilityInvestment,
} from "@/core/ai/facilityAI";
import { upgradeFacility } from "@/core/facilities";
import type { Facility } from "@/core/facilities/facilityTypes";
import { RIVALRY_CONSTANTS } from "@/core/stable/rivalry";
import {
  FAME_GAIN_G1_WIN,
  FAME_GAIN_G2_WIN,
  FAME_GAIN_G3_WIN,
  FAME_GAIN_OTHER_WIN,
  FAME_GAIN_G1_TOP3,
  FAME_GAIN_G2_TOP3,
  FAME_GAIN_G3_TOP3,
  FAME_GAIN_OTHER_TOP3,
  FAME_GAIN_TOP5,
  FAME_BONUS_LARGE_PURSE,
  FAME_BONUS_MEDIUM_PURSE,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
  MAX_FAME,
} from "@/game/constants/gameConstants";

/**
 * Calculate fame gains for horses based on race results.
 * @param races
 * @returns A map of horseId to fame gain amount.
 */
function calculateFameGainsForRaces(races: Race[]): Map<string, number> {
  try {
    const fameGains = new Map<string, number>();

    for (const race of races) {
      if (!race.result) continue;
      for (const result of race.result) {
        let fameGain = 0;

        // Base fame from position and grade
        if (result.position === 1) {
          fameGain =
            race.graded?.grade === "G1"
              ? FAME_GAIN_G1_WIN
              : race.graded?.grade === "G2"
                ? FAME_GAIN_G2_WIN
                : race.graded?.grade === "G3"
                  ? FAME_GAIN_G3_WIN
                  : FAME_GAIN_OTHER_WIN;
        } else if (result.position <= 3) {
          fameGain =
            race.graded?.grade === "G1"
              ? FAME_GAIN_G1_TOP3
              : race.graded?.grade === "G2"
                ? FAME_GAIN_G2_TOP3
                : race.graded?.grade === "G3"
                  ? FAME_GAIN_G3_TOP3
                  : FAME_GAIN_OTHER_TOP3;
        } else if (result.position <= 5) {
          fameGain = FAME_GAIN_TOP5;
        }

        // Bonus fame from purse size
        if (race.purse > LARGE_PURSE_THRESHOLD) {
          fameGain += FAME_BONUS_LARGE_PURSE;
        } else if (race.purse > MEDIUM_PURSE_THRESHOLD) {
          fameGain += FAME_BONUS_MEDIUM_PURSE;
        }

        if (fameGain > 0) {
          const current = fameGains.get(result.horseId) || 0;
          fameGains.set(result.horseId, current + fameGain);
        }
      }
    }

    return fameGains;
  } catch (error) {
    console.error("Error calculating fame gains for races:", error);
    return new Map<string, number>();
  }
}

/**
 * Apply fame gains to horses.
 * @param horses
 * @param fameGains
 * @returns Updated horses array with applied fame changes.
 */
function applyFameGainsToHorses(horses: Horse[], fameGains: Map<string, number>): Horse[] {
  return horses.map((h) => {
    const gain = fameGains.get(h.id);
    if (gain) {
      return { ...h, fame: Math.min(MAX_FAME, h.fame + gain) };
    }
    return h;
  });
}

/**
 * Process regional dominance updates based on race winners.
 * Updates the AI manager with new regional kings and friction values.
 * @param races
 * @param horses
 * @param npcStables
 * @param aiManager
 * @param currentDay
 * @returns Updated AI manager with new regional kings and friction values.
 */
function processRegionalDominance(
  races: Race[],
  horses: Horse[],
  npcStables: Stable[],
  aiManager: NpcAIManager,
  currentDay: number,
): NpcAIManager {
  try {
    const updatedAiManager = { ...aiManager };

    for (const race of races) {
      if (!race.result || race.result.length === 0) continue;
      const winner = race.result[0];
      const region = (race as any).country || "North America (East)";
      const currentKingId = updatedAiManager.regionalKings[region];

      const winningHorse = horses.find((h) => h.id === winner.horseId);
      if (!winningHorse) continue;
      const winningStableId = winningHorse.stableId || "player";

      if (winningStableId === currentKingId) {
        // King defended their turf
        const kingAI = updatedAiManager.stableStates[currentKingId];
        if (kingAI) kingAI.winsAgainstPlayer = 0;
      } else {
        // Challenger won!
        if (winningStableId === "player") {
          if (currentKingId && currentKingId !== "player") {
            const kingAI = updatedAiManager.stableStates[currentKingId];
            if (kingAI)
              kingAI.friction = Math.min(
                100,
                kingAI.friction + RIVALRY_CONSTANTS.FRICTION.WIN_GRADED_RACE_OVER_NPC,
              );
          }
        } else {
          const stable = npcStables.find((s) => s.id === winningStableId);
          if (stable) {
            const stableAI = getOrCreateStableAIState(updatedAiManager, stable, currentDay);
            if (currentKingId === "player") {
              stableAI.winsAgainstPlayer++;
              if (stableAI.winsAgainstPlayer >= RIVALRY_CONSTANTS.DOMINANCE.UNSEAT_WIN_STREAK) {
                updatedAiManager.regionalKings[region] = winningStableId;
                stableAI.winsAgainstPlayer = 0;
              }
            } else {
              updatedAiManager.regionalKings[region] = winningStableId;
            }
            stableAI.regionalPrestige[region] = (stableAI.regionalPrestige[region] || 0) + 1;
            updatedAiManager.stableStates[stable.id] = stableAI;
          }
        }
      }
    }

    return updatedAiManager;
  } catch (error) {
    console.error("Error processing regional dominance:", error);
    return aiManager;
  }
}

/**
 * Apply friction decay to all stable AI states.
 * @param aiManager
 * @returns Updated AI manager with decayed friction values.
 */
function applyFrictionDecay(aiManager: NpcAIManager): NpcAIManager {
  try {
    const updatedAiManager = { ...aiManager, stableStates: { ...aiManager.stableStates } };

    for (const id in updatedAiManager.stableStates) {
      updatedAiManager.stableStates[id].friction *= RIVALRY_CONSTANTS.FRICTION.DECAY_RATE;
    }

    return updatedAiManager;
  } catch (error) {
    console.error("Error applying friction decay:", error);
    return aiManager;
  }
}

/**
 * NPC Cycle Result
 */
export interface NpcCycleResult {
  horses: Horse[];
  races: Race[];
  jockeys: Jockey[];
  aiManager: NpcAIManager;
  npcFacilities?: Record<string, Record<string, Facility>>;
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
  npcFacilities?: Record<string, Record<string, Facility>>,
): NpcCycleResult {
  try {
    // Skip if no NPC stables
    if (npcStables.length === 0) {
      return { horses, races, jockeys, aiManager };
    }

    // 1. NPC Training and 2. NPC Race Entry are now handled via the Intent/Impact pipeline
    const horsesAfterTraining = horses;
    const racesAfterEntry = races;

    // 3. Update fame for horses in yesterday's races
    const yesterdayRaces = races.filter((r) => r.day === currentDay && r.resolved && r.result);

    if (yesterdayRaces.length > 0) {
      const fameGains = calculateFameGainsForRaces(yesterdayRaces);
      if (fameGains.size > 0) {
        horses = applyFameGainsToHorses(horses, fameGains);
      }
    }

    // 4. AI state management
    let updatedAiManager: NpcAIManager = {
      ...aiManager,
      globalDay: currentDay,
      stableStates: { ...aiManager.stableStates },
      regionalKings: { ...(aiManager.regionalKings || {}) },
    };

    // Regional dominance & friction decay
    updatedAiManager = processRegionalDominance(
      yesterdayRaces,
      horses,
      npcStables,
      updatedAiManager,
      currentDay,
    );
    updatedAiManager = applyFrictionDecay(updatedAiManager);

    // Check horses entered in claiming races and decide whether to withdraw
    const claimingRaces = races.filter(
      (r) => r.raceClass === "Claiming" && r.day === currentDay + raceEntryDaysAhead,
    );

    // Create or update AI state for each stable
    for (const stable of npcStables) {
      try {
        const stableAIState = getOrCreateStableAIState(updatedAiManager, stable, currentDay);

        // Initialize sub-AIs if not present
        if (!stableAIState.facilityAI) {
          stableAIState.facilityAI = createFacilityAIState(stable);
        }

        // AI-driven facility upgrades
        if (npcFacilities && npcFacilities[stable.id]) {
          const facilities = npcFacilities[stable.id];
          const facilityBudget = calculateFacilityBudget(stableAIState.facilityAI, stable, currentDay);

          if (facilityBudget.upgradeBudget > 0 && stable.cash >= facilityBudget.upgradeBudget) {
            const facilityToUpgrade = selectFacilityToUpgrade(
              stableAIState.facilityAI,
              facilities as any,
              stable,
              currentDay,
            );
            if (facilityToUpgrade) {
              const currentFacility = facilities[facilityToUpgrade];
              const upgraded = upgradeFacility(currentFacility, currentDay);
              if (upgraded) {
                stable.cash -= upgraded.upgradeCost;
                facilities[facilityToUpgrade] = upgraded;
                stableAIState.facilityAI = recordFacilityInvestment(
                  stableAIState.facilityAI,
                  facilityToUpgrade,
                  currentFacility.level,
                  upgraded.level,
                  upgraded.upgradeCost,
                  stable,
                  currentDay,
                );
              }
            }
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
      npcFacilities,
    };
  } catch (error) {
    console.error("Error in runNpcCycle:", error);
    // Return original state on error to prevent corruption
    return { horses, races, jockeys, aiManager, npcFacilities };
  }
}

// Helper for Record-based lookup
class RecordMap<V> {
  private record: Record<string, V> = {};
  constructor(entries: [string, V][]) {
    for (const [k, v] of entries) this.record[k] = v;
  }
  get(key: string): V | undefined {
    return this.record[key];
  }
}
