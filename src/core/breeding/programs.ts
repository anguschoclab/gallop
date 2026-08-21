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
import {
  PROGRAM_STATUS_ACTIVE,
  PROGRAM_STATUS_CANCELLED,
  PROGRAM_STATUS_COMPLETED,
  DISTANCE_THRESHOLD_MODERATE,
  DISTANCE_THRESHOLD_GOOD,
  DISTANCE_THRESHOLD_EXCELLENT,
  DISTANCE_MIN,
  DISTANCE_MAX,
  INITIAL_GENETIC_DISTANCE,
  INITIAL_GENERATION_COUNT,
  STAT_NORMALIZATION_MAX,
  TRIGGER_FIRST_GENERATION,
  TRIGGER_DISTANCE_MODERATE,
  TRIGGER_DISTANCE_GOOD,
  TRIGGER_DISTANCE_EXCELLENT,
  MILESTONE_DESC_FIRST_GEN,
  MILESTONE_DESC_FOUNDATION,
  MILESTONE_DESC_TAKING_SHAPE,
  MILESTONE_DESC_EXCELLENT,
} from "@/constants/breedingConstants";

export type ProgramMilestone = {
  id: string;
  description: string;
  triggerCondition: string;
  achieved: boolean;
  achievedDay?: number;
};

export type BreedingProgram = {
  id: string;
  stableId: import("@/core/types/branded").StableId;
  archetypeId: string;
  createdDay: number;
  generationCount: number;
  bestHorseId: string | null;
  geneticDistance: number;
  milestones: ProgramMilestone[];
  enrolledDamIds: string[];
  history: { day: number; distance: number; horseId: string }[];
  status?:
    | typeof PROGRAM_STATUS_ACTIVE
    | typeof PROGRAM_STATUS_CANCELLED
    | typeof PROGRAM_STATUS_COMPLETED;
  cancelledAtDay?: number;
  cancellationReason?: string;
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
  const normalizedSpeed = speed / STAT_NORMALIZATION_MAX;
  const normalizedStamina = stamina / STAT_NORMALIZATION_MAX;
  const normalizedAcceleration = acceleration / STAT_NORMALIZATION_MAX;
  const normalizedConsistency = consistency / STAT_NORMALIZATION_MAX;

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

  return Math.min(DISTANCE_MAX, Math.max(DISTANCE_MIN, normalizedDistance));
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
    if (milestone.triggerCondition === TRIGGER_FIRST_GENERATION && program.generationCount === 1) {
      achieved = true;
    } else if (
      milestone.triggerCondition === TRIGGER_DISTANCE_MODERATE &&
      newDistance < DISTANCE_THRESHOLD_MODERATE
    ) {
      achieved = true;
    } else if (
      milestone.triggerCondition === TRIGGER_DISTANCE_GOOD &&
      newDistance < DISTANCE_THRESHOLD_GOOD
    ) {
      achieved = true;
    } else if (
      milestone.triggerCondition === TRIGGER_DISTANCE_EXCELLENT &&
      newDistance < DISTANCE_THRESHOLD_EXCELLENT
    ) {
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
      description: MILESTONE_DESC_FIRST_GEN,
      triggerCondition: TRIGGER_FIRST_GENERATION,
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.6`,
      description: MILESTONE_DESC_FOUNDATION,
      triggerCondition: TRIGGER_DISTANCE_MODERATE,
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.4`,
      description: MILESTONE_DESC_TAKING_SHAPE,
      triggerCondition: TRIGGER_DISTANCE_GOOD,
      achieved: false,
    },
    {
      id: `${stableId}_dist_0.2`,
      description: MILESTONE_DESC_EXCELLENT,
      triggerCondition: TRIGGER_DISTANCE_EXCELLENT,
      achieved: false,
    },
  ];

  return {
    id: `program_${stableId}_${archetypeId}_${day}`,
    stableId,
    archetypeId,
    createdDay: day,
    generationCount: INITIAL_GENERATION_COUNT,
    bestHorseId: null,
    geneticDistance: INITIAL_GENETIC_DISTANCE,
    milestones,
    enrolledDamIds: [],
    history: [],
    status: PROGRAM_STATUS_ACTIVE,
  };
}
