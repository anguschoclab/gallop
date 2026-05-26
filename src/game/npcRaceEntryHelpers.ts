/**
 * npcRaceEntryHelpers.ts - NPC race entry helper functions
 *
 * This file provides helper functions for NPC race entry including eligibility checks,
 * energy checks, form checks, and suitability scoring with personality modifiers.
 *
 * Dependencies: ./types (Horse, Race, Stable), @/core/race/eligibility (isHorseEligibleForRace), @/core/race/entryScoring (calculateRaceSuitability, MAX_HORSES_PER_STABLE_PER_RACE, MIN_ENERGY_TO_ENTER), @/core/stable/personalityModifiers (getFormTolerance), @/core/stable/stableConfig (PERSONALITY_CONFIG)
 * Related files: npcRaceEntry.ts (uses these helpers)
 */

import type { Horse, Race, Stable } from "./types";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { MAX_HORSES_PER_STABLE_PER_RACE, MIN_ENERGY_TO_ENTER } from "@/game/constants";
import { getFormTolerance } from "@/core/stable/personalityModifiers";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";

/**
 * Check if a horse should enter a race (basic eligibility + suitability).
 *
 * Performs comprehensive eligibility checks including race eligibility, energy levels,
 * consignment status, form requirements, stable entry limits, and duplicate entry prevention.
 * Calculates suitability score with personality modifiers.
 *
 * @param horse - Horse to evaluate
 * @param race - Race to enter
 * @param currentEntries - Current race entries
 * @param pregnantIds - Set of pregnant horse IDs to exclude
 * @param stable - Stable owning the horse
 * @returns Object with shouldEnter flag and suitability score
 */
export function shouldEnterHorse(
  horse: Horse,
  race: Race,
  currentEntries: Race["entries"],
  pregnantIds: Set<string>,
  stable: Stable,
): { shouldEnter: boolean; score: number } {
  horse = ensurePhenotypeResolved(horse);
  // Basic eligibility check
  if (!isHorseEligibleForRace(horse, race, pregnantIds)) {
    return { shouldEnter: false, score: 0 };
  }

  // Energy check
  if (horse.energy < MIN_ENERGY_TO_ENTER) {
    return { shouldEnter: false, score: 0 };
  }

  // Consignment check - cannot race if consigned to an auction
  if (horse.consignedSaleId) {
    return { shouldEnter: false, score: 0 };
  }

  // Form check - avoid very cold horses
  const personality = PERSONALITY_CONFIG[stable.personality];
  const minForm = getFormTolerance(stable.personality);
  if (horse.form < minForm) {
    return { shouldEnter: false, score: 0 };
  }

  // Check stable hasn't maxed out entries in this race
  const stableEntries = currentEntries.filter((e) => e.stableId === horse.stableId).length;
  if (stableEntries >= MAX_HORSES_PER_STABLE_PER_RACE) {
    return { shouldEnter: false, score: 0 };
  }

  // Check horse not already entered
  if (currentEntries.some((e) => e.horseId === horse.id)) {
    return { shouldEnter: false, score: 0 };
  }

  // Calculate suitability score with personality (includes geometry and gradient)
  const score = calculateRaceSuitability(horse, race, stable);

  // Minimum score threshold to enter - modified by raceEntryMod
  const minScore = 0 * personality.raceEntryMod;
  if (score < minScore) {
    return { shouldEnter: false, score };
  }

  return { shouldEnter: true, score };
}
