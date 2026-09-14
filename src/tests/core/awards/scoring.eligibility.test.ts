import { describe, it, expect } from "vitest";
import { calculateAwardPoints } from "@/core/awards/scoring";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkRace(
  id: string,
  track: string,
  surface: "Dirt" | "Turf" | "Synthetic",
  distance: number,
  day: number = 100,
  grade: string = "G1",
): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance,
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
      surface,
    },
  } as Race;
}

function mkHorse(
  id: string,
  age: number,
  gender: "colt" | "filly" | "mare" | "horse",
  raceParams: { id: string; surface: "Dirt" | "Turf" | "Synthetic"; distance: number },
): { horse: Horse; raceMap: Map<string, Race> } {
  const race = mkRace(raceParams.id, "Churchill Downs", raceParams.surface, raceParams.distance);
  const raceMap = new Map([[race.id, race]]);

  const horse = createTestHorse({
    id,
    name: `Horse ${id}`,
    age,
    gender,
    raceHistory: [
      {
        raceId: race.id,
        raceName: `Race ${race.id}`,
        position: 1,
        day: 100,
        beyer: 115,
        grade: "G1",
        distance: raceParams.distance,
        surface: raceParams.surface,
        purse: 1000000,
        fieldSize: 8,
      },
    ],
  });

  return { horse, raceMap };
}

describe("calculateAwardPoints - Eligibility Rules", () => {
  it("horse_of_the_year applies to any age, gender, surface, and distance", () => {
    const { horse, raceMap } = mkHorse("h1", 2, "filly", {
      id: "r1",
      surface: "Turf",
      distance: 1000,
    });
    const points = calculateAwardPoints(horse, 1, "north_america", "horse_of_the_year", raceMap);
    expect(points).toBeGreaterThan(0);
  });

  it("age and gender restrictions work for 2yo colt", () => {
    const { horse, raceMap } = mkHorse("h1", 2, "colt", {
      id: "r1",
      surface: "Dirt",
      distance: 1600,
    });
    expect(
      calculateAwardPoints(horse, 1, "north_america", "champion_2yo_male", raceMap),
    ).toBeGreaterThan(0);
    expect(calculateAwardPoints(horse, 1, "north_america", "champion_2yo_female", raceMap)).toBe(0);
    expect(calculateAwardPoints(horse, 1, "north_america", "champion_3yo_male", raceMap)).toBe(0);
  });

  it("surface restrictions work for dirt vs turf", () => {
    const { horse: dirtHorse, raceMap: dirtMap } = mkHorse("h1", 4, "horse", {
      id: "r1",
      surface: "Dirt",
      distance: 2000,
    });
    const { horse: turfHorse, raceMap: turfMap } = mkHorse("h2", 4, "horse", {
      id: "r2",
      surface: "Turf",
      distance: 2000,
    });

    expect(
      calculateAwardPoints(dirtHorse, 1, "north_america", "champion_older_dirt_male", dirtMap),
    ).toBeGreaterThan(0);
    expect(calculateAwardPoints(dirtHorse, 1, "north_america", "champion_turf_male", dirtMap)).toBe(
      0,
    );

    expect(
      calculateAwardPoints(turfHorse, 1, "north_america", "champion_turf_male", turfMap),
    ).toBeGreaterThan(0);
    expect(
      calculateAwardPoints(turfHorse, 1, "north_america", "champion_older_dirt_male", turfMap),
    ).toBe(0);
  });

  it("distance restrictions work for sprint, middle, and stayer", () => {
    const { horse: sprinter, raceMap: sprintMap } = mkHorse("h1", 3, "colt", {
      id: "r1",
      surface: "Dirt",
      distance: 1200,
    });
    const { horse: middle, raceMap: middleMap } = mkHorse("h2", 3, "colt", {
      id: "r2",
      surface: "Dirt",
      distance: 1800,
    });
    const { horse: stayer, raceMap: stayerMap } = mkHorse("h3", 3, "colt", {
      id: "r3",
      surface: "Dirt",
      distance: 2400,
    });

    // Sprinter (<= 1400)
    expect(
      calculateAwardPoints(sprinter, 1, "north_america", "champion_sprint_male", sprintMap),
    ).toBeGreaterThan(0);
    expect(
      calculateAwardPoints(sprinter, 1, "north_america", "champion_middle_distance", sprintMap),
    ).toBe(0);

    // Middle (1400-2000)
    expect(
      calculateAwardPoints(middle, 1, "north_america", "champion_middle_distance", middleMap),
    ).toBeGreaterThan(0);
    expect(
      calculateAwardPoints(middle, 1, "north_america", "champion_sprint_male", middleMap),
    ).toBe(0);

    // Stayer (>= 2400)
    expect(
      calculateAwardPoints(stayer, 1, "north_america", "champion_stayer", stayerMap),
    ).toBeGreaterThan(0);
    expect(
      calculateAwardPoints(stayer, 1, "north_america", "champion_middle_distance", stayerMap),
    ).toBe(0);
  });

  it("never awards points for special non-horse categories", () => {
    const { horse, raceMap } = mkHorse("h1", 3, "colt", {
      id: "r1",
      surface: "Dirt",
      distance: 2000,
    });

    expect(calculateAwardPoints(horse, 1, "north_america", "award_of_merit", raceMap)).toBe(0);
    expect(calculateAwardPoints(horse, 1, "north_america", "champion_trainer", raceMap)).toBe(0);
    expect(calculateAwardPoints(horse, 1, "north_america", "champion_international", raceMap)).toBe(
      0,
    );
  });
});
