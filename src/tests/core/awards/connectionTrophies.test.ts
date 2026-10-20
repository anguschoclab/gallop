import { describe, it, expect } from "vitest";
import {
  getG1WinsForStable,
  getG1WinsForJockey,
} from "@/domains/awards/simulation/connectionTrophies";
import type { Race } from "@/platform/game/types";
import { createTestHorse, createTestNpcHorse, createUnownedHorse } from "@/tests/helpers";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/platform/game/types";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";

const G1_RACE = {
  raceId: "g1-test",
  raceName: "Test Derby",
  position: 1,
  day: 10,
  beyer: 105,
  grade: "G1" as const,
  distance: 2000,
  surface: "Dirt" as const,
  purse: 2_000_000,
  purseEarned: 1_200_000,
  fieldSize: 12,
  raceClass: "Graded" as const,
};

describe("getG1WinsForStable", () => {
  it("returns G1 wins for player-owned horses when stableId is undefined", () => {
    const playerHorse = createTestHorse({
      id: "player-h1",
      name: "Player Champion",
      ownership: makePlayerOwned(),
      raceHistory: [G1_RACE],
    });
    const state = { horses: h2r([playerHorse]) } as Pick<GameState, "horses">;

    const wins = getG1WinsForStable(state, undefined);
    expect(wins).toHaveLength(1);
    expect(wins[0].horseId).toBe("player-h1");
  });

  it("returns G1 wins for NPC-owned horses when stableId is provided", () => {
    const npcHorse = createTestNpcHorse({
      id: "npc-h1",
      name: "NPC Champion",
      raceHistory: [G1_RACE],
    });
    const state = { horses: h2r([npcHorse]) } as Pick<GameState, "horses">;

    const wins = getG1WinsForStable(state, "test-npc-stable-1");
    expect(wins).toHaveLength(1);
    expect(wins[0].horseId).toBe("npc-h1");
  });

  it("does NOT return G1 wins for unowned horses when querying player stable", () => {
    const playerHorse = createTestHorse({
      id: "player-h1",
      name: "Player Champion",
      ownership: makePlayerOwned(),
      raceHistory: [G1_RACE],
    });
    const unownedHorse = createUnownedHorse({
      id: "unowned-h1",
      name: "Wild Champion",
      raceHistory: [G1_RACE],
    });
    const state = { horses: h2r([playerHorse, unownedHorse]) } as Pick<GameState, "horses">;

    const wins = getG1WinsForStable(state, undefined);
    expect(wins).toHaveLength(1);
    expect(wins[0].horseId).toBe("player-h1");
  });

  it("does NOT return G1 wins for unowned horses when querying NPC stable", () => {
    const npcHorse = createTestNpcHorse({
      id: "npc-h1",
      name: "NPC Champion",
      raceHistory: [G1_RACE],
    });
    const unownedHorse = createUnownedHorse({
      id: "unowned-h1",
      name: "Wild Champion",
      raceHistory: [G1_RACE],
    });
    const state = { horses: h2r([npcHorse, unownedHorse]) } as Pick<GameState, "horses">;

    const wins = getG1WinsForStable(state, "test-npc-stable-1");
    expect(wins).toHaveLength(1);
    expect(wins[0].horseId).toBe("npc-h1");
  });
});

describe("getG1WinsForJockey", () => {
  it("returns graded wins attributed to the specific jockey", () => {
    const horse = createTestHorse({
      id: "horse1",
      name: "Champ",
      ownership: makePlayerOwned(),
      raceHistory: [
        { ...G1_RACE, raceId: "g1-test-1", grade: "G1", position: 1, day: 20 },
        { ...G1_RACE, raceId: "g2-test-1", grade: "G2", position: 1, day: 15 },
        { ...G1_RACE, raceId: "g3-test-1", grade: "G3", position: 1, day: 10 },
        { ...G1_RACE, raceId: "non-graded", grade: undefined, position: 1, day: 5 },
        { ...G1_RACE, raceId: "loss", grade: "G1", position: 2, day: 1 },
      ],
    });

    const state = {
      horses: h2r([horse]),
      races: {
        "g1-test-1": {
          id: "g1-test-1",
          entries: [{ horseId: "horse1", jockeyId: "j1" }],
        } as unknown as Race,
        "g2-test-1": {
          id: "g2-test-1",
          entries: [{ horseId: "horse1", jockeyId: "j1" }],
        } as unknown as Race,
        "g3-test-1": {
          id: "g3-test-1",
          entries: [{ horseId: "horse1", jockeyId: "j2" }],
        } as unknown as Race,
        "non-graded": {
          id: "non-graded",
          entries: [{ horseId: "horse1", jockeyId: "j1" }],
        } as unknown as Race,
        loss: { id: "loss", entries: [{ horseId: "horse1", jockeyId: "j1" }] } as unknown as Race,
      },
    } as unknown as GameState;

    const wins = getG1WinsForJockey(state, "j1");
    expect(wins).toHaveLength(2); // G1 and G2 wins
    expect(wins[0].raceId).toBe("g1-test-1"); // Sorted by day descending (20 > 15)
    expect(wins[1].raceId).toBe("g2-test-1");
  });

  it("returns empty array if jockeyId is empty", () => {
    const horse = createTestHorse({
      id: "horse1",
      raceHistory: [{ ...G1_RACE, raceId: "g1-test-1" }],
    });
    const state = {
      horses: h2r([horse]),
      races: {},
    } as unknown as GameState;

    expect(getG1WinsForJockey(state, "")).toHaveLength(0);
  });

  it("returns empty array if race entry is missing or jockey does not match", () => {
    const horse = createTestHorse({
      id: "horse1",
      raceHistory: [
        { ...G1_RACE, raceId: "missing-race", position: 1 },
        { ...G1_RACE, raceId: "wrong-jockey", position: 1 },
      ],
    });
    const state = {
      horses: h2r([horse]),
      races: {
        "wrong-jockey": {
          id: "wrong-jockey",
          entries: [{ horseId: "horse1", jockeyId: "other-jockey" }],
        } as unknown as Race,
      },
    } as unknown as GameState;

    expect(getG1WinsForJockey(state, "j1")).toHaveLength(0);
  });
});
