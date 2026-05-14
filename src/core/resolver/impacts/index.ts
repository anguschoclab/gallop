/**
 * impacts/index.ts - Impact types
 *
 * This file exports all impact types for the resolver system.
 * Impacts represent state changes resulting from resolved intents.
 *
 * Dependencies: ./financialImpacts, ./horseImpacts, ./raceImpacts, ./jockeyImpacts, ./breedingImpacts, ./campaignImpacts, ./miscImpacts, ./base
 * Related files: ../intents.ts (generates impacts), ../resolver.ts (applies impacts)
 */

import type { FinancialImpact } from "./financialImpacts";
import type { HorseImpact } from "./horseImpacts";
import type { RaceImpact } from "./raceImpacts";
import type { JockeyImpact } from "./jockeyImpacts";
import type { BreedingImpact } from "./breedingImpacts";
import type { CampaignImpact } from "./campaignImpacts";
import type { MiscImpact } from "./miscImpacts";
import type { InboxImpact } from "./inboxImpacts";

export * from "./base";
export * from "./financialImpacts";
export * from "./horseImpacts";
export * from "./raceImpacts";
export * from "./jockeyImpacts";
export * from "./breedingImpacts";
export * from "./campaignImpacts";
export * from "./miscImpacts";
export * from "./inboxImpacts";

export type AnyImpact =
  | FinancialImpact
  | HorseImpact
  | RaceImpact
  | JockeyImpact
  | BreedingImpact
  | CampaignImpact
  | MiscImpact
  | InboxImpact;
