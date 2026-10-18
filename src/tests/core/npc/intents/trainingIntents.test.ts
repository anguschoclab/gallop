import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateNpcTrainingIntents } from "@/domains/agents/simulation/npc/intents/trainingIntents";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { GameState } from "@/platform/game/types";
import { TRAINING_CAUTION_MIN_ENERGY } from "@/domains/financial/model/financialDistressConstants";

// Mock the AI functions to ensure deterministic behavior
vi.mock("@/domains/agents/simulation/trainingAI", () => ({
  createTrainingAIState: vi.fn(() => ({})),
  shouldTrainToday: vi.fn(() => true),
  selectTrainingType: vi.fn(() => "speed"),
}));

// Mock UUID to avoid random outputs
vi.mock("@/shared/uuid/uuid", () => ({
  generateUUID: vi.fn(() => "mocked-uuid"),
}));

describe("generateNpcTrainingIntents", () => {
  const stable = createTestStable();
  let state: GameState;

  beforeEach(() => {
    state = {} as GameState;
    vi.clearAllMocks();
  });

  it("generates no intents when distressLevel is critical", () => {
    const horse = createTestHorse({ energy: 100 });
    const intents = generateNpcTrainingIntents(
      state,
      stable,
      undefined,
      1,
      [horse],
      new Set(),
      1.0,
      "critical",
    );
    expect(intents).toHaveLength(0);
  });

  it("forces rest training when distressLevel is emergency", () => {
    const horse = createTestHorse({ energy: 100 });
    const intents = generateNpcTrainingIntents(
      state,
      stable,
      undefined,
      1,
      [horse],
      new Set(),
      1.0,
      "emergency",
    );
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      type: "training",
      trainingType: "rest",
      horseId: horse.id,
    });
  });

  it("excludes pregnant horses from training intents", () => {
    const horse = createTestHorse({ energy: 100 });
    const intents = generateNpcTrainingIntents(
      state,
      stable,
      undefined,
      1,
      [horse],
      new Set([horse.id]),
      1.0,
      "healthy",
    );
    expect(intents).toHaveLength(0);
  });

  it("excludes horses below normal min energy (15) when healthy", () => {
    const horse = createTestHorse({ energy: 10 }); // Below 15
    const intents = generateNpcTrainingIntents(
      state,
      stable,
      undefined,
      1,
      [horse],
      new Set(),
      1.0,
      "healthy",
    );
    expect(intents).toHaveLength(0);
  });

  it("excludes horses below caution min energy when in caution distress", () => {
    const horse = createTestHorse({ energy: TRAINING_CAUTION_MIN_ENERGY - 1 });
    const intents = generateNpcTrainingIntents(
      state,
      stable,
      undefined,
      1,
      [horse],
      new Set(),
      1.0,
      "caution",
    );
    expect(intents).toHaveLength(0);
  });

  it("enforces positive training budgets before reserving a session", () => {
    const horse1 = createTestHorse({ id: "h1", energy: 100 });
    const horse2 = createTestHorse({ id: "h2", energy: 100 });
    const stableAI = {
      id: stable.id,
      stableId: stable.id,
      budgetAllocation: {
        training: 80,
      },
    } as any;

    const intents = generateNpcTrainingIntents(
      state,
      stable,
      stableAI,
      1,
      [horse1, horse2],
      new Set(),
      1.0,
      "healthy",
    );

    expect(intents).toHaveLength(1);
    expect(intents[0].horseId).toBe(horse1.id);
  });

  it("does not emit a training commitment when the training budget is exhausted", () => {
    const horse1 = createTestHorse({ id: "h1", energy: 100 });
    const horse2 = createTestHorse({ id: "h2", energy: 100 });
    const stableAI = {
      id: stable.id,
      stableId: stable.id,
      budgetAllocation: {
        training: 0,
      },
    } as any;

    const intents = generateNpcTrainingIntents(
      state,
      stable,
      stableAI,
      1,
      [horse1, horse2],
      new Set(),
      1.0,
      "healthy",
    );

    expect(intents).toHaveLength(0);
  });
});
