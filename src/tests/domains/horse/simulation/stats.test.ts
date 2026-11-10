import { describe, it, expect } from "vitest";
import {
  getCareerStats,
  calculateOverallRating,
  getAbility,
  abilityGrade,
} from "@/domains/horse/simulation/stats";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { HorseRaceHistoryEntry } from "@/domains/horse/simulation/types";

describe("Horse stats simulation", () => {
  it("should calculate career stats correctly from race history", () => {
    const horse = createTestHorse({
      raceHistory: [
        {
          raceId: "race1",
          raceName: "Race 1",
          position: 1,
          day: 1,
          distance: 1200,
          surface: "Turf",
          purseEarned: 10000,
          grade: "G1",
        } as HorseRaceHistoryEntry,
        {
          raceId: "race2",
          raceName: "Race 2",
          position: 2,
          day: 2,
          distance: 1600,
          surface: "Dirt",
          purseEarned: 5000,
        } as HorseRaceHistoryEntry,
        {
          raceId: "race5",
          raceName: "Race 5",
          position: 1,
          day: 5,
          beyer: 110,
          distance: 3200,
          surface: "Dirt",
          purseEarned: 50000,
          raceClass: "Stakes",
        } as HorseRaceHistoryEntry,
      ],
    });

    const stats = getCareerStats(horse);
    expect(stats.starts).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.stakesWins).toBe(2);
    expect(stats.g1Wins).toBe(1);
    expect(stats.earnings).toBe(65000);
    expect(stats.bestBeyer).toBe(110);
    expect(stats.turfWins).toBe(1);
    expect(stats.dirtWins).toBe(1);
    expect(stats.sprintWins).toBe(1);
    expect(stats.stayerWins).toBe(1);
  });

  it("should calculate ratings and ability", () => {
    const horse = createTestHorse({
      potential: 75,
      stats: { speed: 80, stamina: 70, acceleration: 60, consistency: 50, temperament: 50, conformation: 50 },
    });

    expect(calculateOverallRating(horse)).toBe(65);
    const ability = getAbility(horse);
    expect(ability.current).toBe(65);
    expect(ability.potential).toBe(75);

    expect(abilityGrade(100)).toBe("S");
    expect(abilityGrade(85)).toBe("A");
    expect(abilityGrade(65)).toBe("C");
    expect(abilityGrade(45)).toBe("F");
  });
});
