import { describe, it, expect } from "vitest";
import { getG1WinsForStable } from "@/core/awards/connectionTrophies";
import { createTestHorse, createTestNpcHorse, createUnownedHorse } from "@/tests/helpers";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";

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
      owned: true,
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
      owned: true,
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
