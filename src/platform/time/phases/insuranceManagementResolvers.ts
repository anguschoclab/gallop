/**
 * insuranceManagementResolvers.ts - Insurance and syndication management intent resolution
 *
 * Extracted from managementResolutionHelpers.ts for modularity.
 */

import type { PipelineContext } from "@/platform/time/pipeline";
import type {
  AnyIntent,
  InsuranceCancelIntent,
  InsuranceClaimIntent,
  InsurancePurchaseIntent,
} from "@/platform/resolver/intents";
import type {
  AnyImpact,
  CashImpact,
  InsuranceCancelImpact,
  InsurancePayoutImpact,
  InsurancePurchaseImpact,
} from "@/platform/resolver/impacts";
import { generateUUID } from "@/shared/uuid/uuid";
import { calculateBaseHorseValue } from "@/domains/horse/simulation/pricing";
import { calculateDailyPremium, INSURANCE_CONFIG } from "@/domains/insurance/model/insuranceTypes";
import { resolveSyndicationIntent } from "@/platform/resolver/resolvers/syndicateResolver";

export function resolveInsuranceIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  const { state, newDay, horseMap, dailyRng } = context;

  switch (intent.type) {
    case "insurance_purchase": {
      const typedIntent = intent as InsurancePurchaseIntent;
      const horse = horseMap.get(typedIntent.horseId);
      if (!horse) return true;

      const horseValue = calculateBaseHorseValue(horse, "mid");
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "insurance_purchase",
        horseId: typedIntent.horseId,
        policy: {
          type: typedIntent.policyType,
          premiumPerDay: calculateDailyPremium(typedIntent.policyType, horseValue),
          coveragePercent: INSURANCE_CONFIG.COVERAGE[typedIntent.policyType],
          activeSinceDay: newDay,
        },
        reason: `Purchased ${typedIntent.policyType} insurance for ${horse.name}`,
      } as InsurancePurchaseImpact);
      return true;
    }

    case "insurance_cancel": {
      const typedIntent = intent as InsuranceCancelIntent;
      if (!horseMap.has(typedIntent.horseId)) return true;
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: intent.id,
        day: newDay,
        phase: "managementResolution",
        logLevel: "always",
        type: "insurance_cancel",
        horseId: typedIntent.horseId,
        reason: "Insurance policy cancelled",
      } as InsuranceCancelImpact);
      return true;
    }

    case "insurance_claim": {
      const typedIntent = intent as InsuranceClaimIntent;
      const horse = horseMap.get(typedIntent.horseId);
      if (horse && horse.insurancePolicy && horse.insurancePolicy.type !== "none") {
        const entityId = horse.ownership?.type === "npc" ? horse.ownership.stableId : "player";
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
          entityId,
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

export function applyInsurancePremiums(context: PipelineContext, impacts: AnyImpact[]): void {
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
