/**
 * horseManagementResolvers.ts - Horse-related management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "../pipeline";
import type {
  AnyIntent,
  UpdateStudFeeIntent,
  GeldingIntent,
  RenameIntent,
  TacticsIntent,
  StudRetirementIntent,
  ScoutIntent,
} from "@/core/resolver/intents";
import type {
  AnyImpact,
  CashImpact,
  UpdateStudFeeImpact,
  GeldingImpact,
  RenameImpact,
  TacticsImpact,
  StudCareerImpact,
  InboxImpact,
  ScoutReportImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { createRng, hashStr } from "@/core/common/rng";
import { scoutHorse } from "@/core/npc/scouting";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  isTopHorse,
  isHallOfFameEligible,
  buildRetirementBody,
} from "@/core/inbox/retirementMessages";

export function resolveHorseIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { state, newDay, horseMap, stableMap, dailyRng } = context;

  switch (intent.type) {
    case "update_stud_fee": {
      const typedIntent = intent as UpdateStudFeeIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "update_stud_fee",
        horseId: typedIntent.horseId,
        newFee: typedIntent.newFee,
        reason: "Stud fee updated",
      } as UpdateStudFeeImpact);
      return true;
    }

    case "gelding": {
      const typedIntent = intent as GeldingIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "gelding",
        horseId: typedIntent.horseId,
        reason: "Gelded",
      } as GeldingImpact);
      return true;
    }

    case "rename": {
      const typedIntent = intent as RenameIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "rename",
        horseId: typedIntent.horseId,
        newName: typedIntent.newName,
        reason: "Renamed",
      } as RenameImpact);
      return true;
    }

    case "tactics": {
      const typedIntent = intent as TacticsIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "tactics",
        raceId: typedIntent.raceId,
        horseId: typedIntent.horseId,
        jockeyInstructions: typedIntent.jockeyInstructions,
        reason: "Tactics updated",
      } as TacticsImpact);
      return true;
    }

    case "stud_retirement": {
      const typedIntent = intent as StudRetirementIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "stud_career",
        horseId: typedIntent.horseId,
        studCareer: {
          atStud: true,
          standingFee: typedIntent.standingFee,
          bookSize: typedIntent.bookSize,
          seasonBookings: 0,
          lifetimeFoals: 0,
        },
        reason: "Retired to stud",
      } as StudCareerImpact);

      const horse = horseMap.get(typedIntent.horseId);
      if (horse && isPlayerOwned(horse) && isTopHorse(horse)) {
        const hofEligible = isHallOfFameEligible(horse);
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "retirement",
            priority: hofEligible ? "action" : "info",
            title: `${horse.name} Retired to Stud`,
            body: buildRetirementBody(horse, "stud", typedIntent.standingFee),
            cta: {
              label: "View Horse",
              route: "stable.$horseId",
              params: { horseId: horse.id },
            },
          },
        } as InboxImpact);
      }
      return true;
    }

    case "scout": {
      const typedIntent = intent as ScoutIntent;
      const horse = horseMap.get(typedIntent.horseId);
      const stable = stableMap.get(typedIntent.stableId);

      if (horse && stable) {
        const resolvedHorse = ensurePhenotypeResolved(horse);
        const scoutRng = createRng(hashStr(`scout_${typedIntent.horseId}_${newDay}`));
        const result = scoutHorse(resolvedHorse, stable, newDay, state.cash, scoutRng);

        if (result.success && result.report) {
          impacts.push({
            id: generateUUID(dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "scout_report",
            report: result.report,
            reason: result.message,
          } as ScoutReportImpact);

          impacts.push({
            id: generateUUID(dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "cash_change",
            entityId: "player",
            amount: -result.cost,
            reason: "Scouting cost",
          } as CashImpact);
        }
      }
      return true;
    }

    default:
      return false;
  }
}
