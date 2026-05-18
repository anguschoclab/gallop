/**
 * Integration tests for intent/resolution pipeline
 */

import { describe, it, expect } from "vitest";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/state";
import { createRng } from "@/game/rng";
import type { TrainingIntent } from "@/core/resolver/intents";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";

describe("Intent/Resolution Pipeline Integration", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
  });

  const createTestContext = (state: GameState): PipelineContext => ({
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: createRng(12345),
    intents: [],
    impacts: [],
    impactLog: [],
  });

  it("should execute full pipeline with training intent", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2, // Younger horse has more room to grow
      peakAge: 4,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      pendingIntents: [
        {
          id: "intent-1",
          day: 1,
          type: "training",
          entityId: "horse-1",
          priority: 100,
          source: "player",
          horseId: "horse-1",
          trainingType: "speed",
        },
      ],
    };

    const context = createTestContext(state);
    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];
    const result = executePipeline(phases, context);

    // Energy should decrease (deterministic)
    expect(result.state.horses[0].energy).toBeLessThan(80);
    // Stats may or may not increase depending on RNG, but should not decrease
    expect(result.state.horses[0].stats.speed).toBeGreaterThanOrEqual(30);
  });

  it("should handle multiple intents in single day", () => {
    const horse1 = createTestHorse({
      id: "horse-1",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2,
      peakAge: 4,
    });
    const horse2 = createTestHorse({
      id: "horse-2",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2,
      peakAge: 4,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse1, horse2],
      pendingIntents: [
        {
          id: "intent-1",
          day: 1,
          type: "training",
          entityId: "horse-1",
          priority: 100,
          source: "player",
          horseId: "horse-1",
          trainingType: "speed",
        },
        {
          id: "intent-2",
          day: 1,
          type: "training",
          entityId: "horse-2",
          priority: 100,
          source: "player",
          horseId: "horse-2",
          trainingType: "stamina",
        },
      ],
    };

    const context = createTestContext(state);
    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];
    const result = executePipeline(phases, context);

    // Energy should decrease for both horses (deterministic)
    expect(result.state.horses[0].energy).toBeLessThan(80);
    expect(result.state.horses[1].energy).toBeLessThan(80);
    // Stats should not decrease
    expect(result.state.horses[0].stats.speed).toBeGreaterThanOrEqual(30);
    expect(result.state.horses[1].stats.stamina).toBeGreaterThanOrEqual(30);
  });

  it("should produce deterministic results with same RNG seed", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2,
      peakAge: 4,
    });
    const state1: GameState = {
      ...createTestState(),
      horses: [horse],
      pendingIntents: [
        {
          id: "intent-1",
          day: 1,
          type: "training",
          entityId: "horse-1",
          priority: 100,
          source: "player",
          horseId: "horse-1",
          trainingType: "speed",
        },
      ],
    };

    const state2: GameState = JSON.parse(JSON.stringify(state1)) as GameState;

    const context1 = createTestContext(state1);
    const context2 = createTestContext(state2);
    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];

    const result1 = executePipeline(phases, context1);
    const result2 = executePipeline(phases, context2);

    expect(result1.state.horses[0].stats.speed).toBe(result2.state.horses[0].stats.speed);
    expect(result1.state.horses[0].energy).toBe(result2.state.horses[0].energy);
  });

  it("should clear pendingIntents after processing", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2,
      peakAge: 4,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      pendingIntents: [
        {
          id: "intent-1",
          day: 1,
          type: "training",
          entityId: "horse-1",
          priority: 100,
          source: "player",
          horseId: "horse-1",
          trainingType: "speed",
        },
      ],
    };

    const context = createTestContext(state);
    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];
    const result = executePipeline(phases, context);

    expect(result.state.pendingIntents).toHaveLength(0);
  });

  it("should preserve immutability of original state", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 },
      energy: 80,
      age: 2,
      peakAge: 4,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      pendingIntents: [
        {
          id: "intent-1",
          day: 1,
          type: "training",
          entityId: "horse-1",
          priority: 100,
          source: "player",
          horseId: "horse-1",
          trainingType: "speed",
        },
      ],
    };

    const originalCash = state.cash;
    const originalEnergy = state.horses[0].energy;

    const context = createTestContext(state);
    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];
    executePipeline(phases, context);

    expect(state.cash).toBe(originalCash);
    expect(state.horses[0].energy).toBe(originalEnergy);
  });
});
