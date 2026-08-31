/**
 * healthInjury.ts - Health, energy, and injury impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { InsurancePayoutImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { generateEnergyImpact } from "./energyFormFame";
import { rollForInjury } from "@/core/health/healthSystem";
import type { InjuryWeatherContext } from "@/core/health/healthSystem";
import { INSURANCE_CONFIG } from "@/core/insurance/insuranceTypes";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Horse } from "@/game/types";

export function generateHealthInjuryImpacts(
  horse: Horse,
  newDay: number,
  hiredStaff: StaffMember[],
  injuryWeatherCtx: InjuryWeatherContext,
  rng?: Rng,
  getId?: () => string,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  // Energy expenditure
  impacts.push(generateEnergyImpact(horse.id, newDay, rng, getId));

  // Health: Roll for potential injuries
  if (rng) {
    const injury = rollForInjury(rng, horse, newDay, hiredStaff, injuryWeatherCtx, getId);
    if (injury) {
      impacts.push(injury);
      // Insurance payout for career-ending injuries
      if (injury.severity === "career-ending" && horse.insurancePolicy) {
        const coveragePercent = INSURANCE_CONFIG.COVERAGE[horse.insurancePolicy.type];
        if (coveragePercent > 0) {
          const horseValue = calculateBaseHorseValue(horse, "mid");
          const payout = Math.round(horseValue * coveragePercent);
          if (payout > 0) {
            impacts.push({
              id: getId ? getId() : generateUUID(rng),
              intentId: "",
              day: newDay,
              phase: "raceResolution",
              logLevel: "always",
              type: "insurance_payout",
              horseId: horse.id,
              amount: payout,
              reason: `Insurance payout for ${horse.name} (${horse.insurancePolicy.type})`,
            } as InsurancePayoutImpact);
          }
        }
      }
    }
  }

  return impacts;
}
