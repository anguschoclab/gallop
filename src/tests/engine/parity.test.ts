import { describe, it, expect } from "vitest";
import { simulateRace } from "@/services/race/raceSimulationExecutor";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { buildRaceField, rngForRace } from "@/services/race/raceSimulationService";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race, Horse } from "@/game/types";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "parity-test-race",
    name: "Parity Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 10000,
    fieldSize: 4,
    entries: [
      { horseId: "h1", ownership: { type: "player" } },
      { horseId: "h2", ownership: { type: "unowned" } },
      { horseId: "h3", ownership: { type: "unowned" } },
      { horseId: "h4", ownership: { type: "unowned" } },
    ],
    resolved: false,
    trackId: "test-track",
    surface: "Turf",
    weather: "sunny",
    trackCondition: "good",
    ...overrides,
  };
}

function makeHorse(id: string, speed: number, stamina: number): Horse {
  return createTestHorse({
    id,
    name: id,
    stats: {
      speed,
      stamina,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
  });
}

/**
 * Regression guard: simulateRace must produce finite finish times for
 * every runner. Before the maxTime fix, background races cut off at 30s
 * and every finishTime was Infinity (entry-order fallback).
 */
describe("simulateRace executor correctness", () => {
  it("all runners finish with finite times (1600m)", () => {
    const race = makeRace({ distance: 1600 });
    const horses = [
      makeHorse("h1", 80, 70),
      makeHorse("h2", 65, 85),
      makeHorse("h3", 75, 65),
      makeHorse("h4", 60, 80),
    ];
    const result = simulateRace(race, horses, []);

    for (const r of result.result) {
      expect(Number.isFinite(r.time)).toBe(true);
      expect(r.time).toBeGreaterThan(50); // realistic lower bound
      expect(r.time).toBeLessThan(180); // realistic upper bound
    }

    // Positions should be 1..N with no gaps or duplicates
    const positions = result.result.map((r) => r.position).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4]);
  });

  it("all runners finish with finite times (2400m)", () => {
    const race = makeRace({ distance: 2400 });
    const horses = [
      makeHorse("h1", 80, 80),
      makeHorse("h2", 70, 90),
      makeHorse("h3", 75, 75),
      makeHorse("h4", 65, 85),
    ];
    const result = simulateRace(race, horses, []);

    for (const r of result.result) {
      expect(Number.isFinite(r.time)).toBe(true);
      expect(r.time).toBeGreaterThan(80);
      expect(r.time).toBeLessThan(250);
    }
  });

  it("deterministic: same seed yields identical order and times", () => {
    const race = makeRace({ id: "seeded-race", distance: 1600 });
    const horses = [
      makeHorse("h1", 80, 70),
      makeHorse("h2", 65, 85),
      makeHorse("h3", 75, 65),
      makeHorse("h4", 60, 80),
    ];
    const runA = simulateRace(race, horses, []);
    const runB = simulateRace(race, horses, []);

    expect(runA.result.map((r) => r.horseId)).toEqual(runB.result.map((r) => r.horseId));
    expect(runA.result.map((r) => Math.round(r.time * 1000))).toEqual(
      runB.result.map((r) => Math.round(r.time * 1000)),
    );
  });
});

/**
 * Parity guard: simulateRace (executor path) and direct runRaceToCompletion
 * must agree on order and times when both use the same dt.
 */
describe("background vs watched parity", () => {
  it("simulateRace matches direct runRaceToCompletion", () => {
    const race = makeRace({ id: "parity-race", distance: 1600 });
    const horses = [
      makeHorse("h1", 80, 70),
      makeHorse("h2", 65, 85),
      makeHorse("h3", 75, 65),
      makeHorse("h4", 60, 80),
    ];

    // Executor path
    const execResult = simulateRace(race, horses, []);

    // Direct path: build field via the same helper so gate shuffling matches.
    const { runners } = buildRaceField({ race, horses, jockeys: [] });
    const rng = rngForRace(race);
    const directResult = runRaceToCompletion(runners, race.distance, rng, 0.1, 600);

    expect(execResult.result.length).toBe(directResult.result.length);
    for (let i = 0; i < execResult.result.length; i++) {
      expect(execResult.result[i].horseId).toBe(directResult.result[i].horseId);
      expect(Math.round(execResult.result[i].time * 1000)).toBe(
        Math.round(directResult.result[i].time * 1000),
      );
    }
  });
});
