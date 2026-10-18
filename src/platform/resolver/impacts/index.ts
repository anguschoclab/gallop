/**
 * impacts/index.ts - Impact types
 *
 * This file exports all impact types for the resolver system.
 * Impacts represent state changes resulting from resolved intents.
 *
 * Dependencies: @/platform/resolver/impacts/financialImpacts, ./horseImpacts, ./raceImpacts, ./jockeyImpacts, ./breedingImpacts, ./campaignImpacts, ./miscImpacts, ./base
 * Related files: ../intents.ts (generates impacts), ../resolver.ts (applies impacts)
 */

import type { FinancialImpact } from "./financialImpacts";
import type { HorseImpact } from "@/platform/resolver/impacts/horseImpacts";
import type { RaceImpact } from "@/platform/resolver/impacts/raceImpacts";
import type { JockeyImpact } from "@/platform/resolver/impacts/jockeyImpacts";
import type { BreedingImpact } from "@/platform/resolver/impacts/breedingImpacts";
import type { CampaignImpact } from "@/platform/resolver/impacts/campaignImpacts";
import type { MiscImpact } from "@/platform/resolver/impacts/miscImpacts";
import type { InboxImpact } from "@/platform/resolver/impacts/inboxImpacts";

export * from "@/platform/resolver/impacts/base";
export * from "@/platform/resolver/impacts/financialImpacts";
export * from "@/platform/resolver/impacts/horseImpacts";
export * from "@/platform/resolver/impacts/raceImpacts";
export * from "@/platform/resolver/impacts/jockeyImpacts";
export * from "@/platform/resolver/impacts/breedingImpacts";
export * from "@/platform/resolver/impacts/campaignImpacts";
export * from "@/platform/resolver/impacts/miscImpacts";
export * from "@/platform/resolver/impacts/inboxImpacts";

export type AnyImpact =
  | FinancialImpact
  | HorseImpact
  | RaceImpact
  | JockeyImpact
  | BreedingImpact
  | CampaignImpact
  | MiscImpact
  | InboxImpact;

// Re-export new insurance and stewards impact types for convenience
export type {
  InsurancePurchaseImpact,
  InsuranceCancelImpact,
  InsurancePayoutImpact,
  StewardsInquiryImpact,
  StewardsResolutionImpact,
  RaceResultAdjustmentImpact,
} from "@/platform/resolver/impacts/raceImpacts";
