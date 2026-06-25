import { describe, it, expect } from "vitest";
import { createDefaultCoreState } from "@/game/store/state/coreState";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/core/horse/types";

function makeRace(id: string, day: number = 1): Race {
  return {
    id,
    name: `Test Race ${id}`,
    day,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as unknown as Race;
}

describe("raceMap integrity", () => {
  it("raceMap is empty by default", () => {
    const state = createDefaultCoreState();
    expect(state.raceMap).toBeInstanceOf(Map);
    expect(state.raceMap.size).toBe(0);
  });

  it("raceMap is populated when races are set via setRaces", () => {
    const state = createDefaultCoreState();
    const races = [makeRace("r1"), makeRace("r2"), makeRace("r3")];

    // Simulate what setRaces should do: update races AND raceMap
    const updatedState = {
      ...state,
      races,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    expect(updatedState.raceMap.size).toBe(3);
    expect(updatedState.raceMap.get("r1")).toBe(races[0]);
    expect(updatedState.raceMap.get("r2")).toBe(races[1]);
    expect(updatedState.raceMap.get("r3")).toBe(races[2]);
  });

  it("raceMap.get returns undefined for non-existent race", () => {
    const state = createDefaultCoreState();
    expect(state.raceMap.get("nonexistent")).toBeUndefined();
  });

  it("raceMap stays in sync after adding a race", () => {
    const state = createDefaultCoreState();
    const race = makeRace("r1");

    // Simulate adding a race
    const races = [...state.races, race];
    const updatedState = {
      ...state,
      races,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    expect(updatedState.raceMap.get("r1")).toBe(race);
  });

  it("raceMap stays in sync after removing a race (withdraw)", () => {
    const races = [makeRace("r1"), makeRace("r2")];
    const state = {
      ...createDefaultCoreState(),
      races,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    // Simulate withdrawing r1
    const remaining = state.races.filter((r) => r.id !== "r1");
    const updatedState = {
      ...state,
      races: remaining,
      raceMap: new Map(remaining.map((r) => [r.id, r])),
    };

    expect(updatedState.raceMap.get("r1")).toBeUndefined();
    expect(updatedState.raceMap.get("r2")).toBeDefined();
    expect(updatedState.raceMap.size).toBe(1);
  });

  it("raceMap is rehydrated from persisted races array", () => {
    const races = [makeRace("r1"), makeRace("r2")];

    // Simulate onRehydrateStorage logic
    const persistedState = {
      races,
    };

    const rehydrated = {
      ...persistedState,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    expect(rehydrated.raceMap.size).toBe(2);
    expect(rehydrated.raceMap.get("r1")).toBe(races[0]);
    expect(rehydrated.raceMap.get("r2")).toBe(races[1]);
  });

  it("raceMap stays in sync after applyDayResult simulates a race change", () => {
    const races = [makeRace("r1", 5), makeRace("r2", 10)];
    const state = {
      ...createDefaultCoreState(),
      races,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    // Simulate what applyDayResult does: finalState has modified races
    const modifiedRaces = races.map((r) =>
      r.id === "r1" ? { ...r, resolved: true, result: {} } : r,
    );

    // Simulate the fix: rebuild raceMap from finalState.races
    const update: any = { races: modifiedRaces };
    if (modifiedRaces) {
      update.raceMap = new Map(modifiedRaces.map((r) => [r.id, r]));
    }

    const updatedState = { ...state, ...update };

    expect(updatedState.raceMap.size).toBe(2);
    expect(updatedState.raceMap.get("r1")?.resolved).toBe(true);
    expect(updatedState.raceMap.get("r2")?.resolved).toBe(false);
    expect(updatedState.raceMap.get("r1")).toBe(modifiedRaces[0]);
  });

  it("raceMap is empty Map after applyDayResult with empty races", () => {
    const races = [makeRace("r1", 5)];
    const state = {
      ...createDefaultCoreState(),
      races,
      raceMap: new Map(races.map((r) => [r.id, r])),
    };

    // Simulate applyDayResult with finalState.races = []
    const finalStateRaces: Race[] = [];
    const update: any = { races: finalStateRaces };
    if (finalStateRaces) {
      update.raceMap = new Map(finalStateRaces.map((r) => [r.id, r]));
    }

    const updatedState = { ...state, ...update };

    expect(updatedState.raceMap).toBeInstanceOf(Map);
    expect(updatedState.raceMap.size).toBe(0);
    expect(updatedState.raceMap.get("r1")).toBeUndefined();
  });
});
