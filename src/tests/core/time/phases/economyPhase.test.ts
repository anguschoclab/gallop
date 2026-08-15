import { describe, it, expect } from "vitest";
import { economyPhase } from "@/core/time/phases/economyPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("economyPhase", () => {
  it("should return context unchanged when no NPC stables", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = economyPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should process economic cycle and update npcAIManager", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: { "npc-1": {} },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = economyPhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should create default aiManager if undefined", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: undefined,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = economyPhase.execute(context);
    expect(result.state.npcAIManager).toBeDefined();
  });

  it("should set economicTrend on context", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: { "npc-1": {} },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = economyPhase.execute(context);
    expect((result as any).economicTrend).toBeDefined();
  });
});
