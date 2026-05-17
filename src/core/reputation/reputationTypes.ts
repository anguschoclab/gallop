// Manager Reputation Types - Stable prestige and reputation tracking
import { generateUUIDWithValidation } from "../uuid";

/**
 * Reputation level tiers
 */
export type ReputationTier =
  | "unknown"
  | "local"
  | "regional"
  | "national"
  | "international"
  | "world_class"
  | "legendary";

/**
 * Reputation source categories
 */
export type ReputationSource =
  | "race_win"
  | "graded_stakes_win"
  | "breeding_success"
  | "stallion_quality"
  | "horse_quality"
  | "longevity"
  | "consistency"
  | "rivalry_win"
  | "rivalry_loss";

/**
 * Individual reputation change event
 */
export interface ReputationEvent {
  id: string;
  day: number;
  source: ReputationSource;
  amount: number;
  description: string;
  horseId?: string;
  raceId?: string;
}

/**
 * Manager reputation state
 */
export interface ManagerReputation {
  score: number; // 0-1000 scale
  tier: ReputationTier;
  events: ReputationEvent[];
  /** Track wins by grade for tier calculation */
  gradedWins: {
    G1: number;
    G2: number;
    G3: number;
    Listed: number;
  };
  /** Track total wins */
  totalWins: number;
  /** Track years active */
  yearsActive: number;
}

/**
 * Calculate reputation tier from score.
 *
 * @param score - Current reputation score (0-1000)
 * @returns The corresponding ReputationTier
 */
export function getReputationTier(score: number): ReputationTier {
  if (score >= 900) return "legendary";
  if (score >= 750) return "world_class";
  if (score >= 600) return "international";
  if (score >= 450) return "national";
  if (score >= 300) return "regional";
  if (score >= 150) return "local";
  return "unknown";
}

/**
 * Create a new reputation event.
 *
 * @param source - Category of the reputation gain
 * @param amount - Numeric increase to reputation score
 * @param description - Human-readable explanation
 * @param day - Game day the event occurred
 * @param options - Optional event metadata
 * @param options.horseId - Horse associated with the event
 * @param options.raceId - Race associated with the event
 * @returns Complete ReputationEvent object
 */
export function createReputationEvent(
  source: ReputationSource,
  amount: number,
  description: string,
  day: number,
  options: {
    horseId?: string;
    raceId?: string;
  } = {},
): ReputationEvent {
  return {
    id: generateUUIDWithValidation("reputation_event"),
    day,
    source,
    amount,
    description,
    horseId: options.horseId,
    raceId: options.raceId,
  };
}

/**
 * Calculate reputation gain for a race win.
 *
 * @param grade - Race grade (G1, G2, etc.)
 * @param purse - Total purse amount in dollars
 * @returns Reputation points gained
 */
export function calculateRaceWinReputation(grade: string | undefined, purse: number): number {
  let base = 10; // Base reputation for any win

  // Grade bonuses
  if (grade === "G1") base += 50;
  else if (grade === "G2") base += 35;
  else if (grade === "G3") base += 25;
  else if (grade === "Listed") base += 15;

  // Purse factor (scaled down)
  const purseBonus = Math.min(20, Math.floor(purse / 50000));

  return base + purseBonus;
}

/**
 * Calculate reputation gain for breeding success.
 *
 * @param foalQuality - Calculated quality score of the foal (0-100)
 * @returns Reputation points gained
 */
export function calculateBreedingReputation(foalQuality: number): number {
  // foalQuality is 0-100, scale to reputation
  return Math.floor(foalQuality / 5);
}

/**
 * Format reputation tier for display.
 *
 * @param tier - The tier to format
 * @returns Human-readable label
 */
export function formatReputationTier(tier: ReputationTier): string {
  const labels: Record<ReputationTier, string> = {
    unknown: "Unknown",
    local: "Local",
    regional: "Regional",
    national: "National",
    international: "International",
    world_class: "World Class",
    legendary: "Legendary",
  };
  return labels[tier];
}
