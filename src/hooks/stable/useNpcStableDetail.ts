import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import { useHorses, useDay, useCash, useRaces } from "@/hooks/game/useCoreState";
import { useNpcStables, useAwards } from "@/hooks/game/useSystemsState";
import { getStableById } from "@/core/stable/stableQueries";
import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import type { GameState, Horse, PrivateSaleOffer } from "@/game/types";
import type { RaceEntry } from "@/core/race/types";
import type { EntityLink } from "@/services/narrative/newsTypes";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";

export function getRivalryStatusLabel(f: number) {
  if (f >= 80) return "Heated Rival";
  if (f >= 60) return "Rival";
  if (f >= 30) return "Competitive";
  if (f < -50) return "ALLY";
  return "NEUTRAL";
}

export function getRivalryBadgeColor(f: number) {
  if (f >= 80) return "bg-destructive text-slate-950";
  if (f >= 60) return "bg-orange-500 text-slate-950";
  if (f >= 30) return "bg-yellow-500 text-slate-950";
  if (f < -50) return "bg-success text-slate-950";
  return "bg-slate-700 text-cream";
}

export function useNpcStableDetail(stableId: string) {
  const npcStables = useNpcStables();
  const horses = useHorses();
  const races = useRaces();
  const day = useDay();
  const cash = useCash();
  const awards = useAwards();
  // useGameWithShallow: the `?? []` fallback would otherwise return a fresh
  // array each render and trigger an infinite re-render loop (see line 36).
  const news = useGameWithShallow((s) => s.news ?? []);
  const scoutHorse = useGame((s) => s.scoutHorse);
  const respondToPrivateSale = useGame((s) => s.respondToPrivateSale);
  const requestOverride = useGame((s) => s.requestOverride);
  const privateSaleOffers = useGameWithShallow((s: GameState) => s.privateSaleOffers ?? []);
  const npcAIManager = useGame((s) => s.npcAIManager);

  const [offerHorse, setOfferHorse] = useState<Horse | null>(null);

  const stable = getStableById(npcStables, stableId);

  // NPC horses live in the store with a deferred phenotype (stats/ratings all
  // zero until resolved), so resolve before anything reads their numbers.
  const stableHorses = useMemo(
    () =>
      stable
        ? Object.values(horses)
            .filter((h: Horse) => getStableId(h) === stableId)
            .map(ensurePhenotypeResolved)
        : [],
    [horses, stable, stableId],
  );
  const activeHorses = stableHorses.filter(
    (h: Horse) => !h.healthStatus || h.healthStatus === "healthy",
  );
  const colts = stableHorses.filter((h: Horse) => isMaleHorse(h.gender));
  const fillies = stableHorses.filter((h: Horse) => isFemaleHorse(h.gender));

  const stableAI = npcAIManager?.stableStates?.[stableId];
  const friction = stableAI?.friction ?? 0;

  const headToHead = useMemo(() => {
    const ownedHorses = Object.values(horses).filter((h) => isPlayerOwned(h));
    const thirtyDaysAgo = day - 30;
    // Pre-index graded race entries by stableId for O(1) lookups.
    const gradedRaceStables = new Map<string, Set<string>>();
    for (const raceId in races) {
      const race = races[raceId];
      if (!race.graded) continue;
      const stableSet = new Set<string>();
      for (const e of race.entries) {
        const sid = getStableId(e);
        if (sid) stableSet.add(sid);
      }
      gradedRaceStables.set(raceId, stableSet);
    }
    let wins = 0;
    let losses = 0;
    ownedHorses.forEach((horse) => {
      horse.raceHistory
        .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
        .forEach((raceResult: { raceId: string; position: number }) => {
          const stableSet = gradedRaceStables.get(raceResult.raceId);
          if (stableSet && stableSet.has(stableId)) {
            if (raceResult.position === 1) wins++;
            else losses++;
          }
        });
    });
    return { wins, losses };
  }, [day, horses, races, stableId]);

  const grudgeMatches = news
    ? news
        .filter(
          (n) =>
            n.category === "racing" &&
            n.entityLinks?.some(
              (link: EntityLink) => link.type === "stable" && link.id === stableId,
            ),
        )
        .slice(0, 3)
    : [];

  return {
    stable,
    stableHorses,
    activeHorses,
    colts,
    fillies,
    friction,
    headToHead,
    grudgeMatches,
    awards,
    day,
    cash,
    privateSaleOffers,
    scoutHorse,
    respondToPrivateSale,
    requestOverride,
    offerHorse,
    setOfferHorse,
    horses,
    news,
  };
}
