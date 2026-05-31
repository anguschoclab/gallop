/**
 * intents.ts - Intent type definitions
 *
 * This file provides intent type definitions for the impact resolver system.
 * All player and NPC actions generate intents instead of mutating state directly.
 *
 * Dependencies: @/game/types (Horse, Race, Jockey)
 * Related files: resolver.ts (uses intents), handlers/ (handle intents), validators/ (validate intents)
 */

// Intent type definitions for the impact resolver system
// All player and NPC actions generate intents instead of mutating state directly

import type { Horse, Race, Jockey } from "@/game/types";

// Base intent type
export interface Intent {
  id: string;
  entityId: string; // horseId, stableId, raceId, etc.
  source: "player" | "npc" | "system";
  sourceId?: string; // stableId for NPC intents
  day: number;
  priority: number; // Higher priority resolved first (player > NPC)
}

// Training intent
export interface TrainingIntent extends Intent {
  type: "training";
  horseId: string;
  trainingType:
    | "speed"
    | "stamina"
    | "acceleration"
    | "rest"
    | "bullet"
    | "breeze"
    | "gate_work"
    | "swimming"
    | "gallop";
}

// Race entry intent
export interface RaceEntryIntent extends Intent {
  type: "race_entry";
  raceId: string;
  horseId: string;
  jockeyId?: string;
  tactics?: "lead" | "rail" | "outside" | "save" | "late_kick" | "default";
  bumpEntryHorseId?: string; // horseId to evict if race is full
}

// Race withdrawal intent
export interface RaceWithdrawalIntent extends Intent {
  type: "race_withdrawal";
  raceId: string;
  horseId: string;
}

// Breeding intent
export interface BreedingIntent extends Intent {
  type: "breeding";
  sireId: string;
  damId: string;
  liveFoalGuarantee: boolean;
  fee?: number;
}

// Stud retirement intent
export interface StudRetirementIntent extends Intent {
  type: "stud_retirement";
  horseId: string;
  standingFee: number;
  bookSize: number;
}

// Purchase intent (market)
export interface PurchaseIntent extends Intent {
  type: "purchase";
  horseId: string;
  price: number;
}

// Jockey contract intent
export interface JockeyContractIntent extends Intent {
  type: "jockey_contract";
  jockeyId: string;
  stableId?: string;
  contractUntil?: number;
  bonus?: number;
}

// Jockey assignment intent
export interface JockeyAssignmentIntent extends Intent {
  type: "jockey_assignment";
  raceId: string;
  horseId: string;
  jockeyId: string;
}

// Scout intent
export interface ScoutIntent extends Intent {
  type: "scout";
  horseId: string;
  stableId: string;
}

// Consignment intent
export interface ConsignmentIntent extends Intent {
  type: "consignment";
  horseId: string;
  saleId: string;
  reservePrice: number;
}

// Consignment withdrawal intent
export interface ConsignmentWithdrawalIntent extends Intent {
  type: "consignment_withdrawal";
  horseId: string;
  saleId: string;
}

// Gelding intent
export interface GeldingIntent extends Intent {
  type: "gelding";
  horseId: string;
}

export interface RerollSilkIntent extends Intent {
  type: "reroll_silk";
  jockeyId: string;
  cost: number;
}

// Rename intent
export interface RenameIntent extends Intent {
  type: "rename";
  horseId: string;
  newName: string;
}

// Campaign slot intent
export interface CampaignSlotIntent extends Intent {
  type: "campaign_slot";
  horseId: string;
  slotIndex: number;
  slot: Partial<{
    dayTarget: number;
    dayWindow: number;
    raceId: string;
    raceKey: string;
    role: "target" | "prep" | "comeback";
    constraintDistance?: number;
    constraintSurface?: "Turf" | "Dirt" | "Synthetic";
    constraintGradeMin?: "G1" | "G2" | "G3" | "Stakes" | "Allowance";
    notes?: string;
    status: "planned" | "entered" | "completed" | "skipped" | "cancelled";
  }>;
}

// Campaign flag dismissal intent
export interface CampaignFlagDismissalIntent extends Intent {
  type: "campaign_flag_dismissal";
  horseId: string;
  flagIndex: number;
}

// Campaign creation intent
export interface CampaignCreationIntent extends Intent {
  type: "campaign_creation";
  horseId: string;
  goalType:
    | "chase_g1"
    | "chase_g2"
    | "chase_g3"
    | "maximize_earnings"
    | "develop_maiden"
    | "free_run";
  targetRaceKey?: string;
}

// Campaign deletion intent
export interface CampaignDeletionIntent extends Intent {
  type: "campaign_deletion";
  horseId: string;
}

// Auto-manage toggle intent
export interface AutoManageToggleIntent extends Intent {
  type: "auto_manage_toggle";
  horseId: string;
  autoManaged: boolean;
}

// Upkeep intent (system-generated)
export interface UpkeepIntent extends Intent {
  type: "upkeep";
  stableId?: string; // undefined for player
  horseCount: number;
  cost: number;
}

// Aging intent (system-generated)
export interface AgingIntent extends Intent {
  type: "aging";
  horseId: string;
  previousAge: number;
  newAge: number;
}

// Energy intent (system-generated)
export interface EnergyIntent extends Intent {
  type: "energy";
  horseId: string;
  delta: number;
  reason: "daily_regen" | "training" | "racing" | "breeding";
}

// Pregnancy check intent (system-generated)
export interface PregnancyCheckIntent extends Intent {
  type: "pregnancy_check";
  pregnancyId: string;
  stage: "early" | "mid" | "late";
}

// Pregnancy resolution intent (system-generated)
export interface PregnancyResolutionIntent extends Intent {
  type: "pregnancy_resolution";
  pregnancyId: string;
  success: boolean;
  foalId?: string;
}

// Race resolution intent (system-generated)
export interface RaceResolutionIntent extends Intent {
  type: "race_resolution";
  raceId: string;
  results: { horseId: string; position: number; time: number }[];
}

// Claiming intent (system-generated during race resolution)
export interface ClaimingIntent extends Intent {
  type: "claiming";
  raceId: string;
  horseId: string;
  claimantStableId?: string; // undefined for player
  claimingPrice: number;
}

// Withdraw from claiming intent (for optional claiming races)
export interface WithdrawFromClaimingIntent extends Intent {
  type: "withdraw_from_claiming";
  raceId: string;
  horseId: string;
}

// Tactics intent
export interface TacticsIntent extends Intent {
  type: "tactics";
  raceId: string;
  horseId: string;
  tactics: "lead" | "rail" | "outside" | "save" | "late_kick" | "default";
}

// Staff intent
export interface StaffIntent extends Intent {
  type: "staff";
  action: "hire" | "fire";
  staffId: string;
  role: import("@/core/staff/staffTypes").StaffRole;
  tier: import("@/core/staff/staffTypes").StaffTier;
  salary: number;
  stableId: string;
}

// Facility upgrade intent
export interface FacilityUpgradeIntent extends Intent {
  type: "facility_upgrade";
  facilityId: string;
  nextLevel: number;
  cost: number;
}

// Pasture retirement intent
export interface PastureRetirementIntent extends Intent {
  type: "pasture_retirement";
  horseId: string;
}

// Update stud fee intent
export interface UpdateStudFeeIntent extends Intent {
  type: "update_stud_fee";
  horseId: string;
  newFee: number;
}

// Syndicate creation intent
export interface SyndicateCreationIntent extends Intent {
  type: "syndicate_creation";
  stallionId: string;
  totalShares: number;
  sharePrice: number;
  initialShareholders: Record<string, number>; // stableId -> share count
}

// Share purchase intent
export interface SharePurchaseIntent extends Intent {
  type: "share_purchase";
  syndicateId: string;
  buyerStableId?: string; // undefined for player
  shares: number;
  pricePerShare: number;
}

// Share sale intent
export interface ShareSaleIntent extends Intent {
  type: "share_sale";
  syndicateId: string;
  sellerStableId?: string; // undefined for player
  shares: number;
  pricePerShare: number;
}

// Syndicate fee distribution intent
export interface SyndicateFeeDistributionIntent extends Intent {
  type: "syndicate_fee_distribution";
  syndicateId: string;
  totalFee: number;
  breedingDay: number;
}

// Union type for all intents
export type AnyIntent =
  | TrainingIntent
  | RaceEntryIntent
  | RaceWithdrawalIntent
  | BreedingIntent
  | StudRetirementIntent
  | PurchaseIntent
  | JockeyContractIntent
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
  | StaffIntent
  | FacilityUpgradeIntent
  | PastureRetirementIntent
  | UpdateStudFeeIntent
  | SyndicateCreationIntent
  | SharePurchaseIntent
  | ShareSaleIntent
  | SyndicateFeeDistributionIntent;
