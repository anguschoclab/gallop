/**
 * apprentice/index.ts - Jockey apprentice module
 *
 * This module provides jockey apprentice claim allowances and progression tracking.
 *
 * Dependencies: ./apprenticeTypes (types and functions)
 * Related files: apprenticeTypes.ts (provides types and functions)
 */

// Apprentice Module - Jockey apprentice claim allowances

export type { ApprenticeStatus, ClaimAllowance, ApprenticeProgression } from "./apprenticeTypes";

export {
  CLAIM_ALLOWANCE_TABLE,
  getClaimAllowance,
  getApprenticeStatus,
  qualifiesForAllowance,
  createApprenticeProgression,
  updateApprenticeProgression,
  formatApprenticeStatus,
  formatWeightAllowance,
} from "./apprenticeTypes";
