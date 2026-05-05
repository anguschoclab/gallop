// Manager Reputation Types - Stable prestige and reputation tracking

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
  | "consistency";

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
 * Calculate reputation tier from score
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
 * Create a new reputation event
 */
export function createReputationEvent(
  source: ReputationSource,
  amount: number,
  description: string,
  day: number,
  options: {
    horseId?: string;
    raceId?: string;
  } = {}
): ReputationEvent {
  return {
    id: crypto.randomUUID(),
    day,
    source,
    amount,
    description,
    horseId: options.horseId,
    raceId: options.raceId,
  };
}

/**
 * Calculate reputation gain for a race win
 */
export function calculateRaceWinReputation(
  grade: string | undefined,
  purse: number
): number {
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
 * Calculate reputation gain for breeding success
 */
export function calculateBreedingReputation(foalQuality: number): number {
  // foalQuality is 0-100, scale to reputation
  return Math.floor(foalQuality / 5);
}

/**
 * Format reputation tier for display
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
