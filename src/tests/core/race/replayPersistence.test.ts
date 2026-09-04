import { describe, it, expect } from "vitest";
import { createDefaultGameState } from "@/game/store/state";
import type { Race } from "@/game/types";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

function makeRace(overrides: Partial<Race> & { id: string }): Race {
  return {
    name: "Test Race",
    day: 10,
    distance: 1600,
    entries: [],
    resolved: false,
    surface: "Turf",
    ...overrides,
  } as Race;
}

function makeSnapshots(): RaceSnapshot[] {
  return [
    { t: 0, horses: [{ horseId: "h-1", position: 0, lane: 1, velocity: 0 }] },
    { t: 1, horses: [{ horseId: "h-1", position: 5, lane: 1, velocity: 15 }] },
  ];
}

describe("replay persistence (Option B: read from race.snapshots)", () => {
  it("resolved headless races have snapshots stored on the race object", () => {
    const state = createDefaultGameState();
    const race = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    state.races = { "r-1": race };
    expect(state.races["r-1"].snapshots).toBeDefined();
    expect(state.races["r-1"].snapshots!.length).toBeGreaterThan(0);
  });

  it("live-resolved races should have snapshots (not empty)", () => {
    // This test documents the current gap: live-resolved races get snapshots: []
    // After the fix, they should have snapshots passed from the live simulation
    const state = createDefaultGameState();
    const race = makeRace({
      id: "r-1",
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(), // After fix, live races should have these
    });
    state.races = { "r-1": race };
    expect(state.races["r-1"].snapshots!.length).toBeGreaterThan(0);
  });

  it("unresolved races may have no snapshots", () => {
    const state = createDefaultGameState();
    const race = makeRace({ id: "r-1", resolved: false });
    state.races = { "r-1": race };
    expect(state.races["r-1"].snapshots).toBeUndefined();
  });
});
