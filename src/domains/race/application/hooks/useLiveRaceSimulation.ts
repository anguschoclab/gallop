import { useState, useEffect, useRef } from "react";
import type { Runner } from "@/domains/race/simulation/engine/runnerBuilder";
import type { CourseSpecification } from "@/shared/data/tracks";
import type { NarrativeGenerator } from "@/domains/narrative/application/narrativeService";
import type { CommentaryLine } from "@/domains/narrative/application/commentaryGenerator";
import type { Race, RaceResult } from "@/domains/race/simulation/types";
import type { Rng } from "@/shared/common/rng";
import { DEFAULT_DT as FIXED_DT } from "@/domains/race/model/engine/constants";;
import { SIMULATION_MAX_STEPS_PER_FRAME as MAX_STEPS_PER_FRAME } from "@/domains/race/model/raceSimulationConstants";

import { compareFinishOrder } from "@/domains/race/simulation/engine/compareFinishOrder";
import { RaceSimulationSession } from "@/domains/race/simulation/engine/raceSession";
import { toRaceRunner } from "@/domains/race/simulation/raceSimulationExecutor";
import type { RunnerFactorLedger } from "@/domains/race/simulation/factorLedger";
import type { RaceSnapshot } from "@/domains/race/model/engine/raceSnapshotTypes";

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
  finishOrder: { horseId: string; position: number; time: number; gate: number }[],
): void {
  if (r.finishTime === null) return;
  finishOrder.push({
    horseId: r.horseId,
    position: 0,
    time: r.finishTime,
    gate: r.gate,
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
  resolveRaceWithImpacts: (
    raceId: string,
    finishOrder: RaceResult[],
    runners?: import("@/domains/race/simulation/types").RaceRunner[],
    factorLedgers?: Record<string, RunnerFactorLedger>,
    snapshots?: RaceSnapshot[],
  ) => void | Promise<void>;
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
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  // splitCrossings[horseId] = [t_at_25%, t_at_50%, t_at_75%, t_at_finish]
  const splitCrossingsRef = useRef<Map<string, number[]>>(new Map());
  // Live race snapshots — captured periodically for replay playback
  const snapshotsRef = useRef<RaceSnapshot[]>([]);

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

    const session = new RaceSimulationSession(runners, {
      distance: race.distance,
      rng: rngRef.current!,
      dt: FIXED_DT,
      course,
      windKph,
      windDirectionDeg,
      snapshotEveryTicks: 10,
      recordPaceSnapshots: false,
      trackSplits: true,
      onTick: (sortedField, simTime, silent) => {
        if (onTick) {
          onTick(sortedField, simTime, silent);
        } else if (narrativeRef.current) {
          const newCommentary = narrativeRef.current.update(sortedField, simTime);
          if (newCommentary.length > 0) {
            messageQueue.current.push(...newCommentary);
          }
        }
      },
    });
    simTimeRef.current = session.simTime;
    splitCrossingsRef.current = session.splitCrossings;
    snapshotsRef.current = session.snapshots;

    // Fast-forward to resumeAtSimTime (silent: no commentary spam on replay).
    if (resumeAtSimTime > 0 && session.simTime < resumeAtSimTime) {
      session.fastForwardTo(resumeAtSimTime);
      simTimeRef.current = session.simTime;
    }

    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;

      if (!pausedRef.current) {
        accumulator += real * speedRef.current;
      }

      let stillRunning = !session.finished;
      let steps = 0;

      while (accumulator >= FIXED_DT && stillRunning && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= FIXED_DT;
        steps++;
        stillRunning = session.step(false);
      }
      simTimeRef.current = session.simTime;

      setTick((t) => t + 1);

      if (stillRunning) {
        raf = requestAnimationFrame(loop);
      } else {
        setFinished(true);
        const outcome = session.finalize();
        resolveRaceWithImpacts(
          race.id,
          outcome.finishOrder,
          // Pass the actual simulated field so neither the resolve commit nor
          // the pipeline re-runs a duplicate headless simulation.
          session.runners.map(toRaceRunner),
          outcome.factorLedgers,
          outcome.snapshots,
        );
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
