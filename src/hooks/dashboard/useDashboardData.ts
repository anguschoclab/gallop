import { useMemo, useCallback } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { RaceEntry } from "@/core/race/types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import type { Horse } from "@/core/horse/types";
import { getStableId } from "@/core/horse/ownership";
import { asRaceId } from "@/core/types/branded";
import {
  ENERGY_LOW_THRESHOLD,
  DASHBOARD_UPCOMING_RACES_LIMIT,
  DASHBOARD_URGENT_MESSAGES_LIMIT,
  DASHBOARD_TOP_RIVALS_LIMIT,
  DASHBOARD_RIVAL_FRICTION_THRESHOLD,
  HEAD_TO_HEAD_LOOKBACK_DAYS,
} from "@/constants";

export function useDashboardData() {
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const { horses, races, auctions, npcStables, npcAIManager, inbox, news } = useGameWithShallow(
    (s) => ({
      horses: s.horses,
      races: s.races,
      auctions: s.auctions,
      npcStables: s.npcStables,
      npcAIManager: s.npcAIManager,
      inbox: s.inbox,
      news: s.news,
    }),
  );

  const { ownedHorses, activeHorses, lowEnergyHorses } = useMemo(() => {
    const owned: Horse[] = [];
    const active: Horse[] = [];
    const lowEnergy: Horse[] = [];
    for (const h of Object.values(horses)) {
      if (!(h.ownership?.type === "player")) continue;
      owned.push(h);
      if (h.lifecycleStatus !== "active") continue;
      active.push(h);
      if (h.energy < ENERGY_LOW_THRESHOLD) lowEnergy.push(h);
    }
    return { ownedHorses: owned, activeHorses: active, lowEnergyHorses: lowEnergy };
  }, [horses]);

  const upcoming = Object.values(races)
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, DASHBOARD_UPCOMING_RACES_LIMIT);

  const nextOwnedRace = upcoming.find((r) =>
    r.entries.some((e: RaceEntry) => e.ownership?.type === "player"),
  );
  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];

  const urgentMessages = (inbox || [])
    .filter((m: InboxMessage) => !m.readAt && m.priority !== "info" && m.priority !== "low")
    .sort((a: InboxMessage, b: InboxMessage) => b.day - a.day)
    .slice(0, DASHBOARD_URGENT_MESSAGES_LIMIT);

  const topRivals = npcStables
    .map((stable) => ({
      stable,
      friction: npcAIManager?.stableStates?.[stable.id]?.friction ?? 0,
    }))
    .filter((r) => r.friction >= DASHBOARD_RIVAL_FRICTION_THRESHOLD)
    .sort((a, b) => b.friction - a.friction)
    .slice(0, DASHBOARD_TOP_RIVALS_LIMIT);

  const raceMap = races;

  const calculateHeadToHead = useCallback(
    (stableId: string) => {
      const thirtyDaysAgo = day - HEAD_TO_HEAD_LOOKBACK_DAYS;
      let wins = 0;
      let losses = 0;
      ownedHorses.forEach((horse) => {
        horse.raceHistory
          .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
          .forEach((raceResult: { raceId: string; position: number }) => {
            const race = raceMap[asRaceId(raceResult.raceId)];
            if (race) {
              const hadRivalEntry = race.entries.some(
                (e: RaceEntry) => (getStableId(e) ?? undefined) === stableId,
              );
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
    news,
  };
}
