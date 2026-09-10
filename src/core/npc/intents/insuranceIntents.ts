/**
 * npc/intents/insuranceIntents.ts - NPC insurance intent generation
 *
 * Enables NPC stables (especially conservative, analytical, and wealthy stables)
 * to purchase insurance policies for high-value horses and lodge insurance claims
 * when an insured horse suffers injuries.
 */

import type { InsurancePurchaseIntent, InsuranceClaimIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type { StableAIState } from "@/core/ai/npcCycleAI";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import { calculateDailyPremium, type InsurancePolicyType } from "@/core/insurance/insuranceTypes";
import { getCareerStats } from "@/core/horse/stats";

function safeHorseValue(horse: Horse): number {
  if (horse.stats) {
    try {
      const val = calculateBaseHorseValue(horse, "mid");
      if (!isNaN(val) && val > 0) return val;
    } catch {
      // fallback
    }
  }
  return 50000;
}

export function generateNpcInsuranceIntents(
  _state: GameState,
  stable: Stable,
  _stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
): (InsurancePurchaseIntent | InsuranceClaimIntent)[] {
  const intents: (InsurancePurchaseIntent | InsuranceClaimIntent)[] = [];

  // Minimum cash reserve required before an NPC stable buys insurance
  const MIN_CASH_FOR_INSURANCE = 30000;
  const isWealthy = stable.cash >= MIN_CASH_FOR_INSURANCE;
  const isRiskAverse =
    stable.personality === "developer" ||
    stable.personality === "prestige" ||
    stable.personality === "breeder" ||
    (stable.personality as string) === "conservative";

  for (const horse of ownedHorses) {
    // 1. Process claims for currently insured horses that are injured
    if (horse.insurancePolicy && horse.insurancePolicy.type !== "none") {
      const isInjured = horse.healthStatus !== "healthy";

      if (isInjured) {
        const horseValue = safeHorseValue(horse);
        const payout = Math.round(horseValue * (horse.insurancePolicy.coveragePercent || 0.5));
        intents.push({
          id: generateUUID(),
          entityId: horse.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 80,
          type: "insurance_claim",
          horseId: horse.id,
          payout,
        });
        continue;
      }
    }

    // 2. Process insurance purchases for high-value uninsured horses
    if (!horse.insurancePolicy && isWealthy && isRiskAverse) {
      const careerStats = getCareerStats(horse);
      const isGraded = careerStats.gradedWins > 0 || careerStats.gradedStarts > 0;
      const rating = horse.stats?.speed ?? 0;
      const isValuable = isGraded || rating >= 75 || (horse.racingViable !== false && (horse.lifetimeEarnings ?? 0) > 30000);

      if (isValuable) {
        const policyType: InsurancePolicyType =
          stable.personality === "developer" || (stable.personality as string) === "conservative"
            ? "comprehensive"
            : "injury_only";
        const horseValue = safeHorseValue(horse);
        const dailyPremium = calculateDailyPremium(policyType, horseValue);

        // Ensure stable has at least 90 days of premium coverage
        if (stable.cash >= dailyPremium * 90) {
          intents.push({
            id: generateUUID(),
            entityId: horse.id,
            source: "npc",
            sourceId: stable.id,
            day,
            priority: 40,
            type: "insurance_purchase",
            horseId: horse.id,
            policyType,
          });
        }
      }
    }
  }

  return intents;
}
