import { useState, useEffect, useRef } from "react";
import { computePaceContext, stepRunner, type Runner } from "@/game/raceSim";
import type { NarrativeGenerator } from "@/services/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";

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
}: {
  race: any;
  runners: Runner[];
  resolveRaceWithImpacts: (raceId: string, finishOrder: any[]) => void;
  narrativeRef: React.MutableRefObject<NarrativeGenerator | null>;
  messageQueue: React.MutableRefObject<CommentaryLine[]>;
  rngRef: React.MutableRefObject<any>;
}) {
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);

  const simTimeRef = useRef(0);
  const finishOrderRef = useRef<{ horseId: string; position: number; time: number }[]>([]);
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
    if (!race || race.resolved) return;

    let raf = 0;
    let last = performance.now();
    const FIXED_DT = 0.05;
    let accumulator = 0;
    const MAX_STEPS_PER_FRAME = 64;
    const splitMarkers = [0.25, 0.5, 0.75, 1.0].map((f) => f * race.distance);

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
        simTimeRef.current += FIXED_DT;
        steps++;
        stillRunning = false;

        const pace = computePaceContext(runners, race.distance);

        if (narrativeRef.current) {
          const newCommentary = narrativeRef.current.update(
            runners,
            simTimeRef.current,
            pace.pacePressure,
          );
          if (newCommentary.length > 0) {
            messageQueue.current.push(...newCommentary);
          }
        }

        for (const r of runners) {
          if (r.finishTime === null) {
            const posBefore = r.position;
            stepRunner(
              r,
              FIXED_DT,
              simTimeRef.current,
              race.distance,
              rngRef.current!,
              runners,
              pace,
            );
            // Track quarter-marker crossings with linear interpolation
            if (!splitCrossingsRef.current.has(r.horseId)) {
              splitCrossingsRef.current.set(r.horseId, []);
            }
            const crossings = splitCrossingsRef.current.get(r.horseId)!;
            const nextMarkerIdx = crossings.length;
            if (nextMarkerIdx < splitMarkers.length) {
              const marker = splitMarkers[nextMarkerIdx];
              if (r.position >= marker && posBefore < marker) {
                // Linear interpolation for precise crossing time
                const tBefore = simTimeRef.current - FIXED_DT;
                const frac = (marker - posBefore) / (r.position - posBefore);
                crossings.push(tBefore + frac * FIXED_DT);
              }
            }
            if (r.finishTime !== null) {
              finishOrderRef.current.push({
                horseId: r.horseId,
                position: finishOrderRef.current.length + 1,
                time: r.finishTime,
              });
            } else {
              stillRunning = true;
            }
          }
        }
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
  }, [race, runners, resolveRaceWithImpacts, narrativeRef, messageQueue, rngRef]);

  return {
    tick,
    speed,
    setSpeed,
    finished,
    paused,
    setPaused,
    simTime: simTimeRef.current,
    liveSplits: splitCrossingsRef.current,
  };
}
