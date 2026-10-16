/**
 * liveHeadlessEquivalence.test.ts — the live RAF adapter and headless
 * completion share one kernel, so identical inputs must produce identical
 * outcomes regardless of stepping cadence.
 */
import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { RaceSimulationSession } from "@/core/race/engine/raceSession";
import { createRng } from "@/core/common/rng";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createTestJockey } from "@/tests/helpers";
import { asJockeyId } from "@/core/types/branded";

function makeJockey() {
  return createTestJockey({
    id: asJockeyId("j1"),
    archetype: "clinical",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 0,
    stableAffinity: 0,
  });
}

const STYLES = ["E", "EP", "P", "S"] as const;

function makeField(n = 8): Runner[] {
  return Array.from(
    { length: n },
    (_, i) =>
      ({
        horseId: `h${i + 1}`,
        name: `Horse ${i + 1}`,
        silk: "#fff",
        isPlayer: false,
        position: 0,
        velocity: 0,
        finishTime: null,
        lane: i + 1,
        targetLane: i + 1,
        laneVelocity: 0,
        gate: i + 1,
        topSpeed: 15 + (i % 3) * 0.4,
        accel: 1,
        staminaFactor: 1,
        noise: 0.05 + i * 0.02,
        affinityBonus: 0,
        runningStyle: STYLES[i % STYLES.length],
        draftingHorseId: null,
        weight: 55,
        horse: {} as never,
        jockey: makeJockey(),
      }) as Runner,
  );
}

function sameOutcome(
  a: ReturnType<RaceSimulationSession["finalize"]>,
  b: ReturnType<RaceSimulationSession["finalize"]>,
) {
  expect(a.result).toEqual(b.result);
  expect(a.simTime).toBeCloseTo(b.simTime, 10);
  expect([...a.splitCrossings.entries()].map(([k, v]) => [k, v])).toEqual(
    [...b.splitCrossings.entries()].map(([k, v]) => [k, v]),
  );
}

describe("live/headless equivalence", () => {
  it("RAF-style per-frame stepping matches headless runToCompletion", () => {
    // Headless: the executor path used for NPC/background races.
    const headless = runRaceToCompletion(makeField(), 1600, createRng("eq-1"));

    // Live cadence: variable step counts per "frame" like a RAF accumulator.
    const live = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("eq-1"),
      trackSplits: true,
    });
    const frameSteps = [1, 3, 2, 5, 1, 4, 2, 6, 1, 3];
    let i = 0;
    while (!live.finished) {
      live.stepMany(frameSteps[i++ % frameSteps.length], false);
    }
    const liveOutcome = live.finalize();

    // Headless session equivalent of runRaceToCompletion.
    const head = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("eq-1"),
      trackSplits: true,
    });
    const headOutcome = head.runToCompletion();

    expect(liveOutcome.result).toEqual(headOutcome.result);
    expect(liveOutcome.simTime).toBeCloseTo(headOutcome.simTime, 10);
    // And both match the exported headless API.
    expect(headless.result.map((r) => r.horseId)).toEqual(liveOutcome.result.map((r) => r.horseId));
    for (let k = 0; k < liveOutcome.result.length; k++) {
      expect(liveOutcome.result[k].time).toBeCloseTo(headless.result[k].time, 10);
    }
  });

  it("stepMany(n) is state-identical to n step() calls", () => {
    const a = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("sm-a"),
      trackSplits: true,
    });
    const b = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("sm-a"),
      trackSplits: true,
    });
    while (!a.finished) a.step(false);
    while (!b.finished) b.stepMany(7, false);
    sameOutcome(a.finalize(), b.finalize());
  });

  it("first tick exposes simTime 0; each step advances by exactly dt", () => {
    const seen: number[] = [];
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("t0"),
      dt: 0.1,
      onTick: (_sorted, t) => seen.push(t),
    });
    session.step(false);
    session.step(false);
    expect(seen[0]).toBe(0);
    expect(session.simTime).toBeCloseTo(0.2, 10);
  });

  it("one sort/rank derivation per tick — the sorted buffer is reused", () => {
    const observed: Runner[][] = [];
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("sort-once"),
      onTick: (sorted) => observed.push(sorted),
    });
    session.step(false);
    session.step(false);
    session.step(false);
    // Same backing array every tick: single per-tick derivation, no
    // re-allocation of the sorted field per step.
    expect(observed).toHaveLength(3);
    expect(observed[0]).toBe(observed[1]);
    expect(observed[1]).toBe(observed[2]);
  });

  it("stable tie-break ordering is preserved across adapters", () => {
    // Dead-heat fixture: identical runners must rank deterministically.
    const identical = () =>
      Array.from(
        { length: 4 },
        (_, i) =>
          ({
            ...makeField(1)[0],
            horseId: `tie${i + 1}`,
            gate: i + 1,
            lane: i + 1,
            targetLane: i + 1,
            noise: 0,
          }) as Runner,
      );
    const live = new RaceSimulationSession(identical(), {
      distance: 1600,
      rng: createRng("tie"),
    });
    const outLive = live.runToCompletion();
    const headless = runRaceToCompletion(identical(), 1600, createRng("tie"));
    expect(outLive.result.map((r) => r.horseId)).toEqual(headless.result.map((r) => r.horseId));
  });
});
