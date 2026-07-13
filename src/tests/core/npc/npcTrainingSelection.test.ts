/**
 * npcTrainingSelection.test.ts — Integration tests for NPC training selection.
 *
 * Verifies that NPC stables never select a locked or advanced training type
 * that exceeds their facility tier, and always pick from the available set
 * that `getAvailableTrainingTypes` returns for their facilities.
 *
 * Tests exercise the real `generateNpcIntents` → `generateNpcTrainingIntents`
 * → `selectTrainingType` chain using the actual facility-gating logic.
 */

import { describe, it, expect } from "vitest";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { getAvailableTrainingTypes, createNPCFacilities } from "@/core/facilities";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import type { GameState } from "@/game/types";
import type { TrainingIntent } from "@/core/resolver/intents";

const ADVANCED_TYPES = ["gallop", "swimming", "breeze", "gate_work", "bullet", "treadmill"];
const BASIC_TYPES = ["speed", "stamina", "acceleration", "rest"];

function makeState(
  stableId: string,
  facilityTier: "budget" | "mid" | "elite",
  horseOverrides: Record<string, unknown> = {},
): GameState {
  const stable = createTestStable({ id: stableId, tier: facilityTier });
  const horse = createTestHorse({
    id: `${stableId}-horse`,
    stableId,
    owned: false,
    energy: 100,
    ...horseOverrides,
  });

  return {
    horses: [horse],
    npcStables: [stable],
    pregnancies: [],
    races: [],
    npcFacilities: {
      [stableId]: createNPCFacilities(facilityTier, 1),
    },
    npcAIManager: { stableStates: {} },
  } as unknown as GameState;
}

function trainingIntentsFrom(state: GameState): TrainingIntent[] {
  return generateNpcIntents(state, 1).filter((i): i is TrainingIntent => i.type === "training");
}

// ─── Budget tier — only basic types ─────────────────────────────────────────

describe("budget stable — never selects advanced or locked training", () => {
  it("only picks from the basic set (speed / stamina / acceleration / rest)", () => {
    const state = makeState("budget-stable", "budget");
    const available = getAvailableTrainingTypes(state.npcFacilities!["budget-stable"]!);

    // Confirm baseline: budget facilities unlock no advanced types
    for (const t of ADVANCED_TYPES) {
      expect(available).not.toContain(t);
    }

    // Run many horses through the same budget stable to cover multiple AI paths
    const horses = Array.from({ length: 10 }, (_, i) =>
      createTestHorse({
        id: `budget-horse-${i}`,
        stableId: "budget-stable",
        owned: false,
        energy: 100,
        stats: {
          speed: 40 + i * 5,
          stamina: 40 + ((i + 3) % 5) * 5,
          acceleration: 40 + ((i + 1) % 5) * 5,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
      }),
    );

    const multiState = {
      ...state,
      horses,
    } as unknown as GameState;

    const intents = trainingIntentsFrom(multiState);
    expect(intents.length).toBeGreaterThan(0);
    for (const intent of intents) {
      expect(ADVANCED_TYPES).not.toContain(intent.trainingType);
      expect([...BASIC_TYPES, ...ADVANCED_TYPES]).toContain(intent.trainingType);
    }
  });

  it("selected type is in the available set returned by getAvailableTrainingTypes", () => {
    const state = makeState("budget-s2", "budget");
    const available = getAvailableTrainingTypes(state.npcFacilities!["budget-s2"]!);
    const intents = trainingIntentsFrom(state);
    for (const intent of intents) {
      expect(available).toContain(intent.trainingType);
    }
  });
});

// ─── Mid tier — gallop / swimming unlocked, premium types still locked ────

describe("mid stable — picks from mid available set, not premium/elite types", () => {
  it("never selects bullet, breeze, gate_work, or treadmill", () => {
    const LOCKED_FOR_MID = ["bullet", "breeze", "gate_work", "treadmill"];

    const horses = Array.from({ length: 10 }, (_, i) =>
      createTestHorse({
        id: `mid-horse-${i}`,
        stableId: "mid-stable",
        owned: false,
        energy: 100,
      }),
    );

    const state = {
      horses,
      npcStables: [createTestStable({ id: "mid-stable", tier: "mid" })],
      pregnancies: [],
      races: [],
      npcFacilities: { "mid-stable": createNPCFacilities("mid", 1) },
      npcAIManager: { stableStates: {} },
    } as unknown as GameState;

    const available = getAvailableTrainingTypes(state.npcFacilities!["mid-stable"]!);
    for (const t of LOCKED_FOR_MID) {
      expect(available).not.toContain(t);
    }

    const intents = trainingIntentsFrom(state);
    expect(intents.length).toBeGreaterThan(0);
    for (const intent of intents) {
      expect(LOCKED_FOR_MID).not.toContain(intent.trainingType);
    }
  });

  it("selected type is always in the mid available set", () => {
    const state = makeState("mid-s2", "mid");
    const available = getAvailableTrainingTypes(state.npcFacilities!["mid-s2"]!);
    const intents = trainingIntentsFrom(state);
    for (const intent of intents) {
      expect(available).toContain(intent.trainingType);
    }
  });
});

// ─── Elite tier — all types unlocked ─────────────────────────────────────

describe("elite stable — only picks from its full unlocked set", () => {
  it("selected type is always in the elite available set", () => {
    const horses = Array.from({ length: 10 }, (_, i) =>
      createTestHorse({
        id: `elite-horse-${i}`,
        stableId: "elite-stable",
        owned: false,
        energy: 100,
      }),
    );

    const state = {
      horses,
      npcStables: [createTestStable({ id: "elite-stable", tier: "elite" })],
      pregnancies: [],
      races: [],
      npcFacilities: { "elite-stable": createNPCFacilities("elite", 1) },
      npcAIManager: { stableStates: {} },
    } as unknown as GameState;

    const available = getAvailableTrainingTypes(state.npcFacilities!["elite-stable"]!);

    // Elite NPC barn is "premium" so breeze and gate_work are unlocked;
    // bullet requires an "elite" barn which NPC stables don't have.
    expect(available).toContain("breeze");
    expect(available).toContain("gate_work");

    const intents = trainingIntentsFrom(state);
    expect(intents.length).toBeGreaterThan(0);
    for (const intent of intents) {
      expect(available).toContain(intent.trainingType);
    }
  });
});

// ─── No npcFacilities entry — falls back to basic types only ─────────────

describe("stable with no npcFacilities entry — falls back to basic types", () => {
  it("never selects any advanced type when facilities are absent", () => {
    const state = {
      horses: [
        createTestHorse({
          id: "no-fac-horse",
          stableId: "no-fac-stable",
          owned: false,
          energy: 100,
        }),
      ],
      npcStables: [createTestStable({ id: "no-fac-stable" })],
      pregnancies: [],
      races: [],
      npcFacilities: {}, // no entry for this stable
      npcAIManager: { stableStates: {} },
    } as unknown as GameState;

    const intents = trainingIntentsFrom(state);
    for (const intent of intents) {
      expect(ADVANCED_TYPES).not.toContain(intent.trainingType);
    }
  });
});

// ─── Injured / low-energy horse — never generates a training intent ──────

describe("horse below energy threshold — no training intent emitted", () => {
  it("does not generate a training intent for a horse with energy < 15", () => {
    const state = makeState("low-energy-stable", "elite", { energy: 10 });
    const intents = trainingIntentsFrom(state);
    expect(intents).toHaveLength(0);
  });

  it("does not generate a training intent for a horse with energy = 0", () => {
    const state = makeState("zero-energy-stable", "elite", { energy: 0 });
    const intents = trainingIntentsFrom(state);
    expect(intents).toHaveLength(0);
  });
});

// ─── Multiple stables in one state — each respects its own facility tier ─

describe("multiple stables in one state — each uses its own facility set", () => {
  it("budget and elite stables in the same state each pick from their own available set", () => {
    const budgetFacilities = createNPCFacilities("budget", 1);
    const eliteFacilities = createNPCFacilities("elite", 1);

    const state = {
      horses: [
        createTestHorse({ id: "b-horse", stableId: "b-stable", owned: false, energy: 100 }),
        createTestHorse({ id: "e-horse", stableId: "e-stable", owned: false, energy: 100 }),
      ],
      npcStables: [
        createTestStable({ id: "b-stable", tier: "budget" }),
        createTestStable({ id: "e-stable", tier: "elite" }),
      ],
      pregnancies: [],
      races: [],
      npcFacilities: {
        "b-stable": budgetFacilities,
        "e-stable": eliteFacilities,
      },
      npcAIManager: { stableStates: {} },
    } as unknown as GameState;

    const budgetAvailable = getAvailableTrainingTypes(budgetFacilities);
    const eliteAvailable = getAvailableTrainingTypes(eliteFacilities);

    const intents = trainingIntentsFrom(state);
    expect(intents.length).toBeGreaterThan(0);

    for (const intent of intents) {
      if (intent.sourceId === "b-stable") {
        expect(budgetAvailable).toContain(intent.trainingType);
        expect(ADVANCED_TYPES).not.toContain(intent.trainingType);
      } else if (intent.sourceId === "e-stable") {
        expect(eliteAvailable).toContain(intent.trainingType);
      }
    }
  });
});
