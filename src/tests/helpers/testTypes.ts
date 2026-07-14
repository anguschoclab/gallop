/**
 * Test helper types for creating partial mock objects
 *
 * These types allow creating test objects with only the fields needed for the test,
 * avoiding the need for `as any` casts.
 */

import type { Horse, Stable, GameState, Jockey, Race } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { Rng } from "@/core/common/rng";
import { createRng } from "@/core/common/rng";

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
  const state: GameState = overrides.state ?? ({} as any);
  const horses: Horse[] = Object.values((state as any).horses ?? {});
  const races: Race[] = Object.values((state as any).races ?? {});
  const stables: any[] = Array.isArray((state as any).npcStables) ? (state as any).npcStables : [];
  const jockeys: any[] = Array.isArray((state as any).jockeys) ? (state as any).jockeys : [];
  return {
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: createRng(0),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(horses.map((h) => [h.id, h])),
    raceMap: new Map(races.map((r) => [r.id, r])),
    stableMap: new Map(stables.map((s) => [s.id, s])),
    jockeyMap: new Map(jockeys.map((j) => [j.id, j])),
    ...overrides,
  };
}
