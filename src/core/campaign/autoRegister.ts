/**
 * autoRegister.ts - Smart auto-registration for player horses
 *
 * This file provides functionality for automatically entering player-owned horses
 * into the best available upcoming races based on AI suitability scoring,
 * with automatic jockey assignment and budget safety limits.
 *
 * Dependencies: ./types (Horse, Race, Jockey, Stable), @/core/race/eligibility (isHorseEligibleForRace),
 * @/core/race/entryScoring (calculateRaceSuitability), @/game/constants (MAX_HORSES_PER_STABLE_PER_RACE),
 * @/core/stable/stableConfig (PERSONALITY_CONFIG)
 * Related files: npcRaceEntry.ts (jockey selection pattern), autoEntryRunner.ts (campaign auto-entry)
 */

// Auto Register - Smart bulk race entry for player stable
// Uses AI suitability scoring like NPC stables, with budget safety

import type { Horse, Race, Jockey, Stable } from "@/game/types";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { getTransportCostForRace } from "@/core/race/transportCost";
import { MAX_HORSES_PER_STABLE_PER_RACE } from "@/constants";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";

// Virtual player stable for scoring purposes
// Uses win-now personality with elite tier for competitive AI evaluation
const PLAYER_STABLE_CONFIG: Stable = {
  id: "player",
  name: "Player Stable",
  owner: "Player",
  personality: "win-now",
  tier: "elite",
  cash: 0,
  horses: [],
  reputation: 50,
  founded: 1,
  isMajor: true,
  colors: { primary: "#D4AF37", secondary: "#C0C0C0" },
  staff: { trainer: null, veterinarian: null, farrier: null, nutritionist: null, groom: null },
  outposts: [],
};

export type AutoRegisterEntry = {
  horseId: string;
  horseName: string;
  raceId: string;
  raceName: string;
  raceDay: number;
  jockeyId: string | null;
  jockeyName: string;
  entryFee: number;
  jockeyFee: number;
  transportCost: number;
  totalCost: number;
  suitabilityScore: number;
};

export type AutoRegisterResult = {
  entries: AutoRegisterEntry[];
  skipped: { horseId: string; horseName: string; reason: string }[];
  totalCost: number;
  remainingCash: number;
  affordableCount: number;
};

/**
 * Check if a horse is already entered in any race
 */
function isHorseAlreadyEnteredInAnyRace(horse: Horse, enteredHorseIds: Set<string>): boolean {
  return enteredHorseIds.has(horse.id);
}

/**
 * Calculate transport cost for a race based on grade.
 * Thin re-export of the canonical utility in @/core/race/transportCost.
 */
export function calculateTransportCostForRace(race: Race): number {
  return getTransportCostForRace(race);
}

/**
 * Select the best jockey for a horse
 * Pattern from src/game/npcRaceEntry.ts:191-194
 */
function selectBestJockey(horse: Horse, jockeys: Jockey[]): Jockey | null {
  // Check for retained jockey (player's contracted jockey)
  const retained = jockeys.find((j) => j.stableId === "player");
  if (retained) return retained;

  // Find freelance jockeys (not under contract)
  const freeAgents = jockeys.filter((j) => !j.stableId);
  if (freeAgents.length === 0) return null;

  // Match by running style
  const matches = freeAgents.filter((j) => {
    if (horse.runningStyle === "E") return j.archetype === "front_runner";
    if (horse.runningStyle === "S") return j.archetype === "closer";
    return j.archetype === "versatile" || j.archetype === "clinical";
  });

  // Sort by fame (best jockey first), fallback to all free agents
  const pool = matches.length > 0 ? matches : freeAgents;
  return pool.sort((a, b) => b.fame - a.fame)[0] ?? null;
}

/**
 * Calculate auto-register entries for player horses
 *
 * Uses AI suitability scoring to find the best race for each eligible horse,
 * assigns optimal jockey, and respects budget constraints.
 *
 * @param horses - All horses in game
 * @param races - All races in game
 * @param jockeys - All jockeys in game
 * @param cash - Current player cash
 * @param day - Current game day
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param minCashReserve - Minimum cash to preserve (default: 5000)
 * @returns AutoRegisterResult with entries and skipped horses
 */
export function calculateAutoRegisterEntries(
  horses: Horse[],
  races: Race[],
  jockeys: Jockey[],
  cash: number,
  day: number,
  daysAhead: number = 7,
  minCashReserve: number = 5000,
): AutoRegisterResult {
  const entries: AutoRegisterEntry[] = [];
  const skipped: { horseId: string; horseName: string; reason: string }[] = [];

  // Pre-build O(1) lookups from race entries
  const enteredHorseIds = new Set<string>();
  const playerEntryCountByRace = new Map<string, number>();
  for (const race of races) {
    let playerCount = 0;
    for (const entry of race.entries) {
      enteredHorseIds.add(entry.horseId);
      if (entry.owned) playerCount++;
    }
    if (playerCount > 0) playerEntryCountByRace.set(race.id, playerCount);
  }

  // Filter eligible player horses
  const eligibleHorses = horses.filter((h) => {
    // Must be player owned
    if (!h.owned) {
      return false;
    }

    // Must be active (not retired/deceased)
    if (h.lifecycleStatus !== "active") {
      return false;
    }

    // Must not be consigned to auction
    if (h.consignedSaleId) {
      return false;
    }

    // Must not be injured
    if (h.activeInjury) {
      return false;
    }

    // Must meet energy threshold (50% matches store.enterRace() validation)
    if (h.energy < 50) {
      return false;
    }

    // Must not already be entered in any race
    if (isHorseAlreadyEnteredInAnyRace(h, enteredHorseIds)) {
      return false;
    }

    return true;
  });

  // Get upcoming unresolved races
  const upcomingRaces = races.filter((r) => {
    // Race must not be resolved
    if (r.resolved) {
      return false;
    }

    // Race must be in the future
    if (r.day <= day) {
      return false;
    }

    // Race must be within lookahead window
    if (r.day > day + daysAhead) {
      return false;
    }

    // Race must not be full
    if (r.entries.length >= r.fieldSize) {
      return false;
    }

    return true;
  });

  // For each horse, find the best race
  const candidates: { horse: Horse; race: Race; score: number }[] = [];

  for (const horse of eligibleHorses) {
    let bestRace: Race | null = null;
    let bestScore = -Infinity;

    for (const race of upcomingRaces) {
      // Check eligibility (age, gender, energy, pregnancy, win conditions, etc.)
      if (!isHorseEligibleForRace(horse, race, new Set(), day)) {
        continue;
      }

      // Check stable entry limit (max 2 per race)
      const stableEntries = playerEntryCountByRace.get(race.id) ?? 0;
      if (stableEntries >= MAX_HORSES_PER_STABLE_PER_RACE) {
        continue;
      }

      // Calculate suitability score using AI scoring
      const score = calculateRaceSuitability(horse, race, PLAYER_STABLE_CONFIG);

      // Only consider positive scores (meaning the race is at least marginally suitable)
      if (score > 0 && score > bestScore) {
        bestScore = score;
        bestRace = race;
      }
    }

    if (bestRace) {
      candidates.push({ horse, race: bestRace, score: bestScore });
    } else {
      // No suitable race found for this horse
      skipped.push({
        horseId: horse.id,
        horseName: horse.name,
        reason: "No suitable races found",
      });
    }
  }

  // Sort by suitability score (best first)
  candidates.sort((a, b) => b.score - a.score);

  // Calculate entries within budget
  let runningCost = 0;

  for (const { horse, race, score } of candidates) {
    const jockey = selectBestJockey(horse, jockeys);
    const transportCost = calculateTransportCostForRace(race);
    const entryCost = race.entryFee + (jockey?.ridingFee ?? 0) + transportCost;

    // Check budget constraint
    if (cash - runningCost - entryCost < minCashReserve) {
      skipped.push({
        horseId: horse.id,
        horseName: horse.name,
        reason: "Budget constraint",
      });
      continue;
    }

    entries.push({
      horseId: horse.id,
      horseName: horse.name,
      raceId: race.id,
      raceName: race.name,
      raceDay: race.day,
      jockeyId: jockey?.id ?? null,
      jockeyName: jockey?.name ?? "Auto-assigned",
      entryFee: race.entryFee,
      jockeyFee: jockey?.ridingFee ?? 0,
      transportCost,
      totalCost: entryCost,
      suitabilityScore: score,
    });

    runningCost += entryCost;
  }

  return {
    entries,
    skipped,
    totalCost: runningCost,
    remainingCash: cash - runningCost,
    affordableCount: entries.length,
  };
}
