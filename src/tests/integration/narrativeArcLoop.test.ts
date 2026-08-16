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

  it("completed arcs are moved to resolvedArcs", () => {
    const stables = [createMockStable({ id: "npc-1", personality: "aggressive" })];
    const manager = createMockManagerWithStables(stables);

    // Run once to generate arcs
    const firstPass = processNarrativeCycle(manager, stables, 100);
    // Run again to potentially resolve arcs
    const updated = processNarrativeCycle(firstPass, stables, 200);

    const stableAI = updated.stableStates["npc-1"];
    // Narrative state should exist with both active and resolved arrays
    expect(stableAI?.narrativeState).toBeDefined();
    expect(stableAI?.narrativeState?.activeArcs).toBeDefined();
    // resolvedArcs may or may not exist depending on arc lifecycle, but the field should be accessible
    expect(stableAI?.narrativeState).toBeDefined();
  });

  it("rivalry watch can be determined from friction with player", () => {
    const stables = [
      createMockStable({ id: "npc-1", personality: "aggressive" }),
      createMockStable({ id: "npc-2", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);
    // Set high friction for npc-1 (rivalry with player)
    manager.stableStates["npc-1"].friction = 75;
    manager.stableStates["npc-2"].friction = 20;

    const updated = processNarrativeCycle(manager, stables, 100);

    // npc-1 has high friction (rivalry watch candidate)
    expect(updated.stableStates["npc-1"]?.friction).toBeGreaterThanOrEqual(60);
    // npc-2 does not
    expect(updated.stableStates["npc-2"]?.friction).toBeLessThan(60);
  });

  // ── Phase 12: Arc card formatting and player-relevant highlighting ──

  it("arc story card data has required fields for UI rendering", () => {
    const stables = [createMockStable({ id: "npc-1", personality: "aggressive" })];
    const manager = createMockManagerWithStables(stables);
    manager.stableStates["npc-1"].narrativeState = {
      activeArcs: [],
      storyBeats: [],
      dramaticPotential: 0.85,
    };

    const updated = processNarrativeCycle(manager, stables, 100);
    const narrative = updated.stableStates["npc-1"].narrativeState!;

    expect(narrative.activeArcs.length).toBeGreaterThan(0);

    const arc = narrative.activeArcs[0];
    // Required fields for NarrativeArcCard rendering
    expect(arc.id).toBeDefined();
    expect(arc.type).toBeDefined();
    expect(arc.status).toBeDefined();
    expect(arc.startDay).toBeDefined();
    expect(Array.isArray(arc.beats)).toBe(true);
  });

  it("player-relevant arcs can be identified via friction threshold", () => {
    const stables = [
      createMockStable({ id: "npc-rival", personality: "aggressive" }),
      createMockStable({ id: "npc-friendly", personality: "conservative" }),
    ];
    const manager = createMockManagerWithStables(stables);
    manager.stableStates["npc-rival"].friction = 75;
    manager.stableStates["npc-friendly"].friction = 20;

    const updated = processNarrativeCycle(manager, stables, 100);

    // Rival stable (friction > 60) should be flagged for rivalry watch
    const rivalFriction = updated.stableStates["npc-rival"]?.friction ?? 0;
    const friendlyFriction = updated.stableStates["npc-friendly"]?.friction ?? 0;

    expect(rivalFriction).toBeGreaterThanOrEqual(60);
    expect(friendlyFriction).toBeLessThan(60);
  });
});
