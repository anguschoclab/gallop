/**
 * npcHorseGen.ts - NPC stable horse generation
 *
 * This file generates horses for NPC stables based on tier, age categories, and
 * AI state, including initial fame calculation and stud fee determination.
 *
 * Dependencies: ./types (Horse, Stable, StableTier), ./rng (Rng), @/core/horse/horseFactory (generateNpcHorse), @/core/common/random (rand), @/core/breeding/stallions (shouldRetireAtStartup, initialStandingFee, defaultStudParams), @/core/ai/horseGenAI (shouldGenerateHorseOfAge, createHorseGenAIState, recordHorseGeneration), @/core/ai/npcCycleAI (NpcAIManager), ./npcHorseGenHelpers (AgeCategory, getAgeFromCategory, calculateStartingFame)
 * Related files: npcStables.ts (uses horse generation), npcHorseGenHelpers.ts (helper functions)
 */

import type { Horse, Stable, StableTier } from "./types";
import type { Rng } from "./rng";
import {
  generateNpcHorse as _generateNpcHorse,
} from "@/core/horse/horseFactory";
import { rand } from "@/core/common/random";
import {
  shouldRetireAtStartup,
  initialStandingFee,
  defaultStudParams,
} from "@/core/breeding/stallions";
import {
  shouldGenerateHorseOfAge,
  createHorseGenAIState,
  recordHorseGeneration,
} from "@/core/ai/horseGenAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { 
  type AgeCategory, 
  getAgeFromCategory, 
  calculateStartingFame 
} from "./npcHorseGenHelpers";

// ─── Stable horse generation ──────────────────────────────────────────────────

/**
 * Generate horses for an NPC stable.
 *
 * Uses AI-driven age distribution when AI manager is available, otherwise uses
 * tier-based distribution. Calculates starting fame for each horse.
 *
 * @param stable - The stable to generate horses for
 * @param rng - Random number generator
 * @param usedNames - Set of used horse names to avoid duplicates
 * @param npcAIManager - Optional AI manager for AI-driven generation
 * @param currentDay - Current simulation day for AI learning
 * @returns Array of generated horses
 */
export function generateStableHorses(
  stable: Stable,
  rng: Rng,
  usedNames: Set<string>,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
): Horse[] {
  const horses: Horse[] = [];

  const aiState = npcAIManager?.stableStates[stable.id];
  if (aiState && !aiState.horseGenAI) {
    aiState.horseGenAI = createHorseGenAIState(stable);
  }

  let targetCount: number;
  if (!stable.isMajor) {
    targetCount = 10;
  } else {
    switch (stable.tier) {
      case "elite":
        targetCount = rand(30, 40, rng);
        break;
      case "mid":
        targetCount = rand(20, 30, rng);
        break;
      default:
        targetCount = rand(15, 25, rng);
        break;
    }
  }

  const cats: Record<AgeCategory, number> = { "2yo": 0, prime: 0, veteran: 0, breeding: 0 };

  if (aiState?.horseGenAI) {
    for (let age = 2; age <= 10; age++) {
      if (shouldGenerateHorseOfAge(aiState.horseGenAI, age, stable)) {
        const key: AgeCategory =
          age === 2 ? "2yo" : age <= 4 ? "prime" : age <= 6 ? "veteran" : "breeding";
        cats[key]++;
      }
    }
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    if (total < targetCount) cats.prime += targetCount - total;
    else if (total > targetCount) cats.prime = Math.max(0, cats.prime - (total - targetCount));
  } else {
    cats["2yo"] = Math.floor(targetCount * 0.3);
    cats.prime = Math.floor(targetCount * 0.4);
    cats.veteran = Math.floor(targetCount * 0.2);
    cats.breeding = Math.floor(targetCount * 0.1);
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    cats.prime += targetCount - total;
  }

  for (const [cat, count] of Object.entries(cats) as [AgeCategory, number][]) {
    for (let i = 0; i < count; i++) {
      const age = getAgeFromCategory(cat, rng);
      const horse = _generateNpcHorse(stable, rng, npcAIManager, currentDay, { forcedAge: age });
      horse.fame = calculateStartingFame(stable.tier, age, rng);

      if (aiState?.horseGenAI && currentDay !== undefined) {
        recordHorseGeneration(aiState.horseGenAI, horse, stable, currentDay);
      }
      horses.push(horse);
    }
  }

  return horses;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate horses for all NPC stables.
 *
 * Integrates famous stallions if provided, sets up stud careers for retiring horses,
 * and returns updated stables with horse IDs and all horses.
 *
 * @param stables - All NPC stables
 * @param rng - Random number generator
 * @param npcAIManager - Optional AI manager for AI-driven generation
 * @param currentDay - Current simulation day for AI learning
 * @param famousStallions - Optional famous stallions to integrate
 * @returns Object with updated stables, all horses, and used names
 */
export function generateAllNpcHorses(
  stables: Stable[],
  rng: Rng,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  famousStallions?: Horse[],
): { stables: Stable[]; horses: Horse[]; usedNames: Set<string> } {
  const updatedStables: Stable[] = [];
  const allHorses: Horse[] = [];
  const usedNames = new Set<string>();

  const stallionsByStable = new Map<string, Horse[]>();
  if (famousStallions) {
    for (const s of famousStallions) {
      usedNames.add(s.name.toLowerCase());
      if (s.stableId) {
        if (!stallionsByStable.has(s.stableId)) stallionsByStable.set(s.stableId, []);
        stallionsByStable.get(s.stableId)!.push(s);
      }
    }
  }

  for (const stable of stables) {
    const stableFamous = stallionsByStable.get(stable.id) ?? [];
    const horses = generateStableHorses(stable, rng, usedNames, npcAIManager, currentDay);
    horses.push(...stableFamous);

    for (const horse of horses) {
      if (famousStallions?.some((fs) => fs.id === horse.id)) continue;
      if (shouldRetireAtStartup(horse, stable)) {
        const { bookSize } = defaultStudParams(stable.tier);
        horse.stud = {
          atStud: true,
          standingFee: initialStandingFee(horse, stable.tier),
          bookSize,
          seasonBookings: 0,
          lifetimeFoals: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          retiredOnDay: 1,
        };
      }
    }

    updatedStables.push({ ...stable, horses: horses.map((h) => h.id) });
    allHorses.push(...horses);
  }

  return { stables: updatedStables, horses: allHorses, usedNames };
}
