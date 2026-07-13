import { useState, useMemo, useCallback } from "react";
import { useGame } from "@/game/store";
import { calculateAutoRegisterEntries } from "@/core/campaign/autoRegister";
import { useHorses, useCash, useDay, useRaces } from "@/hooks/game/useCoreState";
import { useJockeys } from "@/hooks/game/useSystemsState";
import { toast } from "sonner";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";

export function useAutoRegister() {
  const [isProcessing, setIsProcessing] = useState(false);

  const horses = useHorses();
  const races = useRaces();
  const jockeys = useJockeys();
  const cash = useCash();
  const day = useDay();

  const enterRace = useGame((s) => s.enterRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const setRaceTactics = useGame((s) => s.setRaceTactics);

  const result = useMemo(() => {
    return calculateAutoRegisterEntries(Object.values(horses), Object.values(races), jockeys, cash, day);
  }, [horses, races, jockeys, cash, day]);

  const eligibleCount = result.entries.length + result.skipped.length;
  const hasEntries = result.entries.length > 0;
  const hasBudget = result.affordableCount > 0;
  const hasEligibleHorses = eligibleCount > 0;
  const isDisabled = !hasEligibleHorses;

  const buttonTooltip = !hasEligibleHorses
    ? "No eligible horses for auto-registration"
    : undefined;

  const execute = useCallback(async () => {
    setIsProcessing(true);
    const successful: string[] = [];
    const failed: { name: string; reason: string }[] = [];

    for (const entry of result.entries) {
      const enterResult = enterRace(entry.raceId, entry.horseId);
      if (!enterResult.ok) {
        failed.push({
          name: entry.horseName,
          reason: enterResult.reason || "Failed to enter race",
        });
        continue;
      }

      if (entry.jockeyId) {
        const jockeyResult = assignJockey(entry.raceId, entry.horseId, entry.jockeyId);
        if (!jockeyResult.ok) {
          console.warn(`Jockey assignment failed for ${entry.horseName}:`, jockeyResult.reason);
        }
      }

      const defaultInstructions: JockeyInstructions = {
        horseId: entry.horseId,
        raceId: entry.raceId,
        ridingStyle: "tactical",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: 50,
      };
      setRaceTactics(entry.raceId, entry.horseId, defaultInstructions);
      successful.push(entry.horseName);
    }

    setIsProcessing(false);

    if (successful.length > 0) {
      toast.success(
        `Auto-registered ${successful.length} horse${successful.length > 1 ? "s" : ""}`,
        { description: successful.join(", ") },
      );
    }

    if (failed.length > 0) {
      toast.error(`${failed.length} registration${failed.length > 1 ? "s" : ""} failed`, {
        description: failed.map((f) => `${f.name}: ${f.reason}`).join("; "),
      });
    }

    return { successful, failed };
  }, [result.entries, enterRace, assignJockey, setRaceTactics]);

  return {
    result,
    isProcessing,
    execute,
    eligibleCount,
    hasEntries,
    hasBudget,
    hasEligibleHorses,
    isDisabled,
    buttonTooltip,
  };
}
