// AI Race Entry System - NPC stables intelligently enter horses in races
// Evaluates races 1-3 days ahead and enters eligible, competitive horses

import type { Horse, Race, Stable, StableTier } from "./types";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateOverallRating } from "@/core/horse/stats";
import { PERSONALITY_CONFIG } from "./npcStables";

// Entry limits per stable per race
const MAX_HORSES_PER_STABLE_PER_RACE = 2;

// Energy threshold for entering races
const MIN_ENERGY_TO_ENTER = 50;

// Form consideration - prefer positive form
const MIN_FORM_TO_ENTER = -3;

// Distance preference - horses prefer races within this range of their "best" distance
const PREFERRED_DISTANCE_RANGE = 300; // ±300m from ideal

// Base purse appeal thresholds by tier (modified by personality)
const BASE_PURSE_APPEAL: Record<StableTier, number> = {
  elite: 100000,
  mid: 25000,
  budget: 5000,
};

/**
 * Calculate horse's suitability score for a race
 * Higher score = better match
 * Personality affects scoring significantly
 */
function calculateRaceSuitability(horse: Horse, race: Race, stable: Stable): number {
  const personality = PERSONALITY_CONFIG[stable.personality];
  let score = 0;
  const overall = calculateOverallRating(horse);

  // Class match - affected by risk tolerance
  if (race.minStat) {
    const gap = overall - race.minStat;
    const riskTolerance = personality.riskTolerance;
    if (gap >= -5 && gap <= 10) {
      score += 30;
    } else if (gap > 10) {
      score += (20 - gap) * riskTolerance; // Risk-takers still enter overqualified
    } else {
      score += gap * riskTolerance; // Risk-takers may enter underqualified
    }
  } else {
    score += 20;
  }

  // Distance fit - specialists get big bonus for preferred distance
  if (stable.preferredDistance) {
    const distanceDiff = Math.abs(race.distance - stable.preferredDistance);
    if (distanceDiff <= 200) {
      score += 25; // Specialist sweet spot
    } else if (distanceDiff <= 400) {
      score += 10;
    }
  } else {
    // General distance fit
    const preferredMin = 1200;
    const preferredMax = 2200;
    if (race.distance >= preferredMin && race.distance <= preferredMax) {
      score += 15;
    } else if (race.distance >= preferredMin - 200 && race.distance <= preferredMax + 200) {
      score += 8;
    }
  }

  // Surface preference for specialists
  if (stable.preferredSurface && race.graded?.surface === stable.preferredSurface) {
    score += 15;
  }

  // Purse appeal - modified by personality
  const baseAppeal = BASE_PURSE_APPEAL[stable.tier] || 10000;
  const purseThreshold = baseAppeal * personality.purseThresholdMod;
  if (race.purse >= purseThreshold * 2) {
    score += 25 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold) {
    score += 15 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold * 0.5) {
    score += 5 * personality.raceEntryMod;
  }

  // Youth preference - developers like young horses, win-now likes proven
  if (horse.age <= 3 && personality.youthPreference > 0.7) {
    score += 10; // Bonus for young horses with developer personality
  } else if (horse.age >= 5 && personality.youthPreference < 0.3) {
    score += 10; // Bonus for proven horses with win-now personality
  }

  // Form bonus/penalty - aggressive stables ignore form more
  const formTolerance = personality.riskTolerance;
  if (horse.form > 3) {
    score += 10;
  } else if (horse.form < -3) {
    score -= 10 * (2 - formTolerance); // Conservative stables penalize bad form more
  }

  // Energy check
  if (horse.energy > 80) {
    score += 5;
  } else if (horse.energy < MIN_ENERGY_TO_ENTER) {
    score -= 20;
  }

  // Fame/recognition - prestige stables love famous horses in big races
  if (horse.fame > 50 && race.purse > 100000) {
    score += 10 * (personality.gradedRaceBonus / 20);
  }

  // Graded race bonus - heavily modified by personality
  if (race.graded?.grade === "G1") {
    score += 15 + personality.gradedRaceBonus * 0.5;
  } else if (race.graded?.grade === "G2") {
    score += 10 + personality.gradedRaceBonus * 0.3;
  } else if (race.graded?.grade === "G3") {
    score += 5 + personality.gradedRaceBonus * 0.2;
  }

  return score;
}

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
  // Note: personality affects this in calculateRaceSuitability
  const personality = PERSONALITY_CONFIG[stable.personality];
  const minForm = MIN_FORM_TO_ENTER * (2 - personality.riskTolerance);
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

  // Calculate suitability score with personality
  const score = calculateRaceSuitability(horse, race, stable);

  // Minimum score threshold to enter - modified by raceEntryMod
  // Aggressive stables enter with lower scores
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
  horseMap?: Map<string, Horse>,
): Horse[] {
  const candidates: { horse: Horse; score: number }[] = [];

  // Find all eligible horses
  for (const horseId of stable.horses) {
    const horse = horseMap ? horseMap.get(horseId) : horses.find((h) => h.id === horseId);
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
  races: Race[],
  currentDay: number,
  daysAhead: number = 3,
  pregnantIds: Set<string> = new Set(),
): Race[] {
  const updatedRaces = [...races];

  // Look at races in the next daysAhead days
  const upcomingRaces = updatedRaces.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved,
  );

  // Optimization: Build a horse map once for O(1) lookups
  const horseMap = new Map<string, Horse>();
  for (const horse of horses) {
    horseMap.set(horse.id, horse);
  }

  for (const race of upcomingRaces) {
    // Skip if race is full
    if (race.entries.length >= race.fieldSize) continue;

    // Each stable evaluates this race
    for (const stable of stables) {
      // Skip if stable has no horses
      if (stable.horses.length === 0) continue;

      // Select horses to enter
      const horsesToEnter = selectHorsesForRaceEntry(stable, horses, race, pregnantIds, horseMap);

      // Add entries
      for (const horse of horsesToEnter) {
        // Double-check there's still room
        if (race.entries.length >= race.fieldSize) break;

        race.entries.push({
          horseId: horse.id,
          owned: false,
          stableId: stable.id,
          npc: true,
        });

        // Deduct entry fee from stable
        stable.cash = Math.max(0, stable.cash - race.entryFee);
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
export function runNpcTraining(stables: Stable[], horses: Horse[], currentDay: number): Horse[] {
  const updatedHorses = [...horses];

  // Optimization: Create a lookup map for faster index finding
  const horseIndexMap = new Map<string, number>();
  for (let i = 0; i < updatedHorses.length; i++) {
    horseIndexMap.set(updatedHorses[i].id, i);
  }

  for (const stable of stables) {
    // Training budget and slots vary by tier
    const trainingSlots = stable.tier === "elite" ? 8 : stable.tier === "mid" ? 5 : 3;
    let slotsUsed = 0;

    for (const horseId of stable.horses) {
      if (slotsUsed >= trainingSlots) break;

      const horseIndex = horseIndexMap.get(horseId);
      if (horseIndex === undefined) continue;

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
          const gain = Math.random() < 0.65 ? 1 : 0;
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
        if (Math.random() < 0.4) {
          const stat = ["speed", "stamina", "acceleration"][
            Math.floor(Math.random() * 3)
          ] as keyof typeof horse.stats;
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

  // Optimization: Create a lookup map for faster index finding
  const horseIndexMap = new Map<string, number>();
  for (let i = 0; i < updatedHorses.length; i++) {
    horseIndexMap.set(updatedHorses[i].id, i);
  }

  for (const result of race.result) {
    const horseIndex = horseIndexMap.get(result.horseId);
    if (horseIndex === undefined) continue;

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
