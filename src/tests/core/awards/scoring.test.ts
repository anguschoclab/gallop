import { describe, it, expect } from "vitest";
import { calculateAwardPoints, determineRegionalWinners, determineAllRegionalWinners } from "@/core/awards/scoring";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";

describe("awards/scoring", () => {
  const createMockHorse = (id: string, age: number, gender: string, raceHistory: any[], ownershipType: string = "player"): Horse => {
    return {
      id,
      name: `Horse ${id}`,
      age,
      gender,
      ownership: ownershipType === "player" ? { type: "player" } : ownershipType === "npc" ? { type: "npc", stableId: "s1" } : { type: "world" },
      raceHistory,
    } as Horse;
  };

  const createMockRace = (id: string, track: string): Race => {
    return {
      id,
      name: `Race ${id}`,
      graded: { track },
    } as Race;
  };

  it("calculates points correctly for a horse in a specific region and category", () => {
    const raceId = "race-1";
    // Belmont Park is in USA -> north_america
    const raceMap = new Map<string, Race>([
      [raceId, createMockRace(raceId, "Belmont Park")]
    ]);

    const horse = createMockHorse("h1", 3, "colt", [
      { day: 100, raceId, position: 1, grade: "G1", distance: 2000, surface: "dirt", beyer: 115 }
    ]);

    // weights for NA: G1_WIN (10) + BEYER_110_PLUS (6) = 16 points
    const points = calculateAwardPoints(horse, 1, "north_america", "champion_3yo_male", raceMap);
    expect(points).toBe(16);
  });

  it("filters out races outside the year", () => {
    const raceId = "race-1";
    const raceMap = new Map<string, Race>([
      [raceId, createMockRace(raceId, "Belmont Park")]
    ]);

    const horse = createMockHorse("h1", 3, "colt", [
      { day: 400, raceId, position: 1, grade: "G1", distance: 2000, surface: "dirt", beyer: 115 }
    ]);

    const points = calculateAwardPoints(horse, 1, "north_america", "champion_3yo_male", raceMap);
    expect(points).toBe(0);
  });

  it("does not award points to unowned world stock", () => {
    const raceId1 = "race-1";
    const raceMap = new Map<string, Race>([
      [raceId1, createMockRace(raceId1, "Belmont Park")]
    ]);

    const horseWorld = createMockHorse("h3", 3, "colt", [
      { day: 100, raceId: raceId1, position: 1, grade: "G1", distance: 2000, surface: "dirt", beyer: 115 }
    ], "world");

    const winners = determineRegionalWinners([horseWorld], 1, "north_america", raceMap);
    const champ = winners.find(w => w.category === "champion_3yo_male");
    expect(champ).toBeUndefined();
  });

  it("determines regional winners correctly", () => {
    const raceId1 = "race-1";
    const raceId2 = "race-2";
    const raceMap = new Map<string, Race>([
      [raceId1, createMockRace(raceId1, "Belmont Park")],
      [raceId2, createMockRace(raceId2, "Belmont Park")]
    ]);

    const horse1 = createMockHorse("h1", 3, "colt", [
      { day: 100, raceId: raceId1, position: 1, grade: "G1", distance: 2000, surface: "dirt", beyer: 115 }
    ]);

    const horse2 = createMockHorse("h2", 3, "colt", [
      { day: 150, raceId: raceId2, position: 1, grade: "G2", distance: 2000, surface: "dirt", beyer: 90 }
    ]);

    const winners = determineRegionalWinners([horse1, horse2], 1, "north_america", raceMap);
    const champ3yoMale = winners.find(w => w.category === "champion_3yo_male");
    expect(champ3yoMale).toBeDefined();
    expect(champ3yoMale?.horseId).toBe("h1");
    expect(champ3yoMale?.points).toBe(16);
    expect(champ3yoMale?.runnerUpId).toBe("h2");
    expect(champ3yoMale?.runnerUpPoints).toBe(6);
    expect(champ3yoMale?.margin).toBe(10);
  });

  it("determines all regional winners", () => {
    const raceNA = "race-na";
    const raceEU = "race-eu";

    const raceMap = new Map<string, Race>([
      [raceNA, createMockRace(raceNA, "Belmont Park")],
      [raceEU, createMockRace(raceEU, "Ascot")]
    ]);

    const horseNA = createMockHorse("h1", 3, "colt", [
      { day: 100, raceId: raceNA, position: 1, grade: "G1", distance: 2000, surface: "dirt", beyer: 115 }
    ]);

    const horseEU = createMockHorse("h2", 3, "colt", [
      { day: 100, raceId: raceEU, position: 1, grade: "G1", distance: 2000, surface: "turf", beyer: 115 }
    ]);

    const allWinners = determineAllRegionalWinners([horseNA, horseEU], Array.from(raceMap.values()), 1);

    const naWinner = allWinners.find(w => w.region === "north_america" && w.category === "champion_3yo_male");
    expect(naWinner?.horseId).toBe("h1");

    const euWinner = allWinners.find(w => w.region === "europe" && w.category === "champion_3yo_colt");
    expect(euWinner?.horseId).toBe("h2");
  });
});
