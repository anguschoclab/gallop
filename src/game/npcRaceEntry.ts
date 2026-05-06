// AI Race Entry System - NPC stables intelligently enter horses in races
// Evaluates races 1-3 days ahead and enters eligible, competitive horses
// Refactored to use modular scoring, geometry, and AI systems

import type { Horse, Race, Stable, Jockey } from "./types";
import type { Rng } from "./rng";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import {
  calculateRaceSuitability,
  calculateAssignedWeight,
  MAX_HORSES_PER_STABLE_PER_RACE,
  MIN_ENERGY_TO_ENTER,
} from "@/core/race/entryScoring";
import { getFormTolerance } from "@/core/stable/personalityModifiers";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";

/**
 * Check if a horse should enter a race (basic eligibility + suitability)
 */
function shouldEnterHorse(
  horse: Horse,
  race: Race,
  currentEntries: Race["entries"],
  pregnantIds: Set<string>,
  stable: Stable,
): { shouldEnter: boolean; score: number } {
  // Basic eligibility check
  if (!isHorseEligibleForRace(horse, race, pregnantIds)) {
    return { shouldEnter: false, score: 0 };
  }

  // Energy check
  if (horse.energy < MIN_ENERGY_TO_ENTER) {
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

/**
 * AI decision: Enter horses from a stable into a specific race
 * Returns array of horses to enter
 */
export function selectHorsesForRaceEntry(
  stable: Stable,
  horses: Horse[],
  race: Race,
  pregnantIds: Set<string>,
): Horse[] {
  const candidates: { horse: Horse; score: number }[] = [];

  // Find all eligible horses
  for (const horseId of stable.horses) {
    const horse = horses.find((h) => h.id === horseId);
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
 * Run race entry for all NPC stables for races in the next N days
 * This is called during advanceDay()
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
): Race[] {
  const updatedRaces = [...races];

  // Look at races in the next daysAhead days
  const upcomingRaces = updatedRaces.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved,
  );

  for (const race of upcomingRaces) {
    // Skip if race is full
    if (race.entries.length >= race.fieldSize) continue;

    // Each stable evaluates this race
    for (const stable of stables) {
      // Skip if stable has no horses
      if (stable.horses.length === 0) continue;

      // Select horses to enter
      const horsesToEnter = selectHorsesForRaceEntry(stable, horses, race, pregnantIds);

      // Add entries
      for (const horse of horsesToEnter) {
        // Double-check there's still room
        if (race.entries.length >= race.fieldSize) break;

        // Find a jockey for the NPC entry
        const retainedJockey = jockeys.find((j) => j.stableId === stable.id);
        let jockeyId: string | undefined = retainedJockey?.id;

        if (!jockeyId) {
          // Find best available freelance jockey whose archetype matches horse style
          const freeAgents = jockeys.filter((j) => !j.stableId && j.lastRaceDay !== currentDay);
          if (freeAgents.length > 0) {
            const matches = freeAgents.filter((j) => {
              if (horse.runningStyle === "E") return j.archetype === "front_runner";
              if (horse.runningStyle === "S") return j.archetype === "closer";
              return j.archetype === "versatile" || j.archetype === "clinical";
            });
            const pool = matches.length > 0 ? matches : freeAgents;
            // Pick based on fame/tier
            pool.sort((a, b) => b.fame - a.fame);
            const chosen = pool[0];
            jockeyId = chosen.id;
            chosen.lastRaceDay = currentDay;
          }
        }

        const jockey = jockeys.find((j) => j.id === jockeyId);
        const ridingFee = jockey?.ridingFee ?? 100;
        const assignedWeight = calculateAssignedWeight(horse, race);

        race.entries.push({
          horseId: horse.id,
          owned: false,
          stableId: stable.id,
          npc: true,
          jockeyId,
          weight: assignedWeight,
        });

        // Deduct entry fee AND riding fee from stable
        stable.cash = Math.max(0, stable.cash - race.entryFee - ridingFee);
      }
    }
  }

  return updatedRaces;
}

/**
 * Fill remaining race spots with filler horses
 * Called when building race field if pre-entries don't fill the race
 */
export function fillRaceWithFillerHorses(
  race: Race,
  stables: Stable[],
  horses: Horse[],
  needed: number,
): { updatedRace: Race; newHorses: Horse[] } {
  const updatedRace = { ...race };
  const newHorses: Horse[] = [];

  // Get filler stables (non-major)
  const fillerStables = stables.filter((s) => !s.isMajor);

  // Find eligible filler horses already in the system
  const eligibleFillerHorses = horses.filter(
    (h) => h.stableId && !h.owned && !race.entries.some((e) => e.horseId === h.id) && h.energy > 40,
  );

  // Use existing horses first
  for (const horse of eligibleFillerHorses.slice(0, needed)) {
    if (updatedRace.entries.length >= updatedRace.fieldSize) break;

    updatedRace.entries.push({
      horseId: horse.id,
      owned: false,
      stableId: horse.stableId,
      npc: true,
    });
  }

  return { updatedRace, newHorses };
}

/**
 * AI Training - NPC stables train their horses
 * Called during advanceDay()
 */
export function runNpcTraining(
  stables: Stable[],
  horses: Horse[],
  currentDay: number,
  rng: Rng,
): Horse[] {
  const updatedHorses = [...horses];

  for (const stable of stables) {
    // Training budget and slots vary by tier
    const trainingSlots = stable.tier === "elite" ? 8 : stable.tier === "mid" ? 5 : 3;
    let slotsUsed = 0;

    for (const horseId of stable.horses) {
      if (slotsUsed >= trainingSlots) break;

      const horseIndex = updatedHorses.findIndex((h) => h.id === horseId);
      if (horseIndex === -1) continue;

      const horse = updatedHorses[horseIndex];

      // Skip if horse has been racing recently or low energy
      if (horse.energy < 40) continue;

      // Elite stables train more intelligently
      if (stable.tier === "elite") {
        // Focus on stats below potential
        const stats = horse.stats;
        const gaps = {
          speed: horse.potential - stats.speed,
          stamina: horse.potential - stats.stamina,
          acceleration: horse.potential - stats.acceleration,
          consistency: horse.potential - stats.consistency,
        };

        // Train the biggest gap
        const toTrain = Object.entries(gaps)
          .filter(([_, gap]) => gap > 0)
          .sort((a, b) => b[1] - a[1])[0];

        if (toTrain && toTrain[1] > 0) {
          const stat = toTrain[0] as keyof typeof stats;
          const gain = rng.next() < 0.65 ? 1 : 0;
          if (gain > 0) {
            updatedHorses[horseIndex] = {
              ...horse,
              stats: {
                ...stats,
                [stat]: Math.min(horse.potential, stats[stat] + gain),
              },
              energy: Math.max(0, horse.energy - 18),
            };
          }
        }
      } else {
        // Lower tiers train more randomly
        if (rng.next() < 0.4) {
          const stat = rng.pick(["speed", "stamina", "acceleration"]) as keyof typeof horse.stats;
          updatedHorses[horseIndex] = {
            ...horse,
            stats: {
              ...horse.stats,
              [stat]: Math.min(horse.potential, horse.stats[stat] + 1),
            },
            energy: Math.max(0, horse.energy - 15),
          };
        }
      }

      slotsUsed++;
    }
  }

  return updatedHorses;
}

/**
 * Update horse fame after race results
 */
export function updateHorseFame(horses: Horse[], race: Race): Horse[] {
  const updatedHorses = [...horses];

  if (!race.result) return updatedHorses;

  for (const result of race.result) {
    const horseIndex = updatedHorses.findIndex((h) => h.id === result.horseId);
    if (horseIndex === -1) continue;

    const horse = updatedHorses[horseIndex];
    let fameGain = 0;

    // Fame gains based on result
    if (result.position === 1) {
      fameGain =
        race.graded?.grade === "G1"
          ? 20
          : race.graded?.grade === "G2"
            ? 15
            : race.graded?.grade === "G3"
              ? 10
              : 5;
    } else if (result.position <= 3) {
      fameGain =
        race.graded?.grade === "G1"
          ? 10
          : race.graded?.grade === "G2"
            ? 8
            : race.graded?.grade === "G3"
              ? 5
              : 2;
    } else if (result.position <= 5) {
      fameGain = 1;
    }

    // Big purse races give bonus fame
    if (race.purse > 500000) {
      fameGain += 3;
    } else if (race.purse > 100000) {
      fameGain += 1;
    }

    updatedHorses[horseIndex] = {
      ...horse,
      fame: Math.min(100, horse.fame + fameGain),
    };
  }

  return updatedHorses;
}
