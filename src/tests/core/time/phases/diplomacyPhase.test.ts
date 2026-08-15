import { describe, it, expect } from "vitest";
import { diplomacyPhase } from "@/core/time/phases/diplomacyPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("diplomacyPhase", () => {
  it("should return context unchanged when no NPC stables", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should initialize relationships when not present", () => {
    const stable1 = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "npc-2", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {
        "npc-1": {},
        "npc-2": {},
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable1, stable2],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should process diplomatic interactions", () => {
    const stable1 = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "npc-2", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {
        "npc-1": { npcRelationships: {} },
        "npc-2": { npcRelationships: {} },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable1, stable2],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should create default aiManager if undefined", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: undefined,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("converts DiplomaticActionIntent with propose_alliance into DiplomaticImpact", () => {
    const stable1 = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "npc-2", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {
        "npc-1": {
          npcRelationships: { "npc-2": { trust: 50, allianceType: null, history: [] } },
        },
        "npc-2": {
          npcRelationships: { "npc-1": { trust: 50, allianceType: null, history: [] } },
        },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable1, stable2],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 10,
      intents: [
        {
          id: "intent-1",
          entityId: "npc-1",
          source: "npc",
          sourceId: "npc-1",
          day: 10,
          priority: 30,
          type: "diplomatic_action",
          targetStableId: "npc-2",
          action: "propose_alliance",
          allianceType: "non_aggression",
        } as any,
      ],
    }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    const diplomaticImpacts = result.impacts.filter((i) => i.type === "diplomatic");
    expect(diplomaticImpacts.length).toBeGreaterThan(0);
  });

  it("converts CartelActionIntent with join_cartel into CartelImpact", () => {
    const stable1 = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "npc-2", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {
        "npc-1": {
          npcRelationships: { "npc-2": { trust: 70, allianceType: null, history: [] } },
        },
        "npc-2": {
          npcRelationships: { "npc-1": { trust: 70, allianceType: null, history: [] } },
        },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable1, stable2],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 10,
      intents: [
        {
          id: "intent-2",
          entityId: "npc-1",
          source: "npc",
          sourceId: "npc-1",
          day: 10,
          priority: 25,
          type: "cartel_action",
          action: "join_cartel",
          targetStableIds: ["npc-2"],
          marketAction: "avoid_bidding_war",
        } as any,
      ],
    }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    const cartelImpacts = result.impacts.filter((i) => i.type === "cartel");
    expect(cartelImpacts.length).toBeGreaterThan(0);
  });

  it("converts DiplomaticActionIntent with break_alliance into DiplomaticImpact", () => {
    const stable1 = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "npc-2", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {
        "npc-1": {
          npcRelationships: {
            "npc-2": { trust: 30, allianceType: "non_aggression_pact", history: [] },
          },
        },
        "npc-2": {
          npcRelationships: {
            "npc-1": { trust: 30, allianceType: "non_aggression_pact", history: [] },
          },
        },
      },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable1, stable2],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 10,
      intents: [
        {
          id: "intent-3",
          entityId: "npc-1",
          source: "npc",
          sourceId: "npc-1",
          day: 10,
          priority: 60,
          type: "diplomatic_action",
          targetStableId: "npc-2",
          action: "break_alliance",
        } as any,
      ],
    }) as PipelineContext;

    const result = diplomacyPhase.execute(context);
    const diplomaticImpacts = result.impacts.filter((i) => i.type === "diplomatic");
    expect(diplomaticImpacts.length).toBeGreaterThan(0);
  });
});
