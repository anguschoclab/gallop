/**
 * systemIntents.ts - System-generated and facility/economic intent definitions
 *
 * Extracted from intents.ts for modularity.
 */

import type { Intent } from "./intentTypes";
import type { FacilityLevel } from "@/core/facilities";
import type { OutpostRegion } from "@/core/facilities/outpostTypes";
import type { InsurancePolicyType } from "@/core/insurance/insuranceTypes";
import type { InquiryType } from "@/core/stewards/stewardTypes";
import type { RunnerFactorLedger } from "@/core/race/factorLedger";

export interface UpkeepIntent extends Intent {
  type: "upkeep";
  stableId?: string;
  horseCount: number;
  cost: number;
}

export interface AgingIntent extends Intent {
  type: "aging";
  horseId: string;
  previousAge: number;
  newAge: number;
}

export interface EnergyIntent extends Intent {
  type: "energy";
  horseId: string;
  delta: number;
  reason: "daily_regen" | "training" | "racing" | "breeding";
}

export interface PregnancyCheckIntent extends Intent {
  type: "pregnancy_check";
  pregnancyId: string;
  stage: "early" | "mid" | "late";
}

export interface PregnancyResolutionIntent extends Intent {
  type: "pregnancy_resolution";
  pregnancyId: string;
  success: boolean;
  foalId?: string;
}

export interface RaceResolutionIntent extends Intent {
  type: "race_resolution";
  raceId: string;
  results: { horseId: string; position: number; time: number }[];
  factorLedgers?: Record<string, RunnerFactorLedger>;
}

export interface ClaimingIntent extends Intent {
  type: "claiming";
  raceId: string;
  horseId: string;
  claimantStableId?: string;
  claimingPrice: number;
}

export interface WithdrawFromClaimingIntent extends Intent {
  type: "withdraw_from_claiming";
  raceId: string;
  horseId: string;
}

export interface TransportIntent extends Intent {
  type: "transport";
  transportId: string;
  cost: number;
}

export interface StaffIntent extends Intent {
  type: "staff";
  action: "hire" | "fire";
  staffId: string;
  role: import("@/core/staff/staffTypes").StaffRole;
  tier: import("@/core/staff/staffTypes").StaffTier;
  salary: number;
  stableId: string;
}

export interface FacilityUpgradeIntent extends Intent {
  type: "facility_upgrade";
  facilityId: string;
  nextLevel: FacilityLevel;
  cost: number;
}

export interface OutpostActionIntent extends Intent {
  type: "outpost_action";
  stableId: string;
  action: "create" | "assign_trainer";
  outpostId: string;
  region?: OutpostRegion;
  name?: string;
  headTrainerId?: string;
  cost: number;
}

export interface PastureRetirementIntent extends Intent {
  type: "pasture_retirement";
  horseId: string;
}

export interface UpdateStudFeeIntent extends Intent {
  type: "update_stud_fee";
  horseId: string;
  newFee: number;
}

export interface SyndicateCreationIntent extends Intent {
  type: "syndicate_creation";
  stallionId: string;
  totalShares: number;
  sharePrice: number;
  initialShareholders: Record<string, number>;
}

export interface SharePurchaseIntent extends Intent {
  type: "share_purchase";
  syndicateId: string;
  buyerStableId?: string;
  shares: number;
  pricePerShare: number;
}

export interface ShareSaleIntent extends Intent {
  type: "share_sale";
  syndicateId: string;
  sellerStableId?: string;
  shares: number;
  pricePerShare: number;
}

export interface SyndicateFeeDistributionIntent extends Intent {
  type: "syndicate_fee_distribution";
  syndicateId: string;
  totalFee: number;
  breedingDay: number;
}

export interface InsurancePurchaseIntent extends Intent {
  type: "insurance_purchase";
  horseId: string;
  policyType: InsurancePolicyType;
}

export interface InsuranceCancelIntent extends Intent {
  type: "insurance_cancel";
  horseId: string;
}

export interface InsuranceClaimIntent extends Intent {
  type: "insurance_claim";
  horseId: string;
  payout: number;
}

export interface StewardsInquiryIntent extends Intent {
  type: "stewards_inquiry";
  raceId: string;
  accusedHorseId: string;
  inquiryType: InquiryType;
  description: string;
  reportingHorseId?: string;
}

export interface DiplomaticActionIntent extends Intent {
  type: "diplomatic_action";
  targetStableId: string;
  action: "propose_alliance" | "break_alliance" | "betray" | "cooperate";
  allianceType?: "breeding_partnership" | "racing_coalition" | "economic_cartel" | "non_aggression";
}

export interface CartelActionIntent extends Intent {
  type: "cartel_action";
  action: "join_cartel" | "leave_cartel" | "coordinate_market";
  cartelId?: string;
  marketAction?: "avoid_bidding_war" | "rotate_claims" | "fix_stud_fees";
  targetStableIds?: string[];
}
