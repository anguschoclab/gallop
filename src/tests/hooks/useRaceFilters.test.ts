import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRaceFilters, type RaceFilters } from "@/hooks/race/useRaceFilters";
import type { Race, Horse } from "@/game/types";

const defaultFilters: RaceFilters = {
  grade: "all",
  country: "all",
  surface: "all",
  track: "all",
  owned: "all",
  q: "",
};

function mkRace(id: string, overrides: Partial<Race> = {}): Race {
  return {
    id,
    name: `Race-${id}`,
    day: 10,
    resolved: false,
    surface: "Turf",
    distance: 1800,
    entries: [],
    fieldSize: 14,
    ...overrides,
  } as unknown as Race;
}

function mkHorse(id: string, overrides: Partial<Horse> = {}): Horse {
  return {
    id,
    name: `Horse-${id}`,
    owned: true,
    age: 4,
    gender: "colt",
    lifecycleStatus: "active",
    energy: 80,
    stats: {
      speed: 60,
      stamina: 60,
      acceleration: 60,
      temperament: 60,
      conformation: 60,
      consistency: 60,
    },
    raceHistory: [],
    ...overrides,
  } as unknown as Horse;
}

describe("useRaceFilters — basic filtering", () => {
  beforeEach(() => {
    // Reset nothing — hook is pure, takes args directly
  });

  it("returns unresolved races on or after current day", () => {
    const races = [
      mkRace("r1", { day: 5 }),
      mkRace("r2", { day: 10 }),
      mkRace("r3", { day: 15, resolved: true }),
    ];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.filteredRaces).toHaveLength(2);
    expect(result.current.filteredRaces[0].id).toBe("r1");
    expect(result.current.filteredRaces[1].id).toBe("r2");
  });

  it("filters by surface", () => {
    const races = [mkRace("r1", { surface: "Turf" }), mkRace("r2", { surface: "Dirt" })];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, surface: "Dirt" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r2");
  });

  it("filters by text search query", () => {
    const races = [
      mkRace("r1", { name: "Kentucky Derby" }),
      mkRace("r2", { name: "Breeders Cup" }),
    ];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, q: "kentucky" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r1");
  });

  it("filters by owned entries", () => {
    const races = [
      mkRace("r1", { entries: [{ horseId: "h1", owned: true } as any] }),
      mkRace("r2", { entries: [{ horseId: "h2", owned: false } as any] }),
    ];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, owned: "owned" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r1");
  });

  it("filters by open field (not full)", () => {
    const races = [
      mkRace("r1", { entries: [], fieldSize: 14 }),
      mkRace("r2", { entries: new Array(14).fill({ owned: false }), fieldSize: 14 }),
    ];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, openOnly: "1" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r1");
  });

  it("filters by time window", () => {
    const races = [mkRace("r1", { day: 5 }), mkRace("r2", { day: 50 })];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, window: "10" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r1");
  });

  it("sorts results by day ascending", () => {
    const races = [mkRace("r1", { day: 20 }), mkRace("r2", { day: 5 }), mkRace("r3", { day: 10 })];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.filteredRaces.map((r) => r.id)).toEqual(["r2", "r3", "r1"]);
  });
});

describe("useRaceFilters — eligibleOnly filter", () => {
  it("eligibleOnly=1 with no owned horses returns empty", () => {
    const races = [mkRace("r1", { day: 10 })];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, eligibleOnly: "1" }, []),
    );

    expect(result.current.filteredRaces).toHaveLength(0);
  });

  it("eligibleOnly=1 with owned horses filters to eligible races", () => {
    const races = [
      mkRace("r1", { day: 10, distance: 1800, surface: "Turf" }),
      mkRace("r2", { day: 10, distance: 1800, surface: "Turf" }),
    ];
    const horses = [mkHorse("h1")];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, eligibleOnly: "1" }, horses),
    );

    // Both races should be eligible for a standard 4yo colt
    expect(result.current.filteredRaces.length).toBeGreaterThan(0);
  });
});
