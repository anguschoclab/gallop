import { describe, it, expect } from "vitest";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/platform/game/types";
import { createDefaultGameState } from "@/platform/game/store/state";
import { h2r } from "@/tests/helpers/sampleGameState";
import { runPipelineForDay } from "@/tests/helpers/runPipeline";
import type { TrainingIntent } from "@/platform/resolver/intents";

describe("Intent/Resolution Pipeline Integration", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
  });

  it("collects, validates, resolves, and applies queued training intents", () => {
    const horse = createTestHorse({ id: "h1", energy: 100 });
    const stable = createTestStable({ id: "s1", cash: 10000 });

    const state = createTestState();
    state.horses = h2r([horse]);
    state.npcStables = [stable];
    state.pendingIntents = [
      {
        id: "i1",
        horseId: horse.id,
        entityId: horse.id,
        source: "player",
        day: 1,
        type: "training",
        trainingType: "gallop",
        priority: 1,
      } satisfies TrainingIntent,
    ];

    const originalCash = state.cash;
    const originalEnergy = horse.energy;
    const result = runPipelineForDay(state, 2);

    expect(result.state.pendingIntents).toEqual([]);
    expect(result.state.cash).toBeLessThan(originalCash);
    expect(Object.values(result.state.horses)[0].energy).toBeLessThan(originalEnergy);
  });
});
