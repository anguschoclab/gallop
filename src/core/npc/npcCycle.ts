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
import {
  shouldWithdrawHorse,
  createWithdrawalAIState,
  recordWithdrawalDecision,
} from "@/core/ai/withdrawalAI";

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
 * @param races - Current race schedule
 * @param currentDay - The current game day
 * @param raceEntryDaysAhead - How many days ahead to enter races (default: 3)
 * @param aiManager - Existing AI manager
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
  aiManager: NpcAIManager = { stableStates: {}, globalDay: currentDay },
  npcFacilities?: Record<string, Record<string, Facility>>,
): NpcCycleResult {
  // Skip if no NPC stables
  if (npcStables.length === 0) {
    return { horses, races, jockeys, aiManager };
  }

  // 1. NPC Training and 2. NPC Race Entry are now handled via the Intent/Impact pipeline
  const horsesAfterTraining = horses;
  const racesAfterEntry = races;

  // 3. Update fame for horses in yesterday's races
  const yesterdayRaces = races.filter((r) => r.day === currentDay && r.resolved && r.result);
  let horsesAfterFame = [...horsesAfterTraining];
  const horseMap = new RecordMap(horsesAfterFame.map((h) => [h.id, h]));
  
  for (const race of yesterdayRaces) {
    if (!race.result) continue;
    for (const result of race.result) {
      const horse = horseMap.get(result.horseId);
      if (horse) {
        let fameGain = 0;
        if (result.position === 1) {
          fameGain = race.graded?.grade === "G1" ? 20 : race.graded?.grade === "G2" ? 15 : race.graded?.grade === "G3" ? 10 : 5;
        } else if (result.position <= 3) {
          fameGain = race.graded?.grade === "G1" ? 10 : race.graded?.grade === "G2" ? 8 : race.graded?.grade === "G3" ? 5 : 2;
        } else if (result.position <= 5) {
          fameGain = 1;
        }
        if (race.purse > 500000) fameGain += 3;
        else if (race.purse > 100000) fameGain += 1;
        
        const horseIdx = horsesAfterFame.findIndex(h => h.id === horse.id);
        if (horseIdx !== -1) {
          horsesAfterFame[horseIdx] = {
            ...horse,
            fame: Math.min(100, horse.fame + fameGain)
          };
        }
      }
    }
  }

  // 4. AI state management
  let updatedAiManager = {
    ...aiManager,
    globalDay: currentDay,
    stableStates: { ...aiManager.stableStates },
  };

  // Check horses entered in claiming races and decide whether to withdraw
  const claimingRaces = races.filter(
    (r) => r.raceClass === "Claiming" && r.day === currentDay + raceEntryDaysAhead,
  );

  // Create or update AI state for each stable
  for (const stable of npcStables) {
    let stableAIState = getOrCreateStableAIState(updatedAiManager, stable, currentDay);

    // Initialize sub-AIs if not present
    if (!stableAIState.facilityAI) {
      stableAIState.facilityAI = createFacilityAIState(stable);
    }
    if (!stableAIState.withdrawalAI) {
      stableAIState.withdrawalAI = createWithdrawalAIState(stable);
    }

    // AI-driven claiming withdrawals
    for (const race of claimingRaces) {
      const entry = race.entries.find((e) => {
        const horse = horseMap.get(e.horseId);
        return horse && horse.stableId === stable.id;
      });
      if (entry) {
        const horse = horseMap.get(entry.horseId);
        if (horse) {
          const { shouldWithdraw, reason } = shouldWithdrawHorse(
            stableAIState.withdrawalAI,
            horse,
            race,
            stable,
            currentDay,
          );
          if (shouldWithdraw) {
            entry.withdrawnFromClaiming = true;
            stableAIState.withdrawalAI = recordWithdrawalDecision(
              stableAIState.withdrawalAI,
              horse,
              race,
              stable,
              true,
              reason || "risk_assessment",
              currentDay,
            );
          }
        }
      }
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
  }

  // Prune old learning data
  const cutoffDay = currentDay - 90;
  updatedAiManager = pruneAllLearningData(updatedAiManager, cutoffDay);

  return {
    horses: horsesAfterFame,
    races: racesAfterEntry,
    jockeys,
    aiManager: updatedAiManager,
    npcFacilities,
  };
}

// Helper for Record-based lookup
class RecordMap<V> {
  private record: Record<string, V> = {};
  constructor(entries: [string, V][]) {
    for (const [k, v] of entries) this.record[k] = v;
  }
  get(key: string): V | undefined { return this.record[key]; }
}
