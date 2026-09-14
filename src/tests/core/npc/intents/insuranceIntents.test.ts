import { describe, it, expect } from "vitest";
import { generateNpcInsuranceIntents } from "@/core/npc/intents/insuranceIntents";
import type { GameState, Horse, Stable } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("generateNpcInsuranceIntents", () => {
  const stable: Stable = {
    id: "stable-rich",
    name: "Rich Stable",
    cash: 250000,
    personality: "conservative",
  } as any;

  const starHorse: Horse = {
    id: "horse-star",
    name: "Golden Hope",
    ownership: { type: "npc", stableId: "stable-rich" },
    raceHistory: [{ position: 1, grade: "G1", distance: 1600, surface: "Dirt" }],
    healthStatus: "healthy",
    conformation: "excellent",
    stats: {
      speed: 95,
      stamina: 90,
      acceleration: 92,
      consistency: 88,
    },
    insurancePolicy: undefined,
  } as any;

  const injuredHorse: Horse = {
    id: "horse-injured",
    name: "Hurting Hero",
    ownership: { type: "npc", stableId: "stable-rich" },
    raceHistory: [{ position: 1, grade: "G2", distance: 1600, surface: "Dirt" }],
    healthStatus: "injured",
    insurancePolicy: {
      type: "injury_only",
      premiumPerDay: 25,
      coveragePercent: 0.5,
      activeSinceDay: 1,
    },
  } as any;

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
