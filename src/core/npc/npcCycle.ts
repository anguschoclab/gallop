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
import type { ReputationEvent } from "@/core/reputation/reputationTypes";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
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
import type { Facility, PlayerFacilities } from "@/core/facilities/facilityTypes";
import { generateUUID } from "@/core/uuid";
import { RIVALRY_CONSTANTS } from "@/core/stable/rivalry";
import type { NewsItem } from "@/services/narrative/newsTypes";
import {
  generateRivalryEmergenceNews,
  generateGrudgeMatchNews,
  generateRegionLostNews,
  generateRivalryEscalationNews,
} from "@/services/narrative/rivalryNewsGenerator";
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
} from "@/constants";

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
export function applyFameGainsToHorses(horses: Horse[], fameGains: Map<string, number>): Horse[] {
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
 * Also detects rivalry milestones and generates news items.
 * @param races
 * @param horses
 * @param npcStables
 * @param aiManager
 * @param currentDay
 * @param rng
 * @returns Updated AI manager with new regional kings and friction values, plus generated news items.
 */
function processRegionalDominance(
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
      const winningStableId = winningHorse.stableId || "player";

      if (winningStableId === currentKingId) {
        // King defended their turf
        if (currentKingId !== "player") {
          const kingAI = updatedAiManager.stableStates[currentKingId];
          if (kingAI) kingAI.winsAgainstPlayer = 0;
        }
      } else {
        // Challenger won!
        if (winningStableId === "player") {
          // Player won against NPC King
          if (currentKingId && currentKingId !== "player") {
            const kingAI = updatedAiManager.stableStates[currentKingId];
            if (kingAI) {
              const oldFriction = kingAI.friction;
              kingAI.friction = Math.min(
                100,
                kingAI.friction + RIVALRY_CONSTANTS.FRICTION.WIN_GRADED_RACE_OVER_NPC,
              );

              // Check for rivalry escalation (friction crosses 80)
              if (oldFriction < 80 && kingAI.friction >= 80) {
                const kingStable = stableMap.get(currentKingId);
                if (kingStable) {
                  const escNews = generateRivalryEscalationNews(
                    kingStable, oldFriction, kingAI.friction, currentDay, rng,
                  );
                  if (escNews) newsItems.push(escNews);
                }
              }

              // Player dominance tracking: If player wins 3 in a row against the king, they unseat them
              // Note: winsAgainstPlayer here is hijacked or we need a new field for player wins
              // For simplicity, let's use regionalKings updates directly for player too
              if (!kingAI.winsAgainstPlayer) kingAI.winsAgainstPlayer = 0;
              // But winsAgainstPlayer in StableAIState is "wins of NPC against player"
              // So we don't have "player wins against NPC king" easily without a new map
            }

            // Simpler unseating logic: Player takes the crown if they win a G1 in the region
            if (race.graded && race.graded.grade === "G1") {
              updatedAiManager.regionalKings[region] = "player";
              // Generate news? (Optional, maybe later)
            }
          } else if (!currentKingId) {
            // Vacant crown
            updatedAiManager.regionalKings[region] = "player";
          }
        } else {
          // NPC won
          const stable = stableMap.get(winningStableId);
          if (stable) {
            const stableAI = getOrCreateStableAIState(updatedAiManager, stable, currentDay);
            const oldFriction = stableAI.friction;

            if (currentKingId === "player") {
              stableAI.winsAgainstPlayer++;
              if (stableAI.winsAgainstPlayer >= RIVALRY_CONSTANTS.DOMINANCE.UNSEAT_WIN_STREAK) {
                updatedAiManager.regionalKings[region] = winningStableId;
                stableAI.winsAgainstPlayer = 0;

                // Generate region lost news
                const news = generateRegionLostNews(region, stable, currentDay, rng);
                if (news) newsItems.push(news);
              }
            } else {
              // NPC takes vacant or other NPC crown
              updatedAiManager.regionalKings[region] = winningStableId;
            }
            stableAI.regionalPrestige[region] = (stableAI.regionalPrestige[region] || 0) + 1;
            updatedAiManager.stableStates[stable.id] = stableAI;

            // Check for rivalry emergence (friction crosses 60)
            if (oldFriction < 60 && stableAI.friction >= 60 && !stableAI.rivalryAnnouncedDay) {
              const news = generateRivalryEmergenceNews(stable, stableAI.friction, currentDay, rng);
              if (news) {
                newsItems.push(news);
                stableAI.rivalryAnnouncedDay = currentDay;
              }
            }
          }
        }
      }

      // Grudge Match Logic (Deduplicated per stable)
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

              // Find best horses for headline
              // ⚡ Bolt: Replace O(N*M) lookups inside arrays (.filter/.find containing .some) with O(1) Set lookups
              const playerHorseIds = new Set(race.entries.filter((e) => e.owned).map((e) => e.horseId));
              const rivalHorseIds = new Set(
                race.entries.filter((e) => e.stableId === rivalStableId).map((e) => e.horseId),
              );

              const playerBestPos = Math.min(
                ...race
                  .result!.filter((r) => playerHorseIds.has(r.horseId))
                  .map((r) => r.position),
              );
              const rivalBestPos = Math.min(
                ...race
                  .result!.filter((r) => rivalHorseIds.has(r.horseId))
                  .map((r) => r.position),
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

                  // Add Reputation Event
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

                  // Track pre-update friction for escalation check
                  const preFriction = rivalAI.friction;

                  // Update friction based on grudge match outcome (Humiliation Path)
                  if (playerWon) {
                    // Beating a hated rival makes them angrier (humiliation)
                    rivalAI.friction = Math.min(100, rivalAI.friction + 10);
                  } else {
                    // Rival victory - they taunt you, friction increases
                    rivalAI.friction = Math.min(100, rivalAI.friction + 15);
                  }

                  // Check for rivalry escalation (friction crosses 80)
                  if (preFriction < 80 && rivalAI.friction >= 80) {
                    const escNews = generateRivalryEscalationNews(
                      rivalStable, preFriction, rivalAI.friction, currentDay, rng,
                    );
                    if (escNews) newsItems.push(escNews);
                  }

                  // Update the aiManager state with new friction value
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
 * @param aiManager
 * @returns Updated AI manager with decayed friction values.
 */
function applyFrictionDecay(aiManager: NpcAIManager): NpcAIManager {
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
      return { horses, races, jockeys, aiManager, cashChanges: [], fameChanges: [] };
    }

    // 1. NPC Training and 2. NPC Race Entry are now handled via the Intent/Impact pipeline
    const horsesAfterTraining = horses;
    const racesAfterEntry = races;
    const cashChanges: Array<{ stableId: string; amount: number; reason: string }> = [];
    let fameChanges: Array<{ horseId: string; delta: number }> = [];

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
    const newsItems = dominanceResult.newsItems;
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
        if (updatedNpcFacilities && updatedNpcFacilities[stable.id]) {
          const facilities = updatedNpcFacilities[stable.id];
          const facilityBudget = calculateFacilityBudget(
            stableAIState.facilityAI,
            stable,
            currentDay,
          );

          if (facilityBudget.upgradeBudget > 0 && stable.cash >= facilityBudget.upgradeBudget) {
            const facilityToUpgrade = selectFacilityToUpgrade(
              stableAIState.facilityAI,
              facilities,
              stable,
              currentDay,
            );
            if (facilityToUpgrade) {
              const currentFacility = facilities[facilityToUpgrade];
              if (!currentFacility) continue;
              const upgraded = upgradeFacility(currentFacility, currentDay);
              if (upgraded) {
                cashChanges.push({
                  stableId: stable.id,
                  amount: -upgraded.upgradeCost,
                  reason: `Facility upgrade: ${facilityToUpgrade}`,
                });
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
      npcFacilities: updatedNpcFacilities,
      newsItems,
      reputationEvents: dominanceResult.reputationEvents,
      cashChanges,
      fameChanges,
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
    };
  }
}
