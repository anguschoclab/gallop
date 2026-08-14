import { describe, it, expect } from "vitest";
import { runNpcRaceEntry } from "@/core/npc/raceEntry";
import { createTestHorse, createTestJockey, createTestStable } from "@/tests/helpers";
import type { Horse, Jockey, Race, Stable } from "@/game/types";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { createJockeyStrategyAIState } from "@/core/ai/jockeyStrategyAI";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    runningStyle: "E",
    stableId: "stable-1",
    phenotypeResolved: true,
    stats: {
      speed: 80,
      stamina: 75,
      acceleration: 75,
      consistency: 75,
      temperament: 60,
      conformation: 60,
    },
    energy: 90,
    form: 5,
    age: 4,
    ...overrides,
  });
}

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({
    id: "jockey-1",
    name: "Test Jockey",
    archetype: "front_runner",
    stats: { pacing: 75, positioning: 75, vigor: 75, gateSkill: 75, temperament: 75 },
    fame: 50,
    ridingFee: 500,
    affinityMap: {},
    traits: [],
    ...overrides,
  });
}

function mkStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    name: "Test Stable",
    cash: 100000,
    personality: "aggressive",
    horses: ["horse-1"],
    ...overrides,
  });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 3,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 500,
    purse: 10000,
    minStat: 0,
    fieldSize: 8,
    entries: [],
    resolved: false,
    surface: "Dirt",
    trackCondition: "fast",
    weather: "sunny",
    ...overrides,
  } as Race;
}

function mkAiManager(stableId: string): NpcAIManager {
  return {
    stableStates: {
      [stableId]: {
        jockeyStrategyAI: createJockeyStrategyAIState(mkStable({ personality: "conservative" })),
      },
    },
  } as unknown as NpcAIManager;
}

describe("runNpcRaceEntry — applyAffinityBoost integration", () => {
  it("high-affinity jockey produces instructions with higher aggressiveness than zero-affinity", () => {
    const horse = mkHorse({ id: "horse-1" });
    const zeroJockey = mkJockey({
      id: "jockey-zero",
      stableId: "stable-1",
      affinityMap: {},
    });
    const highJockey = mkJockey({
      id: "jockey-high",
      stableId: "stable-1",
      affinityMap: { "horse-1": 300 },
    });

    const stable = mkStable({ horses: ["horse-1"], personality: "conservative" });
    const race = mkRace({ day: 3 });
    const aiManager = mkAiManager("stable-1");

    // Run with zero-affinity jockey
    const zeroResult = runNpcRaceEntry(
      [stable],
      [horse],
      [zeroJockey],
      [race],
      1,
      { next: () => 0 } as any,
      3,
      new Set(),
      aiManager,
    );

    const zeroEntry = zeroResult[0].entries.find((e) => e.horseId === "horse-1");
    expect(zeroEntry).toBeDefined();
    expect(zeroEntry?.jockeyInstructions).toBeDefined();
    const zeroAggr = zeroEntry!.jockeyInstructions!.aggressiveness;

    // Run with high-affinity jockey
    const highResult = runNpcRaceEntry(
      [stable],
      [horse],
      [highJockey],
      [mkRace({ day: 3 })],
      1,
      { next: () => 0 } as any,
      3,
      new Set(),
      aiManager,
    );

    const highEntry = highResult[0].entries.find((e) => e.horseId === "horse-1");
    expect(highEntry?.jockeyInstructions).toBeDefined();
    const highAggr = highEntry!.jockeyInstructions!.aggressiveness;

    // High-affinity jockey should get boosted aggressiveness
    expect(highAggr).toBeGreaterThan(zeroAggr);
  });
});
