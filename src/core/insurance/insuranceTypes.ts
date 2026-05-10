/**
 * insuranceTypes.ts - Insurance policy and claim definitions
 */

export type InsurancePolicyType = "none" | "injury_only" | "mortality_only" | "comprehensive";

export interface InsurancePolicy {
  type: InsurancePolicyType;
  premiumPerDay: number;
  coveragePercent: number; // 0.0 to 1.0
  activeSinceDay: number;
}

export const INSURANCE_CONFIG = {
  PREMIUMS: {
    none: 0,
    injury_only: 25,
    mortality_only: 50,
    comprehensive: 100,
  },
  COVERAGE: {
    none: 0,
    injury_only: 0.5,
    mortality_only: 0.5,
    comprehensive: 0.75,
  },
};

/**
 * Calculate the daily premium for a horse.
 * base_premium + (valuation * risk_premium)
 * @param policyType
 * @param horseValue
 */
export function calculateDailyPremium(policyType: InsurancePolicyType, horseValue: number): number {
  if (policyType === "none") return 0;
  const base = INSURANCE_CONFIG.PREMIUMS[policyType];
  const risk = (horseValue / 10000) * (policyType === "comprehensive" ? 5 : 2);
  return Math.round(base + risk);
}
