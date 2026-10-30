/**
 * npcRaceEntry.ts - AI race entry system for NPC stables
 *
 * This file provides AI race entry for NPC stables, evaluating races 1-3 days ahead
 * and entering eligible, competitive horses using modular scoring, geometry, and AI systems.
 *
 * Dependencies: ./types (Horse, Race, Stable, Jockey), ./rng (Rng), @/core/race/entryScoring (calculateAssignedWeight, MAX_HORSES_PER_STABLE_PER_RACE), @/domains/agents/simulation/jockeyStrategyAI (calculateOptimalTactics), @/domains/agents/simulation/npcCycleAI (NpcAIManager), ./npcRaceEntryHelpers (shouldEnterHorse)
 * Related files: npcRaceEntryHelpers.ts (provides entry logic), npcStables.ts (uses race entry)
 */

// AI Race Entry System - NPC stables intelligently enter horses in races
// Evaluates races 1-3 days ahead and enters eligible, competitive horses
// Refactored to use modular scoring, geometry, and AI systems

import {
  addNpcBooking,
  buildNpcBookings,
  canBookNpcStart,
  NPC_ENTRY_CASH_RESERVE,
  prioritiseRacesForNpcEntry,
  removeNpcBooking,
} from "@/domains/agents/simulation/npc/raceBooking";
import { MINIMUM_RACE_ENTRIES } from "@/domains/race/model/raceClassificationConstants";
import type { Horse, Race, Stable, Jockey } from "@/platform/game/types";
import type { Rng } from "@/shared/common/rng";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import { calculateAssignedWeight } from "@/domains/race/simulation/entryScoring";
import { MAX_HORSES_PER_STABLE_PER_RACE } from "@/domains/race/model/raceEntryConstants";
import { findBumpableEntryIndex } from "@/domains/race/simulation/entry/bumpResolver";
import { calculateOptimalTactics } from "@/domains/agents/simulation/jockeyStrategyAI";
import { applyAffinityBoost } from "@/domains/agents/simulation/jockeyStrategyAdjustments";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { shouldEnterHorse } from "./raceEntryHelpers";
import { isHatedRival } from "@/domains/stable/simulation/rivalry";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import { selectBestFreeAgentJockey } from "@/domains/jockey/simulation/selectFreeAgent";

/**
 * AI decision: Enter horses from a stable into a specific race.
 *
 * Evaluates all eligible horses and selects top candidates based on entry score.
 * Returns array of horses to enter.
 *
 * @param stable - Stable entering horses
 * @param horseMap - Map of horse IDs to horse objects
 * @param race - Race to enter
 * @param pregnantIds - Set of pregnant horse IDs to exclude
 * @returns Array of horses to enter
 */
export function selectHorsesForRaceEntry(
  stable: Stable,
  horseMap: Map<string, Horse>,
  race: Race,
  pregnantIds: Set<string>,
): Horse[] {
  const candidates: { horse: Horse; score: number }[] = [];

  // Find all eligible horses
  for (const horseId of stable.horses) {
    const horse = horseMap.get(horseId);
    if (!horse) continue;

    const { shouldEnter, score } = shouldEnterHorse(horse, race, race.entries, pregnantIds, stable);
    if (shouldEnter) {
      candidates.push({ horse, score });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Select top candidates up to max per race
  const toEnter: Horse[] = [];
  for (const { horse } of candidates.slice(0, MAX_HORSES_PER_STABLE_PER_RACE)) {
    toEnter.push(horse);
  }

  return toEnter;
}

/**
 * Run race entry for all NPC stables for races in the next N days.
 *
 * This is called during advanceDay(). Evaluates races ahead and enters eligible,
 * competitive horses using modular scoring, geometry, and AI systems. Assigns jockeys
 * and calculates tactics for entries.
 *
 * @param stables - Array of NPC stables
 * @param horses - Array of all horses
 * @param jockeys - Array of all jockeys
 * @param races - Array of all races
 * @param currentDay - Current simulation day
 * @param rng - Random number generator
 * @param daysAhead - Number of days ahead to evaluate (default: 3)
 * @param pregnantIds - Set of pregnant horse IDs to exclude
 * @param aiManager - Optional NPC AI manager for advanced tactics
 * @returns Updated array of races with NPC entries
 */
export function runNpcRaceEntry(
  stables: Stable[],
  horses: Horse[],
  jockeys: Jockey[],
  races: Race[],
  currentDay: number,
  rng: Rng,
  daysAhead: number = 3,
  pregnantIds: Set<string> = new Set(),
  aiManager?: NpcAIManager,
): Race[] {
  if (!Array.isArray(races)) {
    console.error("runNpcRaceEntry called with non-array races:", races);
    return [];
  }
  // Index horses and jockeys for fast lookup.
  // Resolve phenotypes once up front — shouldEnterHorse calls
  // ensurePhenotypeResolved per (race, stable, horse) evaluation, and the
  // resolved copy is otherwise discarded, making deferred-resolution horses
  // O(races × stables × horses) phenotype resolves.
  const horseMap = new Map(horses.map((h) => [h.id, ensurePhenotypeResolved(h)]));
  const jockeyMap = new Map(jockeys.map((j) => [j.id, j]));
  const stableMap = new Map(stables.map((s) => [s.id, s]));
  const stableJockeyMap = new Map(jockeys.filter((j) => j.stableId).map((j) => [j.stableId!, j]));

  // Look at races in the next daysAhead days
  const upcomingRaces = races.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved && !r.cancelled,
  );

  if (upcomingRaces.length === 0) return races;

  // We only need to clone the races we might modify
  const upcomingRaceIds = new Set(upcomingRaces.map((r) => r.id));
  const updatedRaces = races.map((r) => {
    if (upcomingRaceIds.has(r.id)) {
      return { ...r, entries: [...r.entries] };
    }
    return r;
  });

  // Re-fetch upcoming from the cloned array
  const workingUpcoming = updatedRaces.filter((r) => upcomingRaceIds.has(r.id));

  // Cache free agents
  let freeAgents = jockeys.filter((j) => !j.stableId && j.lastRaceDay !== currentDay);

  // One start per horse per rest window, counting entries already made.
  const bookings = buildNpcBookings(updatedRaces);

  for (const race of prioritiseRacesForNpcEntry(workingUpcoming, MINIMUM_RACE_ENTRIES + 2)) {
    // Skip invitation-only races during initialization (invites haven't gone out yet)
    if (race.graded?.requiresInvitation) continue;

    // Note: even if race is full, NPC stables may try to bump weaker entries below.

    // Imperial Expansion: Check if player has an entry to trigger rivalry tactics
    const playerEntry = race.entries.find((e) => e.ownership?.type === "player");

    // Each stable evaluates this race
    for (const stable of stables) {
      // Skip if stable has no horses
      if (stable.horses.length === 0) continue;

      const stableAI = aiManager?.stableStates[stable.id];
      const isRival = playerEntry && stableAI && isHatedRival(stableAI.friction);

      // Select horses to enter
      const horsesToEnter = selectHorsesForRaceEntry(stable, horseMap, race, pregnantIds).filter(
        (h) => canBookNpcStart(bookings, h, race.day),
      );

      // Add entries
      for (const horse of horsesToEnter) {
        // Never enter a race the stable can't pay for.
        const expectedFee = race.entryFee + (stableJockeyMap.get(stable.id)?.ridingFee ?? 100);
        if (stable.cash - NPC_ENTRY_CASH_RESERVE < expectedFee) break;
        // If race is full, attempt to bump the lowest-rated NPC entry whose
        // horse is meaningfully weaker than this challenger. Player entries
        // are never bumped to preserve the player's planned campaign.
        if (race.entries.length >= race.fieldSize) {
          const weakestIdx = findBumpableEntryIndex(race.entries, horse, (id) => horseMap.get(id));
          if (weakestIdx === -1) {
            break; // can't bump anyone meaningfully — stop trying for this stable
          }
          const bumped = race.entries[weakestIdx];
          // Refund entry fee to bumped stable
          if (bumped.ownership?.type === "npc") {
            const bumpedStable = stableMap.get(bumped.ownership.stableId);
            if (bumpedStable) {
              bumpedStable.cash = bumpedStable.cash + race.entryFee;
            }
          }
          race.entries.splice(weakestIdx, 1);
          removeNpcBooking(bookings, bumped.horseId, race.day);
        }

        // Find a jockey for the NPC entry
        const retainedJockey = stableJockeyMap.get(stable.id);
        let chosenJockey = retainedJockey;

        if (!chosenJockey) {
          // Find best available freelance jockey using chemistry-aware scoring
          if (freeAgents.length > 0) {
            chosenJockey = selectBestFreeAgentJockey(horse, freeAgents) ?? undefined;

            // Mark as used today
            freeAgents = freeAgents.filter((j) => j.id !== chosenJockey!.id);
            const jockeyIndex = jockeys.findIndex((j) => j.id === chosenJockey!.id);
            if (jockeyIndex !== -1) {
              jockeys[jockeyIndex] = { ...chosenJockey!, lastRaceDay: currentDay };
              jockeyMap.set(chosenJockey!.id, jockeys[jockeyIndex]);
            }
          }
        }

        const jockeyId = chosenJockey?.id;
        const jockey = chosenJockey;
        const ridingFee = jockey?.ridingFee ?? 100;
        const assignedWeight = calculateAssignedWeight(horse, race);

        // Calculate jockey instructions for NPC entry
        let jockeyInstructions;

        // Imperial Expansion: Spoiler Tactic
        if (isRival && horse.stats.speed > 70 && horse.stats.stamina < 50) {
          jockeyInstructions = {
            horseId: horse.id,
            raceId: race.id,
            ridingStyle: "front_runner" as const,
            earlyPosition: "lead" as const,
            moveTiming: "early" as const,
            aggressiveness: 90,
          };
        } else if (aiManager && jockey) {
          const stableState = aiManager.stableStates[stable.id];
          if (stableState?.jockeyStrategyAI) {
            jockeyInstructions = applyAffinityBoost(
              calculateOptimalTactics(stableState.jockeyStrategyAI, horse, race, jockey, stable),
              jockey,
              horse.id,
            );
          }
        }

        race.entries.push({
          horseId: horse.id,
          ownership: makeNpcOwned(asNpcStableId(stable.id)),
          jockeyId,
          weight: assignedWeight,
          jockeyInstructions,
        });

        addNpcBooking(bookings, horse.id, race.day);

        // Deduct entry fee AND riding fee from stable
        stable.cash = Math.max(0, stable.cash - race.entryFee - ridingFee);
      }
    }
  }
  return updatedRaces;
}
