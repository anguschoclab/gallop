/**
 * raceSimulationService.barrier.test.ts - Tests for buildRaceField barrier respect
 */

import { describe, it, expect } from "vitest";
import { buildRaceField } from "@/services/race/raceSimulationService";
import type { Horse, Race, RaceEntry } from "@/game/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse(overrides);
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: overrides.distance ?? 1600,
    raceClass: overrides.raceClass ?? "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: overrides.fieldSize ?? 6,
    entries: overrides.entries ?? [],
    resolved: false,
    ...overrides,
  };
}

describe("buildRaceField — pre-assigned barriers", () => {
  // 14. All entries pre-assigned barriers — barriers preserved, no shuffling
  it("all entries with pre-assigned barriers preserve those barriers", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", owned: true, barrier: 3 },
      { horseId: "h2", owned: true, barrier: 1 },
      { horseId: "h3", owned: true, barrier: 2 },
    ];
    const horses = [
      mkHorse({ id: "h1", owned: true }),
      mkHorse({ id: "h2", owned: true }),
      mkHorse({ id: "h3", owned: true }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const h1 = runners.find((r) => r.horseId === "h1");
    const h2 = runners.find((r) => r.horseId === "h2");
    const h3 = runners.find((r) => r.horseId === "h3");

    expect(h1?.barrier).toBe(3);
    expect(h2?.barrier).toBe(1);
    expect(h3?.barrier).toBe(2);
  });

  // 15. No entries pre-assigned — all shuffled (backward compatible)
  it("no pre-assigned barriers — all entries get barriers 1..N (backward compatible)", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", owned: true },
      { horseId: "h2", owned: true },
      { horseId: "h3", owned: true },
    ];
    const horses = [
      mkHorse({ id: "h1", owned: true }),
      mkHorse({ id: "h2", owned: true }),
      mkHorse({ id: "h3", owned: true }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const barriers = runners.map((r) => r.barrier).sort((a, b) => a - b);
    expect(barriers).toEqual([1, 2, 3]);
  });

  // 16. Mix: 3 pre-assigned + 2 unassigned — unassigned get remaining barriers
  it("mix of pre-assigned and unassigned — unassigned get remaining barriers, no conflicts", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", owned: true, barrier: 2 },
      { horseId: "h2", owned: true, barrier: 5 },
      { horseId: "h3", owned: true, barrier: 1 },
      { horseId: "h4", owned: true },
      { horseId: "h5", owned: true },
    ];
    const horses = Array.from({ length: 5 }, (_, i) => mkHorse({ id: `h${i + 1}`, owned: true }));
    const race = mkRace({ fieldSize: 5, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const barriers = runners.map((r) => r.barrier).sort((a, b) => a - b);
    expect(barriers).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(barriers).size).toBe(5);

    // Pre-assigned barriers preserved
    const h1 = runners.find((r) => r.horseId === "h1");
    const h2 = runners.find((r) => r.horseId === "h2");
    const h3 = runners.find((r) => r.horseId === "h3");
    expect(h1?.barrier).toBe(2);
    expect(h2?.barrier).toBe(5);
    expect(h3?.barrier).toBe(1);
  });

  // 17. Filler horses get barriers from remaining pool
  it("filler horses get barriers from remaining pool after pre-assigned entries", () => {
    const entries: RaceEntry[] = [{ horseId: "h1", owned: true, barrier: 1 }];
    const horses = [mkHorse({ id: "h1", owned: true })];
    const race = mkRace({ fieldSize: 4, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const barriers = runners.map((r) => r.barrier).sort((a, b) => a - b);
    expect(barriers).toEqual([1, 2, 3, 4]);
    expect(new Set(barriers).size).toBe(4);

    // h1 keeps barrier 1
    const h1 = runners.find((r) => r.horseId === "h1");
    expect(h1?.barrier).toBe(1);
  });

  // 18. Barrier numbering is contiguous 1..totalRunners with no gaps or duplicates
  it("barrier numbering is contiguous 1..totalRunners with no gaps or duplicates", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", owned: true, barrier: 3 },
      { horseId: "h2", owned: true },
      { horseId: "h3", owned: true, barrier: 1 },
    ];
    const horses = [
      mkHorse({ id: "h1", owned: true }),
      mkHorse({ id: "h2", owned: true }),
      mkHorse({ id: "h3", owned: true }),
    ];
    const race = mkRace({ fieldSize: 6, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const barriers = runners.map((r) => r.barrier).sort((a, b) => a - b);
    expect(barriers).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(barriers).size).toBe(6);
  });

  // 19. Bumped entry scenario: entry with barrier removed, new entry added — gets remaining barrier
  it("bumped entry scenario: new entry gets a remaining barrier without conflict", () => {
    // Simulate: original race had h1(barrier=1), h2(barrier=2), h3(barrier=3)
    // h2 was bumped, so entries are now h1(barrier=1), h3(barrier=3), h4(no barrier)
    const entries: RaceEntry[] = [
      { horseId: "h1", owned: true, barrier: 1 },
      { horseId: "h3", owned: true, barrier: 3 },
      { horseId: "h4", owned: true },
    ];
    const horses = [
      mkHorse({ id: "h1", owned: true }),
      mkHorse({ id: "h3", owned: true }),
      mkHorse({ id: "h4", owned: true }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const barriers = runners.map((r) => r.barrier).sort((a, b) => a - b);
    expect(barriers).toEqual([1, 2, 3]);
    expect(new Set(barriers).size).toBe(3);

    // h1 keeps barrier 1, h3 keeps barrier 3, h4 gets barrier 2
    const h1 = runners.find((r) => r.horseId === "h1");
    const h3 = runners.find((r) => r.horseId === "h3");
    const h4 = runners.find((r) => r.horseId === "h4");
    expect(h1?.barrier).toBe(1);
    expect(h3?.barrier).toBe(3);
    expect(h4?.barrier).toBe(2);
  });
});
