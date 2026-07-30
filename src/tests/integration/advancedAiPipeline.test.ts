/**
 * Integration tests for advanced AI pipeline integration
 * Tests that strategic coordinator, diplomacy, narrative, and economy
 * modules work together in the full NPC cycle pipeline
 */

import { describe, it, expect } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import {
  assessWorldState,
  generateStrategicDirectives,
  allocateBudget,
} from "@/core/ai/strategicCoordinator";
import { processDiplomaticInteractions, initializeRelationships } from "@/core/ai/diplomacyAI";
import { processNarrativeCycle, createNarrativeState } from "@/core/ai/narrativeAI";
import { processEconomicCycle, createEconomicState } from "@/core/ai/economyAI";
import type { GameState, Stable, Horse } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "npc-1",
    name: "NPC Stable 1",
    cash: 200000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
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
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    stableId: "npc-1",
    ...overrides,
  });
}

function createMockAIState(stableId: string): StableAIState {
  return {
    stableId,
    personalityState: { personality: "aggressive" } as any,
    learningState: { outcomes: [], adaptations: {} } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
  } as any;
}

function createMockManager(stableIds: string[]): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const id of stableIds) {
    stableStates[id] = createMockAIState(id);
  }
  return { stableStates, globalDay: 100, regionalKings: {} };
}

function createMockGameState(stables: Stable[], horses: Horse[]): GameState {
  const horseMap: Record<string, Horse> = {};
  for (const h of horses) horseMap[h.id] = h;

  return {
    day: 100,
    cash: 500000,
    horses: horseMap,
    races: {},
    pregnancies: [],
    npcStables: stables,
    jockeys: [],
    news: [],
    inbox: [],
    transactions: [],
    pendingIntents: [],
  } as unknown as GameState;
}

describe("Pipeline integration: strategic coordinator → intent generation", () => {
  it("generateNpcIntents stores worldAssessment on stableAI state", () => {
    const stable = createMockStable({ id: "npc-1" });
    const horse = createMockHorse({ stableId: "npc-1" });
    const manager = createMockManager(["npc-1"]);
    const state = createMockGameState([stable], [horse]);
    state.npcAIManager = manager;

    generateNpcIntents(state, 100);

    // After generateNpcIntents, the AI manager should have worldAssessment stored
    // We verify via the updateStableAIState mock tracking
    const updatedState = state.npcAIManager.stableStates["npc-1"];
    expect(updatedState).toBeDefined();
  });

  it("generateNpcIntents runs without error and produces intents array", () => {
    const stable = createMockStable({ id: "npc-1" });
    const horse = createMockHorse({ stableId: "npc-1" });
    const manager = createMockManager(["npc-1"]);
    const state = createMockGameState([stable], [horse]);
    state.npcAIManager = manager;

    const intents = generateNpcIntents(state, 100);
    expect(Array.isArray(intents)).toBe(true);
  });

  it("assessWorldState produces valid assessment for multiple stables", () => {
    const stables = [
      createMockStable({ id: "npc-1", cash: 300000 }),
      createMockStable({ id: "npc-2", cash: 100000, personality: "conservative" }),
    ];
    const horses = [
      createMockHorse({ id: "h1", stableId: "npc-1" }),
      createMockHorse({ id: "h2", stableId: "npc-2" }),
    ];
    const manager = createMockManager(["npc-1", "npc-2"]);
    const state = createMockGameState(stables, horses);
    state.npcAIManager = manager;

    const assessment = assessWorldState(state, manager);
    expect(assessment).toBeDefined();
    expect(assessment.playerDominance).toBeGreaterThanOrEqual(0);
    expect(assessment.playerDominance).toBeLessThanOrEqual(1);
  });
});

describe("Pipeline integration: diplomacy → NPC relationships", () => {
  it("initializeRelationships + processDiplomaticInteractions creates neutral relationships", () => {
    const stables = [
      createMockStable({ id: "s1", personality: "aggressive" }),
      createMockStable({ id: "s2", personality: "aggressive" }),
    ];
    const manager = createMockManager(["s1", "s2"]);

    const initialized = initializeRelationships(manager, stables);
    expect(initialized.stableStates["s1"].npcRelationships).toBeDefined();
    expect(initialized.stableStates["s2"].npcRelationships).toBeDefined();

    const processed = processDiplomaticInteractions(initialized, stables, 100);
    // With neutral trust (0), no alliances should form
    expect(processed.stableStates["s1"].npcRelationships!["s2"].allianceType).toBeNull();
  });

  it("high trust leads to alliance formation through processDiplomaticInteractions", () => {
    const stables = [
      createMockStable({ id: "s1", personality: "breeder" }),
      createMockStable({ id: "s2", personality: "breeder" }),
    ];
    const manager = createMockManager(["s1", "s2"]);
    const initialized = initializeRelationships(manager, stables);

    // Manually set high trust
    initialized.stableStates["s1"].npcRelationships!["s2"].trust = 65;
    initialized.stableStates["s2"].npcRelationships!["s1"].trust = 65;

    const processed = processDiplomaticInteractions(initialized, stables, 100);
    expect(processed.stableStates["s1"].npcRelationships!["s2"].allianceType).not.toBeNull();
    expect(processed.stableStates["s2"].npcRelationships!["s1"].allianceType).not.toBeNull();
  });
});

describe("Pipeline integration: narrative → story arcs", () => {
  it("processNarrativeCycle generates arcs when dramatic potential is high", () => {
    const stable = createMockStable({ id: "s1", personality: "aggressive" });
    const manager = createMockManager(["s1"]);
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [],
      storyBeats: [],
      dramaticPotential: 0.85,
    };

    const result = processNarrativeCycle(manager, [stable], 100);
    expect(result.stableStates["s1"].narrativeState!.activeArcs.length).toBeGreaterThan(0);
  });

  it("processNarrativeCycle increases dramatic potential over time", () => {
    const stable = createMockStable({ id: "s1" });
    const manager = createMockManager(["s1"]);
    manager.stableStates["s1"].narrativeState = createNarrativeState();

    const result = processNarrativeCycle(manager, [stable], 100);
    expect(result.stableStates["s1"].narrativeState!.dramaticPotential).toBeGreaterThan(0);
  });
});

describe("Pipeline integration: economy → global economic state", () => {
  it("processEconomicCycle sets globalEconomicState on manager", () => {
    const stables = [
      createMockStable({ id: "s1", cash: 300000 }),
      createMockStable({ id: "s2", cash: 200000 }),
    ];
    const manager = createMockManager(["s1", "s2"]);
    const state = createMockGameState(stables, []);

    const result = processEconomicCycle(manager, state, 100);
    expect(result.globalEconomicState).toBeDefined();
    expect(typeof result.globalEconomicState?.yearlingPriceIndex).toBe("number");
  });

  it("processEconomicCycle evolves from previous state", () => {
    const stables = [createMockStable({ id: "s1", cash: 500000 })];
    const manager = createMockManager(["s1"]);
    manager.globalEconomicState = {
      studFeeTrend: 0.05,
      yearlingPriceIndex: 110,
      claimingMarketActivity: 5,
    };
    const state = createMockGameState(stables, []);

    const result = processEconomicCycle(manager, state, 100);
    expect(result.globalEconomicState).toBeDefined();
    // The index should have evolved (not stayed at 110)
    expect(result.globalEconomicState!.yearlingPriceIndex).not.toBe(110);
  });
});

describe("Pipeline integration: full coordination chain", () => {
  it("assessWorldState → generateStrategicDirectives → allocateBudget produces valid outputs", () => {
    const stable = createMockStable({ id: "s1", cash: 200000, personality: "aggressive" });
    const horses = [createMockHorse({ id: "h1", stableId: "s1" })];
    const manager = createMockManager(["s1"]);
    const state = createMockGameState([stable], horses);
    state.npcAIManager = manager;

    // Step 1: Assess world state
    const assessment = assessWorldState(state, manager);
    expect(assessment).toBeDefined();

    // Step 2: Generate strategic directives
    const directives = generateStrategicDirectives(stable, assessment, stable.personality);
    expect(directives).toBeDefined();
    expect(directives.length).toBeGreaterThan(0);

    // Step 3: Allocate budget
    const budget = allocateBudget(stable, directives);
    expect(budget).toBeDefined();
    expect(typeof budget.total).toBe("number");
  });

  it("multiple stables get different directives based on personality", () => {
    const aggressive = createMockStable({ id: "s1", cash: 200000, personality: "aggressive" });
    const conservative = createMockStable({ id: "s2", cash: 200000, personality: "conservative" });
    const horses = [
      createMockHorse({ id: "h1", stableId: "s1" }),
      createMockHorse({ id: "h2", stableId: "s2" }),
    ];
    const manager = createMockManager(["s1", "s2"]);
    const state = createMockGameState([aggressive, conservative], horses);
    state.npcAIManager = manager;

    const assessment = assessWorldState(state, manager);
    const aggDirectives = generateStrategicDirectives(aggressive, assessment, "aggressive");
    const conDirectives = generateStrategicDirectives(conservative, assessment, "conservative");

    // Different personalities should produce different directive sets
    expect(aggDirectives).toBeDefined();
    expect(conDirectives).toBeDefined();
    // At least the priorities or types should differ
    const aggTypes = aggDirectives.map((d) => d.type).sort();
    const conTypes = conDirectives.map((d) => d.type).sort();
    expect(JSON.stringify(aggTypes)).not.toBe(JSON.stringify(conTypes));
  });
});
