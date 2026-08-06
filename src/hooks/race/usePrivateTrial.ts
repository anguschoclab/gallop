import { useState, useMemo, useCallback } from "react";
import { useGame, type StoreType } from "@/game/store";
import type { Horse } from "@/game/types";
import { generateRiderFeedback } from "@/core/horse/trialFeedback";

export interface TrialResult {
  snapshots: Array<{
    t: number;
    horses: Array<{ horseId: string; velocity: number }>;
  }>;
  result: Array<{
    horseId: string;
    position: number;
    time: number;
  }>;
}

export function usePrivateTrial(horse: Horse, horses: Horse[], cash: number) {
  const [isOpen, setIsOpen] = useState(false);
  const [distance, setDistance] = useState<number>(1200);
  const [surface, setSurface] = useState<"Turf" | "Dirt" | "Synthetic">("Turf");
  const [opponentId, setOpponentId] = useState<string>("pacemaker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);

  const runPrivateTrial = useGame((s: StoreType) => s.runPrivateTrial);

  const eligibleOpponents = useMemo(() => {
    return horses.filter((h) => h.owned && h.energy >= 15 && h.id !== horse.id);
  }, [horses, horse.id]);

  const opponentName = useMemo(() => {
    if (opponentId === "pacemaker") return "Pacemaker";
    return eligibleOpponents.find((h) => h.id === opponentId)?.name ?? "Opponent";
  }, [opponentId, eligibleOpponents]);

  const chartData = useMemo(() => {
    if (!trialResult || !trialResult.snapshots) return [];
    return trialResult.snapshots.map((snap) => {
      const dataPoint: Record<string, number> = { t: Number(snap.t.toFixed(1)) };
      snap.horses.forEach((hSnap) => {
        const name = hSnap.horseId === horse.id ? horse.name : opponentName;
        dataPoint[name] = Number((hSnap.velocity * 3.6).toFixed(1));
      });
      return dataPoint;
    });
  }, [trialResult, horse.id, horse.name, opponentName]);

  const runnerStats = useMemo(() => {
    if (!trialResult || !trialResult.result) return [];
    return trialResult.result
      .map((res) => {
        const isPlayer = res.horseId === horse.id;
        return {
          name: isPlayer ? horse.name : opponentName,
          isPlayer,
          position: res.position,
          time: res.time,
        };
      })
      .sort((a, b) => a.position - b.position);
  }, [trialResult, horse.id, horse.name, opponentName]);

  const feedback = useMemo(() => {
    if (!trialResult) return "";
    return generateRiderFeedback(horse, distance, surface);
  }, [trialResult, horse, distance, surface]);

  const handleStartTrial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = runPrivateTrial(horse.id, opponentId, distance, surface);
      if (res.ok) {
        setTrialResult(res.result as TrialResult);
      } else {
        setError(res.reason || "Failed to start trial.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [runPrivateTrial, horse.id, opponentId, distance, surface]);

  const handleReset = useCallback(() => {
    setTrialResult(null);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) handleReset();
    },
    [handleReset],
  );

  return {
    isOpen,
    setIsOpen: handleOpenChange,
    distance,
    setDistance,
    surface,
    setSurface,
    opponentId,
    setOpponentId,
    loading,
    error,
    trialResult,
    eligibleOpponents,
    opponentName,
    chartData,
    runnerStats,
    feedback,
    handleStartTrial,
    handleReset,
  };
}
