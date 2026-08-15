import { describe, it, expect } from "vitest";
import { claimResolutionPhase } from "@/core/time/phases/claimResolution";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("claimResolutionPhase", () => {
  it("should return context unchanged when no claims today", () => {
    const state = makeGameState({ claims: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = claimResolutionPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should return context unchanged when claims exist but no resolved claiming races today", () => {
    const claim = {
      id: "claim-1",
      raceId: "race-1",
      horseId: "horse-1",
      claimantStableId: "npc-1",
      price: 50000,
      day: 5,
    };
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 5,
      entries: [],
      fieldSize: 10,
      resolved: true,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
      claiming: { price: 50000 },
    };
    const state = makeGameState({
      claims: [claim as any],
      races: { "race-1": race as any },
    }) as GameState;
    // Race day is 5, but we're on day 10 — no claims today
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = claimResolutionPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should handle empty claims gracefully", () => {
    const state = makeGameState({ claims: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = claimResolutionPhase.execute(context);
    expect(result).toBe(context);
  });
});
