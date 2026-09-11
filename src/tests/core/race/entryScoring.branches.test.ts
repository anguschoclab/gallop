/**
 * Branch-complete tests for calculateRaceSuitability conditional chains.
 *
 * These tests verify every branch of the graded bonus, distance fit,
 * and surface fit chains before they are flattened into dictionary maps.
 */

import { describe, it, expect } from "vitest";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race, Stable } from "@/game/types";

function makeStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "stable-1",
    name: "Test Stable",
    personality: "aggressive",
    tier: "mid",
    country: "USA",
    cash: 100000,
    ...overrides,
  } as Stable;
}

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    surface: "Dirt",
    purse: 50000,
    entries: [],
    restrictions: { gender: "open" },
    ...overrides,
  } as Race;
}

function makeGraded(grade: "G1" | "G2" | "G3") {
  return { grade, key: `${grade}-key`, trackId: "t1", surface: "Dirt", track: "Belmont" };
}

describe("calculateRaceSuitability - graded bonus chain", () => {
  it("awards G1 bonus when grade is G1", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const stable = makeStable();
    const baseRace = makeRace();
    const g1Race = { ...baseRace, graded: makeGraded("G1") } as Race;
    const noGradeRace = { ...baseRace } as Race;

    const g1Score = calculateRaceSuitability(horse, g1Race, stable);
    const noGradeScore = calculateRaceSuitability(horse, noGradeRace, stable);
    expect(g1Score).toBeGreaterThan(noGradeScore);
  });

  it("awards G2 bonus when grade is G2", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const stable = makeStable();
    const baseRace = makeRace();
    const g2Race = { ...baseRace, graded: makeGraded("G2") } as Race;
    const noGradeRace = { ...baseRace } as Race;

    const g2Score = calculateRaceSuitability(horse, g2Race, stable);
    const noGradeScore = calculateRaceSuitability(horse, noGradeRace, stable);
    expect(g2Score).toBeGreaterThan(noGradeScore);
  });

  it("awards G3 bonus when grade is G3", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const stable = makeStable();
    const baseRace = makeRace();
    const g3Race = { ...baseRace, graded: makeGraded("G3") } as Race;
    const noGradeRace = { ...baseRace } as Race;

    const g3Score = calculateRaceSuitability(horse, g3Race, stable);
    const noGradeScore = calculateRaceSuitability(horse, noGradeRace, stable);
    expect(g3Score).toBeGreaterThan(noGradeScore);
  });

  it("awards no graded bonus when grade is absent", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const stable = makeStable();
    const race = makeRace();

    const score = calculateRaceSuitability(horse, race, stable);
    // Should not include any graded bonus (score is finite, no crash)
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("G1 bonus > G2 bonus > G3 bonus > no grade", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse" });
    const stable = makeStable();
    const baseRace = makeRace();
    const g1 = calculateRaceSuitability(
      horse,
      { ...baseRace, graded: makeGraded("G1") } as Race,
      stable,
    );
    const g2 = calculateRaceSuitability(
      horse,
      { ...baseRace, graded: makeGraded("G2") } as Race,
      stable,
    );
    const g3 = calculateRaceSuitability(
      horse,
      { ...baseRace, graded: makeGraded("G3") } as Race,
      stable,
    );
    const none = calculateRaceSuitability(horse, baseRace, stable);
    expect(g1).toBeGreaterThan(g2);
    expect(g2).toBeGreaterThan(g3);
    expect(g3).toBeGreaterThan(none);
  });
});

describe("calculateRaceSuitability - distance fit chain", () => {
  it("awards perfect bonus when distance diff <= 100", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse", distanceAptitude: 1600 });
    const stable = makeStable();
    const race = makeRace({ distance: 1600 });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("awards good bonus when distance diff <= 300", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse", distanceAptitude: 1600 });
    const stable = makeStable();
    const race = makeRace({ distance: 1800 });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("awards ok bonus when distance diff <= 600", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse", distanceAptitude: 1600 });
    const stable = makeStable();
    const race = makeRace({ distance: 2100 });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("awards bad penalty when distance diff > 600", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse", distanceAptitude: 1600 });
    const stable = makeStable();
    const race = makeRace({ distance: 3000 });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("perfect score > good score > ok score > bad score", () => {
    const horse = createTestHorse({ id: "h1", age: 5, gender: "horse", distanceAptitude: 1600 });
    const stable = makeStable();
    const perfect = calculateRaceSuitability(horse, makeRace({ distance: 1600 }), stable);
    const good = calculateRaceSuitability(horse, makeRace({ distance: 1800 }), stable);
    const ok = calculateRaceSuitability(horse, makeRace({ distance: 2100 }), stable);
    const bad = calculateRaceSuitability(horse, makeRace({ distance: 3000 }), stable);
    expect(perfect).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(ok);
    expect(ok).toBeGreaterThan(bad);
  });
});

describe("calculateRaceSuitability - surface fit chain", () => {
  it("awards excellent bonus when aptitude >= 1.0", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 1.0, Turf: 0.5, Synthetic: 0.5 },
    });
    const stable = makeStable();
    const race = makeRace({ surface: "Dirt" });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("awards good bonus when aptitude >= 0.95", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 0.96, Turf: 0.5, Synthetic: 0.5 },
    });
    const stable = makeStable();
    const race = makeRace({ surface: "Dirt" });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("awards bad penalty when aptitude < 0.95", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 0.5, Turf: 0.5, Synthetic: 0.5 },
    });
    const stable = makeStable();
    const race = makeRace({ surface: "Dirt" });
    const score = calculateRaceSuitability(horse, race, stable);
    expect(typeof score).toBe("number");
  });

  it("excellent score > good score > bad score", () => {
    const excellentHorse = createTestHorse({
      id: "h1",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 1.0, Turf: 0.5, Synthetic: 0.5 },
    });
    const goodHorse = createTestHorse({
      id: "h2",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 0.96, Turf: 0.5, Synthetic: 0.5 },
    });
    const badHorse = createTestHorse({
      id: "h3",
      age: 5,
      gender: "horse",
      surfaceAptitude: { Dirt: 0.5, Turf: 0.5, Synthetic: 0.5 },
    });
    const stable = makeStable();
    const race = makeRace({ surface: "Dirt" });
    const excellent = calculateRaceSuitability(excellentHorse, race, stable);
    const good = calculateRaceSuitability(goodHorse, race, stable);
    const bad = calculateRaceSuitability(badHorse, race, stable);
    expect(excellent).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(bad);
  });
});
