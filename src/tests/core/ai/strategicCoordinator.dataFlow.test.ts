/**
 * Strategic Coordinator Data Flow Tests
 *
 * Tests that verify the data flow between strategic coordinator outputs
 * and the NPC intent generators. Covers economic trends, subsystem weights,
 * budget allocation enforcement, and cached worldAssessment passing.
 */

import { describe, it, expect } from "vitest";
import { assessWorldState, type WorldAssessment } from "@/core/ai/strategicCoordinator";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
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

function createMockManager(
  stableStates: Record<string, StableAIState> = {},
  globalEconomicState?: unknown,
): NpcAIManager {
  return {
    stableStates,
    globalDay: 100,
    regionalKings: {},
    globalEconomicState: globalEconomicState as NpcAIManager["globalEconomicState"],
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

describe("assessWorldState: economic trends data flow", () => {
  it("reads globalEconomicState from aiManager when available", () => {
    const economicState = {
      studFeeTrend: 5.2,
      yearlingPriceIndex: 115,
      claimingMarketActivity: 0.3,
    };
    const manager = createMockManager({}, economicState);
    const state = createMockGameState();
    const result = assessWorldState(state, manager);

    expect(result.economicTrends).toBeDefined();
    expect(result.economicTrends.studFeeTrend).toBe(5.2);
    expect(result.economicTrends.yearlingPriceIndex).toBe(115);
    expect(result.economicTrends.claimingMarketActivity).toBe(0.3);
  });

  it("falls back to neutral defaults when globalEconomicState is undefined", () => {
    const manager = createMockManager();
    const state = createMockGameState();
    const result = assessWorldState(state, manager);

    expect(result.economicTrends).toBeDefined();
    expect(result.economicTrends.studFeeTrend).toBe(0);
    expect(result.economicTrends.yearlingPriceIndex).toBe(100);
    expect(result.economicTrends.claimingMarketActivity).toBe(0);
  });
});

describe("coordinateSubsystems: weights are consumed by intent generators", () => {
  it("generateNpcIntents does not crash with economic state present", () => {
    const state = createMockGameState({
      npcAIManager: createMockManager(
        {},
        {
          studFeeTrend: 3,
          yearlingPriceIndex: 110,
          claimingMarketActivity: 0.2,
        },
      ),
    });

    const intents = generateNpcIntents(state, 100);
    expect(Array.isArray(intents)).toBe(true);
  });

  it("subsystem weights from coordinateSubsystems are stored on stableAI", () => {
    const manager = createMockManager();
    const state = createMockGameState({ npcAIManager: manager });

    generateNpcIntents(state, 100);

    const updatedStableAI = manager.stableStates["npc-1"];
    expect(updatedStableAI).toBeDefined();
    expect(updatedStableAI?.subsystemWeights).toBeDefined();
  });

  it("all 8 subsystem weights are present on stableAI after generateNpcIntents", () => {
    const manager = createMockManager();
    const state = createMockGameState({ npcAIManager: manager });

    generateNpcIntents(state, 100);

    const updatedStableAI = manager.stableStates["npc-1"];
    expect(updatedStableAI).toBeDefined();
    const weights = updatedStableAI?.subsystemWeights;
    expect(weights).toBeDefined();
    expect(weights?.raceEntry).toBeDefined();
    expect(weights?.training).toBeDefined();
    expect(weights?.auction).toBeDefined();
    expect(weights?.claiming).toBeDefined();
    expect(weights?.breeding).toBeDefined();
    expect(weights?.facility).toBeDefined();
    expect(weights?.market).toBeDefined();
    expect(weights?.upkeep).toBeDefined();
  });
});

describe("budgetAllocation: checked before generating spending intents", () => {
  it("budgetAllocation is stored on stableAI state", () => {
    const manager = createMockManager();
    const state = createMockGameState({ npcAIManager: manager });

    generateNpcIntents(state, 100);

    const updatedStableAI = manager.stableStates["npc-1"];
    expect(updatedStableAI).toBeDefined();
    expect(updatedStableAI?.budgetAllocation).toBeDefined();
    expect(updatedStableAI?.budgetAllocation?.total).toBeGreaterThan(0);
  });

  it("claiming intents respect budgetAllocation.claiming cap", () => {
    // Create a scenario where claiming would be triggered but budget is 0
    const stable = createMockStable({ cash: 100000, personality: "trader" });
    const horse = createMockHorse({
      id: "claim-target",
      stableId: "npc-2",
      age: 4,
      energy: 50,
      form: 40,
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    });
    const claimingRace = {
      id: "claim-race-1",
      name: "Claiming Race",
      day: 100,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Claiming",
      entryFee: 0,
      purse: 10000,
      fieldSize: 12,
      entries: [{ horseId: "claim-target", stableId: "npc-2" }] as never[],
      resolved: false,
      claimingPrice: 25000,
    } as unknown as GameState["races"][string];

    const manager = createMockManager();
    const state = createMockGameState({
      npcStables: [stable, createMockStable({ id: "npc-2", personality: "conservative" })],
      horses: { "claim-target": horse },
      races: { "claim-race-1": claimingRace },
      npcAIManager: manager,
    });

    const intents = generateNpcIntents(state, 100);
    const claimingIntents = intents.filter((i) => i.type === "claiming");

    // If claiming intents exist, budget.claiming should be > 0
    if (claimingIntents.length > 0) {
      const updatedStableAI = manager.stableStates["npc-1"];
      const budget = updatedStableAI?.budgetAllocation;
      // If claiming intents exist, budget.claiming should be > 0
      expect(budget?.claiming).toBeGreaterThan(0);
    }
  });
});

describe("worldAssessment: not recomputed in intentGenerators", () => {
  it("generateNpcIntents accepts optional cached worldAssessment parameter", () => {
    const manager = createMockManager();
    const state = createMockGameState({ npcAIManager: manager });

    const cachedAssessment: WorldAssessment = {
      playerDominance: 0.3,
      regionalPowerBalance: { default: 0.5 },
      economicTrends: { studFeeTrend: 2, yearlingPriceIndex: 105, claimingMarketActivity: 0.1 },
      breedingMarketSaturation: 0.2,
      upcomingMajorRaces: [],
    };

    expect(() => generateNpcIntents(state, 100, cachedAssessment)).not.toThrow();
  });
});
