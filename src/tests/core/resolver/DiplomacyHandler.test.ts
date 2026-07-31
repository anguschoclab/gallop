/**
 * Tests for DiplomacyHandler - handles diplomatic and cartel impacts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DiplomacyHandler } from "@/core/resolver/handlers/DiplomacyHandler";
import type { GameState } from "@/game/types";
import type { NpcAIManager, StableAIState } from "@/core/ai/npcCycleAI";

function createMockAIState(stableId: string): StableAIState {
  return {
    stableId,
    personalityState: { personality: "aggressive" } as any,
    learningState: { outcomes: [], adaptations: {} } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
    npcRelationships: {},
  } as any;
}

function createMockGameState(): GameState {
  const stableStates: Record<string, StableAIState> = {
    s1: createMockAIState("s1"),
    s2: createMockAIState("s2"),
    s3: createMockAIState("s3"),
  };
  stableStates["s1"].npcRelationships = {
    s2: { trust: 50, allianceType: null, history: [] },
    s3: { trust: 30, allianceType: null, history: [] },
  };
  stableStates["s2"].npcRelationships = {
    s1: { trust: 50, allianceType: null, history: [] },
    s3: { trust: 40, allianceType: null, history: [] },
  };
  stableStates["s3"].npcRelationships = {
    s1: { trust: 30, allianceType: null, history: [] },
    s2: { trust: 40, allianceType: null, history: [] },
  };

  const aiManager: NpcAIManager = {
    stableStates,
    globalDay: 100,
    regionalKings: {},
  };

  return {
    npcStables: [],
    horses: {},
    npcAIManager: aiManager,
  } as any;
}

describe("DiplomacyHandler", () => {
  let handler: DiplomacyHandler;

  beforeEach(() => {
    handler = new DiplomacyHandler();
  });

  describe("canHandle", () => {
    it("handles diplomatic impact type", () => {
      expect(handler.canHandle("diplomatic")).toBe(true);
    });

    it("handles cartel impact type", () => {
      expect(handler.canHandle("cartel")).toBe(true);
    });

    it("does not handle other impact types", () => {
      expect(handler.canHandle("financial")).toBe(false);
      expect(handler.canHandle("horse")).toBe(false);
    });
  });

  describe("handle - diplomatic", () => {
    it("updates trust bidirectionally for cooperation", () => {
      const state = createMockGameState();
      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "diplomatic" as const,
        sourceStableId: "s1",
        targetStableId: "s2",
        action: "cooperation" as const,
        trustChange: 10,
      };

      handler.handle(state as any, impact as any);

      const aiManager = (state as any).npcAIManager as NpcAIManager;
      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].trust).toBe(60);
      expect(aiManager.stableStates["s2"].npcRelationships!["s1"].trust).toBe(60);
    });

    it("adds history entries for diplomatic events", () => {
      const state = createMockGameState();
      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "diplomatic" as const,
        sourceStableId: "s1",
        targetStableId: "s2",
        action: "alliance_formed" as const,
        trustChange: 20,
      };

      handler.handle(state as any, impact as any);

      const aiManager = (state as any).npcAIManager as NpcAIManager;
      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].history).toHaveLength(1);
      expect(aiManager.stableStates["s2"].npcRelationships!["s1"].history).toHaveLength(1);
    });

    it("clamps trust to -100 minimum for betrayal", () => {
      const state = createMockGameState();
      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "diplomatic" as const,
        sourceStableId: "s1",
        targetStableId: "s2",
        action: "betrayal" as const,
        trustChange: -200,
      };

      handler.handle(state as any, impact as any);

      const aiManager = (state as any).npcAIManager as NpcAIManager;
      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].trust).toBe(-100);
      expect(aiManager.stableStates["s2"].npcRelationships!["s1"].trust).toBe(-100);
    });
  });

  describe("handle - cartel", () => {
    it("sets economic_cartel alliance type for cartel_formed", () => {
      const state = createMockGameState();
      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "cartel" as const,
        stableIds: ["s1", "s2"],
        action: "cartel_formed" as const,
      };

      handler.handle(state as any, impact as any);

      const aiManager = (state as any).npcAIManager as NpcAIManager;
      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].allianceType).toBe(
        "economic_cartel",
      );
      expect(aiManager.stableStates["s2"].npcRelationships!["s1"].allianceType).toBe(
        "economic_cartel",
      );
    });

    it("removes economic_cartel alliance type for cartel_dissolved", () => {
      const state = createMockGameState();
      // First form a cartel
      const aiManager = (state as any).npcAIManager as NpcAIManager;
      aiManager.stableStates["s1"].npcRelationships!["s2"].allianceType = "economic_cartel";
      aiManager.stableStates["s2"].npcRelationships!["s1"].allianceType = "economic_cartel";

      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "cartel" as const,
        stableIds: ["s1", "s2"],
        action: "cartel_dissolved" as const,
      };

      handler.handle(state as any, impact as any);

      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].allianceType).toBeNull();
      expect(aiManager.stableStates["s2"].npcRelationships!["s1"].allianceType).toBeNull();
    });

    it("does not change state for market_coordinated action", () => {
      const state = createMockGameState();
      const aiManager = (state as any).npcAIManager as NpcAIManager;
      const before = aiManager.stableStates["s1"].npcRelationships!["s2"].allianceType;

      const impact = {
        id: "i1",
        intentId: "",
        day: 100,
        phase: "diplomacy",
        logLevel: "conditional" as const,
        type: "cartel" as const,
        stableIds: ["s1", "s2"],
        action: "market_coordinated" as const,
      };

      handler.handle(state as any, impact as any);

      expect(aiManager.stableStates["s1"].npcRelationships!["s2"].allianceType).toBe(before);
    });
  });
});
