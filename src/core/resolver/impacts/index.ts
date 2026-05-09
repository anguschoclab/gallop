import type { FinancialImpact } from "./financialImpacts";
import type { HorseImpact } from "./horseImpacts";
import type { RaceImpact } from "./raceImpacts";
import type { JockeyImpact } from "./jockeyImpacts";
import type { BreedingImpact } from "./breedingImpacts";
import type { CampaignImpact } from "./campaignImpacts";
import type { MiscImpact } from "./miscImpacts";

export * from "./base";
export * from "./financialImpacts";
export * from "./horseImpacts";
export * from "./raceImpacts";
export * from "./jockeyImpacts";
export * from "./breedingImpacts";
export * from "./campaignImpacts";
export * from "./miscImpacts";

export type AnyImpact =
  | FinancialImpact
  | HorseImpact
  | RaceImpact
  | JockeyImpact
  | BreedingImpact
  | CampaignImpact
  | MiscImpact;
