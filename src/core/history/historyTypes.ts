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
  gate?: number;
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

/** Dimension a track record is segmented by. */
export type RecordCategoryKind = "overall" | "age" | "gender" | "grade" | "condition";

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
  /** Which dimension this record belongs to. Legacy records without it are "overall". */
  categoryKind?: RecordCategoryKind;
  /** Bucket inside the dimension, e.g. "3yo", "Female", "G1", "fast". */
  categoryValue?: string;
  /** Race that produced the record (informational). */
  raceId?: string;
  raceName?: string;
}

/**
 * Stable storage key for a track record, unique per track/surface/distance/category.
 * @param record
 */
export function trackRecordKey(record: TrackRecord): string {
  const kind = record.categoryKind ?? "overall";
  const suffix = kind === "overall" ? "overall" : `${kind}:${record.categoryValue ?? ""}`;
  return `${record.trackId}_${record.surface}_${record.distance}_${suffix}`;
}

/**
 * Human label for a record's category.
 * @param record
 */
export function recordCategoryLabel(record: TrackRecord): string {
  const kind = record.categoryKind ?? "overall";
  if (kind === "overall") return "Overall";
  if (kind === "condition") return `Going: ${record.categoryValue}`;
  return record.categoryValue ?? "Overall";
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
