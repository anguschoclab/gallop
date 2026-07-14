import { describe, it, expect } from "vitest";
import { computeSeasonStandings } from "@/core/standings/computeStandings";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState, Horse, Race } from "@/game/types";
import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT } from "@/constants";

const PLAYER_ID = "__player__";

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
    owned: true,
    ...overrides,
  } as Horse;
}

function mkState(overrides: Partial<GameState> = {}): GameState {
  return { ...createDefaultGameState(), ...overrides };
}

describe("computeSeasonStandings", () => {
  it("returns empty standings when no race history", () => {
    const state = mkState({ horses: { h1: mkHorse() } });
    const result = computeSeasonStandings(state, 30);
    expect(result.standings.length).toBeGreaterThanOrEqual(0);
    expect(result.playerRank).toBeGreaterThanOrEqual(0);
  });

  it("computes prize money using purseEarned when available", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [{
        raceId: "r1", raceName: "Test Race", position: 1, day: 50, beyer: 80,
        purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600,
      } as any],
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.rangePrizeMoney).toBe(60000);
  });

  it("falls back to computing prize from purse + position when purseEarned missing", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [{
        raceId: "r1", raceName: "Test Race", position: 1, day: 50, beyer: 80,
        purse: 100000, surface: "Turf", distance: 1600,
      } as any],
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.rangePrizeMoney).toBe(Math.round(100000 * PRIZE_SPLIT[0]));
  });

  it("uses GRADED_PRIZE_SPLIT for graded races in fallback", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [{
        raceId: "r1", raceName: "G1 Race", position: 1, day: 50, beyer: 80,
        purse: 100000, grade: "G1", surface: "Turf", distance: 1600,
      } as any],
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.rangePrizeMoney).toBe(Math.round(100000 * GRADED_PRIZE_SPLIT[0]));
  });

  it("rangePrizeMoney only includes earnings within the selected range", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [
        { raceId: "r1", raceName: "Recent", position: 1, day: 55, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
        { raceId: "r2", raceName: "Old", position: 1, day: 10, beyer: 80, purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600 } as any,
      ],
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.rangePrizeMoney).toBe(60000);
  });

  it("sparkline has length matching the range", () => {
    const h1 = mkHorse({
      id: "h1",
      owned: true,
      raceHistory: [{
        raceId: "r1", raceName: "Test", position: 1, day: 55, beyer: 80,
        purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600,
      } as any],
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result7 = computeSeasonStandings(state, 7);
    const result30 = computeSeasonStandings(state, 30);
    const result90 = computeSeasonStandings(state, 90);
    const player7 = result7.standings.find((s) => s.isPlayer);
    const player30 = result30.standings.find((s) => s.isPlayer);
    const player90 = result90.standings.find((s) => s.isPlayer);
    expect(player7!.sparkline).toHaveLength(7);
    expect(player30!.sparkline).toHaveLength(30);
    expect(player90!.sparkline).toHaveLength(90);
  });

  it("identifies player stable with isPlayer=true", () => {
    const h1 = mkHorse({ id: "h1", owned: true, raceHistory: [{
      raceId: "r1", raceName: "Test", position: 1, day: 55, beyer: 80,
      purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600,
    } as any] });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.isPlayer).toBe(true);
  });

  it("handles NPC horse with stableId", () => {
    const h1 = mkHorse({ id: "h1", owned: true, raceHistory: [{
      raceId: "r1", raceName: "Test", position: 1, day: 55, beyer: 80,
      purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600,
    } as any] });
    const h2 = mkHorse({ id: "h2", owned: false, stableId: "npc-1", raceHistory: [{
      raceId: "r2", raceName: "NPC Race", position: 1, day: 55, beyer: 75,
      purse: 80000, purseEarned: 48000, surface: "Turf", distance: 1600,
    } as any] });
    const state = mkState({
      day: 60,
      horses: { h1, h2 },
      npcStables: [{ id: "npc-1", name: "NPC Stable", tier: "mid", horses: ["h2"], isMajor: false, owner: "NPC", founded: 1, cash: 0, reputation: 0, personality: "aggressive", staff: {} as any, outposts: [], colors: { primary: "#fff", secondary: "#000" } } as any],
    });
    const result = computeSeasonStandings(state, 30);
    const npc = result.standings.find((s) => s.stableId === "npc-1");
    expect(npc).toBeTruthy();
    expect(npc!.rangePrizeMoney).toBe(48000);
  });

  it("playerRank is correct when player is in top 10", () => {
    const h1 = mkHorse({ id: "h1", owned: true, raceHistory: [{
      raceId: "r1", raceName: "Test", position: 1, day: 55, beyer: 80,
      purse: 100000, purseEarned: 60000, surface: "Turf", distance: 1600,
    } as any] });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    expect(result.playerRank).toBeGreaterThanOrEqual(1);
    expect(result.playerRank).toBeLessThanOrEqual(10);
  });

  it("recentResults returns last 5 race results per stable", () => {
    const h1 = mkHorse({
      id: "h1", owned: true,
      raceHistory: Array.from({ length: 7 }, (_, i) => ({
        raceId: `r${i}`, raceName: `Race ${i}`, position: i + 1, day: 50 + i, beyer: 80,
        purse: 100000, purseEarned: 10000, surface: "Turf", distance: 1600,
      } as any)),
    });
    const state = mkState({ day: 60, horses: { h1 } });
    const result = computeSeasonStandings(state, 30);
    const player = result.standings.find((s) => s.isPlayer);
    expect(player).toBeTruthy();
    expect(player!.recentResults.length).toBeLessThanOrEqual(5);
  });
});
