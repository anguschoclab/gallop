import { describe, it, expect } from "vitest";
import {
  calculateOverallRating,
  calculateRaceRating,
  getCareerStats,
  getAbility,
  abilityGrade,
  rollRunningStyle,
} from "@/core/horse/stats";
import { resolvePhenotype } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";
import { createTestHorse, createTestRng } from "@/tests/helpers";

function mkHorse(
  speed: number,
  stamina: number,
  acceleration: number,
  consistency: number,
  potential = 80,
): Horse {
  return createTestHorse({
    id: "h",
    name: "Test",
    age: 4,
    stats: { speed, stamina, acceleration, consistency, temperament: 50, conformation: 50 },
    energy: 100,
    form: 0,
    potential,
    raceHistory: [],
    ownership: { type: "unowned" },
    fame: 0,
  });
}

describe("calculateOverallRating", () => {
  it("all-60 → 60", () => expect(calculateOverallRating(mkHorse(60, 60, 60, 60))).toBe(60));
  it("60+70+80+90 → 75", () => expect(calculateOverallRating(mkHorse(60, 70, 80, 90))).toBe(75));
  it("rounds correctly — 61+62+63+64 = 250/4 = 62.5 → 63", () =>
    expect(calculateOverallRating(mkHorse(61, 62, 63, 64))).toBe(63));
  it("all-100 → 100", () => expect(calculateOverallRating(mkHorse(100, 100, 100, 100))).toBe(100));
  it("all-1 → 1", () => expect(calculateOverallRating(mkHorse(1, 1, 1, 1))).toBe(1));
});

describe("getAbility", () => {
  it("returns current = overall rating and potential = horse.potential", () => {
    const h = mkHorse(80, 80, 80, 80, 90);
    const { current, potential } = getAbility(h);
    expect(current).toBe(calculateOverallRating(h));
    expect(potential).toBe(90);
  });

  it("current updates with stats", () => {
    const h = mkHorse(50, 50, 50, 50, 70);
    expect(getAbility(h).current).toBe(50);
  });

  it("never returns potential < current", () => {
    const h = mkHorse(80, 80, 80, 80, 50);
    const { current, potential } = getAbility(h);
    expect(current).toBe(80);
    expect(potential).toBe(80);
  });
});

describe("resolvePhenotype potential", () => {
  it("bumps potential when resolved stats exceed the rolled potential", () => {
    const h = createTestHorse({
      potential: 50,
      stats: {
        speed: 0,
        stamina: 0,
        acceleration: 0,
        consistency: 0,
        temperament: 50,
        conformation: 50,
      },
      phenotypeResolved: false,
    });
    const resolved = resolvePhenotype(h);
    const ovr = calculateOverallRating(resolved);
    expect(resolved.potential).toBeGreaterThanOrEqual(ovr);
  });

  it("keeps potential unchanged when it already exceeds current ability", () => {
    const h = createTestHorse({
      potential: 90,
      phenotypeResolved: false,
    });
    const resolved = resolvePhenotype(h);
    const ovr = calculateOverallRating(resolved);
    // Potential should remain at least 90 (it may be bumped if genotype resolves higher)
    expect(resolved.potential).toBeGreaterThanOrEqual(90);
    expect(resolved.potential).toBeGreaterThanOrEqual(ovr);
  });
});

describe("abilityGrade", () => {
  it("90 → S", () => expect(abilityGrade(90)).toBe("S"));
  it("89 → A", () => expect(abilityGrade(89)).toBe("A"));
  it("80 → A", () => expect(abilityGrade(80)).toBe("A"));
  it("79 → B", () => expect(abilityGrade(79)).toBe("B"));
  it("70 → B", () => expect(abilityGrade(70)).toBe("B"));
  it("69 → C", () => expect(abilityGrade(69)).toBe("C"));
  it("60 → C", () => expect(abilityGrade(60)).toBe("C"));
  it("59 → D", () => expect(abilityGrade(59)).toBe("D"));
  it("50 → D", () => expect(abilityGrade(50)).toBe("D"));
  it("49 → F", () => expect(abilityGrade(49)).toBe("F"));
  it("0 → F", () => expect(abilityGrade(0)).toBe("F"));
  it("100 → S", () => expect(abilityGrade(100)).toBe("S"));
});

describe("calculateRaceRating", () => {
  it("all-60 → 60", () => expect(calculateRaceRating(mkHorse(60, 60, 60, 90))).toBe(60));
  it("60+70+80 → 70", () => expect(calculateRaceRating(mkHorse(60, 70, 80, 20))).toBe(70));
  it("rounds correctly — 61+62+64 = 187/3 = 62.3 → 62", () =>
    expect(calculateRaceRating(mkHorse(61, 62, 64, 99))).toBe(62));
  it("ignores consistency — 100+100+100 with 10 consistency → 100", () =>
    expect(calculateRaceRating(mkHorse(100, 100, 100, 10))).toBe(100));
});

describe("getCareerStats", () => {
  it("handles empty history", () => {
    const h = mkHorse(50, 50, 50, 50);
    h.raceHistory = [];
    const stats = getCareerStats(h);
    expect(stats.starts).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.earnings).toBe(0);
  });

  it("calculates basic wins and earnings", () => {
    const h = mkHorse(50, 50, 50, 50);
    h.raceHistory = [
      { raceId: "1", day: 1, raceName: "Race 1", position: 1, purseEarned: 1000 },
      { raceId: "2", day: 2, raceName: "Race 2", position: 2, purseEarned: 500 },
      { raceId: "3", day: 3, raceName: "Race 3", position: 1, purseEarned: 2000 },
    ] as unknown as Horse["raceHistory"];
    const stats = getCareerStats(h);
    expect(stats.starts).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.places).toBe(1);
    expect(stats.earnings).toBe(3500);
  });

  it("calculates surface and distance stats", () => {
    const h = mkHorse(50, 50, 50, 50);
    h.raceHistory = [
      { raceId: "1", day: 1, raceName: "R1", position: 1, surface: "Turf", distance: 1200 }, // turf sprint win
      { raceId: "2", day: 2, raceName: "R2", position: 1, surface: "Dirt", distance: 1600 }, // dirt classic win
      { raceId: "3", day: 3, raceName: "R3", position: 2, surface: "Synthetic", distance: 2400 }, // synthetic stayer place
    ] as unknown as Horse["raceHistory"];
    const stats = getCareerStats(h);

    expect(stats.turfStarts).toBe(1);
    expect(stats.turfWins).toBe(1);
    expect(stats.dirtStarts).toBe(1);
    expect(stats.dirtWins).toBe(1);
    expect(stats.syntheticStarts).toBe(1);
    expect(stats.syntheticWins).toBe(0);

    expect(stats.sprintStarts).toBe(1);
    expect(stats.sprintWins).toBe(1);
    expect(stats.classicStarts).toBe(1);
    expect(stats.classicWins).toBe(1);
    expect(stats.stayerStarts).toBe(1);
    expect(stats.stayerWins).toBe(0);
  });

  it("counts graded and stakes wins", () => {
    const h = mkHorse(50, 50, 50, 50);
    h.raceHistory = [
      { raceId: "1", day: 1, raceName: "R1", position: 1, grade: "G1" },
      { raceId: "2", day: 2, raceName: "R2", position: 1, grade: "G2" },
      { raceId: "3", day: 3, raceName: "R3", position: 1, grade: "G3" },
      { raceId: "4", day: 4, raceName: "R4", position: 1, raceClass: "Listed" },
      { raceId: "5", day: 5, raceName: "R5", position: 2, grade: "G1" },
    ] as unknown as Horse["raceHistory"];
    const stats = getCareerStats(h);

    expect(stats.gradedStarts).toBe(4);
    expect(stats.gradedWins).toBe(3);
    expect(stats.g1Wins).toBe(1);
    expect(stats.g2Wins).toBe(1);
    expect(stats.g3Wins).toBe(1);
    expect(stats.stakesWins).toBe(4); // G1, G2, G3 + Listed
  });
});

describe("rollRunningStyle", () => {
  it("forces Early (E) when early bias > late bias by large margin", () => {
    const rng = createTestRng("early_bias_test");
    expect(rollRunningStyle({ speed: 100, stamina: 0, acceleration: 100 }, rng)).toBe("E");
  });

  it("forces Stalker (S) when late bias > early bias by large margin", () => {
    const rng = createTestRng("late_bias_test");
    expect(rollRunningStyle({ speed: 0, stamina: 100, acceleration: 0 }, rng)).toBe("S");
  });
});
