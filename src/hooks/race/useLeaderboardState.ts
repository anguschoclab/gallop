import { useState, useMemo, useRef } from "react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";
import { projectedBeyer } from "@/components/race/raceVisualHelpers";
import { assertTieBreakFields } from "@/core/race/engine/validateTieBreakFields";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";

/** Sub-centimetre position gaps are treated as ties (1 cm in metres). */
export const POS_EPSILON = 0.01;
/** Beyer comparison tolerance — differences below this are considered equal. */
const BEYER_EPSILON = 1e-9;
/** Velocity comparison tolerance — differences below this are considered equal. */
const VELOCITY_EPSILON = 1e-6;
/** Fallback rank when a horse is not found in positionRank (filters them out of top5). */
const FALLBACK_RANK = 99;
/** Number of runners shown when the "top5" filter is active. */
const TOP_N_FILTER = 5;
/** Fallback Beyer value when projection returns null/undefined (sorts to bottom). */
const FALLBACK_BEYER = -1;
/** Simulation time passed to projectedBeyer during live rendering (always 0 = now). */
const LIVE_SIM_TIME = 0;

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
  assertTieBreakFields(runners, "useLeaderboardState");

  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);

  // Track the wall-clock time the leaderboard last re-derived for this tick.
  const lastUpdatedAtRef = useRef<number>(Date.now());
  const prevTickRef = useRef<number>(tick);
  if (prevTickRef.current !== tick) {
    prevTickRef.current = tick;
    lastUpdatedAtRef.current = Date.now();
  }
  const lastUpdatedAt = lastUpdatedAtRef.current;

  const allFinished = runners.every((r) => r.finishTime !== null);
  const anyFinished = runners.some((r) => r.finishTime !== null);

  const rows = useMemo(
    () =>
      runners.map((r) => ({
        r,
        beyer: projectedBeyer(r, race?.distance ?? 0, LIVE_SIM_TIME, classBonus, calibratedPars),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runners, race?.distance, classBonus, calibratedPars, tick],
  );

  // Positions are continuous metres; treat sub-centimetre gaps as ties.
  const byPosition = (a: Runner, b: Runner) => {
    if (Math.abs(b.position - a.position) > POS_EPSILON) return b.position - a.position;
    return compareFinishOrder(a, b);
  };

  const positionSorted = useMemo(
    () => [...rows].sort((a, b) => byPosition(a.r, b.r)),

    [rows],
  );

  const positionRank = useMemo(
    () => new Map(positionSorted.map((row, i) => [row.r.horseId, i + 1])),
    [positionSorted],
  );

  const { hasTies, tiedHorseIds } = useMemo(() => {
    const tied = new Set<string>();
    for (let i = 1; i < positionSorted.length; i++) {
      const prev = positionSorted[i - 1].r;
      const curr = positionSorted[i].r;
      if (Math.abs(curr.position - prev.position) <= POS_EPSILON) {
        tied.add(prev.horseId);
        tied.add(curr.horseId);
      }
    }
    return { hasTies: tied.size > 0, tiedHorseIds: tied };
  }, [positionSorted]);

  const sorted = useMemo(() => {
    const filtered = rows.filter(({ r, beyer }) => {
      if (filter === "owned" && !r.isPlayer) return false;
      if (filter === "top5" && (positionRank.get(r.horseId) ?? FALLBACK_RANK) > TOP_N_FILTER)
        return false;
      if (minBeyer > 0 && (beyer ?? 0) < minBeyer) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "beyer") {
        const d = (b.beyer ?? FALLBACK_BEYER) - (a.beyer ?? FALLBACK_BEYER);
        if (Math.abs(d) > BEYER_EPSILON) return d;
        return byPosition(a.r, b.r);
      }
      if (sortBy === "velocity") {
        const d = b.r.velocity - a.r.velocity;
        if (Math.abs(d) > VELOCITY_EPSILON) return d;
        return byPosition(a.r, b.r);
      }
      return byPosition(a.r, b.r);
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
    hasTies,
    tiedHorseIds,
    lastUpdatedAt,
  };
}
