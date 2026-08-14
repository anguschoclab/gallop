import { useMemo, useCallback } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { RaceEntry } from "@/core/race/types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import type { Horse } from "@/core/horse/types";

export function useDashboardData() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const { horses, races, auctions, npcStables, npcAIManager, inbox } = useGameWithShallow((s) => ({
    horses: s.horses,
    races: s.races,
    auctions: s.auctions,
    npcStables: s.npcStables,
    npcAIManager: s.npcAIManager,
    inbox: s.inbox,
  }));

  const { ownedHorses, activeHorses, lowEnergyHorses } = useMemo(() => {
    const owned: Horse[] = [];
    const active: Horse[] = [];
    const lowEnergy: Horse[] = [];
    for (const h of Object.values(horses)) {
      if (!h.owned) continue;
      owned.push(h);
      if (h.lifecycleStatus !== "active") continue;
      active.push(h);
      if (h.energy < 40) lowEnergy.push(h);
    }
    return { ownedHorses: owned, activeHorses: active, lowEnergyHorses: lowEnergy };
  }, [horses]);

  const upcoming = Object.values(races)
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 8);

  const nextOwnedRace = upcoming.find((r) => r.entries.some((e: RaceEntry) => e.owned));
  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];

  const urgentMessages = (inbox || [])
    .filter((m: InboxMessage) => !m.readAt && m.priority !== "info")
    .sort((a: InboxMessage, b: InboxMessage) => b.day - a.day)
    .slice(0, 3);

  const topRivals = npcStables
    .map((stable) => ({
      stable,
      friction: npcAIManager?.stableStates?.[stable.id]?.friction ?? 0,
    }))
    .filter((r) => r.friction >= 40)
    .sort((a, b) => b.friction - a.friction)
    .slice(0, 3);

  const raceMap = races;

  const calculateHeadToHead = useCallback(
    (stableId: string) => {
      const thirtyDaysAgo = day - 30;
      let wins = 0;
      let losses = 0;
      ownedHorses.forEach((horse) => {
        horse.raceHistory
          .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
          .forEach((raceResult: { raceId: string; position: number }) => {
            const race = raceMap[raceResult.raceId];
            if (race) {
              const hadRivalEntry = race.entries.some((e: RaceEntry) => e.stableId === stableId);
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
