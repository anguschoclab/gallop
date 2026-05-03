import { describe, it, expect } from "vitest";
import { rngForRace, buildRaceField, simulateStep, getRaceClassBonus } from "./raceSimulationService";
import type { Horse, Race } from "@/game/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "h1",
    name: "Test Horse",
    age: 4,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#aabbcc",
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [],
    owned: true,
    fame: 0,
    ...overrides,
  };
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: overrides.distance ?? 1600,
    raceClass: overrides.raceClass ?? "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: overrides.fieldSize ?? 6,
    entries: overrides.entries ?? [],
    resolved: false,
    ...overrides,
  };
}

describe("rngForRace", () => {
  it("same race id → same rng sequence (deterministic)", () => {
    const rng1 = rngForRace({ id: "race-abc" });
    const rng2 = rngForRace({ id: "race-abc" });
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.next()).toBe(rng2.next());
  });

  it("different race ids → different sequences", () => {
    const rng1 = rngForRace({ id: "race-aaa" });
    const rng2 = rngForRace({ id: "race-bbb" });
    // It's extremely unlikely both produce the same value
    const v1 = rng1.next();
    const v2 = rng2.next();
    expect(v1).not.toBe(v2);
  });

  it("returns values in [0, 1)", () => {
    const rng = rngForRace({ id: "test" });
    for (let i = 0; i < 20; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("buildRaceField", () => {
  it("output length equals race.fieldSize", () => {
    const race = mkRace({ fieldSize: 8, entries: [] });
    const runners = buildRaceField({ race, horses: [] });
    expect(runners).toHaveLength(8);
  });

  it("entered owned horses appear with owned=true", () => {
    const horse = mkHorse({ id: "h1", owned: true });
    const race = mkRace({
      fieldSize: 6,
      entries: [{ horseId: "h1", owned: true }],
    });
    const runners = buildRaceField({ race, horses: [horse] });
    const ownedRunner = runners.find(r => r.horseId === "h1");
    expect(ownedRunner).toBeDefined();
    expect(ownedRunner!.owned).toBe(true);
  });

  it("unfilled slots get owned=false AI runners", () => {
    const race = mkRace({ fieldSize: 4, entries: [] });
    const runners = buildRaceField({ race, horses: [] });
    expect(runners.every(r => !r.owned)).toBe(true);
    expect(runners).toHaveLength(4);
  });

  it("empty-field guard: always returns at least 1 runner even when fieldSize=0", () => {
    const race = mkRace({ fieldSize: 0, entries: [] });
    const runners = buildRaceField({ race, horses: [] });
    expect(runners.length).toBeGreaterThanOrEqual(1);
  });

  it("builds runners for all race classes without throwing", () => {
    const classes = ["Maiden", "Allowance", "Stakes", "Group", "Graded"] as const;
    for (const raceClass of classes) {
      expect(() => buildRaceField({ race: mkRace({ raceClass, fieldSize: 3 }), horses: [] })).not.toThrow();
    }
  });
});

describe("simulateStep", () => {
  it("runners that finish get finishTime !== null", () => {
    const race = mkRace({ fieldSize: 2, distance: 1600 });
    const runners = buildRaceField({ race, horses: [] });
    const rng = rngForRace(race);
    // Push runners just before finish line, with enough velocity to cross in one step
    for (const r of runners) {
      r.position = 1598;
      r.velocity = 15;
    }
    // Use t=100 so the interpolated finishTime stays positive
    const { finishOrder } = simulateStep(runners, 1, 100, 1600, rng);
    expect(finishOrder.length).toBeGreaterThan(0);
    for (const res of finishOrder) {
      expect(res.time).toBeGreaterThan(0);
    }
  });

  it("stillRunning=false when all runners have finished", () => {
    const race = mkRace({ fieldSize: 2 });
    const runners = buildRaceField({ race, horses: [] });
    const rng = rngForRace(race);
    // Mark all as finished
    for (const r of runners) {
      r.finishTime = 95;
    }
    const { stillRunning } = simulateStep(runners, 0.1, 0, 1600, rng);
    expect(stillRunning).toBe(false);
  });

  it("runners not at finish line remain running", () => {
    const race = mkRace({ fieldSize: 3, distance: 1600 });
    const runners = buildRaceField({ race, horses: [] });
    const rng = rngForRace(race);
    // Do a single tiny step from the start
    const { stillRunning } = simulateStep(runners, 0.01, 0, 1600, rng);
    expect(stillRunning).toBe(true);
  });
});

describe("getRaceClassBonus", () => {
  it("G1 graded race → 8", () => {
    const race = mkRace({
      raceClass: "Graded",
      graded: { key: "k", grade: "G1", track: "T", trackId: "t1", surface: "Turf" },
    });
    expect(getRaceClassBonus(race)).toBe(8);
  });

  it("G2 graded race → 5", () => {
    const race = mkRace({
      raceClass: "Graded",
      graded: { key: "k", grade: "G2", track: "T", trackId: "t1", surface: "Turf" },
    });
    expect(getRaceClassBonus(race)).toBe(5);
  });

  it("Group (no grade) → 4", () => {
    const race = mkRace({ raceClass: "Group" });
    expect(getRaceClassBonus(race)).toBe(4);
  });

  it("Stakes (no grade) → 2", () => {
    const race = mkRace({ raceClass: "Stakes" });
    expect(getRaceClassBonus(race)).toBe(2);
  });

  it("Allowance (no grade) → 0", () => {
    const race = mkRace({ raceClass: "Allowance" });
    expect(getRaceClassBonus(race)).toBe(0);
  });
});
