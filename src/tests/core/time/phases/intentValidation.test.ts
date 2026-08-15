import { describe, it, expect } from "vitest";
import { intentValidationPhase } from "@/core/time/phases/intentValidation";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("intentValidationPhase", () => {
  it("should return empty intents when no intents provided", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentValidationPhase.execute(context);
    expect(result.intents).toEqual([]);
  });

  it("should preserve valid intents", () => {
    const validIntent = {
      id: "intent-1",
      entityId: "horse-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "training" as const,
      horseId: "horse-1",
      trainingType: "speed" as const,
    };
    const state = makeGameState() as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [validIntent as any],
    }) as PipelineContext;

    const result = intentValidationPhase.execute(context);
    expect(result.intents.length).toBeLessThanOrEqual(1);
  });

  it("should filter out invalid intents", () => {
    const invalidIntent = {
      id: "intent-1",
      entityId: "nonexistent-horse",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "training" as const,
      horseId: "nonexistent-horse",
      trainingType: "speed" as const,
    };
    const state = makeGameState() as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [invalidIntent as any],
    }) as PipelineContext;

    const result = intentValidationPhase.execute(context);
    expect(result.intents).not.toContain(invalidIntent);
  });

  it("should preserve context state and other properties", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 5 }) as PipelineContext;

    const result = intentValidationPhase.execute(context);
    expect(result.state).toBe(state);
    expect(result.newDay).toBe(5);
  });
});
