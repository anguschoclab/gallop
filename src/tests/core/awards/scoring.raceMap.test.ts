/**
 * Tests for awards scoring raceMap optimization.
 *
 * Validates that the required raceMap parameter produces correct results
 * for award point calculations.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAwardPoints,
  determineRegionalWinners,
  determineAllRegionalWinners,
} from "@/core/awards/scoring";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkRace(
  id: string,
  track: string,
  surface: string,
  day: number = 100,
  grade: string = "G1",
): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance: 2000,
    raceClass: "Graded",
    entryFee: 500,
    purse: 1000000,
    minStat: 80,
    fieldSize: 8,
    entries: [],
    resolved: true,
    graded: {
      key: `key-${id}`,
      grade: grade as any,
      track,
      trackId: `track-${id}`,
      surface: surface as any,
    },
  } as Race;
}

function mkHorseWithRace(
  id: string,
  raceId: string,
  track: string,
  surface: string,
  day: number = 100,
  grade: string = "G1",
  beyer: number = 115,
  age: number = 3,
  gender: "colt" | "filly" | "mare" | "horse" = "colt",
): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    age,
    gender,
    raceHistory: [
      {
        raceId,
        raceName: `Race ${raceId}`,
        position: 1,
        day,
        beyer,
        grade: grade as any,
        distance: 2000,
        surface: surface as any,
        purse: 1000000,
        fieldSize: 8,
      },
    ],
  });
}

describe("calculateAwardPoints with raceMap", () => {
  const race = mkRace("race-1", "Churchill Downs", "Dirt");
  const races: Race[] = [race];
  const raceMap = new Map(races.map((r) => [r.id, r]));
  const horse = mkHorseWithRace("h1", "race-1", "Churchill Downs", "Dirt");

  it("returns correct points with raceMap", () => {
    const points = calculateAwardPoints(horse, 1, "north_america", "horse_of_the_year", raceMap);
    // G1_WIN(10) + BEYER_110_PLUS(6) = 16
    expect(points).toBe(16);
  });

  it("with empty raceMap returns 0", () => {
    const emptyMap = new Map<string, Race>();
    const points = calculateAwardPoints(horse, 1, "north_america", "horse_of_the_year", emptyMap);
    expect(points).toBe(0);
  });

  it("handles race not in map (returns 0 since no fallback)", () => {
    const incompleteMap = new Map<string, Race>();
    const points = calculateAwardPoints(
      horse,
      1,
      "north_america",
      "horse_of_the_year",
      incompleteMap,
    );
    expect(points).toBe(0);
  });

  it("correctly filters by region when using raceMap", () => {
    const euroRace = mkRace("race-eu", "Ascot", "Turf");
    const euroMap = new Map([[euroRace.id, euroRace]]);
    const euroHorse = mkHorseWithRace("h-eu", "race-eu", "Ascot", "Turf");

    // European race should not score for north_america
    const points = calculateAwardPoints(
      euroHorse,
      1,
      "north_america",
      "horse_of_the_year",
      euroMap,
    );
    expect(points).toBe(0);
  });
});

describe("determineRegionalWinners with raceMap", () => {
  const race = mkRace("race-1", "Churchill Downs", "Dirt");
  const races: Race[] = [race];
  const raceMap = new Map(races.map((r) => [r.id, r]));
  const horse = mkHorseWithRace("h1", "race-1", "Churchill Downs", "Dirt");

  it("returns correct winners with raceMap", () => {
    const winners = determineRegionalWinners([horse], 1, "north_america", raceMap);
    expect(winners.length).toBeGreaterThan(0);
    expect(winners.some((w) => w.horseId === "h1")).toBe(true);
  });
});

describe("determineAllRegionalWinners with raceMap", () => {
  it("returns correct results", () => {
    const race = mkRace("race-1", "Churchill Downs", "Dirt");
    const races: Race[] = [race];
    const horse = mkHorseWithRace("h1", "race-1", "Churchill Downs", "Dirt");

    // determineAllRegionalWinners creates its own raceMap internally,
    // so results should be consistent
    const winners = determineAllRegionalWinners([horse], races, 1);
    expect(winners).toBeDefined();
    expect(Array.isArray(winners)).toBe(true);
  });
});
