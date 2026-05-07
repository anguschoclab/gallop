/**
 * Tests for breeding resolution phase
 */

import { describe, it, expect } from "vitest";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { BreedingIntent } from "@/core/resolver/intents";

describe("breedingResolutionPhase", () => {
  const createTestState = (): GameState => ({
    day: 1,
    cash: 10000,
    horses: [],
    npcStables: [],
    pregnancies: [],
    races: [],
    awards: [],
    market: [],
    auctions: [],
    lastCalibrationDay: 0,
    calibratedPars: {},
    paceSamples: {},
    pendingAwardCeremonies: [],
    trainingUsed: {},
    log: [],
    scoutReports: [],
    pendingIntents: [],
  });

  const createTestContext = (
    state: GameState,
    intents: BreedingIntent[] = [],
  ): PipelineContext => ({
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: {} as any,
    intents,
    impacts: [],
    impactLog: [],
  });

  it("should process breeding intent and generate pregnancy creation impact", () => {
    const sire = createTestHorse({
      id: "sire-1",
      gender: "horse",
      age: 5,
      stableId: "npc-stable-1",
      stud: {
        atStud: true,
        standingFee: 1000,
        seasonBookings: 0,
        bookSize: 40,
        retired: false,
      },
    });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: [sire, dam],
      npcStables: [
        {
          id: "npc-stable-1",
          name: "Test Stable",
          owner: "Test Owner",
          tier: "mid",
          reputation: 50,
          founded: 1,
          cash: 10000,
          horses: ["sire-1"],
          isMajor: false,
          colors: { primary: "red", secondary: "blue" },
          personality: "conservative",
        },
      ],
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

    const context = createTestContext(state, [intent]);
    const result = breedingResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(3);
    const pregnancyImpact = result.impacts.find((i) => i.type === "pregnancy_creation");
    expect(pregnancyImpact).toBeDefined();
  });

  it("should generate cash change impact for stud fee", () => {
    const sire = createTestHorse({
      id: "sire-1",
      gender: "horse",
      age: 5,
      stableId: "npc-stable-1",
      stud: {
        atStud: true,
        standingFee: 1000,
        seasonBookings: 0,
        bookSize: 40,
        retired: false,
      },
    });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: [sire, dam],
      npcStables: [
        {
          id: "npc-stable-1",
          name: "Test Stable",
          owner: "Test Owner",
          tier: "mid",
          reputation: 50,
          founded: 1,
          cash: 10000,
          horses: ["sire-1"],
          isMajor: false,
          colors: { primary: "red", secondary: "blue" },
          personality: "conservative",
        },
      ],
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

    const context = createTestContext(state, [intent]);
    const result = breedingResolutionPhase.execute(context);

    const cashImpact = result.impacts.find((i) => i.type === "cash_change");
    expect(cashImpact).toBeDefined();
  });

  it("should skip non-breeding intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const context = createTestContext(state, [] as any);
    const result = breedingResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should have correct order", () => {
    expect(breedingResolutionPhase.order).toBe(25);
  });

  it("should have correct name", () => {
    expect(breedingResolutionPhase.name).toBe("breedingResolution");
  });
});
