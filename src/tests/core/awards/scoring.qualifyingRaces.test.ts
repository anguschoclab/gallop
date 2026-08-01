/**
 * Scoring qualifyingRaces semantics tests
 *
 * Verifies that qualifyingRaces in determineRegionalWinners
 * only includes graded races that contributed points to the
 * specific category in the correct region and year.
 */

import { describe, it, expect } from "vitest";
import { determineRegionalWinners } from "@/core/awards/scoring";
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

function mkHorseWithRaces(
  id: string,
  races: Array<{
    raceId: string;
    track: string;
    surface: string;
    day: number;
    grade?: string;
    position?: number;
    beyer?: number;
    distance?: number;
  }>,
  age: number = 3,
  gender: "colt" | "filly" | "mare" | "horse" = "colt",
): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    age,
    gender,
    raceHistory: races.map((r) => ({
      raceId: r.raceId,
      raceName: `Race ${r.raceId}`,
      position: r.position ?? 1,
      day: r.day,
      beyer: r.beyer ?? 115,
      grade: (r.grade ?? "G1") as any,
      distance: r.distance ?? 2000,
      surface: r.surface as any,
      purse: 1000000,
      fieldSize: 8,
    })),
  });
}

describe("determineRegionalWinners qualifyingRaces semantics", () => {
  it("qualifyingRaces only includes graded races in the award year", () => {
    const race1 = mkRace("r1", "Churchill Downs", "Dirt", 100); // Year 1
    const race2 = mkRace("r2", "Churchill Downs", "Dirt", 400); // Year 2
    const races = [race1, race2];
    const raceMap = new Map(races.map((r) => [r.id, r]));
    const horse = mkHorseWithRaces("h1", [
      { raceId: "r1", track: "Churchill Downs", surface: "Dirt", day: 100 },
      { raceId: "r2", track: "Churchill Downs", surface: "Dirt", day: 400 },
    ]);

    const winners = determineRegionalWinners([horse], 1, "north_america", raceMap);
    const hoty = winners.find((w) => w.category === "horse_of_the_year");
    expect(hoty).toBeDefined();
    // Should only include race from year 1 (day 100)
    expect(hoty!.qualifyingRaces).toContain("r1");
    expect(hoty!.qualifyingRaces).not.toContain("r2");
  });

  it("qualifyingRaces only includes races in the correct region", () => {
    const naRace = mkRace("r1", "Churchill Downs", "Dirt", 100);
    const euroRace = mkRace("r2", "Ascot", "Turf", 100);
    const races = [naRace, euroRace];
    const raceMap = new Map(races.map((r) => [r.id, r]));
    const horse = mkHorseWithRaces("h1", [
      { raceId: "r1", track: "Churchill Downs", surface: "Dirt", day: 100 },
      { raceId: "r2", track: "Ascot", surface: "Turf", day: 100 },
    ]);

    const winners = determineRegionalWinners([horse], 1, "north_america", raceMap);
    const hoty = winners.find((w) => w.category === "horse_of_the_year");
    expect(hoty).toBeDefined();
    // Should only include North American race
    expect(hoty!.qualifyingRaces).toContain("r1");
    expect(hoty!.qualifyingRaces).not.toContain("r2");
  });

  it("qualifyingRaces only includes races that scored points for the category", () => {
    // Horse wins a G1 dirt race (scores points for HOTY and champion_older_dirt_male)
    // But also runs a race with position 5 (no points)
    const winningRace = mkRace("r1", "Churchill Downs", "Dirt", 100);
    const losingRace = mkRace("r2", "Churchill Downs", "Dirt", 100);
    const races = [winningRace, losingRace];
    const raceMap = new Map(races.map((r) => [r.id, r]));
    const horse = mkHorseWithRaces("h1", [
      {
        raceId: "r1",
        track: "Churchill Downs",
        surface: "Dirt",
        day: 100,
        position: 1,
        beyer: 115,
      },
      { raceId: "r2", track: "Churchill Downs", surface: "Dirt", day: 100, position: 5, beyer: 90 },
    ]);

    const winners = determineRegionalWinners([horse], 1, "north_america", raceMap);
    const hoty = winners.find((w) => w.category === "horse_of_the_year");
    expect(hoty).toBeDefined();
    // Only the winning race should be in qualifyingRaces
    expect(hoty!.qualifyingRaces).toContain("r1");
    expect(hoty!.qualifyingRaces).not.toContain("r2");
  });

  it("qualifyingRaces for horse with races in multiple regions only has region-matching races", () => {
    const naRace = mkRace("r1", "Churchill Downs", "Dirt", 100);
    const euroRace = mkRace("r2", "Ascot", "Turf", 100);
    const races = [naRace, euroRace];
    const raceMap = new Map(races.map((r) => [r.id, r]));
    const horse = mkHorseWithRaces("h1", [
      {
        raceId: "r1",
        track: "Churchill Downs",
        surface: "Dirt",
        day: 100,
        position: 1,
        beyer: 115,
      },
      { raceId: "r2", track: "Ascot", surface: "Turf", day: 100, position: 1, beyer: 115 },
    ]);

    const naWinners = determineRegionalWinners([horse], 1, "north_america", raceMap);
    const naHoty = naWinners.find((w) => w.category === "horse_of_the_year");
    expect(naHoty).toBeDefined();
    expect(naHoty!.qualifyingRaces).toContain("r1");
    expect(naHoty!.qualifyingRaces).not.toContain("r2");

    const euroWinners = determineRegionalWinners([horse], 1, "europe", raceMap);
    const euroHoty = euroWinners.find((w) => w.category === "horse_of_the_year");
    expect(euroHoty).toBeDefined();
    expect(euroHoty!.qualifyingRaces).toContain("r2");
    expect(euroHoty!.qualifyingRaces).not.toContain("r1");
  });
});
