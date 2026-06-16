import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import { useHorses, useDay, useCash, useRaces } from "@/hooks/game/useCoreState";
import { useNpcStables, useAwards } from "@/hooks/game/useSystemsState";
import { getStableById } from "@/core/stable/stableQueries";
import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import type { GameState, Horse, PrivateSaleOffer } from "@/game/types";

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
  const privateSaleOffers = useGameWithShallow((s: GameState) => s.privateSaleOffers ?? []);
  const npcAIManager = useGame((s) => (s as any).npcAIManager);

  const [offerHorse, setOfferHorse] = useState<Horse | null>(null);

  const stable = getStableById(npcStables, stableId);

  const stableHorses = stable ? horses.filter((h: Horse) => h.stableId === stableId) : [];
  const activeHorses = stableHorses.filter(
    (h: Horse) => !h.healthStatus || h.healthStatus === "healthy",
  );
  const colts = stableHorses.filter((h: Horse) => isMaleHorse(h.gender));
  const fillies = stableHorses.filter((h: Horse) => isFemaleHorse(h.gender));

  const stableAI = npcAIManager?.stableStates?.[stableId];
  const friction = stableAI?.friction ?? 0;

  const raceMap = useMemo(() => new Map(races.map((r: any) => [r.id, r])), [races]);

  const headToHead = useMemo(() => {
    const ownedHorses = horses.filter((h) => h.owned);
    const thirtyDaysAgo = day - 30;
    let wins = 0;
    let losses = 0;
    ownedHorses.forEach((horse) => {
      horse.raceHistory
        .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
        .forEach((raceResult: { raceId: string; position: number }) => {
          const race = raceMap.get(raceResult.raceId);
          if (race && race.graded) {
            const hadRivalEntry = race.entries.some((e: any) => e.stableId === stableId);
            if (hadRivalEntry) {
              if (raceResult.position === 1) wins++;
              else losses++;
            }
          }
        });
    });
    return { wins, losses };
  }, [day, horses, raceMap, stableId]);

  const grudgeMatches = news
    ? news
        .filter(
          (n) =>
            n.category === "racing" &&
            n.entityLinks?.some((link: any) => link.type === "stable" && link.id === stableId),
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
    offerHorse,
    setOfferHorse,
    horses,
    news,
  };
}
