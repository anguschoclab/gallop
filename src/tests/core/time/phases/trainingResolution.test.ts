import { describe, it, expect } from "vitest";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";
import type { TrainingIntent } from "@/core/resolver/intents";
import { isEnergyImpact } from "@/core/resolver/impacts/horseImpacts";

describe("trainingResolutionPhase", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
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
      stats: {
        speed: 40,
        stamina: 40,
        acceleration: 40,
        consistency: 40,
        temperament: 50,
        conformation: 50,
      },
      energy: 80,
      potential: 90,
      age: 4,
      peakAge: 4,
      trainability: 1.0,
    });
    const state = createTestState();
    state.horses = [horse];

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
    horse.trainability = 100.0; // Extreme value to force probability > 1

    const result = trainingResolutionPhase.execute(context);

    // There should be at least two impacts: one for energy, one for stat change.
    expect(result.impacts.length).toBeGreaterThanOrEqual(2);
    const statChangeImpact = result.impacts.find((i) => i.type === "horse_stat_change");
    expect(statChangeImpact).toBeDefined();
  });

  it("should generate energy change impact for training", () => {
    const horse = createTestHorse({
      id: "horse-1",
      energy: 80,
    });
    const state = createTestState();
    state.horses = [horse];

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
    if (energyImpact && isEnergyImpact(energyImpact)) {
      expect(energyImpact.delta).toBeLessThan(0);
    }
  });

  it("should handle rest training type", () => {
    const horse = createTestHorse({
      id: "horse-1",
      energy: 50,
    });
    const state = createTestState();
    state.horses = [horse];

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
    if (energyImpact && isEnergyImpact(energyImpact)) {
      expect(energyImpact.delta).toBeGreaterThan(0);
    }
  });

  it("should skip non-training intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state = createTestState();
    state.horses = [horse];

    const context = createTestContext(state, []);
    const result = trainingResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should update trainingUsed tracking", () => {
    const horse = createTestHorse({
      id: "horse-1",
      energy: 80,
    });
    const state = createTestState();
    state.horses = [horse];

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
