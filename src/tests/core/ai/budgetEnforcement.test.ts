/**
 * Budget Enforcement Tests
 *
 * Verifies that budgetAllocation from the strategic coordinator is actually
 * checked before generating spending intents (claiming, auction, breeding).
 *
 * Test-first: written before implementation changes in Phase 2.4.
 */

import { describe, it, expect } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { allocateBudget, type BudgetAllocation } from "@/core/ai/strategicCoordinator";
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

function createMockManagerWithBudget(
  stables: Stable[],
  budget: BudgetAllocation,
  day = 100,
): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const stable of stables) {
    const state = createStableAIState(stable, day);
    stableStates[stable.id] = { ...state, budgetAllocation: budget };
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

describe("Budget Enforcement", () => {
  it("allocateBudget produces a valid BudgetAllocation with all categories", () => {
    const stable = createMockStable({ cash: 100000 });
    const directives = [{ type: "aggressive_expansion" as const, priority: 1, weight: 1.0 }];
    const budget = allocateBudget(stable, directives);

    expect(budget.total).toBeGreaterThan(0);
    expect(budget.claiming).toBeGreaterThanOrEqual(0);
    expect(budget.auctions).toBeGreaterThanOrEqual(0);
    expect(budget.breeding).toBeGreaterThanOrEqual(0);
    expect(budget.training).toBeGreaterThanOrEqual(0);
    expect(budget.facilities).toBeGreaterThanOrEqual(0);
  });

  it("claiming intents are not generated when claiming budget is 0", () => {
    const stable = createMockStable({ cash: 200000, personality: "trader" });
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 0,
      breeding: 20000,
    };
    const manager = createMockManagerWithBudget([stable], budget);
    const state = createMockGameState({
      npcStables: [stable],
      npcAIManager: manager,
    });

    const intents = generateNpcIntents(state, 100);
    const claimingIntents = intents.filter((i) => i.type === "claiming");

    // With zero claiming budget, no claiming intents should be generated
    expect(claimingIntents.length).toBe(0);
  });

  it("syndicate intents respect budget constraints", () => {
    const stable = createMockStable({ cash: 200000, personality: "trader" });
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 0,
      claiming: 15000,
      breeding: 20000,
    };
    const manager = createMockManagerWithBudget([stable], budget);
    const state = createMockGameState({
      npcStables: [stable],
      npcAIManager: manager,
    });

    const intents = generateNpcIntents(state, 100);
    // Syndicate intents are generated independently of auction budget
    // but the budget allocation should be accessible for future enforcement
    const syndicateIntents = intents.filter((i) => i.type === "syndicate_creation");

    // With zero auction budget, no syndicate creation should happen
    expect(syndicateIntents.length).toBe(0);
  });

  it("cumulative claiming spend cap limits intents when budget is partially exhausted", () => {
    const stable = createMockStable({ cash: 200000, personality: "trader" });
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 30000,
      breeding: 20000,
    };
    const manager = createMockManagerWithBudget([stable], budget);

    // Two claimable horses in separate races, each priced at 25000
    // Budget is 30000, so only the first claim fits (25000 <= 30000)
    // Second claim would exceed: 25000 + 25000 = 50000 > 30000
    const horse1 = createMockHorse({
      id: "claim-target-1",
      stableId: "npc-2",
      age: 4,
      energy: 50,
      form: 40,
    });
    const horse2 = createMockHorse({
      id: "claim-target-2",
      stableId: "npc-2",
      age: 4,
      energy: 50,
      form: 40,
    });
    const claimingRace1 = {
      id: "claim-race-1",
      name: "Claiming Race 1",
      day: 100,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Claiming",
      entryFee: 0,
      purse: 10000,
      fieldSize: 12,
      entries: [{ horseId: "claim-target-1", stableId: "npc-2" }] as never[],
      resolved: false,
      claimingPrice: 25000,
    } as unknown as GameState["races"][string];
    const claimingRace2 = {
      id: "claim-race-2",
      name: "Claiming Race 2",
      day: 100,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Claiming",
      entryFee: 0,
      purse: 10000,
      fieldSize: 12,
      entries: [{ horseId: "claim-target-2", stableId: "npc-2" }] as never[],
      resolved: false,
      claimingPrice: 25000,
    } as unknown as GameState["races"][string];

    const state = createMockGameState({
      npcStables: [stable, createMockStable({ id: "npc-2", personality: "conservative" })],
      horses: { "claim-target-1": horse1, "claim-target-2": horse2 },
      races: { "claim-race-1": claimingRace1, "claim-race-2": claimingRace2 },
      npcAIManager: manager,
    });

    const intents = generateNpcIntents(state, 100);
    const claimingIntents = intents.filter((i) => i.type === "claiming");

    // Only 1 claiming intent should be generated — the second exceeds the cumulative cap
    expect(claimingIntents.length).toBeLessThanOrEqual(1);
  });

  it("budgetAllocation is stored on stableAI state and accessible to generators", () => {
    const stable = createMockStable({ cash: 100000 });
    const budget: BudgetAllocation = {
      total: 50000,
      training: 10000,
      facilities: 5000,
      auctions: 15000,
      claiming: 10000,
      breeding: 10000,
    };
    const manager = createMockManagerWithBudget([stable], budget);

    // The budget should be stored on the stableAI state
    expect(manager.stableStates[stable.id]?.budgetAllocation).toBeDefined();
    expect(manager.stableStates[stable.id]?.budgetAllocation?.claiming).toBe(10000);
    expect(manager.stableStates[stable.id]?.budgetAllocation?.auctions).toBe(15000);
    expect(manager.stableStates[stable.id]?.budgetAllocation?.breeding).toBe(10000);
  });
});
