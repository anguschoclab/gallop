import { useCallback } from "react";
import { useGame, type StoreType } from "@/game/store";
import type { Race } from "@/core/race/types";

export function useSkipToNext() {
  const advanceMultipleDays = useGame((s: StoreType) => s.advanceMultipleDays);

  const skipToNext = useCallback(
    (kind: "auction" | "race") => {
      const state = useGame.getState();
      const currentDay = state.day;
      let nextDay: number | undefined;
      if (kind === "auction") {
        const days = (state.auctions ?? [])
          .filter((a) => !a.resolved && a.day > currentDay)
          .map((a) => a.day);
        nextDay = days.length ? Math.min(...days) : undefined;
      } else {
        const days = Object.values(state.races ?? {})
          .filter((r: Race) => r.day > currentDay)
          .map((r: Race) => r.day);
        nextDay = days.length ? Math.min(...days) : undefined;
      }
      if (!nextDay) return;
      const delta = nextDay - currentDay;
      if (delta > 0) setTimeout(() => advanceMultipleDays(delta), 0);
    },
    [advanceMultipleDays],
  );

  return skipToNext;
}
