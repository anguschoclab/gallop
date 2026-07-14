import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/core/calendar/regions", () => ({
  getRegion: (id: string) => mockRegion,
}));

import { useCalendarFilters } from "@/hooks/calendar/useCalendarFilters";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Race } from "@/game/types";

let mockState: any;
let mockRegion: any;

beforeEach(() => {
  mockRegion = {
    id: "uk",
    name: "United Kingdom",
    tracks: ["Ascot", "Epsom", "Newmarket"],
    specialRaceKeys: new Set<string>(),
  };
  mockState = {
    races: r2r([
      { id: "r1", graded: { track: "Ascot", grade: "G1" }, resolved: false, day: 10 },
      { id: "r2", graded: { track: "Epsom", grade: "G2" }, resolved: false, day: 10 },
      { id: "r3", graded: { track: "Churchill Downs", grade: "G1" }, resolved: false, day: 10 },
      { id: "r4", resolved: false, day: 10 },
    ] as unknown as Race[]),
    day: 1,
  };
});

describe("useCalendarFilters — Set-based track filtering", () => {
  it("regionRaces includes races with tracks in region", () => {
    const { result } = renderHook(() => useCalendarFilters("uk", { grade: "all", special: "all" }));
    const ids = result.current.regionRaces.map((r: any) => r.id);
    expect(ids).toContain("r1");
    expect(ids).toContain("r2");
  });

  it("regionRaces excludes races with tracks not in region", () => {
    const { result } = renderHook(() => useCalendarFilters("uk", { grade: "all", special: "all" }));
    const ids = result.current.regionRaces.map((r: any) => r.id);
    expect(ids).not.toContain("r3");
  });

  it("regionRaces excludes non-graded races", () => {
    const { result } = renderHook(() => useCalendarFilters("uk", { grade: "all", special: "all" }));
    const ids = result.current.regionRaces.map((r: any) => r.id);
    expect(ids).not.toContain("r4");
  });
});
