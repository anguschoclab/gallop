import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRaceFilters, type RaceFilters } from "@/hooks/race/useRaceFilters";
import { DEFAULT_FIELD_SIZE } from "@/constants";
import type { Race, Horse } from "@/game/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

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
    fieldSize: DEFAULT_FIELD_SIZE,
    ...overrides,
  } as unknown as Race;
}

function mkHorse(id: string, overrides: Partial<Horse> = {}): Horse {
  return {
    id,
    name: `Horse-${id}`,
    ownership: makePlayerOwned(),
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
      mkRace("r1", { entries: [{ horseId: "h1", ownership: makePlayerOwned() } as any] }),
      mkRace("r2", { entries: [{ horseId: "h2", ownership: makeUnowned() } as any] }),
    ];

    const { result } = renderHook(() =>
      useRaceFilters(races, 1, { ...defaultFilters, owned: "owned" }),
    );

    expect(result.current.filteredRaces).toHaveLength(1);
    expect(result.current.filteredRaces[0].id).toBe("r1");
  });

  it("filters by open field (not full)", () => {
    const races = [
      mkRace("r1", { entries: [], fieldSize: DEFAULT_FIELD_SIZE }),
      mkRace("r2", {
        entries: new Array(DEFAULT_FIELD_SIZE).fill({ ownership: makeUnowned() }),
        fieldSize: DEFAULT_FIELD_SIZE,
      }),
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

describe("useRaceFilters — filter options (countries & tracks)", () => {
  function mkGraded(id: string, track: string): Race {
    return mkRace(id, {
      graded: { key: `${id}-key`, grade: "G1", track, surface: "Turf" } as any,
    });
  }

  it("returns empty countries and tracks for empty races array", () => {
    const { result } = renderHook(() => useRaceFilters([], 1, defaultFilters));

    expect(result.current.countries).toEqual([]);
    expect(result.current.tracks).toEqual([]);
  });

  it("returns empty countries and tracks when no races are graded", () => {
    const races = [mkRace("r1"), mkRace("r2")];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.countries).toEqual([]);
    expect(result.current.tracks).toEqual([]);
  });

  it("extracts single country and track from one graded race", () => {
    const races = [mkGraded("r1", "Churchill Downs")];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Churchill Downs"]);
    expect(result.current.countries).toEqual(["USA"]);
  });

  it("deduplicates tracks and countries for same track", () => {
    const races = [mkGraded("r1", "Churchill Downs"), mkGraded("r2", "Churchill Downs")];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Churchill Downs"]);
    expect(result.current.countries).toEqual(["USA"]);
  });

  it("deduplicates countries across different tracks in same country", () => {
    const races = [
      mkGraded("r1", "Churchill Downs"),
      mkGraded("r2", "Santa Anita"),
      mkGraded("r3", "Keeneland"),
    ];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Churchill Downs", "Keeneland", "Santa Anita"]);
    expect(result.current.countries).toEqual(["USA"]);
  });

  it("extracts multiple countries and tracks from different countries", () => {
    const races = [
      mkGraded("r1", "Churchill Downs"),
      mkGraded("r2", "Ascot"),
      mkGraded("r3", "Tokyo"),
    ];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Ascot", "Churchill Downs", "Tokyo"]);
    expect(result.current.countries).toEqual(["Great Britain", "Japan", "USA"]);
  });

  it("ignores ungraded races when building filter options", () => {
    const races = [
      mkGraded("r1", "Churchill Downs"),
      mkRace("r2"),
      mkGraded("r3", "Ascot"),
      mkRace("r4"),
    ];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Ascot", "Churchill Downs"]);
    expect(result.current.countries).toEqual(["Great Britain", "USA"]);
  });

  it("sorts countries and tracks alphabetically", () => {
    const races = [
      mkGraded("r1", "Tokyo"),
      mkGraded("r2", "Churchill Downs"),
      mkGraded("r3", "Ascot"),
    ];

    const { result } = renderHook(() => useRaceFilters(races, 1, defaultFilters));

    expect(result.current.tracks).toEqual(["Ascot", "Churchill Downs", "Tokyo"]);
    expect(result.current.countries).toEqual(["Great Britain", "Japan", "USA"]);
  });
});
