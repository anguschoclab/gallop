import { describe, it, expect } from "vitest";
import { stepRunner, runRaceToCompletion } from "@/core/race/engine/simulation";
import { createRng } from "@/core/common/rng";
import { FactorLedgerCollector } from "@/core/race/factorLedger";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { makeUnowned } from "@/core/horse/ownership";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test",
    silk: "",
    isPlayer: false,
    position: 0,
    velocity: 15,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 5,
    staminaFactor: 0.7,
    noise: 0.5,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    weight: 55,
    horse: { bleederRisk: 0, roarerRisk: 0, id: "h1" } as any,
    ...overrides,
  };
}

/** Mock RNG that always returns a fixed value. */
function mockRng(value: number) {
  return { next: () => value } as any;
}

describe("Noise — fatigue-scaled asymmetric behavior", () => {
  describe("negative bias", () => {
    it("noiseMul < 1.0 when rng returns 0.5 (midpoint)", () => {
      // With NOISE_BIAS = 0.53, rng returning 0.5:
      // noiseValue = (0.5 - 0.53) * 0.08 * noise * fatigueAmp = -0.03 * 0.08 * noise * fatigueAmp
      // noiseMul = 1 + noiseValue < 1.0
      // Current code: noiseValue = (0.5 - 0.5) * 0.08 * noise = 0 → noiseMul = 1.0
      const collector = new FactorLedgerCollector();
      const runner = makeRunner({
        position: 800, // 50% of 1600m — past STAMINA_FADE_START
        velocity: 15,
        factorLedger: collector,
      });

      stepRunner(runner, 0.1, 50, 1600, mockRng(0.5), [runner]);

      const ledger = collector.finalize();
      // With the new biased noise, noiseMul should be < 1.0
      // With the current symmetric noise, noiseMul = 1.0
      expect(ledger.noise.raceAvg).toBeLessThan(1.0);
    });

    it("noiseMul is more negative than positive for symmetric rng draws", () => {
      // With NOISE_BIAS = 0.53, a draw of 0.5 gives negative noise,
      // while a draw of 0.56 gives positive noise.
      // The bias means more draws produce negative noise than positive.
      const collectorNeg = new FactorLedgerCollector();
      const collectorPos = new FactorLedgerCollector();

      const runnerNeg = makeRunner({
        position: 800,
        factorLedger: collectorNeg,
      });
      const runnerPos = makeRunner({
        position: 800,
        factorLedger: collectorPos,
      });

      // rng = 0.5 → below bias → negative noise
      stepRunner(runnerNeg, 0.1, 50, 1600, mockRng(0.5), [runnerNeg]);
      // rng = 0.56 → above bias → positive noise
      stepRunner(runnerPos, 0.1, 50, 1600, mockRng(0.56), [runnerPos]);

      const negLedger = collectorNeg.finalize();
      const posLedger = collectorPos.finalize();

      // The negative draw should produce noiseMul < 1.0
      expect(negLedger.noise.raceAvg).toBeLessThan(1.0);
      // The positive draw should produce noiseMul > 1.0
      expect(posLedger.noise.raceAvg).toBeGreaterThan(1.0);
    });
  });

  describe("fatigue scaling", () => {
    it("late-race noise deviation is larger than early-race (same rng draw)", () => {
      // At early position (progress < STAMINA_FADE_START), staminaMul = 1, fatigueAmp = 1
      // At late position (progress > STAMINA_FADE_START), staminaMul < 1, fatigueAmp > 1
      // With the same rng draw, the late runner should have a larger noise deviation.
      const earlyCollector = new FactorLedgerCollector();
      const lateCollector = new FactorLedgerCollector();

      const earlyRunner = makeRunner({
        position: 100, // ~6% of 1600m — before fade
        velocity: 15,
        staminaFactor: 0.7,
        factorLedger: earlyCollector,
      });
      const lateRunner = makeRunner({
        position: 1200, // 75% of 1600m — well into fade
        velocity: 15,
        staminaFactor: 0.7,
        factorLedger: lateCollector,
      });

      // Use same rng draw (1.0 = maximum positive noise)
      stepRunner(earlyRunner, 0.1, 50, 1600, mockRng(1.0), [earlyRunner]);
      stepRunner(lateRunner, 0.1, 50, 1600, mockRng(1.0), [lateRunner]);

      const earlyLedger = earlyCollector.finalize();
      const lateLedger = lateCollector.finalize();

      // Both should have positive noise (rng = 1.0 > bias)
      expect(earlyLedger.noise.raceAvg).toBeGreaterThan(1.0);
      expect(lateLedger.noise.raceAvg).toBeGreaterThan(1.0);
      // Late runner should have LARGER deviation (fatigue amplifies noise)
      const earlyDeviation = Math.abs(earlyLedger.noise.raceAvg - 1.0);
      const lateDeviation = Math.abs(lateLedger.noise.raceAvg - 1.0);
      expect(lateDeviation).toBeGreaterThan(earlyDeviation);
    });

    it("early-race noise is not amplified (staminaMul = 1, fatigueAmp = 1)", () => {
      // At early position, staminaMul = 1, so fatigueAmp = 1
      // noise should be the same as base (no fatigue scaling)
      const collector = new FactorLedgerCollector();
      const runner = makeRunner({
        position: 100, // ~6% — before fade
        velocity: 15,
        noise: 0.5,
        factorLedger: collector,
      });

      stepRunner(runner, 0.1, 50, 1600, mockRng(1.0), [runner]);
      const ledger = collector.finalize();

      // With rng = 1.0, NOISE_BIAS = 0.53:
      // noiseValue = (1.0 - 0.53) * 0.08 * 0.5 * 1.0 = 0.47 * 0.08 * 0.5 = 0.0188
      // noiseMul = 1.0188
      // Deviation from 1.0 should be ~0.0188
      const deviation = Math.abs(ledger.noise.raceAvg - 1.0);
      expect(deviation).toBeCloseTo(0.0188, 2);
    });
  });

  describe("determinism", () => {
    it("same seed produces identical race results (one rng.next() per runner per tick)", () => {
      const runners1 = [
        makeRunner({ horseId: "h1", gate: 1, noise: 0.5, staminaFactor: 0.7 }),
        makeRunner({ horseId: "h2", gate: 2, noise: 0.5, staminaFactor: 0.7 }),
      ];
      const runners2 = [
        makeRunner({ horseId: "h1", gate: 1, noise: 0.5, staminaFactor: 0.7 }),
        makeRunner({ horseId: "h2", gate: 2, noise: 0.5, staminaFactor: 0.7 }),
      ];

      const rng1 = createRng("noise-determinism");
      const rng2 = createRng("noise-determinism");

      const { result: r1 } = runRaceToCompletion(runners1, 400, rng1, 0.1, 600, undefined, false);
      const { result: r2 } = runRaceToCompletion(runners2, 400, rng2, 0.1, 600, undefined, false);

      expect(r1.map((r) => r.horseId)).toEqual(r2.map((r) => r.horseId));
      expect(r1.map((r) => r.time)).toEqual(r2.map((r) => r.time));
    });
  });
});
