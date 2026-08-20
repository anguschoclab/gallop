/**
 * stablePoolData.ts - Stable pool data (re-exports)
 *
 * This file now re-exports pool data and filler components from dedicated modules
 * for backward compatibility.
 *
 * Dependencies: @/game/types (Stable)
 * Related files: stableGeneration.ts (uses pool data), stableSelection.ts (uses pool data),
 *               eliteStablePool.ts, midStablePool.ts, budgetStablePool.ts, stableFillerData.ts
 */

import type { Stable } from "@/game/types";

// Base stable info without generated fields
export type StablePoolEntry = Omit<
  Stable,
  | "id"
  | "founded"
  | "cash"
  | "horses"
  | "tier"
  | "reputation"
  | "personality"
  | "preferredDistance"
  | "preferredSurface"
>;

// Re-export pool arrays for backward compatibility
export { ELITE_POOL } from "./eliteStablePool";
export { MID_POOL } from "./midStablePool";
export { BUDGET_POOL } from "./budgetStablePool";

// Re-export filler data for backward compatibility
export {
  FILLER_PREFIXES,
  FILLER_SUFFIXES,
  FILLER_OWNERS,
  FILLER_COUNTRIES,
} from "./stableFillerData";
