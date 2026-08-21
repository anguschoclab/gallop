import { describe, it, expect } from "vitest";
import { schedulerPhase } from "@/core/time/phases/schedulerPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("schedulerPhase", () => {
  it("should return context unchanged when no campaigns exist", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should return context unchanged when campaigns is undefined", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should skip campaigns for non-owned horses", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: { type: "unowned" } });
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      horses: h2r([horse]),
      campaigns: [campaign as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result.state.campaigns).toHaveLength(1);
  });

  it("should handle empty state gracefully", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });
});
