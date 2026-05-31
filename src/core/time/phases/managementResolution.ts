/**
 * phases/managementResolution.ts - Management resolution phase
 *
 * This file provides the management resolution phase that processes player intents
 * for infrastructure, jockeys, and horse management.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, JockeyContractIntent, JockeyAssignmentIntent, FacilityUpgradeIntent, UpdateStudFeeIntent, GeldingIntent, RenameIntent, TacticsIntent, StudRetirementIntent), @/core/resolver/impacts/index (AnyImpact), @/game/uuid (generateUUID), @/game/rng (createRng, hashStr), @/game/scouting (scoutHorse)
 * Related files: ../pipeline.ts (uses phase)
 */

// Management Resolution Phase
// Processes player intents for infrastructure, jockeys, and horse management

import { PHASE_ORDER_MANAGEMENT_RESOLUTION } from "@/game/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type {
  AnyIntent,
  JockeyContractIntent,
  JockeyAssignmentIntent,
  FacilityUpgradeIntent,
  UpdateStudFeeIntent,
  GeldingIntent,
  RenameIntent,
  TacticsIntent,
  StudRetirementIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  RerollSilkIntent,
  ScoutIntent,
  CampaignSlotIntent,
  CampaignFlagDismissalIntent,
  CampaignCreationIntent,
  CampaignDeletionIntent,
} from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { createRng, hashStr } from "@/game/rng";
import { scoutHorse } from "@/game/scouting";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { resolveSyndicationIntent } from "@/core/resolver/resolvers/syndicateResolver";
import {
  isTopHorse,
  isHallOfFameEligible,
  buildRetirementBody,
} from "@/core/inbox/retirementMessages";

/**
 * Management Resolution Phase (Order 10)
 * Resolves various management intents into impacts.
 */
export const managementResolutionPhase: PipelinePhase = {
  name: "managementResolution",
  order: PHASE_ORDER_MANAGEMENT_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    for (const intent of intents) {
      switch (intent.type) {
        case "jockey_contract": {
          const typedIntent = intent as JockeyContractIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "jockey_contract",
            jockeyId: typedIntent.jockeyId,
            stableId: typedIntent.stableId,
            contractUntil: typedIntent.contractUntil,
            reason: "Contract signed",
          } as any);

          if (typedIntent.bonus && typedIntent.bonus > 0) {
            impacts.push({
              id: generateUUID(context.dailyRng),
              intentId: intent.id,
              day: newDay,
              phase: "managementResolution",
              logLevel: "always",
              type: "cash_change",
              entityId: "player",
              amount: -typedIntent.bonus,
              reason: "Jockey sign-on bonus",
            } as any);
          }
          break;
        }

        case "jockey_assignment": {
          const typedIntent = intent as JockeyAssignmentIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "jockey_assignment",
            raceId: typedIntent.raceId,
            horseId: typedIntent.horseId,
            jockeyId: typedIntent.jockeyId,
            reason: "Jockey assigned",
          } as any);
          break;
        }

        case "facility_upgrade": {
          const typedIntent = intent as FacilityUpgradeIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "facility_upgrade",
            facilityId: typedIntent.facilityId,
            nextLevel: typedIntent.nextLevel,
            cost: typedIntent.cost,
            reason: "Facility upgrade started",
          } as any);

          if (typedIntent.cost && typedIntent.cost > 0) {
            impacts.push({
              id: generateUUID(context.dailyRng),
              intentId: intent.id,
              day: newDay,
              phase: "managementResolution",
              logLevel: "always",
              type: "cash_change",
              entityId: "player",
              amount: -typedIntent.cost,
              reason: `Upgrade ${typedIntent.facilityId}`,
            } as any);
          }
          break;
        }

        case "update_stud_fee": {
          const typedIntent = intent as UpdateStudFeeIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "update_stud_fee",
            horseId: typedIntent.horseId,
            newFee: typedIntent.newFee,
            reason: "Stud fee updated",
          } as any);
          break;
        }

        case "gelding": {
          const typedIntent = intent as GeldingIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "gelding",
            horseId: typedIntent.horseId,
            reason: "Gelded",
          } as any);
          break;
        }

        case "reroll_silk": {
          const typedIntent = intent as RerollSilkIntent;
          const newSilk = `#${Math.floor(context.dailyRng.next() * 16777215)
            .toString(16)
            .padStart(6, "0")}`;

          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "log",
            text: `Rerolled silk for jockey ${typedIntent.jockeyId}.`,
            reason: "Silk reroll",
          } as any);

          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "cash_change",
            entityId: "player",
            amount: -typedIntent.cost,
            reason: "Silk reroll cost",
          } as any);

          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "jockey_silk",
            jockeyId: typedIntent.jockeyId,
            silk: newSilk,
            reason: "Silk rerolled",
          } as any);
          break;
        }

        case "rename": {
          const typedIntent = intent as RenameIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "rename",
            horseId: typedIntent.horseId,
            newName: typedIntent.newName,
            reason: "Renamed",
          } as any);
          break;
        }

        case "tactics": {
          const typedIntent = intent as TacticsIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "tactics",
            raceId: typedIntent.raceId,
            horseId: typedIntent.horseId,
            tactics: typedIntent.tactics,
            reason: "Tactics updated",
          } as any);
          break;
        }

        case "stud_retirement": {
          const typedIntent = intent as StudRetirementIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
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
          } as any);

          const horse = state.horses.find((h) => h.id === typedIntent.horseId);
          if (horse && !horse.stableId && isTopHorse(horse)) {
            const hofEligible = isHallOfFameEligible(horse);
            impacts.push({
              id: generateUUID(context.dailyRng),
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
            } as any);
          }
          break;
        }

        case "scout": {
          const typedIntent = intent as ScoutIntent;
          const horse = state.horses.find((h) => h.id === typedIntent.horseId);
          const stable = state.npcStables.find((s) => s.id === typedIntent.stableId);

          if (horse && stable) {
            const resolvedHorse = ensurePhenotypeResolved(horse);
            const scoutRng = createRng(hashStr(`scout_${typedIntent.horseId}_${newDay}`));
            const result = scoutHorse(resolvedHorse, stable, newDay, state.cash, scoutRng);

            if (result.success && result.report) {
              impacts.push({
                id: generateUUID(context.dailyRng),
                intentId: intent.id,
                day: newDay,
                phase: "managementResolution",
                logLevel: "always",
                type: "scout_report",
                report: result.report,
                reason: result.message,
              } as any);

              impacts.push({
                id: generateUUID(context.dailyRng),
                intentId: intent.id,
                day: newDay,
                phase: "managementResolution",
                logLevel: "always",
                type: "cash_change",
                entityId: "player",
                amount: -result.cost,
                reason: "Scouting cost",
              } as any);
            }
          }
          break;
        }

        case "campaign_slot": {
          const typedIntent = intent as CampaignSlotIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "campaign_slot",
            horseId: typedIntent.horseId,
            slotIndex: typedIntent.slotIndex,
            slot: typedIntent.slot,
            reason: "Campaign slot updated",
          } as any);
          break;
        }

        case "campaign_flag_dismissal": {
          const typedIntent = intent as CampaignFlagDismissalIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "campaign_flag_dismissal",
            horseId: typedIntent.horseId,
            flagIndex: typedIntent.flagIndex,
            reason: "Campaign flag dismissed",
          } as any);
          break;
        }

        case "campaign_creation": {
          const typedIntent = intent as CampaignCreationIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "campaign_creation",
            horseId: typedIntent.horseId,
            goalType: typedIntent.goalType,
            targetRaceKey: typedIntent.targetRaceKey,
            reason: "Campaign created",
          } as any);
          break;
        }

        case "campaign_deletion": {
          const typedIntent = intent as CampaignDeletionIntent;
          impacts.push({
            id: generateUUID(context.dailyRng),
            intentId: intent.id,
            day: newDay,
            phase: "managementResolution",
            logLevel: "always",
            type: "campaign_deletion",
            horseId: typedIntent.horseId,
            reason: "Campaign deleted",
          } as any);
          break;
        }

        case "syndicate_creation":
        case "share_purchase":
        case "share_sale": {
          const syndicateImpacts = resolveSyndicationIntent(intent, state, newDay);
          impacts.push(...syndicateImpacts);
          break;
        }
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
