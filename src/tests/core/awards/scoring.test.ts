import { describe, it, expect } from "vitest";
import {
  calculateAwardPoints,
  determineRegionalWinners,
  determineAllRegionalWinners,
} from "@/core/awards/scoring";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { NorthAmericanCategory, AsiaPacificCategory } from "@/core/awards/types";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";

describe("awards/scoring (PR #490)", () => {
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

const makeHorse = (
  id: string,
  name: string,
  type: "player" | "system",
  raceHistory: Partial<HorseRaceHistoryEntry>[],
) => ({ id, name, age: 3, gender: "colt", ownership: { type }, raceHistory }) as Horse;
const makeRaceMap = (tracks: [string, string][]) =>
  new Map(tracks.map(([id, track]) => [id, { id, graded: { track } } as any as Race]));

describe("awards/scoring (PR #475)", () => {
  describe("calculateAwardPoints", () => {
    it("calculates points correctly for graded wins and places", () => {
      const mockHorse = makeHorse("h1", "Test", "player", [
        {
          raceId: "r1",
          day: 150,
          position: 1,
          grade: "G1",
          distance: 1200,
          surface: "dirt",
          beyer: 105,
        },
        { raceId: "r2", day: 160, position: 1, grade: "G2", distance: 1200, surface: "dirt" },
        { raceId: "r3", day: 170, position: 1, grade: "G3", distance: 1200, surface: "dirt" },
        { raceId: "r4", day: 180, position: 1, grade: "Listed", distance: 1200, surface: "dirt" },
        { raceId: "r5", day: 190, position: 2, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const mockRaceMap = makeRaceMap(
        ["r1", "r2", "r3", "r4", "r5"].map((id) => [id, "Belmont Park"]),
      );
      const pts = calculateAwardPoints(
        mockHorse,
        1,
        "north_america",
        "champion_sprint_male" as NorthAmericanCategory,
        mockRaceMap,
      );
      expect(pts).toBe(27); // 10(G1) + 3(Beyer) + 6(G2) + 4(G3) + 2(Stakes) + 2(Place) = 27
    });

    it("filters out races outside the given year or region", () => {
      const mockHorse = makeHorse("h1", "Test", "player", [
        { raceId: "r_yr1", day: 365, position: 1, grade: "G1", distance: 1200, surface: "dirt" },
        { raceId: "r_yr2", day: 366, position: 1, grade: "G1", distance: 1200, surface: "dirt" },
        { raceId: "r_eu", day: 150, position: 1, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const mockRaceMap = makeRaceMap([
        ["r_yr1", "Belmont Park"],
        ["r_yr2", "Belmont Park"],
        ["r_eu", "Ascot"],
      ]);
      expect(
        calculateAwardPoints(
          mockHorse,
          1,
          "north_america",
          "champion_sprint_male" as NorthAmericanCategory,
          mockRaceMap,
        ),
      ).toBe(10);
      expect(
        calculateAwardPoints(
          mockHorse,
          2,
          "north_america",
          "champion_sprint_male" as NorthAmericanCategory,
          mockRaceMap,
        ),
      ).toBe(10);
    });

    it("evaluates category eligibility based on distance", () => {
      const mockHorse = makeHorse("h1", "Test", "player", [
        { raceId: "r_sprint", day: 150, position: 1, grade: "G1", distance: 1400, surface: "turf" },
        { raceId: "r_middle", day: 160, position: 1, grade: "G1", distance: 1600, surface: "turf" },
      ]);
      const mockRaceMap = makeRaceMap([
        ["r_sprint", "Flemington"],
        ["r_middle", "Flemington"],
      ]);
      const sprintPts = calculateAwardPoints(
        mockHorse,
        1,
        "asia_pacific",
        "champion_sprinter_apac" as AsiaPacificCategory,
        mockRaceMap,
      );
      const middlePts = calculateAwardPoints(
        mockHorse,
        1,
        "asia_pacific",
        "champion_middle_distance" as AsiaPacificCategory,
        mockRaceMap,
      );
      expect(sprintPts).toBe(15);
      expect(middlePts).toBe(30);
    });
  });

  describe("determineRegionalWinners", () => {
    it("determines correct winner per category based on points", () => {
      const horse1 = makeHorse("h1", "Sprint Champ", "player", [
        { raceId: "r1", day: 100, position: 1, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const horse2 = makeHorse("h2", "Runner Up", "player", [
        { raceId: "r2", day: 100, position: 2, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const mockRaceMap = makeRaceMap([
        ["r1", "Belmont Park"],
        ["r2", "Belmont Park"],
      ]);
      const winners = determineRegionalWinners([horse1, horse2], 1, "north_america", mockRaceMap);
      const sprintWinner = winners.find((w) => w.category === "champion_sprint_male");
      expect(sprintWinner?.horseId).toBe("h1");
      expect(sprintWinner?.points).toBe(10);
      expect(sprintWinner?.runnerUpId).toBe("h2");
      expect(sprintWinner?.margin).toBe(8);
    });

    it("determines correct winner and excludes unowned world stock", () => {
      const playerHorse = makeHorse("h_player", "Player", "player", [
        { raceId: "r1", day: 100, position: 2, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const unownedHorse = makeHorse("h_unowned", "System", "system", [
        { raceId: "r2", day: 100, position: 1, grade: "G1", distance: 1200, surface: "dirt" },
      ]);
      const mockRaceMap = makeRaceMap([
        ["r1", "Belmont Park"],
        ["r2", "Belmont Park"],
      ]);
      const winners = determineRegionalWinners(
        [playerHorse, unownedHorse],
        1,
        "north_america",
        mockRaceMap,
      );
      const sprintWinner = winners.find((w) => w.category === "champion_sprint_male");
      expect(sprintWinner?.horseId).toBe("h_player");
      expect(sprintWinner?.points).toBe(2);
    });
  });
});

// Utility to create a minimal horse for testing
function createMockHorse(
  id: string,
  age: number,
  gender: "colt" | "filly" | "horse" | "mare" | "gelding",
  raceHistory: Horse["raceHistory"] = [],
  isPlayer = true,
): Horse {
  const ownership = isPlayer ? makePlayerOwned() : makeNpcOwned("stable1");
  return {
    id,
    name: `Test Horse ${id}`,
    age,
    gender,
    raceHistory,
    ownership,
  } as Horse;
}

// Utility to create a mock race
function createMockRace(id: string, track: string): Race {
  return {
    id,
    graded: {
      track,
    },
  } as Race;
}

describe("Awards Scoring (PR #503)", () => {
  it("documents current behavior where South American 2YO awards ignore gender restrictions", () => {
    const raceMap = new Map<string, Race>([
      ["race1", createMockRace("race1", "Hipódromo de San Isidro")], // South America (Argentina)
    ]);

    // A 2YO filly wins a G1
    const filly = createMockHorse("filly1", 2, "filly", [
      {
        raceId: "race1",
        raceName: "Mock Race",
        day: 100,
        position: 1,
        grade: "G1",
        distance: 2000,
        surface: "dirt",
      },
    ]);

    // A 2YO colt wins a G1
    const colt = createMockHorse("colt1", 2, "colt", [
      {
        raceId: "race1",
        raceName: "Mock Race",
        day: 100,
        position: 1,
        grade: "G1",
        distance: 2000,
        surface: "dirt",
      },
    ]);

    // Filly gets points for potranca (filly)
    const fillyPotrancaPoints = calculateAwardPoints(
      filly,
      1,
      "south_america",
      "potranca_del_ano",
      raceMap,
    );

    // EXPECTED BEHAVIOR: Filly should get 0 points for potrillo (colt)
    // ACTUAL BEHAVIOR (BUG): She gets > 0 points because `potrillo_del_ano` only checks `age === 2`
    const fillyPotrilloPoints = calculateAwardPoints(
      filly,
      1,
      "south_america",
      "potrillo_del_ano",
      raceMap,
    );

    // Colt gets points for potrillo (colt)
    const coltPotrilloPoints = calculateAwardPoints(
      colt,
      1,
      "south_america",
      "potrillo_del_ano",
      raceMap,
    );

    // EXPECTED BEHAVIOR: Colt should get 0 points for potranca (filly)
    // ACTUAL BEHAVIOR (BUG): He gets > 0 points because `potranca_del_ano` only checks `age === 2`
    const coltPotrancaPoints = calculateAwardPoints(
      colt,
      1,
      "south_america",
      "potranca_del_ano",
      raceMap,
    );

    expect(fillyPotrancaPoints).toBeGreaterThan(0);
    expect(coltPotrilloPoints).toBeGreaterThan(0);

    // Documenting the bug: points are non-zero when they should be 0
    expect(fillyPotrilloPoints).toBe(fillyPotrancaPoints); // They get the exact same points for the wrong gender
    expect(coltPotrancaPoints).toBe(coltPotrilloPoints);
  });
});
