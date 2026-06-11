/**
 * store/slices/insuranceSlice.ts - Insurance state slice
 *
 * This file provides insurance-related state and actions for purchasing,
 * canceling, and filing claims on insurance policies.
 *
 * Dependencies: @/core/insurance/insuranceTypes (InsurancePolicy, InsurancePolicyType, calculateDailyPremium), @/lib/formatting (formatCurrency), @/game/uuid (generateUUID), ../types (ActionResult, SliceCreator)
 * Related files: store/index.ts (uses this slice), @/core/insurance/insuranceTypes.ts (policy types)
 */

import type { InsurancePolicy, InsurancePolicyType } from "@/core/insurance/insuranceTypes";
import { calculateDailyPremium } from "@/core/insurance/insuranceTypes";
import { generateUUID } from "@/core/uuid";
import type { ActionResult, SliceCreator } from "../types";
import { requireOwned, requireHorse } from "../guards";

export type InsuranceSlice = {
  fileClaim: (horseId: string) => ActionResult;
  expirePolicies: (day: number) => void;
};

export const createInsuranceSlice: SliceCreator<InsuranceSlice> = (set, get) => ({
  fileClaim: (horseId: string) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;

    if (!horse!.insurancePolicy || horse!.insurancePolicy.type === "none") {
      return { ok: false, reason: "Horse has no active insurance policy." };
    }

    // Check if horse has an active injury
    if (horse!.healthStatus === "healthy") {
      return { ok: false, reason: "Horse is not injured. Claims can only be filed for injuries." };
    }

    // Calculate payout based on horse value and coverage
    const horseValue = horse!.lifetimeEarnings * 2 || 10000; // Simple valuation
    const coveragePercent = horse!.insurancePolicy.coveragePercent;
    const payout = Math.round(horseValue * coveragePercent);

    if (s.cash < payout) {
      // Payout would exceed cash, but insurance payouts are typically external
      // For now, we'll just add it to cash
    }

    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "insurance_claim",
      horseId,
      payout,
    } as any);

    return { ok: true };
  },

  expirePolicies: (day: number) => {
    // This is called during day advancement to check for expired policies
    // For now, policies don't expire - they're active until canceled
    // Future enhancement: add expiration days to InsurancePolicy type
  },
});
