/**
 * Tests for private trial pure helpers extracted from racingSlice.
 */

import { describe, it, expect } from "vitest";
import {
  validateTrialHorse,
  buildPacemaker,
  validateStablemate,
  buildTrialRace,
  applyTrialCosts,
  PRIVATE_TRIAL_COST,
  PRIVATE_TRIAL_HORSE_ENERGY_COST,
  PRIVATE_TRIAL_OPPONENT_ENERGY_COST,
} from "@/core/race/privateTrialHelpers";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

describe("validateTrialHorse", () => {
  it("returns null for a valid player-owned horse with sufficient cash and energy", () => {
    const horse = createTestHorse({
      id: "h1",
      energy: 50,
      ownership: makePlayerOwned(),
    });
    expect(validateTrialHorse(horse, 1000)).toBeNull();
  });

  it("returns error if horse is undefined", () => {
    expect(validateTrialHorse(undefined, 1000)).toBe("Horse not found.");
  });

  it("returns error if horse is not player-owned", () => {
    const horse = createTestHorse({ id: "h1", ownership: makeUnowned() });
    expect(validateTrialHorse(horse, 1000)).toBe("You do not own this horse.");
  });

  it("returns error if cash is insufficient", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), energy: 50 });
    const result = validateTrialHorse(horse, 100);
    expect(result).toContain("Insufficient cash");
    expect(result).toContain(`${PRIVATE_TRIAL_COST}`);
  });

  it("returns error if horse energy is too low", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned(), energy: 10 });
    expect(validateTrialHorse(horse, 1000)).toContain("too fatigued");
  });
});

describe("buildPacemaker", () => {
  it("creates a horse named Pacemaker with a unique id", () => {
    const horse = createTestHorse({ id: "h1", potential: 85 });
    const pacemaker = buildPacemaker(horse, 1);
    expect(pacemaker.name).toBe("Pacemaker");
    expect(pacemaker.id).toMatch(/^pacemaker_/);
  });

  it("is deterministic for the same inputs", () => {
    const horse = createTestHorse({ id: "h1", potential: 85 });
    const a = buildPacemaker(horse, 1);
    const b = buildPacemaker(horse, 1);
    // IDs differ due to generateUUID, but stats should match
    expect(a.stats).toEqual(b.stats);
  });
});

describe("validateStablemate", () => {
  it("returns ok if stablemate has enough energy", () => {
    const stablemate = createTestHorse({ id: "h2", energy: 50 });
    const result = validateStablemate(stablemate);
    expect(result.ok).toBe(true);
  });

  it("returns error if stablemate is undefined", () => {
    const result = validateStablemate(undefined);
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toBe("Stablemate not found.");
  });

  it("returns error if stablemate energy is too low", () => {
    const stablemate = createTestHorse({ id: "h2", energy: 5 });
    const result = validateStablemate(stablemate);
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toContain("too fatigued");
  });
});

describe("buildTrialRace", () => {
  it("constructs a trial race with 2 entries", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned() });
    const opponent = createTestHorse({ id: "h2", ownership: makeUnowned() });
    const race = buildTrialRace(horse, opponent, 1600, "Dirt", 10);
    expect(race.distance).toBe(1600);
    expect(race.surface).toBe("Dirt");
    expect(race.day).toBe(10);
    expect(race.entries).toHaveLength(2);
    expect(race.entries[0].horseId).toBe("h1");
    expect(race.entries[1].horseId).toBe("h2");
  });
});

describe("applyTrialCosts", () => {
  it("deducts cash and energy from the trial horse", () => {
    const horse = createTestHorse({ id: "h1", energy: 50, ownership: makePlayerOwned() });
    const horses = { h1: horse };
    const result = applyTrialCosts(
      horses,
      "h1",
      undefined,
      1000,
      10,
      [],
      [],
      "TestHorse",
      1600,
      "Dirt",
      "Pacemaker",
    );
    expect(result.cash).toBe(1000 - PRIVATE_TRIAL_COST);
    expect(result.horses.h1.energy).toBe(50 - PRIVATE_TRIAL_HORSE_ENERGY_COST);
  });

  it("deducts energy from the stablemate when provided", () => {
    const horse = createTestHorse({ id: "h1", energy: 50, ownership: makePlayerOwned() });
    const stablemate = createTestHorse({ id: "h2", energy: 40 });
    const horses = { h1: horse, h2: stablemate };
    const result = applyTrialCosts(
      horses,
      "h1",
      stablemate,
      1000,
      10,
      [],
      [],
      "TestHorse",
      1600,
      "Dirt",
      "Stablemate",
    );
    expect(result.horses.h2.energy).toBe(40 - PRIVATE_TRIAL_OPPONENT_ENERGY_COST);
  });

  it("appends a log entry and transaction", () => {
    const horse = createTestHorse({ id: "h1", energy: 50, ownership: makePlayerOwned() });
    const horses = { h1: horse };
    const result = applyTrialCosts(
      horses,
      "h1",
      undefined,
      1000,
      10,
      [],
      [],
      "TestHorse",
      1600,
      "Dirt",
      "Pacemaker",
    );
    expect(result.log).toHaveLength(1);
    expect(result.log[0].text).toContain("TestHorse");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBe(-PRIVATE_TRIAL_COST);
  });
});
