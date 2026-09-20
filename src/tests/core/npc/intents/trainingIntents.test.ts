import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateNpcTrainingIntents } from "@/core/npc/intents/trainingIntents";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { GameState } from "@/game/types";
import { TRAINING_CAUTION_MIN_ENERGY } from "@/constants/financialDistressConstants";

// Mock the AI functions to ensure deterministic behavior
vi.mock("@/core/ai/trainingAI", () => ({
  createTrainingAIState: vi.fn(() => ({})),
  shouldTrainToday: vi.fn(() => true),
  selectTrainingType: vi.fn(() => "speed"),
}));

// Mock UUID to avoid random outputs
vi.mock("@/core/uuid", () => ({
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

  it("currently fails to enforce positive training budgets (suspected bug)", () => {
    // Documenting current behavior where training budget checks only apply if budget <= 0
    const horse1 = createTestHorse({ id: "h1", energy: 100 });
    const horse2 = createTestHorse({ id: "h2", energy: 100 });
    const stableAI = {
      id: stable.id,
      stableId: stable.id,
      budgetAllocation: {
        training: 400, // Cost is 500 per session, so only one should afford it if budget worked right
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

    // CURRENT BEHAVIOR: Generates 2 intents because condition `trainingBudget <= 0` is false for 400.
    expect(intents).toHaveLength(2);
  });

  it("enforces training budget when <= 0 but currently allows first session anyway", () => {
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

    // CURRENT BEHAVIOR: Generates 1 intent because condition needs `cumulativeTrainingSpend > 0`
    // to kick in and block the second horse.
    expect(intents).toHaveLength(1);
    expect(intents[0].horseId).toBe(horse1.id);
  });
});
