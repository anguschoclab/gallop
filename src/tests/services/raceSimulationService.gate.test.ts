/**
 * raceSimulationService.gate.test.ts - Tests for buildRaceField gate respect
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

describe("buildRaceField — pre-assigned gates", () => {
  // 14. All entries pre-assigned gates — gates preserved, no shuffling
  it("all entries with pre-assigned gates preserve those gates", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", ownership: { type: "player" }, gate: 3 },
      { horseId: "h2", ownership: { type: "player" }, gate: 1 },
      { horseId: "h3", ownership: { type: "player" }, gate: 2 },
    ];
    const horses = [
      mkHorse({ id: "h1", ownership: { type: "player" } }),
      mkHorse({ id: "h2", ownership: { type: "player" } }),
      mkHorse({ id: "h3", ownership: { type: "player" } }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const h1 = runners.find((r) => r.horseId === "h1");
    const h2 = runners.find((r) => r.horseId === "h2");
    const h3 = runners.find((r) => r.horseId === "h3");

    expect(h1?.gate).toBe(3);
    expect(h2?.gate).toBe(1);
    expect(h3?.gate).toBe(2);
  });

  // 15. No entries pre-assigned — all shuffled (backward compatible)
  it("no pre-assigned gates — all entries get gates 1..N (backward compatible)", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", ownership: { type: "player" } },
      { horseId: "h2", ownership: { type: "player" } },
      { horseId: "h3", ownership: { type: "player" } },
    ];
    const horses = [
      mkHorse({ id: "h1", ownership: { type: "player" } }),
      mkHorse({ id: "h2", ownership: { type: "player" } }),
      mkHorse({ id: "h3", ownership: { type: "player" } }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const gates = runners.map((r) => r.gate).sort((a, b) => a - b);
    expect(gates).toEqual([1, 2, 3]);
  });

  // 16. Mix: 3 pre-assigned + 2 unassigned — unassigned get remaining gates
  it("mix of pre-assigned and unassigned — unassigned get remaining gates, no conflicts", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", ownership: { type: "player" }, gate: 2 },
      { horseId: "h2", ownership: { type: "player" }, gate: 5 },
      { horseId: "h3", ownership: { type: "player" }, gate: 1 },
      { horseId: "h4", ownership: { type: "player" } },
      { horseId: "h5", ownership: { type: "player" } },
    ];
    const horses = Array.from({ length: 5 }, (_, i) =>
      mkHorse({ id: `h${i + 1}`, ownership: { type: "player" } }),
    );
    const race = mkRace({ fieldSize: 5, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const gates = runners.map((r) => r.gate).sort((a, b) => a - b);
    expect(gates).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(gates).size).toBe(5);

    // Pre-assigned gates preserved
    const h1 = runners.find((r) => r.horseId === "h1");
    const h2 = runners.find((r) => r.horseId === "h2");
    const h3 = runners.find((r) => r.horseId === "h3");
    expect(h1?.gate).toBe(2);
    expect(h2?.gate).toBe(5);
    expect(h3?.gate).toBe(1);
  });

  // 17. Filler horses get gates from remaining pool
  it("filler horses get gates from remaining pool after pre-assigned entries", () => {
    const entries: RaceEntry[] = [{ horseId: "h1", ownership: { type: "player" }, gate: 1 }];
    const horses = [mkHorse({ id: "h1", ownership: { type: "player" } })];
    const race = mkRace({ fieldSize: 4, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const gates = runners.map((r) => r.gate).sort((a, b) => a - b);
    expect(gates).toEqual([1, 2, 3, 4]);
    expect(new Set(gates).size).toBe(4);

    // h1 keeps gate 1
    const h1 = runners.find((r) => r.horseId === "h1");
    expect(h1?.gate).toBe(1);
  });

  // 18. Gate numbering is contiguous 1..totalRunners with no gaps or duplicates
  it("gate numbering is contiguous 1..totalRunners with no gaps or duplicates", () => {
    const entries: RaceEntry[] = [
      { horseId: "h1", ownership: { type: "player" }, gate: 3 },
      { horseId: "h2", ownership: { type: "player" } },
      { horseId: "h3", ownership: { type: "player" }, gate: 1 },
    ];
    const horses = [
      mkHorse({ id: "h1", ownership: { type: "player" } }),
      mkHorse({ id: "h2", ownership: { type: "player" } }),
      mkHorse({ id: "h3", ownership: { type: "player" } }),
    ];
    const race = mkRace({ fieldSize: 6, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const gates = runners.map((r) => r.gate).sort((a, b) => a - b);
    expect(gates).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(gates).size).toBe(6);
  });

  // 19. Bumped entry scenario: entry with gate removed, new entry added — gets remaining gate
  it("bumped entry scenario: new entry gets a remaining gate without conflict", () => {
    // Simulate: original race had h1(gate=1), h2(gate=2), h3(gate=3)
    // h2 was bumped, so entries are now h1(gate=1), h3(gate=3), h4(no gate)
    const entries: RaceEntry[] = [
      { horseId: "h1", ownership: { type: "player" }, gate: 1 },
      { horseId: "h3", ownership: { type: "player" }, gate: 3 },
      { horseId: "h4", ownership: { type: "player" } },
    ];
    const horses = [
      mkHorse({ id: "h1", ownership: { type: "player" } }),
      mkHorse({ id: "h3", ownership: { type: "player" } }),
      mkHorse({ id: "h4", ownership: { type: "player" } }),
    ];
    const race = mkRace({ fieldSize: 3, entries });

    const { runners } = buildRaceField({ race, horses, jockeys: [] });

    const gates = runners.map((r) => r.gate).sort((a, b) => a - b);
    expect(gates).toEqual([1, 2, 3]);
    expect(new Set(gates).size).toBe(3);

    // h1 keeps gate 1, h3 keeps gate 3, h4 gets gate 2
    const h1 = runners.find((r) => r.horseId === "h1");
    const h3 = runners.find((r) => r.horseId === "h3");
    const h4 = runners.find((r) => r.horseId === "h4");
    expect(h1?.gate).toBe(1);
    expect(h3?.gate).toBe(3);
    expect(h4?.gate).toBe(2);
  });
});
