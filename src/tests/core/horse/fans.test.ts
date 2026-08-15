import { describe, it, expect } from "vitest";
import {
  deriveFanCount,
  calculateFanGainsForRaces,
  applyFanGainsToHorses,
  applyFanDecay,
} from "@/core/horse/fans";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race } from "@/game/types";
import {
  FANS_PER_FAME_POINT,
  FAN_GAIN_G1_WIN,
  FAN_GAIN_G2_WIN,
  FAN_GAIN_G3_WIN,
  FAN_GAIN_OTHER_WIN,
  FAN_GAIN_TOP3_G1,
  FAN_GAIN_TOP3_G2,
  FAN_GAIN_TOP3_G3,
  FAN_GAIN_TOP3_OTHER,
  FAN_GAIN_TOP5,
  FAN_BONUS_LARGE_PURSE,
  FAN_BONUS_MEDIUM_PURSE,
  FAN_DAILY_DECAY_RATE,
  FAN_DECAY_GRACE_DAYS,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
} from "@/constants";

function createRaceWithResult(
  overrides: Partial<Race> & {
    result?: { horseId: string; position: number; time: number }[];
  } = {},
): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    surface: "Dirt",
    raceClass: "Stakes",
    entryFee: 100,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: true,
    ...overrides,
  };
}

const g1 = { key: "g1", grade: "G1" as const, track: "test", surface: "Dirt" as const };
const g2 = { key: "g2", grade: "G2" as const, track: "test", surface: "Dirt" as const };
const g3 = { key: "g3", grade: "G3" as const, track: "test", surface: "Dirt" as const };

function result(horseId: string, position: number) {
  return [{ horseId, position, time: 90 }];
}

describe("deriveFanCount", () => {
  it("returns 0 for fame 0", () => {
    expect(deriveFanCount(0)).toBe(0);
  });

  it("returns 25000 for fame 50", () => {
    expect(deriveFanCount(50)).toBe(25000);
  });

  it("returns 50000 for fame 100", () => {
    expect(deriveFanCount(100)).toBe(50000);
  });

  it("uses FANS_PER_FAME_POINT constant", () => {
    expect(deriveFanCount(1)).toBe(FANS_PER_FAME_POINT);
  });
});

describe("calculateFanGainsForRaces", () => {
  it("calculates fan gain for G1 win", () => {
    const race = createRaceWithResult({ graded: g1, result: result("h-1", 1) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G1_WIN);
  });

  it("calculates fan gain for G2 win", () => {
    const race = createRaceWithResult({ graded: g2, result: result("h-1", 1) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G2_WIN);
  });

  it("calculates fan gain for G3 win", () => {
    const race = createRaceWithResult({ graded: g3, result: result("h-1", 1) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G3_WIN);
  });

  it("calculates fan gain for non-graded win", () => {
    const race = createRaceWithResult({ result: result("h-1", 1) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_OTHER_WIN);
  });

  it("calculates fan gain for top 3 in G1", () => {
    const race = createRaceWithResult({ graded: g1, result: result("h-1", 2) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_TOP3_G1);
  });

  it("calculates fan gain for top 3 in G2", () => {
    const race = createRaceWithResult({ graded: g2, result: result("h-1", 3) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_TOP3_G2);
  });

  it("calculates fan gain for top 3 in G3", () => {
    const race = createRaceWithResult({ graded: g3, result: result("h-1", 3) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_TOP3_G3);
  });

  it("calculates fan gain for top 3 in non-graded", () => {
    const race = createRaceWithResult({ result: result("h-1", 3) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_TOP3_OTHER);
  });

  it("calculates fan gain for top 5 (position 4-5)", () => {
    const race = createRaceWithResult({ result: result("h-1", 4) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_TOP5);
  });

  it("adds large purse bonus", () => {
    const race = createRaceWithResult({
      graded: g1,
      purse: LARGE_PURSE_THRESHOLD + 1,
      result: result("h-1", 1),
    });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G1_WIN + FAN_BONUS_LARGE_PURSE);
  });

  it("adds medium purse bonus", () => {
    const race = createRaceWithResult({
      graded: g1,
      purse: MEDIUM_PURSE_THRESHOLD + 1,
      result: result("h-1", 1),
    });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G1_WIN + FAN_BONUS_MEDIUM_PURSE);
  });

  it("no fan gain for position > 5", () => {
    const race = createRaceWithResult({ result: result("h-1", 6) });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.has("h-1")).toBe(false);
  });

  it("no fan gain for unresolved race", () => {
    const race = createRaceWithResult({ resolved: false, result: undefined });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.size).toBe(0);
  });

  it("no fan gain for race with no result", () => {
    const race = createRaceWithResult({ result: undefined });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.size).toBe(0);
  });

  it("aggregates fan gains across multiple races for same horse", () => {
    const race1 = createRaceWithResult({ id: "r-1", graded: g1, result: result("h-1", 1) });
    const race2 = createRaceWithResult({ id: "r-2", graded: g2, result: result("h-1", 1) });
    const gains = calculateFanGainsForRaces([race1, race2]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G1_WIN + FAN_GAIN_G2_WIN);
  });

  it("handles empty races array", () => {
    const gains = calculateFanGainsForRaces([]);
    expect(gains.size).toBe(0);
  });
});

describe("applyFanGainsToHorses", () => {
  it("applies fan gains to matching horses", () => {
    const horses = [
      createTestHorse({ id: "h1", fanCount: 10000 }),
      createTestHorse({ id: "h2", fanCount: 20000 }),
    ];
    const gains = new Map([["h1", 15000]]);
    const result = applyFanGainsToHorses(horses, gains);
    expect(result[0].fanCount).toBe(25000);
    expect(result[1].fanCount).toBe(20000);
  });

  it("leaves horses without gains unchanged", () => {
    const horses = [createTestHorse({ id: "h1", fanCount: 10000 })];
    const gains = new Map<string, number>();
    const result = applyFanGainsToHorses(horses, gains);
    expect(result[0].fanCount).toBe(10000);
  });

  it("does not mutate original horses", () => {
    const horses = [createTestHorse({ id: "h1", fanCount: 10000 })];
    const gains = new Map([["h1", 15000]]);
    applyFanGainsToHorses(horses, gains);
    expect(horses[0].fanCount).toBe(10000);
  });

  it("does not go below 0 when applying negative-like gains", () => {
    const horses = [createTestHorse({ id: "h1", fanCount: 0 })];
    const gains = new Map([["h1", 0]]);
    const result = applyFanGainsToHorses(horses, gains);
    expect(result[0].fanCount).toBe(0);
  });
});

describe("applyFanDecay", () => {
  it("decays horses inactive beyond FAN_DECAY_GRACE_DAYS", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 50000,
      lastRaceDay: 0,
    });
    const currentDay = FAN_DECAY_GRACE_DAYS + 10;
    const result = applyFanDecay([horse], currentDay);
    const expected = Math.max(0, Math.round(50000 * (1 - FAN_DAILY_DECAY_RATE)));
    expect(result[0].fanCount).toBe(expected);
    expect(result[0].fanCount).toBeLessThan(50000);
  });

  it("does not decay horses within grace period", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 50000,
      lastRaceDay: 50,
    });
    const currentDay = 50 + FAN_DECAY_GRACE_DAYS - 1;
    const result = applyFanDecay([horse], currentDay);
    expect(result[0].fanCount).toBe(50000);
  });

  it("does not decay below 0", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 0,
      lastRaceDay: 0,
    });
    const currentDay = FAN_DECAY_GRACE_DAYS + 100;
    const result = applyFanDecay([horse], currentDay);
    expect(result[0].fanCount).toBe(0);
  });

  it("uses lastRaceDay to determine inactivity", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 50000,
      lastRaceDay: 100,
    });
    const currentDay = 100 + FAN_DECAY_GRACE_DAYS + 5;
    const result = applyFanDecay([horse], currentDay);
    expect(result[0].fanCount).toBeLessThan(50000);
  });

  it("does not decay horses with undefined lastRaceDay within grace", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 50000,
    });
    const result = applyFanDecay([horse], FAN_DECAY_GRACE_DAYS - 1);
    expect(result[0].fanCount).toBe(50000);
  });

  it("does not mutate original horses", () => {
    const horse = createTestHorse({
      id: "h1",
      fanCount: 50000,
      lastRaceDay: 0,
    });
    applyFanDecay([horse], FAN_DECAY_GRACE_DAYS + 10);
    expect(horse.fanCount).toBe(50000);
  });
});
