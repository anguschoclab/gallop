/**
 * useHorseValueBreakdown — view model for the price breakdown panel.
 * Rival horses stay hidden until the player has a scouting report on them.
 */

import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import type { GameState, Horse } from "@/platform/game/types";
import type { AuctionHouse } from "@/domains/prestige/simulation";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import {
  explainHorseValue,
  explainPriceMovement,
  rivalBidders,
} from "@/domains/market/simulation/valuationBreakdown";

export function useHorseValueBreakdown(rawHorse: Horse, house?: AuctionHouse) {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables);
  const day = useGame((s: GameState) => s.day);
  const snapshots = useGame((s: GameState) => s.rankingsHistory?.[rawHorse.id]);
  const scouted = useGame((s: GameState) =>
    (s.scoutReports ?? []).some((r) => r.horseId === rawHorse.id),
  );
  const scoutHorse = useGame((s) => s.scoutHorse);
  const visible = rawHorse.ownership?.type === "player" || scouted;

  const allHorses = useMemo(() => Object.values(horses), [horses]);
  const horse = useMemo(() => ensurePhenotypeResolved(rawHorse), [rawHorse]);
  const breakdown = useMemo(
    () => (visible ? explainHorseValue(horse, allHorses) : null),
    [visible, horse, allHorses],
  );
  const movement = useMemo(
    () => (visible ? explainPriceMovement(horse, allHorses, snapshots, day, 30) : null),
    [visible, horse, allHorses, snapshots, day],
  );
  const bidders = useMemo(
    () => (visible ? rivalBidders(horse, npcStables, allHorses, house, 5) : []),
    [visible, horse, npcStables, allHorses, house],
  );

  return { breakdown, movement, bidders, scout: () => scoutHorse(rawHorse.id) };
}
