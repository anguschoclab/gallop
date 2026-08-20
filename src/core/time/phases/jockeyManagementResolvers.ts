/**
 * jockeyManagementResolvers.ts - Jockey-related management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "../pipeline";
import type {
  AnyIntent,
  JockeyContractIntent,
  JockeyAssignmentIntent,
  JockeyReleaseIntent,
  RerollSilkIntent,
} from "@/core/resolver/intents";
import type {
  AnyImpact,
  CashImpact,
  JockeyContractImpact,
  JockeyAssignmentImpact,
  JockeySilkImpact,
  LogImpact,
} from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { generateSilk } from "@/core/jockey/generator";

export function resolveJockeyIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { newDay, dailyRng } = context;

  switch (intent.type) {
    case "jockey_contract": {
      const typedIntent = intent as JockeyContractIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "jockey_contract",
        jockeyId: typedIntent.jockeyId,
        stableId: typedIntent.stableId,
        contractUntil: typedIntent.contractUntil,
        reason: "Contract signed",
      } as JockeyContractImpact);

      if (typedIntent.bonus && typedIntent.bonus > 0) {
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: "player",
          amount: -typedIntent.bonus,
          reason: "Jockey sign-on bonus",
        } as CashImpact);
      }
      return true;
    }

    case "jockey_assignment": {
      const typedIntent = intent as JockeyAssignmentIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "jockey_assignment",
        raceId: typedIntent.raceId,
        horseId: typedIntent.horseId,
        jockeyId: typedIntent.jockeyId,
        reason: "Jockey assigned",
      } as JockeyAssignmentImpact);
      return true;
    }

    case "jockey_release": {
      const typedIntent = intent as JockeyReleaseIntent;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "log",
        text: `Jockey ${typedIntent.jockeyId} released from contract`,
        reason: "Jockey released",
      } as LogImpact);
      return true;
    }

    case "reroll_silk": {
      const typedIntent = intent as RerollSilkIntent;
      const newSilk = generateSilk(dailyRng);

      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "log",
        text: `Rerolled silk for jockey ${typedIntent.jockeyId}.`,
        reason: "Silk reroll",
      } as LogImpact);

      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "cash_change",
        entityId: "player",
        amount: -typedIntent.cost,
        reason: "Silk reroll cost",
      } as CashImpact);

      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "jockey_silk",
        jockeyId: typedIntent.jockeyId,
        silk: newSilk,
        reason: "Silk rerolled",
      } as JockeySilkImpact);
      return true;
    }

    default:
      return false;
  }
}
