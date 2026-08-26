import { describe, it, expect } from "vitest";
import { findInvitationQualifiers } from "@/core/awards/invitations";
import { createTestHorse } from "@/tests/helpers";
import type { Race } from "@/core/race/types";
import type { RaceId } from "@/core/types/branded";
import type { JockeyId } from "@/core/types/branded";

describe("findInvitationQualifiers", () => {
  it("should return qualifiers for player horses with top-3 finishes in G1 races for the given region", () => {
    const naG1 = {
      id: "na-g1" as RaceId,
      name: "NA G1 Race",
      date: { day: 1 },
      conditions: {} as any,
      purse: 0,
      fieldSize: 10,
      graded: { track: "Churchill Downs", grade: "G1", patternGroup: "G1", status: "graded" },
      region: "NA",
      entries: [],
      trackCondition: "fast",
      temperature: 20,
      weather: "clear",
    } as unknown as Race;

    const euG1 = {
      id: "eu-g1" as RaceId,
      name: "EU G1 Race",
      date: { day: 1 },
      conditions: {} as any,
      purse: 0,
      fieldSize: 10,
      graded: { track: "Ascot", grade: "G1", patternGroup: "G1", status: "graded" },
      region: "EU",
      entries: [],
      trackCondition: "firm",
      temperature: 15,
      weather: "clear",
    } as unknown as Race;

    const naG2 = {
      id: "na-g2" as RaceId,
      name: "NA G2 Race",
      date: { day: 1 },
      conditions: {} as any,
      purse: 0,
      fieldSize: 10,
      graded: { track: "Belmont Park", grade: "G2", patternGroup: "G2", status: "graded" },
      region: "NA",
      entries: [],
      trackCondition: "fast",
      temperature: 20,
      weather: "clear",
    } as unknown as Race;

    const raceMap = new Map<string, Race>([
      [naG1.id, naG1],
      [euG1.id, euG1],
      [naG2.id, naG2],
    ]);

    const playerHorse = createTestHorse({
      id: "player-horse",
      name: "Player Horse",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "na-g1" as RaceId,
          raceName: "NA G1 Race",
          position: 1,
          day: 100,
          grade: "G1",
          surface: "dirt",
          distance: 2000,
          margin: 0,
          winTime: 120,
          entries: 10,
          purse: 1000000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
        {
          raceId: "na-g1" as RaceId,
          raceName: "NA G1 Race",
          position: 4,
          day: 150,
          grade: "G1",
          surface: "dirt",
          distance: 2000,
          margin: 5,
          winTime: 120,
          entries: 10,
          purse: 1000000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
        {
          raceId: "eu-g1" as RaceId,
          raceName: "EU G1 Race",
          position: 2,
          day: 200,
          grade: "G1",
          surface: "turf",
          distance: 2000,
          margin: 1,
          winTime: 120,
          entries: 10,
          purse: 1000000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
        {
          raceId: "na-g2" as RaceId,
          raceName: "NA G2 Race",
          position: 1,
          day: 250,
          grade: "G2",
          surface: "dirt",
          distance: 2000,
          margin: 0,
          winTime: 120,
          entries: 10,
          purse: 500000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
      ],
    });

    const npcHorse = createTestHorse({
      id: "npc-horse",
      name: "NPC Horse",
      ownership: { type: "npc", stableId: "npc-1" },
      raceHistory: [
        {
          raceId: "na-g1" as RaceId,
          raceName: "NA G1 Race",
          position: 1,
          day: 110,
          grade: "G1",
          surface: "dirt",
          distance: 2000,
          margin: 0,
          winTime: 120,
          entries: 10,
          purse: 1000000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
      ],
    });

    const horses = [playerHorse, npcHorse];

    const naQualifiers = findInvitationQualifiers(horses, 1, "north_america", raceMap);
    const euQualifiers = findInvitationQualifiers(horses, 1, "europe", raceMap);

    expect(naQualifiers.length).toBe(1);
    expect(naQualifiers[0].horseId).toBe(playerHorse.id);
    expect(naQualifiers[0].raceId).toBe("na-g1");
    expect(naQualifiers[0].position).toBe(1);

    expect(euQualifiers.length).toBe(1);
    expect(euQualifiers[0].horseId).toBe(playerHorse.id);
    expect(euQualifiers[0].raceId).toBe("eu-g1");
    expect(euQualifiers[0].position).toBe(2);
  });

  it("should return empty array if no qualifying races are found within the award year", () => {
    const naG1 = {
      id: "na-g1" as RaceId,
      name: "NA G1 Race",
      date: { day: 1 },
      conditions: {} as any,
      purse: 0,
      fieldSize: 10,
      graded: { track: "Churchill Downs", grade: "G1", patternGroup: "G1", status: "graded" },
      region: "NA",
      entries: [],
      trackCondition: "fast",
      temperature: 20,
      weather: "clear",
    } as unknown as Race;

    const raceMap = new Map<string, Race>([[naG1.id, naG1]]);

    const playerHorse = createTestHorse({
      id: "player-horse",
      name: "Player Horse",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "na-g1" as RaceId,
          raceName: "NA G1 Race",
          position: 1,
          day: 400,
          grade: "G1",
          surface: "dirt",
          distance: 2000,
          margin: 0,
          winTime: 120,
          entries: 10,
          purse: 1000000,
          jockeyId: "j1" as JockeyId,
          jockeyName: "J1",
        },
      ],
    });

    const horses = [playerHorse];

    const qualifiers = findInvitationQualifiers(horses, 1, "north_america", raceMap);
    expect(qualifiers.length).toBe(0);

    const qualifiersY2 = findInvitationQualifiers(horses, 2, "north_america", raceMap);
    expect(qualifiersY2.length).toBe(1);
  });
});
