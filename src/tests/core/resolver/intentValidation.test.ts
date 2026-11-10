/**
 * Tests for intent validation (resolver core)
 */

import { describe, it, expect } from "vitest";
import { validateIntent } from "@/platform/resolver/resolver";
import type { GameState } from "@/platform/game/types";
import type {
  AnyIntent,
  TrainingIntent,
  RaceEntryIntent,
  WithdrawFromClaimingIntent,
  BreedingIntent,
  PurchaseIntent,
} from "@/platform/resolver/intents";
import { INTENT_TYPE_CONTRACTS } from "@/platform/resolver/intentTypeRegistry";
import { StructuralIntentValidator } from "@/platform/resolver/validators/structuralIntentValidator";
import { TrainingValidator } from "@/platform/resolver/validators/TrainingValidator";
import { createTestHorse, createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("validateIntent", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 50,
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

  it("rejects a player race entry for a horse owned by another stable", () => {
    const horse = createTestNpcHorse({ id: "horse-1", energy: 80 });
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

    expect(validateIntent(intent, state)).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
  });

  it("requires an NPC race entry source to match the horse owner", () => {
    const horse = createTestNpcHorse({ id: "horse-1", energy: 80 });
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
      source: "npc",
      sourceId: "different-stable",
      horseId: "horse-1",
      raceId: "race-1",
    };

    expect(validateIntent(intent, state)).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
    expect(validateIntent({ ...intent, sourceId: "test-npc-stable-1" }, state)).toEqual({
      valid: true,
    });
  });

  it("rejects a player claiming withdrawal for an NPC-owned horse", () => {
    const horse = createTestNpcHorse({ id: "horse-1", energy: 80 });
    const state: GameState = {
      ...createTestState(),
      horses: h2r([horse]),
      races: r2r([
        {
          id: "race-1",
          name: "Optional Claiming",
          day: 5,
          distance: 2000,
          raceClass: "OptionalClaiming",
          claimingPrice: 25000,
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", ownership: horse.ownership }],
          resolved: false,
        },
      ]),
    };
    const intent: WithdrawFromClaimingIntent = {
      id: "intent-1",
      day: 1,
      type: "withdraw_from_claiming",
      entityId: "horse-1",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      raceId: "race-1",
    };

    expect(validateIntent(intent, state)).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
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

  it("applies structural validation even when a specialized validator accepts the intent", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      cash: 10000,
      market: [horse],
    };

    const intent = {
      day: 1,
      type: "purchase",
      entityId: "player",
      priority: 100,
      source: "player",
      horseId: "horse-1",
      price: 5000,
    } as unknown as AnyIntent;

    const result = validateIntent(intent, state);
    expect(result).toEqual({ valid: false, reason: "Intent id missing" });
  });

  it("rejects unknown intent types explicitly", () => {
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
    expect(result).toEqual({ valid: false, reason: "Unknown intent type" });
  });

  it("rejects breeding intent for parent-child pair (by ID)", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "horse", age: 5 });
    const dam = createTestHorse({
      id: "dam-1",
      gender: "mare",
      age: 5,
      sireId: "sire-1",
      sireName: "Sire",
    });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-pc",
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
  });

  it("rejects breeding intent for half-siblings (shared sireId)", () => {
    const sire = createTestHorse({
      id: "sire-1",
      gender: "horse",
      age: 5,
      sireId: "common-sire",
    });
    const dam = createTestHorse({
      id: "dam-1",
      gender: "mare",
      age: 5,
      sireId: "common-sire",
    });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: h2r([sire, dam]),
    };

    const intent: BreedingIntent = {
      id: "intent-sib",
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
  });

  it("existing valid breeding intent test still passes", () => {
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
});

describe("StructuralIntentValidator", () => {
  const validator = new StructuralIntentValidator();
  const state = makeGameState({ day: 1 }) as GameState;

  const baseIntent = (): TrainingIntent => ({
    id: "intent-1",
    day: 1,
    type: "training",
    entityId: "horse-1",
    priority: 100,
    source: "player",
    horseId: "horse-1",
    trainingType: "speed",
  });

  describe("canValidate", () => {
    it("claims every registered intent type", () => {
      for (const type of INTENT_TYPE_CONTRACTS) {
        expect(validator.canValidate(type)).toBe(true);
      }
    });

    it("does not claim unregistered intent types", () => {
      expect(validator.canValidate("bogus_type" as AnyIntent["type"])).toBe(false);
    });
  });

  describe("validate", () => {
    it("accepts a fully populated intent", () => {
      expect(validator.validate(baseIntent(), state)).toEqual({ valid: true });
    });

    it("rejects unregistered intent types", () => {
      const intent = { ...baseIntent(), type: "bogus_type" } as unknown as AnyIntent;
      expect(validator.validate(intent, state)).toEqual({
        valid: false,
        reason: "Unknown intent type",
      });
    });

    it("rejects a missing intent id", () => {
      expect(validator.validate({ ...baseIntent(), id: "" }, state)).toEqual({
        valid: false,
        reason: "Intent id missing",
      });
    });

    it("rejects a missing entity id", () => {
      expect(validator.validate({ ...baseIntent(), entityId: "" }, state)).toEqual({
        valid: false,
        reason: "Intent entity missing",
      });
    });

    it("rejects unknown intent sources", () => {
      const intent = { ...baseIntent(), source: "alien" } as unknown as AnyIntent;
      expect(validator.validate(intent, state)).toEqual({
        valid: false,
        reason: "Unknown intent source",
      });
    });

    it.each([0, -1, Number.NaN])("rejects invalid day %s", (day) => {
      expect(validator.validate({ ...baseIntent(), day }, state)).toEqual({
        valid: false,
        reason: "Invalid intent day",
      });
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects non-finite priority %s",
      (priority) => {
        expect(validator.validate({ ...baseIntent(), priority }, state)).toEqual({
          valid: false,
          reason: "Invalid intent priority",
        });
      },
    );
  });
});

describe("TrainingValidator", () => {
  const validator = new TrainingValidator();

  const createState = (horses: Record<string, ReturnType<typeof createTestHorse>> = {}) =>
    makeGameState({ day: 50, horses }) as GameState;

  const intent = (overrides: Partial<TrainingIntent> = {}): TrainingIntent => ({
    id: "intent-1",
    day: 1,
    type: "training",
    entityId: "horse-1",
    priority: 100,
    source: "player",
    horseId: "horse-1",
    trainingType: "speed",
    ...overrides,
  });

  describe("canValidate", () => {
    it("claims only training intents", () => {
      expect(validator.canValidate("training")).toBe(true);
      expect(validator.canValidate("race_entry")).toBe(false);
      expect(validator.canValidate("purchase")).toBe(false);
    });
  });

  describe("validate", () => {
    it("accepts a valid training intent", () => {
      const horse = createTestHorse({ id: "horse-1", energy: 80 });
      expect(validator.validate(intent(), createState(h2r([horse])))).toEqual({
        valid: true,
      });
    });

    it("rejects when the horse does not exist", () => {
      expect(validator.validate(intent(), createState())).toEqual({
        valid: false,
        reason: "Horse not found",
      });
    });

    it("rejects a horse consigned to an auction", () => {
      const horse = createTestHorse({ id: "horse-1", consignedSaleId: "sale-1" });
      expect(validator.validate(intent(), createState(h2r([horse])))).toEqual({
        valid: false,
        reason: "Horse is consigned to an auction",
      });
    });

    it("rejects a horse with energy below 20", () => {
      const horse = createTestHorse({ id: "horse-1", energy: 19 });
      expect(validator.validate(intent(), createState(h2r([horse])))).toEqual({
        valid: false,
        reason: "Insufficient energy",
      });
    });

    it("accepts a horse at the energy boundary of 20", () => {
      const horse = createTestHorse({ id: "horse-1", energy: 20 });
      expect(validator.validate(intent(), createState(h2r([horse])))).toEqual({
        valid: true,
      });
    });

    it("prefers the cached horse over state when both exist", () => {
      const cached = createTestHorse({ id: "horse-1", energy: 10 });
      const stale = createTestHorse({ id: "horse-1", energy: 80 });
      const cache = { horseMap: new Map([[cached.id, cached]]) };
      expect(validator.validate(intent(), createState(h2r([stale])), cache)).toEqual({
        valid: false,
        reason: "Insufficient energy",
      });
    });

    it("finds horses present only in the cache", () => {
      const horse = createTestHorse({ id: "horse-1", energy: 80 });
      const cache = { horseMap: new Map([[horse.id, horse]]) };
      expect(validator.validate(intent(), createState(), cache)).toEqual({ valid: true });
    });
  });
});
