/**
 * Derive G1 (and other graded) win attributions for "connections":
 *   - jockey (per-race, from the saved race entry)
 *   - stable (all G1 wins by horses currently in that stable)
 *   - individual staff (attributed via their current stable)
 *
 * We don't store historical jockey/trainer assignments separately from the
 * race entry itself, so jockey attribution is per-race accurate while
 * trainer / caretaker attribution is at the stable level.
 */

import type { GameState, Horse, Race } from "@/game/types";
import type { RaceEntry } from "@/core/race/types";
import { asRaceId } from "@/core/types/branded";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";

export interface G1WinEntry {
  raceId?: string;
  raceName: string;
  raceDay: number;
  grade: "G1" | "G2" | "G3";
  horseId: string;
  horseName: string;
  distance?: number;
  surface?: string;
  beyer?: number;
  trackId?: string;
}

const isWinningG1 = (r: Horse["raceHistory"][number]) =>
  r && r.position === 1 && (r.grade === "G1" || r.grade === "G2" || r.grade === "G3");

/**
 * Returns all graded (G1/G2/G3) wins for horses ridden by `jockeyId`,
 * attributed via the saved race entry.
 * @param state
 * @param jockeyId
 * @returns Array of G1 win entries
 */
export function getG1WinsForJockey(state: GameState, jockeyId: string): G1WinEntry[] {
  if (!jockeyId) return [];
  const races = state.races || {};
  const raceById = state.races;
  const out: G1WinEntry[] = [];
  for (const horse of Object.values(state.horses || {})) {
    for (const r of horse.raceHistory || []) {
      if (!isWinningG1(r)) continue;
      const race = r.raceId ? raceById[asRaceId(r.raceId)] : undefined;
      const entry = race?.entries?.find((e: RaceEntry) => e.horseId === horse.id);
      if (entry?.jockeyId !== jockeyId) continue;
      out.push({
        raceId: r.raceId,
        raceName: r.raceName,
        raceDay: r.day,
        grade: r.grade as "G1" | "G2" | "G3",
        horseId: horse.id,
        horseName: horse.name,
        distance: r.distance,
        surface: r.surface,
        beyer: r.beyer,
        trackId: race?.trackId || race?.graded?.trackId,
      });
    }
  }
  return out.sort((a, b) => b.raceDay - a.raceDay);
}

/**
 * Returns all graded wins by horses currently in the given stable.
 * Pass `undefined` / "" for the player's stable.
 * @param state
 * @param stableId
 * @returns Array of G1 win entries
 */
export function getG1WinsForStable(
  state: Pick<GameState, "horses">,
  stableId: string | undefined,
): G1WinEntry[] {
  const out: G1WinEntry[] = [];
  const wantPlayer = !stableId;
  for (const horse of Object.values(state.horses || {})) {
    const horseStable = getStableId(horse as Horse);
    if (wantPlayer ? !isPlayerOwned(horse) : (horseStable ?? undefined) !== stableId) continue;
    for (const r of horse.raceHistory || []) {
      if (!isWinningG1(r)) continue;
      out.push({
        raceId: r.raceId,
        raceName: r.raceName,
        raceDay: r.day,
        grade: r.grade as "G1" | "G2" | "G3",
        horseId: horse.id,
        horseName: horse.name,
        distance: r.distance,
        surface: r.surface,
        beyer: r.beyer,
      });
    }
  }
  return out.sort((a, b) => b.raceDay - a.raceDay);
}

/**
 * Count wins by grade.
 * @param wins - Array of G1 win entries
 * @returns Counts of G1, G2, and G3 wins
 */
export function countByGrade(wins: G1WinEntry[]): { G1: number; G2: number; G3: number } {
  const c = { G1: 0, G2: 0, G3: 0 };
  for (const w of wins) c[w.grade]++;
  return c;
}
