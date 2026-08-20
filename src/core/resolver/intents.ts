/**
 * intents.ts - Re-exports for intent type definitions
 *
 * This file re-exports core, campaign, and system intent types from
 * dedicated modules for backward compatibility.
 */

export {
  type Intent,
  type TrainingIntent,
  type RaceEntryIntent,
  type RaceWithdrawalIntent,
  type BreedingIntent,
  type StudRetirementIntent,
  type PurchaseIntent,
  type JockeyContractIntent,
  type JockeyReleaseIntent,
  type JockeyAssignmentIntent,
  type ScoutIntent,
  type ConsignmentIntent,
  type ConsignmentWithdrawalIntent,
  type GeldingIntent,
  type RerollSilkIntent,
  type RenameIntent,
  type TacticsIntent,
} from "./intentTypes";

export {
  type CampaignSlotIntent,
  type CampaignFlagDismissalIntent,
  type CampaignCreationIntent,
  type CampaignDeletionIntent,
  type AutoManageToggleIntent,
} from "./campaignIntents";

export {
  type UpkeepIntent,
  type AgingIntent,
  type EnergyIntent,
  type PregnancyCheckIntent,
  type PregnancyResolutionIntent,
  type RaceResolutionIntent,
  type ClaimingIntent,
  type WithdrawFromClaimingIntent,
  type TransportIntent,
  type StaffIntent,
  type FacilityUpgradeIntent,
  type OutpostActionIntent,
  type PastureRetirementIntent,
  type UpdateStudFeeIntent,
  type SyndicateCreationIntent,
  type SharePurchaseIntent,
  type ShareSaleIntent,
  type SyndicateFeeDistributionIntent,
  type InsurancePurchaseIntent,
  type InsuranceCancelIntent,
  type InsuranceClaimIntent,
  type StewardsInquiryIntent,
  type DiplomaticActionIntent,
  type CartelActionIntent,
} from "./systemIntents";

import type {
  TrainingIntent,
  RaceEntryIntent,
  RaceWithdrawalIntent,
  BreedingIntent,
  StudRetirementIntent,
  PurchaseIntent,
  JockeyContractIntent,
  JockeyReleaseIntent,
  JockeyAssignmentIntent,
  ScoutIntent,
  ConsignmentIntent,
  ConsignmentWithdrawalIntent,
  GeldingIntent,
  RerollSilkIntent,
  RenameIntent,
  TacticsIntent,
} from "./intentTypes";
import type {
  CampaignSlotIntent,
  CampaignFlagDismissalIntent,
  CampaignCreationIntent,
  CampaignDeletionIntent,
  AutoManageToggleIntent,
} from "./campaignIntents";
import type {
  UpkeepIntent,
  AgingIntent,
  EnergyIntent,
  PregnancyCheckIntent,
  PregnancyResolutionIntent,
  RaceResolutionIntent,
  ClaimingIntent,
  WithdrawFromClaimingIntent,
  TransportIntent,
  StaffIntent,
  FacilityUpgradeIntent,
  OutpostActionIntent,
  PastureRetirementIntent,
  UpdateStudFeeIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  SyndicateFeeDistributionIntent,
  InsurancePurchaseIntent,
  InsuranceCancelIntent,
  InsuranceClaimIntent,
  StewardsInquiryIntent,
  DiplomaticActionIntent,
  CartelActionIntent,
} from "./systemIntents";

export type AnyIntent =
  | TrainingIntent
  | RaceEntryIntent
  | RaceWithdrawalIntent
  | BreedingIntent
  | StudRetirementIntent
  | PurchaseIntent
  | JockeyContractIntent
  | JockeyReleaseIntent
  | JockeyAssignmentIntent
  | ScoutIntent
  | ConsignmentIntent
  | ConsignmentWithdrawalIntent
  | GeldingIntent
  | RerollSilkIntent
  | RenameIntent
  | CampaignSlotIntent
  | CampaignFlagDismissalIntent
  | CampaignCreationIntent
  | CampaignDeletionIntent
  | AutoManageToggleIntent
  | UpkeepIntent
  | AgingIntent
  | EnergyIntent
  | PregnancyCheckIntent
  | PregnancyResolutionIntent
  | RaceResolutionIntent
  | ClaimingIntent
  | WithdrawFromClaimingIntent
  | TacticsIntent
  | TransportIntent
  | StaffIntent
  | FacilityUpgradeIntent
  | OutpostActionIntent
  | PastureRetirementIntent
  | UpdateStudFeeIntent
  | SyndicateCreationIntent
  | SharePurchaseIntent
  | ShareSaleIntent
  | SyndicateFeeDistributionIntent
  | InsurancePurchaseIntent
  | InsuranceCancelIntent
  | InsuranceClaimIntent
  | StewardsInquiryIntent
  | DiplomaticActionIntent
  | CartelActionIntent;
