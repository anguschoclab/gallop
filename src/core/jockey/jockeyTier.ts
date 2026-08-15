import type { Jockey, JockeyTier } from "./types";
import {
  JOCKEY_TIER_ORDER,
  JOCKEY_TIER_LABELS,
  JOCKEY_TIER_POTENTIAL_ELITE_MIN,
  JOCKEY_TIER_POTENTIAL_MID_MIN,
} from "@/constants";

export { JOCKEY_TIER_ORDER, JOCKEY_TIER_LABELS };

/**
 * Get the tier of a jockey. Returns the stored `tier` field if present,
 * otherwise derives from `potential` as a fallback.
 *
 * @param jockey - The jockey to evaluate
 * @returns The jockey's tier
 */
export function getJockeyTier(jockey: Jockey): JockeyTier {
  if (jockey.tier) return jockey.tier;
  if (jockey.potential >= JOCKEY_TIER_POTENTIAL_ELITE_MIN) return "elite";
  if (jockey.potential >= JOCKEY_TIER_POTENTIAL_MID_MIN) return "mid";
  return "budget";
}
