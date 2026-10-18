/**
 * sharedTypes.ts - Shared race type definitions
 *
 * This file provides shared race type definitions to avoid circular dependencies
 * between horse/types.ts and race/types.ts.
 *
 * Related files: horse/types.ts, race/types.ts
 */

/**
 * Race class classification
 */
export type RaceClass =
  | "Maiden"
  | "MaidenSpecialWeight"
  | "MaidenClaiming"
  | "MaidenOptionalClaiming"
  | "MaidenStakes"
  | "Allowance"
  | "OptionalClaiming"
  | "StarterAllowance"
  | "StarterHandicap"
  | "Stakes"
  | "Claiming"
  | "Handicap"
  | "Listed"
  | "Group"
  | "Graded";
