import { useState, useMemo } from "react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";
import { projectedBeyer } from "@/components/race/raceVisualHelpers";

/**
 * useLeaderboardState — derives the sorted/filtered leaderboard view from
 * runners, race metadata, and user-controlled filter/sort/minBeyer state.
 *
 * Extracted from useRaceUIState.ts to separate leaderboard derivation from
 * commentary message pacing.
 */
export function useLeaderboardState(
  runners: Runner[],
  race: Race,
  classBonus: number,
  calibratedPars: Record<number, number>,
) {
  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);

  const allFinished = runners.every((r) => r.finishTime !== null);
  const anyFinished = runners.some((r) => r.finishTime !== null);

  const rows = useMemo(
    () =>
      runners.map((r) => ({
        r,
        beyer: projectedBeyer(r, race?.distance ?? 0, 0, classBonus, calibratedPars),
      })),
    [runners, race?.distance, classBonus, calibratedPars],
  );

  const positionRank = useMemo(
    () =>
      new Map(
        [...rows]
          .sort((a, b) => b.r.position - a.r.position)
          .map((row, i) => [row.r.horseId, i + 1]),
      ),
    [rows],
  );

  const sorted = useMemo(() => {
    const filtered = rows.filter(({ r, beyer }) => {
      if (filter === "owned" && !r.owned) return false;
      if (filter === "top5" && (positionRank.get(r.horseId) ?? 99) > 5) return false;
      if (minBeyer > 0 && (beyer ?? 0) < minBeyer) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "beyer") return (b.beyer ?? -1) - (a.beyer ?? -1);
      if (sortBy === "velocity") return b.r.velocity - a.r.velocity;
      return b.r.position - a.r.position;
    });
  }, [rows, filter, positionRank, minBeyer, sortBy]);

  return {
    sortBy,
    setSortBy,
    filter,
    setFilter,
    minBeyer,
    setMinBeyer,
    allFinished,
    anyFinished,
    sorted,
    positionRank,
  };
}
