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
      ownership: { type: "unowned" },
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
      horse: {
        id: "horse1",
        mudAptitude: 1.0,
        recoveryPoints: 100,
      } as any,
      jockey: jockeyOverrides
        ? {
            id: "j1",
            name: "Test Jockey",
            skill: 50,
            stats: {
              pacing: 50,
              positioning: 50,
              vigor: 50,
              gates: 50,
              loyalty: 50,
              ...jockeyOverrides,
            },
            traits: [],
            weight: 118,
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

    const result = calculateTacticalAdjustment(runner, pace, [blocker, runner]);

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

  // ── Phase 2: Enhanced Tactical AI ──

  describe("weather-aware tactics", () => {
    it.each([
      ["heavy", 0.3],
      ["soft", 0.4],
      ["yielding", 0.45],
    ] as const)(
      "reduces velocity for low mudAptitude horse on %s track early in race",
      (trackCondition, mudAptitude) => {
        const runner = createMockRunner(
          {
            runningStyle: "E",
            position: 50,
            trackCondition,
            horse: { id: "horse1", mudAptitude, recoveryPoints: 100 } as any,
          },
          { pacing: 80, positioning: 80 },
        );
        const pace = createMockPace({ leaderPos: 100, progress: 0.3 });

        const result = calculateTacticalAdjustment(runner, pace, [runner]);

        expect(result.velocityMod).toBeLessThan(1.0);
      },
    );

    it("does not reduce velocity for high mudAptitude horse on heavy track", () => {
      const runner = createMockRunner(
        {
          runningStyle: "E",
          position: 50,
          trackCondition: "heavy",
          horse: { id: "horse1", mudAptitude: 1.1, recoveryPoints: 100 } as any,
        },
        { pacing: 80, positioning: 80 },
      );
      const pace = createMockPace({ leaderPos: 100, progress: 0.3 });

      const result = calculateTacticalAdjustment(runner, pace, [runner]);

      // Should not have weather penalty — velocityMod from pace sensing only
      expect(result.velocityMod).toBeGreaterThanOrEqual(1.0);
    });

    it("does not apply weather penalty on fast track", () => {
      const runner = createMockRunner(
        {
          runningStyle: "E",
          position: 50,
          trackCondition: "fast",
          horse: { id: "horse1", mudAptitude: 0.3, recoveryPoints: 100 } as any,
        },
        { pacing: 80, positioning: 80 },
      );
      const pace = createMockPace({ leaderPos: 100, progress: 0.3 });

      const result = calculateTacticalAdjustment(runner, pace, [runner]);

      expect(result.velocityMod).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe("stamina-state awareness", () => {
    it.each([0.3, 0.45, 0.55])(
      "reduces velocity when staminaFactor is low (%s)",
      (staminaFactor) => {
        const runner = createMockRunner(
          {
            runningStyle: "E",
            position: 50,
            staminaFactor,
          },
          { pacing: 80, positioning: 80 },
        );
        const pace = createMockPace({ leaderPos: 100, progress: 0.4 });

        const result = calculateTacticalAdjustment(runner, pace, [runner]);

        expect(result.velocityMod).toBeLessThan(1.0);
      },
    );

    it("does not reduce velocity when staminaFactor is high", () => {
      const runner = createMockRunner(
        {
          runningStyle: "E",
          position: 50,
          staminaFactor: 0.9,
        },
        { pacing: 80, positioning: 80 },
      );
      const pace = createMockPace({ leaderPos: 100, progress: 0.4 });

      const result = calculateTacticalAdjustment(runner, pace, [runner]);

      expect(result.velocityMod).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe("competitive intelligence (rival awareness)", () => {
    it("applies aggressiveness boost when rival is within 2 lengths", () => {
      const runner = createMockRunner(
        {
          horseId: "horse1",
          runningStyle: "P",
          position: 100,
          rivalHorseIds: ["horse2"],
        },
        { pacing: 80, positioning: 80 },
      );
      const rival = createMockRunner({
        horseId: "horse2",
        position: 104, // Within ~6m (2 lengths)
        lane: 1.2,
        runningStyle: "E",
      });
      const pace = createMockPace({ leaderPos: 110, progress: 0.5 });

      const result = calculateTacticalAdjustment(runner, pace, [rival, runner]);

      expect(result.velocityMod).toBeGreaterThan(1.0);
    });

    it("does not apply rival boost when rival is far ahead", () => {
      const runner = createMockRunner(
        {
          horseId: "horse1",
          runningStyle: "P",
          position: 100,
          rivalHorseIds: ["horse2"],
        },
        { pacing: 80, positioning: 80 },
      );
      const rival = createMockRunner({
        horseId: "horse2",
        position: 120, // Far ahead, >6m
        lane: 1.2,
        runningStyle: "E",
      });
      const pace = createMockPace({ leaderPos: 130, progress: 0.5 });

      const result = calculateTacticalAdjustment(runner, pace, [rival, runner]);

      // No rival boost — velocityMod should be baseline (1.0 for P at normal pace)
      expect(result.velocityMod).toBe(1.0);
    });

    it("does not apply rival boost when no rivalHorseIds set", () => {
      const runner = createMockRunner(
        {
          horseId: "horse1",
          runningStyle: "P",
          position: 100,
        },
        { pacing: 80, positioning: 80 },
      );
      const other = createMockRunner({
        horseId: "horse2",
        position: 104,
        lane: 1.2,
        runningStyle: "E",
      });
      const pace = createMockPace({ leaderPos: 110, progress: 0.5 });

      const result = calculateTacticalAdjustment(runner, pace, [other, runner]);

      expect(result.velocityMod).toBe(1.0);
    });
  });

  describe("traffic prediction", () => {
    it("preemptively switches lane when 2+ horses clustered ahead within 6m", () => {
      const runner = createMockRunner(
        {
          horseId: "horse1",
          position: 100,
          lane: 1.2,
          runningStyle: "P",
        },
        { pacing: 80, positioning: 80 },
      );
      const blocker1 = createMockRunner({
        horseId: "b1",
        position: 104,
        lane: 1.2,
        runningStyle: "E",
      });
      const blocker2 = createMockRunner({
        horseId: "b2",
        position: 105,
        lane: 1.2,
        runningStyle: "E",
      });
      const pace = createMockPace({ laneDensity: [0, 2, 0, 0] });

      const result = calculateTacticalAdjustment(runner, pace, [blocker2, blocker1, runner]);

      // Should switch to a less dense lane (lane index 2 = 2.4)
      expect(result.targetLane).not.toBe(runner.lane);
    });

    it("does not predict traffic with low-skill jockey (positioning < 40)", () => {
      const runner = createMockRunner(
        {
          horseId: "horse1",
          position: 100,
          lane: 1.2,
          runningStyle: "P",
        },
        { pacing: 30, positioning: 30 },
      );
      const blocker1 = createMockRunner({
        horseId: "b1",
        position: 104,
        lane: 1.2,
        runningStyle: "E",
      });
      const blocker2 = createMockRunner({
        horseId: "b2",
        position: 105,
        lane: 1.2,
        runningStyle: "E",
      });
      const pace = createMockPace({ laneDensity: [0, 2, 0, 0] });

      const result = calculateTacticalAdjustment(runner, pace, [blocker2, blocker1, runner]);

      // Low-skill jockey should not predict — stays in current lane
      expect(result.targetLane).toBe(runner.lane);
    });
  });

  describe("dynamic pace adaptation", () => {
    it("front-runner steal boost is reduced when staminaFactor is low", () => {
      const runnerLowStamina = createMockRunner(
        {
          runningStyle: "E",
          position: 50,
          staminaFactor: 0.5,
        },
        { pacing: 100, positioning: 100 },
      );
      const runnerHighStamina = createMockRunner(
        {
          runningStyle: "E",
          position: 50,
          staminaFactor: 1.0,
        },
        { pacing: 100, positioning: 100 },
      );
      const pace = createMockPace({ paceRating: 0.8, leaderPos: 100, progress: 0.5 });

      const resultLow = calculateTacticalAdjustment(runnerLowStamina, pace, [runnerLowStamina]);
      const resultHigh = calculateTacticalAdjustment(runnerHighStamina, pace, [runnerHighStamina]);

      // Low stamina should get less boost than high stamina
      expect(resultLow.velocityMod).toBeLessThan(resultHigh.velocityMod);
    });

    it("closers reposition to midpack on very slow pace instead of dropping further back", () => {
      const runner = createMockRunner(
        {
          runningStyle: "S",
          position: 50,
          lane: 2.4, // Currently wide
        },
        { pacing: 80, positioning: 80 },
      );
      const pace = createMockPace({
        paceRating: 0.85,
        leaderPos: 100,
        progress: 0.4,
      });

      const result = calculateTacticalAdjustment(runner, pace, [runner]);

      // Should not target the far outside — move toward midpack/rail
      expect(result.targetLane).toBeLessThan(runner.lane);
    });
  });
});
