import { useMemo } from "react";
import { useGameWithShallow } from "@/game/store";
import {
  computeSeasonStandings,
  type ComputeStandingsResult,
} from "@/core/standings/computeStandings";

export function useSeasonStandings(rangeDays: number): ComputeStandingsResult {
  const { day, horses, npcStables, npcAIManager, playerProfile } = useGameWithShallow((s) => ({
    day: s.day,
    horses: s.horses,
    npcStables: s.npcStables,
    npcAIManager: s.npcAIManager,
    playerProfile: s.playerProfile,
  }));

  return useMemo(
    () =>
      computeSeasonStandings({ day, horses, npcStables, npcAIManager, playerProfile }, rangeDays),
    [day, horses, npcStables, npcAIManager, playerProfile, rangeDays],
  );
}
