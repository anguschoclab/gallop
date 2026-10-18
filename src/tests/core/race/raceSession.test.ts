import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/domains/race/simulation/engine/simulation";
import { RaceSimulationSession } from "@/domains/race/simulation/engine/raceSession";
import { createRng } from "@/shared/common/rng";
import type { Runner } from "@/domains/race/simulation/engine/runnerBuilder";
import { createTestJockey } from "@/tests/helpers";
import { asJockeyId } from "@/shared/types/branded";

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

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    isPlayer: false,
    position: 0,
    velocity: 0,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0.1,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    jockey: makeJockey(),
    ...overrides,
  } as Runner;
}

function makeField(): Runner[] {
  const styles = ["E", "EP", "P", "S"] as const;
  return Array.from({ length: 8 }, (_, i) =>
    makeRunner({
      horseId: `h${i + 1}`,
      gate: i + 1,
      lane: i + 1,
      targetLane: i + 1,
      topSpeed: 15 + (i % 3) * 0.4,
      noise: 0.05 + i * 0.02,
      runningStyle: styles[i % styles.length],
    }),
  );
}

describe("RaceSimulationSession — shared race kernel", () => {
  it("step-driven session produces identical results to runRaceToCompletion for the same seed", () => {
    const headless = runRaceToCompletion(makeField(), 1600, createRng("seed-42"));

    const liveRunners = makeField();
    const session = new RaceSimulationSession(liveRunners, {
      distance: 1600,
      rng: createRng("seed-42"),
      snapshotEveryTicks: 10,
      trackSplits: true,
    });
    while (session.step(false)) {
      /* run until finished */
    }
    const live = session.finalize();

    expect(live.result.map((r) => r.horseId)).toEqual(headless.result.map((r) => r.horseId));
    for (let i = 0; i < live.result.length; i++) {
      expect(live.result[i].time).toBeCloseTo(headless.result[i].time, 10);
    }
  });

  it("two sessions with the same seed produce identical outcomes (determinism)", () => {
    const a = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("repeat"),
    }).runToCompletion();
    const b = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("repeat"),
    }).runToCompletion();
    expect(a.result).toEqual(b.result);
  });

  it("different seeds produce different outcomes (rng is actually threaded)", () => {
    const a = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("seed-a"),
    }).runToCompletion();
    const b = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("seed-b"),
    }).runToCompletion();
    // Extremely unlikely to be identical across full finishing order + times.
    expect(a.result).not.toEqual(b.result);
  });

  it("records split crossings at 25/50/75% for every finisher", () => {
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("splits"),
      trackSplits: true,
    });
    const outcome = session.runToCompletion();
    for (const r of outcome.result) {
      if (r.time === Infinity) continue;
      const crossings = outcome.splitCrossings.get(r.horseId);
      expect(crossings).toBeDefined();
      expect(crossings!.length).toBe(4);
      expect(crossings![0]).toBeLessThan(crossings![1]);
      expect(crossings![1]).toBeLessThan(crossings![2]);
      expect(crossings![2]).toBeLessThan(crossings![3]);
    }
  });

  it("records pace snapshots at 25/50/75% milestones when enabled", () => {
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("pace"),
      recordPaceSnapshots: true,
    });
    const outcome = session.runToCompletion();
    expect(outcome.paceSnapshots.length).toBe(3);
    expect(outcome.paceSnapshots.map((s) => s.progress)).toEqual([0.25, 0.5, 0.75]);
  });

  it("captures snapshots at the configured cadence", () => {
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("snap"),
      snapshotEveryTicks: 10,
    });
    const outcome = session.runToCompletion();
    const totalTicks = Math.round(outcome.simTime / 0.1);
    expect(outcome.snapshots.length).toBe(Math.floor(totalTicks / 10));
  });

  it("shouldContinue cancels the session and finalize still returns a result", () => {
    let ticks = 0;
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("cancel"),
      shouldContinue: () => ++ticks < 50,
    });
    const outcome = session.runToCompletion();
    expect(outcome.cancelled).toBe(true);
    expect(outcome.result.length).toBe(8);
    // Unfinished runners still ranked by position with Infinity time.
    expect(outcome.result.some((r) => r.time === Infinity)).toBe(true);
  });

  it("fastForwardTo advances silently and lands near the target time", () => {
    const session = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("ff"),
      onTick: () => {
        throw new Error("onTick must not fire during silent fast-forward");
      },
    });
    session.fastForwardTo(10);
    expect(session.simTime).toBeGreaterThanOrEqual(9.95);
    expect(session.finished).toBe(false);
  });

  it("stops at maxTime and ranks unfinished runners", () => {
    const session = new RaceSimulationSession(makeField(), {
      distance: 100000,
      rng: createRng("max"),
      maxTime: 5,
    });
    const outcome = session.runToCompletion();
    // Loop guards on simTime < maxTime before each step, so the final tick may
    // overshoot by up to dt.
    expect(outcome.simTime).toBeLessThanOrEqual(5 + 0.1);
    expect(outcome.result.length).toBe(8);
  });
});
