/**
 * Tests for training resolution phase
 */

import { describe, it, expect } from "vitest";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { createRng } from "@/game/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { TrainingIntent } from "@/core/resolver/intents";

describe("trainingResolutionPhase", () => {
  const createTestState = (): GameState => ({
    day: 1,
    cash: 10000,
    horses: [],
    npcStables: [],
    pregnancies: [],
    races: [],
    awards: [],
    market: [],
    auctions: [],
    lastCalibrationDay: 0,
    calibratedPars: {},
    paceSamples: {},
    pendingAwardCeremonies: [],
    trainingUsed: {},
    log: [],
    scoutReports: [],
    pendingIntents: [],
  });

  const createTestContext = (
    state: GameState,
    intents: TrainingIntent[] = [],
  ): PipelineContext => ({
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: createRng(12345),
    intents,
    impacts: [],
    impactLog: [],
  });

  it("should process training intent and generate stat change impact", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      energy: 80,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      trainingUsed: {},
    };

    const intent: TrainingIntent = {
      id: "intent-1",
      day: 1,
      type: "training",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      trainingType: "speed",
    };

    const context = createTestContext(state, [intent]);
    const result = trainingResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].type).toBe("horse_stat_change");
  });

  it("should generate energy change impact for training", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      energy: 80,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      trainingUsed: {},
    };

    const intent: TrainingIntent = {
      id: "intent-1",
      day: 1,
      type: "training",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      trainingType: "speed",
    };

    const context = createTestContext(state, [intent]);
    const result = trainingResolutionPhase.execute(context);

    const energyImpact = result.impacts.find((i) => i.type === "energy_change");
    expect(energyImpact).toBeDefined();
    expect((energyImpact as any).delta).toBeLessThan(0);
  });

  it("should handle rest training type", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      energy: 50,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      trainingUsed: {},
    };

    const intent: TrainingIntent = {
      id: "intent-1",
      day: 1,
      type: "training",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      trainingType: "rest",
    };

    const context = createTestContext(state, [intent]);
    const result = trainingResolutionPhase.execute(context);

    const energyImpact = result.impacts.find((i) => i.type === "energy_change");
    expect(energyImpact).toBeDefined();
    expect((energyImpact as any).delta).toBeGreaterThan(0);
  });

  it("should skip non-training intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const context = createTestContext(state, [] as any);
    const result = trainingResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should update trainingUsed tracking", () => {
    const horse = createTestHorse({
      id: "horse-1",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      energy: 80,
    });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      trainingUsed: {},
    };

    const intent: TrainingIntent = {
      id: "intent-1",
      day: 1,
      type: "training",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      trainingType: "speed",
    };

    const context = createTestContext(state, [intent]);
    const result = trainingResolutionPhase.execute(context);

    expect(result.state.trainingUsed["horse-1"]).toBeDefined();
  });

  it("should have correct order", () => {
    expect(trainingResolutionPhase.order).toBe(45);
  });

  it("should have correct name", () => {
    expect(trainingResolutionPhase.name).toBe("trainingResolution");
  });
});
