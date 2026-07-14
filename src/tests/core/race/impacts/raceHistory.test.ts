import { describe, it, expect } from "vitest";
import { generateRaceHistoryImpact } from "@/core/race/impacts/raceHistory";
import { createTestHorse } from "@/tests/helpers";
import type { Race } from "@/core/race/types";

function createTestRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 50000,
    fieldSize: 5,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("generateRaceHistoryImpact", () => {
  const horse = createTestHorse({ id: "h1", age: 3 });

  it("sets winAndYouInQualified when position === 1 and race has winAndYouInTarget", () => {
    const race = createTestRace({
      graded: {
        key: "test",
        grade: "G1",
        track: "Test Track",
        surface: "Turf",
        winAndYouInTarget: "breeders-cup-classic",
      },
    });
    const impact = generateRaceHistoryImpact(horse, 1, 95.5, race, 90, 10);
    expect(impact.raceHistoryEntry.winAndYouInQualified).toEqual({
      year: expect.any(Number),
      raceId: "race-1",
      raceKey: "breeders-cup-classic",
    });
  });

  it("leaves winAndYouInQualified undefined when position !== 1", () => {
    const race = createTestRace({
      graded: {
        key: "test",
        grade: "G1",
        track: "Test Track",
        surface: "Turf",
        winAndYouInTarget: "breeders-cup-classic",
      },
    });
    const impact = generateRaceHistoryImpact(horse, 2, 96.0, race, 85, 10);
    expect(impact.raceHistoryEntry.winAndYouInQualified).toBeUndefined();
  });

  it("leaves winAndYouInQualified undefined when race has no winAndYouInTarget", () => {
    const race = createTestRace({
      graded: { key: "test", grade: "G1", track: "Test Track", surface: "Turf" },
    });
    const impact = generateRaceHistoryImpact(horse, 1, 95.5, race, 90, 10);
    expect(impact.raceHistoryEntry.winAndYouInQualified).toBeUndefined();
  });

  it("includes purseEarned for graded race winner using GRADED_PRIZE_SPLIT", () => {
    const race = createTestRace({
      purse: 100000,
      graded: { key: "test", grade: "G1", track: "Test Track", surface: "Turf" },
    });
    const impact = generateRaceHistoryImpact(horse, 1, 95.5, race, 90, 10);
    expect(impact.raceHistoryEntry.purseEarned).toBe(Math.round(100000 * 0.7));
  });

  it("includes purseEarned for non-graded race winner using PRIZE_SPLIT", () => {
    const race = createTestRace({ purse: 100000 });
    const impact = generateRaceHistoryImpact(horse, 1, 95.5, race, 90, 10);
    expect(impact.raceHistoryEntry.purseEarned).toBe(Math.round(100000 * 0.6));
  });

  it("sets purseEarned to 0 for positions beyond prize split length", () => {
    const race = createTestRace({ purse: 100000 });
    const impact = generateRaceHistoryImpact(horse, 10, 100.0, race, 50, 10);
    expect(impact.raceHistoryEntry.purseEarned).toBe(0);
  });
});
