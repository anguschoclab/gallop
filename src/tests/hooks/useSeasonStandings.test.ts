import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { useSeasonStandings } from "@/hooks/dashboard/useSeasonStandings";
import { createDefaultGameState } from "@/game/store/state";
import type { Horse } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, durability: 70, consistency: 70 } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    owned: true,
    ...overrides,
  }) as Horse;

describe("useSeasonStandings", () => {
  it("returns empty standings when no race history exists", () => {
    seedStore({ ...createDefaultGameState() });
    const { result } = renderHook(() => useSeasonStandings(30));
    expect(result.current.standings.length).toBeGreaterThanOrEqual(1);
    expect(result.current.standings[0].isPlayer).toBe(true);
    expect(result.current.standings[0].rangePrizeMoney).toBe(0);
  });

  it("includes player stable with prize money from race history", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Test Race", position: 1, day: 50, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      playerProfile: { stableName: "My Stable", silk: { primary: "#ff0000", secondary: "#0000ff" } } as any,
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    const player = result.current.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.rangePrizeMoney).toBe(60000);
    expect(player!.name).toBe("My Stable");
  });

  it("excludes races outside the range window", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Old Race", position: 1, day: 10, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
        { raceId: "r2", raceName: "Recent Race", position: 1, day: 55, beyer: 85, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    const player = result.current.standings.find((s) => s.isPlayer)!;
    // windowStart = 60 - 30 + 1 = 31; day 10 is outside, day 55 is inside
    expect(player.rangePrizeMoney).toBe(60000);
  });

  it("includes NPC stables in standings", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600, stableId: "__player__" } as any,
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, beyer: 75, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600, stableId: "npc1" } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    const npc = result.current.standings.find((s) => s.stableId === "npc1");
    expect(npc).toBeTruthy();
    expect(npc!.name).toBe("Rival Stable");
    expect(npc!.rangePrizeMoney).toBe(60000);
  });

  it("sorts standings by prize money descending", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, beyer: 80, purse: 100000, purseEarned: 100000, surface: "Turf", distance: 1600, stableId: "__player__" } as any,
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, beyer: 75, purse: 100000, purseEarned: 50000, surface: "Turf", distance: 1600, stableId: "npc1" } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    expect(result.current.standings[0].rangePrizeMoney).toBeGreaterThanOrEqual(
      result.current.standings[1].rangePrizeMoney,
    );
  });

  it("computes playerRank correctly", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, beyer: 80, purse: 100000, purseEarned: 30000, surface: "Turf", distance: 1600, stableId: "__player__" } as any,
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, beyer: 75, purse: 100000, purseEarned: 80000, surface: "Turf", distance: 1600, stableId: "npc1" } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    // NPC has 80000, player has 30000 → player is rank 2
    expect(result.current.playerRank).toBe(2);
  });

  it("sparkline has length equal to rangeDays", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 55, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
    });
    const { result } = renderHook(() => useSeasonStandings(7));
    const player = result.current.standings.find((s) => s.isPlayer)!;
    expect(player.sparkline.length).toBe(7);
  });

  it("updates when rangeDays changes", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 10, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
        { raceId: "r2", raceName: "Recent", position: 1, day: 55, beyer: 85, purse: 100000, purseEarned: 50000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
    });
    const { result, rerender } = renderHook(({ range }) => useSeasonStandings(range), {
      initialProps: { range: 7 },
    });
    // 7-day window: day 55 is inside (54..60), day 10 is outside
    const player7 = result.current.standings.find((s) => s.isPlayer)!;
    expect(player7.rangePrizeMoney).toBe(50000);

    rerender({ range: 90 });
    // 90-day window: both races inside
    const player90 = result.current.standings.find((s) => s.isPlayer)!;
    expect(player90.rangePrizeMoney).toBe(110000);
  });
});
