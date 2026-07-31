/**
 * Integration tests for diplomacy system
 * Verifies diplomatic relationships are bidirectional, trust decay/growth
 * works over time, and alliances form/dissolve correctly.
 */

import { describe, it, expect } from "vitest";
import {
  initializeRelationships,
  formAlliance,
  breakAlliance,
  updateTrust,
  processDiplomaticInteractions,
  processClaimingFriction,
} from "@/core/ai/diplomacyAI";
import type { Stable } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";
import { createTestStable } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "s1",
    name: "Stable 1",
    cash: 200000,
    personality: "aggressive",
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
  return { stableStates, globalDay: 1, regionalKings: {} };
}

describe("Diplomacy Integration: bidirectional relationships", () => {
  it("initializeRelationships creates bidirectional relationships", () => {
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    const manager = createMockManager(["s1", "s2"]);

    const result = initializeRelationships(manager, stables);

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    const s2Rel = result.stableStates["s2"].npcRelationships?.["s1"];

    expect(s1Rel).toBeDefined();
    expect(s2Rel).toBeDefined();
    expect(s1Rel!.trust).toBe(0);
    expect(s2Rel!.trust).toBe(0);
  });

  it("formAlliance creates bidirectional alliance", () => {
    const stables = [
      createMockStable({ id: "s1", personality: "aggressive" }),
      createMockStable({ id: "s2", personality: "conservative" }),
    ];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);

    const result = formAlliance(manager, "s1", "s2", "racing_coalition", 10);

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    const s2Rel = result.stableStates["s2"].npcRelationships?.["s1"];

    expect(s1Rel?.allianceType).toBe("racing_coalition");
    expect(s2Rel?.allianceType).toBe("racing_coalition");
    expect(s1Rel?.allianceSinceDay).toBe(10);
    expect(s2Rel?.allianceSinceDay).toBe(10);
  });

  it("breakAlliance dissolves bidirectional alliance", () => {
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);
    manager = formAlliance(manager, "s1", "s2", "non_aggression_pact", 5);

    const result = breakAlliance(manager, "s1", "s2", 20, "betrayal");

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    const s2Rel = result.stableStates["s2"].npcRelationships?.["s1"];

    expect(s1Rel?.allianceType).toBeNull();
    expect(s2Rel?.allianceType).toBeNull();
  });
});

describe("Diplomacy Integration: trust dynamics over 30 days", () => {
  it("trust changes are bidirectional", () => {
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);

    const result = updateTrust(manager, "s1", "s2", 15);

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    const s2Rel = result.stableStates["s2"].npcRelationships?.["s1"];

    expect(s1Rel?.trust).toBe(15);
    expect(s2Rel?.trust).toBe(15);
  });

  it("trust is clamped at -100 and 100", () => {
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);

    const highTrust = updateTrust(manager, "s1", "s2", 150);
    expect(highTrust.stableStates["s1"].npcRelationships?.["s2"]?.trust).toBe(100);

    const lowTrust = updateTrust(highTrust, "s1", "s2", -250);
    expect(lowTrust.stableStates["s1"].npcRelationships?.["s2"]?.trust).toBe(-100);
  });

  it("processDiplomaticInteractions forms alliances when trust is high enough", () => {
    const stables = [
      createMockStable({ id: "s1", personality: "aggressive" }),
      createMockStable({ id: "s2", personality: "conservative" }),
      createMockStable({ id: "s3", personality: "breeder" }),
    ];
    let manager = createMockManager(["s1", "s2", "s3"]);
    manager = initializeRelationships(manager, stables);

    // Boost trust to trigger alliance formation
    manager = updateTrust(manager, "s1", "s2", 80);

    const result = processDiplomaticInteractions(manager, stables, 10);

    // s1 and s2 should have formed an alliance
    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    expect(s1Rel?.allianceType).not.toBeNull();
  });

  it("processDiplomaticInteractions breaks alliances when trust drops", () => {
    const stables = [
      createMockStable({ id: "s1", personality: "aggressive" }),
      createMockStable({ id: "s2", personality: "conservative" }),
    ];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);
    manager = formAlliance(manager, "s1", "s2", "racing_coalition", 5);
    manager = updateTrust(manager, "s1", "s2", -90); // Trust now at -90

    const result = processDiplomaticInteractions(manager, stables, 10);

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    expect(s1Rel?.allianceType).toBeNull();
  });
});

describe("Diplomacy Integration: claiming friction cascades", () => {
  it("processClaimingFriction reduces trust between claimant and previous owner", () => {
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    let manager = createMockManager(["s1", "s2"]);
    manager = initializeRelationships(manager, stables);

    const result = processClaimingFriction(manager, "s1", "s2");

    const s1Rel = result.stableStates["s1"].npcRelationships?.["s2"];
    expect(s1Rel!.trust).toBeLessThan(0);
  });
});
