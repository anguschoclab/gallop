import { useMemo } from "react";
import { useGame } from "@/game/store";
import { computeSeasonStandings, type ComputeStandingsResult } from "@/core/standings/computeStandings";

export function useSeasonStandings(rangeDays: number): ComputeStandingsResult {
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const npcStables = useGame((s) => s.npcStables);
  const npcAIManager = useGame((s) => (s as any).npcAIManager);
  const playerProfile = useGame((s) => (s as any).playerProfile);

  return useMemo(
    () => computeSeasonStandings(
      { day, horses, npcStables, npcAIManager, playerProfile } as any,
      rangeDays,
    ),
    [day, horses, npcStables, npcAIManager, playerProfile, rangeDays],
  );
}
