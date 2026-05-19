/**
 * types.ts - Central type exports
 *
 * This file re-exports all type definitions from core modules and provides a unified
 * type interface for the game module.
 *
 * Dependencies: @/core/common/types, @/core/genetics/types, @/core/horse/types, @/core/jockey/types, @/core/race/types, @/core/stable/types, @/core/market/types, @/core/breeding/types, @/core/campaign/types, ./state (GameState), ./awards/types (RegionalAward, AwardRegion)
 * Related files: All game files use these types
 */

export * from "@/core/common/types";
export * from "@/core/genetics/types";
export * from "@/core/horse/types";
export * from "@/core/jockey/types";
export * from "@/core/race/types";
export * from "@/core/stable/types";
export * from "@/core/market/types";
export * from "@/core/breeding/types";
export * from "@/core/campaign/types";

// Re-export specific external dependencies
export type { GameState } from "./state";
export type { RegionalAward, AwardRegion } from "./awards/types";
export type { BreedingCompatibilityResult } from "./breedingCompatibility";
export type { PlayerFacilities } from "@/core/facilities/facilityTypes";

// Type aliases for horse properties (preferring core definitions)
export type {
  CoatColor,
  HorseGender,
  HealthStatus,
  SockHeight,
  FaceWhite,
  HorseMarkings,
  BlueHenStatus,
} from "@/core/horse/types";

// Financial types
export type { Transaction, TransactionType, TransactionSubcategory } from "@/core/transactions";
export type { Expense, ExpenseCategory } from "@/core/expenses";

// Additional re-exports for commonly used types
export type { RaceClass } from "@/core/race/sharedTypes";
export type { PedigreeNode as Pedigree } from "@/core/breeding/types";
export type { Track } from "@/game/tracks";

// Type alias for facilities
export type FacilityState = Record<string, any>;
