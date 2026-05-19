/**
 * Tests for npcCycle phase
 */

import { describe, it, expect } from "vitest";
import { npcCyclePhase } from "@/core/time/phases/npcCycle";
import { createTestStable } from "@/tests/helpers";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";

describe("npcCyclePhase", () => {
  it("should skip when no NPC stables", () => {
    const state: GameState = makeGameState({
      day: 10,
      npcStables: [],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = npcCyclePhase.execute(context);
    expect(result.state).toBeDefined();
  });

  it("should call runNpcCycle and update state", () => {
    const state: GameState = makeGameState({
      day: 10,
      npcStables: [
        createTestStable({
          id: "stable-1",
          name: "NPC Stable",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = npcCyclePhase.execute(context);
    // Phase wraps runNpcCycle from npc/npcCycle
    // Just verify it doesn't crash and returns expected structure
    expect(result.state).toBeDefined();
    expect(result.state.horses).toBeDefined();
    expect(result.state.races).toBeDefined();
  });

  it("should have correct order", () => {
    expect(npcCyclePhase.order).toBe(80);
  });

  it("should have correct name", () => {
    expect(npcCyclePhase.name).toBe("npcCycle");
  });

  it("should preserve logs", () => {
    const state: GameState = makeGameState({
      day: 10,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
      logs: [{ day: 9, text: "Existing log" }],
    }) as PipelineContext;

    const result = npcCyclePhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });
});
