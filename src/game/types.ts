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
