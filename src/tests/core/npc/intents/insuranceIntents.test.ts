import { describe, it, expect } from "vitest";
import { generateNpcInsuranceIntents } from "@/domains/agents/simulation/npc/intents/insuranceIntents";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";

describe("generateNpcInsuranceIntents", () => {
  const stable = createTestStable({
    id: "stable-rich",
    name: "Rich Stable",
    cash: 250000,
    personality: "conservative",
  });

  const starHorse = createTestHorse({
    id: "horse-star",
    name: "Golden Hope",
    ownership: { type: "npc", stableId: stable.id },
    raceHistory: [
      {
        raceId: "graded-win",
        raceName: "Test G1",
        position: 1,
        day: 8,
        grade: "G1",
        distance: 1600,
        surface: "Dirt",
      },
    ],
    healthStatus: "healthy",
    conformation: 90,
    stats: {
      speed: 95,
      stamina: 90,
      acceleration: 92,
      consistency: 88,
      temperament: 70,
      conformation: 90,
    },
    insurancePolicy: undefined,
  });

  const injuredHorse = createTestHorse({
    id: "horse-injured",
    name: "Hurting Hero",
    ownership: { type: "npc", stableId: stable.id },
    raceHistory: [
      {
        raceId: "graded-placing",
        raceName: "Test G2",
        position: 1,
        day: 8,
        grade: "G2",
        distance: 1600,
        surface: "Dirt",
      },
    ],
    healthStatus: "other_illness",
    insurancePolicy: {
      type: "injury_only",
      premiumPerDay: 25,
      coveragePercent: 0.5,
      activeSinceDay: 1,
    },
  });

  it("generates insurance_purchase intent for high-value uninsured horses", () => {
    const state: GameState = {
      ...createDefaultGameState(),
      day: 10,
      horses: { [starHorse.id]: starHorse },
    };

    const intents = generateNpcInsuranceIntents(state, stable, undefined, 10, [starHorse]);
    expect(intents.length).toBeGreaterThan(0);
    const purchase = intents.find((i) => i.type === "insurance_purchase");
    expect(purchase).toBeDefined();
    expect(purchase?.horseId).toBe("horse-star");
  });

  it("generates insurance_claim intent when insured horse suffers injury", () => {
    const state: GameState = {
      ...createDefaultGameState(),
      day: 12,
      horses: { [injuredHorse.id]: injuredHorse },
    };

    const intents = generateNpcInsuranceIntents(state, stable, undefined, 12, [injuredHorse]);
    expect(intents.length).toBeGreaterThan(0);
    const claim = intents.find((i) => i.type === "insurance_claim");
    expect(claim).toBeDefined();
    expect(claim?.horseId).toBe("horse-injured");
  });
});
