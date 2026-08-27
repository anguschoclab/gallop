/**
 * Dead Function Removal Tests
 *
 * Verifies that generateNpcBreedingIntents has been removed from intentGenerators.ts
 * and that breeding is handled by npcBreedingPhase instead.
 */

import { describe, it, expect } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import type { GameState, Stable, Horse } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "npc-1",
    name: "Test NPC Stable",
    cash: 100000,
    personality: "breeder",
    tier: "mid",
    ...overrides,
  });
}

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 4,
    energy: 80,
    form: 60,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    ownership: makeNpcOwned("npc-1"),
    ...overrides,
  });
}

function createMockManager(stableStates: Record<string, StableAIState> = {}): NpcAIManager {
  return {
    stableStates,
    globalDay: 100,
    regionalKings: {},
  } as NpcAIManager;
}

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const stable = createMockStable();
  const horse = createMockHorse();
  return {
    day: 100,
    cash: 50000,
    horses: { [horse.id]: horse },
    races: {},
    log: [],
    news: [],
    inbox: [],
    seasonRecords: [],
    hallOfFame: [],
    archive: { horses: [], races: [], pregnancies: [], news: [] },
    transactions: [],
    expenses: [],
    npcStables: [stable],
    breedingPrograms: [],
    awards: [],
    ...overrides,
  } as unknown as GameState;
}

describe("Dead Function Removal: generateNpcBreedingIntents", () => {
  it("generateNpcIntents does not produce breeding intents (handled by npcBreedingPhase)", () => {
    const manager = createMockManager();
    const state = createMockGameState({ npcAIManager: manager });

    const intents = generateNpcIntents(state, 100);
    const breedingIntents = intents.filter((i) => i.type === "breeding");

    // generateNpcBreedingIntents always returned [] — now it's removed entirely
    expect(breedingIntents.length).toBe(0);
  });

  it("generateNpcBreedingIntents is not exported from intentGenerators", async () => {
    // The function should not be exported or present in the module
    const module = await import("@/core/npc/intentGenerators");
    expect((module as Record<string, unknown>).generateNpcBreedingIntents).toBeUndefined();
  });
});
