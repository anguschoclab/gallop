/**
 * sampleGameState.ts - Reusable test fixtures
 *
 * Lightweight factories for building store/breeding-program test scenarios
 * without spinning up a full GameState. Keep these intentionally minimal —
 * tests should extend the returned object with whatever fields they assert on.
 */

import type { BreedingProgram } from "@/core/breeding/programs";
import type { GameState, Horse } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { createBreedingProgram } from "@/core/breeding/programs";
import { createRng } from "@/core/common/rng";

/**
 * Default appearance DNA used by portrait/export tests.
 * @param overrides
 */
export function makeAppearanceDNA(overrides: any = {}): any {
  return {
    seed: 12345,
    headTilt: 0,
    headLength: 1,
    earSpread: 1,
    eyeY: 0,
    forelockSweep: 0,
    maneWaves: [0, 0, 0, 0],
    bodyLength: 1,
    bodyDepth: 1,
    legLength: 1,
    tailSweep: 0,
    tailFullness: 1,
    socks: ["none", "sock", "stocking", "none"],
    dapples: [],
    flecks: [],
    ...overrides,
  };
}

/**
 * Build a sample BreedingProgram for slice/flow tests.
 * @param overrides
 */
export function makeBreedingProgram(overrides: Partial<BreedingProgram> = {}): BreedingProgram {
  const base = createBreedingProgram(
    overrides.stableId ?? "stable-test",
    overrides.archetypeId ?? "elite-turf-stayer",
    overrides.createdDay ?? 0,
  );
  return { ...base, ...overrides };
}

/**
 * Minimal slice of game state covering the breeding-program flow.
 * Tests can pass this into a Zustand `create()(...)` factory or use it as
 * the initial argument to a slice creator.
 * @param overrides
 * @param overrides.activeBreedingProgram
 * @param overrides.breedingPrograms
 */
export function makeBreedingProgramState(
  overrides: {
    activeBreedingProgram?: BreedingProgram | null;
    breedingPrograms?: BreedingProgram[];
  } = {},
) {
  return {
    activeBreedingProgram: overrides.activeBreedingProgram ?? null,
    breedingPrograms: overrides.breedingPrograms ?? [],
    stable: { id: "stable-test", name: "Test Stable" },
    currentDay: 0,
    horses: [] as unknown[],
  };
}

/**
 * Create a minimal GameState for testing.
 * Tests can extend this with additional properties as needed.
 * @param overrides
 */
export function makeGameState(overrides: Partial<GameState> = {}): Partial<GameState> {
  return {
    day: 1,
    cash: 100000,
    horses: [],
    horseMap: new Map(),
    races: [],
    log: [],
    news: [],
    inbox: [],
    seasonRecords: [],
    hallOfFame: [],
    archive: { horses: [], races: [], pregnancies: [], news: [] },
    transactions: [],
    expenses: [],
    npcStables: [],
    pregnancies: [],
    awards: [],
    market: [],
    auctions: [],
    lastCalibrationDay: 0,
    calibratedPars: {},
    paceSamples: {},
    pendingAwardCeremonies: [],
    trainingUsed: {},
    scoutReports: [],
    syndicates: {} as any,
    facilities: {} as any,
    reputation: {} as any,
    jockeys: [],
    hiredStaff: [] as any,
    npcAIManager: undefined,
    claims: [],
    horseLeaderboards: { earnings: [] as any, beyer: [] as any },
    trackRecords: {},
    campaigns: [],
    ...overrides,
  };
}

/**
 * Create a minimal PipelineContext for testing.
 * Tests can extend this with additional properties as needed.
 * @param overrides
 */
export function makePipelineContext(
  overrides: Partial<PipelineContext> = {},
): Partial<PipelineContext> {
  const state = makeGameState(overrides.state as any);
  return {
    previousDay: 0,
    newDay: 1,
    state: state as GameState,
    logs: [],
    dailyRng: createRng(12345),
    intents: [],
    impacts: [],
    impactLog: [],
    ...overrides,
  };
}
