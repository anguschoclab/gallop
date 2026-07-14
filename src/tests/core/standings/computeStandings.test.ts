import { describe, it, expect } from "vitest";
import { computeSeasonStandings } from "@/core/standings/computeStandings";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState, Horse } from "@/game/types";

function mkState(overrides: Partial<GameState> = {}): GameState {
  return { ...createDefaultGameState(), ...overrides };
}

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
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
    fame: 0,
    owned: true,
    form: 50,
    potential: 75,
    ...overrides,
  } as Horse;
}

describe("computeSeasonStandings", () => {
  it("returns player entry with zero prize money when no race history", () => {
    const s: GameState = mkState();
    const result = computeSeasonStandings(s, 30);
    expect(result.standings.length).toBeGreaterThanOrEqual(1);
    expect(result.standings[0].isPlayer).toBe(true);
    expect(result.standings[0].rangePrizeMoney).toBe(0);
  });

  it("aggregates player purseEarned within the range window", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Test", position: 1, day: 50, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.rangePrizeMoney).toBe(60000);
  });

  it("excludes races outside the range window", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Old", position: 1, day: 10, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 },
        { raceId: "r2", raceName: "Recent", position: 1, day: 55, purse: 100000, purseEarned: 50000, surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.rangePrizeMoney).toBe(50000);
  });

  it("uses fallback purse calculation when purseEarned is missing", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Fallback", position: 1, day: 50, purse: 100000, surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    // PRIZE_SPLIT[0] = 0.6 → 100000 * 0.6 = 60000
    expect(player.rangePrizeMoney).toBe(60000);
  });

  it("uses graded prize split for graded races in fallback", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "G1 Race", position: 1, day: 50, purse: 100000, grade: "G1", surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    // GRADED_PRIZE_SPLIT[0] = 0.7 → 100000 * 0.7 = 70000
    expect(player.rangePrizeMoney).toBe(70000);
  });

  it("includes NPC stables in standings", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600, stableId: "__player__" },
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, purse: 100000, purseEarned: 80000, surface: "Turf", distance: 1600, stableId: "npc1" },
      ],
    });
    const s: GameState = mkState({
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const result = computeSeasonStandings(s, 30);
    const npc = result.standings.find((e) => e.stableId === "npc1");
    expect(npc).toBeTruthy();
    expect(npc!.name).toBe("Rival Stable");
    expect(npc!.rangePrizeMoney).toBe(80000);
  });

  it("sorts standings by prize money descending", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, purse: 100000, purseEarned: 30000, surface: "Turf", distance: 1600, stableId: "__player__" },
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, purse: 100000, purseEarned: 90000, surface: "Turf", distance: 1600, stableId: "npc1" },
      ],
    });
    const s: GameState = mkState({
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const result = computeSeasonStandings(s, 30);
    expect(result.standings[0].rangePrizeMoney).toBeGreaterThanOrEqual(
      result.standings[1].rangePrizeMoney,
    );
  });

  it("computes playerRank as 1-based index after sorting", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 50, purse: 100000, purseEarned: 30000, surface: "Turf", distance: 1600, stableId: "__player__" },
      ],
    });
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, purse: 100000, purseEarned: 90000, surface: "Turf", distance: 1600, stableId: "npc1" },
      ],
    });
    const s: GameState = mkState({
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
    });
    const result = computeSeasonStandings(s, 30);
    expect(result.playerRank).toBe(2);
  });

  it("sparkline length matches rangeDays", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 55, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 7);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.sparkline.length).toBe(7);
  });

  it("sparkline places earnings in the correct bucket", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Race", position: 1, day: 55, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 },
      ],
    });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    // windowStart = 60 - 7 + 1 = 54; day 55 → idx = 55 - 54 = 1
    const result = computeSeasonStandings(s, 7);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.sparkline[1]).toBe(60000);
    expect(player.sparkline[0]).toBe(0);
  });

  it("recentResults are sorted by day descending and limited to 5", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      raceId: `r${i}`,
      raceName: `Race ${i}`,
      position: 1,
      day: 50 + i,
      purse: 100000,
      purseEarned: 10000,
      surface: "Turf",
      distance: 1600,
    }));
    const h1 = mkHorse({ id: "h1", owned: true, raceHistory: history });
    const s: GameState = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.recentResults.length).toBe(5);
    expect(player.recentResults[0].day).toBe(56);
    expect(player.recentResults[4].day).toBe(52);
  });

  it("uses playerProfile.stableName for player entry name", () => {
    const s: GameState = mkState({
      playerProfile: { stableName: "Thunder Ranch", silk: { primary: "#ff0000", secondary: "#0000ff" } } as any,
    });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.name).toBe("Thunder Ranch");
  });

  it("uses playerProfile silk color for player entry", () => {
    const s: GameState = mkState({
      playerProfile: { stableName: "My Stable", silk: { primary: "#ff0000", secondary: "#0000ff" } } as any,
    });
    const result = computeSeasonStandings(s, 30);
    const player = result.standings.find((e) => e.isPlayer)!;
    expect(player.silkColor).toBe("#ff0000");
  });

  it("NPC prestige is aggregated from regionalPrestige", () => {
    const h2 = mkHorse({
      id: "h2",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        { raceId: "r2", raceName: "NPC Race", position: 1, day: 50, purse: 100000, purseEarned: 50000, surface: "Turf", distance: 1600, stableId: "npc1" },
      ],
    });
    const s: GameState = mkState({
      day: 60,
      horses: { h2 },
      npcStables: [{ id: "npc1", name: "Rival Stable", colors: { primary: "#00ff00" } } as any],
      npcAIManager: {
        stableStates: {
          npc1: {
            regionalPrestige: { europe: 30, asia: 20 },
            winsAgainstPlayer: 3,
          },
        },
        globalDay: 60,
        regionalKings: {},
      } as any,
    });
    const result = computeSeasonStandings(s, 30);
    const npc = result.standings.find((e) => e.stableId === "npc1")!;
    expect(npc.prestige).toBe(50);
    expect(npc.winsVsPlayer).toBe(3);
  });
});
