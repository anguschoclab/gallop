import { describe, it, expect } from "vitest";
import {
  derivePlayerRaceWins,
  playerRaceWinsSummary,
  type PlayerRaceWinRecord,
} from "@/core/stable/raceWins";
import { createTestHorse } from "@/tests/helpers";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asRaceId } from "@/core/types/branded";
import { createTransaction } from "@/core/transactions";
import type { Race } from "@/core/race/types";

describe("derivePlayerRaceWins", () => {
  it("returns an empty array when no horses have race history", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      ownership: makePlayerOwned(),
      raceHistory: [],
    });
    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toEqual([]);
  });

  it("extracts a 1st place win with purseEarned for a player-owned horse", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      name: "Thunderbolt",
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Spring Stakes",
          position: 1,
          day: 15,
          purse: 50000,
          purseEarned: 30000,
          beyer: 88,
          distance: 1600,
          surface: "Dirt",
          raceClass: "Stakes",
        },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toHaveLength(1);
    expect(wins[0]).toMatchObject({
      raceId: "race-1",
      raceName: "Spring Stakes",
      horseId: "h-1",
      horseName: "Thunderbolt",
      payout: 30000,
      day: 15,
      beyer: 88,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Stakes",
    });
  });

  it("ignores non-winning finishes (position > 1)", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Derby Trial",
          position: 2,
          day: 10,
          purseEarned: 12500,
        },
        {
          raceId: "race-2",
          raceName: "Maiden Special",
          position: 3,
          day: 5,
          purseEarned: 5000,
        },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toHaveLength(0);
  });

  it("ignores wins that occurred when owned by an NPC stable", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      ownership: makePlayerOwned(), // Currently player-owned (e.g. claimed from NPC)
      raceHistory: [
        {
          raceId: "race-npc",
          raceName: "NPC Cup",
          position: 1,
          day: 5,
          purseEarned: 25000,
          stableId: asNpcStableId("stable-rival"), // Won by NPC stable!
        },
        {
          raceId: "race-player",
          raceName: "Player Trophy",
          position: 1,
          day: 20,
          purseEarned: 40000,
          // No stableId or player stableId
        },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toHaveLength(1);
    expect(wins[0].raceName).toBe("Player Trophy");
    expect(wins[0].payout).toBe(40000);
  });

  it("uses transaction amount when purseEarned is 0 or missing", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      name: "Lucky Charm",
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "race-legacy",
          raceName: "Old Handicap",
          position: 1,
          day: 12,
        },
      ],
    });

    const tx = createTransaction(
      "income",
      "prize_money",
      18000,
      "Prize money: 1st in Old Handicap",
      12,
      100000,
      { horseId: "h-1", raceId: "race-legacy" },
    );

    const wins = derivePlayerRaceWins({ horses: [horse], transactions: [tx] });
    expect(wins).toHaveLength(1);
    expect(wins[0].payout).toBe(18000);
  });

  it("calculates fallback payout from race purse when purseEarned and tx are missing", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      name: "Runner",
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "race-fallback",
          raceName: "Standard Allowance",
          position: 1,
          day: 8,
          purse: 100000,
        },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toHaveLength(1);
    // PRIZE_SPLIT[0] = 0.6 -> 60,000
    expect(wins[0].payout).toBe(60000);
  });

  it("calculates fallback payout using graded split for graded races", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      name: "Champ",
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "race-g1",
          raceName: "Metropolitan Handicap",
          position: 1,
          day: 30,
          grade: "G1",
          purse: 500000,
        },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [horse] });
    expect(wins).toHaveLength(1);
    // GRADED_PRIZE_SPLIT[0] = 0.7 -> 350,000
    expect(wins[0].payout).toBe(350000);
    expect(wins[0].grade).toBe("G1");
  });

  it("sorts multiple wins by day descending", () => {
    const h1 = createTestHorse({
      id: asHorseId("h-1"),
      name: "Early Winner",
      ownership: makePlayerOwned(),
      raceHistory: [
        { raceId: "r-1", raceName: "Day 5 Race", position: 1, day: 5, purseEarned: 10000 },
        { raceId: "r-3", raceName: "Day 25 Race", position: 1, day: 25, purseEarned: 50000 },
      ],
    });
    const h2 = createTestHorse({
      id: asHorseId("h-2"),
      name: "Mid Winner",
      ownership: makePlayerOwned(),
      raceHistory: [
        { raceId: "r-2", raceName: "Day 15 Race", position: 1, day: 15, purseEarned: 20000 },
      ],
    });

    const wins = derivePlayerRaceWins({ horses: [h1, h2] });
    expect(wins).toHaveLength(3);
    expect(wins.map((w) => w.day)).toEqual([25, 15, 5]);
  });

  it("resolves jockey name and preserves total purse when provided", () => {
    const horse = createTestHorse({
      id: asHorseId("h-1"),
      name: "Fast Horse",
      ownership: makePlayerOwned(),
      raceHistory: [
        {
          raceId: "r-jockey",
          raceName: "Jockey Cup",
          position: 1,
          day: 18,
          purse: 80000,
          purseEarned: 48000,
          jockeyId: "j-1" as any,
        },
      ],
    });

    const mockJockey = {
      id: "j-1" as any,
      name: "Elena Vance",
    } as any;

    const wins = derivePlayerRaceWins({
      horses: [horse],
      jockeys: [mockJockey],
    });

    expect(wins).toHaveLength(1);
    expect(wins[0].jockeyId).toBe("j-1");
    expect(wins[0].jockeyName).toBe("Elena Vance");
    expect(wins[0].purse).toBe(80000);
    expect(wins[0].payout).toBe(48000);
  });
});

describe("playerRaceWinsSummary", () => {
  it("returns zeroed summary when there are no wins", () => {
    const summary = playerRaceWinsSummary([]);
    expect(summary).toEqual({
      totalWins: 0,
      totalEarnings: 0,
      averagePayout: 0,
      topPayout: 0,
      gradedWins: 0,
    });
  });

  it("computes accurate aggregate metrics across wins", () => {
    const mockWins: PlayerRaceWinRecord[] = [
      {
        id: "1",
        day: 10,
        raceId: "r-1",
        raceName: "Graded Stakes",
        horseId: "h-1",
        horseName: "Star",
        payout: 100000,
        grade: "G1",
      },
      {
        id: "2",
        day: 20,
        raceId: "r-2",
        raceName: "Allowance",
        horseId: "h-2",
        horseName: "Comet",
        payout: 40000,
      },
      {
        id: "3",
        day: 30,
        raceId: "r-3",
        raceName: "Grade 2 Classic",
        horseId: "h-1",
        horseName: "Star",
        payout: 60000,
        grade: "G2",
      },
    ];

    const summary = playerRaceWinsSummary(mockWins);
    expect(summary.totalWins).toBe(3);
    expect(summary.totalEarnings).toBe(200000);
    expect(summary.averagePayout).toBe(Math.round(200000 / 3)); // 66667
    expect(summary.topPayout).toBe(100000);
    expect(summary.gradedWins).toBe(2);
  });
});
