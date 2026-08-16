/**
 * Performance profiling tests for race AI enhancements
 *
 * Verifies that tactical AI and dynamic profile calculations
 * are lightweight enough for real-time race simulation.
 */

import { describe, it, expect } from "vitest";
import { calculateTacticalAdjustment } from "@/core/race/engine/tacticalAI";
import { getDynamicProfile } from "@/core/race/engine/runningStyleProfiles";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

function createMockRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test",
    silk: "red",
    owned: false,
    position: 100,
    velocity: 15,
    lane: 1.2,
    targetLane: 1.2,
    laneVelocity: 0,
    finishTime: null,
    topSpeed: 20,
    accel: 2,
    staminaFactor: 1,
    noise: 0,
    runningStyle: "P",
    gate: 1,
    weight: 126,
    affinityBonus: 0,
    draftingHorseId: null,
    horse: { id: "h1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
    jockey: {
      id: "j1",
      name: "J",
      skill: 50,
      stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50 },
    } as any,
    ...overrides,
  } as Runner;
}

const mockPace: PaceContext = {
  leaderPos: 120,
  leaderVelocity: 16,
  leadGroupCount: 3,
  paceRating: 1.0,
  pacePressure: 0,
  progress: 0.5,
  laneDensity: [0, 1, 0, 0],
} as PaceContext;

describe("Phase 13: Performance profiling", () => {
  it("calculateTacticalAdjustment completes in under 0.5ms per call (14-horse field)", () => {
    const runner = createMockRunner();
    const field: Runner[] = [];
    for (let i = 0; i < 14; i++) {
      field.push(
        createMockRunner({
          horseId: `h${i}`,
          position: 100 + i * 2,
          runningStyle: i < 3 ? "E" : i < 7 ? "P" : "S",
        }),
      );
    }

    // Warm up
    calculateTacticalAdjustment(runner, mockPace, field);

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateTacticalAdjustment(runner, mockPace, field);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 1000;

    expect(perCall).toBeLessThan(0.5);
  });

  it("getDynamicProfile completes in under 0.01ms per call", () => {
    const horse = { stats: { acceleration: 70 }, recoveryPoints: 100 };
    const jockey = { stats: { vigor: 60 } };

    // Warm up
    getDynamicProfile("S", 1.0, 12, 0.5, horse, jockey);

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      getDynamicProfile("S", 1.0, 12, 0.5, horse, jockey);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 10000;

    expect(perCall).toBeLessThan(0.01);
  });

  it("tactical AI total overhead for 14-horse 120s race stays under 840ms", () => {
    const field: Runner[] = [];
    for (let i = 0; i < 14; i++) {
      field.push(
        createMockRunner({
          horseId: `h${i}`,
          position: 100 + i * 2,
          runningStyle: i < 3 ? "E" : i < 7 ? "P" : "S",
        }),
      );
    }

    // Simulate ~1680 calls (14 horses * 120 ticks at 1Hz throttle)
    const start = performance.now();
    for (let tick = 0; tick < 120; tick++) {
      for (const runner of field) {
        calculateTacticalAdjustment(runner, mockPace, field);
      }
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(840);
  });
});
