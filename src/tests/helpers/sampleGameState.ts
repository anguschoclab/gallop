/**
 * sampleGameState.ts - Reusable test fixtures
 *
 * Lightweight factories for building store/breeding-program test scenarios
 * without spinning up a full GameState. Keep these intentionally minimal —
 * tests should extend the returned object with whatever fields they assert on.
 */

import type { AppearanceDNA } from "@/core/horse/types";
import type { BreedingProgram } from "@/core/breeding/programs";
import { createBreedingProgram } from "@/core/breeding/programs";

/** Default appearance DNA used by portrait/export tests. */
export function makeAppearanceDNA(overrides: Partial<AppearanceDNA> = {}): AppearanceDNA {
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

/** Build a sample BreedingProgram for slice/flow tests. */
export function makeBreedingProgram(
  overrides: Partial<BreedingProgram> = {},
): BreedingProgram {
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
 */
export function makeBreedingProgramState(
  overrides: { activeBreedingProgram?: BreedingProgram | null; breedingPrograms?: BreedingProgram[] } = {},
) {
  return {
    activeBreedingProgram: overrides.activeBreedingProgram ?? null,
    breedingPrograms: overrides.breedingPrograms ?? [],
    stable: { id: "stable-test", name: "Test Stable" },
    currentDay: 0,
    horses: [] as unknown[],
  };
}
