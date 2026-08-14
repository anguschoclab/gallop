import { useMemo } from "react";
import { useGameWithShallow } from "@/game/store";
import {
  computeWealthStandings,
  type ComputeWealthStandingsResult,
} from "@/core/standings/computeWealthStandings";

export function useWealthStandings(): ComputeWealthStandingsResult {
  const { cash, horses, npcStables, playerProfile } = useGameWithShallow((s) => ({
    cash: s.cash,
    horses: s.horses,
    npcStables: s.npcStables,
    playerProfile: s.playerProfile,
  }));

  return useMemo(
    () => computeWealthStandings({ cash, horses, npcStables, playerProfile }),
    [cash, horses, npcStables, playerProfile],
  );
}
