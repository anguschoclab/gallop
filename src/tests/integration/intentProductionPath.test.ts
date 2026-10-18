import { describe, expect, it } from "vitest";
import { runPipelineForDay } from "@/tests/helpers/runPipeline";
import { h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createInitialState } from "@/platform/game/store/initialization";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import type { TrainingIntent } from "@/platform/resolver/intents";
import type { CashImpact } from "@/platform/resolver/impacts/financialImpacts";
import type { GameState } from "@/platform/game/types";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";

function gameStateFor(overrides: Partial<GameState>): GameState {
  return { ...createInitialState(), ...overrides };
}

describe("authoritative intent production path", () => {
  it("charges a queued NPC training intent to the owning stable, not the player", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000 });
    const horse = createTestHorse({
      id: "npc-horse-1",
      ownership: makeNpcOwned(stable.id),
      energy: 80,
    });
    const intent: TrainingIntent = {
      id: "intent-npc-training-1",
      entityId: horse.id,
      source: "npc",
      sourceId: stable.id,
      day: 1,
      priority: 50,
      type: "training",
      horseId: horse.id,
      trainingType: "speed",
    };
    const state = gameStateFor({
      day: 1,
      cash: 500000,
      horses: h2r([horse]),
      npcStables: [stable],
      pendingIntents: [intent],
    });

    const result = runPipelineForDay(state, 2);
    const trainingCashImpacts = result.impacts.filter(
      (impact): impact is CashImpact =>
        impact.intentId === intent.id && impact.type === "cash_change",
    );

    expect(result.state.pendingIntents).toEqual([]);
    expect(trainingCashImpacts.map((impact) => impact.entityId)).toEqual([stable.id]);
    expect(result.state.expenses?.filter((expense) => expense.horseId === horse.id)).toEqual([]);
    expect(
      result.state.transactions?.filter((transaction) => transaction.horseId === horse.id),
    ).toEqual([]);
  });

  it("commits generated NPC AI updates without mutating the input manager", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000 });
    const aiManager: NpcAIManager = {
      stableStates: {},
      globalDay: 1,
      regionalKings: {},
    };
    const state = gameStateFor({
      day: 1,
      cash: 500000,
      npcStables: [stable],
      npcAIManager: aiManager,
    });

    const result = runPipelineForDay(state, 2);

    expect(aiManager.stableStates).toEqual({});
    expect(result.state.npcAIManager).not.toBe(aiManager);
    expect(result.state.npcAIManager?.stableStates[stable.id]?.decisionTraces).toHaveLength(11);
  });
});
