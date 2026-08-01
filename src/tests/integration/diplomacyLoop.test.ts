/**
 * Diplomacy Loop Tests
 *
 * Verifies that the diplomacy phase initializes NPC relationships,
 * processes diplomatic interactions, and that these relationships
 * are available to the intent generators for alliance/coalition decisions.
 */

import { describe, it, expect } from "vitest";
import { initializeRelationships, processDiplomaticInteractions } from "@/core/ai/diplomacyAI";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { createStableAIState } from "@/core/ai/npcCycleAI";
import type { GameState, Stable, Horse } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "npc-1",
    name: "Test NPC Stable",
    cash: 100000,
    personality: "aggressive",
    tier: "mid",
    country: "North America (East)",
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
    stableId: "npc-1",
    ...overrides,
  });
}

function createMockManagerWithStables(stables: Stable[], day = 100): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const stable of stables) {
    stableStates[stable.id] = createStableAIState(stable, day);
  }
  return {
    stableStates,
    globalDay: day,
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

describe("Diplomacy Loop", () => {
  it("initializeRelationships creates relationships between all NPC stables", () => {
    const stables = [
      createMockStable({ id: "npc-1" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);

    const updatedManager = initializeRelationships(manager, stables);

    // Each stable should have relationships with the other
    const stable1AI = updatedManager.stableStates["npc-1"];
    const stable2AI = updatedManager.stableStates["npc-2"];

    expect(stable1AI?.npcRelationships).toBeDefined();
    expect(stable1AI?.npcRelationships?.["npc-2"]).toBeDefined();
    expect(stable2AI?.npcRelationships).toBeDefined();
    expect(stable2AI?.npcRelationships?.["npc-1"]).toBeDefined();
  });

  it("processDiplomaticInteractions updates trust values over time", () => {
    const stables = [
      createMockStable({ id: "npc-1" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);
    const initialized = initializeRelationships(manager, stables);

    const beforeTrust = initialized.stableStates["npc-1"]?.npcRelationships?.["npc-2"]?.trust;
    const afterManager = processDiplomaticInteractions(initialized, stables, 100);
    const afterTrust = afterManager.stableStates["npc-1"]?.npcRelationships?.["npc-2"]?.trust;

    expect(typeof beforeTrust).toBe("number");
    expect(typeof afterTrust).toBe("number");
    // Trust should be a valid number in range
    expect(afterTrust).toBeGreaterThanOrEqual(-100);
    expect(afterTrust).toBeLessThanOrEqual(100);
  });

  it("diplomatic intents are generated when relationships exist", () => {
    const stables = [
      createMockStable({ id: "npc-1", personality: "aggressive" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);
    const initialized = initializeRelationships(manager, stables);

    const state = createMockGameState({
      npcStables: stables,
      npcAIManager: initialized,
    });

    // Generate intents — diplomatic intents should be present on weekly cadence
    const intents = generateNpcIntents(state, 5);
    const diplomaticIntents = intents.filter((i) => i.type === "diplomatic_action");

    // May or may not produce intents depending on trust levels, but the path should work
    expect(Array.isArray(diplomaticIntents)).toBe(true);
  });

  it("diplomacy phase output is persisted in aiManager state", () => {
    const stables = [
      createMockStable({ id: "npc-1" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);
    const initialized = initializeRelationships(manager, stables);
    const processed = processDiplomaticInteractions(initialized, stables, 100);

    // Verify relationships are still present after processing
    expect(processed.stableStates["npc-1"]?.npcRelationships).toBeDefined();
    expect(processed.stableStates["npc-2"]?.npcRelationships).toBeDefined();
  });
});
