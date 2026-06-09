import { describe, it, expect } from "vitest";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";
import { createRng } from "@/core/common/rng";
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
    intents: [],
    impacts: [],
    impactLog: [],
    dailyRng: createRng(1),
  });

  it("should collect and resolve training intents", () => {
    const horse = createTestHorse({ id: "h1", energy: 100 });
    const stable = createTestStable({ id: "s1", cash: 10000 });

    const state = createTestState();
    state.horses = [horse];
    state.npcStables = [stable];

    // Add manual intent
    state.pendingIntents = [
      {
        id: "i1",
        horseId: "h1",
        entityId: "h1",
        source: "player",
        day: 1,
        type: "training",
        trainingType: "gallop",
        priority: 1,
      },
    ];

    const context = createTestContext(state);
    const originalCash = state.cash;
    const originalEnergy = horse.energy;

    const phases = [intentCollectionPhase, trainingResolutionPhase, impactApplicationPhase];
    const result = executePipeline(phases, context);

    expect(result.state.cash).toBeLessThan(originalCash);
    expect(result.state.horses[0].energy).toBeLessThan(originalEnergy);
  });
});
