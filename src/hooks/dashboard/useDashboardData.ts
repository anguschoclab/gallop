import { useMemo, useCallback } from "react";
import { useGame } from "@/game/store";

export function useDashboardData() {
  const {
    day,
    cash,
    horses,
    races,
    auctions,
    npcStables,
    npcAIManager,
    inbox,
  } = useGame();

  const ownedHorses = horses.filter((h) => h.owned);
  const activeHorses = ownedHorses.filter((h) => h.lifecycleStatus === "active");
  const lowEnergyHorses = activeHorses.filter((h) => h.energy < 40);

  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 8);

  const nextOwnedRace = upcoming.find((r) => r.entries.some((e: any) => e.owned));
  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];

  const urgentMessages = (inbox || [])
    .filter((m: any) => !m.readAt && m.priority !== "info")
    .sort((a: any, b: any) => b.day - a.day)
    .slice(0, 3);

  const topRivals = npcStables
    .map((stable) => ({
      stable,
      friction: npcAIManager?.stableStates?.[stable.id]?.friction ?? 0,
    }))
    .filter((r) => r.friction >= 40)
    .sort((a, b) => b.friction - a.friction)
    .slice(0, 3);

  const raceMap = useMemo(() => new Map(races.map((r: any) => [r.id, r])), [races]);

  const calculateHeadToHead = useCallback(
    (stableId: string) => {
      const thirtyDaysAgo = day - 30;
      let wins = 0;
      let losses = 0;
      ownedHorses.forEach((horse) => {
        horse.raceHistory
          .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
          .forEach((raceResult: { raceId: string; position: number }) => {
            const race = raceMap.get(raceResult.raceId);
            if (race) {
              const hadRivalEntry = race.entries.some((e: any) => e.stableId === stableId);
              if (hadRivalEntry) {
                if (raceResult.position === 1) wins++;
                else losses++;
              }
            }
          });
      });
      return { wins, losses };
    },
    [day, ownedHorses, raceMap],
  );

  return {
    day,
    cash,
    ownedHorses,
    activeHorses,
    lowEnergyHorses,
    upcoming,
    nextOwnedRace,
    activeAuctions,
    urgentMessages,
    topRivals,
    calculateHeadToHead,
  };
}
