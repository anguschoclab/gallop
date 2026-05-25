/**
 * Tests for upkeep phase
 */

import { describe, it, expect } from "vitest";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Stable } from "@/game/types";

describe("upkeepPhase", () => {
  it("should deduct $50 per player horse", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: [
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          owned: true,
        }),
        createTestHorse({
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          owned: true,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(9900); // 10000 - (2 * 50)
  });

  it("should not deduct for horses with stableId (NPC horses)", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: [
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          owned: false,
          stableId: "npc-stable-1",
        }),
      ],
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
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
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction for NPC horse
  });

  it("should deduct $50 per horse from each NPC stable", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: [
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          owned: false,
          stableId: "npc-stable-1",
        }),
        createTestHorse({
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          owned: false,
          stableId: "npc-stable-2",
        }),
      ],
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
        }),
        createTestStable({
          id: "npc-stable-2",
          name: "NPC Stable 2",
          cash: 3000,
          personality: "trader",
          reputation: 60,
          tier: "mid",
          owner: "Owner 2",
          founded: 1,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.npcStables[0].cash).toBe(4950); // 5000 - 50
    expect(result.state.npcStables[1].cash).toBe(2950); // 3000 - 50
  });

  it("should handle zero horses correctly", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: [],
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
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
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction
    expect(result.state.npcStables[0].cash).toBe(5000); // No deduction
  });

  it("should preserve other context properties", () => {
    const state: GameState = makeGameState({
      day: 1,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
      logs: [{ day: 1, text: "Existing log" }],
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.logs).toEqual([{ day: 1, text: "Existing log" }]);
    expect(result.state.day).toBe(1);
  });
});
