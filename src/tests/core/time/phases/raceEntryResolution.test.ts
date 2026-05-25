/**
 * Tests for race entry resolution phase
 */

import { describe, it, expect } from "vitest";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { RaceEntryIntent } from "@/core/resolver/intents";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";

describe("raceEntryResolutionPhase", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
      pendingIntents: [],
    }) as GameState;

  const createTestContext = (state: GameState, intents: RaceEntryIntent[] = []): PipelineContext =>
    createMockPipelineContext({ state, intents });

  it("should process race entry intent and generate race entry impact", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      races: [
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      ],
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const context = createTestContext(state, [intent]);
    const result = raceEntryResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(2);
    expect(result.impacts[0].type).toBe("race_entry");
    expect(result.impacts[1].type).toBe("cash_change");
  });

  it("should skip non-race entry intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const context = createTestContext(state, [] as any);
    const result = raceEntryResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should have correct order", () => {
    expect(raceEntryResolutionPhase.order).toBe(15);
  });

  it("should have correct name", () => {
    expect(raceEntryResolutionPhase.name).toBe("raceEntryResolution");
  });
});
