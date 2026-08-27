import { describe, it, expect } from "vitest";
import { createRng } from "@/core/common/rng";
import { createGeldingAIState, shouldGeldHorse } from "@/core/ai/geldingAI";
import { generateNpcIntents } from "@/core/npc/intentGenerators";
import { BreedingValidator } from "@/core/resolver/validators/BreedingValidator";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import type { GameState, Horse, Stable } from "@/game/types";
import { produce } from "immer";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makeNpcOwned } from "@/core/horse/ownership";

describe("NPC Gelding AI & Intent Generation", () => {
  it("should evaluate gelding eligibility based on stable personality and horse potential", () => {
    // 1. Aggressive Stable (threshold < 78)
    const aggressiveStable = createTestStable({
      id: "stable-1",
      personality: "aggressive",
    });
    const aggAIState = createGeldingAIState(aggressiveStable);

    const stallionToGeld = createTestHorse({
      id: "horse-1",
      gender: "horse",
      age: 4,
      potential: 76, // Below threshold (78)
      gelded: false,
    });

    const eliteStallion = createTestHorse({
      id: "horse-2",
      gender: "horse",
      age: 4,
      potential: 82, // Above threshold (78)
      gelded: false,
    });

    // We choose a day that matches the deterministic check (hash % 30)
    // to ensure it passes the staggered daily check
    const dayAgg = 14; // Let's check which day matches for horse-1
    // We can iterate days to find one that returns true for horse-1
    let successDay = -1;
    for (let d = 1; d <= 30; d++) {
      if (shouldGeldHorse(aggAIState, stallionToGeld, d)) {
        successDay = d;
        break;
      }
    }
    expect(successDay).toBeGreaterThan(0);

    // With the correct day, stallionToGeld should be gelded
    expect(shouldGeldHorse(aggAIState, stallionToGeld, successDay)).toBe(true);

    // Elite stallion should not be gelded even on the same day
    expect(shouldGeldHorse(aggAIState, eliteStallion, successDay)).toBe(false);

    // 2. Breeder Stable (threshold < 70)
    const breederStable = createTestStable({
      id: "stable-2",
      personality: "breeder",
    });
    const breederAIState = createGeldingAIState(breederStable);

    // Same stallion (potential 76) should NOT be gelded by breeder stable
    expect(shouldGeldHorse(breederAIState, stallionToGeld, successDay)).toBe(false);

    // 3. Other Ineligibilities
    const alreadyGelded = createTestHorse({
      id: "horse-3",
      gender: "gelding",
      age: 3,
      potential: 65,
      gelded: true,
    });
    expect(shouldGeldHorse(aggAIState, alreadyGelded, successDay)).toBe(false);

    const mare = createTestHorse({
      id: "horse-4",
      gender: "mare",
      age: 4,
      potential: 65,
    });
    expect(shouldGeldHorse(aggAIState, mare, successDay)).toBe(false);

    const studHorse = createTestHorse({
      id: "horse-5",
      gender: "horse",
      age: 5,
      potential: 65,
      gelded: false,
      stud: {
        atStud: true,
        standingFee: 1000,
        bookSize: 30,
        seasonBookings: 0,
        lifetimeFoals: 0,
      } as any,
    });
    expect(shouldGeldHorse(aggAIState, studHorse, successDay)).toBe(false);

    const tooOld = createTestHorse({
      id: "horse-6",
      gender: "horse",
      age: 6,
      potential: 65,
      gelded: false,
    });
    expect(shouldGeldHorse(aggAIState, tooOld, successDay)).toBe(false);
  });

  it("should generate gelding intents in generateNpcIntents", () => {
    const stable = createTestStable({
      id: "stable-1",
      personality: "aggressive",
    });

    const horse = createTestHorse({
      id: "horse-1",
      gender: "colt",
      age: 3,
      potential: 75,
      gelded: false,
      ownership: makeNpcOwned("stable-1"),
    });

    const gameState: GameState = {
      day: 1,
      horses: h2r([horse]),
      npcStables: [stable],
      races: {},
      pregnancies: [],
      jockeys: [],
      npcAIManager: {
        stableStates: {},
        globalDay: 1,
        regionalKings: {},
      },
      cash: 100000,
    } as any;

    // Find the day that triggers the gelding roll for horse-1
    const aggAIState = createGeldingAIState(stable);
    let triggerDay = 1;
    for (let d = 1; d <= 30; d++) {
      if (shouldGeldHorse(aggAIState, horse, d)) {
        triggerDay = d;
        break;
      }
    }

    gameState.day = triggerDay;
    const intents = generateNpcIntents(gameState, triggerDay);

    const geldingIntent = intents.find((i) => i.type === "gelding");
    expect(geldingIntent).toBeDefined();
    expect(geldingIntent?.entityId).toBe(horse.id);
  });
});

describe("BreedingValidator Fixes", () => {
  const validator = new BreedingValidator();

  it("should reject gelding as sire", () => {
    const sire = createTestHorse({ id: "sire-1", gender: "gelding", age: 5 });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = { cash: 5000, horses: h2r([sire, dam]) } as any;

    const intent = {
      type: "breeding",
      sireId: "sire-1",
      damId: "dam-1",
    } as any;

    const result = validator.validate(intent, state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid sire gender");
  });

  it("should allow colt as sire and filly as dam", () => {
    const sire = createTestHorse({ id: "sire-2", gender: "colt", age: 3 });
    const dam = createTestHorse({ id: "dam-2", gender: "filly", age: 3 });
    const state: GameState = { day: 50, cash: 5000, horses: h2r([sire, dam]) } as any;

    const intent = {
      type: "breeding",
      sireId: "sire-2",
      damId: "dam-2",
    } as any;

    const result = validator.validate(intent, state);
    expect(result.valid).toBe(true);
  });
});

describe("HorseHandler Gelding Impact Resolution", () => {
  it("should apply gelding impact and update gender & gelded properties", () => {
    const horse = createTestHorse({
      id: "horse-1",
      gender: "horse",
      gelded: false,
    });

    const state: GameState = {
      horses: h2r([horse]),
      npcStables: [],
    } as any;

    const impact = {
      type: "gelding",
      horseId: "horse-1",
      day: 1,
    } as any;

    const handler = new HorseHandler();
    expect(handler.canHandle("gelding")).toBe(true);

    const horseMap = new Map<string, any>([["horse-1", horse]]);
    const lookupMaps = { horseMap, stableMap: new Map(), campaignMap: new Map() } as any;

    const nextState = produce(state, (draft) => {
      handler.handle(draft, impact, lookupMaps);
    });

    const updatedHorse = nextState.horses["horse-1"];
    expect(updatedHorse.gender).toBe("gelding");
    expect(updatedHorse.gelded).toBe(true);
  });
});
