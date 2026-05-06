import type { Horse, Race, Stable, Pregnancy, Jockey } from "@/game/types";
import { runNpcTraining, runNpcRaceEntry, updateHorseFame } from "@/game/npcRaceEntry";
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
 * 1. NPC Training
 * 2. NPC Race Entry (3 days ahead)
 * 3. Horse Fame Updates for yesterday's races
 * 4. AI state management and pruning
 *
 * @param npcStables - Array of NPC stables
 * @param horses - Current horse roster
 * @param races - Current race schedule
 * @param currentDay - The current game day
 * @param raceEntryDaysAhead - How many days ahead to enter races (default: 3)
 * @param aiManager - Existing AI manager (optional, for persistence)
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
  aiManager: NpcAIManager = { stableStates: new Map(), globalDay: currentDay },
  npcFacilities?: Record<string, Record<string, Facility>>,
): NpcCycleResult {
  // Skip if no NPC stables
  if (npcStables.length === 0) {
    return { horses, races, jockeys, aiManager };
  }

  // 1. NPC Training
  const horsesAfterTraining = runNpcTraining(npcStables, horses, currentDay, rng);

  // 2. NPC Race Entry (look ahead)
  const racesAfterEntry = runNpcRaceEntry(
    npcStables,
    horsesAfterTraining,
    jockeys,
    races,
    currentDay,
    rng,
    raceEntryDaysAhead,
    pregnantIds,
  );

  // 3. Update fame for horses in yesterday's races
  const yesterdayRaces = races.filter((r) => r.day === currentDay && r.resolved && r.result);
  let horsesAfterFame = horsesAfterTraining;
  for (const race of yesterdayRaces) {
    horsesAfterFame = updateHorseFame(horsesAfterFame, race);
  }

  // 4. AI state management
  // Clone AI manager to avoid mutating frozen/read-only objects
  let updatedAiManager = {
    ...aiManager,
    globalDay: currentDay,
    stableStates: new Map(aiManager.stableStates),
  };

  // Create or update AI state for each stable
  for (const stable of npcStables) {
    const stableAIState = getOrCreateStableAIState(updatedAiManager, stable, currentDay);
    updatedAiManager.stableStates.set(stable.id, updateStableAIState(stableAIState, currentDay));

    // Initialize facility AI if not present
    if (!stableAIState.facilityAI) {
      stableAIState.facilityAI = createFacilityAIState(stable);
    }

    // Initialize withdrawal AI if not present
    if (!stableAIState.withdrawalAI) {
      stableAIState.withdrawalAI = createWithdrawalAIState(stable);
    }

    // AI-driven claiming withdrawals
    // Check horses entered in claiming races and decide whether to withdraw
    const claimingRaces = races.filter((r) => r.raceClass === "Claiming" && r.day === currentDay + raceEntryDaysAhead);
    for (const race of claimingRaces) {
      const entry = race.entries.find((e) => {
        const horse = horsesAfterTraining.find((h) => h.id === e.horseId);
        return horse && horse.stableId === stable.id;
      });
      if (entry) {
        const horse = horsesAfterTraining.find((h) => h.id === entry.horseId);
        if (horse) {
          const shouldWithdraw = shouldWithdrawHorse(stableAIState.withdrawalAI, horse, race, stable, currentDay);
          if (shouldWithdraw) {
            // Mark entry as withdrawn from claiming
            entry.withdrawnFromClaiming = true;
            // Record withdrawal decision for AI learning
            recordWithdrawalDecision(stableAIState.withdrawalAI, horse, race, stable, true, "risk_assessment", currentDay);
          }
        }
      }
    }

    // AI-driven facility upgrades (if facilities are available)
    if (npcFacilities && npcFacilities[stable.id]) {
      const facilities = npcFacilities[stable.id];
      const facilityBudget = calculateFacilityBudget(stableAIState.facilityAI, stable, currentDay);
      
      if (facilityBudget.upgradeBudget > 0 && stable.cash >= facilityBudget.upgradeBudget) {
        const facilityToUpgrade = selectFacilityToUpgrade(stableAIState.facilityAI, facilities as any, stable, currentDay);
        if (facilityToUpgrade) {
          const currentFacility = facilities[facilityToUpgrade];
          const upgraded = upgradeFacility(currentFacility, currentDay);
          if (upgraded) {
            stable.cash -= upgraded.upgradeCost;
            facilities[facilityToUpgrade] = upgraded;
            // Record investment for AI learning
            recordFacilityInvestment(
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
  }

  // Prune old learning data (90-day memory depth)
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
