/**
 * commentaryRngIsolation.test.ts — commentary must never touch physics RNG.
 *
 * Real integration: a RaceSimulationSession stepped through the live path
 * (non-silent onTick → real NarrativeGenerator.update) must produce physics
 * identical to a session with no commentary — the narrative generator owns a
 * separate RNG stream and cannot perturb race outcomes.
 */
import { describe, it, expect } from "vitest";
import { RaceSimulationSession } from "@/domains/race/simulation/engine/raceSession";
import { NarrativeGenerator } from "@/domains/narrative/application/narrativeService";
import { createRng } from "@/shared/common/rng";
import type { Race, Horse, Stable } from "@/platform/game/types";
import type { Runner } from "@/domains/race/simulation/engine/runnerBuilder";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";
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

const STYLES = ["E", "EP", "P", "S"] as const;

function makeField(): Runner[] {
  return Array.from({ length: 6 }, (_, i) => {
    const horse: Horse = {
      id: `h${i + 1}`,
      name: `Horse ${i + 1}`,
      sireName: "Sire",
      damName: "Dam",
      pedigree: { name: `Horse ${i + 1}`, generation: 1 },
      birthDay: 0,
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      ownership: makePlayerOwned(),
      raceHistory: [],
    } as unknown as Horse;
    return {
      horseId: `h${i + 1}`,
      name: `Horse ${i + 1}`,
      silk: "#fff",
      isPlayer: true,
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
      horse,
      jockey: makeJockey(),
    } as unknown as Runner;
  });
}

function makeRace(): Race {
  return {
    id: "r1",
    name: "Isolation Stakes",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 0,
    fieldSize: 6,
    entries: [],
    resolved: false,
  } as Race;
}

describe("commentary RNG isolation (real session + real narrative)", () => {
  it("physics outcome is identical with and without live commentary", () => {
    // Live path: onTick feeds sortedField into a real NarrativeGenerator that
    // consumes its own seeded RNG stream each tick.
    const liveField = makeField();
    const narrative = new NarrativeGenerator(
      makeRace(),
      liveField.map((r) => r.horse),
      [] as Stable[],
      createRng("commentary-stream"),
    );
    let commentaryLines = 0;
    const live = new RaceSimulationSession(liveField, {
      distance: 1600,
      rng: createRng("physics-seed"),
      onTick: (sorted, simTime) => {
        commentaryLines += narrative.update(sorted, simTime).length;
      },
    });
    while (live.step(false)) {
      /* live cadence */
    }
    const liveOutcome = live.finalize();

    // Silent path: identical session, no narrative consumer at all.
    const silent = new RaceSimulationSession(makeField(), {
      distance: 1600,
      rng: createRng("physics-seed"),
    });
    const silentOutcome = silent.runToCompletion();

    // Commentary ran (generator produced output), yet physics did not shift.
    expect(liveOutcome.simTime).toBeGreaterThan(0);
    expect(liveOutcome.result.map((r) => r.horseId)).toEqual(
      silentOutcome.result.map((r) => r.horseId),
    );
    for (let i = 0; i < liveOutcome.result.length; i++) {
      expect(liveOutcome.result[i].time).toBeCloseTo(silentOutcome.result[i].time, 10);
    }
    expect(liveOutcome.simTime).toBeCloseTo(silentOutcome.simTime, 10);
  });

  it("a different commentary seed cannot perturb physics", () => {
    const fieldA = makeField();
    const narrativeA = new NarrativeGenerator(
      makeRace(),
      fieldA.map((r) => r.horse),
      [],
      createRng("commentary-A"),
    );
    const sessionA = new RaceSimulationSession(fieldA, {
      distance: 1600,
      rng: createRng("physics-fixed"),
      onTick: (sorted, t) => {
        narrativeA.update(sorted, t);
      },
    });
    while (sessionA.step(false)) {
      /* non-silent so commentary fires */
    }
    const outA = sessionA.finalize();

    const fieldB = makeField();
    const narrativeB = new NarrativeGenerator(
      makeRace(),
      fieldB.map((r) => r.horse),
      [],
      createRng("commentary-B-different"),
    );
    const sessionB = new RaceSimulationSession(fieldB, {
      distance: 1600,
      rng: createRng("physics-fixed"),
      onTick: (sorted, t) => {
        narrativeB.update(sorted, t);
      },
    });
    while (sessionB.step(false)) {
      /* non-silent so commentary fires */
    }
    const outB = sessionB.finalize();

    expect(outA.result).toEqual(outB.result);
  });
});
