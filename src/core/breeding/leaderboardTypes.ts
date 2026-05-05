import type { SurfaceBias, DistancePreference, SireClassification, SireAnalytics } from "./sireAnalytics";

/**
 * All available leaderboard types for sire rankings
 */
export type LeaderboardType =
  | "overall"           // By AEI (Average Earnings Index)
  | "ci"                // By Comparable Index
  | "stakes_producers"  // By stakes winners
  | "g1_producers"      // By G1 winners
  | "turf_specialists"  // By turf progeny win rate
  | "dirt_specialists"  // By dirt progeny win rate
  | "sprint_sires"      // By sprint progeny win rate
  | "staying_sires"     // By staying progeny win rate
  | "value_sires"       // By AEI/fee ratio
  | "freshman_watch"    // First crop sires
  | "rising_stars"      // Trending upward
  | "regional_north"    // Northern hemisphere
  | "regional_south";   // Southern hemisphere

/**
 * Individual sire ranking entry in a leaderboard
 */
export type SireRanking = {
  stallionId: string;
  stallionName: string;
  rank: number;
  value: number; // The metric being ranked (AEI, CI, stakes count, etc.)
  previousRank?: number; // For trend tracking (from last update)
  change?: number; // Rank change from previous period (positive = moved up)
  metrics: SireAnalytics;
};

/**
 * Complete leaderboard with all rankings
 */
export type Leaderboard = {
  type: LeaderboardType;
  title: string;
  description: string;
  rankings: SireRanking[];
  lastUpdated: number; // Game day
  season?: number; // For seasonal leaderboards (optional)
};

/**
 * Historical trend data for a sire
 * Used to track performance over time and detect rising/falling sires
 */
export type SireTrendData = {
  stallionId: string;
  day: number;
  aei: number;
  ci: number;
  stakesFoals: number;
  g1Foals: number;
  rank?: number; // Optional rank in overall leaderboard
};

/**
 * Progeny ranking for progeny leaderboards
 */
export type ProgenyRanking = {
  horseId: string;
  horseName: string;
  sireId?: string;
  sireName?: string;
  rank: number;
  value: number; // Beyer, earnings, or other metric
  metrics: {
    age: number;
    starts: number;
    wins: number;
    earnings: number;
    bestBeyer?: number;
    gradeWins: number;
  };
};

/**
 * Progeny leaderboard type
 */
export type ProgenyLeaderboardType = "beyer" | "earnings" | "stakes_winners";

/**
 * Complete progeny leaderboard
 */
export type ProgenyLeaderboard = {
  type: ProgenyLeaderboardType;
  title: string;
  description: string;
  rankings: ProgenyRanking[];
  lastUpdated: number;
};
