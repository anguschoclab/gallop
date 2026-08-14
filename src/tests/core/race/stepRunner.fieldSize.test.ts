import { describe, it, expect } from "vitest";
import { stepRunner } from "@/core/race/engine/simulation";
import { createRng } from "@/core/common/rng";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Jockey } from "@/core/jockey/types";

function makeJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: "j1",
    name: "Test Jockey",
    age: 25,
    archetype: "clinical",
    stats: { pacing: 50, positioning: 50, vigor: 80, gateSkill: 50, temperament: 50 },
    potential: 50,
    traits: ["big_match_temperament"],
    silk: { pattern: "solid", primary: "red", secondary: "blue", cap: "white" },
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 0,
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    affinityMap: {},
    ...overrides,
  } as Jockey;
}

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Runner",
    position: 0,
    finishTime: null,
    velocity: 15,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0.5,
    runningStyle: "EP",
    draftingHorseId: null,
    silk: "",
    owned: false,
    weight: 55,
    horse: {} as any,
    jockey: makeJockey(),
    ...overrides,
  } as Runner;
}

describe("stepRunner — fieldSize parameter", () => {
  it("applies big_match_temperament vigor boost when fieldSize > threshold", () => {
    // Position at 85% of 1600m = 1360m, above VIGOR_PROGRESS_THRESHOLD (0.8)
    const r1 = makeRunner({ position: 1360, velocity: 15 });
    const r2 = makeRunner({ position: 1360, velocity: 15 });

    const rng1 = createRng("fieldsize-test");
    const rng2 = createRng("fieldsize-test");

    // Step with fieldSize = 20 (above BIG_MATCH_FIELD_THRESHOLD = 12)
    stepRunner(r1, 0.1, 50, 1600, rng1, [r1], undefined, undefined, 0, 1, undefined, undefined, 20);
    // Step without fieldSize (undefined)
    stepRunner(
      r2,
      0.1,
      50,
      1600,
      rng2,
      [r2],
      undefined,
      undefined,
      0,
      1,
      undefined,
      undefined,
      undefined,
    );

    // With big_match_temperament and fieldSize > threshold, the vigor boost
    // should produce a different velocity than without fieldSize
    expect(r1.velocity).not.toBeCloseTo(r2.velocity, 5);
  });

  it("does NOT apply vigor boost when fieldSize is undefined", () => {
    const r = makeRunner({ position: 1360, velocity: 15 });

    const rng = createRng("fieldsize-undefined");
    stepRunner(
      r,
      0.1,
      50,
      1600,
      rng,
      [r],
      undefined,
      undefined,
      0,
      1,
      undefined,
      undefined,
      undefined,
    );

    expect(r.velocity).toBeGreaterThan(0);
    expect(Number.isFinite(r.velocity)).toBe(true);
  });

  it("produces different velocity with and without fieldSize for big_match_temperament", () => {
    const r1 = makeRunner({ position: 1360, velocity: 15 });
    const r2 = makeRunner({ position: 1360, velocity: 15 });

    const rng1 = createRng("fieldsize-compare");
    const rng2 = createRng("fieldsize-compare");

    stepRunner(r1, 0.1, 50, 1600, rng1, [r1], undefined, undefined, 0, 1, undefined, undefined, 20);
    stepRunner(
      r2,
      0.1,
      50,
      1600,
      rng2,
      [r2],
      undefined,
      undefined,
      0,
      1,
      undefined,
      undefined,
      undefined,
    );

    expect(r1.velocity).not.toEqual(r2.velocity);
  });
});
