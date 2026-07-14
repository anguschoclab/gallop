import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { useSeasonStandings } from "@/hooks/dashboard/useSeasonStandings";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState, Horse } from "@/game/types";

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
  it("returns empty standings when no resolved races", () => {
    seedStore({ ...createDefaultGameState() });
    const { result } = renderHook(() => useSeasonStandings(30));
    expect(result.current.standings).toEqual([]);
    expect(result.current.playerRank).toBe(0);
  });

  it("computes wins from resolved races", () => {
    const h1 = mkHorse({
      id: "h1", owned: true,
      raceHistory: [{ raceId: "r1", raceName: "Race 1", position: 1, day: 55, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any],
    });
    const h2 = mkHorse({
      id: "h2", owned: false, stableId: "npc-1",
      raceHistory: [{ raceId: "r2", raceName: "Race 2", position: 1, day: 55, beyer: 75, purse: 80000, purseEarned: 48000, surface: "Turf", distance: 1600 } as any],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc-1", name: "NPC Stable", tier: "mid", horses: ["h2"], isMajor: false, owner: "NPC", founded: 1, cash: 0, reputation: 0, personality: "aggressive", staff: {} as any, outposts: [], colors: { primary: "#fff", secondary: "#000" } } as any],
    });
    const { result } = renderHook(() => useSeasonStandings(30));
    const player = result.current.standings.find((s: any) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player.rangePrizeMoney).toBe(60000);
  });

  it("range change updates standings", () => {
    const h1 = mkHorse({
      id: "h1", owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Recent", position: 1, day: 58, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
        { raceId: "r2", raceName: "Old", position: 1, day: 10, beyer: 80, purse: 100000, purseEarned: 50000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    seedStore({ ...createDefaultGameState(), day: 60, horses: { h1 } });
    const { result: r7, rerender: rerender7 } = renderHook(({ range }) => useSeasonStandings(range), { initialProps: { range: 7 } });
    const player7 = r7.current.standings.find((s: any) => s.isPlayer);
    expect(player7.rangePrizeMoney).toBe(60000);
    rerender7({ range: 90 });
    // After rerender with 90 days, both races should be included
  });

  it("returns recentResults for player stable", () => {
    const h1 = mkHorse({
      id: "h1", owned: true,
      raceHistory: Array.from({ length: 3 }, (_, i) => ({
        raceId: `r${i}`, raceName: `Race ${i}`, position: i + 1, day: 55 + i, beyer: 80,
        purse: 100000, purseEarned: 10000, surface: "Turf", distance: 1600,
      } as any)),
    });
    seedStore({ ...createDefaultGameState(), day: 60, horses: { h1 } });
    const { result } = renderHook(() => useSeasonStandings(30));
    const player = result.current.standings.find((s: any) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player.recentResults).toHaveLength(3);
  });
});
