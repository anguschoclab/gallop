/**
 * useInRunningSnapshots.ts
 *
 * Hook to capture, freeze, and manage in-running race condition snapshots.
 * Allows inspecting all runner conditions, speeds, positions, and tactical states
 * frozen at a specific moment while live simulation updates continue.
 */
import { useState, useCallback, useRef } from "react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  buildFieldContext,
  deriveRunnerConditions,
  deriveRunnerMood,
  type RunnerCondition,
  type RunnerMood,
} from "@/core/race/runnerConditions";
import {
  KICKING_PROGRESS_THRESHOLD,
  LEADING_PROXIMITY_METRES,
} from "@/constants/raceBroadcastConstants";

export interface InRunningRunnerSnapshot {
  horseId: string;
  name: string;
  position: number;
  velocity: number;
  lane: number;
  gate: number;
  silk: string;
  owned: boolean;
  finishTime: number | null;
  rank: number;
  conditions: RunnerCondition[];
  mood?: RunnerMood;
  tacticalBadge?: string;
  distanceCoveredPct: number;
}

export interface InRunningSnapshot {
  id: string;
  simTime: number;
  tick: number;
  capturedAt: number;
  distance: number;
  leaderPos: number;
  runners: InRunningRunnerSnapshot[];
}

function computeTacticalBadge(r: Runner, leaderPos: number, distance: number): string | undefined {
  if (r.jockeyInstructions?.ridingStyle === "front_runner" && r.lane === 0) return "RAIL";
  if (r.jockeyInstructions?.ridingStyle === "closer" && r.lane > 1) return "OUTSIDE";
  if (
    r.jockeyInstructions?.ridingStyle === "closer" &&
    r.jockeyInstructions?.moveTiming === "late" &&
    r.draftingHorseId
  ) {
    return "SAVING";
  }
  if (
    r.jockeyInstructions?.earlyPosition === "lead" &&
    r.position >= leaderPos - LEADING_PROXIMITY_METRES
  ) {
    return "LEADING";
  }
  if (
    r.jockeyInstructions?.moveTiming === "late" &&
    distance > 0 &&
    r.position / distance > KICKING_PROGRESS_THRESHOLD
  ) {
    return "KICKING";
  }
  if (r.draftingHorseId && !r.jockeyInstructions) {
    return "Drafting";
  }
  return undefined;
}

export function useInRunningSnapshots() {
  const [snapshots, setSnapshots] = useState<InRunningSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const snapshotCountRef = useRef(0);
  const peakVelocityRef = useRef<Map<string, number>>(new Map());

  const takeSnapshot = useCallback(
    (runners: Runner[], distance: number, simTime: number, tick: number): InRunningSnapshot => {
      // Track peak velocities
      for (const r of runners) {
        const prev = peakVelocityRef.current.get(r.horseId) ?? 0;
        if (r.velocity > prev) peakVelocityRef.current.set(r.horseId, r.velocity);
      }

      const fieldContext = buildFieldContext(runners);
      const sortedByPos = [...runners].sort((a, b) => b.position - a.position);
      const rankMap = new Map<string, number>();
      sortedByPos.forEach((r, i) => rankMap.set(r.horseId, i + 1));

      const capturedRunners: InRunningRunnerSnapshot[] = runners.map((r) => {
        const peak = peakVelocityRef.current.get(r.horseId) ?? r.velocity;
        const conditions = deriveRunnerConditions(
          r,
          fieldContext,
          { peakVelocity: peak },
          distance,
        );
        const mood = deriveRunnerMood(
          r,
          fieldContext,
          { peakVelocity: peak },
          distance,
          conditions,
        );
        const tacticalBadge = computeTacticalBadge(r, fieldContext.leaderPos, distance);
        const distanceCoveredPct = distance > 0 ? Math.min(100, (r.position / distance) * 100) : 0;

        return {
          horseId: r.horseId,
          name: r.name,
          position: r.position,
          velocity: r.velocity,
          lane: r.lane,
          gate: r.gate,
          silk: r.silk,
          owned: Boolean(r.owned),
          finishTime: r.finishTime,
          rank: rankMap.get(r.horseId) ?? 1,
          conditions,
          mood,
          tacticalBadge,
          distanceCoveredPct,
        };
      });

      const snapshotId = `snapshot-${++snapshotCountRef.current}-${Date.now()}`;
      const newSnapshot: InRunningSnapshot = {
        id: snapshotId,
        simTime,
        tick,
        capturedAt: Date.now(),
        distance,
        leaderPos: fieldContext.leaderPos,
        runners: capturedRunners,
      };

      setSnapshots((prev) => [...prev, newSnapshot]);
      setSelectedSnapshotId(snapshotId);
      setIsInspectorOpen(true);

      return newSnapshot;
    },
    [],
  );

  const clearSnapshots = useCallback(() => {
    setSnapshots([]);
    setSelectedSnapshotId(null);
    setIsInspectorOpen(false);
  }, []);

  const selectedSnapshot =
    snapshots.find((s) => s.id === selectedSnapshotId) ??
    (snapshots.length > 0 ? snapshots[snapshots.length - 1] : null);

  return {
    snapshots,
    selectedSnapshot,
    selectedSnapshotId,
    setSelectedSnapshotId,
    takeSnapshot,
    clearSnapshots,
    isInspectorOpen,
    setIsInspectorOpen,
  };
}
