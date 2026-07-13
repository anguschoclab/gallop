/**
 * Tests for intent validation (resolver core)
 */

import { describe, it, expect } from "vitest";
import { validateIntent } from "@/core/resolver/resolver";
import type { GameState, Horse } from "@/game/types";
import type {
  AnyIntent,
  TrainingIntent,
  RaceEntryIntent,
  BreedingIntent,
  PurchaseIntent,
} from "@/core/resolver/intents";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("validateIntent", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
    }) as GameState;

  it("should validate valid training intent", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
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

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(true);
  });

  it("should reject training intent for non-existent horse", () => {
    const state = createTestState();

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

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Horse not found");
  });

  it("should reject training intent for horse with insufficient energy", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 10 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
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

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Insufficient energy");
  });

  it("should validate valid race entry intent", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
      races: r2r([
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      ]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(true);
  });

  it("should reject race entry intent for non-existent horse", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      ]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Horse not found");
  });

  it("should reject race entry intent for non-existent race", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Race not found");
  });

  it("should reject race entry intent for already resolved race", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 80 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
      races: r2r([
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: true,
        },
      ]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Race already resolved");
  });

  it("should reject race entry intent for horse with insufficient energy", () => {
    const horse = createTestHorse({ id: "horse-1", energy: 30 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
      races: r2r([
        {
          id: "race-1",
          name: "Test Race",
          day: 5,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      ]),
    };

    const intent: RaceEntryIntent = {
      id: "intent-1",
      day: 1,
      type: "race_entry",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Insufficient energy");
  });

  it("should validate valid breeding intent", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "horse", age: 5 });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(true);
  });

  it("should reject breeding intent for non-existent sire", () => {
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Sire not found");
  });

  it("should reject breeding intent for non-existent dam", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "horse", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Dam not found");
  });

  it("should reject breeding intent for invalid sire gender", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "mare", age: 5 });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid sire gender (must be stallion or colt)");
  });

  it("should reject breeding intent for invalid dam gender", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "horse", age: 5 });
    const dam = createTestHorse({ id: "dam-1", gender: "horse", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid dam gender (must be mare or filly)");
  });

  it("should reject breeding intent for insufficient funds", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "horse", age: 5 });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 1000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-1",
      day: 1,
      type: "breeding",
      entityId: "player",
      priority: 100,
      source: "player",
      sireId: "sire-1",
      damId: "dam-1",
      liveFoalGuarantee: false,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Insufficient funds for breeding");
  });

  it("should validate valid purchase intent", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      cash: 10000,
      market: [horse],
    };

    const intent: PurchaseIntent = {
      id: "intent-1",
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(true);
  });

  it("should reject purchase intent for non-existent horse in market", () => {
    const state: GameState = {
      ...createTestState(),
      cash: 10000,
      market: [],
    };

    const intent: PurchaseIntent = {
      id: "intent-1",
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Horse not in market");
  });

  it("should reject purchase intent for insufficient funds", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      cash: 1000,
      market: [horse],
    };

    const intent: PurchaseIntent = {
      id: "intent-1",
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Insufficient funds");
  });

  it("should pass through for unknown intent types", () => {
    const state = createTestState();

    const intent: AnyIntent = {
      id: "intent-1",
      day: 1,
      // @ts-expect-error - testing invalid intent type
      type: "invalid_intent_type",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      newName: "New Name",
    };

    const result = validateIntent(intent, state);
    expect(result.valid).toBe(true);
  });
});
