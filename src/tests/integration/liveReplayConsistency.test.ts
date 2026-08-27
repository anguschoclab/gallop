import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import {
  buildRaceField,
  rngForRace,
  type RaceSimulationDependencies,
} from "@/services/race/raceSimulationService";
import { createTestHorse, createTestJockey } from "@/tests/helpers";
import { DEFAULT_DT, defaultMaxTime } from "@/constants/raceEngineConstants";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
import type { Race } from "@/core/race/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "consistency-test-race",
    name: "Consistency Test",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    purse: 50000,
    trackId: "test-track",
    trackCondition: "Fast",
    surface: "Dirt",
    entries: [
      { horseId: "h1", ownership: makePlayerOwned() },
      { horseId: "h2", ownership: makeUnowned() },
    ],
    resolved: false,
    cancelled: false,
    ...overrides,
  } as unknown as Race;
}

describe("live vs replay consistency", () => {
  it("runRaceToCompletion produces deterministic results with same seed", () => {
    const race = makeRace();
    const horses = [
      createTestHorse({ id: "h1", name: "Horse 1" }),
      createTestHorse({ id: "h2", name: "Horse 2" }),
    ];
    const jockeys = [createTestJockey({ id: "j1" })];

    const deps: RaceSimulationDependencies = { race, horses, jockeys };

    const { runners: runners1 } = buildRaceField(deps);
    const { runners: runners2 } = buildRaceField(deps);

    const rng1 = rngForRace(race);
    const rng2 = rngForRace(race);

    const { result: r1 } = runRaceToCompletion(
      runners1,
      race.distance,
      rng1,
      DEFAULT_DT,
      defaultMaxTime(race.distance),
      undefined,
      false,
    );
    const { result: r2 } = runRaceToCompletion(
      runners2,
      race.distance,
      rng2,
      DEFAULT_DT,
      defaultMaxTime(race.distance),
      undefined,
      false,
    );

    expect(r1.map((r) => r.horseId)).toEqual(r2.map((r) => r.horseId));
    expect(r1.map((r) => r.time)).toEqual(r2.map((r) => r.time));
  });

  it("results are sorted by compareFinishOrder", () => {
    const race = makeRace();
    const horses = [
      createTestHorse({ id: "h1", name: "Horse 1" }),
      createTestHorse({ id: "h2", name: "Horse 2" }),
    ];
    const jockeys = [createTestJockey({ id: "j1" })];

    const deps: RaceSimulationDependencies = { race, horses, jockeys };
    const { runners } = buildRaceField(deps);
    const rng = rngForRace(race);

    const { result } = runRaceToCompletion(
      runners,
      race.distance,
      rng,
      DEFAULT_DT,
      defaultMaxTime(race.distance),
      undefined,
      false,
    );

    // Verify the result is sorted by compareFinishOrder
    const sortable = result.map((r) => ({
      finishTime: r.time,
      gate: runners.find((rn) => rn.horseId === r.horseId)?.gate,
      horseId: r.horseId,
    }));
    const expected = [...sortable].sort(compareFinishOrder);
    expect(sortable.map((s) => s.horseId)).toEqual(expected.map((s) => s.horseId));
  });

  it("same race with different dt produces different results (demonstrates the bug)", () => {
    const race = makeRace();
    const horses = [
      createTestHorse({ id: "h1", name: "Horse 1" }),
      createTestHorse({ id: "h2", name: "Horse 2" }),
    ];
    const jockeys = [createTestJockey({ id: "j1" })];

    const deps: RaceSimulationDependencies = { race, horses, jockeys };
    const { runners: runners1 } = buildRaceField(deps);
    const { runners: runners2 } = buildRaceField(deps);

    const rng1 = rngForRace(race);
    const rng2 = rngForRace(race);

    const { result: r1 } = runRaceToCompletion(
      runners1,
      race.distance,
      rng1,
      0.1,
      defaultMaxTime(race.distance),
      undefined,
      false,
    );
    const { result: r2 } = runRaceToCompletion(
      runners2,
      race.distance,
      rng2,
      0.05,
      defaultMaxTime(race.distance),
      undefined,
      false,
    );

    // With different dt, results should differ (demonstrating the bug)
    const times1 = r1.map((r) => r.time);
    const times2 = r2.map((r) => r.time);
    expect(times1).not.toEqual(times2);
  });
});
