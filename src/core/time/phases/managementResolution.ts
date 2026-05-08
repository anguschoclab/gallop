// Management Resolution Phase
// Processes player intents for infrastructure, jockeys, and horse management

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
  StudRetirementIntent
} from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts";
import { generateUUID } from "@/game/uuid";

/**
 * Management Resolution Phase (Order 10)
 * Resolves various management intents into impacts.
 */
export const managementResolutionPhase: PipelinePhase = {
  name: "managementResolution",
  order: 10,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    for (const intent of intents) {
      switch (intent.type) {
        case "jockey_contract": {
          const typedIntent = intent as JockeyContractIntent;
          impacts.push({
            id: generateUUID(),
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
              id: generateUUID(),
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
            id: generateUUID(),
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
            id: generateUUID(),
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
              id: generateUUID(),
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
            id: generateUUID(),
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
            id: generateUUID(),
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

        case "rename": {
          const typedIntent = intent as RenameIntent;
          impacts.push({
            id: generateUUID(),
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
            id: generateUUID(),
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
            id: generateUUID(),
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
