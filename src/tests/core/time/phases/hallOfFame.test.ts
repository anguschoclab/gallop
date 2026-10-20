import { describe, it, expect } from "vitest";
import { hallOfFamePhase } from "@/platform/time/phases/hallOfFame";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";

describe("hallOfFamePhase", () => {
  it("should not induct active horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      lifecycleStatus: "active",
      fame: 90,
      lifetimeEarnings: 1000000,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts.find((i) => i.type === "hall_of_fame_induction")).toBeUndefined();
  });

  it("should not induct horses with fame < 85", () => {
    const horse = createTestHorse({
      id: "horse-1",
      lifecycleStatus: "retired",
      fame: 80,
      lifetimeEarnings: 1000000,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts.find((i) => i.type === "hall_of_fame_induction")).toBeUndefined();
  });

  it("should not induct horses with earnings < $500,000", () => {
    const horse = createTestHorse({
      id: "horse-1",
      lifecycleStatus: "retired",
      fame: 90,
      lifetimeEarnings: 400000,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts.find((i) => i.type === "hall_of_fame_induction")).toBeUndefined();
  });

  it("should not induct already-inducted horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      lifecycleStatus: "retired",
      fame: 90,
      lifetimeEarnings: 1000000,
    });
    const state = makeGameState({
      horses: h2r([horse]),
      hallOfFame: [
        {
          horseId: "horse-1",
          name: horse.name,
          inductionDay: 1,
          inductionYear: 1,
          achievements: [],
          lifetimeEarnings: 0,
          lifetimeStarts: 0,
          lifetimeWins: 0,
          g1Wins: 0,
          bestBeyer: 0,
        },
      ] as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts.find((i) => i.type === "hall_of_fame_induction")).toBeUndefined();
  });

  it("should handle empty horses gracefully", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts).toEqual([]);
  });

  it("should preserve existing impacts", () => {
    const state = makeGameState({ horses: {} }) as GameState;
    const existingImpact = { id: "old-1", type: "log", text: "old", day: 1 } as any;
    const context = makePipelineContext({
      state,
      newDay: 100,
      impacts: [existingImpact],
    }) as PipelineContext;

    const result = hallOfFamePhase.execute(context);
    expect(result.impacts).toContainEqual(existingImpact);
  });

  it("maps inductionDay to inductionYear on year boundaries (day 365 = year 1)", () => {
    const g1Wins = Array.from({ length: 3 }, (_, i) => ({
      raceId: `g1-${i}`,
      raceName: `G1 Race ${i}`,
      position: 1,
      day: 10 + i,
      grade: "G1" as const,
      purseEarned: 200000,
    }));
    const horse = createTestHorse({
      id: "horse-1",
      lifecycleStatus: "retired",
      fame: 90,
      lifetimeEarnings: 1000000,
      raceHistory: g1Wins,
    });
    const state = makeGameState({ horses: h2r([horse]) }) as GameState;

    const day365 = hallOfFamePhase
      .execute(makePipelineContext({ state, newDay: 365 }) as PipelineContext)
      .impacts.find((i) => i.type === "hall_of_fame_induction");
    expect((day365 as any).entry.inductionYear).toBe(1);

    const day366 = hallOfFamePhase
      .execute(makePipelineContext({ state, newDay: 366 }) as PipelineContext)
      .impacts.find((i) => i.type === "hall_of_fame_induction");
    expect((day366 as any).entry.inductionYear).toBe(2);
  });
});
