import { describe, it, expect } from "vitest";
import { nameReservationPhase } from "@/core/time/phases/nameReservation";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("nameReservationPhase", () => {
  it("should cleanup expired name reservations", () => {
    const expiredReservation = {
      name: "Old Horse",
      releasedOnDay: 100,
    };
    const activeReservation = {
      name: "Recent Horse",
      releasedOnDay: 9000,
    };
    const state = makeGameState({
      reservedHorseNames: [expiredReservation, activeReservation] as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 200 }) as PipelineContext;

    const result = nameReservationPhase.execute(context);
    expect(result.state.reservedHorseNames).toHaveLength(1);
    expect(result.state.reservedHorseNames![0].name).toBe("Recent Horse");
  });

  it("should handle empty reservations gracefully", () => {
    const state = makeGameState({ reservedHorseNames: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = nameReservationPhase.execute(context);
    expect(result.state.reservedHorseNames).toEqual([]);
  });

  it("should handle undefined reservations gracefully", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 100 }) as PipelineContext;

    const result = nameReservationPhase.execute(context);
    expect(result.state.reservedHorseNames).toBeDefined();
  });
});
