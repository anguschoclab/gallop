/**
 * Tests for intent collection phase
 */

import { describe, it, expect } from "vitest";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import type { PipelineContext, PipelinePhase } from "@/core/time/pipeline";
import type { GameState, Horse } from "@/game/types";
import type { AnyIntent, TrainingIntent } from "@/core/resolver/intents";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createRng } from "@/core/common/rng";
import { makeGameState } from "@/tests/helpers/sampleGameState";

describe("intentCollectionPhase", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
    }) as GameState;

  const createTestContext = (state: GameState): PipelineContext => ({
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: createRng(12345),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map((state.horses ?? []).map((h) => [h.id, h])),
    raceMap: new Map((state.races ?? []).map((r) => [r.id, r])),
    stableMap: new Map((state.npcStables ?? []).map((s) => [s.id, s])),
    jockeyMap: new Map((state.jockeys ?? []).map((j) => [j.id, j])),
  });

  it("should collect intents from pendingIntents", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
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
    const result = intentCollectionPhase.execute(context);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].type).toBe("training");
    expect((result.intents[0] as TrainingIntent).horseId).toBe("horse-1");
  });

  it("should clear pendingIntents after collection", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
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
    const result = intentCollectionPhase.execute(context);

    expect(result.state.pendingIntents).toHaveLength(0);
  });

  it("should collect multiple intents", () => {
    const horse1 = createTestHorse({ id: "horse-1", energy: 80 });
    const horse2 = createTestHorse({ id: "horse-2", energy: 80 });
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
    const result = intentCollectionPhase.execute(context);

    expect(result.intents).toHaveLength(2);
  });

  it("should handle empty pendingIntents", () => {
    const state = createTestState();
    const context = createTestContext(state);
    const result = intentCollectionPhase.execute(context);

    expect(result.intents).toHaveLength(0);
  });

  it("should preserve other context fields", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
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
    const result = intentCollectionPhase.execute(context);

    expect(result.previousDay).toBe(context.previousDay);
    expect(result.newDay).toBe(context.newDay);
    expect(result.logs).toEqual(context.logs);
    expect(result.dailyRng).toEqual(context.dailyRng);
  });

  it("should have correct order", () => {
    expect(intentCollectionPhase.order).toBe(5);
  });

  it("should have correct name", () => {
    expect(intentCollectionPhase.name).toBe("intentCollection");
  });
});
