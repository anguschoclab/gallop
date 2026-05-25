/**
 * Test helper types for creating partial mock objects
 *
 * These types allow creating test objects with only the fields needed for the test,
 * avoiding the need for `as any` casts.
 */

import type { Horse, Stable, GameState, Jockey, Race } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { Rng } from "@/game/rng";
import { createRng } from "@/game/rng";

// Partial types for test objects
export type PartialHorse = Partial<Horse>;
export type PartialStable = Partial<Stable>;
export type PartialJockey = Partial<Jockey>;
export type PartialRace = Partial<Race>;
export type PartialGameState = Partial<GameState>;

// Test-specific types for objects with additional test properties
export interface TestHorseWithGenotype {
  id: string;
  genotype: any;
  pedigree: any;
}

export interface TestBreedingState {
  horses: any[];
  npcStables: any[];
}

// Helper function to create mock PipelineContext
export function createMockPipelineContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    previousDay: 0,
    newDay: 1,
    state: {} as any,
    logs: [],
    dailyRng: createRng(0),
    intents: [],
    impacts: [],
    impactLog: [],
    ...overrides,
  };
}
