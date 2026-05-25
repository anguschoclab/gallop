/**
 * Tests for breeding resolution phase
 */

import { describe, it, expect } from "vitest";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { BreedingIntent } from "@/core/resolver/intents";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";

describe("breedingResolutionPhase", () => {
  const createTestState = (): GameState =>
    makeGameState({
      day: 1,
      cash: 10000,
      pendingIntents: [],
    }) as GameState;

  const createTestContext = (state: GameState, intents: BreedingIntent[] = []): PipelineContext =>
    createMockPipelineContext({ state, intents });

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
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        lifetimeFoals: 0,
        retiredOnDay: 0,
      },
    });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: [sire, dam],
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "Test Stable",
          owner: "Test Owner",
          tier: "mid",
          reputation: 50,
          founded: 1,
          cash: 10000,
          personality: "conservative",
        }),
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
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        lifetimeFoals: 0,
        retiredOnDay: 0,
      },
    });
    const dam = createTestHorse({ id: "dam-1", gender: "mare", age: 5 });
    const state: GameState = {
      ...createTestState(),
      cash: 5000,
      horses: [sire, dam],
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "Test Stable",
          owner: "Test Owner",
          tier: "mid",
          reputation: 50,
          founded: 1,
          cash: 10000,
          personality: "conservative",
        }),
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
