import { describe, it, expect } from "vitest";
import { computePaceContext, calculateWindEffect } from "@/core/race/engine/simulation";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test",
    silk: "red",
    isPlayer: false,
    position: 0,
    velocity: 16,
    finishTime: null,
    lane: 1.2,
    targetLane: 1.2,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 18,
    accel: 5,
    staminaFactor: 0.8,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    weight: 120,
    horse: {} as any,
    ...overrides,
  };
}

describe("computePaceContext", () => {
  it("should return zero leader pos when all runners finished", () => {
    const runners = [makeRunner({ finishTime: 10, position: 100 })];
    const result = computePaceContext(runners, 1600);
    expect(result.leaderPos).toBe(0);
    expect(result.leaderVelocity).toBe(0);
  });

  it("should identify the leader position and velocity", () => {
    const runners = [
      makeRunner({ position: 100, velocity: 17 }),
      makeRunner({ position: 80, velocity: 16 }),
    ];
    const result = computePaceContext(runners, 1600);
    expect(result.leaderPos).toBe(100);
    expect(result.leaderVelocity).toBe(17);
  });

  it("should count lead group within LEAD_GROUP_GAP", () => {
    const runners = [
      makeRunner({ position: 100, velocity: 17, runningStyle: "E" }),
      makeRunner({ position: 98, velocity: 16, runningStyle: "E" }),
      makeRunner({ position: 50, velocity: 15 }),
    ];
    const result = computePaceContext(runners, 1600);
    expect(result.leadGroupCount).toBe(2);
  });

  it("should compute pace pressure from front runners in lead group", () => {
    const runners = [
      makeRunner({ position: 100, velocity: 17, runningStyle: "E" }),
      makeRunner({ position: 99, velocity: 16, runningStyle: "E" }),
      makeRunner({ position: 98, velocity: 16, runningStyle: "E" }),
    ];
    const result = computePaceContext(runners, 1600);
    expect(result.pacePressure).toBeGreaterThan(0);
  });

  it("should compute progress as average of total progress", () => {
    const runners = [
      makeRunner({ position: 800, velocity: 16 }),
      makeRunner({ position: 400, velocity: 15 }),
    ];
    const result = computePaceContext(runners, 1600);
    expect(result.progress).toBeCloseTo((0.5 + 0.25) / 2, 2);
  });

  it("should compute pace rating relative to expected velocity", () => {
    const runners = [makeRunner({ position: 100, velocity: 16 })];
    const result = computePaceContext(runners, 1600);
    expect(result.paceRating).toBeGreaterThan(0);
  });

  it("should handle empty runners array", () => {
    const result = computePaceContext([], 1600);
    expect(result.leaderPos).toBe(0);
    expect(result.progress).toBe(1);
  });

  it("should count finished runners as full progress", () => {
    const runners = [
      makeRunner({ finishTime: 10, position: 1600 }),
      makeRunner({ position: 800, velocity: 16 }),
    ];
    const result = computePaceContext(runners, 1600);
    expect(result.progress).toBeCloseTo((1 + 0.5) / 2, 2);
  });
});

describe("calculateWindEffect", () => {
  it("should return neutral mods when windKph is undefined", () => {
    const runner = makeRunner();
    const result = calculateWindEffect(runner, undefined, undefined, undefined, null, 0);
    expect(result.speedMod).toBe(1);
    expect(result.staminaMod).toBe(1);
  });

  it("should return neutral mods when section is null", () => {
    const runner = makeRunner();
    const result = calculateWindEffect(runner, undefined, 20, 90, null, 0);
    expect(result.speedMod).toBe(1);
    expect(result.staminaMod).toBe(1);
  });

  it("should reduce speed for headwind (windComponent > 0)", () => {
    const runner = makeRunner();
    const section = {
      type: "straight",
      orientationDeg: 0,
      startMeter: 0,
      length: 300,
      bendDirection: undefined,
    } as any;
    const result = calculateWindEffect(runner, { straightLength: 400 } as any, 30, 0, section, 100);
    expect(result.speedMod).toBeLessThan(1);
  });

  it("should increase speed for tailwind (windComponent < 0)", () => {
    const runner = makeRunner();
    const section = {
      type: "straight",
      orientationDeg: 0,
      startMeter: 0,
      length: 300,
      bendDirection: undefined,
    } as any;
    const result = calculateWindEffect(
      runner,
      { straightLength: 400 } as any,
      30,
      180,
      section,
      100,
    );
    expect(result.speedMod).toBeGreaterThan(1);
  });

  it("should apply stamina penalty for headwind", () => {
    const runner = makeRunner();
    const section = {
      type: "straight",
      orientationDeg: 0,
      startMeter: 0,
      length: 300,
      bendDirection: undefined,
    } as any;
    const result = calculateWindEffect(runner, { straightLength: 400 } as any, 30, 0, section, 100);
    expect(result.staminaMod).toBeGreaterThan(1);
  });

  it("should apply stamina relief for tailwind", () => {
    const runner = makeRunner();
    const section = {
      type: "straight",
      orientationDeg: 0,
      startMeter: 0,
      length: 300,
      bendDirection: undefined,
    } as any;
    const result = calculateWindEffect(
      runner,
      { straightLength: 400 } as any,
      30,
      180,
      section,
      100,
    );
    expect(result.staminaMod).toBeLessThan(1);
  });

  it("should clamp speedMod to MAX_WIND_SPEED_MOD", () => {
    const runner = makeRunner({ topSpeed: 20 });
    const section = {
      type: "straight",
      orientationDeg: 0,
      startMeter: 0,
      length: 500,
      bendDirection: undefined,
    } as any;
    const result = calculateWindEffect(
      runner,
      { straightLength: 500 } as any,
      200,
      180,
      section,
      100,
    );
    expect(result.speedMod).toBeLessThanOrEqual(1.1);
  });
});
