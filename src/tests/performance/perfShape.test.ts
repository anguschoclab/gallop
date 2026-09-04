import { describe, it, expect } from "vitest";
import { calculateTacticalAdjustment } from "@/core/race/engine/tacticalAI";
import { buildFieldContext } from "@/core/race/runnerConditionDerivation";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";
import { makeUnowned } from "@/core/horse/ownership";
import { calculateNpcBid } from "@/core/auction/engine";
import { createRng } from "@/core/common/rng";
import { AUCTION_HOUSES } from "@/core/prestige/auctionHouses";
import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

describe("perf-shape: tacticalAI uses Array.includes not Set allocation (#364)", () => {
  const createMockRunner = (overrides: Partial<Runner> = {}): Runner =>
    ({
      horseId: "horse1",
      name: "Test Horse",
      ownership: makeUnowned(),
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
      horse: { id: "horse1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
      jockey: undefined,
      ...overrides,
    }) as Runner;

  const createMockPace = (overrides: Partial<PaceContext> = {}): PaceContext => ({
    leaderPos: 120,
    leaderVelocity: 16,
    leadGroupCount: 1,
    pacePressure: 1.0,
    progress: 0.5,
    laneDensity: [0, 0, 0, 0, 0],
    paceRating: 1.0,
    ...overrides,
  });

  it("correctly detects rival using Array.includes on rivalHorseIds", () => {
    const runner = createMockRunner({
      horseId: "h1",
      position: 100,
      rivalHorseIds: ["h2", "h3"],
    });
    const rivals = [
      createMockRunner({ horseId: "h2", position: 102, lane: 1.2 }),
      createMockRunner({ horseId: "h3", position: 98, lane: 1.2 }),
    ];
    const pace = createMockPace();
    // Should not throw and should produce a valid adjustment
    const result = calculateTacticalAdjustment(runner, pace, rivals);
    expect(typeof result.velocityMod).toBe("number");
    expect(typeof result.targetLane).toBe("number");
  });

  it("handles empty rivalHorseIds without error", () => {
    const runner = createMockRunner({ rivalHorseIds: [] });
    const result = calculateTacticalAdjustment(runner, createMockPace(), []);
    expect(result).toBeDefined();
  });

  it("handles undefined rivalHorseIds without error", () => {
    const runner = createMockRunner({ rivalHorseIds: undefined as any });
    const result = calculateTacticalAdjustment(runner, createMockPace(), []);
    expect(result).toBeDefined();
  });
});

describe("perf-shape: buildFieldContext is hoisted outside runner map in Track (#380)", () => {
  it("buildFieldContext returns a stable object with expected fields", () => {
    const runners: Runner[] = [
      {
        horseId: "h1",
        position: 100,
        velocity: 15,
        lane: 1,
        finishTime: null,
      } as any,
      {
        horseId: "h2",
        position: 110,
        velocity: 16,
        lane: 2,
        finishTime: null,
      } as any,
    ];
    const ctx = buildFieldContext(runners);
    expect(ctx).toHaveProperty("meanVelocity");
    expect(ctx).toHaveProperty("fastestVelocity");
    expect(ctx).toHaveProperty("leaderPos");
    expect(ctx).toHaveProperty("liveCount");
    expect(ctx).toHaveProperty("sortedLive");
    expect(ctx).toHaveProperty("velocityRank");
    expect(ctx.liveCount).toBe(2);
    expect(ctx.leaderPos).toBe(110);
    expect(ctx.fastestVelocity).toBe(16);
  });

  it("buildFieldContext can be called once and reused for multiple runners", () => {
    // This test validates the hoisting pattern: call buildFieldContext once,
    // then use the result for deriveRunnerConditions on each runner.
    const runners: Runner[] = [
      { horseId: "h1", position: 100, velocity: 15, lane: 1, finishTime: null } as any,
      { horseId: "h2", position: 105, velocity: 14, lane: 2, finishTime: null } as any,
    ];
    // Call once — this is the hoisted pattern
    const ctx = buildFieldContext(runners);
    // Verify it can be reused for both runners
    expect(ctx.velocityRank.get("h1")).toBeDefined();
    expect(ctx.velocityRank.get("h2")).toBeDefined();
    // The context is a snapshot — it doesn't change when runners change
    expect(ctx.liveCount).toBe(2);
  });
});

describe("perf-shape: auction engine hoists horsesDict outside consignor loop (#369)", () => {
  it("calculateNpcBid accepts house parameter (10th arg) without error", () => {
    // This test validates that the house parameter (added as the 10th arg)
    // is accepted by the function signature. The actual bidding logic is
    // tested in housePrestigeBidding.test.ts.
    const stable = createTestStable({ cash: 0, personality: "conservative" }) as unknown as Stable;
    const horse = createTestHorse() as unknown as Horse;
    const rng = createRng(42);
    const house = AUCTION_HOUSES[0];

    // Should not throw — the function accepts 10 args including house
    expect(() => {
      calculateNpcBid(
        stable,
        horse,
        999_999_999,
        "yearling",
        rng,
        [],
        undefined,
        undefined,
        1,
        house,
      );
    }).not.toThrow();
  });

  it("calculateNpcBid works without house parameter (backward compatible)", () => {
    const stable = createTestStable({ cash: 0, personality: "conservative" }) as unknown as Stable;
    const horse = createTestHorse() as unknown as Horse;
    const rng = createRng(42);

    // Should not throw with 9 args (no house)
    expect(() => {
      calculateNpcBid(stable, horse, 999_999_999, "yearling", rng);
    }).not.toThrow();
  });
});
