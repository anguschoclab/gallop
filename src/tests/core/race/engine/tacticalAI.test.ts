import { describe, it, expect } from "vitest";
import { calculateTacticalAdjustment } from "@/core/race/engine/tacticalAI";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

describe("tacticalAI", () => {
  const createMockRunner = (
    overrides: Partial<Runner> = {},
    jockeyOverrides: any = null,
  ): Runner => {
    return {
      horseId: "horse1",
      name: "Test Horse",
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
      courseFamiliarityMultiplier: 1,
      lastSeekContribution: 0,
      lastSpurtContribution: 0,
      preferredDistance: 1600,
      distanceRatio: 1,
      distanceDeviation: 0,
      distanceMod: 1,
      distanceStaminaMul: 1,
      draftingHorseId: null,
      jockey: jockeyOverrides
        ? {
            id: "j1",
            name: "Test Jockey",
            skill: 50,
            stats: { pacing: 50, positioning: 50, vigor: 50, gates: 50, loyalty: 50 },
            traits: [],
            weight: 118,
            ...jockeyOverrides,
          }
        : undefined,
      ...overrides,
    } as Runner;
  };

  const createMockPace = (overrides: Partial<PaceContext> = {}): PaceContext => ({
    leaderPos: 120,
    leaderVelocity: 16,
    leadGroupCount: 1,
    pacePressure: 1.0,
    progress: 0.5,
    paceRating: 1.0,
    laneDensity: [0, 1, 0, 0],
    ...overrides,
  });

  it("does nothing without a jockey", () => {
    const runner = createMockRunner();
    const pace = createMockPace();

    const result = calculateTacticalAdjustment(runner, pace, [runner]);

    expect(result.velocityMod).toBe(1.0);
    expect(result.targetLane).toBe(runner.lane);
  });

  it("slows down closers when pace is too hot", () => {
    const runner = createMockRunner(
      { runningStyle: "S", position: 50 },
      { pacing: 100, positioning: 100 },
    );
    const pace = createMockPace({ paceRating: 1.1, leaderPos: 100 }); // Hot pace, progress = 0.5

    const result = calculateTacticalAdjustment(runner, pace, [runner]);

    expect(result.velocityMod).toBeLessThan(1.0);
  });

  it("speeds up front runners when pace is too slow", () => {
    const runner = createMockRunner(
      { runningStyle: "E", position: 50 },
      { pacing: 100, positioning: 100 },
    );
    const pace = createMockPace({ paceRating: 0.8, leaderPos: 100 }); // Slow pace, progress = 0.5

    const result = calculateTacticalAdjustment(runner, pace, [runner]);

    expect(result.velocityMod).toBeGreaterThan(1.0);
  });

  it("navigates around traffic when blocked", () => {
    // Jockey is highly skilled (pacing: 100, positioning: 100 -> skill = 1.0)
    const runner = createMockRunner(
      { position: 100, lane: 1.2 },
      { pacing: 100, positioning: 100 },
    );
    const blocker = createMockRunner({ horseId: "blocker", position: 102, lane: 1.2 });

    // Lane 0 is dense, Lane 1 is current, Lane 2 is empty
    const pace = createMockPace({ laneDensity: [5, 2, 0, 1] });

    const result = calculateTacticalAdjustment(runner, pace, [runner, blocker]);

    // Should move to lane index 2 (2 * 1.2 = 2.4)
    expect(result.targetLane).toBe(2.4);
  });

  it("follows specific jockey instructions for closing", () => {
    const runner = createMockRunner(
      {
        runningStyle: "S",
        jockeyInstructions: {
          horseId: "horse1",
          raceId: "race1",
          ridingStyle: "closer",
          moveTiming: "late",
          earlyPosition: "drop_back",
          aggressiveness: 50,
        },
      },
      { pacing: 50, positioning: 50 },
    );
    const pace = createMockPace();

    const result = calculateTacticalAdjustment(runner, pace, [runner]);

    expect(result.velocityMod).toBeLessThan(1.0);
    expect(result.targetLane).toBe(0); // Moves to rail
  });
});
