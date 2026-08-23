/**
 * insuranceManagementResolvers.ts - Insurance and syndication management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "../pipeline";
import type { AnyIntent, InsuranceClaimIntent } from "@/core/resolver/intents";
import type { AnyImpact, CashImpact, InsurancePayoutImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import { calculateDailyPremium } from "@/core/insurance/insuranceTypes";
import { resolveSyndicationIntent } from "@/core/resolver/resolvers/syndicateResolver";

export function resolveInsuranceIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { state, newDay, horseMap, dailyRng } = context;

  switch (intent.type) {
    case "insurance_claim": {
      const typedIntent = intent as InsuranceClaimIntent;
      const horse = horseMap.get(typedIntent.horseId);
      if (horse && horse.insurancePolicy && horse.insurancePolicy.type !== "none") {
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: intent.id,
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "insurance_payout",
          horseId: typedIntent.horseId,
          amount: typedIntent.payout,
          reason: `Insurance claim payout for ${horse.name}`,
        } as InsurancePayoutImpact);
      }
      return true;
    }

    case "syndicate_creation":
    case "share_purchase":
    case "share_sale": {
      const syndicateImpacts = resolveSyndicationIntent(intent, state, newDay, horseMap);
      impacts.push(...syndicateImpacts);
      return true;
    }

    default:
      return false;
  }
}

export function processInsurancePremiums(context: PipelineContext, impacts: AnyImpact[]): void {
  const { state, newDay, dailyRng } = context;
  for (const horse of Object.values(state.horses)) {
    if (horse.insurancePolicy) {
      const horseValue = calculateBaseHorseValue(horse, "mid");
      const premium = calculateDailyPremium(horse.insurancePolicy.type, horseValue);
      if (premium > 0) {
        impacts.push({
          id: generateUUID(dailyRng),
          day: newDay,
          phase: "managementResolution",
          logLevel: "always",
          type: "cash_change",
          entityId: (horse.ownership?.type === "npc"
            ? horse.ownership.stableId
            : "player") as string,
          amount: -premium,
          reason: `Insurance premium for ${horse.name}`,
        } as CashImpact);
      }
    }
  }
}
