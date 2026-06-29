import { useState, useEffect, useRef } from "react";
import type { RacePhase } from "@/hooks/race/useRacePhase";

export interface RaceProgressState {
  simTime: number;
  paused: boolean;
  speed: number;
}

/**
 * Manages all localStorage and sessionStorage persistence for a live race page.
 *
 * - Persists the post-race analysis panel open/close state in localStorage.
 * - Reads the initial simulation progress (simTime, paused, speed) from
 *   sessionStorage so a page refresh resumes from the same point.
 * - Writes current simulation progress to sessionStorage while the race is live.
 * - Clears the sessionStorage entry once the race finishes.
 *
 * @param options.raceId - Unique race identifier (used as storage key suffix)
 * @param options.phase - Current race phase (preshow | live | review)
 * @param options.finished - Whether the simulation has finished
 * @param options.simTime - Current simulation time in seconds
 * @param options.paused - Whether the simulation is paused
 * @param options.speed - Current playback speed multiplier
 * @param options.tick - RAF tick counter (drives the persistence effect)
 */
export function useRaceProgress({
  raceId,
  phase,
  finished,
  simTime,
  paused,
  speed,
  tick,
}: {
  raceId: string;
  phase: RacePhase;
  finished: boolean;
  simTime: number;
  paused: boolean;
  speed: number;
  tick: number;
}): {
  analysisOpen: boolean;
  setAnalysisOpen: (v: boolean) => void;
  analysisRef: React.RefObject<HTMLDivElement | null>;
  initialProgress: RaceProgressState;
} {
  const analysisStorageKey = `race-analysis-open:${raceId}`;
  const progressStorageKey = `race-sim-progress:${raceId}`;

  const [analysisOpen, setAnalysisOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(analysisStorageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(analysisStorageKey, analysisOpen ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  }, [analysisOpen, analysisStorageKey]);

  const analysisRef = useRef<HTMLDivElement | null>(null);

  const initialProgress = useRef<RaceProgressState>(
    (() => {
      if (typeof window === "undefined") return { simTime: 0, paused: false, speed: 1 };
      try {
        const raw = window.sessionStorage.getItem(progressStorageKey);
        if (!raw) return { simTime: 0, paused: false, speed: 1 };
        const p = JSON.parse(raw);
        return {
          simTime: typeof p.simTime === "number" ? p.simTime : 0,
          paused: !!p.paused,
          speed: typeof p.speed === "number" ? p.speed : 1,
        };
      } catch {
        return { simTime: 0, paused: false, speed: 1 };
      }
    })(),
  ).current;

  useEffect(() => {
    if (phase !== "live" || finished || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(progressStorageKey, JSON.stringify({ simTime, paused, speed }));
    } catch {
      /* ignore quota */
    }
  }, [tick, paused, speed, phase, finished, simTime, progressStorageKey]);

  useEffect(() => {
    if (!finished || typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(progressStorageKey);
    } catch {
      /* ignore */
    }
  }, [finished, progressStorageKey]);

  return { analysisOpen, setAnalysisOpen, analysisRef, initialProgress };
}
