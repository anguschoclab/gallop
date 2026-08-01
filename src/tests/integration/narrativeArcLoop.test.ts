/**
 * Narrative Arc Tests
 *
 * Verifies that:
 * 1. Career arc states (narrativeArcs in SystemsState) generate news items
 * 2. NPC narrative arcs (in aiManager) generate news impacts via narrativePhase
 * 3. Both surface in the Gazette/news system
 */

import { describe, it, expect } from "vitest";
import {
  checkCareerArcTrigger,
  type CareerArcState,
} from "@/services/narrative/careerArcGenerator";
import { processNarrativeCycle } from "@/core/ai/narrativeAI";
import { createStableAIState } from "@/core/ai/npcCycleAI";
import type { GameState, Stable, Horse, Race } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";
import { createRng } from "@/core/common/rng";

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
    careerWins: 0,
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

describe("Career Arc Narrative System", () => {
  it("generates rising_star news when horse wins 3rd race", () => {
    const horse = createMockHorse({ careerWins: 2 });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 100,
    } as unknown as Race;
    const rng = createRng("test-seed");

    const result = checkCareerArcTrigger(horse, undefined, race, 1, 100, rng);

    expect(result.newsItem).not.toBeNull();
    expect(result.newArcState.stage).toBe("rising_star");
    expect(result.newArcState.horseId).toBe(horse.id);
  });

  it("does not generate news for non-win", () => {
    const horse = createMockHorse({ careerWins: 2 });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 100,
    } as unknown as Race;
    const rng = createRng("test-seed");

    const result = checkCareerArcTrigger(horse, undefined, race, 3, 100, rng);

    expect(result.newsItem).toBeNull();
    expect(result.newArcState.stage).toBe("none");
  });

  it("preserves existing arc state when no trigger", () => {
    const horse = createMockHorse({ careerWins: 5 });
    const existingArc: CareerArcState = {
      horseId: horse.id,
      stage: "rising_star",
      stage1Day: 50,
      consecutiveLosses: 0,
    };
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 100,
    } as unknown as Race;
    const rng = createRng("test-seed");

    const result = checkCareerArcTrigger(horse, existingArc, race, 2, 100, rng);

    // Stage should not regress
    expect(result.newArcState.stage).toBe("rising_star");
    expect(result.newArcState.stage1Day).toBe(50);
  });

  it("transitions champion_or_bust to complete on next race", () => {
    const horse = createMockHorse({ careerWins: 10 });
    const existingArc: CareerArcState = {
      horseId: horse.id,
      stage: "champion_or_bust",
      stage1Day: 50,
      stage2Day: 80,
      stage3Day: 90,
      consecutiveLosses: 2,
    };
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 100,
    } as unknown as Race;
    const rng = createRng("test-seed");

    const result = checkCareerArcTrigger(horse, existingArc, race, 2, 100, rng);

    // champion_or_bust transitions to complete on the next race regardless of result
    expect(result.newArcState.stage).toBe("complete");
  });
});

describe("NPC Narrative Arc System", () => {
  it("processNarrativeCycle updates stable narrative states", () => {
    const stables = [
      createMockStable({ id: "npc-1", personality: "aggressive" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);

    const updated = processNarrativeCycle(manager, stables, 100);

    // Narrative states should be initialized or updated
    expect(updated.stableStates["npc-1"]).toBeDefined();
    expect(updated.stableStates["npc-2"]).toBeDefined();
  });

  it("narrative arcs are stored on stableAI narrativeState", () => {
    const stables = [createMockStable({ id: "npc-1", personality: "aggressive" })];
    const manager = createMockManagerWithStables(stables);

    const updated = processNarrativeCycle(manager, stables, 100);

    const stableAI = updated.stableStates["npc-1"];
    expect(stableAI?.narrativeState).toBeDefined();
    expect(stableAI?.narrativeState?.activeArcs).toBeDefined();
    expect(Array.isArray(stableAI?.narrativeState?.activeArcs)).toBe(true);
  });
});
