import { useState, useEffect, useRef } from "react";
import { computePaceContext, stepRunner } from "@/core/race/engine/simulation";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { CourseSpecification } from "@/data/tracks";
import type { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import type { Race, RaceResult } from "@/core/race/types";
import type { Rng } from "@/core/common/rng";
import { FIXED_DT, MAX_STEPS_PER_FRAME, SPLIT_FRACTIONS } from "@/constants/raceBroadcastConstants";

import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";

/**
 * Callback invoked once per non-silent simulation step.
 *
 * @param sortedField - Runners sorted by position (descending)
 * @param simTime - Current simulation time in seconds
 * @param silent - Whether this step is silent (fast-forward)
 */
export type OnTickCallback = (sortedField: Runner[], simTime: number, silent: boolean) => void;

/**
 * Build a rank map from the current runner field, skipping already-finished runners.
 *
 * @param runners - All runners in the race (order does not matter)
 * @returns rankMap keyed by horseId → 0-based rank among still-running horses,
 *          and aliveRank = total count of still-running horses
 */
export function buildRankMap(runners: Runner[]): {
  rankMap: Map<string, number>;
  aliveRank: number;
} {
  const sorted = [...runners].sort((a, b) => b.position - a.position);
  const rankMap = new Map<string, number>();
  let aliveRank = 0;
  for (const o of sorted) {
    if (o.finishTime === null) {
      rankMap.set(o.horseId, aliveRank);
      aliveRank++;
    }
  }
  return { rankMap, aliveRank };
}

/**
 * Record a split crossing for a runner if it just passed its next marker.
 * Uses linear interpolation to compute the exact crossing time.
 *
 * @param r - The runner whose position was just updated
 * @param posBefore - The runner's position before the step
 * @param splitMarkers - Ordered array of split positions in metres
 * @param simTimeAfterStep - Current sim time after the step (i.e. += FIXED_DT already applied)
 * @param FIXED_DT - The fixed time-step size in seconds
 * @param crossings - Mutable array of already-recorded crossing times for this runner
 */
export function updateSplitCrossings(
  r: Runner,
  posBefore: number,
  splitMarkers: number[],
  simTimeAfterStep: number,
  FIXED_DT: number,
  crossings: number[],
): void {
  const nextMarkerIdx = crossings.length;
  if (nextMarkerIdx >= splitMarkers.length) return;
  const marker = splitMarkers[nextMarkerIdx];
  if (r.position >= marker && posBefore < marker) {
    const tBefore = simTimeAfterStep - FIXED_DT;
    const frac = (marker - posBefore) / (r.position - posBefore);
    crossings.push(tBefore + frac * FIXED_DT);
  }
}

/**
 * Append a finish-order entry for a runner if it has just crossed the line.
 * Does nothing when finishTime is still null.
 *
 * @param r - The runner to check
 * @param finishOrder - Mutable finish-order accumulator
 */
export function recordFinish(
  r: Runner,
  finishOrder: { horseId: string; position: number; time: number; barrier: number }[],
): void {
  if (r.finishTime === null) return;
  finishOrder.push({
    horseId: r.horseId,
    position: 0,
    time: r.finishTime,
    barrier: r.barrier,
  });
  // Re-sort by deterministic tie-break chain and reassign positions
  finishOrder.sort((a, b) => compareFinishOrder(a, b));
  for (let i = 0; i < finishOrder.length; i++) {
    finishOrder[i].position = i + 1;
  }
}

/**
 * Hook to manage the complex race simulation loop using requestAnimationFrame.
 *
 * @param options - Simulation options
 * @param options.race - The race being simulated
 * @param options.runners - The field of runners in the race
 * @param options.resolveRaceWithImpacts - Callback to finalize race results in the store
 * @param options.narrativeRef - Reference to the narrative generator service
 * @param options.messageQueue - Reference to the commentary message queue
 * @param options.rngRef - Reference to the random number generator for the race
 * @returns An object containing simulation state (tick, finished, paused, speed) and controls
 */
export function useLiveRaceSimulation({
  race,
  runners,
  resolveRaceWithImpacts,
  narrativeRef,
  messageQueue,
  rngRef,
  course,
  windKph,
  windDirectionDeg,
  running = true,
  resumeAtSimTime = 0,
  initialPaused = false,
  initialSpeed,
  onTick,
}: {
  race: Race;
  runners: Runner[];
  resolveRaceWithImpacts: (raceId: string, finishOrder: RaceResult[]) => void;
  narrativeRef: React.MutableRefObject<NarrativeGenerator | null>;
  messageQueue: React.MutableRefObject<CommentaryLine[]>;
  rngRef: React.MutableRefObject<Rng | null>;
  course?: CourseSpecification;
  windKph?: number;
  windDirectionDeg?: number;
  running?: boolean;
  resumeAtSimTime?: number;
  initialPaused?: boolean;
  initialSpeed?: number;
  onTick?: OnTickCallback;
}) {
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(initialSpeed ?? 1);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(initialPaused);

  const simTimeRef = useRef(0);
  const finishOrderRef = useRef<
    { horseId: string; position: number; time: number; barrier: number }[]
  >([]);
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  // splitCrossings[horseId] = [t_at_25%, t_at_50%, t_at_75%, t_at_finish]
  const splitCrossingsRef = useRef<Map<string, number[]>>(new Map());

  // Sync refs with state
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!race || race.resolved || !running) return;

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    const splitMarkers = SPLIT_FRACTIONS.map((f) => f * race.distance);

    const runOneTick = (silent: boolean): boolean => {
      let stillRunning = false;

      const pace = computePaceContext(runners, race.distance);
      const sortedField = [...runners].sort((a, b) => b.position - a.position);
      const { rankMap, aliveRank } = buildRankMap(runners);

      if (!silent) {
        if (onTick) {
          onTick(sortedField, simTimeRef.current, silent);
        } else if (narrativeRef.current) {
          const newCommentary = narrativeRef.current.update(sortedField, simTimeRef.current);
          if (newCommentary.length > 0) {
            messageQueue.current.push(...newCommentary);
          }
        }
      }

      for (const r of runners) {
        if (r.finishTime !== null) continue;
        const posBefore = r.position;
        stepRunner(
          r,
          FIXED_DT,
          simTimeRef.current,
          race.distance,
          rngRef.current!,
          sortedField,
          pace,
          course,
          rankMap.get(r.horseId),
          aliveRank,
          windKph,
          windDirectionDeg,
          runners.length,
        );
        if (!splitCrossingsRef.current.has(r.horseId)) {
          splitCrossingsRef.current.set(r.horseId, []);
        }
        updateSplitCrossings(
          r,
          posBefore,
          splitMarkers,
          simTimeRef.current,
          FIXED_DT,
          splitCrossingsRef.current.get(r.horseId)!,
        );
        if (r.finishTime !== null) {
          recordFinish(r, finishOrderRef.current);
        } else {
          stillRunning = true;
        }
      }
      simTimeRef.current += FIXED_DT;
      return stillRunning;
    };

    // Fast-forward to resumeAtSimTime (silent: no commentary spam on replay).
    if (resumeAtSimTime > 0 && simTimeRef.current < resumeAtSimTime) {
      const targetSteps = Math.floor(resumeAtSimTime / FIXED_DT);
      let safety = 0;
      while (simTimeRef.current + FIXED_DT * 0.5 < resumeAtSimTime && safety < targetSteps + 10) {
        const still = runOneTick(true);
        safety++;
        if (!still) break;
      }
    }

    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;

      if (!pausedRef.current) {
        accumulator += real * speedRef.current;
      }

      let stillRunning = runners.some((r) => r.finishTime === null);
      let steps = 0;

      while (accumulator >= FIXED_DT && stillRunning && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= FIXED_DT;
        steps++;
        stillRunning = runOneTick(false);
      }

      setTick((t) => t + 1);

      if (stillRunning) {
        raf = requestAnimationFrame(loop);
      } else {
        setFinished(true);
        resolveRaceWithImpacts(race.id, finishOrderRef.current);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    race,
    runners,
    resolveRaceWithImpacts,
    narrativeRef,
    messageQueue,
    rngRef,
    running,
    course,
    resumeAtSimTime,
    windDirectionDeg,
    windKph,
    onTick,
  ]);

  return {
    tick,
    speed,
    setSpeed,
    finished,
    paused,
    setPaused,
    simTime: simTimeRef.current,
    simTimeRef,
    liveSplits: splitCrossingsRef.current,
  };
}
