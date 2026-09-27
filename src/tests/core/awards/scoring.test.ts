import { describe, it, expect } from "vitest";
import { calculateAwardPoints, determineRegionalWinners } from "@/core/awards/scoring";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import { NorthAmericanCategory, AsiaPacificCategory } from "@/core/awards/types";

const makeHorse = (
  id: string,
  name: string,
  type: "player" | "system",
  raceHistory: Partial<HorseRaceHistoryEntry>[],
) => ({ id, name, age: 3, gender: "colt", ownership: { type }, raceHistory }) as Horse;
const makeRaceMap = (tracks: [string, string][]) =>
  new Map(tracks.map(([id, track]) => [id, { id, graded: { track } } as any as Race]));

describe("awards/scoring", () => {
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
