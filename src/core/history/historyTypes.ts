/**
 * historyTypes.ts - Historical tracking types
 *
 * This file provides types for long-term historical tracking and records,
 * including season records and Hall of Fame entries.
 *
 * Dependencies: None
 * Related files: None
 */

export interface SeasonRecord {
  id: string;
  year: number;
  day: number;
  raceId: string;
  raceName: string;
  winnerId: string;
  winnerName: string;
  winnerSilk: string;
  time: number;
  jockeyId: string;
  jockeyName: string;
  grade: "G1" | "G2" | "G3";
  isPlayerOwned: boolean;
}

export interface HallOfFameEntry {
  horseId: string;
  name: string;
  inductionDay: number;
  inductionYear: number;
  achievements: string[];
  lifetimeEarnings: number;
  lifetimeStarts: number;
  lifetimeWins: number;
  g1Wins: number;
  bestBeyer: number;
  silk: string;
  pedigree: {
    sireName?: string;
    damName?: string;
  };
}

export interface TrackRecord {
  trackId: string;
  trackName: string;
  surface: "Turf" | "Dirt" | "Synthetic";
  distance: number;
  time: number;
  horseId: string;
  horseName: string;
  day: number;
  year: number;
}

export interface FounderRecord {
  horseId: string;
  name: string;
  influenceScore: number; // Sum of descendants' achievements
  totalEarnings: number; // Descendants' total earnings
  stakesWinners: number; // Count of stakes winning descendants
  g1Winners: number; // Count of G1 winning descendants
  generationDepth: number; // Max generation depth reached
  descendantCount: number;
  lastUpdated: number;
}
