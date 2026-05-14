import { describe, it, expect } from "vitest";
import {
  buildRunner,
  getConditionsModifier,
  runRaceToCompletion,
  computePaceContext,
  stepRunner,
} from "@/game/raceSim";
import { createRng } from "@/game/rng";
import type { Horse } from "@/game/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "h1",
    name: overrides.name ?? "Test",
    age: 4,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#abcdef",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 },
    energy: 90,
    form: 0,
    potential: 90,
    raceHistory: [],
    owned: true,
    fame: 0,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    climbingAptitude: 1.0,
    corneringAptitude: 1.0,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    ...overrides,
  };
}

function mkField(): Horse[] {
  return [
    mkHorse({
      id: "a",
      name: "Alpha",
      stats: { speed: 80, stamina: 70, acceleration: 75, consistency: 70, temperament: 50, conformation: 50 },
    }),
    mkHorse({
      id: "b",
      name: "Bravo",
      stats: { speed: 65, stamina: 85, acceleration: 60, consistency: 80, temperament: 50, conformation: 50 },
    }),
    mkHorse({
      id: "c",
      name: "Charlie",
      stats: { speed: 75, stamina: 65, acceleration: 80, consistency: 60, temperament: 50, conformation: 50 },
    }),
    mkHorse({
      id: "d",
      name: "Delta",
      stats: { speed: 60, stamina: 80, acceleration: 65, consistency: 90, temperament: 50, conformation: 50 },
    }),
  ];
}

describe("raceSim determinism", () => {
  it("same seed and field produces identical finish order and times", () => {
    const horses = mkField();
    const conditions = getConditionsModifier({});
    const runA = horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions));
    const runB = horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions));
    const a = runRaceToCompletion(runA, 1600, createRng(42)).result;
    const b = runRaceToCompletion(runB, 1600, createRng(42)).result;
    expect(a.map((r) => r.horseId)).toEqual(b.map((r) => r.horseId));
    expect(a.map((r) => Math.round(r.time * 1000))).toEqual(
      b.map((r) => Math.round(r.time * 1000)),
    );
  });

  it("different seeds produce different (or possibly different) outcomes", () => {
    const horses = mkField();
    const conditions = getConditionsModifier({});
    const a = runRaceToCompletion(
      horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions)),
      1600,
      createRng(1),
    ).result;
    const b = runRaceToCompletion(
      horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions)),
      1600,
      createRng(99),
    ).result;
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
      horses.map((h) => buildRunner(h, true, 1600, "Turf", fair)),
      1600,
      createRng(42),
    ).result;
    const foulResult = runRaceToCompletion(
      horses.map((h) => buildRunner(h, true, 1600, "Turf", foul)),
      1600,
      createRng(42),
    ).result;
    const fairWinner = fairResult[0].time;
    const foulWinner = foulResult[0].time;
    expect(foulWinner).toBeGreaterThan(fairWinner);
  });
});

describe("raceSim caps", () => {
  it("buildRunner clamps topSpeed even for max stat / max form / max energy", () => {
    const max = mkHorse({
      stats: { speed: 100, stamina: 100, acceleration: 100, consistency: 100, temperament: 50, conformation: 50 },
      form: 10,
      energy: 100,
      potential: 100,
    });
    const r = buildRunner(max, true, 1600, "Turf", getConditionsModifier({}));
    // ceiling is 22 m/s; allow tiny floating-point slack.
    expect(r.topSpeed).toBeLessThanOrEqual(22 + 1e-9);
    expect(r.topSpeed).toBeGreaterThan(15);
    expect(Number.isFinite(r.topSpeed)).toBe(true);
  });
});

describe("computePaceContext", () => {
  it("leaderPos is the maximum runner position", () => {
    const conditions = getConditionsModifier({});
    const horses = mkField();
    const runners = horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions));
    runners[0].position = 200;
    runners[1].position = 150;
    runners[2].position = 180;
    runners[3].position = 100;
    const { leaderPos } = computePaceContext(runners, 1600);
    expect(leaderPos).toBe(200);
  });

  it("progress = 1 when all runners have finished", () => {
    const conditions = getConditionsModifier({});
    const horses = mkField();
    const runners = horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions));
    runners.forEach((r) => {
      r.finishTime = 95;
      r.position = 1600;
    });
    const { progress } = computePaceContext(runners, 1600);
    expect(progress).toBe(1);
  });

  it("progress in (0, 1) when some runners still running", () => {
    const conditions = getConditionsModifier({});
    const horses = mkField();
    const runners = horses.map((h) => buildRunner(h, true, 1600, "Turf", conditions));
    runners[0].position = 800; // halfway
    const { progress } = computePaceContext(runners, 1600);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it("single unfinished runner sets leaderPos and progress correctly", () => {
    const conditions = getConditionsModifier({});
    const runner = buildRunner(mkHorse(), true, 1600, "Turf", conditions);
    runner.position = 400;
    const { leaderPos, progress } = computePaceContext([runner], 1600);
    expect(leaderPos).toBe(400);
    expect(progress).toBeCloseTo(400 / 1600, 5);
  });
});

describe("stepRunner", () => {
  it("horse at finish line (position >= distance) sets finishTime", () => {
    const conditions = getConditionsModifier({});
    const runner = buildRunner(mkHorse(), true, 1600, "Turf", conditions);
    runner.position = 1595;
    runner.velocity = 15;
    const rng = createRng(1);
    stepRunner(runner, 1, 95, 1600, rng);
    expect(runner.finishTime).not.toBeNull();
  });

  it("stationary horse accelerates toward targetSpeed", () => {
    const conditions = getConditionsModifier({});
    const runner = buildRunner(mkHorse(), true, 1600, "Turf", conditions);
    runner.velocity = 0;
    runner.position = 0;
    const rng = createRng(5);
    stepRunner(runner, 0.1, 0, 1600, rng);
    expect(runner.velocity).toBeGreaterThan(0);
    expect(runner.position).toBeGreaterThan(0);
  });

  it("already finished runner is not modified by stepRunner", () => {
    const conditions = getConditionsModifier({});
    const runner = buildRunner(mkHorse(), true, conditions);
    runner.finishTime = 90;
    runner.position = 1600;
    runner.velocity = 15;
    const before = { ...runner };
    stepRunner(runner, 0.1, 90, 1600, createRng(1));
    expect(runner.position).toBe(before.position);
    expect(runner.finishTime).toBe(before.finishTime);
  });

  it("position increases monotonically across steps", () => {
    const conditions = getConditionsModifier({});
    const runner = buildRunner(mkHorse(), true, conditions);
    runner.velocity = 10;
    const rng = createRng(2);
    let last = runner.position;
    for (let i = 0; i < 10 && runner.finishTime === null; i++) {
      stepRunner(runner, 0.1, i * 0.1, 1600, rng);
      expect(runner.position).toBeGreaterThanOrEqual(last);
      last = runner.position;
    }
  });
});
