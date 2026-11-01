/**
 * useRivalStakes.ts — View model for the Rival Horse Stakes page.
 *
 * Builds the player's holdings (share of earnings, price and prestige) and a
 * ranked list of rival racehorses whose owners will sell a stake.
 */

import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import type { GameState, Horse } from "@/platform/game/types";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import { rivalStakeHorseValue } from "@/domains/syndicates/simulation/rivalStakeTrades";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";
import {
  remainingStakeCapacity,
  rivalStakeEligibility,
  stakeBuyPricePerPercent,
  stakeMarketValue,
  stakeSellPricePerPercent,
  type RivalStake,
} from "@/domains/syndicates/model/rivalStakes";

export type StakeStatus = "racing" | "retired" | "deceased" | "yours" | "missing";

export interface RivalStakeHolding {
  stake: RivalStake;
  horse?: Horse;
  ownerName: string;
  status: StakeStatus;
  horseValue: number;
  stakeValue: number;
  sellNow: number;
  /** Stake value + prize received − cost. */
  totalReturn: number;
}

export interface RivalStakeCandidate {
  horse: Horse;
  ownerId: string;
  ownerName: string;
  wins: number;
  starts: number;
  earnings: number;
  rating: number;
  value: number;
  pricePerPercent: number;
  heldPercent: number;
  capacity: number;
}

export function horseEarnings(h: Horse): number {
  return (h.raceHistory ?? []).reduce((sum, r) => sum + (r.purseEarned ?? 0), 0);
}

function statusOf(horse: Horse | undefined): StakeStatus {
  if (!horse) return "missing";
  if (horse.lifecycleStatus === "deceased") return "deceased";
  if (horse.ownership?.type !== "npc") return "yours";
  if (horse.lifecycleStatus === "retired" || horse.racingViable === false) return "retired";
  return "racing";
}

/** Max candidates to value at once — market value is the expensive step. */
const CANDIDATE_LIMIT = 60;

export function useRivalStakes(query: string, stableFilter?: string) {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables);
  const rivalStakes = useGameWithShallow((s: GameState) => s.rivalStakes ?? {});
  const cash = useGame((s: GameState) => s.cash);
  const reputationScore = useGame((s: GameState) => s.reputation?.score ?? 0);

  const allHorses = useMemo(() => Object.values(horses), [horses]);
  const stableNames = useMemo(
    () => new Map(npcStables.map((s) => [String(s.id), s.name])),
    [npcStables],
  );

  const holdings = useMemo<RivalStakeHolding[]>(() => {
    return Object.values(rivalStakes)
      .map((stake) => {
        const horse = horses[stake.horseId as keyof typeof horses] as Horse | undefined;
        const status = statusOf(horse);
        const horseValue = horse && status !== "deceased" ? rivalStakeHorseValue(horse, allHorses) : 0;
        const stakeValue = stakeMarketValue(stake.percent, horseValue);
        const ownerId =
          horse?.ownership?.type === "npc" ? String(horse.ownership.stableId) : stake.stableId;
        return {
          stake,
          horse,
          ownerName: status === "yours" ? "Your stable" : (stableNames.get(ownerId) ?? "Rival stable"),
          status,
          horseValue,
          stakeValue,
          sellNow: stakeSellPricePerPercent(horseValue) * stake.percent,
          totalReturn: stakeValue + stake.prizeEarned - stake.costBasis,
        };
      })
      .sort((a, b) => b.stakeValue - a.stakeValue);
  }, [rivalStakes, horses, allHorses, stableNames]);

  const candidates = useMemo<RivalStakeCandidate[]>(() => {
    const q = query.trim().toLowerCase();
    const pre = allHorses
      .filter((h) => rivalStakeEligibility(h).ok)
      .filter((h) => !stableFilter || String(h.ownership?.type === "npc" && h.ownership.stableId) === stableFilter)
      .map((h) => {
        const ownerId = h.ownership?.type === "npc" ? String(h.ownership.stableId) : "";
        return { h, ownerId, ownerName: stableNames.get(ownerId) ?? "Rival stable" };
      })
      .filter(
        ({ h, ownerName }) =>
          !q || h.name.toLowerCase().includes(q) || ownerName.toLowerCase().includes(q),
      )
      .map((row) => ({ ...row, earnings: horseEarnings(row.h), rating: calculateOverallRating(ensurePhenotypeResolved(row.h)) }))
      .sort((a, b) => b.earnings - a.earnings || b.rating - a.rating)
      .slice(0, CANDIDATE_LIMIT);

    return pre.map(({ h, ownerId, ownerName, earnings, rating }) => {
      const value = rivalStakeHorseValue(h, allHorses);
      const heldPercent = rivalStakes[h.id]?.percent ?? 0;
      const history = h.raceHistory ?? [];
      return {
        horse: h,
        ownerId,
        ownerName,
        wins: history.filter((r) => r.position === 1).length,
        starts: history.length,
        earnings,
        rating,
        value,
        pricePerPercent: stakeBuyPricePerPercent(value),
        heldPercent,
        capacity: remainingStakeCapacity(heldPercent),
      };
    });
  }, [allHorses, stableNames, rivalStakes, query, stableFilter]);

  const summary = useMemo(() => {
    const invested = holdings.reduce((s, h) => s + h.stake.costBasis, 0);
    const value = holdings.reduce((s, h) => s + h.stakeValue, 0);
    const prize = holdings.reduce((s, h) => s + h.stake.prizeEarned, 0);
    const prestige = holdings.reduce((s, h) => s + h.stake.reputationEarned, 0);
    return { count: holdings.length, invested, value, prize, prestige, totalReturn: value + prize - invested };
  }, [holdings]);

  const recentPayouts = useMemo(
    () =>
      holdings
        .flatMap((h) => h.stake.payouts.map((p) => ({ ...p, horseName: h.stake.horseName, horseId: h.stake.horseId })))
        .sort((a, b) => b.day - a.day)
        .slice(0, 15),
    [holdings],
  );

  return { holdings, candidates, summary, recentPayouts, cash, reputationScore };
}
