import { describe, it, expect } from "vitest";
import {
  assessWorldState,
  generateStrategicDirectives,
  allocateBudget,
  coordinateSubsystems,
  type WorldAssessment,
  type StrategicDirective,
  type BudgetAllocation,
  type SubsystemWeights,
} from "@/core/ai/strategicCoordinator";
import type { GameState, Stable, Horse, Race } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";
import { createRng, hashStr } from "@/core/common/rng";
import { makeNpcOwned, makeUnowned } from "@/core/horse/ownership";

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
    ownership: makeNpcOwned("npc-1"),
    ...overrides,
  });
}

function createMockManager(stableStates: Record<string, StableAIState> = {}): NpcAIManager {
  return {
    stableStates,
    globalDay: 100,
    regionalKings: {},
  };
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

describe("assessWorldState", () => {
  it("returns a WorldAssessment object with required fields", () => {
    const state = createMockGameState();
    const manager = createMockManager();
    const result = assessWorldState(state, manager);
    expect(result).toBeDefined();
    expect(result.playerDominance).toBeDefined();
    expect(result.regionalPowerBalance).toBeDefined();
    expect(result.economicTrends).toBeDefined();
    expect(result.breedingMarketSaturation).toBeDefined();
    expect(result.upcomingMajorRaces).toBeDefined();
  });

  it("calculates player dominance from horse count and cash", () => {
    const playerHorse = createMockHorse({ id: "player-horse", ownership: makeUnowned() });
    const npcHorse = createMockHorse({ id: "npc-horse", ownership: makeNpcOwned("npc-1") });
    const state = createMockGameState({
      horses: { "player-horse": playerHorse, "npc-horse": npcHorse },
      cash: 500000,
    });
    const manager = createMockManager();
    const result = assessWorldState(state, manager);
    expect(typeof result.playerDominance).toBe("number");
    expect(result.playerDominance).toBeGreaterThan(0);
    expect(result.playerDominance).toBeLessThanOrEqual(1);
  });

  it("detects regional power balance from regionalKings", () => {
    const manager = createMockManager();
    manager.regionalKings = {
      "North America (East)": "npc-1",
      "North America (West)": "player",
      Europe: "npc-2",
    };
    const state = createMockGameState();
    const result = assessWorldState(state, manager);
    expect(result.regionalPowerBalance).toBeDefined();
    expect(Object.keys(result.regionalPowerBalance).length).toBeGreaterThan(0);
  });

  it("identifies upcoming major races from race schedule", () => {
    const majorRace: Race = {
      id: "race-g1",
      name: "Kentucky Derby",
      day: 105,
      distance: 2000,
      surface: "Dirt",
      raceClass: "Stakes",
      entryFee: 0,
      purse: 2000000,
      fieldSize: 20,
      entries: [],
      resolved: false,
      graded: { grade: "G1", track: "Churchill Downs", trackId: "churchill", country: "USA" },
    } as unknown as Race;
    const state = createMockGameState({
      races: { "race-g1": majorRace },
    });
    const manager = createMockManager();
    const result = assessWorldState(state, manager);
    expect(result.upcomingMajorRaces.length).toBeGreaterThan(0);
    expect(result.upcomingMajorRaces[0].raceId).toBe("race-g1");
  });
});

describe("generateStrategicDirectives", () => {
  it("returns directives array for a stable", () => {
    const stable = createMockStable();
    const worldAssessment: WorldAssessment = {
      playerDominance: 0.5,
      regionalPowerBalance: {},
      economicTrends: { studFeeTrend: 0, yearlingPriceIndex: 100, claimingMarketActivity: 0 },
      breedingMarketSaturation: 0.3,
      upcomingMajorRaces: [],
    };
    const result = generateStrategicDirectives(stable, worldAssessment, "aggressive");
    expect(Array.isArray(result)).toBe(true);
  });

  it("generates aggressive expansion directive for aggressive personality when player dominance is low", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const worldAssessment: WorldAssessment = {
      playerDominance: 0.2,
      regionalPowerBalance: {},
      economicTrends: { studFeeTrend: 0, yearlingPriceIndex: 100, claimingMarketActivity: 0 },
      breedingMarketSaturation: 0.3,
      upcomingMajorRaces: [],
    };
    const result = generateStrategicDirectives(stable, worldAssessment, "aggressive");
    expect(result.length).toBeGreaterThan(0);
    const hasExpansion = result.some(
      (d) => d.type === "expansion" || d.type === "aggressive_expansion",
    );
    expect(hasExpansion).toBe(true);
  });

  it("generates defensive directive when player dominance is high", () => {
    const stable = createMockStable({ personality: "conservative" });
    const worldAssessment: WorldAssessment = {
      playerDominance: 0.8,
      regionalPowerBalance: {},
      economicTrends: { studFeeTrend: 0, yearlingPriceIndex: 100, claimingMarketActivity: 0 },
      breedingMarketSaturation: 0.3,
      upcomingMajorRaces: [],
    };
    const result = generateStrategicDirectives(stable, worldAssessment, "conservative");
    expect(result.length).toBeGreaterThan(0);
    const hasDefensive = result.some((d) => d.type === "defensive" || d.type === "cost_cutting");
    expect(hasDefensive).toBe(true);
  });

  it("generates breeding directive for breeder personality when market is not saturated", () => {
    const stable = createMockStable({ personality: "breeder" });
    const worldAssessment: WorldAssessment = {
      playerDominance: 0.5,
      regionalPowerBalance: {},
      economicTrends: { studFeeTrend: 0.1, yearlingPriceIndex: 120, claimingMarketActivity: 0 },
      breedingMarketSaturation: 0.2,
      upcomingMajorRaces: [],
    };
    const result = generateStrategicDirectives(stable, worldAssessment, "breeder");
    expect(result.length).toBeGreaterThan(0);
    const hasBreeding = result.some(
      (d) => d.type === "breeding_expansion" || d.type === "breeding_focus",
    );
    expect(hasBreeding).toBe(true);
  });
});

describe("allocateBudget", () => {
  it("returns a BudgetAllocation with all subsystem budgets", () => {
    const stable = createMockStable({ cash: 200000 });
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const result = allocateBudget(stable, directives);
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(result.training).toBeDefined();
    expect(result.facilities).toBeDefined();
    expect(result.auctions).toBeDefined();
    expect(result.claiming).toBeDefined();
    expect(result.breeding).toBeDefined();
  });

  it("respects stable cash as upper bound", () => {
    const stable = createMockStable({ cash: 50000 });
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const result = allocateBudget(stable, directives);
    expect(result.total).toBeLessThanOrEqual(50000);
  });

  it("allocates more to auctions for aggressive personality", () => {
    const aggressiveStable = createMockStable({ cash: 200000, personality: "aggressive" });
    const conservativeStable = createMockStable({ cash: 200000, personality: "conservative" });
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const aggressiveResult = allocateBudget(aggressiveStable, directives);
    const conservativeResult = allocateBudget(conservativeStable, directives);
    expect(aggressiveResult.auctions).toBeGreaterThan(conservativeResult.auctions);
  });

  it("allocates more to breeding for breeder personality", () => {
    const breederStable = createMockStable({ cash: 200000, personality: "breeder" });
    const aggressiveStable = createMockStable({ cash: 200000, personality: "aggressive" });
    const directives: StrategicDirective[] = [
      { type: "breeding_expansion", priority: 1, weight: 1.0 },
    ];
    const breederResult = allocateBudget(breederStable, directives);
    const aggressiveResult = allocateBudget(aggressiveStable, directives);
    expect(breederResult.breeding).toBeGreaterThan(aggressiveResult.breeding);
  });

  it("sum of subsystem budgets does not exceed total", () => {
    const stable = createMockStable({ cash: 300000 });
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
      { type: "breeding_focus", priority: 2, weight: 0.5 },
    ];
    const result = allocateBudget(stable, directives);
    const sum =
      result.training + result.facilities + result.auctions + result.claiming + result.breeding;
    expect(sum).toBeLessThanOrEqual(result.total + 1);
  });
});

describe("coordinateSubsystems", () => {
  it("returns SubsystemWeights with all subsystems", () => {
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 15000,
      breeding: 20000,
    };
    const result = coordinateSubsystems(directives, budget);
    expect(result).toBeDefined();
    expect(result.raceEntry).toBeDefined();
    expect(result.training).toBeDefined();
    expect(result.auction).toBeDefined();
    expect(result.claiming).toBeDefined();
    expect(result.breeding).toBeDefined();
    expect(result.facility).toBeDefined();
    expect(result.market).toBeDefined();
    expect(result.upkeep).toBeDefined();
  });

  it("weights race entry higher for aggressive expansion directive", () => {
    const expansionDirectives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const defensiveDirectives: StrategicDirective[] = [
      { type: "defensive", priority: 1, weight: 1.0 },
    ];
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 15000,
      breeding: 20000,
    };
    const expansionWeights = coordinateSubsystems(expansionDirectives, budget);
    const defensiveWeights = coordinateSubsystems(defensiveDirectives, budget);
    expect(expansionWeights.raceEntry).toBeGreaterThan(defensiveWeights.raceEntry);
  });

  it("weights breeding higher for breeding focus directive", () => {
    const breedingDirectives: StrategicDirective[] = [
      { type: "breeding_focus", priority: 1, weight: 1.0 },
    ];
    const racingDirectives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 15000,
      breeding: 20000,
    };
    const breedingWeights = coordinateSubsystems(breedingDirectives, budget);
    const racingWeights = coordinateSubsystems(racingDirectives, budget);
    expect(breedingWeights.breeding).toBeGreaterThan(racingWeights.breeding);
  });

  it("all weights are between 0 and 2", () => {
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
      { type: "breeding_focus", priority: 2, weight: 0.8 },
    ];
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 15000,
      breeding: 20000,
    };
    const result = coordinateSubsystems(directives, budget);
    for (const weight of Object.values(result)) {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(2);
    }
  });
});
