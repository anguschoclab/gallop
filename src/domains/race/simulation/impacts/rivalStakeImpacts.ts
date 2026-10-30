/**
 * rivalStakeImpacts.ts — Split a rival horse's prize with the player's stake.
 *
 * When a rival-owned horse the player holds a stake in earns prize money, the
 * owner's cash impact is reduced to their share and the player receives the
 * rest, plus a reputation (prestige) gain for wins and graded places.
 */

import type {
  AnyImpact,
  CashImpact,
  ReputationImpact,
  TransactionImpact,
} from "@/platform/resolver/impacts";
import type { RivalStakePayoutImpact } from "@/platform/resolver/impacts/breedingImpacts";
import type { Rng } from "@/shared/common/rng";
import { generateUUID } from "@/shared/uuid/uuid";
import { getOrdinalSuffix } from "@/shared/common/ordinal";
import { asOwnerKey } from "@/shared/types/branded";
import { calculateRaceWinReputation } from "@/domains/reputation/simulation";
import {
  splitStakePrize,
  stakeResultReputation,
  type RivalStake,
} from "@/domains/syndicates/model/rivalStakes";
import type { Race, Horse } from "@/platform/game/types";

/**
 * Mutates `ownerCash.amount` down to the owner's share and returns the
 * player's impacts. Returns [] when the horse isn't staked or earned nothing.
 * @param horse
 * @param position
 * @param race
 * @param ownerCash
 * @param stake
 * @param newDay
 * @param rng
 * @param getId
 */
export function generateRivalStakeImpacts(
  horse: Horse,
  position: number,
  race: Race,
  ownerCash: CashImpact | undefined,
  stake: RivalStake | undefined,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): AnyImpact[] {
  if (!stake || stake.percent <= 0 || horse.ownership?.type !== "npc") return [];
  const prize = ownerCash?.amount ?? 0;
  const { playerShare, ownerShare } = splitStakePrize(prize, stake.percent);
  const reputation = stakeResultReputation(
    calculateRaceWinReputation(race.graded?.grade, race.purse),
    stake.percent,
    position,
    Boolean(race.graded),
  );
  if (playerShare <= 0 && reputation <= 0) return [];

  const id = () => (getId ? getId() : generateUUID(rng));
  const place = `${position}${getOrdinalSuffix(position)}`;
  const label = `${stake.percent}% stake in ${horse.name}: ${place} in ${race.name}`;
  const impacts: AnyImpact[] = [];

  if (ownerCash && playerShare > 0) {
    ownerCash.amount = ownerShare;
    const cash: CashImpact = {
      id: id(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "cash_change",
      entityId: asOwnerKey("player"),
      amount: playerShare,
      reason: `Prize share — ${label}`,
    };
    const tx: TransactionImpact = {
      id: id(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "transaction",
      amount: playerShare,
      category: "stake_dividend",
      description: `Prize share — ${label}`,
      horseId: horse.id,
      raceId: race.id,
    };
    impacts.push(cash, tx);
  }

  if (reputation > 0) {
    const rep: ReputationImpact = {
      id: id(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "reputation_change",
      delta: reputation,
      source: "syndication_stake",
      reason: `Prestige — ${label}`,
      metadata: { horseId: horse.id, raceId: race.id },
    };
    impacts.push(rep);
  }

  const payout: RivalStakePayoutImpact = {
    id: id(),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "rival_stake_payout",
    horseId: horse.id,
    raceId: race.id,
    raceName: race.name,
    position,
    prize,
    share: playerShare,
    reputation,
  };
  impacts.push(payout);
  return impacts;
}
