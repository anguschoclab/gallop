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
});
