/**
 * types.ts - Central type exports
 *
 * This file re-exports all type definitions from core modules and provides a unified
 * type interface for the game module.
 *
 * Dependencies: @/shared/common/types, @/core/genetics/types, @/core/horse/types, @/core/jockey/types, @/core/race/types, @/core/stable/types, @/core/market/types, @/core/breeding/types, @/core/campaign/types, ./state (GameState), ./awards/types (RegionalAward, AwardRegion)
 * Related files: All game files use these types
 */

export * from "@/core/common/types";
export * from "@/domains/genetics/model/types";
export * from "@/domains/horse/simulation/types";
export * from "@/domains/jockey/model/types";
export * from "@/domains/race/simulation/types";
export * from "@/domains/stable/simulation/types";
export * from "@/domains/market/model/types";
export * from "@/domains/breeding/model/types";
export * from "@/domains/calendar/model/campaignTypes";
export * from "@/shared/types/branded";
export * from "@/domains/horse/simulation/ownership";

// Re-export from core modules that are already exported via wildcard above
// These are explicitly listed for clarity and to ensure they're available
export type { Pregnancy } from "@/domains/breeding/model/types";
export type { TripleCrownProgress } from "@/domains/calendar/model/campaignTypes";
export type { Horse, HorseRaceHistoryEntry } from "@/domains/horse/simulation/types";
export type { Race, RaceRunner } from "@/domains/race/simulation/types";
export type { AuctionSale, ScoutReport, PrivateSaleOffer, Claim } from "@/domains/market/model/types";
export type { PlayerProfile } from "@/domains/stable/simulation/types";

// Re-export specific external dependencies
export type { GameState } from "@/platform/game/store/state";
export type { RegionalAward, AwardRegion } from "@/domains/awards/model/types";
export type { BreedingCompatibilityResult } from "@/domains/breeding/simulation/compatibility";
export type { PlayerFacilities } from "@/domains/facilities/model/facilityTypes";

// Type aliases for horse properties (preferring core definitions)
export type {
  CoatColor,
  HorseGender,
  HealthStatus,
  SockHeight,
  FaceWhite,
  HorseMarkings,
  BlueHenStatus,
} from "@/domains/horse/simulation/types";

// Financial types
export type { Transaction, TransactionType, TransactionSubcategory } from "@/domains/transactions/model/transactionTypes";;
export type { Expense, ExpenseCategory } from "@/domains/expenses/model/expenseTypes";;;

// Additional re-exports for commonly used types
export type { RaceClass } from "@/domains/race/model/sharedTypes";
export type { PedigreeNode as Pedigree } from "@/domains/breeding/model/types";
export type { Track } from "@/shared/data/tracks";
export type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";
export type { ApprenticeProgression } from "@/domains/apprentice/model/apprenticeTypes";
export type { StewardsInquiry, InquiryType, InquiryOutcome } from "@/domains/stewards/model/stewardTypes";
export type { InsurancePolicy, InsurancePolicyType } from "@/domains/insurance/model/insuranceTypes";

// Type alias for facilities
export type FacilityState = Partial<
  Record<
    import("@/domains/facilities/model/facilityTypes").FacilityType,
    import("@/domains/facilities/model/facilityTypes").Facility
  >
>;
