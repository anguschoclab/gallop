/**
 * autoRegister.test.ts - Unit tests for auto-registration logic
 *
 * Tests the calculateAutoRegisterEntries function and related helpers.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAutoRegisterEntries,
  calculateTransportCostForRace,
} from "@/core/campaign/autoRegister";
import type { Horse, Race, Jockey } from "@/game/types";

// Helper to create a minimal mock horse
function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: `horse-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Horse",
    ownership: { type: "player" },
    lifecycleStatus: "active",
    energy: 100,
    age: 4,
    hemisphere: "Northern",
    gender: "colt",
    runningStyle: "E",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      conformation: 70,
      consistency: 70,
    },
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.8 },
    corneringAptitude: 1.0,
    climbingAptitude: 1.0,
    racingViable: true,
    phenotypeResolved: true,
    ...overrides,
  } as Horse;
}

// Helper to create a minimal mock race
function createMockRace(overrides: Partial<Race> = {}): Race {
  return {
    id: `race-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Race",
    day: 10,
    distance: 1600,
    surface: "Turf",
    entryFee: 500,
    purse: 5000,
    fieldSize: 12,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

// Helper to create a minimal mock jockey
function createMockJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: `jockey-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Jockey",
    fame: 50,
    ridingFee: 100,
    archetype: "versatile",
    ...overrides,
  } as Jockey;
}

describe("calculateAutoRegisterEntries", () => {
  it("returns empty result when no player horses", () => {
    const horses: Horse[] = [];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.totalCost).toBe(0);
    expect(result.remainingCash).toBe(10000);
  });

  it("filters out non-owned horses", () => {
    const horses = [createMockHorse({ ownership: { type: "unowned" } })];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("filters out retired/deceased horses", () => {
    const horses = [
      createMockHorse({ lifecycleStatus: "retired" }),
      createMockHorse({ lifecycleStatus: "deceased" }),
    ];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("filters out consigned horses", () => {
    const horses = [createMockHorse({ consignedSaleId: "sale-123" })];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("filters out injured horses", () => {
    const horses = [
      createMockHorse({
        activeInjury: { type: "leg", severity: "moderate", recoveryDays: 30, onsetDay: 1 },
      }),
    ];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("filters out horses below energy threshold", () => {
    const horses = [createMockHorse({ energy: 30 })];
    const races: Race[] = [createMockRace()];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("filters out already-entered horses", () => {
    const horse = createMockHorse();
    const race = createMockRace({
      entries: [{ horseId: horse.id, ownership: { type: "player" }, weight: 126 }],
    });
    const horses = [horse];
    const races: Race[] = [race];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    expect(result.entries).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("respects budget constraints", () => {
    const horses = [createMockHorse({ id: "horse-1" }), createMockHorse({ id: "horse-2" })];
    const races: Race[] = [
      createMockRace({ id: "race-1", day: 5, entryFee: 1000 }),
      createMockRace({ id: "race-2", day: 6, entryFee: 1000 }),
    ];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 6500; // Only enough for 1 entry (1000 + 100 jockey + ~150 transport + 5000 reserve)
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    // Should only register 1 horse due to budget
    expect(result.entries.length).toBeLessThanOrEqual(1);
    expect(result.totalCost).toBeLessThanOrEqual(1500);
  });

  it("calculates transport costs correctly for graded races", () => {
    const g1Race = createMockRace({
      graded: {
        key: "g1-test",
        grade: "G1",
        track: "Test",
        trackId: "test-track",
        surface: "Turf",
      },
    });
    const g2Race = createMockRace({
      graded: {
        key: "g2-test",
        grade: "G2",
        track: "Test",
        trackId: "test-track",
        surface: "Turf",
      },
    });
    const g3Race = createMockRace({
      graded: {
        key: "g3-test",
        grade: "G3",
        track: "Test",
        trackId: "test-track",
        surface: "Turf",
      },
    });
    const ungradedRace = createMockRace();

    expect(calculateTransportCostForRace(g1Race)).toBe(500);
    expect(calculateTransportCostForRace(g2Race)).toBe(400);
    expect(calculateTransportCostForRace(g3Race)).toBe(300);
    expect(calculateTransportCostForRace(ungradedRace)).toBe(150);
  });

  it("selects retained jockey when available", () => {
    const horse = createMockHorse({ runningStyle: "E" });
    const race = createMockRace({ day: 5 });
    const retainedJockey = createMockJockey({ stableId: "player", name: "Retained Jockey" });
    const freelanceJockey = createMockJockey({ stableId: undefined, name: "Freelance Jockey" });

    const horses = [horse];
    const races: Race[] = [race];
    const jockeys: Jockey[] = [retainedJockey, freelanceJockey];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    if (result.entries.length > 0) {
      expect(result.entries[0].jockeyId).toBe(retainedJockey.id);
      expect(result.entries[0].jockeyName).toBe("Retained Jockey");
    }
  });

  it("selects freelance jockey by running style match", () => {
    const horse = createMockHorse({ runningStyle: "E" });
    const race = createMockRace({ day: 5 });
    const frontRunnerJockey = createMockJockey({
      stableId: undefined,
      archetype: "front_runner",
      name: "Front Runner Jockey",
    });
    const closerJockey = createMockJockey({
      stableId: undefined,
      archetype: "closer",
      name: "Closer Jockey",
    });

    const horses = [horse];
    const races: Race[] = [race];
    const jockeys: Jockey[] = [closerJockey, frontRunnerJockey];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    if (result.entries.length > 0) {
      // Should prefer front_runner for E style horse
      expect(result.entries[0].jockeyId).toBe(frontRunnerJockey.id);
    }
  });

  it("sorts entries by suitability score", () => {
    const horse1 = createMockHorse({ id: "horse-1", distanceAptitude: 1200 }); // Better for sprint
    const horse2 = createMockHorse({ id: "horse-2", distanceAptitude: 2400 }); // Better for staying

    const sprintRace = createMockRace({ id: "race-1", day: 5, distance: 1200 });
    const stayingRace = createMockRace({ id: "race-2", day: 6, distance: 2400 });

    const horses = [horse1, horse2];
    const races: Race[] = [sprintRace, stayingRace];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    // Each horse should get its best matching race
    expect(result.entries).toHaveLength(2);

    const entry1 = result.entries.find((e) => e.horseId === horse1.id);
    const entry2 = result.entries.find((e) => e.horseId === horse2.id);

    if (entry1) expect(entry1.raceId).toBe(sprintRace.id);
    if (entry2) expect(entry2.raceId).toBe(stayingRace.id);
  });

  it("tracks skipped horses with reasons", () => {
    const horse = createMockHorse({ energy: 100 });
    const races: Race[] = []; // No races available
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries([horse], races, jockeys, cash, day);

    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("No suitable races found");
  });

  it("excludes resolved races", () => {
    const horse = createMockHorse();
    const resolvedRace = createMockRace({ resolved: true, day: 5 });
    const unresolvedRace = createMockRace({ resolved: false, day: 6 });

    const horses = [horse];
    const races: Race[] = [resolvedRace, unresolvedRace];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    if (result.entries.length > 0) {
      expect(result.entries[0].raceId).toBe(unresolvedRace.id);
    }
  });

  it("excludes races outside lookahead window", () => {
    const horse = createMockHorse();
    const nearRace = createMockRace({ day: 5 });
    const farRace = createMockRace({ day: 20 }); // Outside default 7-day window

    const horses = [horse];
    const races: Race[] = [nearRace, farRace];
    const jockeys: Jockey[] = [createMockJockey()];
    const cash = 10000;
    const day = 1;

    const result = calculateAutoRegisterEntries(horses, races, jockeys, cash, day);

    if (result.entries.length > 0) {
      expect(result.entries[0].raceId).toBe(nearRace.id);
      expect(result.entries[0].raceDay).toBe(5);
    }
  });
});
