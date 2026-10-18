/**
 * validators/RacingValidator.ts - Racing intent validator
 *
 * This file validates race entry, race withdrawal, and claiming withdrawal intents
 * to ensure horses exist, have sufficient energy, races are valid, and horses are not consigned.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, RaceEntryIntent, WithdrawFromClaimingIntent), ./types (IntentValidator, ValidationCache)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState, Horse } from "@/game/types";
import type {
  AnyIntent,
  RaceEntryIntent,
  RaceWithdrawalIntent,
  WithdrawFromClaimingIntent,
} from "../intents";
import type { IntentValidator, ValidationCache } from "./types";

function sourceOwnsHorse(intent: AnyIntent, horse: Horse): boolean {
  if (intent.source === "player" || intent.source === "system") {
    return horse.ownership?.type === "player";
  }
  return horse.ownership?.type === "npc" && horse.ownership.stableId === intent.sourceId;
}

export class RacingValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "race_entry" || type === "withdraw_from_claiming" || type === "race_withdrawal";
  }

  validate(
    intent: AnyIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    switch (intent.type) {
      case "race_entry": {
        const raceIntent = intent as RaceEntryIntent;
        const horse = cache?.horseMap?.get(raceIntent.horseId) || state.horses[raceIntent.horseId];
        const race = cache?.raceMap?.get(raceIntent.raceId) || state.races[raceIntent.raceId];

        if (!horse) return { valid: false, reason: "Horse not found" };
        if (!sourceOwnsHorse(intent, horse)) {
          return { valid: false, reason: "Intent source does not own horse" };
        }
        if (horse.consignedSaleId)
          return { valid: false, reason: "Horse is consigned to an auction" };
        if (!race) return { valid: false, reason: "Race not found" };
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (horse.energy < 40) return { valid: false, reason: "Insufficient energy" };

        // Validate invitation requirement for invite-only races
        if (race.graded?.requiresInvitation) {
          const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
          const isInvited = invitedIds.includes(raceIntent.horseId);
          const currentYear = Math.floor((state.day - 1) / 365) + 1;
          const isWinAndYouIn =
            race.graded.key &&
            horse.winAndYouInQualified?.some(
              (q) => q.raceKey === race.graded!.key && q.year === currentYear,
            );
          if (!isInvited && !isWinAndYouIn) {
            return { valid: false, reason: "Invitation required for this race" };
          }
        }
        break;
      }

      case "race_withdrawal": {
        const withdrawalIntent = intent as RaceWithdrawalIntent;
        const race =
          cache?.raceMap?.get(withdrawalIntent.raceId) || state.races[withdrawalIntent.raceId];
        const horse =
          cache?.horseMap?.get(withdrawalIntent.horseId) || state.horses[withdrawalIntent.horseId];

        if (!horse) return { valid: false, reason: "Horse not found" };
        if (!sourceOwnsHorse(intent, horse)) {
          return { valid: false, reason: "Intent source does not own horse" };
        }
        if (!race) return { valid: false, reason: "Race not found" };
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (!race.entries.some((entry) => entry.horseId === withdrawalIntent.horseId)) {
          return { valid: false, reason: "Horse not entered in this race" };
        }
        break;
      }

      case "withdraw_from_claiming": {
        const withdrawIntent = intent as WithdrawFromClaimingIntent;
        const race =
          cache?.raceMap?.get(withdrawIntent.raceId) || state.races[withdrawIntent.raceId];
        const horse =
          cache?.horseMap?.get(withdrawIntent.horseId) || state.horses[withdrawIntent.horseId];

        if (!race) return { valid: false, reason: "Race not found" };
        if (!horse) return { valid: false, reason: "Horse not found" };
        if (!sourceOwnsHorse(intent, horse)) {
          return { valid: false, reason: "Intent source does not own horse" };
        }
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
        if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming") {
          return { valid: false, reason: "Withdrawal only allowed in optional claiming races" };
        }
        const entry = race.entries.find((e) => e.horseId === withdrawIntent.horseId);
        if (!entry) return { valid: false, reason: "Horse not entered in this race" };
        if (entry.withdrawnFromClaiming) {
          return { valid: false, reason: "Horse already withdrawn from claiming" };
        }
        break;
      }
    }

    return { valid: true };
  }
}
