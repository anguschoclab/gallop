import { describe, it, expect } from "vitest";
import { getMinimumAgeForHemisphere, isHorseEligibleForRace } from "@/core/race/eligibility";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test",
    age: 4,
    gender: "horse",
    ...overrides,
  });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  const base: Race = {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  };
  return { ...base, ...overrides };
}

describe("getMinimumAgeForHemisphere", () => {
  it("Northern with minAgeNorthern → uses it", () => {
    expect(getMinimumAgeForHemisphere("Northern", { minAgeNorthern: 2 })).toBe(2);
  });

  it("Southern with minAgeSouthern → uses it", () => {
    expect(getMinimumAgeForHemisphere("Southern", { minAgeSouthern: 3 })).toBe(3);
  });

  it("Southern without specific field → minAge + 1", () => {
    expect(getMinimumAgeForHemisphere("Southern", { minAge: 2 })).toBe(3);
  });

  it("Northern without specific field → minAge (no +1)", () => {
    expect(getMinimumAgeForHemisphere("Northern", { minAge: 2 })).toBe(2);
  });

  it("no restrictions → default 2 for Northern", () => {
    expect(getMinimumAgeForHemisphere("Northern", undefined)).toBe(2);
  });

  it("no restrictions → default 3 for Southern (2+1)", () => {
    expect(getMinimumAgeForHemisphere("Southern", undefined)).toBe(3);
  });
});

describe("isHorseEligibleForRace", () => {
  it("accepts a fully eligible horse", () => {
    const h = mkHorse();
    const r = mkRace();
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(true);
  });

  it("rejects if overall rating < race.minStat", () => {
    const h = mkHorse({ stats: { speed: 30, stamina: 30, acceleration: 30, consistency: 30, temperament: 50, conformation: 50 } });
    const r = mkRace({ minStat: 70 });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(false);
  });

  it("accepts if overall rating exactly meets minStat", () => {
    const h = mkHorse({ stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70, temperament: 50, conformation: 50 } });
    const r = mkRace({ minStat: 70 });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(true);
  });

  it("rejects if horse.age < minAge", () => {
    const h = mkHorse({ age: 1 });
    const r = mkRace({ restrictions: { minAge: 2 } });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(false);
  });

  it("rejects if horse.age > maxAge", () => {
    const h = mkHorse({ age: 5 });
    const r = mkRace({ restrictions: { minAge: 2, maxAge: 4 } });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(false);
  });

  it("accepts horse exactly at maxAge", () => {
    const h = mkHorse({ age: 4 });
    const r = mkRace({ restrictions: { minAge: 2, maxAge: 4 } });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(true);
  });

  it("rejects if energy < 15", () => {
    const h = mkHorse({ energy: 14 });
    const r = mkRace();
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(false);
  });

  it("accepts if energy exactly 15", () => {
    const h = mkHorse({ energy: 15 });
    const r = mkRace();
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(true);
  });

  it("rejects if horse is pregnant", () => {
    const h = mkHorse({ id: "preg" });
    const r = mkRace();
    expect(isHorseEligibleForRace(h, r, new Set(["preg"]))).toBe(false);
  });

  it("rejects if horse already entered", () => {
    const h = mkHorse({ id: "already" });
    const r = mkRace({ entries: [{ horseId: "already", owned: true }] });
    expect(isHorseEligibleForRace(h, r, new Set())).toBe(false);
  });
});
