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
  /**
   * Simulation tick. Runner objects are mutated in place by the physics loop, so
   * the array identity never changes; the tick is what invalidates the memos and
   * keeps the live order in sync with the race.
   */
  tick = 0,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runners, race?.distance, classBonus, calibratedPars, tick],
  );

  /**
   * Deterministic tie-break chain. Floating point positions frequently tie
   * (especially pre-start and post-finish), so we fall back to finish time,
   * then barrier, then horseId — all stable across ticks — to stop the
   * leaderboard order from flickering.
   */
  const tieBreak = (a: Runner, b: Runner) => {
    const at = a.finishTime ?? Infinity;
    const bt = b.finishTime ?? Infinity;
    if (at !== bt) return at - bt;
    if (a.barrier !== b.barrier) return a.barrier - b.barrier;
    return a.horseId < b.horseId ? -1 : a.horseId > b.horseId ? 1 : 0;
  };

  // Positions are continuous metres; treat sub-centimetre gaps as ties.
  const POS_EPSILON = 0.01;
  const byPosition = (a: Runner, b: Runner) => {
    if (Math.abs(b.position - a.position) > POS_EPSILON) return b.position - a.position;
    return tieBreak(a, b);
  };

  const positionRank = useMemo(
    () =>
      new Map(
        [...rows]
          .sort((a, b) => byPosition(a.r, b.r))
          .map((row, i) => [row.r.horseId, i + 1]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (sortBy === "beyer") {
        const d = (b.beyer ?? -1) - (a.beyer ?? -1);
        if (Math.abs(d) > 1e-9) return d;
        return byPosition(a.r, b.r);
      }
      if (sortBy === "velocity") {
        const d = b.r.velocity - a.r.velocity;
        if (Math.abs(d) > 1e-6) return d;
        return byPosition(a.r, b.r);
      }
      return byPosition(a.r, b.r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
