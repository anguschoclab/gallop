import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { createRng } from "@/core/common/rng";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { FactorLedgerCollector } from "@/core/race/factorLedger";

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
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    silk: "",
    ownership: { type: "unowned" },
    weight: 55,
    horse: {} as any,
    factorLedger: new FactorLedgerCollector(),
    ...overrides,
  } as Runner;
}

describe("time increment pattern — runRaceToCompletion vs useLiveRaceSimulation", () => {
  it("runRaceToCompletion first step receives t=0", () => {
    // runRaceToCompletion starts with t=0 and increments at end of loop.
    // We can verify this by checking the finish time for a runner that
    // finishes immediately — its finishTime should be based on t=0 for the first step.
    const runners = [
      makeRunner({ horseId: "h1", gate: 1, position: 0, velocity: 1000, topSpeed: 1000 }),
    ];

    const rng = createRng("time-test");
    const { result, factorLedgers } = runRaceToCompletion(
      runners,
      100,
      rng,
      0.1,
      600,
      undefined,
      false,
    );

    // With velocity 1000 and distance 100, the runner should finish in the first step.
    // t=0 initially, stepRunner receives t=0, overshoot interpolation gives tFinish ≈ 0.
    expect(result[0].time).toBeLessThan(0.1);
    // factorLedgers should be present in the return
    expect(factorLedgers).toBeDefined();
    expect(factorLedgers["h1"]).toBeDefined();
  });

  it("runRaceToCompletion with dt=0.1 produces deterministic finish times", () => {
    const runners1 = [
      makeRunner({ horseId: "h1", gate: 1, topSpeed: 16, velocity: 15, noise: 0.1 }),
    ];
    const runners2 = [
      makeRunner({ horseId: "h1", gate: 1, topSpeed: 16, velocity: 15, noise: 0.1 }),
    ];

    const rng1 = createRng("time-det-1");
    const rng2 = createRng("time-det-1");

    const { result: r1, factorLedgers: fl1 } = runRaceToCompletion(
      runners1,
      200,
      rng1,
      0.1,
      600,
      undefined,
      false,
    );
    const { result: r2, factorLedgers: fl2 } = runRaceToCompletion(
      runners2,
      200,
      rng2,
      0.1,
      600,
      undefined,
      false,
    );

    expect(r1[0].time).toBe(r2[0].time);
    // Ledgers should be populated for all runners
    expect(fl1["h1"]).toBeDefined();
    expect(fl2["h1"]).toBeDefined();
  });

  it("runRaceToCompletion with dt=0.05 produces different finish times than dt=0.1", () => {
    // This test demonstrates the dt mismatch: different dt values produce
    // different finish times even with the same seed.
    const runners1 = [
      makeRunner({ horseId: "h1", gate: 1, topSpeed: 16, velocity: 15, noise: 0.1 }),
    ];
    const runners2 = [
      makeRunner({ horseId: "h1", gate: 1, topSpeed: 16, velocity: 15, noise: 0.1 }),
    ];

    const rng1 = createRng("time-dt-test");
    const rng2 = createRng("time-dt-test");

    const { result: r1, factorLedgers: fl1 } = runRaceToCompletion(
      runners1,
      200,
      rng1,
      0.1,
      600,
      undefined,
      false,
    );
    const { result: r2, factorLedgers: fl2 } = runRaceToCompletion(
      runners2,
      200,
      rng2,
      0.05,
      600,
      undefined,
      false,
    );

    // Different dt should produce different finish times due to Euler integration
    // differences and different RNG call counts per tick.
    expect(r1[0].time).not.toBe(r2[0].time);
    // Both should have factor ledgers
    expect(fl1["h1"]).toBeDefined();
    expect(fl2["h1"]).toBeDefined();
  });
});
