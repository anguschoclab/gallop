import { describe, it, expect } from "vitest";
import { buildRunner, getConditionsModifier, runRaceToCompletion } from "./raceSim";
import { createRng } from "./rng";
import type { Horse } from "./types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "h1",
    name: overrides.name ?? "Test",
    age: 4,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#abcdef",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    energy: 90,
    form: 0,
    potential: 90,
    raceHistory: [],
    owned: true,
    ...overrides,
  };
}

function mkField(): Horse[] {
  return [
    mkHorse({ id: "a", name: "Alpha", stats: { speed: 80, stamina: 70, acceleration: 75, consistency: 70 } }),
    mkHorse({ id: "b", name: "Bravo", stats: { speed: 65, stamina: 85, acceleration: 60, consistency: 80 } }),
    mkHorse({ id: "c", name: "Charlie", stats: { speed: 75, stamina: 65, acceleration: 80, consistency: 60 } }),
    mkHorse({ id: "d", name: "Delta", stats: { speed: 60, stamina: 80, acceleration: 65, consistency: 90 } }),
  ];
}

describe("raceSim determinism", () => {
  it("same seed and field produces identical finish order and times", () => {
    const horses = mkField();
    const conditions = getConditionsModifier({});
    const runA = horses.map((h) => buildRunner(h, true, conditions));
    const runB = horses.map((h) => buildRunner(h, true, conditions));
    const a = runRaceToCompletion(runA, 1600, createRng(42));
    const b = runRaceToCompletion(runB, 1600, createRng(42));
    expect(a.map((r) => r.horseId)).toEqual(b.map((r) => r.horseId));
    expect(a.map((r) => Math.round(r.time * 1000))).toEqual(b.map((r) => Math.round(r.time * 1000)));
  });

  it("different seeds produce different (or possibly different) outcomes", () => {
    const horses = mkField();
    const conditions = getConditionsModifier({});
    const a = runRaceToCompletion(horses.map((h) => buildRunner(h, true, conditions)), 1600, createRng(1));
    const b = runRaceToCompletion(horses.map((h) => buildRunner(h, true, conditions)), 1600, createRng(99));
    // Times will almost certainly differ; if order is the same, that's fine.
    const sameTimes = a.every((r, i) => r.time === b[i].time);
    expect(sameTimes).toBe(false);
  });
});

describe("raceSim conditions", () => {
  it("storm + heavy track produces slower winning time than fair conditions", () => {
    const horses = mkField();
    const fair = getConditionsModifier({ weather: "sunny", trackCondition: "fast" });
    const foul = getConditionsModifier({ weather: "rainy", trackCondition: "heavy" });
    const fairResult = runRaceToCompletion(
      horses.map((h) => buildRunner(h, true, fair)),
      1600,
      createRng(42)
    );
    const foulResult = runRaceToCompletion(
      horses.map((h) => buildRunner(h, true, foul)),
      1600,
      createRng(42)
    );
    const fairWinner = fairResult[0].time;
    const foulWinner = foulResult[0].time;
    expect(foulWinner).toBeGreaterThan(fairWinner);
  });
});

describe("raceSim caps", () => {
  it("buildRunner clamps topSpeed even for max stat / max form / max energy", () => {
    const max = mkHorse({
      stats: { speed: 100, stamina: 100, acceleration: 100, consistency: 100 },
      form: 10,
      energy: 100,
      potential: 100,
    });
    const r = buildRunner(max, true, getConditionsModifier({}));
    // ceiling is 22 m/s; allow tiny floating-point slack.
    expect(r.topSpeed).toBeLessThanOrEqual(22 + 1e-9);
    expect(r.topSpeed).toBeGreaterThan(15);
    expect(Number.isFinite(r.topSpeed)).toBe(true);
  });
});
