/**
 * programs.ts - Breeding program management
 *
 * This file provides stable-level breeding programs with archetype targets.
 * Programs track genetic distance progress, milestones, and generation count
 * as breeders work toward specific phenotype goals.
 *
 * Dependencies: @/game/types (Horse), ./archetypes (Archetype)
 * Related files: archetypes.ts (target definitions), strategy.ts (uses archetype fit for scoring)
 */

/**
 * Breeding Programs
 * Stable-level breeding programs with archetype targets
 */

import type { Horse } from "@/game/types";
import type { Archetype } from "./archetypes";

export type ProgramMilestone = {
  id: string;
  description: string;
  triggerCondition: string;
  achieved: boolean;
  achievedDay?: number;
};

export type BreedingProgram = {
  id: string;
  stableId: string;
  archetypeId: string;
  createdDay: number;
  generationCount: number;
  bestHorseId: string | null;
  geneticDistance: number;
  milestones: ProgramMilestone[];
  enrolledDamIds: string[];
  history: { day: number; distance: number; horseId: string }[];
};

/**
 * Calculate genetic distance from horse to archetype target.
 *
 * Weighted Euclidean distance (0-1, where 0 = perfect match, 1 = worst possible).
 * Uses archetype weights to prioritize certain stats in the distance calculation.
 *
 * @param horse - The horse to measure
 * @param archetype - The target archetype
 * @returns Genetic distance value between 0 and 1
 *
 * @example
 * const distance = calculateGeneticDistance(horse, archetype);
 */
export function calculateGeneticDistance(horse: Horse, archetype: Archetype): number {
  const target = archetype.targetPhenotype;
  const weights = archetype.weights;

  // Extract horse stats
  const speed = horse.stats.speed;
  const stamina = horse.stats.stamina;
  const acceleration = horse.stats.acceleration;
  const consistency = horse.stats.consistency;

  // Normalize stats to 0-1 range (assuming max potential around 100)
  const normalizedSpeed = speed / 100;
  const normalizedStamina = stamina / 100;
  const normalizedAcceleration = acceleration / 100;
  const normalizedConsistency = consistency / 100;

  // Calculate squared differences weighted by archetype weights
  const speedDiff = Math.pow(normalizedSpeed - target.speed, 2) * weights.speed;
  const staminaDiff = Math.pow(normalizedStamina - target.stamina, 2) * weights.stamina;
  const accelerationDiff =
    Math.pow(normalizedAcceleration - target.acceleration, 2) * weights.acceleration;
  const consistencyDiff =
    Math.pow(normalizedConsistency - target.consistency, 2) * weights.consistency;

  // Sum weighted differences
  const totalWeightedDiff = speedDiff + staminaDiff + accelerationDiff + consistencyDiff;

  // Normalize by sum of weights
  const totalWeight = weights.speed + weights.stamina + weights.acceleration + weights.consistency;
  const normalizedDistance = Math.sqrt(totalWeightedDiff / totalWeight);

  return Math.min(1, Math.max(0, normalizedDistance));
}

/**
 * Update breeding program progress after a new foal is born.
 *
 * Recalculates genetic distance, updates best horse tracking, checks milestones,
 * and records history entry for the new foal.
 *
 * @param program - The breeding program to update
 * @param horse - The newly born foal
 * @param archetype - The target archetype
 * @param day - Current game day
 * @returns Updated breeding program
 *
 * @example
 * const updated = updateProgramProgress(program, foal, archetype, currentDay);
 */
export function updateProgramProgress(
  program: BreedingProgram,
  horse: Horse,
  archetype: Archetype,
  day: number,
): BreedingProgram {
  const newDistance = calculateGeneticDistance(horse, archetype);
  const isBest = program.bestHorseId === null || newDistance < program.geneticDistance;

  // Update milestones
  const updatedMilestones = program.milestones.map((milestone) => {
    if (milestone.achieved) return milestone;

    let achieved = false;
    if (milestone.triggerCondition === "first_generation" && program.generationCount === 1) {
      achieved = true;
    } else if (milestone.triggerCondition === "distance_below_0.6" && newDistance < 0.6) {
      achieved = true;
    } else if (milestone.triggerCondition === "distance_below_0.4" && newDistance < 0.4) {
      achieved = true;
    } else if (milestone.triggerCondition === "distance_below_0.2" && newDistance < 0.2) {
      achieved = true;
    }

    if (achieved) {
      return {
        ...milestone,
        achieved: true,
        achievedDay: day,
      };
    }
    return milestone;
  });

  const historyEntry = { day, distance: newDistance, horseId: horse.id };

  return {
    ...program,
    generationCount: program.generationCount + 1,
    bestHorseId: isBest ? horse.id : program.bestHorseId,
    geneticDistance: isBest ? newDistance : program.geneticDistance,
    milestones: updatedMilestones,
    history: [...program.history, historyEntry],
  };
}

/**
 * Create initial breeding program.
 *
 * Creates a new breeding program with default milestones for tracking
 * genetic distance progress toward an archetype target.
 *
 * @param stableId - The stable ID creating the program
 * @param archetypeId - The target archetype ID
 * @param day - Current game day
 * @returns New breeding program with initial state
 *
 * @example
 * const program = createBreedingProgram(stableId, "elite-turf-stayer", currentDay);
 */
export function createBreedingProgram(
  stableId: string,
  archetypeId: string,
  day: number,
): BreedingProgram {
  const milestones: ProgramMilestone[] = [
    {
      id: `${stableId}_first_gen`,
      description: "First generation foal",
      triggerCondition: "first_generation",
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.6`,
      description: "Genetic foundation established",
      triggerCondition: "distance_below_0.6",
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.4`,
      description: "Program taking shape",
      triggerCondition: "distance_below_0.4",
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.2`,
      description: "Achieve genetic distance below 0.2",
      triggerCondition: "distance_below_0.2",
      achieved: false,
    },
  ];

  return {
    id: `program_${stableId}_${archetypeId}_${day}`,
    stableId,
    archetypeId,
    createdDay: day,
    generationCount: 0,
    bestHorseId: null,
    geneticDistance: 1.0,
    milestones,
    enrolledDamIds: [],
    history: [],
  };
}
