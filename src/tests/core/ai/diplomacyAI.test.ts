/**
 * Tests for diplomacyAI - NPC-to-NPC diplomatic system
 * Tests relationship management, alliance formation, cartel coordination,
 * and trust dynamics between NPC stables
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeRelationships,
  evaluateAllianceOpportunity,
  formAlliance,
  breakAlliance,
  updateTrust,
  evaluateCartelFormation,
  formCartel,
  processDiplomaticInteractions,
  processClaimingFriction,
} from "@/core/ai/diplomacyAI";
import type { Stable, GameState } from "@/game/types";
import type { NpcAIManager, StableAIState, NpcRelationship } from "@/core/ai/npcCycleAI";
import { createTestStable } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    name: "Test Stable",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockAIState(stableId: string): StableAIState {
  return {
    stableId,
    personalityState: {
      personality: "aggressive",
      conservatism: 0.3,
      innovation: 0.7,
      learningRate: 0.7,
      memoryDepth: 30,
      adaptationSpeed: 0.8,
      strategicHorizon: 7,
      competitiveAwareness: 0.6,
      strategyConfidence: 0.5,
    } as any,
    learningState: {
      outcomes: [],
      adaptations: {},
    } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
  } as any;
}

function createMockManager(
  stableIds: string[] = ["stable-1", "stable-2", "stable-3"],
): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const id of stableIds) {
    stableStates[id] = createMockAIState(id);
  }
  return {
    stableStates,
    globalDay: 100,
    regionalKings: {},
  };
}

describe("initializeRelationships", () => {
  it("creates empty relationship records for all NPC stables", () => {
    const manager = createMockManager(["s1", "s2", "s3"]);
    const stables = [
      createMockStable({ id: "s1" }),
      createMockStable({ id: "s2" }),
      createMockStable({ id: "s3" }),
    ];
    const result = initializeRelationships(manager, stables);
    expect(result.stableStates["s1"].npcRelationships).toBeDefined();
    expect(result.stableStates["s2"].npcRelationships).toBeDefined();
    expect(result.stableStates["s3"].npcRelationships).toBeDefined();
  });

  it("initializes trust at 0 (neutral) for all pairs", () => {
    const manager = createMockManager(["s1", "s2"]);
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    const result = initializeRelationships(manager, stables);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(0);
    expect(result.stableStates["s2"].npcRelationships!["s1"].trust).toBe(0);
  });

  it("does not overwrite existing relationships", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 50, allianceType: null, history: [] },
    };
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    const result = initializeRelationships(manager, stables);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(50);
  });
});

describe("evaluateAllianceOpportunity", () => {
  it("returns null when trust is too low", () => {
    const stable1 = createMockStable({ id: "s1", personality: "aggressive" });
    const stable2 = createMockStable({ id: "s2", personality: "aggressive" });
    const rel: NpcRelationship = { trust: 10, allianceType: null, history: [] };
    const result = evaluateAllianceOpportunity(stable1, stable2, rel);
    expect(result).toBeNull();
  });

  it("returns alliance type when trust is high enough", () => {
    const stable1 = createMockStable({ id: "s1", personality: "breeder" });
    const stable2 = createMockStable({ id: "s2", personality: "breeder" });
    const rel: NpcRelationship = { trust: 60, allianceType: null, history: [] };
    const result = evaluateAllianceOpportunity(stable1, stable2, rel);
    expect(result).not.toBeNull();
    expect(result).toBe("breeding_partnership");
  });

  it("returns racing_coalition for win-now personalities with high trust", () => {
    const stable1 = createMockStable({ id: "s1", personality: "win-now" });
    const stable2 = createMockStable({ id: "s2", personality: "win-now" });
    const rel: NpcRelationship = { trust: 55, allianceType: null, history: [] };
    const result = evaluateAllianceOpportunity(stable1, stable2, rel);
    expect(result).toBe("racing_coalition");
  });

  it("returns economic_cartel for trader personalities with high trust", () => {
    const stable1 = createMockStable({ id: "s1", personality: "trader" });
    const stable2 = createMockStable({ id: "s2", personality: "trader" });
    const rel: NpcRelationship = { trust: 50, allianceType: null, history: [] };
    const result = evaluateAllianceOpportunity(stable1, stable2, rel);
    expect(result).toBe("economic_cartel");
  });
});

describe("formAlliance", () => {
  it("sets allianceType on both stables' relationships", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 60, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 60, allianceType: null, history: [] },
    };
    const result = formAlliance(manager, "s1", "s2", "breeding_partnership", 100);
    expect(result.stableStates["s1"].npcRelationships!["s2"].allianceType).toBe(
      "breeding_partnership",
    );
    expect(result.stableStates["s2"].npcRelationships!["s1"].allianceType).toBe(
      "breeding_partnership",
    );
  });

  it("records diplomatic event in history", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 60, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 60, allianceType: null, history: [] },
    };
    const result = formAlliance(manager, "s1", "s2", "breeding_partnership", 100);
    expect(result.stableStates["s1"].npcRelationships!["s2"].history).toHaveLength(1);
    expect(result.stableStates["s1"].npcRelationships!["s2"].history[0].type).toBe(
      "alliance_formed",
    );
  });

  it("sets allianceSinceDay", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 60, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 60, allianceType: null, history: [] },
    };
    const result = formAlliance(manager, "s1", "s2", "breeding_partnership", 100);
    expect(result.stableStates["s1"].npcRelationships!["s2"].allianceSinceDay).toBe(100);
  });
});

describe("breakAlliance", () => {
  it("sets allianceType to null on both sides", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 30, allianceType: "breeding_partnership", allianceSinceDay: 50, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 30, allianceType: "breeding_partnership", allianceSinceDay: 50, history: [] },
    };
    const result = breakAlliance(manager, "s1", "s2", 100, "betrayal");
    expect(result.stableStates["s1"].npcRelationships!["s2"].allianceType).toBeNull();
    expect(result.stableStates["s2"].npcRelationships!["s1"].allianceType).toBeNull();
  });

  it("records alliance_broken event in history", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 30, allianceType: "breeding_partnership", history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 30, allianceType: "breeding_partnership", history: [] },
    };
    const result = breakAlliance(manager, "s1", "s2", 100, "betrayal");
    const events = result.stableStates["s1"].npcRelationships!["s2"].history;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("alliance_broken");
  });
});

describe("updateTrust", () => {
  it("increases trust by specified amount", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 30, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 30, allianceType: null, history: [] },
    };
    const result = updateTrust(manager, "s1", "s2", 10);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(40);
  });

  it("clamps trust to maximum of 100", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 95, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 95, allianceType: null, history: [] },
    };
    const result = updateTrust(manager, "s1", "s2", 10);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(100);
  });

  it("clamps trust to minimum of -100", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: -95, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: -95, allianceType: null, history: [] },
    };
    const result = updateTrust(manager, "s1", "s2", -10);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(-100);
  });

  it("updates trust on both sides symmetrically", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 30, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 30, allianceType: null, history: [] },
    };
    const result = updateTrust(manager, "s1", "s2", 15);
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBe(45);
    expect(result.stableStates["s2"].npcRelationships!["s1"].trust).toBe(45);
  });
});

describe("evaluateCartelFormation", () => {
  it("returns null when fewer than 2 stables have high trust", () => {
    const manager = createMockManager(["s1", "s2", "s3"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 20, allianceType: null, history: [] },
      s3: { trust: 10, allianceType: null, history: [] },
    };
    const result = evaluateCartelFormation(manager, "s1", ["s2", "s3"]);
    expect(result).toBeNull();
  });

  it("returns cartel info when 2+ stables have high mutual trust", () => {
    const manager = createMockManager(["s1", "s2", "s3"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 70, allianceType: null, history: [] },
      s3: { trust: 65, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 70, allianceType: null, history: [] },
      s3: { trust: 60, allianceType: null, history: [] },
    };
    manager.stableStates["s3"].npcRelationships = {
      s1: { trust: 65, allianceType: null, history: [] },
      s2: { trust: 60, allianceType: null, history: [] },
    };
    const result = evaluateCartelFormation(manager, "s1", ["s2", "s3"]);
    expect(result).not.toBeNull();
    expect(result!.memberStableIds).toContain("s1");
    expect(result!.memberStableIds.length).toBeGreaterThanOrEqual(2);
  });
});

describe("formCartel", () => {
  it("adds cartel to manager.activeCartels", () => {
    const manager = createMockManager(["s1", "s2", "s3"]);
    const result = formCartel(manager, ["s1", "s2", "s3"], "breeding");
    expect(result.activeCartels).toBeDefined();
    expect(result.activeCartels).toHaveLength(1);
    expect(result.activeCartels![0].memberStableIds).toEqual(["s1", "s2", "s3"]);
    expect(result.activeCartels![0].type).toBe("breeding");
  });

  it("does not create duplicate cartels with same members", () => {
    const manager = createMockManager(["s1", "s2"]);
    const result1 = formCartel(manager, ["s1", "s2"], "breeding");
    const result2 = formCartel(result1, ["s1", "s2"], "breeding");
    expect(result2.activeCartels).toHaveLength(1);
  });
});

describe("processDiplomaticInteractions", () => {
  it("returns manager unchanged when no relationships exist", () => {
    const manager = createMockManager(["s1"]);
    const stables = [createMockStable({ id: "s1" })];
    const result = processDiplomaticInteractions(manager, stables, 100);
    expect(result).toEqual(manager);
  });

  it("evaluates alliance opportunities for stables with high trust", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 65, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 65, allianceType: null, history: [] },
    };
    const stables = [
      createMockStable({ id: "s1", personality: "breeder" }),
      createMockStable({ id: "s2", personality: "breeder" }),
    ];
    const result = processDiplomaticInteractions(manager, stables, 100);
    expect(result.stableStates["s1"].npcRelationships!["s2"].allianceType).not.toBeNull();
  });

  it("breaks alliances when trust drops below threshold", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: -20, allianceType: "breeding_partnership", allianceSinceDay: 50, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: -20, allianceType: "breeding_partnership", allianceSinceDay: 50, history: [] },
    };
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2" })];
    const result = processDiplomaticInteractions(manager, stables, 100);
    expect(result.stableStates["s1"].npcRelationships!["s2"].allianceType).toBeNull();
  });
});

describe("processClaimingFriction", () => {
  it("reduces trust when an NPC claims a horse from another NPC", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 50, allianceType: null, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 50, allianceType: null, history: [] },
    };

    const result = processClaimingFriction(manager, "s1", "s2");
    expect(result.stableStates["s1"].npcRelationships!["s2"].trust).toBeLessThan(50);
  });

  it("applies larger trust reduction when claiming from an ally", () => {
    const manager = createMockManager(["s1", "s2"]);
    manager.stableStates["s1"].npcRelationships = {
      s2: { trust: 60, allianceType: "breeding_partnership", allianceSinceDay: 10, history: [] },
    };
    manager.stableStates["s2"].npcRelationships = {
      s1: { trust: 60, allianceType: "breeding_partnership", allianceSinceDay: 10, history: [] },
    };

    const result = processClaimingFriction(manager, "s1", "s2");
    const trustAfter = result.stableStates["s1"].npcRelationships!["s2"].trust;
    // Alliance betrayal should cause -30 trust
    expect(trustAfter).toBe(30);
  });

  it("does nothing when claimant and previous owner are the same", () => {
    const manager = createMockManager(["s1"]);
    manager.stableStates["s1"].npcRelationships = {};

    const result = processClaimingFriction(manager, "s1", "s1");
    expect(result).toEqual(manager);
  });

  it("does nothing when no relationship exists between stables", () => {
    const manager = createMockManager(["s1", "s2"]);
    // No relationships initialized

    const result = processClaimingFriction(manager, "s1", "s2");
    expect(result).toEqual(manager);
  });
});
