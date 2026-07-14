/**
 * leaderboardTypes.ts - Leaderboard type definitions
 *
 * This file provides type definitions for sire leaderboards including
 * leaderboard types, ranking data, and related interfaces.
 *
 * Dependencies: None
 * Related files: Used throughout the breeding module and game state
 */

import type {
  SurfaceBias,
  DistancePreference,
  SireClassification,
  SireAnalytics,
} from "./sireAnalytics";

export type LeaderboardType =
  | "overall"
  | "ci"
  | "stakes_producers"
  | "g1_producers"
  | "turf_specialists"
  | "dirt_specialists"
  | "sprint_sires"
  | "staying_sires"
  | "value_sires"
  | "freshman_watch"
  | "rising_stars"
  | "regional_north"
  | "regional_south";

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

// ─── Damsire (Broodmare Sire) Leaderboard Types ───

/**
 * Analytics for a damsire (sire of dams) based on grandfoal performance.
 * Tracks how well a stallion's daughters produce as broodmares.
 */
export type DamsireAnalytics = {
  damsireId: string;
  damsireName: string;
  daughtersBred: number;
  totalFoals: number;
  stakesFoals: number;
  g1Foals: number;
  totalEarnings: number;
  avgEarningsPerFoal: number;
  blueHenScore: number;
};

export type DamsireRanking = {
  damsireId: string;
  damsireName: string;
  rank: number;
  value: number;
  metrics: DamsireAnalytics;
};

export type DamsireLeaderboard = {
  type: "damsire_rankings";
  title: string;
  description: string;
  rankings: DamsireRanking[];
  lastUpdated: number;
};

// ─── Blue Hen Mare Leaderboard Types ───

/**
 * Analytics for a broodmare based on her produce record.
 * Uses the blueHenStatus field plus computed racing stats of her foals.
 */
export type MareAnalytics = {
  mareId: string;
  mareName: string;
  foalsProduced: number;
  stakesWinnersProduced: number;
  g1WinnersProduced: number;
  totalFoalEarnings: number;
  avgFoalEarnings: number;
  blueHenScore: number;
  isBlueHen: boolean;
};

export type MareRanking = {
  mareId: string;
  mareName: string;
  rank: number;
  value: number;
  metrics: MareAnalytics;
};

export type BlueHenLeaderboard = {
  type: "blue_hen";
  title: string;
  description: string;
  rankings: MareRanking[];
  lastUpdated: number;
};

// ─── Progeny Leaderboard Types ───

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
