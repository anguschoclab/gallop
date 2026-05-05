/**
 * Tests for impact application (resolver core)
 */

import { describe, it, expect } from "vitest";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";
import type { GameState, Stable } from "@/game/types";
import type { AnyImpact, CashImpact, HorseStatImpact, EnergyImpact, HorseCreationImpact, HorseTransferImpact } from "@/core/resolver/impacts";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("applyImpacts", () => {
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
  });

  it("should apply cash change impact to player", () => {
    const state = createTestState();
    const impact: CashImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: 500,
      reason: "Test cash change",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.cash).toBe(10500);
    expect(result.impactLog).toHaveLength(1);
    expect(result.impactLog[0].type).toBe("cash_change");
  });

  it("should apply cash change impact to NPC stable", () => {
    const npcStable: Stable = {
      id: "npc-1",
      name: "Test Stable",
      owner: "Test Owner",
      tier: "mid",
      reputation: 50,
      founded: 1,
      cash: 5000,
      horses: [],
      isMajor: false,
      colors: { primary: "red", secondary: "blue" },
      personality: "conservative",
    };

    const state: GameState = {
      ...createTestState(),
      npcStables: [npcStable],
    };

    const impact: CashImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "cash_change",
      entityId: "npc-1",
      amount: 500,
      reason: "Test cash change",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.npcStables[0].cash).toBe(5500);
  });

  it("should prevent cash from going negative", () => {
    const state = createTestState();
    const impact: CashImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: -20000,
      reason: "Test cash change",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.cash).toBe(0);
  });

  it("should apply horse stat change impact", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90 });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impact: HorseStatImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "horse_stat_change",
      horseId: "horse-1",
      stat: "speed",
      delta: 5,
      reason: "Training",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses[0].stats.speed).toBe(85);
  });

  it("should clamp horse stat to potential", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 85, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90 });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impact: HorseStatImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "horse_stat_change",
      horseId: "horse-1",
      stat: "speed",
      delta: 10,
      reason: "Training",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses[0].stats.speed).toBe(90);
  });

  it("should apply energy change impact", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90, energy: 80 });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impact: EnergyImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "energy_change",
      horseId: "horse-1",
      delta: -25,
      reason: "Race",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses[0].energy).toBe(55);
  });

  it("should clamp energy between 0 and 100", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90, energy: 50 });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impact1: EnergyImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "energy_change",
      horseId: "horse-1",
      delta: -100,
      reason: "Race",
    };

    const impact2: EnergyImpact = {
      id: "impact-2",
      intentId: "intent-2",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "energy_change",
      horseId: "horse-1",
      delta: 200,
      reason: "Rest",
    };

    const context1: ResolverContext = {
      state,
      intents: [],
      impacts: [impact1],
      impactLog: [],
      day: 1,
    };

    const result1 = applyImpacts(context1);
    expect(result1.state.horses[0].energy).toBe(0);

    const context2: ResolverContext = {
      state,
      intents: [],
      impacts: [impact2],
      impactLog: [],
      day: 1,
    };

    const result2 = applyImpacts(context2);
    expect(result2.state.horses[0].energy).toBe(100);
  });

  it("should apply horse creation impact", () => {
    const state = createTestState();
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90 });

    const impact: HorseCreationImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "horse_creation",
      horse,
      reason: "Birth",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses).toHaveLength(1);
    expect(result.state.horses[0].id).toBe("horse-1");
  });

  it("should apply horse transfer impact", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90, stableId: undefined });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impact: HorseTransferImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "horse_transfer",
      horseId: "horse-1",
      fromStableId: undefined,
      toStableId: "npc-1",
      price: 5000,
      reason: "Sale",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses[0].stableId).toBe("npc-1");
    expect(result.state.horses[0].owned).toBe(false);
  });

  it("should apply multiple impacts in order", () => {
    const horse = createTestHorse({ id: "horse-1", stats: { speed: 80, stamina: 75, acceleration: 70, consistency: 65 }, potential: 90 });

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const impacts: AnyImpact[] = [
      {
        id: "impact-1",
        intentId: "intent-1",
        day: 1,
        phase: "test",
        logLevel: "always",
        type: "energy_change",
        horseId: "horse-1",
        delta: -25,
        reason: "Race",
      },
      {
        id: "impact-2",
        intentId: "intent-1",
        day: 1,
        phase: "test",
        logLevel: "always",
        type: "horse_stat_change",
        horseId: "horse-1",
        stat: "speed",
        delta: 2,
        reason: "Training",
      },
    ];

    const context: ResolverContext = {
      state,
      intents: [],
      impacts,
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.state.horses[0].energy).toBe(75);
    expect(result.state.horses[0].stats.speed).toBe(82);
    expect(result.impactLog).toHaveLength(2);
  });

  it("should not log impacts with logLevel never", () => {
    const state = createTestState();
    const impact: CashImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "never",
      type: "cash_change",
      entityId: "player",
      amount: 500,
      reason: "Test cash change",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    const result = applyImpacts(context);
    expect(result.impactLog).toHaveLength(0);
  });

  it("should preserve immutability of original state", () => {
    const state = createTestState();
    const originalCash = state.cash;

    const impact: CashImpact = {
      id: "impact-1",
      intentId: "intent-1",
      day: 1,
      phase: "test",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: 500,
      reason: "Test cash change",
    };

    const context: ResolverContext = {
      state,
      intents: [],
      impacts: [impact],
      impactLog: [],
      day: 1,
    };

    applyImpacts(context);
    expect(state.cash).toBe(originalCash);
  });
});
