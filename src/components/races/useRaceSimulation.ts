import { useEffect, useRef } from "react";
import { stepRunner, computePaceContext, type Runner } from "@/game/raceSim";
import type { Race } from "@/game/types";
import type { NarrativeGenerator } from "@/services/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import { createRng, hashStr } from "@/game/rng";

interface UseRaceSimulationProps {
  race: Race | null;
  runners: Runner[];
  narrativeGenerator: NarrativeGenerator | null;
  messageQueue: React.MutableRefObject<CommentaryLine[]>;
  finishOrderRef: React.MutableRefObject<{ horseId: string; position: number; time: number }[]>;
  speedRef: React.MutableRefObject<number>;
  pausedRef: React.MutableRefObject<boolean>;
  simTimeRef: React.MutableRefObject<number>;
  onFinished: () => void;
  onTick: () => void;
}

export function useRaceSimulation({
  race,
  runners,
  narrativeGenerator,
  messageQueue,
  finishOrderRef,
  speedRef,
  pausedRef,
  simTimeRef,
  onFinished,
  onTick,
}: UseRaceSimulationProps) {
  const rngRef = useRef(race ? createRng(hashStr(race.id)) : null);

  useEffect(() => {
    if (!race || race.resolved) return;
    let raf = 0;
    let last = performance.now();
    const FIXED_DT = 0.05;
    let accumulator = 0;
    const MAX_STEPS_PER_FRAME = 64;

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
        if (narrativeGenerator) {
          const newCommentary = narrativeGenerator.update(
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
            stepRunner(
              r,
              FIXED_DT,
              simTimeRef.current,
              race.distance,
              rngRef.current!,
              runners,
              pace,
            );
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
      onTick();
      if (stillRunning) {
        raf = requestAnimationFrame(loop);
      } else {
        onFinished();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [race, race?.resolved, runners, narrativeGenerator, onFinished, onTick]);
}
