import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { Race } from "@/game/types";

export type ResultFilter = "win" | "place" | "show" | "all";

export interface UseReplaysLibraryFilters {
  horseId?: string;
  resultFilter?: ResultFilter;
  grade?: "G1" | "G2" | "G3";
}

export interface ReplayEntry {
  raceId: string;
  raceName: string;
  day: number;
  distance: number;
  grade?: string;
  surface?: string;
  hasSnapshots: boolean;
  winnerHorseId?: string;
  playerPosition?: number;
}

export interface UseReplaysLibraryResult {
  replays: ReplayEntry[];
  highlights: ReplayEntry[];
}

function isPlayerHorse(race: Race, horseId: string): boolean {
  return race.entries.some((e) => e.horseId === horseId);
}

function getPlayerPosition(race: Race, horseId: string): number | undefined {
  const result = race.result?.find((r) => r.horseId === horseId);
  return result?.position;
}

export function useReplaysLibrary(filters?: UseReplaysLibraryFilters): UseReplaysLibraryResult {
  const races = useGame((s) => s.races);

  const replays = useMemo<ReplayEntry[]>(() => {
    const allRaces = Object.values(races);
    let eligible = allRaces.filter((r) => r.resolved && r.snapshots && r.snapshots.length > 0);

    if (filters?.horseId) {
      eligible = eligible.filter((r) => isPlayerHorse(r, filters.horseId!));
    }

    if (filters?.grade) {
      eligible = eligible.filter((r) => r.graded?.grade === filters.grade);
    }

    const entries = eligible.map((r) => {
      const winner = r.result?.find((res) => res.position === 1);
      // Find player's horse in the race
      const playerEntry = r.entries.find((e) => {
        // Check if this horse is player-owned (we check by looking at result positions)
        return true; // We'll filter by horseId separately above
      });
      const playerHorseId = filters?.horseId ?? playerEntry?.horseId;
      const playerPosition = playerHorseId ? getPlayerPosition(r, playerHorseId) : undefined;

      return {
        raceId: r.id,
        raceName: r.name,
        day: r.day,
        distance: r.distance,
        grade: r.graded?.grade,
        surface: r.surface ?? r.graded?.surface,
        hasSnapshots: !!(r.snapshots && r.snapshots.length > 0),
        winnerHorseId: winner?.horseId,
        playerPosition,
      } as ReplayEntry;
    });

    if (filters?.resultFilter && filters.resultFilter !== "all" && filters?.horseId) {
      const hid = filters.horseId;
      const filtered = entries.filter((e) => {
        const pos = getPlayerPosition(races[e.raceId], hid);
        if (!pos) return false;
        if (filters.resultFilter === "win") return pos === 1;
        if (filters.resultFilter === "place") return pos <= 2;
        if (filters.resultFilter === "show") return pos <= 3;
        return true;
      });
      return filtered.sort((a, b) => b.day - a.day);
    }

    return entries.sort((a, b) => b.day - a.day);
  }, [races, filters?.horseId, filters?.resultFilter, filters?.grade]);

  const highlights = useMemo<ReplayEntry[]>(() => {
    return replays.filter((r) => {
      if (r.playerPosition === 1) return true;
      if (r.playerPosition && r.playerPosition <= 3 && r.grade) return true;
      return false;
    });
  }, [replays]);

  return { replays, highlights };
}
