import { useCallback, useState } from "react";
import type { Horse } from "@/game/types";
import { runHeadToHeadSimulation, type MonteCarloResult } from "@/core/race/headToHead";

export interface UseHeadToHeadSimReturn {
  simResults: MonteCarloResult[] | null;
  simRunning: boolean;
  runSim: (horses: Horse[], distance: number, surface: "Turf" | "Dirt" | "Synthetic") => void;
  clearSim: () => void;
}

export function useHeadToHeadSim(): UseHeadToHeadSimReturn {
  const [simResults, setSimResults] = useState<MonteCarloResult[] | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const runSim = useCallback(
    (horses: Horse[], distance: number, surface: "Turf" | "Dirt" | "Synthetic") => {
      setSimRunning(true);
      setTimeout(() => {
        const results = runHeadToHeadSimulation(horses, distance, surface, 50);
        setSimResults(results);
        setSimRunning(false);
      }, 0);
    },
    [],
  );

  const clearSim = useCallback(() => {
    setSimResults(null);
  }, []);

  return { simResults, simRunning, runSim, clearSim };
}
