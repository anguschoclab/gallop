/**
 * Tests for npcCycle phase
 */

import { describe, it, expect } from "vitest";
import { npcCyclePhase } from "@/core/time/phases/npcCycle";
import { createTestStable, createTestHorse } from "@/tests/helpers";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race } from "@/game/types";
import { makeUnowned } from "@/core/horse/ownership";

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

  it("generates fan_count_change impacts for fan gains from races", () => {
    const stable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 100000,
      personality: "aggressive",
      tier: "elite",
    });
    const horse = createTestHorse({
      id: "h1",
      fame: 0,
      fanCount: 0,
      ownership: makeUnowned(),
    });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 10,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { grade: "G1" } as any,
    } as Race;

    const state: GameState = makeGameState({
      day: 10,
      npcStables: [stable],
      horses: { h1: horse } as any,
      races: { r1: race } as any,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = npcCyclePhase.execute(context);
    const fanImpacts = result.impacts.filter((i: any) => i.type === "fan_count_change");
    expect(fanImpacts.length).toBeGreaterThan(0);
  });

  it("does not generate fan decay impacts for horses within grace period", () => {
    const stable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 100000,
      personality: "aggressive",
      tier: "elite",
    });
    const horse = createTestHorse({
      id: "h1",
      fame: 10,
      fanCount: 50000,
      lastRaceDay: 8,
      ownership: makeUnowned(),
    });

    const state: GameState = makeGameState({
      day: 10,
      npcStables: [stable],
      horses: { h1: horse } as any,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = npcCyclePhase.execute(context);
    const fanDecayImpacts = result.impacts.filter(
      (i: any) => i.type === "fan_count_change" && i.delta < 0,
    );
    expect(fanDecayImpacts.length).toBe(0);
  });
});
