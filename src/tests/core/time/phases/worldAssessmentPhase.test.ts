import { describe, it, expect } from "vitest";
import { worldAssessmentPhase } from "@/core/time/phases/worldAssessmentPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("worldAssessmentPhase", () => {
  it("should return context unchanged when no NPC stables", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = worldAssessmentPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should return context unchanged when no npcAIManager", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: undefined,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = worldAssessmentPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should compute worldAssessment and cache it on context", () => {
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

    const result = worldAssessmentPhase.execute(context);
    expect((result as any).worldAssessment).toBeDefined();
  });

  it("should update stable states with worldAssessment and financialDistress", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: ["horse-1"] });
    const horse = createTestHorse({
      id: "horse-1",
      stableId: "npc-1",
      ownership: { type: "unowned" },
    });
    const aiManager = {
      stableStates: { "npc-1": {} },
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse]),
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = worldAssessmentPhase.execute(context);
    const updatedManager = result.state.npcAIManager as any;
    expect(updatedManager.stableStates["npc-1"].worldAssessment).toBeDefined();
    expect(updatedManager.stableStates["npc-1"].financialDistress).toBeDefined();
  });

  it("should create AI state for stables that dont have one yet", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: [] });
    const aiManager = {
      stableStates: {},
      globalDay: 1,
      regionalKings: {},
    };
    const state = makeGameState({
      npcStables: [stable],
      npcAIManager: aiManager as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = worldAssessmentPhase.execute(context);
    const updatedManager = result.state.npcAIManager as any;
    expect(updatedManager.stableStates["npc-1"]).toBeDefined();
    expect(updatedManager.stableStates["npc-1"].worldAssessment).toBeDefined();
  });
});
