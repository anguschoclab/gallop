/**
 * sampleGameState.ts - Reusable test fixtures
 *
 * Lightweight factories for building store/breeding-program test scenarios
 * without spinning up a full GameState. Keep these intentionally minimal —
 * tests should extend the returned object with whatever fields they assert on.
 */

import type { BreedingProgram } from "@/core/breeding/programs";
import type { GameState, Horse, Race } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { createBreedingProgram } from "@/core/breeding/programs";
import { createRng } from "@/core/common/rng";

/** Converts a Horse array to Record<string, Horse> for use in test state fixtures. */
export function h2r(horses: Horse[]): Record<string, Horse> {
  return Object.fromEntries(horses.map((h) => [h.id, h]));
}

/** Converts a Race array to Record<string, Race> for use in test state fixtures. */
export function r2r(races: Race[]): Record<string, Race> {
  return Object.fromEntries(races.map((r) => [r.id, r]));
}

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
    horses: {} as Record<string, Horse>,
    races: {} as Record<string, any>,
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
  const horses = state.horses ? Object.values(state.horses) : [];
  const races = state.races ? Object.values(state.races) : [];
  const stables = Array.isArray(state.npcStables) ? state.npcStables : [];
  const jockeys = Array.isArray(state.jockeys) ? state.jockeys : [];
  return {
    previousDay: 0,
    newDay: 1,
    state: state as GameState,
    logs: [],
    dailyRng: createRng(12345),
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
