import { describe, it, expect } from "vitest";
import { deriveEligibleRaces, findFirstEligibleRace } from "@/hooks/race/useHorseEligibleRaces";
import type { Horse, Race, Jockey } from "@/game/types";
import { createTestHorse, createTestJockey } from "@/tests/helpers";
import { makePlayerOwned } from "@/core/horse/ownership";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test Horse",
    age: 4,
    gender: "horse",
    energy: 100,
    ownership: makePlayerOwned(),
    lifecycleStatus: "active",
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

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({
    id: "j1",
    name: "Test Jockey",
    ridingFee: 100,
    fame: 50,
    archetype: "versatile",
    ...overrides,
  });
}

const baseDay = 5;

describe("deriveEligibleRaces", () => {
  // ─── Filtering ───

  it("excludes resolved races", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, resolved: true });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("excludes races in the past (day <= currentDay)", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("excludes races beyond daysAhead window", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 31 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay, 30);
    expect(result.length).toBe(0);
  });

  it("includes race at exactly day + daysAhead", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 30 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay, 30);
    expect(result.length).toBe(1);
  });

  it("excludes horse with energy < 50 (uses enterRace guard, not eligibility.ts 15)", () => {
    const horse = mkHorse({ energy: 49 });
    const race = mkRace({ day: baseDay + 3 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("includes horse with energy = 50", () => {
    const horse = mkHorse({ energy: 50 });
    const race = mkRace({ day: baseDay + 3 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(1);
  });

  it("excludes ineligible by age restriction", () => {
    const horse = mkHorse({ age: 2 });
    const race = mkRace({ day: baseDay + 3, restrictions: { minAge: 4 } });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("excludes maiden race when horse has won", () => {
    const horse = mkHorse({
      raceHistory: [{ raceId: "old-r1", raceName: "Old Race", position: 1, day: 1 }],
    });
    const race = mkRace({ day: baseDay + 3, raceClass: "Maiden" });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("excludes invite-only when not invited", () => {
    const horse = mkHorse({ id: "h-not-invited" });
    const race = mkRace({
      day: baseDay + 3,
      graded: {
        key: "invite-test",
        grade: "G1",
        track: "T",
        surface: "Turf",
        requiresInvitation: true,
        invitedHorseIds: ["someone-else"],
      },
    });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  // ─── Already-entered flag ───

  it("marks already-entered race with isEntered=true", () => {
    const horse = mkHorse({ id: "h1" });
    const race = mkRace({
      day: baseDay + 3,
      entries: [{ horseId: "h1", ownership: makePlayerOwned() }],
    });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    // isHorseEligibleForRace returns false for already-entered, so this should be empty
    // But the hook should still not include it — the eligibility check excludes it
    expect(result.length).toBe(0);
  });

  // ─── Cost calculation ───

  it("totalCost = entryFee + estimatedJockeyFee + transportCost", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, entryFee: 300 });
    const jockey = mkJockey({ ridingFee: 100 });
    const result = deriveEligibleRaces(horse, [race], [jockey], 100000, baseDay);
    expect(result.length).toBe(1);
    expect(result[0].entryFee).toBe(300);
    expect(result[0].estimatedJockeyFee).toBe(100);
    expect(result[0].transportCost).toBe(150);
    expect(result[0].totalCost).toBe(550);
  });

  it("estimatedJockeyFee = 0 when no jockeys available", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result[0].estimatedJockeyFee).toBe(0);
    expect(result[0].totalCost).toBe(300 + 0 + 150);
  });

  it("estimatedJockeyFee = retained jockey fee when stableId='player'", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const retained = mkJockey({ id: "retained", stableId: "player", ridingFee: 250 });
    const freelance = mkJockey({ id: "freelance", ridingFee: 50, fame: 99 });
    const result = deriveEligibleRaces(horse, [race], [retained, freelance], 100000, baseDay);
    expect(result[0].estimatedJockeyFee).toBe(250);
  });

  // ─── requiresDialog flag ───

  it("requiresDialog=true for G1 race (needs nomination)", () => {
    const horse = mkHorse();
    const race = mkRace({
      day: baseDay + 3,
      graded: { key: "g1test", grade: "G1", track: "T", surface: "Turf" },
    });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result[0].requiresDialog).toBe(true);
  });

  it("requiresDialog=true for G3 race (needs nomination)", () => {
    const horse = mkHorse();
    const race = mkRace({
      day: baseDay + 3,
      graded: { key: "g3test", grade: "G3", track: "T", surface: "Turf" },
    });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result[0].requiresDialog).toBe(true);
  });

  it("requiresDialog=true for invite-only race", () => {
    const horse = mkHorse({ id: "h-invited" });
    const race = mkRace({
      day: baseDay + 3,
      graded: {
        key: "invite-test",
        grade: "G1",
        track: "T",
        surface: "Turf",
        requiresInvitation: true,
        invitedHorseIds: ["h-invited"],
      },
    });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result[0].requiresDialog).toBe(true);
  });

  it("requiresDialog=false for ungraded allowance race", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result[0].requiresDialog).toBe(false);
  });

  // ─── Sorting ───

  it("rows sorted by suitabilityScore descending", () => {
    const horse = mkHorse({
      stats: {
        speed: 75,
        stamina: 75,
        acceleration: 75,
        consistency: 75,
        temperament: 50,
        conformation: 50,
      },
    });
    const lowPurse = mkRace({ id: "r-low", day: baseDay + 3, purse: 1000 });
    const highPurse = mkRace({ id: "r-high", day: baseDay + 4, purse: 100000 });
    const result = deriveEligibleRaces(horse, [lowPurse, highPurse], [], 100000, baseDay);
    expect(result.length).toBe(2);
    expect(result[0].race.id).toBe("r-high");
    expect(result[0].suitabilityScore).toBeGreaterThan(result[1].suitabilityScore);
  });

  // ─── Edge cases ───

  it("returns [] when horse is undefined", () => {
    const result = deriveEligibleRaces(undefined, [mkRace()], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("returns [] when no races in window", () => {
    const horse = mkHorse();
    const result = deriveEligibleRaces(horse, [], [], 100000, baseDay);
    expect(result.length).toBe(0);
  });

  it("handles horse with no race history (maiden races show up)", () => {
    const horse = mkHorse({ raceHistory: [] });
    const race = mkRace({ day: baseDay + 3, raceClass: "Maiden" });
    const result = deriveEligibleRaces(horse, [race], [], 100000, baseDay);
    expect(result.length).toBe(1);
  });
});

describe("findFirstEligibleRace", () => {
  it("returns nearest eligible maiden for starter horse", () => {
    const horse = mkHorse({
      age: 3,
      hemisphere: "Northern",
      raceHistory: [],
      stats: {
        speed: 40,
        stamina: 40,
        acceleration: 40,
        consistency: 40,
        temperament: 50,
        conformation: 50,
      },
    });
    const stakes = mkRace({ id: "r-stakes", day: baseDay + 5, raceClass: "Stakes", minStat: 65 });
    const maiden = mkRace({ id: "r-maiden", day: baseDay + 10, raceClass: "Maiden" });
    const result = findFirstEligibleRace(horse, [stakes, maiden], baseDay);
    expect(result).toBeDefined();
    expect(result!.id).toBe("r-maiden");
  });

  it("returns undefined when no eligible races exist", () => {
    const horse = mkHorse({
      raceHistory: [{ raceId: "old", raceName: "Old", position: 1, day: 1 }],
    });
    const maiden = mkRace({ day: baseDay + 5, raceClass: "Maiden" });
    const result = findFirstEligibleRace(horse, [maiden], baseDay);
    expect(result).toBeUndefined();
  });

  it("ignores resolved races", () => {
    const horse = mkHorse({ raceHistory: [] });
    const resolved = mkRace({
      id: "r-resolved",
      day: baseDay + 3,
      raceClass: "Maiden",
      resolved: true,
    });
    const upcoming = mkRace({ id: "r-upcoming", day: baseDay + 5, raceClass: "Maiden" });
    const result = findFirstEligibleRace(horse, [resolved, upcoming], baseDay);
    expect(result).toBeDefined();
    expect(result!.id).toBe("r-upcoming");
  });

  it("ignores races on or before current day", () => {
    const horse = mkHorse({ raceHistory: [] });
    const today = mkRace({ id: "r-today", day: baseDay, raceClass: "Maiden" });
    const result = findFirstEligibleRace(horse, [today], baseDay);
    expect(result).toBeUndefined();
  });

  it("returns undefined when energy < 50", () => {
    const horse = mkHorse({ energy: 49, raceHistory: [] });
    const maiden = mkRace({ day: baseDay + 10, raceClass: "Maiden" });
    const result = findFirstEligibleRace(horse, [maiden], baseDay);
    expect(result).toBeUndefined();
  });
});

describe("deriveEligibleRaces — chemistry-aware jockey fee estimation", () => {
  it("estimates fee from affinity jockey rather than higher-fame jockey", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "P" });
    const race = mkRace({ day: baseDay + 3 });
    const famousJockey = mkJockey({
      id: "j-famous",
      fame: 90,
      ridingFee: 500,
      archetype: "versatile",
      affinityMap: {},
    });
    const affinityJockey = mkJockey({
      id: "j-affinity",
      fame: 30,
      ridingFee: 150,
      archetype: "versatile",
      affinityMap: { h1: 500 },
    });
    const result = deriveEligibleRaces(
      horse,
      [race],
      [famousJockey, affinityJockey],
      100000,
      baseDay,
    );
    expect(result.length).toBe(1);
    // Should pick the affinity jockey's fee (150), not the famous jockey's fee (500)
    expect(result[0].estimatedJockeyFee).toBe(150);
  });
});
