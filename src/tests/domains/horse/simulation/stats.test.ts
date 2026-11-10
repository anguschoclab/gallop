import { describe, it, expect } from "vitest";
import {
  getCareerStats,
  calculateOverallRating,
  calculateRaceRating,
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
          beyer: 100,
          distance: 1200,
          surface: "Turf",
          purseEarned: 10000,
          grade: "G1",
          raceClass: "Graded",
        } as HorseRaceHistoryEntry,
        {
          raceId: "race2",
          raceName: "Race 2",
          position: 2,
          day: 2,
          beyer: 105,
          distance: 1600,
          surface: "Dirt",
          purseEarned: 5000,
        } as HorseRaceHistoryEntry,
        {
          raceId: "race3",
          raceName: "Race 3",
          position: 3,
          day: 3,
          beyer: 90,
          distance: 2400,
          surface: "Synthetic",
          purseEarned: 2000,
        } as HorseRaceHistoryEntry,
        {
          raceId: "race4",
          raceName: "Race 4",
          position: 4,
          day: 4,
          beyer: 80,
          distance: 1000,
          surface: "Turf",
          purseEarned: 0,
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
    expect(stats.starts).toBe(5);
    expect(stats.wins).toBe(2);
    expect(stats.places).toBe(1);
    expect(stats.shows).toBe(1);
    expect(stats.gradedWins).toBe(1);
    expect(stats.gradedStarts).toBe(1);
    expect(stats.stakesWins).toBe(2);
    expect(stats.g1Wins).toBe(1);
    expect(stats.g2Wins).toBe(0);
    expect(stats.g3Wins).toBe(0);
    expect(stats.earnings).toBe(67000);
    expect(stats.bestBeyer).toBe(110);

    expect(stats.turfStarts).toBe(2);
    expect(stats.turfWins).toBe(1);
    expect(stats.dirtStarts).toBe(2);
    expect(stats.dirtWins).toBe(1);
    expect(stats.syntheticStarts).toBe(1);
    expect(stats.syntheticWins).toBe(0);

    expect(stats.sprintStarts).toBe(2);
    expect(stats.sprintWins).toBe(1);
    expect(stats.classicStarts).toBe(1);
    expect(stats.classicWins).toBe(0);
    expect(stats.stayerStarts).toBe(2);
    expect(stats.stayerWins).toBe(1);
  });

  it("should calculate overall rating and race rating", () => {
    const horse = createTestHorse({
      stats: {
        speed: 80,
        stamina: 70,
        acceleration: 60,
        consistency: 50,
        temperament: 50,
        conformation: 50,
      },
    });

    expect(calculateOverallRating(horse)).toBe(65);
    expect(calculateRaceRating(horse)).toBe(70);
  });

  it("should calculate ability", () => {
    const horse = createTestHorse({
      potential: 75,
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    });

    const ability = getAbility(horse);
    expect(ability.current).toBe(60);
    expect(ability.potential).toBe(75);
  });

  it("should map score to letter grade", () => {
    expect(abilityGrade(100)).toBe("S");
    expect(abilityGrade(85)).toBe("A");
    expect(abilityGrade(75)).toBe("B");
    expect(abilityGrade(65)).toBe("C");
    expect(abilityGrade(55)).toBe("D");
    expect(abilityGrade(45)).toBe("F");
  });
});
