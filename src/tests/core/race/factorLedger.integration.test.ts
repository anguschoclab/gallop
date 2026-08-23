import { describe, it, expect } from "vitest";
import { stepRunner, runRaceToCompletion } from "@/core/race/engine/simulation";
import { createRng } from "@/core/common/rng";
import { FactorLedgerCollector } from "@/core/race/factorLedger";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Jockey } from "@/core/jockey/types";

function makeJockey(): Jockey {
  return {
    id: "j1",
    name: "Test Jockey",
    age: 25,
    archetype: "clinical",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    traits: [],
    silk: { pattern: "solid", primary: "red", secondary: "blue", cap: "white" },
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 0,
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
    affinityMap: {},
  } as unknown as Jockey;
}

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    isPlayer: false,
    position: 0,
    velocity: 15,
    finishTime: null,
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
    weight: 55,
    horse: {} as any,
    jockey: makeJockey(),
    ...overrides,
  } as Runner;
}

describe("stepRunner + FactorLedgerCollector integration", () => {
  it("stepRunner populates factorLedger after one tick", () => {
    const collector = new FactorLedgerCollector();
    const runner = makeRunner({
      position: 400,
      velocity: 15,
      factorLedger: collector,
    });
    const rng = createRng("integration-test");
    stepRunner(
      runner,
      0.1,
      10,
      1600,
      rng,
      [runner],
      undefined,
      undefined,
      0,
      1,
      undefined,
      undefined,
      10,
    );
    const ledger = collector.finalize();
    // At least some factors should have been recorded
    expect(ledger.stamina).toBeDefined();
    expect(ledger.style).toBeDefined();
  });

  it("stepRunner does not crash when factorLedger is undefined", () => {
    const runner = makeRunner({ position: 400, velocity: 15 });
    const rng = createRng("no-ledger-test");
    expect(() => {
      stepRunner(
        runner,
        0.1,
        10,
        1600,
        rng,
        [runner],
        undefined,
        undefined,
        0,
        1,
        undefined,
        undefined,
        10,
      );
    }).not.toThrow();
  });

  it("runRaceToCompletion returns factorLedgers for all runners", () => {
    const collector1 = new FactorLedgerCollector();
    const collector2 = new FactorLedgerCollector();
    const runners = [
      makeRunner({ horseId: "h1", factorLedger: collector1 }),
      makeRunner({ horseId: "h2", factorLedger: collector2 }),
    ];
    const rng = createRng("completion-test");
    const { factorLedgers } = runRaceToCompletion(runners, 200, rng, 0.1, 600, undefined, false);
    expect(factorLedgers).toBeDefined();
    expect(factorLedgers["h1"]).toBeDefined();
    expect(factorLedgers["h2"]).toBeDefined();
  });

  it("factorLedger values reflect stamina fade in a long race", () => {
    const collector = new FactorLedgerCollector();
    const runner = makeRunner({
      horseId: "h1",
      topSpeed: 18,
      velocity: 15,
      staminaFactor: 0.7,
      factorLedger: collector,
    });
    const rng = createRng("stamina-test");
    runRaceToCompletion([runner], 2000, rng, 0.1, 600, undefined, false);
    const ledger = collector.finalize();
    // Stamina should be below 1.0 for a long race with low staminaFactor
    expect(ledger.stamina.raceAvg).toBeLessThan(1.0);
  });

  it("runRaceToCompletion sets finalizedLedger on each runner", () => {
    const collector1 = new FactorLedgerCollector();
    const collector2 = new FactorLedgerCollector();
    const runners = [
      makeRunner({ horseId: "h1", factorLedger: collector1 }),
      makeRunner({ horseId: "h2", factorLedger: collector2 }),
    ];
    const rng = createRng("finalized-test");
    runRaceToCompletion(runners, 200, rng, 0.1, 600, undefined, false);
    expect(runners[0].finalizedLedger).toBeDefined();
    expect(runners[1].finalizedLedger).toBeDefined();
  });
});
